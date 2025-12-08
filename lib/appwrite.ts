import { Account, Client, Databases } from "react-native-appwrite";

export const client = new Client()
  .setEndpoint(process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID!);

export const account = new Account(client);
export const databases = new Databases(client);

export const DATABASE_ID = process.env.EXPO_PUBLIC_DB_ID!;
export const EVENTS_ID = process.env.EXPO_PUBLIC_EVENTS_TABLE_ID!;
export const USER_COLLECTION_ID = process.env.EXPO_PUBLIC_USER_COLLECTION_ID!;



export interface RealtimeResponse {
  events: string[];
  payload: any;
}
