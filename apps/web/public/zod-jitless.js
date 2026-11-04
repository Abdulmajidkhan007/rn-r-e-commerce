/*
 * Loaded by index.html as a classic script, i.e. BEFORE the app's module
 * bundle (and before zod's module body runs).
 *
 * The site's CSP has no 'unsafe-eval' (firebase.json). Zod v4 probes
 * `new Function('')` when an object schema is created, to decide whether to
 * JIT-compile the validator. The probe is caught, but the browser still reports
 * a `script-src` violation on every page. `jitless` skips the probe and uses
 * zod's interpreted path — same validation results. It has to be a global set
 * here: the schemas are built while modules load, before any app code could
 * call `z.config()`.
 */
globalThis.__zod_globalConfig = Object.assign(globalThis.__zod_globalConfig || {}, {
  jitless: true,
});
