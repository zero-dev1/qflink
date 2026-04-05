import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { useUnreadStore } from "@/stores/unread";
import { UnreadDot } from "@/components/ui/UnreadDot";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/home", label: "Home", icon: "⌂" },
  { to: "/explore", label: "Explore", icon: "◎" },
  { to: "/messages", label: "Messages", icon: "✉" },
  { to: "/profile", label: "Profile", icon: "⊚" },
];

export function MobileTabBar() {
  const totalUnreadDMs = useUnreadStore((s) => s.getTotalUnreadDMs());

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface-1 border-t border-border-subtle z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-1 px-4 py-2 relative",
                isActive ? "text-cyan-primary" : "text-text-tertiary"
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className="relative">
                  <span className="text-[20px]">{tab.icon}</span>
                  {tab.to === '/messages' && totalUnreadDMs > 0 && (
                    <UnreadDot
                      count={totalUnreadDMs}
                      showCount
                      size="sm"
                      className="absolute -top-1 -right-2"
                    />
                  )}
                </div>
                <span className="text-[10px] font-medium">{tab.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="tab-active"
                    className="absolute -top-0.5 w-5 h-0.5 bg-cyan-primary rounded-full"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
