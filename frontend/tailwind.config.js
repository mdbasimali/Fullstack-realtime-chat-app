const daisyui = require("daisyui");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.32, 0.72, 0, 1)',
        'spring-bouncy': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      }
    },
  },
  plugins: [daisyui],
  daisyui: {
    themes: [
      {
        light: {
          ...require("daisyui/src/theming/themes")["light"],
          primary: "#007aff",
          "primary-content": "#ffffff",
        },
        dark: {
          ...require("daisyui/src/theming/themes")["dark"],
          primary: "#007aff",
          "primary-content": "#ffffff",
        },
      },
    ],
  },
};
