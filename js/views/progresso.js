import DB from '../db.js';
import { showToast, escapeHtml } from '../utils.js';

export function mount(container) {
  renderList(container);
}

function renderList(container) {
  const exercicios = DB.getExercicios();

  container.innerHTML = `
    <div class="view-header">
      <h1>Exercícios</h1>
      <button class="btn btn-primary" id="btn-novo-ex">+ Novo</button>
    </div>
    ${exercicios.length === 0 ? `
      <div class="empty-state">
        <p class="empty-icon">🏋️</p>
        <p>Nenhum exercício ainda.</p>
        <p class="text-muted">Registre suas máquinas e cargas!</p>
      </div>
    ` : `
      <div class="ex-catalog-list">
        ${exercicios.map(ex => `
          <div class="card ex-catalog-card">
            <div class="ex-catalog-info">
              <h3>${escapeHtml(ex.nome)}</h3>
              <div class="ex-catalog-stats">
                ${ex.reps ? `<div class="ex-stat"><span class="ex-stat-val">${ex.reps}</span><span class="ex-stat-label">reps</span></div>` : ''}
                ${ex.ultimoPeso ? `<div class="ex-stat"><span class="ex-stat-val ex-stat-kg">${ex.ultimoPeso}</span><span class="ex-stat-label">kg</span></div>` : ''}
              </div>
            </div>
            <div class="plano-actions">
              <button class="btn btn-secondary btn-sm btn-editar-ex" data-id="${ex.id}">Editar</button>
              <button class="btn-icon btn-deletar-ex" data-id="${ex.id}">✕</button>
            </div>
          </div>
        `).join('')}
      </div>
    `}
  `;

  container.querySelector('#btn-novo-ex').onclick = () => renderForm(container);

  container.querySelectorAll('.btn-editar-ex').forEach(btn => {
    btn.onclick = () => {
      const ex = DB.getExercicios().find(e => e.id === btn.dataset.id);
      if (ex) renderForm(container, ex);
    };
  });

  container.querySelectorAll('.btn-deletar-ex').forEach(btn => {
    btn.onclick = () => {
      if (confirm('Remover este exercício?')) {
        DB.deleteExercicio(btn.dataset.id);
        renderList(container);
      }
    };
  });
}

function renderForm(container, ex = null) {
  const isEdit = !!ex;
  const data = ex || { nome: '', reps: '', ultimoPeso: '' };

  container.innerHTML = `
    <div class="view-header">
      <button class="btn-back" id="btn-back">←</button>
      <h1>${isEdit ? 'Editar exercício' : 'Novo exercício'}</h1>
    </div>
    <form id="form-ex" class="form-stack">
      <div class="field">
        <label>Nome da máquina / exercício</label>
        <input type="text" id="ex-nome" value="${escapeHtml(data.nome)}" placeholder="Ex: Supino, Leg Press, Puxada...">
      </div>
      <div class="field">
        <label>Repetições</label>
        <input type="text" id="ex-reps" value="${escapeHtml(data.reps || '')}" placeholder="Ex: 12 ou 8-12">
      </div>
      <div class="field">
        <label>Último peso usado (kg)</label>
        <input type="number" id="ex-peso" value="${data.ultimoPeso || ''}" min="0" step="0.5" placeholder="Ex: 60" inputmode="decimal">
      </div>
      <button type="submit" class="btn btn-primary btn-full mt-lg">${isEdit ? 'Salvar alterações' : 'Adicionar exercício'}</button>
    </form>
  `;

  container.querySelector('#btn-back').onclick = () => renderList(container);

  container.querySelector('#form-ex').onsubmit = e => {
    e.preventDefault();
    const nome = container.querySelector('#ex-nome').value.trim();
    if (!nome) { showToast('Informe o nome do exercício'); return; }

    const entry = {
      id: ex?.id,
      nome,
      reps: container.querySelector('#ex-reps').value.trim(),
      ultimoPeso: parseFloat(container.querySelector('#ex-peso').value) || 0,
    };

    if (isEdit) {
      DB.updateExercicio(entry);
      showToast('Exercício atualizado!');
    } else {
      DB.addExercicio(entry);
      showToast('Exercício adicionado!');
    }
    renderList(container);
  };
}
