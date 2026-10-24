require('tsx/cjs');
const {test}=require('node:test'),assert=require('node:assert/strict'),Module=require('node:module');
test('native token acquisition cannot recursively register the phone and foreground bursts are bounded',async()=>{
 const original=Module._load,effects=[],tokenListeners=new Set();let foreground,tokenReads=0,requests=0;
 const remove=()=>({remove(){}});
 const mocks={
  react:{useCallback:fn=>fn,useRef:value=>({current:value}),useState:value=>[value,()=>{}],useEffect:fn=>effects.push(fn)},
  'react-native':{Platform:{OS:'android'},AppState:{addEventListener:(_event,fn)=>{foreground=fn;return remove();}}},
  'expo-constants':{__esModule:true,default:{expoConfig:{extra:{nativePushEnabled:true}}}},
  'expo-crypto':{randomUUID:()=> 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'},
  'expo-notifications':{
   setNotificationHandler(){},AndroidImportance:{HIGH:4},AndroidNotificationVisibility:{PRIVATE:0},
   setNotificationChannelAsync:async()=>{},getPermissionsAsync:async()=>({granted:true}),
   getDevicePushTokenAsync:async()=>{tokenReads++;if(tokenReads>5)throw new Error('recursive registration');for(const fn of tokenListeners)fn({data:'test-device-token',type:'android'});return {data:'test-device-token',type:'android'};},
   addPushTokenListener:fn=>{tokenListeners.add(fn);return {remove:()=>tokenListeners.delete(fn)};},
   addNotificationResponseReceivedListener:remove,addNotificationReceivedListener:remove,
   getLastNotificationResponseAsync:async()=>null,dismissAllNotificationsAsync:async()=>{},
  },
  '@/api/http':{requestJson:async()=>{requests++;return {pushAvailable:false};}},
  '@/utils/refreshEvents':{notifyDataRefresh(){}},
 };
 Module._load=function(name,...args){return Object.hasOwn(mocks,name)?mocks[name]:original.call(this,name,...args);};
 let cleanup;
 try{
  const {usePushRegistration}=require('../../mobile/src/hooks/usePushRegistration.native.ts');
  usePushRegistration('session',()=>{});cleanup=effects[0]();
  const settle=()=>new Promise(resolve=>setImmediate(resolve));
  for(let i=0;i<10;i++)await settle();
  assert.equal(tokenReads,1);assert.equal(requests,1);
  for(let i=0;i<20;i++)foreground('active');
  for(let i=0;i<10;i++)await settle();
  assert.equal(tokenReads,1);assert.equal(requests,1);
 }finally{cleanup?.();Module._load=original;}
});
