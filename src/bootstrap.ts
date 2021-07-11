import glob from 'glob';
import fastify from 'fastify';
import rateLimit from 'fastify-rate-limit';
import { buildSchema } from 'type-graphql';
import { ApolloServer } from 'apollo-server';
import mercurius from 'mercurius';
import nodemailer, { Transporter } from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { EmailDetails } from './types';

const getMailer = () => {
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

const sendMail = async (mailer: Transporter, details: EmailDetails) => {
  await mailer.sendMail({
    from: `"${process.env.APP_NAME}" <${process.env.MAIL_SENDER}>`,
    to: details.to,
    subject: `${details.subject} - ${process.env.APP_NAME}`,
    text: details.text,
    html: details.html,
  });
};

const getResolvers = async () => {
  let resolverModules: Function[] = [];

  await Promise.all(
    glob.sync(__dirname + '/endpoint/*.ts').map(async (file) => {
      const { default: resolver } = await import(file);
      resolverModules.push(resolver);
    })
  );

  return resolverModules as [Function];
};

const development = async () => {
  const resolvers: [Function] = await getResolvers();

  const server = new ApolloServer({
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
};

const production = async () => {
  const resolvers: [Function] = await getResolvers();

  const app = fastify();

  app.register(mercurius, {
    schema: await buildSchema({
      resolvers,
    }),
    graphiql: true,
    context: (ctx) => {
      const mailer = getMailer();

      return {
        headers: ctx.headers,
        sendMail: async (details: EmailDetails) => {
          return sendMail(mailer, details);
        },
      };
    },
  });

  await app.register(rateLimit, {
    global: true,
    max: 120,
    timeWindow: '10 minute',
  });

  app.setNotFoundHandler({ preHandler: app.rateLimit() }, (_request, reply) => {
    reply.code(404).send({
      message: 'Route not found',
      error: 'Not Found',
      statusCode: 404,
    });
  });

  await app.listen(3300).then(() => {
    console.log(`🚀 Server ready at http://localhost:3300`);
  });
};

export { development, production };
