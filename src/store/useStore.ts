import { useSyncExternalStore } from 'react';
import { store, type StoreState } from './store';

export function useStoreState(): StoreState {
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}
