import { MiddlewareFn } from 'type-graphql';
import { verify } from 'jsonwebtoken';
import { Context, userData } from '../types';

export const Auth: MiddlewareFn<Context> = async (action, next) => {
  const authorization = action.context.headers['authorization'];

  if (!authorization) {
    throw new Error('Not authenticated');
  }

  try {
    const token = authorization.split(' ')[1];
    const data = verify(token, process.env.JWT_SECRET as string) as userData;

    action.context.payload = {
      user: data,
    } as any;
  } catch (err) {
    console.log(err);
    throw new Error('Not authenticated');
  }

  return next();
};

export const Verified: MiddlewareFn<Context> = async (action, next) => {
  try {
    if (action.context.payload?.user.isVerified === false) {
      throw new Error('Not verified');
    }
  } catch (err) {
    console.log(err);
    throw new Error('Not authenticated');
  }

  return next();
};
