'use client'

import React, { createContext, useContext, useState } from 'react';
import { Pearl } from '@/types/Pearl'; // Import type definition

interface PearlContextProps {
  pearls: Pearl[];
  addPearl: (pearl: Pearl) => void;
  updatePearl: (id: string, updatedData: Partial<Pearl>) => void;
  removePearl: (id: string) => void;
}

const PearlContext = createContext<PearlContextProps | undefined>(undefined);

export const PearlProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pearls, setPearls] = useState<Pearl[]>([]);

  const addPearl = (pearl: Pearl) => setPearls((prev) => [...prev, pearl]);
  const updatePearl = (id: string, updatedData: Partial<Pearl>) => {
    setPearls((prev) =>
      prev.map((pearl) => (pearl.id === id ? { ...pearl, ...updatedData } : pearl))
    );
  };
  const removePearl = (id: string) => setPearls((prev) => prev.filter((pearl) => pearl.id !== id));

  return (
    <PearlContext.Provider value={{ pearls, addPearl, updatePearl, removePearl }}>
      {children}
    </PearlContext.Provider>
  );
};

export const usePearlContext = () => {
  const context = useContext(PearlContext);
  if (!context) {
    throw new Error('usePearlContext must be used within a PearlProvider');
  }
  return context;
};
