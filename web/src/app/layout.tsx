import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "Autonome — A2A Task Mesh on Monad",
  description: "Autonomous agents hire, execute and pay each other on Monad Testnet.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-void text-ink antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
