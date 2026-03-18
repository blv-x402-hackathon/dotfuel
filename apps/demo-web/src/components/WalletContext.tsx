"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

interface WalletContextValue {
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

const WalletContext = createContext<WalletContextValue>({
  isModalOpen: false,
  openModal: () => {},
  closeModal: () => {}
});

export function WalletContextProvider({ children }: { children: ReactNode }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = useCallback(() => setIsModalOpen(true), []);
  const closeModal = useCallback(() => setIsModalOpen(false), []);

  const value = useMemo(
    () => ({ isModalOpen, openModal, closeModal }),
    [isModalOpen, openModal, closeModal]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWalletModal() {
  return useContext(WalletContext);
}
