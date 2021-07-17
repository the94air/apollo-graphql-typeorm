import 'reflect-metadata';
import { createConnection } from 'typeorm';
import { development, production } from './bootstrap';

const init = process.env.NODE_ENV === 'production' ? production : development;

(async () => {
  await createConnection()
    .then(init)
    .catch((error) => console.log(error));
})();
