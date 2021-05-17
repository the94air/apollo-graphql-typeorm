import { gql } from 'apollo-server';
import { getRepository } from 'typeorm';
import { Author } from '../entity/Author';
import { Post, PostStatus } from '../entity/Post';

const typeDefs = gql`
  enum PostStatus {
    DRAFT
    PUBLISHED
    PRIVATE
  }

  type Post {
    id: ID!
    title: String
    content: String
    status: PostStatus
    author: Author
  }

  extend type Query {
    posts: [Post]
    post(id: ID!): Post
  }

  input AddPostInput {
    title: String
    content: String
    status: String
    authorId: ID
  }

  input UpdatePostInput {
    id: ID!
    title: String
    content: String
    status: String
    authorId: ID
  }

  extend type Mutation {
    addPost(input: AddPostInput): AddPostResponse
    updatePost(input: UpdatePostInput): UpdatePostResponse
    deletePost(id: ID!): DeletePostResponse
  }

  type AddPostResponse {
    post: Post
    author: Author
  }

  type UpdatePostResponse {
    post: Post
    author: Author
  }

  type DeletePostResponse {
    id: ID!
  }
`;

const resolvers = {
  PostStatus: {
    DRAFT: 'draft',
    PUBLISHED: 'published',
    PRIVATE: 'private',
  },
  Query: {
    async posts() {
      return await getRepository(Post).find();
    },
    async post(parent, { id }, context, info) {
      return await getRepository(Post).findOne(id);
    },
  },
  Post: {
    author: async (parent) => {
      let post = await getRepository(Post).findOne(parent.id, {
        relations: ['author'],
      });
      return post.author;
    },
  },
  Mutation: {
    async addPost(
      parent,
      { input: { title, content, status, authorId } },
      context,
      info
    ) {
      const postRepository = getRepository(Post);
      const authorRepository = getRepository(Author);
      const post = new Post();

      post.title = title;
      post.content = content;
      post.status = PostStatus[status as keyof typeof PostStatus];

      const author = await authorRepository.findOneOrFail(authorId);
      post.author = author;

      await postRepository.save(post);

      return { post, author };
    },
    async updatePost(
      parent,
      { input: { id, title, content, status, authorId } },
      context,
      info
    ) {
      const postRepository = getRepository(Post);
      const authorRepository = getRepository(Author);
      const post = await postRepository.findOneOrFail(id);

      post.title = title;
      post.content = content;
      post.status = PostStatus[status as keyof typeof PostStatus];

      const author = await authorRepository.findOneOrFail(authorId);
      post.author = author;

      await postRepository.save(post);

      return { post, author };
    },
    async deletePost(parent, { id }, context, info) {
      const postRepository = getRepository(Post);
      const post = await postRepository.findOneOrFail(id);

      await postRepository.remove(post);
      return { id };
    },
  },
};

export default {
  typeDefs,
  resolvers,
};
