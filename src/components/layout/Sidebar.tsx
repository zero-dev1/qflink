import { NavLink, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useWalletStore } from "@/stores/wallet";
import { useUnreadStore } from "@/stores/unread";
import { useSpotlightStore } from '@/stores/spotlight';
import { Avatar } from "@/components/ui/Avatar";
import { UnreadDot } from "@/components/ui/UnreadDot";
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
  const totalUnreadDMs = useUnreadStore((s) => s.getTotalUnreadDMs());
  const totalUnreadPods = useUnreadStore((s) => s.getTotalUnreadPods());

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

      {/* Spotlight trigger */}
      <button
        onClick={() => useSpotlightStore.getState().open()}
        className="mx-3 mb-4 flex items-center gap-2 h-8 px-3 rounded-sm bg-white/[0.03] border border-white/[0.06] text-text-tertiary hover:text-text-secondary hover:bg-white/[0.05] transition-colors w-[calc(100%-24px)]"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
          <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2" />
          <path d="M9.5 9.5L13 13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        <span className="text-caption flex-1 text-left">Search...</span>
        <kbd className="text-[10px] font-mono bg-white/[0.04] px-1 rounded">⌘K</kbd>
      </button>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 flex flex-col gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "relative flex items-center gap-3 h-9 px-3 rounded-sm w-full text-label transition-colors duration-150",
                isActive
                  ? "bg-surface-3 text-text-primary"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-2"
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-cyan-primary rounded-full"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                <span className="text-[18px] w-4.5 text-center">{item.icon}</span>
                <span>{item.label}</span>
                {item.to === '/messages' && totalUnreadDMs > 0 && (
                  <UnreadDot count={totalUnreadDMs} showCount size="sm" className="ml-auto" />
                )}
                {item.to === '/home' && totalUnreadPods > 0 && (
                  <UnreadDot className="ml-auto" />
                )}
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
