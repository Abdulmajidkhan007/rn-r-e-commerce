/**
 * @kidswear/config — shared tooling configuration.
 *
 * - ESLint flat config: `@kidswear/config/eslint`
 * - Prettier config:    `@kidswear/config/prettier`
 * - Base tsconfig:      `@kidswear/config/tsconfig.base.json`
 *
 * This barrel re-exports the programmatic configs for consumers that prefer
 * importing them as values.
 */
export { baseConfig as eslintBaseConfig } from '../eslint.config.js';
export { default as prettierConfig } from '../prettier.config.js';
