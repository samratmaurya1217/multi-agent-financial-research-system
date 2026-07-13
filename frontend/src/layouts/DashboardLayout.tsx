import { useAuth } from "@/store/authStore";
import { Bell } from "lucide-react";
import { TwoLevelSidebar } from "@/components/ui/sidebar-component";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  return (
    <div className="flex h-screen bg-[#030303] overflow-hidden">
      {/* Sidebar */}
      <TwoLevelSidebar />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-16 flex-shrink-0 border-b border-white/[0.06] bg-[#030303]/80 backdrop-blur-xl flex items-center justify-end px-6 gap-3 relative z-10">
          <button className="h-9 w-9 rounded-xl border border-white/[0.08] flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.04] transition-colors relative">
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-rose-500" />
          </button>
          {user && (
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500/60 to-violet-500/60 border border-white/[0.12] flex items-center justify-center">
              <span className="text-[10px] font-bold text-white">{user.avatarInitials}</span>
            </div>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto relative z-0">
          {children}
        </main>
      </div>
    </div>
  );
}
