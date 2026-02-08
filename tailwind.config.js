/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}", "./index.html"],
  theme: {
    extend: {
      screens: {
        xs: "475px",
        "3xl": "1600px",
      },
    },
  },
  plugins: [],
};
