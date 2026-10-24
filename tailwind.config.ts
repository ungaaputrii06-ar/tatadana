import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#2563EB", // Primary Electric Blue
          600: "#1d4ed8",
          700: "#1e40af",
          800: "#1e3a8a",
          900: "#172554",
          blue: '#2563EB',
          cyan: '#00D2FF',
          darkBg: '#090D16',
          darkCard: '#0F172A',
          darkBorder: '#1E293B',
          darkHover: '#172033',
        },
        surface: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
          950: "#090d16",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "Plus Jakarta Sans", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 2px 15px -3px rgba(0, 0, 0, 0.3), 0 10px 20px -2px rgba(0, 0, 0, 0.2)",
        blueGlow: "0 0 25px -5px rgba(37, 99, 235, 0.45)",
        cyanGlow: "0 0 20px -3px rgba(0, 210, 255, 0.4)",
      },
    },
  },
  plugins: [],
};
export default config;
