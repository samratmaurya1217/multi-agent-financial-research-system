import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { TwoLevelSidebar } from "@/components/ui/sidebar-component";
import { useAuth } from "@/store/authStore";
import { useEffect } from "react";

// Route to friendly name mapping
const routeTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/workspaces": "Workspaces",
  "/upload": "Upload Document",
  "/chat": "Research Chat",
  "/compare": "Compare Companies",
  "/reports": "Reports",
  "/history": "History",
  "/profile": "Profile",
  "/settings": "Settings",
};

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && !user && !localStorage.getItem("velsora_token")) {
      navigate("/login", { replace: true });
    }
  }, [user, isLoading, navigate]);

  const currentTitle = routeTitles[location.pathname] || "Dashboard";
  const isRoot = location.pathname === "/dashboard";

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#e0f2fe] to-[#f8fafc] font-sans selection:bg-blue-500 selection:text-white">
      {/* Sidebar - Dark Glassmorphic */}
      <div className="sticky top-0 h-screen flex-shrink-0 z-20">
        <TwoLevelSidebar />
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header - Floating White Glass */}
        <header className="h-20 flex-shrink-0 flex items-center justify-between px-8 gap-4 relative z-10 transition-all">
          {/* Left side - Back button + breadcrumb */}
          <div className="flex items-center gap-4">
            {!isRoot && (
              <button
                onClick={() => navigate(-1)}
                aria-label="Go back"
                className="h-9 w-9 rounded-full flex items-center justify-center transition-all bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:shadow-sm"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            <div>
              <h2 className="text-xl font-bold text-[#0f172a] leading-tight tracking-tight">{currentTitle}</h2>
            </div>
          </div>

          {/* Right side - User Profile Pill */}
          <div className="flex items-center gap-3">
            {user && (
              <div 
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white shadow-xs border border-slate-200 cursor-pointer hover:border-slate-300 hover:shadow-sm transition-all"
                onClick={() => navigate("/profile")}
              >
                <div className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold text-white bg-blue-600 shadow-xs">
                  {user.avatarInitials}
                </div>
                <span className="text-xs font-semibold text-slate-700 max-w-[120px] truncate hidden sm:inline">
                  {user.name}
                </span>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 relative z-0 p-8 pt-2">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
