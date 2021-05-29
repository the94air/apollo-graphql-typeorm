import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { createConnection } from 'typeorm';
import { development, production } from './bootstrap';

dotenv.config();

const init = process.env.NODE_ENV === 'production' ? production : development;

(async () => {
  await createConnection()
    .then(init)
    .catch((error) => console.log(error));
})();
