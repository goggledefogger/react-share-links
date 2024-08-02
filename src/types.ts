export interface User {
  id: string;
  username: string;
  email: string;
}

export interface Reaction {
  emoji: string;
  userId: string;
}

export interface Link {
  id: string;
  channelId: string;
  userId: string;
  url: string;
  createdAt: number;
  preview: {
    title: string;
    description: string;
    image: string;
    favicon: string;
  } | null;
  reactions: Reaction[];
  username?: string;
}

export interface Channel {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  creatorUsername: string;
  createdAt: number;
}
