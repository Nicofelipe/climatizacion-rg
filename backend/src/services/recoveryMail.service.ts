import nodemailer from 'nodemailer';
export function recoveryMailConfigured(){
  if(!process.env.SMTP_HOST||!process.env.SMTP_FROM||!process.env.SMTP_USER||!process.env.SMTP_PASSWORD||!process.env.PASSWORD_RESET_URL)return false;
  try{const url=new URL(process.env.PASSWORD_RESET_URL),port=Number(process.env.SMTP_PORT??587);return Number.isInteger(port)&&port>0&&port<=65535&&(url.protocol==='https:'||(url.protocol==='http:'&&url.hostname==='localhost'));}catch{return false;}
}
export async function sendRecoveryMail(to:string,text:string){
  if(!recoveryMailConfigured())throw new Error('RECOVERY_MAIL_NOT_CONFIGURED');
  const transport=nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT??587),secure:process.env.SMTP_SECURE==='true',requireTLS:process.env.SMTP_SECURE!=='true',auth:{user:process.env.SMTP_USER!,pass:process.env.SMTP_PASSWORD!},connectionTimeout:10000,socketTimeout:15000});
  await transport.sendMail({from:process.env.SMTP_FROM,to,subject:'Seguridad de tu cuenta — contraseña',text});
}
