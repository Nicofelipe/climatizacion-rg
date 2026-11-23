import { createSessionPersistence } from './sessionPersistence';

export type { SavedSession } from './sessionPersistence';
// La web conserva la sesión solo mientras la pestaña está abierta (sobrevive a recargar, no a cerrarla).
// Nunca se usa localStorage; la política de contenido del servidor impide ejecutar scripts ajenos.
const key = 'clepit.session.v1';
const storage = () => typeof window === 'undefined' ? null : window.sessionStorage;
const persistence = createSessionPersistence({
  get: async () => storage()?.getItem(key) ?? null,
  set: async value => { storage()?.setItem(key, value); },
  remove: async () => { storage()?.removeItem(key); },
});
export const loadSession = persistence.load;
export const storeSession = persistence.store;
