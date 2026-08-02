/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0B0F14",
        panel: "#111823",
        "panel-hover": "#161F2B",
        hairline: "#22303C",
        text: {
          DEFAULT: "#E7ECF2",
          muted: "#8C99A6",
          faint: "#5B6773",
        },
        saffron: {
          DEFAULT: "#FF9933",
          soft: "#FFB05C",
          dim: "rgba(255, 153, 51, 0.14)",
        },
        bullish: {
          DEFAULT: "#22C58B",
          dim: "rgba(34, 197, 139, 0.14)",
        },
        bearish: {
          DEFAULT: "#F1554C",
          dim: "rgba(241, 85, 76, 0.14)",
        },
        neutral: {
          DEFAULT: "#93A1AF",
          dim: "rgba(147, 161, 175, 0.14)",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        sm: "3px",
        DEFAULT: "4px",
      },
      keyframes: {
        "ticker-scroll": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        "ticker-scroll": "ticker-scroll 60s linear infinite",
      },
    },
  },
  plugins: [],
};
