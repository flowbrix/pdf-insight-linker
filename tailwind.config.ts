
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#0FA0CE",
          light: "#3DB5D9",
          dark: "#0B7A9E",
          foreground: "white",
        },
        secondary: {
          DEFAULT: "#221F26",
          foreground: "white",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "#F1F1F1",
          foreground: "#333333",
        },
        accent: {
          DEFAULT: "#0FA0CE",
          foreground: "white",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "white",
          foreground: "#333333",
        },
      },
      fontFamily: {
        sans: ['Lato', 'sans-serif'],
      },
      backgroundImage: {
        'hero-pattern': "url('/public/lovable-uploads/17265af6-eb9a-4354-8343-fbbf62ec0d76.png')",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
