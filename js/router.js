const views = {};

export function registerView(hash, mountFn) {
  views[hash] = mountFn;
}

export function navigate(hash) {
  location.hash = hash;
}

export function initRouter(container, navItems) {
  function render() {
    const hash = location.hash.slice(1) || 'treinos';
    const mount = views[hash];
    if (!mount) return;
    container.innerHTML = '';
    mount(container);
    navItems.forEach(el => {
      el.classList.toggle('active', el.dataset.view === hash);
    });
  }
  window.addEventListener('hashchange', render);
  render();
}
