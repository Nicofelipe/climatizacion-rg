const fs = require('node:fs');
const path = require('node:path');
module.exports = ({config}) => {
  const file = process.env.GOOGLE_SERVICES_JSON || path.join(__dirname,'.secrets','google-services.json');
  let enabled = false;
  try{enabled=fs.existsSync(file)&&JSON.parse(fs.readFileSync(file,'utf8')).client?.some(client=>client.client_info?.android_client_info?.package_name==='cl.rg.climatizacion')===true;}catch{}
  return {...config,android:{...config.android,...(enabled?{googleServicesFile:file}:{})},
    extra:{...config.extra,nativePushEnabled:enabled,googleLoginRedirectUri:'climatizacion-rg://google-login'},
    plugins:[...(config.plugins||[]),'expo-secure-store',['expo-notifications',{color:'#0F8277',defaultChannel:'rendiciones'}]]};
};
