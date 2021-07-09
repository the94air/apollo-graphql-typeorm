import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { createConnection } from 'typeorm';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { development, production } from './bootstrap';

dotenv.config();

dayjs.extend(isBetween);

const init = process.env.NODE_ENV === 'production' ? production : development;

(async () => {
  await createConnection()
    .then(init)
    .catch((error) => console.log(error));
})();
