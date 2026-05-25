import DB from '../db.js';
import { showToast, today } from '../utils.js';

export function mount(container) {
  const state = { display: '', month: new Date() };
  render(container, state);
}

function render(container, state) {
  const t = today();
  const pesos = DB.getPesos();
  const todayPeso = pesos.find(p => p.data === t);
  const weekAvg = calcWeekAvg(pesos, 0);
  const prevWeekAvg = calcWeekAvg(pesos, -1);
  const diff = weekAvg && prevWeekAvg ? +(weekAvg - prevWeekAvg).toFixed(1) : null;

  const displayValue = state.display || (todayPeso ? String(todayPeso.kg) : '');

  container.innerHTML = `
    <div class="view-header">
      <h1>Peso corporal</h1>
    </div>

    <div class="numpad-wrap">
      <div class="numpad-display">
        <span class="numpad-value">${displayValue || '—'}</span>
        <span class="numpad-unit">kg</span>
      </div>
      ${todayPeso && !state.display ? `<p class="numpad-hint">Registrado hoje · toque para editar</p>` : ''}
      <div class="numpad-grid">
        ${[7,8,9,4,5,6,1,2,3].map(n => `
          <button class="numpad-btn" data-num="${n}">${n}</button>
        `).join('')}
        <button class="numpad-btn" data-num=".">.</button>
        <button class="numpad-btn" data-num="0">0</button>
        <button class="numpad-btn numpad-del" data-action="del">⌫</button>
        <button class="numpad-btn numpad-confirm" data-action="confirm">Salvar</button>
      </div>
    </div>

    <div class="semana-cards mt-lg">
      <div class="card semana-card">
        <span class="semana-num">${weekAvg !== null ? weekAvg + ' kg' : '—'}</span>
        <span class="semana-label">Média esta semana</span>
      </div>
      <div class="card semana-card">
        <span class="semana-num ${diff !== null ? (diff > 0 ? 'text-danger' : diff < 0 ? 'text-success' : '') : ''}">
          ${diff !== null ? (diff > 0 ? '+' : '') + diff + ' kg' : '—'}
        </span>
        <span class="semana-label">vs semana anterior</span>
      </div>
    </div>

    <div class="peso-calendar mt-lg">
      <div class="cal-header">
        <button class="cal-nav btn-icon" data-dir="-1">‹</button>
        <h3>${formatMonth(state.month)}</h3>
        <button class="cal-nav btn-icon" data-dir="1">›</button>
      </div>
      ${renderCalendar(state.month, pesos, t)}
    </div>
  `;

  // Numpad digits
  container.querySelectorAll('.numpad-btn[data-num]').forEach(btn => {
    btn.onclick = () => {
      const n = btn.dataset.num;
      if (n === '.' && state.display.includes('.')) return;
      if (n === '.' && state.display === '') { state.display = '0'; }
      const parts = state.display.split('.');
      if (parts[1] !== undefined && parts[1].length >= 1) return;
      if (parts[0].length >= 3 && n !== '.') return;
      state.display += n;
      render(container, state);
    };
  });

  container.querySelector('[data-action="del"]').onclick = () => {
    state.display = state.display.slice(0, -1);
    render(container, state);
  };

  container.querySelector('[data-action="confirm"]').onclick = () => {
    const v = parseFloat(state.display);
    if (!v || v < 20 || v > 400) { showToast('Peso inválido'); return; }
    DB.addPeso(t, v);
    state.display = '';
    showToast('Peso salvo!');
    render(container, state);
  };

  container.querySelectorAll('.cal-nav').forEach(btn => {
    btn.onclick = () => {
      const m = state.month;
      state.month = new Date(m.getFullYear(), m.getMonth() + parseInt(btn.dataset.dir), 1);
      render(container, state);
    };
  });
}

function renderCalendar(month, pesos, todayStr) {
  const year = month.getFullYear();
  const m = month.getMonth();
  const firstDay = new Date(year, m, 1).getDay();
  const daysInMonth = new Date(year, m + 1, 0).getDate();

  const pesoMap = {};
  pesos.forEach(p => { pesoMap[p.data] = p.kg; });

  const weekdays = ['D','S','T','Q','Q','S','S'];

  const emptyCells = Array.from({ length: firstDay }, () => `<div class="cal-cell cal-empty"></div>`).join('');

  const dayCells = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1;
    const dateStr = `${year}-${String(m + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const peso = pesoMap[dateStr];
    const isToday = dateStr === todayStr;
    return `
      <div class="cal-cell ${isToday ? 'cal-today' : ''} ${peso ? 'cal-has-peso' : ''}">
        <span class="cal-day-num">${d}</span>
        ${peso ? `<span class="cal-peso-val">${peso}</span>` : ''}
      </div>
    `;
  }).join('');

  return `
    <div class="cal-grid">
      ${weekdays.map(d => `<div class="cal-weekday">${d}</div>`).join('')}
      ${emptyCells}
      ${dayCells}
    </div>
  `;
}

function calcWeekAvg(pesos, weekOffset = 0) {
  const t = new Date();
  const startOfThisWeek = new Date(t);
  startOfThisWeek.setDate(t.getDate() - t.getDay());
  startOfThisWeek.setHours(0,0,0,0);

  const start = new Date(startOfThisWeek);
  start.setDate(start.getDate() + weekOffset * 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);

  const week = pesos.filter(p => p.data >= startStr && p.data < endStr);
  if (!week.length) return null;
  return +(week.reduce((s, p) => s + p.kg, 0) / week.length).toFixed(1);
}

function formatMonth(date) {
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}
