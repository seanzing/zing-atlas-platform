import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      colors: {
        zing: {
          turquoise: "#34E1D2",
          "turquoise-light": "#99F0E8",
          bluejeans: "#00AEFF",
          "bluejeans-light": "#80D6FF",
          ultramarine: "#3A5AFF",
          "ultramarine-light": "#9DACFF",
          violet: "#9600FF",
          "violet-light": "#CA80FF",
          purple: "#6407FA",
          "purple-light": "#B183FC",
          oxford: "#050536",
          grey: "#82829A",
        },
        background: "#F5F7FA",
        card: "#FFFFFF",
        "text-primary": "#1a1a2e",
        "text-secondary": "#5a5f7a",
        "text-muted": "#8b90a8",
        border: "#E8EBF0",
        "border-light": "#F0F2F6",
      },
    },
  },
  plugins: [],
};
export default config;
