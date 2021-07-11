import { Secret, VerifyOptions } from 'jsonwebtoken';
import { userData } from './src/types';

declare module 'jsonwebtoken' {
  function verify(
    token: string,
    secretOrPublicKey: Secret,
    options?: VerifyOptions
  ): userData;
}
