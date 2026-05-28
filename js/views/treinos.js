import DB from '../db.js';
import { showToast, today, formatDate, escapeHtml } from '../utils.js';

export function mount(container) {
  renderHome(container);
}

function showIOModal(container) {
  const planos = DB.getPlanos();
  const json = JSON.stringify(planos, null, 2);
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box">
      <div class="modal-header">
        <span>Exportar / Importar</span>
        <button class="btn-icon" id="modal-close">✕</button>
      </div>
      <p class="text-muted modal-hint">Para <strong>exportar</strong>: copie o texto abaixo.<br>Para <strong>importar</strong>: apague e cole o JSON copiado, depois clique em Importar.</p>
      <textarea class="modal-textarea" id="modal-json" spellcheck="false">${escapeHtml(json)}</textarea>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="modal-copy">Copiar</button>
        <button class="btn btn-primary" id="modal-import">Importar</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelector('#modal-close').onclick = close;
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.querySelector('#modal-copy').onclick = () => {
    navigator.clipboard.writeText(overlay.querySelector('#modal-json').value)
      .then(() => showToast('Copiado!'))
      .catch(() => { overlay.querySelector('#modal-json').select(); document.execCommand('copy'); showToast('Copiado!'); });
  };
  overlay.querySelector('#modal-import').onclick = () => {
    try {
      const data = JSON.parse(overlay.querySelector('#modal-json').value);
      if (!Array.isArray(data)) throw new Error();
      data.forEach(p => { if (!p.nome || !Array.isArray(p.exercicios)) throw new Error(); });
      const imported = data.map(p => ({ ...p, id: crypto.randomUUID() }));
      DB.savePlanos(imported);
      showToast(`${imported.length} plano(s) importado(s)!`);
      close();
      renderHome(container);
    } catch {
      showToast('JSON inválido');
    }
  };
}

function renderHome(container) {
  const planos = DB.getPlanos();
  const t = today();
  const sessoesHoje = DB.getSessoes().filter(s => s.data === t);

  container.innerHTML = `
    <div class="view-header">
      <h1>Treinos</h1>
      <div class="header-actions">
        <button class="btn-icon btn-header-icon" id="btn-io" title="Exportar / Importar">⇅</button>
        <button class="btn btn-primary" id="btn-novo-plano">+ Novo</button>
      </div>
    </div>
    ${planos.length === 0 ? `
      <div class="empty-state">
        <p class="empty-icon">🏋️</p>
        <p>Nenhum plano ainda.</p>
        <p class="text-muted">Crie seu primeiro treino!</p>
      </div>
    ` : ''}
    <div class="plano-list">
      ${planos.map(p => {
        const sessaoHoje = sessoesHoje.find(s => s.planoId === p.id);
        const btnLabel = sessaoHoje?.concluido ? 'Ver' : sessaoHoje ? 'Continuar' : 'Iniciar';
        return `
          <div class="card plano-card">
            <div class="plano-info">
              <div class="plano-info-top">
                <span class="divisao-badge">${p.divisao}</span>
                ${sessaoHoje?.concluido ? '<span class="badge-done">✓ Feito hoje</span>' : sessaoHoje ? '<span class="badge-progress">● Em andamento</span>' : ''}
              </div>
              <h3>${escapeHtml(p.nome)}</h3>
              <p class="text-muted">${p.exercicios.length} exercício${p.exercicios.length !== 1 ? 's' : ''}</p>
            </div>
            <div class="plano-actions">
              <button class="btn btn-primary btn-iniciar" data-id="${p.id}">${btnLabel}</button>
              <button class="btn-icon btn-editar-plano" data-id="${p.id}" title="Editar">✎</button>
              <button class="btn-icon btn-deletar" data-id="${p.id}" title="Deletar">✕</button>
            </div>
          </div>
        `;
      }).join('')}
    </div>
    ${renderHistorico()}
  `;

  container.querySelector('#btn-novo-plano').onclick = () => renderFormPlano(container);
  container.querySelector('#btn-io').onclick = () => showIOModal(container);

  container.querySelectorAll('.btn-iniciar').forEach(btn => {
    btn.onclick = () => {
      const plano = DB.getPlanos().find(p => p.id === btn.dataset.id);
      if (plano) renderSessao(container, plano);
    };
  });

  container.querySelectorAll('.btn-editar-plano').forEach(btn => {
    btn.onclick = () => {
      const plano = DB.getPlanos().find(p => p.id === btn.dataset.id);
      if (plano) renderFormPlano(container, plano);
    };
  });

  container.querySelectorAll('.btn-deletar').forEach(btn => {
    btn.onclick = () => {
      if (confirm('Deletar este plano? O histórico de sessões é mantido.')) {
        DB.deletePlano(btn.dataset.id);
        renderHome(container);
      }
    };
  });
}

