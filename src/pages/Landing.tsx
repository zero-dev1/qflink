import { Link } from "react-router-dom";
import { useWalletStore } from "@/stores/wallet";

export default function Landing() {
  const { isConnected, qnsName } = useWalletStore();

  return (
    <div className="min-h-screen bg-base flex flex-col">
      {/* Sticky nav */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-6 md:px-12 h-16 bg-base/80 backdrop-blur-sm border-b border-border-subtle">
        <span className="text-h2 font-display text-text-primary">
          QF<span className="text-cyan-primary">Link</span>
        </span>
        <Link
          to={isConnected ? "/home" : "/connect"}
          className="h-10 px-6 rounded-md bg-cyan-primary text-text-on-cyan text-label font-medium inline-flex items-center hover:bg-cyan-hover transition-colors"
        >
          {isConnected ? "Enter App" : "Launch App"}
        </Link>
      </header>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <h1 className="font-display text-display md:text-[48px] md:leading-[1.1] text-text-primary max-w-2xl">
          Every message, on-chain, forever
        </h1>
        <p className="mt-4 text-body text-text-secondary max-w-lg">
          Token-gated group chats, encrypted direct messages, no database, no server, just the chain
        </p>
        {isConnected && qnsName && (
          <p className="mt-2 text-body-sm text-text-tertiary">
            Welcome back, {qnsName.replace(".qf", "")}<span className="text-cyan-primary">.qf</span>
          </p>
        )}
        <Link
          to={isConnected ? "/home" : "/connect"}
          className="mt-8 h-10 px-8 rounded-md bg-cyan-primary text-text-on-cyan text-label font-medium inline-flex items-center hover:bg-cyan-hover transition-colors"
        >
          {isConnected ? "Enter App" : "Get Started"}
        </Link>
      </div>
    </div>
  );
}
