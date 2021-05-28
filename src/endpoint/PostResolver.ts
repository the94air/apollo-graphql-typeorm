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
import { Post, PostStatus } from '../entity/Post';

@InputType()
class PostAddInput {
  @Field()
  title: string;

  @Field()
  content: string;

  @Field(() => PostStatus)
  status: PostStatus;
}

@InputType()
class PostUpdateInput {
  @Field(() => String, { nullable: true })
  title?: string;

  @Field(() => String, { nullable: true })
  content?: string;

  @Field(() => PostStatus, { nullable: true })
  status?: PostStatus;
}

@InputType()
class PostAuthorInput {
  @Field(() => ID)
  authorId: string;
}

@Resolver(() => Post)
export class PostResolver {
  @Query(() => [Post])
  async posts() {
    return await Post.find();
  }

  @Query(() => Post)
  async post(@Arg('id', () => ID) id: string) {
    return await Post.findOne(id);
  }

  @FieldResolver(() => Author)
  async author(@Root() parent: Post) {
    const post = await Post.findOne(parent.id, {
      relations: ['author'],
    });
    return post?.author;
  }

  @Mutation(() => Post)
  async addPost(@Arg('input', () => PostAddInput) input: PostAddInput) {
    return await Post.create(input).save();
  }

  @Mutation(() => Post)
  async updatePost(
    @Arg('id', () => ID) id: string,
    @Arg('input', () => PostUpdateInput) input: PostUpdateInput
  ) {
    await Post.update(id, input);
    return await Post.findOne(id);
  }

  @Mutation(() => Post)
  async deletePost(@Arg('id', () => ID) id: string) {
    const post = await Post.findOneOrFail(id);
    await Post.delete(id);
    return post;
  }

  @Mutation(() => Post)
  async updatePostAuthor(
    @Arg('id', () => ID) id: string,
    @Arg('input', () => PostAuthorInput) input: PostAuthorInput
  ) {
    const author = await Author.findOne(input.authorId);

    await Post.update(id, {
      author: author,
    });

    return await Post.findOne(id);
  }
}
