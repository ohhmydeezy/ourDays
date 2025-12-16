import {Models} from "react-native-appwrite"

export interface Events extends Models.Document {
    jointEvent: any
    userId: string
    title: string
    date: string
    time: string
    location: string
    details: string
    status: string
    recipientId: string
}

export interface UserPrefs {
    firstName: string,
    surname: string,
    shareCode?: string;
    isConnected?: boolean;
    connectedTo?: string
    [key: string]: any
}