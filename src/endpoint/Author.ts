import { gql } from 'apollo-server';
import { getRepository } from 'typeorm';
import { Author } from '../entity/Author';
import { Post } from '../entity/Post';

const typeDefs = gql`
  type Author {
    id: ID!
    name: String
    posts: [Post]
  }

  extend type Query {
    authors: [Author]
    author(id: ID!): Author
  }

  input AddAuthorInput {
    name: String
    postIds: [ID]
  }

  input UpdateAuthorInput {
    id: ID!
    name: String
    postIds: [ID]
  }

  extend type Mutation {
    addAuthor(input: AddAuthorInput): AddAuthorResponse
    updateAuthor(input: UpdateAuthorInput): UpdateAuthorResponse
    deleteAuthor(id: ID!): DeleteAuthorResponse
  }

  type AddAuthorResponse {
    author: Author
    posts: [Post]
  }

  type UpdateAuthorResponse {
    author: Author
    posts: [Post]
  }

  type DeleteAuthorResponse {
    id: ID!
  }
`;

const resolvers = {
  Query: {
    async authors() {
      let authors = await getRepository(Author).find();
      return authors;
    },
    async author(parent, { id }, context, info) {
      return await getRepository(Author).findOne(id);
    },
  },
  Author: {
    posts: async (parent) => {
      let author = await getRepository(Author).findOne(parent.id, {
        relations: ['posts'],
      });
      return author.posts;
    },
  },
  Mutation: {
    async addAuthor(parent, { input: { name, postIds } }, context, info) {
      const authorRepository = getRepository(Author);
      const postRepository = getRepository(Post);
      const author = new Author();

      author.name = name;

      const posts = await postRepository.findByIds(postIds);
      author.posts = posts;

      await authorRepository.save(author);

      return { author, posts };
    },
    async updateAuthor(
      parent,
      { input: { id, name, postIds } },
      context,
      info
    ) {
      const authorRepository = getRepository(Author);
      const postRepository = getRepository(Post);
      const author = await authorRepository.findOneOrFail(id);

      author.name = name;

      const posts = await postRepository.findByIds(postIds);
      author.posts = posts;

      await authorRepository.save(author);

      return { author, posts };
    },
    async deleteAuthor(parent, { id }, context, info) {
      const authorRepository = getRepository(Author);
      const author = await authorRepository.findOneOrFail(id);

      await authorRepository.remove(author);

      return { id };
    },
  },
};

export default {
  typeDefs,
  resolvers,
};
