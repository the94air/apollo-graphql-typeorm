import { Field, ID, ObjectType } from 'type-graphql';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  BaseEntity,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Post } from './Post';

@ObjectType()
@Entity()
export class Author extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  readonly id: string;

  @Field()
  @Column()
  name: string;

  @Field(() => [Post])
  @OneToMany(() => Post, (post) => post.author, {
    nullable: true,
    onUpdate: 'NO ACTION',
    onDelete: 'NO ACTION',
  })
  posts?: Post[];

  @Field(() => Date)
  @CreateDateColumn({ type: 'timestamp with time zone' })
  readonly createdAt: Date;

  @Field(() => Date)
  @UpdateDateColumn({ type: 'timestamp with time zone' })
  readonly updatedAt: Date;
}
