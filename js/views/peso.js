import DB from '../db.js';
import { showToast, today, toISODate, formatDate, icon } from '../utils.js';

export function mount(container) {
  const state = { display: '', month: new Date(), selected: today() };
  render(container, state);
}

function render(container, state) {
  const t = today();
  const pesos = DB.getPesos();
  const isToday = state.selected === t;
  const selectedPeso = pesos.find(p => p.data === state.selected);
  const weekAvg = calcWeekAvg(pesos, 0);
  const prevWeekAvg = calcWeekAvg(pesos, -1);
  const diff = weekAvg && prevWeekAvg ? +(weekAvg - prevWeekAvg).toFixed(1) : null;

  const displayValue = state.display || (selectedPeso ? String(selectedPeso.kg) : '');

  container.innerHTML = `
    <div class="view-header">
      <h1>Peso corporal</h1>
    </div>

    <div class="numpad-wrap ${isToday ? '' : 'numpad-editing'}">
      <div class="numpad-date">
        <span class="numpad-date-label">${isToday ? 'Hoje' : formatDayLabel(state.selected)}</span>
        ${isToday ? '' : `<button class="numpad-date-today" data-action="today">Voltar para hoje</button>`}
      </div>
      <div class="numpad-display">
        <span class="numpad-value">${displayValue || '—'}</span>
        <span class="numpad-unit">kg</span>
      </div>
      <p class="numpad-hint">
        ${selectedPeso && !state.display
          ? 'Registrado · digite para alterar'
          : isToday ? '&nbsp;' : 'Toque nos números para registrar este dia'}
      </p>
      <div class="numpad-grid">
        ${[7,8,9,4,5,6,1,2,3].map(n => `
          <button class="numpad-btn" data-num="${n}">${n}</button>
        `).join('')}
        <button class="numpad-btn" data-num=".">.</button>
        <button class="numpad-btn" data-num="0">0</button>
        <button class="numpad-btn numpad-del" data-action="del" aria-label="Apagar dígito">${icon('delete-left', 22)}</button>
        <button class="numpad-btn numpad-confirm" data-action="confirm">Salvar</button>
        ${selectedPeso ? `
          <button class="numpad-remove" data-action="remove">${icon('trash', 16)} Excluir registro</button>
        ` : ''}
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

    <div class="card peso-calendar mt-lg">
      <div class="cal-header">
        <button class="cal-nav btn-icon" data-dir="-1" aria-label="Mês anterior">${icon('chevron-left')}</button>
        <h3>${formatMonth(state.month)}</h3>
        <button class="cal-nav btn-icon" data-dir="1" aria-label="Próximo mês">${icon('chevron-right')}</button>
      </div>
      ${renderCalendar(state.month, pesos, t, state.selected)}
      <p class="cal-hint">Toque em um dia para editar o peso</p>
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
    DB.addPeso(state.selected, v);
    state.display = '';
    showToast(isToday ? 'Peso salvo!' : `Peso de ${formatDate(state.selected)} salvo!`);
    render(container, state);
  };

  const removeBtn = container.querySelector('[data-action="remove"]');
  if (removeBtn) {
    removeBtn.onclick = () => {
      if (!confirm(`Excluir o peso de ${formatDate(state.selected)}?`)) return;
      DB.deletePeso(state.selected);
      state.display = '';
      showToast('Registro excluído');
      render(container, state);
    };
  }

  const todayBtn = container.querySelector('[data-action="today"]');
  if (todayBtn) {
    todayBtn.onclick = () => {
      state.selected = t;
      state.display = '';
      state.month = new Date();
      render(container, state);
    };
  }

  container.querySelectorAll('.cal-cell[data-date]').forEach(cell => {
    cell.onclick = () => {
      if (cell.dataset.date === state.selected) return;
      state.selected = cell.dataset.date;
      state.display = '';
      render(container, state);
      container.querySelector('.numpad-wrap').scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
  });

  container.querySelectorAll('.cal-nav').forEach(btn => {
    btn.onclick = () => {
      const m = state.month;
      state.month = new Date(m.getFullYear(), m.getMonth() + parseInt(btn.dataset.dir), 1);
      render(container, state);
    };
  });
}

function renderCalendar(month, pesos, todayStr, selected) {
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
    const isFuture = dateStr > todayStr;
    const classes = [
      'cal-cell',
      dateStr === todayStr ? 'cal-today' : '',
      dateStr === selected ? 'cal-selected' : '',
      peso ? 'cal-has-peso' : '',
      isFuture ? 'cal-future' : '',
    ].filter(Boolean).join(' ');
    // Dias futuros não são editáveis
    if (isFuture) {
      return `<div class="${classes}"><span class="cal-day-num">${d}</span></div>`;
    }
    return `
      <button type="button" class="${classes}" data-date="${dateStr}">
        <span class="cal-day-num">${d}</span>
        ${peso ? `<span class="cal-peso-val">${peso}</span>` : ''}
      </button>
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
  const start = new Date(t.getFullYear(), t.getMonth(), t.getDate() - t.getDay() + weekOffset * 7);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);

  const startStr = toISODate(start);
  const endStr = toISODate(end);

  const week = pesos.filter(p => p.data >= startStr && p.data < endStr);
  if (!week.length) return null;
  return +(week.reduce((s, p) => s + p.kg, 0) / week.length).toFixed(1);
}

function formatDayLabel(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const label = new Date(y, m - 1, d).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatMonth(date) {
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}
