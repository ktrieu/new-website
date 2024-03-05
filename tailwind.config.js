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
    extend: {
      typography: {
        DEFAULT: {
          css: {
            'code::before': {
              content: '""'
            },
            'code::after': {
              content: '""'
            }
          }
        }
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
