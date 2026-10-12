// Guards against two copies of React in the mobile bundle.
//
// The renderer (inside react-native) and app code must share ONE `react`
// module: hooks read the dispatcher the renderer installs on its own copy, so
// a component bound to the other copy crashes at startup with
// "Cannot read property 'useState' of null" (APK v1.0.7).
//
// Usage: node scripts/check-single-react.mjs <bundle.map>
import { readFileSync } from 'node:fs';

const mapPath = process.argv[2];
if (!mapPath) {
  console.error('Usage: node scripts/check-single-react.mjs <bundle.map>');
  process.exit(2);
}

const { sources } = JSON.parse(readFileSync(mapPath, 'utf8'));
const copies = new Set();
for (const source of sources) {
  const match = /^(.*[\\/]node_modules[\\/]react)[\\/]/.exec(source);
  if (match) copies.add(match[1]);
}

if (copies.size !== 1) {
  console.error(`Expected exactly one copy of react in the bundle, found ${copies.size}:`);
  for (const copy of copies) console.error(`  ${copy}`);
  process.exit(1);
}
console.log(`OK: one copy of react — ${[...copies][0]}`);
