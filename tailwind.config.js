module.exports = {
  content: ["**/*.njk"],
  theme: {
    fontFamily: {
      sans: ["Kiwi Maru", "sans-serif"],
      display: ["Quicksand", "serif"],
    },
    colors: {
      primary: "#E4572E",
      secondary: "#F0F8EA",
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
