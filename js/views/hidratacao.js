import DB from '../db.js';
import { showToast, today, toISODate, icon } from '../utils.js';

export function mount(container) {
  render(container);
}

function render(container) {
  const t = today();
  const config = DB.getConfig();
  const meta = config.metaAgua || 2000;
  const ml = DB.getAgua(t).ml;
  const pct = Math.min(ml / meta, 1);
  const circunf = 2 * Math.PI * 52;

  const historico = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const data = toISODate(d);
    return { data, ml: DB.getAgua(data).ml, label: `${d.getDate()}/${d.getMonth() + 1}` };
  });

  container.innerHTML = `
    <div class="view-header">
      <h1>Hidratação</h1>
    </div>
    <div class="agua-progress-wrap">
      <div class="agua-circle">
        <svg viewBox="0 0 120 120" class="agua-svg" aria-hidden="true">
          <circle cx="60" cy="60" r="52" fill="none" stroke="var(--color-border)" stroke-width="10"/>
          <circle cx="60" cy="60" r="52" fill="none" stroke="var(--bright-gold)" stroke-width="10"
            stroke-dasharray="${circunf}"
            stroke-dashoffset="${circunf * (1 - pct)}"
            stroke-linecap="round"
            transform="rotate(-90 60 60)"
            style="transition: stroke-dashoffset .5s ease"/>
        </svg>
        <div class="agua-center">
          <span class="agua-ml">${ml}</span>
          <span class="agua-unit">ml</span>
          <span class="agua-meta">/ ${meta}ml</span>
        </div>
      </div>
    </div>
    ${ml >= meta ? `<p class="text-center text-success mt-md font-bold">Meta atingida!</p>` : `<p class="text-center text-muted mt-md">${meta - ml}ml para a meta</p>`}
    <div class="agua-buttons mt-lg">
      ${[200, 500, 1000, 1800].map(v => `
        <button class="btn btn-secondary btn-agua" data-ml="${v}">+${v}ml</button>
      `).join('')}
    </div>
    <div class="field mt-md">
      <label>Personalizado</label>
      <div class="add-serie-inputs">
        <input id="agua-custom" type="number" min="50" step="50" placeholder="ml" inputmode="numeric">
        <button class="btn btn-primary" id="btn-agua-custom">Adicionar</button>
        <button class="btn btn-secondary btn-icon" id="btn-agua-reset" title="Zerar hoje">${icon('refresh-cw')}</button>
      </div>
    </div>
    <div class="field mt-md">
      <label>Meta diária</label>
      <div class="add-serie-inputs">
        <input id="agua-meta-input" type="number" min="500" step="100" value="${meta}" inputmode="numeric">
        <span class="text-muted" style="white-space:nowrap;font-size:.8rem">ml/dia</span>
        <button class="btn btn-secondary" id="btn-set-meta">Salvar</button>
      </div>
    </div>
    <div class="historico mt-lg">
      <h3>Últimos 7 dias</h3>
      <div class="agua-historico-bars">
        ${historico.map(d => {
          const p = Math.min(d.ml / meta, 1);
          const atingiu = d.ml >= meta;
          return `
            <div class="agua-bar-col">
              <div class="agua-bar-wrap">
                <div class="agua-bar-fill ${atingiu ? 'agua-bar-full' : ''}" style="height:${Math.max(p * 100, 2)}%"></div>
              </div>
              <span class="agua-bar-label">${d.label}</span>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  container.querySelectorAll('.btn-agua').forEach(btn => {
    btn.onclick = () => { DB.addAgua(t, parseInt(btn.dataset.ml)); render(container); };
  });

  container.querySelector('#btn-agua-custom').onclick = () => {
    const v = parseInt(container.querySelector('#agua-custom').value);
    if (!v || v <= 0) { showToast('Valor inválido'); return; }
    DB.addAgua(t, v);
    render(container);
  };

  container.querySelector('#btn-agua-reset').onclick = () => {
    if (confirm('Zerar registro de hoje?')) { DB.setAgua(t, 0); render(container); }
  };

  container.querySelector('#btn-set-meta').onclick = () => {
    const v = parseInt(container.querySelector('#agua-meta-input').value);
    if (!v || v < 100) { showToast('Meta inválida'); return; }
    DB.setConfig({ ...config, metaAgua: v });
    showToast('Meta atualizada!');
    render(container);
  };
}
