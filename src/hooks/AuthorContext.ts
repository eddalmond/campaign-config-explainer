import { createContext, useContext } from 'react';
import type { AuthorState } from './useAuthorState';

export const AuthorContext = createContext<AuthorState | null>(null);

export function useAuthor(): AuthorState {
  const ctx = useContext(AuthorContext);
  if (!ctx) {
    throw new Error('useAuthor must be used within an AuthorContext.Provider');
  }
  return ctx;
}
