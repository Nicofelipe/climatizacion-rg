require('tsx/cjs');
const {test}=require('node:test'),assert=require('node:assert/strict'),{EventEmitter}=require('node:events');
test('request diagnostics correlate SQL work without recording credentials or user data',()=>{
 process.env.PERF_DIAGNOSTICS='1';
 const {measureRequests,requestTiming}=require('../src/middlewares/performance.middleware.ts');
 const original=console.log,output=[];console.log=(...args)=>output.push(args.join(' '));
 try{
  const res=new EventEmitter();res.statusCode=200;let id;
  measureRequests({path:'/api/users/private@example.invalid',method:'GET',headers:{authorization:'Bearer SECRET'},body:{password:'PRIVATE'}},res,()=>{id=requestTiming.getStore().id;});
  res.emit('finish');res.emit('close');
  assert.ok(id>0);assert.equal(output.length,2);
  const serialized=output.join('\n');assert.ok(serialized.includes('"group":"users"'));
  for(const value of ['SECRET','PRIVATE','private@example.invalid','authorization','password'])assert.ok(!serialized.includes(value));
 }finally{console.log=original;delete process.env.PERF_DIAGNOSTICS;}
});
