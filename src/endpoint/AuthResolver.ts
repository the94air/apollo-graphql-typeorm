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
import ms from 'ms';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import argon2 from 'argon2';
import { sign } from 'jsonwebtoken';
import crypto from 'crypto';
import { Context, userData } from '../types';
import { User } from '../entity/User';
import { Author } from '../entity/Author';
import { Auth } from '../middleware/Auth';
import { Verified } from '../middleware/Verified';
import { UserVerify } from '../entity/UserVerify';
import { UserForgotPassword } from '../entity/UserForgotPassword';
import { refreshTokenCheck } from '../middleware/refreshTokenCheck';

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

@InputType()
class UserChangePasswordInput {
  @Field()
  oldPassword: string;

  @Field()
  newPassword: string;
}

@ObjectType()
export class ResponseMessage {
  @Field()
  message?: string;

  @Field()
  accessToken?: string;
}

const refreshTokenFactory = (user: User) => {
  const data: userData = {
    userId: user.id,
  };

  const token = sign(data, process.env.JWT_SECRET as string, {
    expiresIn: '1y',
  });
  return token;
};

const accessTokenFactory = (user: User) => {
  const data: userData = {
    userId: user.id,
    isVerified: user.isVerified,
  };

  const token = sign(data, process.env.JWT_SECRET as string, {
    expiresIn: 100,
  });
  return token;
};

const urlTokenFactory = () => {
  return crypto.randomBytes(64).toString('hex');
};

const passwordHashFactory = async (plainPassword: string) => {
  return argon2.hash(plainPassword);
};

const passwordCompareGuard = async (
  passwordHash: string,
  plainPassword: string
) => {
  return argon2.verify(passwordHash, plainPassword);
};

@Resolver()
export default class AuthResolver {
  @Mutation(() => ResponseMessage)
  async signUp(
    @Arg('input', () => UserSignUpInput) input: UserSignUpInput,
    @Ctx() { sendMail, setCookie, redis }: Context
  ) {
    let user = await User.findOne({
      // email should be lowercase
      where: { email: input.email },
    });

    if (!user) {
      const author = await Author.create({
        name: input.name,
      }).save();

      const hashedPassword = await passwordHashFactory(input.password);
      const newUser = await User.create({
        // email should be lowercase
        email: input.email,
        password: hashedPassword,
        author: author,
      }).save();

      const verifyToken = urlTokenFactory();
      await UserVerify.create({
        // email should be lowercase
        email: input.email,
        token: verifyToken,
      }).save();

      await sendMail({
        to: newUser.email,
        subject: 'Verify email',
        html: `
          <p>Hi, ${newUser.author.name}</p>
          <p>Click the email below to verify your email</p>
          <p><a href="http://localhost:8080/auth/verify/${verifyToken}">Verify email</a></p>
          <p>Thank you</p>
        `,
      });

      const refreshToken = `${newUser.id}:${refreshTokenFactory(newUser)}`;

      setCookie('session', refreshToken, {
        maxAge: ms('1y') / 1000,
        httpOnly: true,
      });

      await redis.set(refreshToken, '');

      return {
        accessToken: accessTokenFactory(newUser),
      };
    }

    return new Error('Email is taken');
  }

  @Mutation(() => ResponseMessage)
  @UseMiddleware(Auth)
  async resendVerifyEmail(@Ctx() { payload, sendMail }: Context) {
    const user = await User.findOne(payload?.user.userId, {
      relations: ['author'],
    });

    const verifyToken = urlTokenFactory();

    await UserVerify.create({
      // email should be lowercase
      email: user?.email,
      token: verifyToken,
    }).save();

    await sendMail({
      to: user?.email as string,
      subject: 'Resent verify email',
      html: `
        <p>Hi, ${user?.author.name}</p>
        <p>Click the email below to verify your email</p>
        <p><a href="http://localhost:8080/auth/verify/${verifyToken}">Verify email</a></p>
        <p>Thank you</p>
      `,
    });

    return {
      message: 'Verify token resent',
    };
  }

  @Mutation(() => ResponseMessage)
  @UseMiddleware(Auth)
  async verifyEmail(
    @Arg('input', () => UserVerifyInput) input: UserVerifyInput,
    @Ctx() { payload }: Context
  ) {
    const user = await User.findOne(payload?.user.userId);

    const verifyToken = await UserVerify.findOne({
      where: { token: input.token, email: user?.email },
    });

    if (user && verifyToken) {
      dayjs.extend(isBetween);

      if (
        dayjs().isBetween(
          dayjs(verifyToken.createdAt),
          dayjs(verifyToken.createdAt).add(60, 'minutes')
        )
      ) {
        const tokens = await UserVerify.find({
          where: { email: user.email },
        });

        await Promise.all(
          tokens.map(async (token: { remove: () => any }) => {
            await token.remove();
          })
        );

        await User.update(user.id, {
          isVerified: true,
        });

        return {
          message: 'Account is verified',
        };
      }
      return new Error('Token has expired');
    }
    return new Error('Invalid token');
  }

