import glob from 'glob';
import fastify from 'fastify';
import { buildSchema } from 'type-graphql';
import { ApolloServer as ApolloServerDevelopment } from 'apollo-server';
import { ApolloServer as ApolloServerProduction } from 'apollo-server-fastify';
import nodemailer, { Transporter } from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { EmailDetails } from './context';

function getMailer() {
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
}

async function sendMail(mailer: Transporter, details: EmailDetails) {
  await mailer.sendMail({
    from: `"${process.env.APP_NAME}" <${process.env.MAIL_SENDER}>`,
    to: details.to,
    subject: `${details.subject} - ${process.env.APP_NAME}`,
    text: details.text,
    html: details.html,
  });
}

async function getResolvers() {
  let resolverModules: Function[] = [];

  await Promise.all(
    glob.sync(__dirname + '/endpoint/*.ts').map(async (file) => {
      const { default: resolver } = await import(file);
      resolverModules.push(resolver);
    })
  );

  return resolverModules as [Function];
}

async function development() {
  const resolvers: [Function] = await getResolvers();

  const server = new ApolloServerDevelopment({
    schema: await buildSchema({
      resolvers,
    }),
    context: (ctx) => {
      const mailer = getMailer();

      return {
        headers: ctx.req.headers,
        sendMail: async (details: EmailDetails) => {
          return sendMail(mailer, details);
        },
      };
    },
  });

  server.listen(3000).then(({ url }) => {
    console.log(`🚀 Server ready at ${url}`);
  });
}

async function production() {
  const resolvers: [Function] = await getResolvers();

  const server = new ApolloServerProduction({
    schema: await buildSchema({
      resolvers,
    }),
    context: (ctx) => {
      const mailer = getMailer();

      return {
        headers: ctx.req.headers,
        sendMail: async (details: EmailDetails) => {
          return sendMail(mailer, details);
        },
      };
    },
  });

  const app = fastify();

  await server.start();
  app.register(server.createHandler());
  await app.listen(3000).then(() => {
    console.log(`🚀 Server ready at http://localhost:3000`);
  });
}

export { development, production };
