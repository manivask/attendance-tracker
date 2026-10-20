// Phase 5 bootstrap loaded by the migration build.
// Keep initialization ordered: config -> Firebase -> authentication UI.
(async () => {
  try {
    await import('./firebase-config.js');
    await import('./firebase.js');
    await import('./auth.js');
  } catch (error) {
    console.error('Unable to start Firebase Authentication:', error);
    window.dispatchEvent(new CustomEvent('tbta-auth-error', { detail: { message: error?.message || 'Authentication failed to start.' } }));
  }
})();
