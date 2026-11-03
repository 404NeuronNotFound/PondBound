import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateSeedTarget } from '../scripts/seed-database.mjs';

const local =
  'postgresql://pondbound_migrator:fixture@127.0.0.1:5432/pondbound_test_seed?schema=game';
test('seeds require explicit disposable local targets and cannot inherit production credentials', () => {
  assert.equal(validateSeedTarget(local, 'test').pathname, '/pondbound_test_seed');
  assert.equal(
    validateSeedTarget(local.replace('test_seed', 'dev_seed'), 'development').hostname,
    '127.0.0.1',
  );
  for (const value of [
    undefined,
    'invalid',
    local.replace('127.0.0.1', 'db.example.com'),
    local.replace('pondbound_test_seed', 'postgres'),
    local.replace('pondbound_migrator', 'postgres'),
    local.replace('schema=game', 'schema=public'),
    local + '&host=db.example.com',
  ]) {
    assert.throws(
      () => validateSeedTarget(value, 'test'),
      (error) => !error.message.includes('fixture'),
    );
  }
  assert.throws(() => validateSeedTarget(local, 'production'), /non-production/);
});
