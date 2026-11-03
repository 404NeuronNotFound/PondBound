import 'dotenv/config';
import { createApp } from './app.js';
import { environment } from './config/environment.js';

const app = await createApp();
await app.listen(environment.PORT, '127.0.0.1');
