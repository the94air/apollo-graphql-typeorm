import { MiddlewareFn } from 'type-graphql';
import { Context } from '../types';

export const isVerified: MiddlewareFn<Context> = async (action, next) => {
  try {
    if (action.context.payload?.user.isVerified === false) {
      return new Error('Not verified');
    }
  } catch (err) {
    console.log(err);
    throw new Error('Not authenticated');
  }

  return next();
};
