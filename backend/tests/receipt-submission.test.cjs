require('tsx/cjs');
const {test}=require('node:test'),assert=require('node:assert/strict');
const server=require('../src/utils/receiptSubmission.ts').receiptSubmissionError;
const client=require('../../mobile/src/utils/receiptSubmission.ts').receiptSubmissionError;
test('receipt submission cutoff is March 15 inclusive in Chile; both application and API agree',()=>{
 for(const [now,date,allowed] of [
  ['2027-03-16T02:59:59Z','2026-01-01',true],
  ['2027-03-16T02:59:59Z','2026-12-31',true],
  ['2027-03-16T03:00:00Z','2026-12-31',false],
  ['2027-03-16T03:00:00Z','2027-01-01',true],
  ['2027-03-15T15:00:00Z','2025-12-31',false],
  ['2026-10-23T15:00:00Z','2025-12-31',false],
  ['2026-10-23T15:00:00Z','2026-10-24',false],
  ['2025-03-15T15:00:00Z','2024-02-29',true],
  ['2026-03-15T15:00:00Z','2026-02-29',false],
  ['2027-01-01T02:59:59Z','2025-12-31',false],
  ['2027-01-01T03:00:00Z','2026-12-31',true],
 ]){
  const value=server(date,new Date(now));assert.equal(value===null,allowed,`${now} / ${date}`);assert.equal(client(date,new Date(now)),value);
 }
});
