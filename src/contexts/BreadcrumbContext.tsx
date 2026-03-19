import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface BreadcrumbLabels {
  [key: string]: string;
}

interface BreadcrumbContextType {
  labels: BreadcrumbLabels;
  setLabel: (segment: string, label: string) => void;
  clearLabel: (segment: string) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextType | undefined>(undefined);

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [labels, setLabels] = useState<BreadcrumbLabels>({});

  const setLabel = useCallback((segment: string, label: string) => {
    setLabels(prev => ({ ...prev, [segment]: label }));
  }, []);

  const clearLabel = useCallback((segment: string) => {
    setLabels(prev => {
      const newLabels = { ...prev };
      delete newLabels[segment];
      return newLabels;
    });
  }, []);

  return (
    <BreadcrumbContext.Provider value={{ labels, setLabel, clearLabel }}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBreadcrumb() {
  const context = useContext(BreadcrumbContext);
  if (!context) {
    throw new Error('useBreadcrumb must be used within a BreadcrumbProvider');
  }
  return context;
}
