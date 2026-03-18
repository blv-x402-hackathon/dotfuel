"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { WagmiProvider } from "wagmi";

import { WalletContextProvider } from "@/components/WalletContext";
import { WalletModal } from "@/components/WalletModal";
import { queryClient, wagmiConfig } from "@/lib/wagmi";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <WalletContextProvider>
          {children}
          <WalletModal />
        </WalletContextProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
