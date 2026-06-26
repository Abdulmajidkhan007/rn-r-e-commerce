/**
 * Generates a dependency-free, cross-platform id. Good enough for client-side
 * keys like saved-address ids (no cryptographic guarantees needed).
 */
export function genId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
