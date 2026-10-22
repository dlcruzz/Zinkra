'use client';
import { createContext, useContext, useMemo } from 'react';

const MediaContext = createContext<Set<string>>(new Set());

/** Recebe do servidor a lista de arquivos existentes em /public/media. */
export function MediaProvider({ files, children }: { files: string[]; children: React.ReactNode }) {
  const set = useMemo(() => new Set(files), [files]);
  return <MediaContext.Provider value={set}>{children}</MediaContext.Provider>;
}

/** true se o arquivo (caminho de data/media.ts) existe de verdade. */
export function useHasMedia(src?: string | null) {
  const set = useContext(MediaContext);
  if (!src) return false;
  return set.has(src.split('/').pop() ?? '');
}