function renderHistorico() {
  const sessoes = DB.getSessoes()
    .filter(s => s.concluido)
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, 5);

  if (sessoes.length === 0) return '';

  return `
    <div class="historico mt-lg">
      <h3>Últimos treinos</h3>
      ${sessoes.map(s => `
        <div class="historico-row">
          <span class="text-muted">${formatDate(s.data)}</span>
          <span><span class="divisao-badge">${s.planoDivisao}</span> ${escapeHtml(s.planoNome)}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function renderFormPlano(container, plano = null) {
  const isEdit = !!plano;
  const data = plano || { nome: '', divisao: 'A', exercicios: [] };

  container.innerHTML = `
    <div class="view-header">
      <button class="btn-back" id="btn-back">←</button>
      <h1>${isEdit ? 'Editar plano' : 'Novo plano'}</h1>
    </div>
    <form id="form-plano" class="form-stack">
      <div class="field">
        <label>Nome do plano</label>
        <input type="text" id="plano-nome" value="${escapeHtml(data.nome)}" placeholder="Ex: Peito e Tríceps" required>
      </div>
      <div class="field">
        <label>Divisão</label>
        <div class="divisao-selector">
          ${['A','B','C','D','E','F'].map(d => `
            <label class="divisao-opt">
              <input type="radio" name="divisao" value="${d}" ${data.divisao === d ? 'checked' : ''}>
              <span>${d}</span>
            </label>
          `).join('')}
        </div>
      </div>
      <div class="field">
        <label>Exercícios</label>
        <div id="exercicio-list">
          ${data.exercicios.map(renderExercicioInput).join('')}
        </div>
        <button type="button" class="btn btn-secondary mt-md" id="btn-add-ex">+ Exercício</button>
      </div>
      <button type="submit" class="btn btn-primary btn-full mt-lg">${isEdit ? 'Salvar alterações' : 'Criar plano'}</button>
    </form>
  `;

  const exList = container.querySelector('#exercicio-list');

  container.querySelector('#btn-back').onclick = () => renderHome(container);

  exList.addEventListener('click', e => {
    if (e.target.closest('.btn-rm-ex')) {
      e.target.closest('.exercicio-input').remove();
    }
  });

  container.querySelector('#btn-add-ex').onclick = () => {
    const tmp = document.createElement('div');
    tmp.innerHTML = renderExercicioInput({ nome: '', series: 4, reps: '8-12', tempoDescanso: 90 });
    exList.appendChild(tmp.firstElementChild);
    exList.lastElementChild.querySelector('.ex-nome')?.focus();
  };

  container.querySelector('#form-plano').onsubmit = e => {
    e.preventDefault();
    const nome = container.querySelector('#plano-nome').value.trim();
    const divisao = container.querySelector('input[name="divisao"]:checked')?.value || 'A';
    const exercicios = [...exList.querySelectorAll('.exercicio-input')].map(el => ({
      id: el.dataset.id || crypto.randomUUID(),
      nome: el.querySelector('.ex-nome').value.trim(),
      series: parseInt(el.querySelector('.ex-series').value) || 3,
      reps: el.querySelector('.ex-reps').value.trim() || '8-12',
      tempoDescanso: parseInt(el.querySelector('.ex-descanso').value) || 90,
    })).filter(ex => ex.nome);

    if (!nome) { showToast('Informe o nome do plano'); return; }
    if (exercicios.length === 0) { showToast('Adicione pelo menos um exercício'); return; }

    if (isEdit) {
      DB.updatePlano({ ...plano, nome, divisao, exercicios });
    } else {
      DB.addPlano({ nome, divisao, exercicios });
    }
    showToast(isEdit ? 'Plano atualizado!' : 'Plano criado!');
    renderHome(container);
  };
}

function renderExercicioInput(ex) {
  return `
    <div class="exercicio-input" data-id="${ex.id || ''}">
      <div class="ex-row">
        <input class="ex-nome" type="text" placeholder="Nome do exercício" value="${escapeHtml(ex.nome || '')}">
        <button type="button" class="btn-icon btn-rm-ex" title="Remover">✕</button>
      </div>
      <div class="ex-params">
        <label>Séries<input class="ex-series" type="number" min="1" max="20" value="${ex.series || 3}"></label>
        <label>Reps<input class="ex-reps" type="text" placeholder="8-12" value="${ex.reps || '8-12'}"></label>
        <label>Descanso (s)<input class="ex-descanso" type="number" min="0" max="600" step="15" value="${ex.tempoDescanso || 90}"></label>
      </div>
    </div>
  `;
}

function renderSessao(container, plano) {
  let sessao = DB.getTodaySessao(plano.id);
  if (!sessao) {
    sessao = DB.addSessao({
      planoId: plano.id,
      planoNome: plano.nome,
      planoDivisao: plano.divisao,
      data: today(),
      concluido: false,
      exercicios: plano.exercicios.map(ex => ({
        exercicioId: ex.id,
        nome: ex.nome,
        metaSeries: ex.series,
        metaReps: ex.reps,
        tempoDescanso: ex.tempoDescanso || 90,
      })),
    });
  }

  container.innerHTML = `
    <div class="view-header">
      <button class="btn-back" id="btn-back">←</button>
      <div style="flex:1;min-width:0">
        <h1>${escapeHtml(plano.nome)}</h1>
        <span class="divisao-badge">${plano.divisao}</span>
      </div>
      ${sessao.concluido ? `<span class="badge-done">✓ Feito</span>` : ''}
    </div>
    <div class="exercicio-sessao-list">
      ${sessao.exercicios.map(ex => `
        <div class="card exercicio-sessao-card">
          <div class="ex-sessao-header">
            <h3>${escapeHtml(ex.nome)}</h3>
            <span class="text-muted">${ex.metaSeries} séries · ${ex.metaReps} reps</span>
          </div>
        </div>
      `).join('')}
    </div>
    ${!sessao.concluido ? `
      <button class="btn btn-primary btn-full mt-lg" id="btn-concluir">Marcar como concluído 💪</button>
    ` : ''}
  `;

  container.querySelector('#btn-back').onclick = () => renderHome(container);

  if (!sessao.concluido) {
    container.querySelector('#btn-concluir').onclick = () => {
      sessao.concluido = true;
      DB.updateSessao(sessao);
      renderSessao(container, plano);
      showToast('Treino concluído! 💪');
    };
  }
}
