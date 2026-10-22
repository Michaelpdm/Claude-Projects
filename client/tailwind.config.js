/** @type {import('tailwindcss').Config} */
// Theme tokens live in src/index.css as CSS variables (dark = Midnight & Champagne,
// light = Porcelain). The zinc and emerald scales are remapped onto them so every
// existing page picks up the new palette and the dark/light toggle.
const scale = (name) =>
  Object.fromEntries(
    [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((n) => [
      n,
      `rgb(var(--${name}-${n}) / <alpha-value>)`,
    ])
  );

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        zinc: scale('z'),
        emerald: scale('gold'),
        green: scale('gold'),
        gold: scale('gold'),
        peri: 'rgb(var(--peri) / <alpha-value>)',
        rose: { DEFAULT: 'rgb(var(--rose) / <alpha-value>)' },
        amber: { DEFAULT: 'rgb(var(--amber) / <alpha-value>)' },
        coral: 'rgb(var(--coral) / <alpha-value>)',
        lilac: 'rgb(var(--lilac) / <alpha-value>)',
        sand: 'rgb(var(--sand) / <alpha-value>)',
      },
      borderRadius: { xl: '12px' },
    },
  },
  plugins: [],
};
