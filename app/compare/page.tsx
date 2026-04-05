import { Suspense } from "react";
import CompareAnalysis from "./CompareAnalysis";

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-text-muted text-sm">Loading...</div>}>
      <CompareAnalysis />
    </Suspense>
  );
}
