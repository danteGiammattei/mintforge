/** @type {import('tailwindcss').Config}
 * Tailwind is here for its reset and the odd layout utility. The look of
 * the game — colour, type, every component — is in src/styles.css, so
 * that there is one place to read it. */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: { extend: { fontFamily: { sans: ['"Silkscreen"', "ui-monospace", "monospace"] } } },
  plugins: [],
};
