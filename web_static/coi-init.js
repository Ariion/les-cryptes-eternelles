if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('coi-serviceworker.js');
  if (!crossOriginIsolated) {
    navigator.serviceWorker.ready.then(() => location.reload());
  }
}
