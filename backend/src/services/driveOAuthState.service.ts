import {randomBytes} from 'node:crypto';
interface DriveAttempt{companyId:number;userId:number;passwordVersion:number;expires:number}
const attempts=new Map<string,DriveAttempt>();
export function createDriveAttempt(companyId:number,userId:number,passwordVersion:number,now=Date.now()){
  for(const [id,value]of attempts)if(value.expires<=now)attempts.delete(id);
  if(attempts.size>=1000)throw new Error('DRIVE_LOGIN_BUSY');
  const state=randomBytes(32).toString('hex');
  attempts.set(state,{companyId,userId,passwordVersion,expires:now+600000});return state;
}
export function consumeDriveAttempt(state:string,now=Date.now()){
  const attempt=attempts.get(state);attempts.delete(state);
  if(!attempt||attempt.expires<=now)throw new Error('DRIVE_STATE_INVALID');return attempt;
}
