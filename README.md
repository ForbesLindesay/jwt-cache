# jwt-cache

Cache an async function for generating a JSON Web Token

[![Rolling Versions](https://img.shields.io/badge/Rolling%20Versions-Enabled-brightgreen)](https://rollingversions.com/ForbesLindesay/jwt-cache)

## Installation

```
yarn add jwt-cache
```

## Usage

```ts
import jwtCache from 'jwt-cache';

const cache = jwtCache({
  getToken: async () => {
    // this could be slow code for generating a JSON Web Token
    // with an expiry represented via the standard "exp" value
    return sign({hello: 'world'}, `my_secret`, {expiresIn: 3});
  },
  // If the token will not be valid for this many ms, get
  // a new token rather than returning the cached token
  // Defaults to 1 second
  minimumValidityMilliseconds: 100,
  // Optionally eagerly fetch a token before it is needed.
  // This will trigger fetching a new token this many ms
  // before it would reach the minimum validity threshold
  eagerRefreshMilliseconds: 100,
});

// When you need a token:
cache.getToken().then((token) => {
  // use the token here
});
```
