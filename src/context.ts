import { User } from './entity/User';

export interface EmailDetails {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export interface Context {
  headers: {
    authorization: string;
  };
  payload?: { user: User };
  sendMail(details: EmailDetails): Promise<void>;
}

export interface userData {
  userId: string;
}
