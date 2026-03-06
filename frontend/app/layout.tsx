"use client";

import { createConfig, WagmiProvider, http } from "wagmi";
import { sepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Link from "next/link";
import "./globals.css";
import WalletButton from "@/components/WalletButton";

const config = createConfig({
  chains: [sepolia],
  connectors: [injected()],
  transports: {
    [sepolia.id]: http(),
  },
});

const queryClient = new QueryClient();

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-white min-h-screen">
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            <nav className="border-b border-gray-800 px-6 py-4 flex justify-between items-center">
              <Link href="/" className="text-xl font-bold text-blue-400">
                ⚡ AgentMarket
              </Link>
              <div className="flex items-center gap-4">
                <Link href="/publish" className="text-sm text-gray-400 hover:text-white">
                  Publish
                </Link>
                <Link href="/agent" className="text-sm text-gray-400 hover:text-white">
                  Agent
                </Link>
                <WalletButton />
              </div>
            </nav>
            <main className="p-6">{children}</main>
          </QueryClientProvider>
        </WagmiProvider>
      </body>
    </html>
  );
}
