import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "#07070f",
          secondary: "#0e0e1a",
          card: "#12121f",
          border: "#1e1e35",
          hover: "#1a1a2e",
        },
        neon: {
          green: "#00ff88",
          blue: "#00d4ff",
          purple: "#a855f7",
          red: "#ff4444",
          amber: "#f59e0b",
        },
        text: {
          primary: "#e2e8f0",
          secondary: "#94a3b8",
          muted: "#475569",
        },
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "monospace"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "spin-slow": "spin 3s linear infinite",
      },
      boxShadow: {
        neon: "0 0 20px rgba(0, 255, 136, 0.15)",
        "neon-blue": "0 0 20px rgba(0, 212, 255, 0.15)",
        card: "0 4px 24px rgba(0, 0, 0, 0.4)",
      },
    },
  },
  plugins: [],
};

export default config;
