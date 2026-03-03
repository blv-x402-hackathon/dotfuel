import { QueryClient } from "@tanstack/react-query";
import { injected, metaMask, walletConnect } from "@wagmi/connectors";
import { createConfig, http } from "wagmi";

import { polkadotHubTestnet } from "./chains";

const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "dotfuel-demo";

export const wagmiConfig = createConfig({
  chains: [polkadotHubTestnet],
  connectors: [metaMask(), injected(), walletConnect({ projectId: walletConnectProjectId })],
  transports: {
    [polkadotHubTestnet.id]: http("https://eth-rpc-testnet.polkadot.io/")
  }
});

export const queryClient = new QueryClient();
