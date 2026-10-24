const fs = require('node:fs');
const path = require('node:path');
module.exports = ({config}) => {
  const file = process.env.GOOGLE_SERVICES_JSON || path.join(__dirname,'.secrets','google-services.json');
  const enabled = fs.existsSync(file);
  return {...config,android:{...config.android,...(enabled?{googleServicesFile:file}:{})},
    extra:{...config.extra,nativePushEnabled:enabled},
    plugins:[...(config.plugins||[]),['expo-notifications',{color:'#0F8277',defaultChannel:'rendiciones'}]]};
};
