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
  createdAt: number;
  reactions?: string[];
  preview?: {
    title: string;
    description: string;
    image: string;
    favicon: string;
  };
}

export interface Channel {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  creatorUsername: string;
  createdAt: number;
}
