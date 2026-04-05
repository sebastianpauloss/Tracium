import { Suspense } from "react";
import WalletAnalysis from "./WalletAnalysis";
import { detectChain } from "@/lib/utils";
import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ address: string }>;
}

export default async function WalletPage({ params }: PageProps) {
  const { address } = await params;
  const chain = detectChain(decodeURIComponent(address));
  if (chain === "unknown") redirect("/");

  return (
    <Suspense fallback={<LoadingState />}>
      <WalletAnalysis address={decodeURIComponent(address)} />
    </Suspense>
  );
}

function LoadingState() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-full border-4 border-neon-green/20 border-t-neon-green animate-spin mx-auto" />
        <p className="text-text-muted text-sm">Fetching wallet data...</p>
      </div>
    </div>
  );
}
