// public/redirect.js
(function() {
  const path = sessionStorage.getItem('path');
  sessionStorage.removeItem('path');
  if (path && path !== location.pathname) {
    history.replaceState(null, null, path);
  }
})();