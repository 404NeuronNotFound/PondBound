const mode = process.argv[2];
if (!['production', 'test'].includes(mode))
  throw new Error('Choose production or test runtime mode');
process.env.NODE_ENV = mode;
await import('../dist/main.js');
