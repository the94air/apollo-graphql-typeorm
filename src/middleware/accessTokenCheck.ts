import { MiddlewareFn } from 'type-graphql';
import { verify } from 'jsonwebtoken';
import { Context, userData } from '../types';

export const accessTokenCheck: MiddlewareFn<Context> = async (action, next) => {
  const authorization = action.context.headers['authorization'];

  if (!authorization) {
    return new Error('Not authenticated');
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
