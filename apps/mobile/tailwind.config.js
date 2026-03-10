module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "../../packages/shared/src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#1e3a5f",
        accent: "#FFC72C",
        background: "#FFFFFF",
        foreground: "#111827",
        muted: "#F3F4F6",
        "muted-foreground": "#6B7280",
        border: "#E5E7EB",
      },
    },
  },
  plugins: [],
};
