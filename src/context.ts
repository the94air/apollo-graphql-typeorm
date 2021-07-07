import Mail from 'nodemailer/lib/mailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { User } from './entity/User';

export interface Context {
  headers: {
    authorization: string;
  };
  payload?: { user: User };
  mailer: Mail<SMTPTransport.SentMessageInfo>;
}

export interface userData {
  userId: string;
}

// export interface EmailDetails {
//   to: string;
//   subject: string;
//   text: string;
//   html: string;
// }
