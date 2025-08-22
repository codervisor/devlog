'use client';

import React, { createContext, useContext } from 'react';
import type { DevlogEntry } from '@codervisor/devlog-core';

interface DevlogContextValue {
  devlog: DevlogEntry;
  devlogId: number;
}

const DevlogContext = createContext<DevlogContextValue | null>(null);

export function DevlogProvider({
  children,
  devlog,
}: {
  children: React.ReactNode;
  devlog: DevlogEntry;
}) {
  const value: DevlogContextValue = {
    devlog,
    devlogId: devlog.id!,
  };

  return <DevlogContext.Provider value={value}>{children}</DevlogContext.Provider>;
}

export function useDevlog(): DevlogContextValue {
  const context = useContext(DevlogContext);
  console.debug('useDevlog', 'context', context);
  if (!context) {
    throw new Error('useDevlog must be used within a DevlogProvider');
  }
  return context;
}

export function useDevlogId(): number {
  const { devlogId } = useDevlog();
  return devlogId;
}
