require('tsx/cjs');
const {test}=require('node:test'),assert=require('node:assert/strict'),Module=require('node:module');
test('native File passes actual Expo FormData and encoder without constructing an unsupported Blob',async()=>{
 const original=Module._load,OriginalBlob=global.Blob,bytes=Uint8Array.from([137,80,78,71,13,10,26,10,0,255]);let oversized=false,reads=0,constructs=0;
 class NativeBlob{constructor(){constructs++;throw new Error('Creating Blobs from ArrayBuffer and ArrayBufferView are not supported');}}
 class NativeFile{exists=true;name='photo.png';type='image/png';get size(){return oversized?11*1024*1024:bytes.length;}async bytes(){reads++;return bytes;}}
 Module._load=function(name,...args){if(name==='expo-file-system')return {File:NativeFile};return original.call(this,name,...args);};
 global.Blob=NativeBlob;
 try{
  const {uploadImageBlob}=require('../../mobile/src/utils/uploadImage.native.ts');
  const {installFormDataPatch}=require('../../mobile/node_modules/expo/src/winter/FormData.ts');
  const {convertFormDataAsync}=require('../../mobile/node_modules/expo/src/winter/fetch/convertFormData.ts');
  const NativeFormData=installFormDataPatch(class{constructor(){this._parts=[];}});
  const blob=await uploadImageBlob('file:///private/photo.png','image/png');
  assert.ok(blob instanceof NativeFile);
  const form=new NativeFormData();form.append('receiptNumber','TEST');form.append('image',blob,'photo.png');
  const encoded=await convertFormDataAsync(form,'test-boundary');
  const body=Buffer.from(encoded.body);assert.ok(body.includes(Buffer.from('filename="photo.png"')));assert.ok(body.includes(Buffer.from('image/png')));assert.ok(body.includes(Buffer.from(bytes)));assert.ok(!body.includes(Buffer.from('file:///private')));
  assert.equal(constructs,0);
  oversized=true;await assert.rejects(uploadImageBlob('file:///too-big.png','image/png'),/10 MB/);assert.equal(reads,1);
 }finally{global.Blob=OriginalBlob;Module._load=original;}
});
