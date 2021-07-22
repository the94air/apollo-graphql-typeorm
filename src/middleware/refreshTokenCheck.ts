import { MiddlewareFn } from 'type-graphql';
import { verify } from 'jsonwebtoken';
import { Context, userData } from '../types';

export const refreshTokenCheck: MiddlewareFn<Context> = async (
  action,
  next
) => {
  const refreshTokenCookie = action.context.getCookie('session');

  if (!refreshTokenCookie) {
    return new Error('Not authenticated');
  }

  try {
    const refreshToken = refreshTokenCookie.split(':')[1];
    const data = verify(
      refreshToken,
      process.env.JWT_REFRESH_TOKEN_SECRET as string
    ) as userData;

    action.context.payload = {
      user: data,
    } as any;
  } catch (err) {
    console.log(err);
    throw new Error('Not authenticated');
  }

  const status = await action.context.redis.get(refreshTokenCookie);

  if (status === 'blacklisted') {
    throw new Error('Not authenticated');
  }

  return next();
};
