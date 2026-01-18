module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Playfair Display'", "serif"],
        body: ["'Space Grotesk'", "sans-serif"]
      },
      colors: {
        ink: "#1c1b1a",
        sand: "#f4efe6",
        clay: "#d8c6b2",
        sage: "#8aa38b",
        ocean: "#2f5061",
        ember: "#d47c5c"
      },
      boxShadow: {
        soft: "0 10px 30px rgba(28, 27, 26, 0.12)",
        glow: "0 0 0 1px rgba(28, 27, 26, 0.08), 0 12px 30px rgba(47, 80, 97, 0.18)"
      }
    }
  },
  plugins: []
};
