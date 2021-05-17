import 'reflect-metadata';
import { createConnection } from 'typeorm';
import author from './endpoint/Author';
import post from './endpoint/Post';

import { ApolloServer, gql } from 'apollo-server';

const typeDefs = gql`
  type Query {
    _empty: String
  }
  type Mutation {
    _empty: String
  }
  ${author.typeDefs}
  ${post.typeDefs}
`;

const resolvers = [author.resolvers, post.resolvers];

createConnection()
  .then(async (connection) => {
    const server = new ApolloServer({
      typeDefs,
      resolvers,
    });

    server.listen().then(({ url }) => {
      console.log(`🚀  Server ready at ${url}`);
    });
  })
  .catch((error) => console.log(error));
