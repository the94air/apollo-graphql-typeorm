import * as dotenv from 'dotenv';
import mercurius from 'mercurius';
import { EmailDetails } from './types';
import rateLimit from 'fastify-rate-limit';
import { buildSchema } from 'type-graphql';
import fastify, { FastifyRequest, FastifyReply } from 'fastify';
import fastifyCors from 'fastify-cors';
import fastifyCookie, {
  CookieSerializeOptions,
  FastifyCookieOptions,
} from 'fastify-cookie';
import {
  getMailer,
  sendMail,
  getResolvers,
  getRedis,
  getCookie,
  PREFIX,
} from './utils';

dotenv.config();

const development = async () => {
  const resolvers: [Function] = await getResolvers();

  const app = fastify();

  app.register(fastifyCookie, {
    secret: process.env.COOKIES_SECRET,
    signed: true,
    secure: false,
  } as FastifyCookieOptions);

  app.register(fastifyCors, {
    origin: process.env.GRAPHQL_CLIENT_URI,
    credentials: true,
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

  app.register(mercurius, {
    schema: await buildSchema({
      resolvers,
    }),
    graphiql: true,
    context: (request: FastifyRequest, reply: FastifyReply) => {
      const mailer = getMailer();
      const redis = getRedis();

      return {
        redis: redis,
        headers: request.headers,
        getCookie: (name: string) => {
          return getCookie(PREFIX + name, request.cookies);
        },
        setCookie: (
          name: string,
          value: string,
          options?: CookieSerializeOptions
        ) => {
          reply.cookie(PREFIX + name, value, {
            ...options,
            sameSite: false,
            secure: false,
          });
        },
        sendMail: async (details: EmailDetails) => {
          return sendMail(mailer, details);
        },
      };
    },
  });

  await app.listen(3000).then(() => {
    console.log(`🚀 Development server ready at http://localhost:3000`);
  });
};

const production = async () => {
  const resolvers: [Function] = await getResolvers();

  const app = fastify();

  app.register(fastifyCookie, {
    secret: process.env.COOKIES_SECRET,
    signed: true,
    secure: true,
  } as FastifyCookieOptions);

  app.register(fastifyCors, {
    origin: process.env.GRAPHQL_CLIENT_URI,
    credentials: true,
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

  app.register(mercurius, {
    schema: await buildSchema({
      resolvers,
    }),
    graphiql: false,
    context: (request: FastifyRequest, reply: FastifyReply) => {
      const mailer = getMailer();
      const redis = getRedis();

      return {
        redis: redis,
        headers: request.headers,
        getCookie: (name: string) => {
          return getCookie(PREFIX + name, request.cookies);
        },
        setCookie: (
          name: string,
          value: string,
          options?: CookieSerializeOptions
        ) => {
          reply.cookie(PREFIX + name, value, {
            ...options,
            sameSite: true,
            secure: true,
          });
        },
        sendMail: async (details: EmailDetails) => {
          return sendMail(mailer, details);
        },
      };
    },
  });

  await app.listen(3333).then(() => {
    console.log(`🚀 Production server ready at http://localhost:3333`);
  });
};

export { development, production };
