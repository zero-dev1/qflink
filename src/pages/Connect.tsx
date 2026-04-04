import { useNavigate } from "react-router-dom";
import { useWalletStore } from "@/stores/wallet";
import { useToastStore } from "@/stores/toast";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const wallets = [
  { id: "talisman" as const, name: "Talisman", desc: "Browser extension" },
  { id: "subwallet" as const, name: "SubWallet", desc: "Mobile & extension" },
];

export default function Connect() {
  const { isConnected, isConnecting, qnsName, evmAddress, walletError, connect, clearWalletError } = useWalletStore();
  const addToast = useToastStore((s) => s.addToast);
  const navigate = useNavigate();

  const displayName = qnsName
    ? qnsName
    : evmAddress
    ? `${evmAddress.slice(0, 6)}...${evmAddress.slice(-4)}` 
    : "";

  const handleConnect = async (walletType: "talisman" | "subwallet") => {
    clearWalletError();
    await connect(walletType);

    // Check if connected after connect completes
    const state = useWalletStore.getState();
    if (state.isConnected) {
      addToast("success", "Connected successfully");
    } else if (state.walletError) {
      addToast("error", state.walletError);
    }
  };

  return (
    <div className="min-h-screen bg-base flex flex-col items-center justify-center px-6">
      {isConnected ? (
        <div className="text-center animate-fade-in">
          <h1 className="font-display text-h1 text-text-primary">
            Welcome, {qnsName ? (
              <>{qnsName.replace(".qf", "")}<span className="text-cyan-primary">.qf</span></>
            ) : (
              displayName
            )}
          </h1>
          <Button className="mt-6" onClick={() => navigate("/home")}>
            Enter QFLink
          </Button>
        </div>
      ) : (
        <div className="w-full max-w-connect">
          <h1 className="font-display text-h1 text-text-primary text-center">
            Connect to QFLink
          </h1>
          <p className="mt-2 text-body-sm text-text-secondary text-center">
            Choose your wallet to continue
          </p>

          <div className="mt-8 flex flex-col gap-3">
            {wallets.map((w) => (
              <button
                key={w.id}
                onClick={() => handleConnect(w.id)}
                disabled={isConnecting}
                className={cn(
                  "flex items-center gap-4 p-5 rounded-lg bg-surface-2 border border-border-subtle",
                  "transition-all duration-200",
                  "hover:border-cyan-border hover:-translate-y-0.5",
                  "active:translate-y-0",
                  "disabled:opacity-50 disabled:pointer-events-none"
                )}
              >
                <div className="h-9 w-9 rounded-sm bg-surface-3 flex items-center justify-center text-text-secondary text-h3">
                  {w.name[0]}
                </div>
                <div className="text-left flex-1">
                  <p className="text-h3 text-text-primary">{w.name}</p>
                  <p className="text-body-sm text-text-secondary">{w.desc}</p>
                </div>
                {isConnecting && (
                  <div className="h-5 w-5 border-2 border-border-medium border-t-cyan-primary rounded-full animate-spin" />
                )}
              </button>
            ))}
          </div>

          {walletError && (
            <p className="mt-4 text-body-sm text-error text-center">{walletError}</p>
          )}
        </div>
      )}
    </div>
  );
}
