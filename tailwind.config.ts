import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        parchment: "#f2ebdc",
        parchelev: "#fbf6ea",
        parchsunken: "#ebe2ce",
        ink: "#1c2321",
        inkmuted: "#6b6357",
        inkfaint: "#a09580",
        line: "#d9cfb8",
        forest: "#2d5a3d",
        forestdark: "#1f4429",
        forestsoft: "#dde7dc",
        gold: "#c99a3d",
        goldsoft: "#f0dfb0",
        brick: "#a04333",
        bricksoft: "#efd7cf",
      },
      fontFamily: {
        serif: ["'Fraunces'", "ui-serif", "Georgia", "serif"],
        sans: ["'Inter'", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
