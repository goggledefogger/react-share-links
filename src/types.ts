// types.ts

export interface User {
  id: string;
  username: string;
  email: string;
}

export interface Link {
  id: string;
  channelId: string;
  userId: string;
  username: string;
  url: string;
  title?: string;
  emoji?: string;
  createdAt: number;
}

export interface Channel {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: number;
}
