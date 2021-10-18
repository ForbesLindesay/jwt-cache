import {sign, verify} from 'jsonwebtoken';
import jwtCache from '../';

jest.setTimeout(10_000);

test('jwtCache - eager', async () => {
  let calls = 0;
  const cache = jwtCache({
    getToken: async () => {
      calls++;
      return sign({hello: 'world'}, `my_secret`, {expiresIn: 3});
    },
    minimumValidityMilliseconds: 100,
    eagerRefreshMilliseconds: 500,
  });

  const tokens = await Promise.all([
    cache.getToken(),
    cache.getToken(),
    cache.getToken(),
  ]);

  expect(calls).toBe(1);
  for (const t of tokens) {
    verify(t, 'my_secret');
  }

  await delay(3_100);
  for (const t of tokens) {
    expect(() => verify(t, 'my_secret')).toThrow();
  }
  expect(calls).toBe(2);

  const tokens2 = await Promise.all([
    cache.getToken(),
    cache.getToken(),
    cache.getToken(),
  ]);
  for (const t of tokens2) {
    verify(t, 'my_secret');
  }
  expect(calls).toBe(2);
  cache.dispose();
});

test('jwtCache - lazy', async () => {
  let calls = 0;
  const cache = jwtCache({
    getToken: async () => {
      calls++;
      return sign({hello: 'world'}, `my_secret`, {expiresIn: 3});
    },
    minimumValidityMilliseconds: 100,
  });
  expect(calls).toBe(0);

  const tokens = await Promise.all([
    cache.getToken(),
    cache.getToken(),
    cache.getToken(),
  ]);

  expect(calls).toBe(1);
  for (const t of tokens) {
    verify(t, 'my_secret');
  }

  await delay(3_100);
  for (const t of tokens) {
    expect(() => verify(t, 'my_secret')).toThrow();
  }
  expect(calls).toBe(1);

  const tokens2 = await Promise.all([
    cache.getToken(),
    cache.getToken(),
    cache.getToken(),
  ]);
  expect(calls).toBe(2);

  for (const t of tokens2) {
    verify(t, 'my_secret');
  }
});

async function delay(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}
