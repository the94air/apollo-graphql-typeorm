import * as dotenv from 'dotenv';
import mercurius from 'mercurius';
import { EmailDetails } from './types';
import rateLimit from 'fastify-rate-limit';
import { buildSchema } from 'type-graphql';
import { ApolloServer } from 'apollo-server';
import fastify, { FastifyRequest, FastifyReply } from 'fastify';
import fastifyCookie, {
  CookieSerializeOptions,
  FastifyCookieOptions,
} from 'fastify-cookie';
import {
  clearCookie,
  getMailer,
  sendMail,
  getResolvers,
  redis,
  setCookie,
  getCookie,
} from './utils';

dotenv.config();

const development = async () => {
  const resolvers: [Function] = await getResolvers();

  const server = new ApolloServer({
    schema: await buildSchema({
      resolvers,
    }),
    context: (ctx) => {
      const mailer = getMailer();

      return {
        redis: redis,
        headers: ctx.req.headers,
        getCookie: (name: string) => {
          return getCookie(name, ctx.req.cookies);
        },
        setCookie: (
          name: string,
          value: string,
          options: CookieSerializeOptions
        ) => {
          setCookie(name, value, options, ctx.res.cookie);
        },
        clearCookie: (name: string, options: CookieSerializeOptions) => {
          clearCookie(name, options, ctx.res.clearCookie);
        },
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

  app.register(fastifyCookie, {
    secret: process.env.JWT_SECRET,
  } as FastifyCookieOptions);

  await app.register(rateLimit, {
    global: true,
    max: 120,
    timeWindow: '10 minute',
  });

  app.register(mercurius, {
    schema: await buildSchema({
      resolvers,
    }),
    graphiql: true,
    context: (request: FastifyRequest, reply: FastifyReply) => {
      const mailer = getMailer();

      return {
        redis: redis,
        headers: request.headers,
        getCookie: (name: string) => {
          return getCookie(name, request.cookies);
        },
        setCookie: (
          name: string,
          value: string,
          options: CookieSerializeOptions
        ) => {
          setCookie(name, value, options, reply.cookie);
        },
        clearCookie: (name: string, options: CookieSerializeOptions) => {
          clearCookie(name, options, reply.clearCookie);
        },
        sendMail: async (details: EmailDetails) => {
          return sendMail(mailer, details);
        },
      };
    },
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
