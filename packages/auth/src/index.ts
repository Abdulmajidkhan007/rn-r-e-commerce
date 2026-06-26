/**
 * @kidswear/auth — authentication orchestration (react).
 *
 * The glue between @kidswear/firebase (auth fns) and @kidswear/store (auth
 * slice). Keeps the store thunk-free and avoids circular deps. No UI here.
 */
export { loginSchema, registerSchema, forgotSchema } from './schemas';
export type { LoginValues, RegisterValues, ForgotValues } from './schemas';

export { mapAuthError } from './mapAuthError';

export { useAuthActions } from './useAuthActions';
export type { AuthActions } from './useAuthActions';

export { useAuthBootstrap } from './useAuthBootstrap';
export { useAuth } from './useAuth';
export type { AuthView } from './useAuth';
