const fs = require('node:fs');
const path = require('node:path');
module.exports = ({config}) => {
  const file = process.env.GOOGLE_SERVICES_JSON || path.join(__dirname,'.secrets','google-services.json');
  const enabled = false;
  return {...config,name:'Clepit Pruebas',slug:'clepit-camera-tests',scheme:'clepit-pruebas',version:'0.1.2',android:{...config.android,package:'cl.rg.clepit.pruebas',versionCode:3},
    extra:{...config.extra,nativePushEnabled:enabled,receiptOcrExperiment:true},
    plugins:[...(config.plugins||[]),['expo-notifications',{color:'#0F8277',defaultChannel:'rendiciones'}]]};
};
