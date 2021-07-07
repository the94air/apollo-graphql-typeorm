import {
  Arg,
  Field,
  InputType,
  Mutation,
  Query,
  Resolver,
  Ctx,
  UseMiddleware,
  ObjectType,
} from 'type-graphql';
import dayjs from 'dayjs';
import argon2 from 'argon2';
import { sign } from 'jsonwebtoken';
import crypto from 'crypto';
import { Context, userData } from '../context';
import { User } from '../entity/User';
import { Author } from '../entity/Author';
import { Auth, Verified } from '../middleware/Auth';
import { UserVerifyToken } from '../entity/UserVerifyToken';
import { UserForgotPasswordToken } from '../entity/UserForgotPasswordToken';

@ObjectType()
export class ResponseMessage {
  @Field()
  message?: string;

  @Field()
  accessToken?: string;
}

@InputType()
class UserSignUpInput {
  @Field()
  name: string;

  @Field()
  email: string;

  @Field()
  password: string;
}

@InputType()
class UserSignInInput {
  @Field()
  email: string;

  @Field()
  password: string;
}

@InputType()
class UserVerifyInput {
  @Field()
  token: string;
}

@InputType()
class UserForgotPasswordInput {
  @Field()
  email: string;
}

@InputType()
class UserPasswordResetInput {
  @Field()
  token: string;

  @Field()
  password: string;
}

function accessTokenFactory(user: User) {
  const data: userData = {
    userId: user.id,
  };

  const token = sign(data, process.env.JWT_SECRET as string, {
    expiresIn: '60 days',
  });
  return token;
}

function urlTokenFactory() {
  return crypto.randomBytes(64).toString('hex');
}

async function passwordHashFactory(plainPassword: string) {
  return await argon2.hash(plainPassword);
}

async function passwordCompareFactory(
  passwordHash: string,
  plainPassword: string
) {
  return await argon2.verify(passwordHash, plainPassword);
}

@Resolver(() => ResponseMessage)
export default class AuthResolver {
  @Mutation(() => ResponseMessage)
  async signUp(
    @Arg('input', () => UserSignUpInput) input: UserSignUpInput,
    @Ctx() { mailer }: Context
  ) {
    let user = await User.findOne({
      where: { email: input.email },
      relations: ['author'],
    });
    if (!user) {
      const author = await Author.create({
        name: input.name,
      }).save();

      const hashedPassword = await passwordHashFactory(input.password);
      const user = await User.create({
        email: input.email,
        password: hashedPassword,
        author: author,
      }).save();

      const verifyToken = urlTokenFactory();

      await UserVerifyToken.create({
        email: input.email,
        token: verifyToken,
      }).save();

      await mailer.sendMail({
        from: `"${process.env.APP_NAME}" <${process.env.MAIL_SENDER}>`,
        to: user.email,
        subject: 'Verify email | ${process.env.APP_NAME}',
        html: `
          <p>Hi, ${user.author.name}</p>
          <p>Click the email below to verify your email</p>
          <p><a href="http://localhost:3000/">Verify email</a></p>
          <p>Thank you</p>
        `,
      });

      return {
        accessToken: accessTokenFactory(user),
      };
    }
    return new Error('Email is taken');
  }

  @Mutation(() => ResponseMessage)
  @UseMiddleware(Auth)
  async resendVerifyEmail(@Ctx() { payload, mailer }: Context) {
    const user = payload?.user;

    const verifyToken = urlTokenFactory();

    await UserVerifyToken.create({
      email: user?.email,
      token: verifyToken,
    }).save();

    await mailer.sendMail({
      from: `"${process.env.APP_NAME}" <${process.env.MAIL_SENDER}>`,
      to: user?.email,
      subject: 'Resent verify email | ${process.env.APP_NAME}',
      html: `
        <p>Hi, ${user?.author.name}</p>
        <p>Click the email below to verify your email</p>
        <p><a href="http://localhost:3000/">Verify email</a></p>
        <p>Thank you</p>
      `,
    });

    return {
      message: 'Verify token resent!',
    };
  }

  @Mutation(() => ResponseMessage)
  @UseMiddleware(Auth)
  async verifyEmail(
    @Arg('input', () => UserVerifyInput) input: UserVerifyInput,
    @Ctx() { payload }: Context
  ) {
    const user = payload?.user;
    const verifyToken = await UserVerifyToken.findOne({
      where: { token: input.token, email: user?.email },
    });

    if (user && verifyToken) {
      if (
        dayjs(verifyToken.createdAt) >= dayjs() &&
        dayjs(verifyToken.createdAt) <= dayjs().add(60, 'minutes')
      ) {
        const tokens = await UserVerifyToken.find({
          where: { email: user.email },
        });

        return await Promise.all(
          tokens.map(async (token: { remove: () => any }) => {
            await token.remove();
          })
        ).then(async () => {
          await User.update(user.id, {
            isVerified: true,
          });
          return {
            message: 'Account is verified',
          };
        });
      }
      return new Error('Token has expired');
    }
    return new Error('Invalid token');
  }

  @Mutation(() => ResponseMessage)
  async signIn(@Arg('input', () => UserSignInInput) input: UserSignInInput) {
    const user = await User.findOne({ where: { email: input.email } });
    if (user) {
      const match = await passwordCompareFactory(user.password, input.password);
      if (match) {
        return {
          accessToken: accessTokenFactory(user),
        };
      }
    }
    return new Error('Incorrect credencials');
  }

  @Mutation(() => ResponseMessage)
  async forgotPassword(
    @Arg('input', () => UserForgotPasswordInput) input: UserForgotPasswordInput,
    @Ctx() { mailer }: Context
  ) {
    const user = await User.findOne({ where: { email: input.email } });
    if (user) {
      const forgotPasswordToken = urlTokenFactory();

      await UserForgotPasswordToken.create({
        email: user.email,
        token: forgotPasswordToken,
      }).save();

      await mailer.sendMail({
        from: `"${process.env.APP_NAME}" <${process.env.MAIL_SENDER}>`,
        to: user?.email,
        subject: 'Forgot password | ${process.env.APP_NAME}',
        html: `
          <p>Hi, ${user?.author.name}</p>
          <p>Click the email below to reset your password</p>
          <p><a href="http://localhost:3000/">Reset password</a></p>
          <p>Thank you</p>
        `,
      });
    }
    return {
      message: 'An email has been sent if account exists',
    };
  }

  @Mutation(() => ResponseMessage)
  async resetPassword(
    @Arg('input', () => UserPasswordResetInput) input: UserPasswordResetInput
  ) {
    const forgotPasswordToken = await UserForgotPasswordToken.findOne({
      where: { token: input.token },
    });

    const user = await User.findOne({
      where: { email: forgotPasswordToken?.email },
    });

    if (forgotPasswordToken && user) {
      if (
        dayjs(forgotPasswordToken.createdAt) >= dayjs() &&
        dayjs(forgotPasswordToken.createdAt) <= dayjs().add(60, 'minutes')
      ) {
        const passwordHash = await passwordHashFactory(input.password);
        await User.update(user.id, {
          password: passwordHash,
        });
        return {
          message: 'Password has been reset',
        };
      }
      return new Error('Token has expired');
    }
    return new Error('Invalid token');
  }

  @Query(() => User)
  @UseMiddleware(Auth)
  @UseMiddleware(Verified)
  async user(@Ctx() { payload }: Context) {
    return payload?.user;
  }
}
