import storageModule from 'redux-persist/lib/storage';
import type { PersistStorage } from '@kidswear/store';

/**
 * redux-persist's localStorage engine, normalized across bundler interop.
 *
 * redux-persist 6 is CommonJS. Vite 8's interop compiles
 * `import storage from 'redux-persist/lib/storage'` to the module *exports
 * object* (`{ __esModule: true, default: <engine> }`) rather than the engine
 * itself, so `storage.getItem` is undefined and `makeStore` throws during
 * render — a blank page with no build-time error. Unwrap when that happens, and
 * keep working if a future bundler hands back the engine directly.
 */
interface MaybeWrapped {
  default?: PersistStorage;
}

const resolved = (storageModule as MaybeWrapped).default ?? (storageModule as PersistStorage);

if (typeof resolved?.getItem !== 'function') {
  throw new Error(
    '[storage] redux-persist localStorage engine did not resolve to a storage object. ' +
      'This is a bundler interop problem, not a runtime one — check how ' +
      "'redux-persist/lib/storage' is being transformed.",
  );
}

export const webStorage: PersistStorage = resolved;
