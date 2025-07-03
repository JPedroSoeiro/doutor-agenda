// src/types/auth.d.ts

import { type DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      clinic?: {
        id: string;
        name: string;
        address?: string | null;
        phoneNumber?: string;
        email?: string;
      };
    } & DefaultSession["user"];
  }
}
