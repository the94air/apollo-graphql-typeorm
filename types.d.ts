import { Secret, VerifyOptions } from 'jsonwebtoken';
import { userData } from './src/context';

declare module 'jsonwebtoken' {
  function verify(
    token: string,
    secretOrPublicKey: Secret,
    options?: VerifyOptions
  ): userData;
}
