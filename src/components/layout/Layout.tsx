import { Outlet } from "react-router-dom";
import { TopNav } from "./TopNav.tsx";

export function Layout() {
  return (
    <div className="flex h-screen w-screen flex-col bg-background text-text-primary">
      <TopNav />
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
