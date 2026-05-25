import { initRouter, registerView, navigate } from './router.js';
import { mount as mountTreinos } from './views/treinos.js';
import { mount as mountProgresso } from './views/progresso.js';
import { mount as mountHidratacao } from './views/hidratacao.js';
import { mount as mountPeso } from './views/peso.js';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

window.addEventListener('online', () => document.body.classList.remove('offline'));
window.addEventListener('offline', () => document.body.classList.add('offline'));
if (!navigator.onLine) document.body.classList.add('offline');

registerView('treinos', mountTreinos);
registerView('progresso', mountProgresso);
registerView('hidratacao', mountHidratacao);
registerView('peso', mountPeso);

const main = document.querySelector('.app-main');
const navItems = document.querySelectorAll('.nav-item');

navItems.forEach(item => {
  item.addEventListener('click', () => navigate(item.dataset.view));
});

initRouter(main, navItems);
