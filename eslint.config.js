import js from "@eslint/js";
import react from "eslint-plugin-react";
import hooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default [
  { ignores: ["dist/", "node_modules/", ".wrangler/"] },
  js.configs.recommended,
  {
    files: ["src/**/*.{js,jsx}"],
    plugins: { react, "react-hooks": hooks },
    languageOptions: {
      ecmaVersion: 2023, sourceType: "module", globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: "18.3" } },
    rules: {
      ...hooks.configs.recommended.rules,
      "react/jsx-uses-vars": "error",
      "react/jsx-uses-react": "off",
      "react/jsx-key": "error",
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", caughtErrors: "none" }],
      // the game must never fall back to a browser dialog; use ui/Overlay.jsx
      "no-alert": "error",
      "no-restricted-globals": ["error", "confirm", "alert", "prompt"],
    },
  },
  {
    files: ["shared/**/*.js", "server/**/*.js", "functions/**/*.js"],
    languageOptions: { ecmaVersion: 2023, sourceType: "module", globals: { ...globals.serviceworker, console: "readonly" } },
    rules: { "no-unused-vars": ["error", { argsIgnorePattern: "^_", caughtErrors: "none" }] },
  },
  {
    files: ["tests/**/*.js", "tools/**/*.mjs", "*.config.js"],
    languageOptions: { ecmaVersion: 2023, sourceType: "module", globals: globals.node },
    rules: { "no-unused-vars": ["error", { argsIgnorePattern: "^_", caughtErrors: "none" }] },
  },
];
