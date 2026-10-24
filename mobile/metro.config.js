const {getDefaultConfig}=require('expo/metro-config');
const fs=require('node:fs');
const path=require('node:path');
const config=getDefaultConfig(__dirname);
config.watchFolders=[...(config.watchFolders||[]),fs.realpathSync(path.join(__dirname,'node_modules'))];
config.resolver.nodeModulesPaths=[path.join(__dirname,'node_modules')];
module.exports=config;
