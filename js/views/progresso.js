import DB from '../db.js';

export function mount(container) {
  const sessoes = DB.getSessoes().filter(s => s.concluido);
  const streak = calcStreak(sessoes);
  const exercicios = getUniqueExercicios(sessoes);

  container.innerHTML = `
    <div class="view-header">
      <h1>Progresso</h1>
    </div>
    <div class="streak-card card">
      <span class="streak-num">${streak}</span>
      <span class="streak-label">dia${streak !== 1 ? 's' : ''} seguido${streak !== 1 ? 's' : ''} 🔥</span>
    </div>
    <div class="mt-md">
      ${renderSemanaCompare(sessoes)}
    </div>
    <div class="field mt-lg">
      <label>Evolução por exercício</label>
      <select id="ex-select">
        <option value="">Selecione um exercício...</option>
        ${exercicios.map(e => `<option value="${e}">${e}</option>`).join('')}
      </select>
    </div>
    <div id="chart-container" class="mt-md"></div>
  `;

  container.querySelector('#ex-select').onchange = e => {
    const nome = e.target.value;
    const chartEl = container.querySelector('#chart-container');
    if (!nome) { chartEl.innerHTML = ''; return; }
    const data = getExercicioData(sessoes, nome);
    chartEl.innerHTML = renderLineChart(data, nome, 'var(--indigo)');
  };
}

function calcStreak(sessoes) {
  if (!sessoes.length) return 0;
  const datas = [...new Set(sessoes.map(s => s.data))].sort().reverse();
  const t = new Date().toISOString().slice(0, 10);
  let streak = 0;
  let cur = new Date(t);
  for (const data of datas) {
    const d = new Date(data);
    const diff = Math.round((cur - d) / 86400000);
    if (diff <= 1) { streak++; cur = d; }
    else break;
  }
  return streak;
}

function getUniqueExercicios(sessoes) {
  const set = new Set();
  sessoes.forEach(s => s.exercicios?.forEach(e => set.add(e.nome)));
  return [...set].sort();
}

function getExercicioData(sessoes, nome) {
  return sessoes
    .filter(s => s.exercicios?.some(e => e.nome === nome))
    .map(s => {
      const ex = s.exercicios.find(e => e.nome === nome);
      const maxCarga = ex.series.length ? Math.max(...ex.series.map(s => s.carga)) : 0;
      return { data: s.data, carga: maxCarga };
    })
    .sort((a, b) => a.data.localeCompare(b.data));
}

function renderSemanaCompare(sessoes) {
  const t = new Date();
  const startOfWeek = new Date(t);
  startOfWeek.setDate(t.getDate() - t.getDay());
  const startOfLastWeek = new Date(startOfWeek);
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

  const fmt = d => d.toISOString().slice(0, 10);
  const thisWeek = sessoes.filter(s => s.data >= fmt(startOfWeek)).length;
  const lastWeek = sessoes.filter(s => s.data >= fmt(startOfLastWeek) && s.data < fmt(startOfWeek)).length;
  const diff = thisWeek - lastWeek;

  return `
    <div class="semana-cards">
      <div class="card semana-card">
        <span class="semana-num">${thisWeek}</span>
        <span class="semana-label">Esta semana</span>
      </div>
      <div class="card semana-card">
        <span class="semana-num">${lastWeek}</span>
        <span class="semana-label">Semana anterior</span>
      </div>
      <div class="card semana-card">
        <span class="semana-num ${diff > 0 ? 'text-success' : diff < 0 ? 'text-danger' : ''}">${diff > 0 ? '+' : ''}${diff}</span>
        <span class="semana-label">Diferença</span>
      </div>
    </div>
  `;
}

export function renderLineChart(data, label, color = 'var(--indigo)') {
  if (data.length === 0) return '<p class="text-muted text-center mt-md">Sem dados ainda.</p>';

  const W = 300, H = 150, PAD = 36;
  const values = data.map(d => d.carga);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const xs = data.map((_, i) => PAD + (i / Math.max(data.length - 1, 1)) * (W - PAD * 2));
  const ys = data.map(d => PAD + (1 - (d.carga - min) / range) * (H - PAD * 2));
  const polyline = xs.map((x, i) => `${x},${ys[i]}`).join(' ');

  const dots = xs.map((x, i) => `
    <circle cx="${x}" cy="${ys[i]}" r="4" fill="${color}">
      <title>${data[i].data}: ${data[i].carga}kg</title>
    </circle>
  `).join('');

  return `
    <div class="chart-wrap">
      <p class="chart-title">${label}</p>
      <svg viewBox="0 0 ${W} ${H}" class="line-chart" aria-hidden="true">
        <polyline points="${polyline}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round"/>
        ${dots}
        <text x="${PAD - 4}" y="${PAD + 4}" font-size="9" text-anchor="end" fill="var(--color-text-muted)">${max}kg</text>
        <text x="${PAD - 4}" y="${H - PAD + 4}" font-size="9" text-anchor="end" fill="var(--color-text-muted)">${min}kg</text>
      </svg>
    </div>
  `;
}
