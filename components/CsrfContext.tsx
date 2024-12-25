import React, { createContext, useContext, useState } from "react";

// Define the shape of the context
interface CsrfContextType {
    csrfToken: string | null;
    setCsrfToken: (token: string) => void;
}

// Create the context
const CsrfContext = createContext<CsrfContextType | undefined>(undefined);

// Custom hook to use the CSRF context
export const useCsrf = (): CsrfContextType => {
    const context = useContext(CsrfContext);
    if (!context) {
        throw new Error("useCsrf must be used within a CsrfProvider");
    }
    return context;
};

// Provider component
export const CsrfProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [csrfToken, setCsrfToken] = useState<string | null>(null);

    return (
        <CsrfContext.Provider value={{ csrfToken, setCsrfToken }}>
            {children}
        </CsrfContext.Provider>
    );
};
