const fs = require('node:fs');
const path = require('node:path');
module.exports = ({config}) => {
  const file = process.env.GOOGLE_SERVICES_JSON || path.join(__dirname,'.secrets','google-services.json');
  let enabled = false;
  try{enabled=fs.existsSync(file)&&JSON.parse(fs.readFileSync(file,'utf8')).client?.some(client=>client.client_info?.android_client_info?.package_name==='cl.rg.clepit.pruebas')===true;}catch{}
  return {...config,name:'Clepit Pruebas',slug:'clepit-camera-tests',scheme:'clepit-pruebas',version:'0.1.5',android:{...config.android,package:'cl.rg.clepit.pruebas',versionCode:6,...(enabled?{googleServicesFile:file}:{})},
    extra:{...config.extra,nativePushEnabled:enabled,receiptOcrExperiment:true,googleLoginRedirectUri:'clepit-pruebas://google-login'},
    plugins:[...(config.plugins||[]),'expo-secure-store',['expo-notifications',{color:'#0F8277',defaultChannel:'rendiciones'}]]};
};
