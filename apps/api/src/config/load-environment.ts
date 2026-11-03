import { fileURLToPath } from 'node:url';
import { loadEnvironment } from './environment-loader.js';

loadEnvironment({ directory: fileURLToPath(new URL('../../', import.meta.url)) });
