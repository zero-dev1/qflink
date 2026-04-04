import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { MobileTabBar } from "./MobileTabBar";

export function AppLayout() {
  return (
    <div className="flex h-screen bg-base overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pb-14 md:pb-0">
        <Outlet />
      </main>
      <MobileTabBar />
    </div>
  );
}
