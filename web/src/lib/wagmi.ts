import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { monadTestnet } from "./shared/chain";

export const wagmiConfig = getDefaultConfig({
  appName: "Autonome",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "autonome-demo", // injected wallets work regardless
  chains: [monadTestnet],
  ssr: true,
});
