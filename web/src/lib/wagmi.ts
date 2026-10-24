import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import { injectedWallet } from "@rainbow-me/rainbowkit/wallets";
import { createConfig, http } from "wagmi";
import { monadTestnet } from "./shared/chain";

const connectors = connectorsForWallets(
  [{ groupName: "Wallets", wallets: [injectedWallet] }],
  {
    appName: "Autonome",
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "autonome-demo",
  },
);

export const wagmiConfig = createConfig({
  chains: [monadTestnet],
  connectors,
  transports: { [monadTestnet.id]: http() },
  ssr: true,
});
