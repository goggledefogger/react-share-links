import { Timestamp, FieldValue } from "firebase/firestore";

export interface User {
  id: string;
  username: string;
  email: string;
}

export interface UserProfile {
  username: string;
  email: string;
  digestFrequency: 'daily' | 'weekly' | 'none';
  subscribedChannels: string[];
  emailNotifications: boolean;
}

export interface Reaction {
  emoji: string;
  userId: string;
  userIds?: string[]; // Make it optional
}

export interface Link {
  id: string;
  channelId: string;
  userId: string;
  url: string;
  createdAt: Timestamp | FieldValue;
  reactions: Reaction[];
  preview: {
    title?: string;
    description?: string;
    image?: string;
    favicon?: string;
    mediaType: string;
    contentType: string;
  } | null;
}

export interface Channel {
  id: string;
  name: string;
  createdBy: string;
  createdAt: Timestamp | null;
}
