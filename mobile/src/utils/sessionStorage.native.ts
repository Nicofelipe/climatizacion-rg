import * as SecureStore from 'expo-secure-store';
import {createSessionPersistence} from './sessionPersistence';
const key='clepit.session.v1';
export type {SavedSession} from './sessionPersistence';
const storage=createSessionPersistence({get:()=>SecureStore.getItemAsync(key),set:value=>SecureStore.setItemAsync(key,value,{keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY}),remove:()=>SecureStore.deleteItemAsync(key)});
export const loadSession=storage.load;
export const storeSession=storage.store;
