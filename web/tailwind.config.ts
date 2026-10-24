import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        void: "#07060d",
        panel: "#0d0b17",
        edge: "#231f3a",
        ink: "#e7e5f4",
        mute: "#8b87a8",
        monad: "#836EF9",
        req: "#22d3ee",
        wrk1: "#34d399",
        wrk2: "#fbbf24",
        pay: "#34d399",
        bad: "#f87171",
      },
      keyframes: {
        rise: { "0%": { opacity: "0", transform: "translateY(6px)" }, "100%": { opacity: "1", transform: "none" } },
        blink: { "0%,100%": { opacity: "1" }, "50%": { opacity: "0.25" } },
      },
      animation: { rise: "rise .25s ease-out", blink: "blink 1.2s ease-in-out infinite" },
    },
  },
  plugins: [],
};
export default config;
