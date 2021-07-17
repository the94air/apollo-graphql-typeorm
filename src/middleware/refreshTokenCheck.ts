import { MiddlewareFn } from 'type-graphql';
import { verify } from 'jsonwebtoken';
import { Context, userData } from '../types';

export const refreshTokenCheck: MiddlewareFn<Context> = async (
  action,
  next
) => {
  const refreshToken = action.context.cookies.session;

  if (!refreshToken) {
    throw new Error('Not authenticated');
  }

  // check if token is blacklisted

  try {
    const data = verify(
      refreshToken,
      process.env.JWT_SECRET as string
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
