import { createHash } from "node:crypto";
import { Client, Databases, Query } from "node-appwrite";

const PAGE_SIZE = 100;
const MINUTE = 60_000;

function localParts(date, timezone) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  return Object.fromEntries(
    parts.filter((p) => p.type !== "literal").map((p) => [p.type, p.value]),
  );
}

function localDateKey(parts) {
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function deliveryId(key) {
  return createHash("sha256").update(key).digest("hex").slice(0, 32);
}

async function listAll(databases, dbId, collectionId, queries = []) {
  const documents = [];
  let offset = 0;

  while (true) {
    const result = await databases.listDocuments(dbId, collectionId, [
      ...queries,
      Query.limit(PAGE_SIZE),
      Query.offset(offset),
    ]);

    documents.push(...result.documents);

    if (result.documents.length < PAGE_SIZE) break;
    offset += result.documents.length;
  }

  return documents;
}

function recipientsForEvent(event) {
  if (event.status !== "confirmed") return [];

  const ids = [event.userId];

  if (event.jointEvent === true && event.recipientId) {
    ids.push(event.recipientId);
  }

  return [...new Set(ids.filter(Boolean))];
}

async function sendPush(token, title, body, data) {
  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: token,
      title,
      body,
      data,
      sound: "default",
    }),
  });

  if (!response.ok) {
    throw new Error(`Expo HTTP ${response.status}`);
  }

  const result = await response.json();
  const ticket = result.data;

  if (ticket?.status !== "ok") {
    throw new Error(
      `Expo push rejected: ${ticket?.details?.error ?? ticket?.message ?? "unknown"}`,
    );
  }

  return ticket;
}

export default async ({ req, res, log, error }) => {
  try {
    const endpoint =
      process.env.APPWRITE_ENDPOINT ||
      process.env.APPWRITE_FUNCTION_API_ENDPOINT;

    const projectId = process.env.APPWRITE_FUNCTION_PROJECT_ID;
    const apiKey = req.headers["x-appwrite-key"];

    const dbId = process.env.APPWRITE_DATABASE_ID;
    const eventsId = process.env.APPWRITE_EVENTS_ID;
    const usersId = process.env.APPWRITE_USERS_ID;
    const deliveriesId = process.env.APPWRITE_DELIVERIES_ID;

    if (
      !endpoint ||
      !projectId ||
      !apiKey ||
      !dbId ||
      !eventsId ||
      !usersId ||
      !deliveriesId
    ) {
      throw new Error("Missing Appwrite configuration");
    }

    const client = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setKey(apiKey);

    const databases = new Databases(client);
    const now = new Date();

    const users = await listAll(databases, dbId, usersId);
    const events = await listAll(databases, dbId, eventsId, [
      Query.equal("status", "confirmed"),
    ]);

    const usersById = new Map(users.map((user) => [user.userId, user]));

    const candidates = [];

    // Event reminders.
    for (const event of events) {
      const start = new Date(event.date);
      if (Number.isNaN(start.getTime())) continue;

      const minutesUntil = (start.getTime() - now.getTime()) / MINUTE;

      let type = null;
      let title = null;
      let body = null;

      if (minutesUntil > 14 && minutesUntil <= 15) {
        type = "event_15min";
        title = "Coming up in 15 minutes";
        body = event.title;
      } else if (minutesUntil <= 0 && minutesUntil > -1) {
        type = "event_start";
        title = "Your event is starting";
        body = event.title;
      }

      if (!type) continue;

      for (const userId of recipientsForEvent(event)) {
        candidates.push({
          key: `${type}:${event.$id}:${userId}:${start.toISOString()}`,
          userId,
          eventId: event.$id,
          type,
          title,
          body,
          data: { eventId: event.$id, type },
        });
      }
    }

    // Daily summaries at 8 AM in each user's timezone.
    for (const user of users) {
      if (!user.userId || !user.nativeNotifyToken || !user.timezone) {
        continue;
      }

      let parts;
      try {
        parts = localParts(now, user.timezone);
      } catch {
        log(`Skipping user with invalid timezone`);
        continue;
      }

      if (parts.hour !== "08" || parts.minute !== "00") continue;

      const today = localDateKey(parts);

      const todaysEvents = events.filter((event) => {
        if (!recipientsForEvent(event).includes(user.userId)) {
          return false;
        }

        const start = new Date(event.date);
        if (Number.isNaN(start.getTime())) return false;

        return localDateKey(localParts(start, user.timezone)) === today;
      });

      const count = todaysEvents.length;

      candidates.push({
        key: `daily:${user.userId}:${today}`,
        userId: user.userId,
        eventId: null,
        type: "daily",
        title: "Good morning from OurDays",
        body:
          count === 0
            ? "No events planned for today. Make time for each other!"
            : `You have ${count} event${count === 1 ? "" : "s"} planned today.`,
        data: { type: "daily", date: today },
      });
    }

    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const item of candidates) {
      const user = usersById.get(item.userId);

      if (!user?.nativeNotifyToken) {
        skipped++;
        continue;
      }


      const docId = deliveryId(item.key);

      try {
        // Creating a deterministic ID claims this notification.
        // A duplicate execution cannot claim the same ID.
        await databases.createDocument(dbId, deliveriesId, docId, {
          notificationKey: item.key,
          userId: item.userId,
          eventId: item.eventId,
          type: item.type,
          sentAt: new Date().toISOString(),
        });
      } catch (err) {
        if (err?.code === 409) {
          skipped++;
          continue;
        }
        throw err;
      }

      try {
        const ticket = await sendPush(user.nativeNotifyToken, item.title, item.body, item.data);
        log(`Expo ticket ID: ${ticket.id ?? "missing"}`);
        sent++;
      } catch (err) {
        failed++;
        error(`Push delivery failed: ${String(err)}`);
      }
    }

    log(
      `Candidates: ${candidates.length}, sent: ${sent}, ` +
        `skipped: ${skipped}, failed: ${failed}`,
    );

    return res.json({
      success: true,
      usersScanned: users.length,
      eventsScanned: events.length,
      candidates: candidates.length,
      sent,
      skipped,
      failed,
    });
  } catch (err) {
    error(`Notification scheduler failed: ${String(err)}`);

    return res.json(
      {
        success: false,
        error: "notification_scheduler_failed",
      },
      500,
    );
  }
};
