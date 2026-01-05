import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { ID, Models, Query } from "react-native-appwrite";
import {
  account,
  DATABASE_ID,
  databases,
  USER_COLLECTION_ID,
} from "./appwrite";
import { UserPrefs } from "@/types/database.type";
import * as NativeNotify from "native-notify";
import * as Notifications from "expo-notifications";

import {
  NATIVE_NOTIFY_APP_ID,
  NATIVE_NOTIFY_APP_TOKEN,
} from "@/lib/native-notify";

type AuthContextType = {
  user: SafeUser | null;
  connectedUser: any | null;
  isLoadingUser: boolean;
  signUp: (
    email: string,
    password: string,
    confirmPassword: string,
    firstName: string,
    surname: string
  ) => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: (navigation?: any) => Promise<void>;
  refreshUser: () => Promise<void>;
  linkAccount: (shareCode: string) => Promise<string | null>;
  unlinkAccount: (partnerUserId: string) => Promise<string | null>;
  fetchConnectedUser: () => Promise<void>;
};

type SafeUser = {
  $id: string;
  email: string;
  prefs: UserPrefs;
};

function toSafeUser(user: Models.User<any>): SafeUser {
  const prefs = user.prefs ?? {};

  return {
    $id: String(user.$id),
    email: String(user.email),
    prefs: {
      firstName: String(prefs.firstName ?? ""),
      surname: String(prefs.surname ?? ""),
      isConnected: Boolean(prefs.isConnected ?? false),
      shareCode: prefs.shareCode ? String(prefs.shareCode) : undefined,
    },
  };
}

