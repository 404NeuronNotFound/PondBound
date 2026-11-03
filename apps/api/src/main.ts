import './config/load-environment.js';
import { createApp } from './app.js';
import { environment } from './config/environment.js';

const app = await createApp();
await app.listen(environment.PORT, environment.HOST);
