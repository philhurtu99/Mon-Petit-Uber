import { createContext, useContext, useState } from "react";

type HelpContextType = {
  help: string | null;
  setHelp: (value: string | null) => void;
  clearHelp: () => void;
};

const HelpContext = createContext<HelpContextType | null>(null);

// Fournit un contexte global pour gérer l'aide affichée dans l'application
export function HelpProvider({ children }: { children: React.ReactNode }) {
  const [help, setHelp] = useState<string | null>(null);

  // Fonction pour réinitialiser l'aide à null
  const clearHelp = () => setHelp(null);
  
  return (
    <HelpContext.Provider value={{ help, setHelp, clearHelp }}>
      {children}
    </HelpContext.Provider>
  );
}

// Hook personnalisé pour accéder au contexte d'aide
export function useHelp() {
  const context = useContext(HelpContext);

  if (!context) {
    throw new Error("useHelp doit être utilisé dans HelpProvider");
  }

  return context;
}