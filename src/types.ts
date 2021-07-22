import { CookieSerializeOptions } from 'fastify-cookie';
import { Redis } from 'ioredis';

export interface EmailDetails {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export interface userData {
  userId: string;
  isVerified?: boolean;
}

export interface Context {
  redis: Redis;
  headers: {
    authorization: string;
  };
  getCookie(name: string): string | undefined;
  payload?: { user: userData };
  setCookie(
    name: string,
    value: string,
    options?: CookieSerializeOptions
  ): void;
  sendMail(details: EmailDetails): Promise<void>;
}
