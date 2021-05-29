import fastify from 'fastify';
import { buildSchema } from 'type-graphql';
import { ApolloServer as ApolloServerDevelopment } from 'apollo-server';
import { ApolloServer as ApolloServerProduction } from 'apollo-server-fastify';
import { resolvers } from './endpoint/Index';

async function development() {
  const server = new ApolloServerDevelopment({
    schema: await buildSchema({
      resolvers,
    }),
  });

  server.listen(3000).then(({ url }) => {
    console.log(`🚀 Server ready at ${url}`);
  });
}

async function production() {
  const server = new ApolloServerProduction({
    schema: await buildSchema({
      resolvers,
    }),
  });

  const app = fastify();

  await server.start();
  app.register(server.createHandler());
  await app.listen(3000).then(() => {
    console.log(`🚀 Server ready at http://localhost:3000`);
  });
}

export { development, production };
