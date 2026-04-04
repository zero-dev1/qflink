import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/home", label: "Home", icon: "⌂" },
  { to: "/explore", label: "Explore", icon: "◎" },
  { to: "/messages", label: "Messages", icon: "✉" },
  { to: "/profile", label: "Profile", icon: "⊚" },
];

export function MobileTabBar() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-surface-1 border-t border-border-subtle flex items-center justify-around z-40">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center gap-0.5 text-caption transition-colors",
              isActive ? "text-cyan-primary" : "text-text-tertiary"
            )
          }
        >
          <span className="text-[20px]">{tab.icon}</span>
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
