import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { requestJson } from '@/api/http';
import { LoginResponse } from '@/types/auth';

export async function loginWithGoogle():Promise<LoginResponse>{
  const verifier=Array.from(await Crypto.getRandomBytesAsync(32),byte=>byte.toString(16).padStart(2,'0')).join('');
  const challenge=await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256,verifier);
  const redirectUri=Platform.OS==='web'?`${window.location.origin}/google-login`:'climatizacion-rg://google-login';
  const base=process.env.EXPO_PUBLIC_API_URL;
  const started=await requestJson(`${base}/auth/google/start`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({redirectUri,challenge})});
  const result=await WebBrowser.openAuthSessionAsync(started.authorizationUrl,redirectUri);
  if(result.type!=='success')throw new Error('Acceso con Google cancelado. Puedes volver a intentarlo.');
  const params=new URLSearchParams(result.url.split('#')[1]??'');
  const ticket=params.get('ticket');
  if(!ticket)throw new Error('Google no completó la verificación. Inténtalo nuevamente.');
  return requestJson(`${base}/auth/google/exchange`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ticket,verifier})});
}
