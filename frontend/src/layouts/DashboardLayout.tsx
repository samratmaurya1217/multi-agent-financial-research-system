import { useNavigate, useLocation } from "react-router-dom";
import { Bell, ChevronLeft, Search, ChevronDown } from "lucide-react";
import { TwoLevelSidebar } from "@/components/ui/sidebar-component";
import { useAuth } from "@/store/authStore";
import { useState, useEffect } from "react";

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
  const [searchVal, setSearchVal] = useState("");

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

          {/* Right side - Search, Notifications, Profile */}
          <div className="flex items-center gap-4">
            {/* Pill Search Bar */}
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                placeholder="Search anything..."
                className="h-10 w-64 pl-10 pr-4 rounded-full text-sm placeholder:text-slate-400 text-slate-700 outline-none transition-all bg-white shadow-2xs border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15"
              />
            </div>

            {/* Notifications */}
            <button
              className="h-10 w-10 rounded-full flex items-center justify-center transition-all relative bg-white shadow-2xs border border-slate-200 text-slate-500 hover:text-slate-800 hover:shadow-sm ml-2"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-blue-500 border-2 border-white" />
            </button>

            {/* Avatar Pill */}
            {user && (
              <div 
                className="flex items-center gap-2 px-1.5 py-1.5 rounded-full bg-white shadow-2xs border border-slate-200 cursor-pointer hover:shadow-sm transition-all"
                onClick={() => navigate("/profile")}
              >
                <div className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold text-white bg-blue-600">
                  {user.avatarInitials}
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 mr-1.5" />
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
