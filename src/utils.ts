import glob from 'glob';
import slugify from 'slugify';
import * as dotenv from 'dotenv';
import Redis, { RedisOptions } from 'ioredis';
import nodemailer, { Transporter } from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { CookieSerializeOptions } from 'fastify-cookie';
import { EmailDetails } from './types';

dotenv.config();

export const PREFIX =
  slugify(process.env.APP_NAME as string, '_').toLowerCase() + '_';

export const getRedis = () => {
  const client = new Redis({
    keyPrefix: PREFIX,
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    password:
      process.env.REDIS_PASSWORD !== 'null'
        ? process.env.REDIS_PASSWORD
        : undefined,
  } as RedisOptions);

  client.on('error', (err) => {
    console.log('Error ' + err);
  });

  return client;
};

export const getMailer = () => {
  let mailer = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT),
    secure: process.env.MAIL_ENCRYPTION === 'true' ? true : false,
    auth: {
      user: process.env.MAIL_USERNAME,
      pass: process.env.MAIL_PASSWORD,
    },
    logger: false,
  } as SMTPTransport.Options);

  return mailer;
};

export const sendMail = async (mailer: Transporter, details: EmailDetails) => {
  await mailer.sendMail({
    from: `"${process.env.APP_NAME}" <${process.env.MAIL_SENDER}>`,
    to: details.to,
    subject: `${details.subject} - ${process.env.APP_NAME}`,
    text: details.text,
    html: details.html,
  });
};

export const getCookie = (name: string, cookies: any): string | undefined => {
  return cookies && cookies[PREFIX + name] ? cookies[PREFIX + name] : undefined;
};

export const getResolvers = async () => {
  let resolverModules: Function[] = [];

  await Promise.all(
    glob.sync(__dirname + '/endpoint/*.ts').map(async (file) => {
      const { default: resolver } = await import(file);
      resolverModules.push(resolver);
    })
  );

  return resolverModules as [Function];
};
