import { MiddlewareFn } from 'type-graphql';
import { verify } from 'jsonwebtoken';
import { Context, userData } from '../types';

export const accessTokenCheck: MiddlewareFn<Context> = async (action, next) => {
  const authorizationHeader = action.context.headers['authorization'];

  if (!authorizationHeader) {
    return new Error('Not authenticated');
  }

  try {
    const accessToken = authorizationHeader.split(' ')[1];
    const data = verify(
      accessToken,
      process.env.JWT_ACCESS_TOKEN_SECRET as string
    ) as userData;

    action.context.payload = {
      user: data,
    } as any;
  } catch (err) {
    console.log(err);
    throw new Error('Not authenticated');
  }

  return next();
};
