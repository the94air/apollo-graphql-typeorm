import {
  Arg,
  Field,
  FieldResolver,
  InputType,
  ID,
  Mutation,
  Query,
  Resolver,
  Root,
} from 'type-graphql';
import { Author } from '../entity/Author';
import { Post } from '../entity/Post';

@InputType()
class AuthorAddInput {
  @Field()
  name: string;
}

@InputType()
class AuthorUpdateInput {
  @Field(() => String, { nullable: true })
  name?: string;
}

@InputType()
class AuthorPostsInput {
  @Field(() => [ID])
  postIds: [string];
}

@Resolver(() => Author)
export class AuthorResolver {
  @Query(() => [Author])
  async authors() {
    return await Author.find();
  }

  @Query(() => Author)
  async author(@Arg('id', () => ID) id: string) {
    return await Author.findOne(id);
  }

  @FieldResolver(() => [Post])
  async posts(@Root() parent: Author) {
    const author = await Author.findOne(parent.id, {
      relations: ['posts'],
    });
    return author?.posts;
  }

  @Mutation(() => Author)
  async addAuthor(@Arg('input', () => AuthorAddInput) input: AuthorAddInput) {
    return await Author.create(input).save();
  }

  @Mutation(() => Author)
  async updateAuthor(
    @Arg('id', () => ID) id: string,
    @Arg('input', () => AuthorUpdateInput) input: AuthorUpdateInput
  ) {
    await Author.update(id, input);
    return await Author.findOne(id);
  }

  @Mutation(() => Author)
  async deleteAuthor(@Arg('id', () => ID) id: string) {
    const author = await Author.findOneOrFail(id);
    await Author.delete(id);
    return author;
  }

  @Mutation(() => Author)
  async updateAuthorPosts(
    @Arg('id', () => ID) id: string,
    @Arg('input', () => AuthorPostsInput) input: AuthorPostsInput
  ) {
    const posts = await Post.findByIds(input.postIds);
    const author = await Author.findOne(id);

    return await Promise.all(
      posts.map(async (post) => {
        post.author = author;
        await post.save();
      })
    ).then(async () => {
      return await Author.findOne(id);
    });
  }
}
