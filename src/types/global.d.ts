// Global stylesheet side-effect imports (e.g. `import "./docs.css"`).
// Next.js already declares `*.module.css` in its bundled types; this
// covers the non-module global form so TS 6.0's stricter side-effect
// import checking (TS2882) doesn't flag it.
declare module "*.css";
