import { describe, expect, it } from 'vitest';
import { webStorage } from './webStorage';

/**
 * Regression guard for a blank-page bug: Vite 8's CommonJS interop resolved
 * `redux-persist/lib/storage` to the module namespace rather than the storage
 * engine, so `makeStore` threw inside StoreProvider and the whole app rendered
 * nothing. Type-check and build both passed — only running the app revealed it.
 */
describe('webStorage', () => {
  it('exposes the redux-persist Storage interface', () => {
    expect(typeof webStorage.getItem).toBe('function');
    expect(typeof webStorage.setItem).toBe('function');
    expect(typeof webStorage.removeItem).toBe('function');
  });

  it('is the engine itself, not a module namespace wrapper', () => {
    expect(webStorage).not.toHaveProperty('default');
    expect(webStorage).not.toHaveProperty('__esModule');
  });

  it('round-trips a value', async () => {
    await webStorage.setItem('kidswear-test', 'value');
    await expect(webStorage.getItem('kidswear-test')).resolves.toBe('value');
    await webStorage.removeItem('kidswear-test');
    await expect(webStorage.getItem('kidswear-test')).resolves.toBeNull();
  });
});