  @Mutation(() => ResponseMessage)
  async signIn(
    @Arg('input', () => UserSignInInput) input: UserSignInInput,
    @Ctx() { setCookie, redis }: Context
  ) {
    const user = await User.findOne({ where: { email: input.email } });

    if (user) {
      const match = await passwordCompareGuard(user.password, input.password);

      if (match) {
        // blacklist old refreshToken
        // cookies.session

        const refreshToken = `${user.id}:${refreshTokenFactory(user)}`;

        setCookie('session', refreshToken, {
          maxAge: ms('1y') / 1000,
          httpOnly: true,
        });

        await redis.set(refreshToken, '');

        return {
          accessToken: accessTokenFactory(user),
        };
      }
    }

    return new Error('Incorrect credencials');
  }

  @Mutation(() => ResponseMessage)
  @UseMiddleware(refreshTokenCheck)
  async refresh(@Ctx() { payload, setCookie, redis }: Context) {
    const user = await User.findOne(payload?.user.userId);

    // blacklist refreshToken

    if (user) {
      const refreshToken = `${user.id}:${refreshTokenFactory(user)}`;

      setCookie('session', refreshToken, {
        maxAge: ms('1y') / 1000,
        httpOnly: true,
      });

      await redis.set(refreshToken, '');

      return {
        accessToken: accessTokenFactory(user),
      };
    }

    return new Error('Access unauthorized');
  }

  @Mutation(() => ResponseMessage)
  @UseMiddleware(Auth)
  async signOut(@Ctx() { payload, clearCookie }: Context) {
    const user = await User.findOne(payload?.user.userId);

    clearCookie('session');

    // blacklist refreshToken

    return new Error('Account signed out');
  }

  @Mutation(() => ResponseMessage)
  async forgotPassword(
    @Arg('input', () => UserForgotPasswordInput) input: UserForgotPasswordInput,
    @Ctx() { sendMail }: Context
  ) {
    const user = await User.findOne({
      where: { email: input.email },
      relations: ['author'],
    });

    if (user) {
      const forgotPasswordToken = urlTokenFactory();

      await UserForgotPassword.create({
        // email should be lowercase
        email: user.email,
        token: forgotPasswordToken,
      }).save();

      await sendMail({
        to: user?.email,
        subject: 'Forgot password',
        html: `
          <p>Hi, ${user?.author.name}</p>
          <p>Click the email below to reset your password</p>
          <p><a href="http://localhost:8080/auth/forgot-password/${forgotPasswordToken}">Reset password</a></p>
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
    const forgotPasswordToken = await UserForgotPassword.findOne({
      where: { token: input.token },
    });

    const user = await User.findOne({
      where: { email: forgotPasswordToken?.email },
    });

    if (forgotPasswordToken && user) {
      dayjs.extend(isBetween);

      if (
        dayjs().isBetween(
          dayjs(forgotPasswordToken.createdAt),
          dayjs(forgotPasswordToken.createdAt).add(60, 'minutes')
        )
      ) {
        const passwordHash = await passwordHashFactory(input.password);

        await User.update(user.id, {
          password: passwordHash,
        });

        forgotPasswordToken.remove();

        // blacklist all refreshTokens

        return {
          message: 'Password has been reset',
        };
      }
      return new Error('Token has expired');
    }
    return new Error('Invalid token');
  }

  @Mutation(() => ResponseMessage)
  @UseMiddleware(Auth)
  async changePassword(
    @Arg('input', () => UserChangePasswordInput) input: UserChangePasswordInput,
    @Ctx() { payload }: Context
  ) {
    const user = await User.findOne(payload?.user.userId);

    if (user) {
      const match = await passwordCompareGuard(
        user.password,
        input.oldPassword
      );

      if (match) {
        const hashedPassword = await passwordHashFactory(input.newPassword);

        await User.update(user.id, {
          password: hashedPassword,
        });

        return {
          message: 'Password changed',
        };
      }
      return new Error('Current password invalid');
    }
    return new Error('Access unauthorized');
  }

  @Query(() => User)
  @UseMiddleware(Auth)
  @UseMiddleware(Verified)
  async user(@Ctx() { payload }: Context) {
    return await User.findOne(payload?.user.userId, { relations: ['author'] });
  }
}
