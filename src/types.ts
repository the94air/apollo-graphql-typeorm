export interface EmailDetails {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export interface userData {
  userId: string;
  isVerified: boolean;
}

export interface Context {
  headers: {
    authorization: string;
  };
  payload?: { user: userData };
  sendMail(details: EmailDetails): Promise<void>;
}
