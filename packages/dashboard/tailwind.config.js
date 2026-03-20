/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        slate: {
          850: "#172033",
          950: "#0a0f1a",
        },
        claw: {
          50:  "#fff1f1",
          100: "#ffe4e4",
          200: "#fecaca",
          300: "#fca5a5",
          400: "#f87171",
          500: "#ef4444",
          600: "#dc2626",
          700: "#b91c1c",
          800: "#991b1b",
          900: "#7f1d1d",
          950: "#450a0a",
        },
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "Consolas", "monospace"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { opacity: "1", boxShadow: "0 0 8px 2px rgba(220,38,38,0.25)" },
          "50%":       { opacity: "0.85", boxShadow: "0 0 20px 6px rgba(220,38,38,0.45)" },
        },
        "slide-in": {
          "0%":   { transform: "translateY(-6px)", opacity: "0" },
          "100%": { transform: "translateY(0)",    opacity: "1" },
        },
        "fade-in": {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scan-line": {
          "0%":   { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
      },
      animation: {
        "pulse-glow": "pulse-glow 2.5s ease-in-out infinite",
        "slide-in":   "slide-in 0.3s ease-out",
        "fade-in":    "fade-in 0.4s ease-out",
        "scan-line":  "scan-line 2s linear infinite",
      },
      backgroundImage: {
        "claw-gradient":   "linear-gradient(135deg, #0a0f1a 0%, #0f0a12 50%, #160810 100%)",
        "header-gradient": "linear-gradient(90deg, rgba(220,38,38,0.08) 0%, transparent 60%)",
        "card-gradient":   "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
        "danger-glow":     "radial-gradient(ellipse at center, rgba(220,38,38,0.15) 0%, transparent 70%)",
      },
    },
  },
  plugins: [],
};
