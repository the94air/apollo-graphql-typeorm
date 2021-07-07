import { Field, ID, ObjectType } from 'type-graphql';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  BaseEntity,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@ObjectType()
@Entity()
export class UserForgotPasswordToken extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  readonly id: string;

  @Field()
  @Column()
  email: string;

  @Field()
  @Index()
  @Column()
  token: string;

  @Field(() => Date)
  @CreateDateColumn()
  readonly createdAt: Date;

  @Field(() => Date)
  @UpdateDateColumn()
  readonly updatedAt: Date;
}
