import {AuthUser} from '@/types/auth';
export interface SavedSession {user:AuthUser;token:string}
// Web keeps the existing memory-only session; never persist bearer tokens in localStorage.
export async function loadSession():Promise<SavedSession|null>{return null;}
export async function storeSession(_session:SavedSession|null){}
