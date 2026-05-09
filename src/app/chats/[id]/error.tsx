"use client";

import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("CHAT SCREEN ERROR:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center h-[100dvh] w-full bg-black text-white p-6 text-center z-[999] relative">
      <h2 className="text-2xl font-bold text-red-500 mb-4">Chat Screen Crashed!</h2>
      <div className="bg-zinc-900 p-4 rounded-xl text-left w-full overflow-auto max-h-[50vh] border border-red-500/30">
        <p className="text-red-400 font-mono text-sm mb-2">{error.message || "Unknown error"}</p>
        <p className="text-zinc-500 font-mono text-xs whitespace-pre-wrap">{error.stack}</p>
      </div>
      <button
        className="mt-8 px-6 py-3 bg-primary rounded-xl font-medium"
        onClick={() => reset()}
      >
        Try Again
      </button>
      <button
        className="mt-4 px-6 py-3 bg-zinc-800 rounded-xl font-medium"
        onClick={() => window.location.href = '/chats'}
      >
        Go Back to Chats
      </button>
    </div>
  );
}
