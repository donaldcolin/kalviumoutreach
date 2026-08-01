const { loadConfig } = require('metro-config');
const { getDefaultConfig } = require('expo/metro-config');
const metro = require('metro');

async function main() {
  const config = await loadConfig({ config: './metro.config.js' });
  console.log('watchFolders:', config.watchFolders);
  console.log('nodeModulesPaths:', config.resolver.nodeModulesPaths);
  console.log('disableHierarchicalLookup:', config.resolver.disableHierarchicalLookup);
}
main().catch(console.error);
