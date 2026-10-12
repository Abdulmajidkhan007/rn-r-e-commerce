// Bare React Native + monorepo Metro config (node_modules hoisted to the root).
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('node:path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

// The app pins react to the version react-native's renderer is built against
// (apps/mobile/node_modules/react), while the web app hoists a newer react to
// the root. Without this, hoisted packages (react-native, react-redux, ...)
// import the root copy and app code imports the pinned one — two Reacts, and
// the first hook crashes with "Cannot read property 'useState' of null".
// Every `react` / `react/*` import is therefore resolved from the app itself.
// scripts/check-single-react.mjs enforces this in CI.
const isReactImport = (moduleName) => moduleName === 'react' || moduleName.startsWith('react/');

const config = mergeConfig(getDefaultConfig(projectRoot), {
  watchFolders: [workspaceRoot],
  resolver: {
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(workspaceRoot, 'node_modules'),
    ],
    resolveRequest: (context, moduleName, platform) =>
      context.resolveRequest(
        isReactImport(moduleName)
          ? { ...context, originModulePath: path.join(projectRoot, 'index.js') }
          : context,
        moduleName,
        platform,
      ),
  },
});

module.exports = withNativeWind(config, { input: './global.css' });