function toSafeConnectedUser(doc: any) {
  return {
    $id: String(doc.$id),
    userId: String(doc.userId),
    firstName: String(doc.firstName ?? ""),
    surname: String(doc.surname ?? ""),
    isConnected: Boolean(doc.isConnected),
    connectedTo: doc.connectedTo ? String(doc.connectedTo) : null,
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [connectedUser, setConnectedUser] = useState<any>(null);
  const [isLoadingUser, setIsLoadingUser] = useState<boolean>(true);

  const getUser = useCallback(async () => {
    try {
      const session = await account.get();
      setUser(toSafeUser(session));
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      setUser(null);
    } finally {
      setIsLoadingUser(false);
    }
  }, []);

  const fetchConnectedUser = useCallback(async () => {
    if (!user || !user?.$id) {
      setConnectedUser(null);
      return;
    }

    try {
      const userResult = await databases.listDocuments(
        DATABASE_ID,
        USER_COLLECTION_ID,
        [Query.equal("userId", user.$id)]
      );

      if (!userResult.documents.length) {
        setConnectedUser(null);
        console.warn("Current user document not found in database.");
        return;
      }

      const currentUserDoc = userResult.documents[0];
      if (!currentUserDoc.connectedTo) {
        setConnectedUser(null);
        return;
      }

      const connectedResult = await databases.listDocuments(
        DATABASE_ID,
        USER_COLLECTION_ID,
        [Query.equal("userId", currentUserDoc.connectedTo)]
      );

      if (connectedResult.documents.length > 0) {
        setConnectedUser(toSafeConnectedUser(connectedResult.documents[0]));
      } else {
        setConnectedUser(null);
      }
    } catch (error) {
      console.error("Error fetching connected user:", error);
      setConnectedUser(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.$id]);

  useEffect(() => {
    getUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user?.$id) {
      fetchConnectedUser();
    } else {
      setConnectedUser(null);
    }
  }, [user?.$id, fetchConnectedUser]);

  const getPushToken = async (): Promise<string | null> => {
    try {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.warn("Push notification permission not granted");
        return null;
      }

      // Get the Expo push token
      const tokenData = await Notifications.getExpoPushTokenAsync();
      return tokenData.data;
    } catch (err) {
      console.error("Failed to get push token:", err);
      return null;
    }
  };

  useEffect(() => {
    if (!user?.$id) return;

    const registerPush = async () => {
      try {
        // Get the user's document
        const userDocs = await databases.listDocuments(
          DATABASE_ID,
          USER_COLLECTION_ID,
          [Query.equal("userId", user.$id)]
        );
        if (!userDocs.documents.length) return;

        const userDoc = userDocs.documents[0];

        // Only register if token is missing
        if (!userDoc.nativeNotifyToken) {
          const token = await getPushToken();
          if (!token) return;

          NativeNotify.registerIndieID(
            user.$id,
            NATIVE_NOTIFY_APP_ID,
            NATIVE_NOTIFY_APP_TOKEN
          );

          await databases.updateDocument(
            DATABASE_ID,
            USER_COLLECTION_ID,
            userDoc.$id,
            { nativeNotifyToken: token }
          );

          console.log("✅ Native Notify registered for:", user.$id);
        }
      } catch (err) {
        console.warn("⚠️ Native Notify registration failed:", err);
      }
    };

    registerPush();
  }, [user?.$id]);

  const refreshUser = async () => {
    try {
      const updated = await account.get();
      setUser(toSafeUser(updated));
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      setUser(null);
    }
  };

  const generateShareCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };


  // Connect users

  const linkAccount = async (shareCode: string): Promise<string | null> => {
    if (!shareCode) return "Share code is required";

    try {
      if (!user?.$id) return "No authenticated user found";

      const currentUserDocs = await databases.listDocuments(
        DATABASE_ID,
        USER_COLLECTION_ID,
        [Query.equal("userId", user.$id)]
      );
      if (!currentUserDocs.documents.length) {
        return "Current user document not found";
      }
      const currentUserDoc = currentUserDocs.documents[0];

      const targetUserDocs = await databases.listDocuments(
        DATABASE_ID,
        USER_COLLECTION_ID,
        [Query.equal("shareCode", shareCode.trim().toUpperCase())]
      );

      if (targetUserDocs.documents.length === 0) {
        return "Invalid Share Code";
      }
      const targetUserDoc = targetUserDocs.documents[0];

      if (currentUserDoc.$id === targetUserDoc.$id) {
        return "You cannot link to your own share code";
      }

      await databases.updateDocument(
        DATABASE_ID,
        USER_COLLECTION_ID,
        currentUserDoc.$id,
        {
          isConnected: true,
          connectedTo: targetUserDoc.userId,
        }
      );
      await databases.updateDocument(
        DATABASE_ID,
        USER_COLLECTION_ID,
        targetUserDoc.$id,
        {
          isConnected: true,
          connectedTo: currentUserDoc.userId,
        }
      );

      const currentPrefs = await account.getPrefs();
      const newPrefs = {
        ...currentPrefs,
        isConnected: true,
      };
      await account.updatePrefs(newPrefs);

      await refreshUser();

      return null;
    } catch (error) {
      if (error instanceof Error) return error.message;
      return "An error occurred while linking accounts";
    }
  };

  // Remove user connection

  const unlinkAccount = async (
    partnerUserId: string
  ): Promise<string | null> => {
    if (!user) return "No authenticated user found";

    try {
      const currentUserDocs = await databases.listDocuments(
        DATABASE_ID,
        USER_COLLECTION_ID,
        [Query.equal("userId", user.$id)]
      );
      if (!currentUserDocs.documents.length) {
        return "Current user document not found";
      }
      const currentUserDocId = currentUserDocs.documents[0].$id;

      const partnerDocs = await databases.listDocuments(
        DATABASE_ID,
        USER_COLLECTION_ID,
        [Query.equal("userId", partnerUserId)]
      );

      if (!partnerDocs.documents.length) {
        return "Connected partner document not found";
      }
      const partnerDocumentId = partnerDocs.documents[0].$id;

      await databases.updateDocument(
        DATABASE_ID,
        USER_COLLECTION_ID,
        currentUserDocId,
        {
          isConnected: false,
          connectedTo: null,
        }
      );

      await databases.updateDocument(
        DATABASE_ID,
        USER_COLLECTION_ID,
        partnerDocumentId,
        {
          isConnected: false,
          connectedTo: null,
        }
      );
      const currentPrefs = await account.getPrefs();
      const newPrefs = {
        ...currentPrefs,
        isConnected: false,
      };
      await account.updatePrefs(newPrefs);

      await refreshUser();
      await fetchConnectedUser();

      return null;
    } catch (error) {
      console.error("Error unlinking accounts:", error);
      if (error instanceof Error) return error.message;
      return "An error occurred while unlinking accounts";
    }
  };

  // Sign In function

  const signIn = async (email: string, password: string) => {
    try {
      await account.createEmailPasswordSession(email, password);
      const session = await account.get();
      setUser(toSafeUser(session));
      return null;
    } catch (error) {
      if (error instanceof Error) {
        return error.message;
      }
      return "An Error occured during Sign In";
    }
  };

  //Sign Up function

  const signUp = async (
    email: string,
    password: string,
    confirmPassword: string,
    firstName: string,
    surname: string
  ) => {
    if (password !== confirmPassword) {
      return "Passwords do not match";
    }
    try {
      await account.create(ID.unique(), email, password);
      await account.createEmailPasswordSession(email, password);
      const shareCode = generateShareCode();
      await account.updatePrefs({ shareCode, firstName, surname });

      const updatedUser = await account.get();
      setUser(toSafeUser(updatedUser));

      await databases.createDocument(
        DATABASE_ID,
        USER_COLLECTION_ID,
        ID.unique(),
        {
          userId: updatedUser.$id,
          firstName,
          surname,
          shareCode: shareCode,
          isConnected: false,
          connectedTo: null,
        }
      );

      return null;
    } catch (error) {
      if (error instanceof Error) {
        return error.message;
      }
      return "An Error occured during registration";
    }
  };

  //Sign Out function
  
  const signOut = async () => {
    try {
      await account.deleteSession("current");
      setUser(null);
      setConnectedUser(null);
    } catch (error) {
      console.log(error);
    }
  };



  return (
    <AuthContext.Provider
      value={{
        user,
        isLoadingUser,
        signUp,
        signIn,
        signOut,
        refreshUser,
        linkAccount,
        connectedUser,
        fetchConnectedUser,
        unlinkAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be inside of the AuthProvider");
  }
  return context;
}
