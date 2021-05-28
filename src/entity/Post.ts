import { Field, ID, ObjectType, registerEnumType } from 'type-graphql';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  BaseEntity,
  CreateDateColumn,
  UpdateDateColumn,
  RelationId,
} from 'typeorm';
import { Author } from './Author';

export enum PostStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  PRIVATE = 'private',
}

registerEnumType(PostStatus, {
  name: 'PostStatus',
});

@ObjectType()
@Entity()
export class Post extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  readonly id: string;

  @Field()
  @Column()
  title: string;

  @Field()
  @Column()
  content: string;

  @Field(() => PostStatus)
  @Column({
    type: 'enum',
    enum: PostStatus,
    default: PostStatus.DRAFT,
  })
  status: PostStatus;

  @Field(() => Author, { nullable: true })
  @ManyToOne(() => Author, (author) => author.posts, {
    nullable: true,
    onUpdate: 'NO ACTION',
    onDelete: 'CASCADE',
  })
  author?: Author;

  @Field(() => Date)
  @CreateDateColumn()
  readonly createdAt: Date;

  @Field(() => Date)
  @UpdateDateColumn()
  readonly updatedAt: Date;
}
