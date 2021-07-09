import { Field, ID, ObjectType } from 'type-graphql';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  BaseEntity,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Author } from './Author';

@ObjectType()
@Entity()
export class User extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  readonly id: string;

  @Field()
  @Index()
  @Column()
  email: string;

  @Column()
  password: string;

  @Field(() => Author, { nullable: true })
  @OneToOne(() => Author, {
    nullable: true,
    onUpdate: 'NO ACTION',
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  author: Author;

  @Field(() => Boolean)
  @Column({ default: false })
  isVerified: boolean;

  @Field(() => Date)
  @CreateDateColumn({ type: 'timestamp with time zone' })
  readonly createdAt: Date;

  @Field(() => Date)
  @UpdateDateColumn({ type: 'timestamp with time zone' })
  readonly updatedAt: Date;
}
