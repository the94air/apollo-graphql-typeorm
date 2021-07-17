import { MiddlewareFn } from 'type-graphql';
import { Context } from '../types';

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
