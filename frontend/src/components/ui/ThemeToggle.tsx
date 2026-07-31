import { useTheme } from "@/store/themeStore";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <label className={`switch ${className || ""}`}>
      <input
        type="checkbox"
        checked={theme === "dark"}
        onChange={toggleTheme}
        aria-label="Toggle dark and light theme"
      />
      <span className="slider"></span>
    </label>
  );
}
