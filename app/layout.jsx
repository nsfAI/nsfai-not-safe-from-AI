import "./globals.css";
import LaborTicker from "./components/LaborTicker";
import ThemeToggle from "./components/ThemeToggle";

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col bg-white text-black dark:bg-[#0b0b0b] dark:text-white">
        <LaborTicker />

        <div className="mx-auto w-full max-w-6xl px-4 pt-3">
          <div className="flex justify-end">
            <ThemeToggle />
          </div>
        </div>

        <div className="flex-1">{children}</div>

        <footer className="mt-16 border-t border-black/5 dark:border-white/10 py-6 text-center text-sm text-black/50 dark:text-white/50">
          Built by <span className="font-semibold text-black dark:text-white">rangnfa</span>
        </footer>
      </body>
    </html>
  );
}
