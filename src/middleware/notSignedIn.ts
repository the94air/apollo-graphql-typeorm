import { MiddlewareFn } from 'type-graphql';
import { verify } from 'jsonwebtoken';
import { Context, userData } from '../types';

export const notSignedIn: MiddlewareFn<Context> = async (action, next) => {
  const refreshTokenCookie = action.context.getCookie('session');

  if (refreshTokenCookie) {
    return new Error('Already logged in');
  }

  return next();
};
