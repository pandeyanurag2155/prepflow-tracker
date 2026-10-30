// Loaded before the stylesheets: apply the last-used theme so there is no light flash
// while the settings are still loading from the API. The server copy stays the source of truth.
try {
  const theme = localStorage.getItem('prepflow-theme');
  if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
} catch {
  // storage blocked: fall back to prefers-color-scheme
}
