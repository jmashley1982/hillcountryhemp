import { createContext, useContext, useState } from "react";

interface BrandFilterContextValue {
  brand: string;
  setBrand: (brand: string) => void;
}

const BrandFilterContext = createContext<BrandFilterContextValue>({
  brand: "",
  setBrand: () => {},
});

export function BrandFilterProvider({ children }: { children: React.ReactNode }) {
  const [brand, setBrand] = useState("");
  return (
    <BrandFilterContext.Provider value={{ brand, setBrand }}>
      {children}
    </BrandFilterContext.Provider>
  );
}

export function useBrandFilter() {
  return useContext(BrandFilterContext);
}
