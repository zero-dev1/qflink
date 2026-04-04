import { NavLink, useNavigate } from "react-router-dom";
import { useWalletStore } from "@/stores/wallet";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/home", label: "Home", icon: "⌂" },
  { to: "/explore", label: "Explore", icon: "◎" },
  { to: "/messages", label: "Messages", icon: "✉" },
  { to: "/profile", label: "Profile", icon: "⊚" },
];

export function Sidebar() {
  const { isConnected, qnsName, evmAddress, disconnect } = useWalletStore();
  const navigate = useNavigate();

  const displayName = qnsName || (evmAddress ? `${evmAddress.slice(0, 6)}...${evmAddress.slice(-4)}` : null);

  return (
    <aside className="hidden md:flex flex-col w-60 h-screen bg-surface-1 border-r border-border-subtle shrink-0">
      {/* Logo */}
      <div className="px-5 h-16 flex items-center">
        <NavLink to={isConnected ? "/home" : "/"} className="flex items-center gap-2">
          <span className="text-h2 font-display text-text-primary">
            QF<span className="text-cyan-primary">Link</span>
          </span>
        </NavLink>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 flex flex-col gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 h-9 px-3 rounded-sm text-label transition-colors duration-150 relative",
                isActive
                  ? "bg-surface-3 text-text-primary"
                  : "text-text-secondary hover:bg-surface-2 hover:text-text-primary"
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-cyan-primary rounded-full" />
                )}
                <span className="text-[18px] w-4.5 text-center">{item.icon}</span>
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Wallet status */}
      <div className="px-3 py-4 border-t border-border-subtle">
        {isConnected && evmAddress ? (
          <div className="flex items-center gap-3 px-3">
            <Avatar address={evmAddress} size={32} />
            <div className="flex-1 min-w-0">
              <p className="text-label text-text-primary truncate">
                {qnsName ? (
                  <>
                    {qnsName.replace(".qf", "")}
                    <span className="text-cyan-primary">.qf</span>
                  </>
                ) : (
                  displayName
                )}
              </p>
              <button
                onClick={() => disconnect()}
                className="text-caption text-text-tertiary hover:text-error transition-colors"
              >
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => navigate("/connect")}
            className="w-full h-10 rounded-md bg-cyan-primary text-text-on-cyan text-label font-medium hover:bg-cyan-hover transition-colors"
          >
            Connect Wallet
          </button>
        )}
      </div>
    </aside>
  );
}
