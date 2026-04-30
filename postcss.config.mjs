// PostCSS config — only used by the docs CSS pipeline (Fumadocs + Tailwind v4).
// Other CSS in the app is emitted by MUI/Emotion and bypasses this.
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
