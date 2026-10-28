import { Client, Databases, ID, Query } from "node-appwrite";

const FREE_LIMIT = 5;
const ENTITLEMENT = "ourdays_pro";
const MODEL = "gemini-2.5-flash";
const MAX_QUERY_CHARS = 1000;
const MAX_CONTEXT_CHARS = 4000;

const SYSTEM_PROMPT =
  'You are a friendly, insightful, and proactive relationship concierge service named "Dory". Your goal is to help a couple plan quality time together. Your responses should be warm, encouraging, and actionable.';

async function hasPro(userId, revenueCatKey, log) {
  try {
    const res = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`,
      {
        headers: {
          Authorization: `Bearer ${revenueCatKey}`,
          "Content-Type": "application/json",
        },
      },
    );
    if (!res.ok) {
      log(`RevenueCat responded ${res.status}`);
      return false;
    }
    const data = await res.json();
    const ent = data.subscriber?.entitlements?.[ENTITLEMENT];
    if (!ent) return false;
    return ent.expires_date === null || new Date(ent.expires_date) > new Date();
  } catch (error) {
    log(`RevenueCat error: ${error}`);
    return false;
  }
}

async function askGemini(text, apiKey, log) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

  for (let i = 0; i < 3; i++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text }] }],
          system_instruction: {
            role: "system",
            parts: [{ text: SYSTEM_PROMPT }],
          },
        }),
      });
      if (response.ok) {
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
      }
      log(`Gemini ${response.status}: ${await response.text()}`);
      if (response.status < 500 && response.status !== 429) return null;
    } catch (error) {
      log(`Gemini network error: ${error}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** i));
  }
  return null;
}

export default async ({ req, res, log, error }) => {
  const userId = req.headers["x-appwrite-user-id"];
  if (!userId) return res.json({ error: "unauthorized" }, 401);

  let body = {};
  try {
    body =
      typeof req.body === "string"
        ? JSON.parse(req.body || "{}")
        : (req.body ?? {});
  } catch {
    return res.json({ error: "bad_request" }, 400);
  }

  try {
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
      .setKey(req.headers["x-appwrite-key"]);
    const databases = new Databases(client);
    const DB = process.env.EXPO_PUBLIC_DB_ID;
    const USAGE = process.env.EXPO_PUBLIC_USAGE_ID;

    const found = await databases.listDocuments(DB, USAGE, [
      Query.equal("userId", userId),
      Query.limit(1),
    ]);
    const usageDoc =
      found.documents[0] ??
      (await databases.createDocument(DB, USAGE, ID.unique(), {
        userId,
        freeMessagesUsed: 0,
      }));

    const pro = await hasPro(userId, process.env.REVENUE_CAT_SECRET_KEY, log);
    const used = usageDoc.freeMessagesUsed ?? 0;
    const remaining = Math.max(0, FREE_LIMIT - used);

    if (body.action === "status") {
      return res.json({ isPro: pro, remaining });
    }

    if (!pro && remaining === 0) {
      return res.json({ error: "limit_reached", remaining: 0 }, 403);
    }

    const query = String(body.query ?? "")
      .trim()
      .slice(0, MAX_QUERY_CHARS);
    if (!query) return res.json({ error: "empty_query" }, 400);

    const context = String(body.context ?? "").slice(0, MAX_CONTEXT_CHARS);
    const userText = context ? `${context}\nUser Message: ${query}` : query;

    const reply = await askGemini(userText, process.env.GEMINI_API_KEY, log);
    if (!reply) return res.json({ error: "upstream_failed" }, 502);

    let newRemaining = remaining;
    if (!pro) {
      await databases.updateDocument(DB, USAGE, usageDoc.$id, {
        freeMessagesUsed: used + 1,
      });
      newRemaining = remaining - 1;
    }

    return res.json({ reply, remaining: newRemaining, isPro: pro });
  } catch (err) {
    error(`Unhandled error: ${err}`);
    return res.json({ error: "server_error" }, 500);
  }
};
