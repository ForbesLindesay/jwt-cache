import decode from 'jwt-decode';

export interface JwtCacheOptions {
  getToken(): Promise<string>;
  /**
   * Defaults to 0 (i.e. disabled)
   */
  eagerRefreshMilliseconds?: number;
  /**
   * Defaults to 1 second
   */
  minimumValidityMilliseconds?: number;
}
interface State {
  token: string;
  expiry: number;
}
export default function jwtCache({
  getToken,
  eagerRefreshMilliseconds = 0,
  minimumValidityMilliseconds = 1_000,
}: JwtCacheOptions) {
  let statePromise: undefined | Promise<State>;
  let nextState: undefined | Promise<State>;
  const getState = async (): Promise<State> => {
    const token = await getToken();
    const decoded = decode(token);
    if (
      typeof decoded === 'object' &&
      decoded !== null &&
      typeof (decoded as any).exp === 'number'
    ) {
      const expiry = (decoded as any).exp * 1000;
      return {token, expiry};
    } else {
      throw new Error(
        `You can only cache a JWT if it has an "exp" that is an integer number of seconds`,
      );
    }
  };

  const handleEagerRefresh = (
    state: State,
    currentStatePromise: Promise<State>,
  ) => {
    if (eagerRefreshMilliseconds) {
      setTimeout(() => {
        if (statePromise === currentStatePromise) {
          const thisNextState = (nextState = getState());

          thisNextState.then(
            (state) => {
              if (
                nextState === thisNextState &&
                statePromise === currentStatePromise
              ) {
                statePromise = thisNextState;
                handleEagerRefresh(state, thisNextState);
              }
            },
            (_ex) => {
              if (
                nextState === thisNextState &&
                statePromise === currentStatePromise
              ) {
                nextState = undefined;
              }
            },
          );
        }
      }, state.expiry - Date.now() - minimumValidityMilliseconds - eagerRefreshMilliseconds);
    }
  };

  const getUpdatedToken = async (
    currentStatePromise: Promise<State> | undefined,
  ) => {
    if (statePromise && currentStatePromise !== statePromise) {
      return (await statePromise).token;
    }
    statePromise = nextState ?? getState();
    nextState = undefined;
    try {
      const state = await statePromise;
      handleEagerRefresh(state, statePromise);
      return state.token;
    } catch (ex) {
      statePromise = undefined;
      throw ex;
    }
  };

  if (eagerRefreshMilliseconds) {
    getUpdatedToken(undefined).catch(() => {
      // ignore error until a token is actually requested
    });
  }

  return {
    getToken: async () => {
      const stateP = statePromise;
      if (!stateP) {
        return await getUpdatedToken(stateP);
      }

      const state = await stateP;
      if (state.expiry - Date.now() >= minimumValidityMilliseconds) {
        return state.token;
      }
      return await getUpdatedToken(stateP);
    },
  };
}
