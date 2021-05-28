import 'reflect-metadata';
import { createConnection } from 'typeorm';
import * as dotenv from 'dotenv';
import { ApolloServer } from 'apollo-server';
import { buildSchema } from 'type-graphql';
import { AuthorResolver } from './endpoint/AuthorResolver';
import { PostResolver } from './endpoint/PostResolver';

dotenv.config();

(async () => {
  await createConnection()
    .then(async () => {
      const server = new ApolloServer({
        schema: await buildSchema({
          resolvers: [AuthorResolver, PostResolver],
        }),
      });

      server.listen().then(({ url }) => {
        console.log(`🚀 Server ready at ${url}`);
      });
    })
    .catch((error) => console.log(error));
})();
