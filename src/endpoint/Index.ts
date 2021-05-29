import { AuthorResolver } from './AuthorResolver';
import { PostResolver } from './PostResolver';

export const resolvers = [AuthorResolver, PostResolver] as const;
