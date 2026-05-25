(() => {
  // js/router.js
  var views = {};
  function registerView(hash, mountFn) {
    views[hash] = mountFn;
  }
  function navigate(hash) {
    location.hash = hash;
  }
  function initRouter(container, navItems2) {
    function render3() {
      const hash = location.hash.slice(1) || "treinos";
      const mount5 = views[hash];
      if (!mount5) return;
      container.innerHTML = "";
      mount5(container);
      navItems2.forEach((el) => {
        el.classList.toggle("active", el.dataset.view === hash);
      });
    }
    window.addEventListener("hashchange", render3);
    render3();
  }

  // js/db.js
  var DB = {
    // --- Planos ---
    getPlanos() {
      return JSON.parse(localStorage.getItem("planos") || "[]");
    },
    savePlanos(v) {
      localStorage.setItem("planos", JSON.stringify(v));
    },
    addPlano(plano) {
      plano.id = crypto.randomUUID();
      const list = this.getPlanos();
      list.push(plano);
      this.savePlanos(list);
      return plano;
    },
    updatePlano(plano) {
      const list = this.getPlanos();
      const i = list.findIndex((p) => p.id === plano.id);
      if (i >= 0) list[i] = plano;
      this.savePlanos(list);
    },
    deletePlano(id) {
      this.savePlanos(this.getPlanos().filter((p) => p.id !== id));
    },
    // --- Sessões ---
    getSessoes() {
      return JSON.parse(localStorage.getItem("sessoes") || "[]");
    },
    saveSessoes(v) {
      localStorage.setItem("sessoes", JSON.stringify(v));
    },
    addSessao(sessao) {
      sessao.id = crypto.randomUUID();
      const list = this.getSessoes();
      list.push(sessao);
      this.saveSessoes(list);
      return sessao;
    },
    updateSessao(sessao) {
      const list = this.getSessoes();
      const i = list.findIndex((s) => s.id === sessao.id);
      if (i >= 0) list[i] = sessao;
      this.saveSessoes(list);
    },
    getTodaySessao(planoId) {
      const t = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
      return this.getSessoes().find((s) => s.planoId === planoId && s.data === t);
    },
    // --- PRs ---
    getPRs() {
      return JSON.parse(localStorage.getItem("prs") || "{}");
    },
    savePRs(v) {
      localStorage.setItem("prs", JSON.stringify(v));
    },
    checkAndUpdatePR(nome, carga) {
      if (!carga || carga <= 0) return false;
      const prs = this.getPRs();
      const key = nome.toLowerCase().trim();
      if (!prs[key] || carga > prs[key].carga) {
        prs[key] = { carga, data: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10) };
        this.savePRs(prs);
        return true;
      }
      return false;
    },
    getPR(nome) {
      return this.getPRs()[nome.toLowerCase().trim()] || null;
    },
    // --- Água ---
    getAguaAll() {
      return JSON.parse(localStorage.getItem("agua") || "{}");
    },
    getAgua(data) {
      return this.getAguaAll()[data] || { ml: 0 };
    },
    addAgua(data, ml) {
      const all = this.getAguaAll();
      if (!all[data]) all[data] = { ml: 0 };
      all[data].ml = Math.max(0, all[data].ml + ml);
      localStorage.setItem("agua", JSON.stringify(all));
      return all[data];
    },
    setAgua(data, ml) {
      const all = this.getAguaAll();
      all[data] = { ml: Math.max(0, ml) };
      localStorage.setItem("agua", JSON.stringify(all));
    },
    // --- Peso ---
    getPesos() {
      return JSON.parse(localStorage.getItem("pesos") || "[]");
    },
    addPeso(data, kg) {
      const list = this.getPesos();
      const i = list.findIndex((p) => p.data === data);
      if (i >= 0) list[i].kg = kg;
      else list.push({ data, kg });
      list.sort((a, b) => a.data.localeCompare(b.data));
      localStorage.setItem("pesos", JSON.stringify(list));
    },
    // --- Config ---
    getConfig() {
      return JSON.parse(localStorage.getItem("config") || '{"metaAgua":2000}');
    },
    setConfig(v) {
      localStorage.setItem("config", JSON.stringify(v));
    }
  };
  var db_default = DB;

  // js/components/timer.js
  var timerId = null;
  var overlay = null;
  function startTimer(seconds) {
    if (overlay) {
      clearInterval(timerId);
      overlay.remove();
    }
    overlay = document.createElement("div");
    overlay.className = "timer-overlay";
    overlay.innerHTML = `
    <div class="timer-box">
      <p class="timer-label">Descanso</p>
      <p class="timer-count" id="timer-count">${seconds}s</p>
      <button class="btn btn-secondary" id="timer-skip">Pular</button>
    </div>
  `;
    document.body.appendChild(overlay);
    let remaining = seconds;
    const countEl = overlay.querySelector("#timer-count");
    timerId = setInterval(() => {
      remaining--;
      countEl.textContent = `${remaining}s`;
      if (remaining <= 0) {
        clearInterval(timerId);
        timerId = null;
        if (navigator.vibrate) navigator.vibrate([300, 100, 300]);
        overlay?.remove();
        overlay = null;
      }
    }, 1e3);
    overlay.querySelector("#timer-skip").onclick = () => {
      clearInterval(timerId);
      timerId = null;
      overlay.remove();
      overlay = null;
    };
  }

  // js/utils.js
  function showToast(message, duration = 3e3) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), duration);
  }
  function today() {
    return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  }
  function formatDate(iso) {
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  }
  function escapeHtml(str) {
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  // js/views/treinos.js
  function mount(container) {
    renderHome(container);
  }
  function renderHome(container) {
    const planos = db_default.getPlanos();
    const t = today();
    const sessoesHoje = db_default.getSessoes().filter((s) => s.data === t);
    container.innerHTML = `
    <div class="view-header">
      <h1>Treinos</h1>
      <button class="btn btn-primary" id="btn-novo-plano">+ Novo</button>
    </div>
    ${planos.length === 0 ? `
      <div class="empty-state">
        <p class="empty-icon">\u{1F3CB}\uFE0F</p>
        <p>Nenhum plano ainda.</p>
        <p class="text-muted">Crie seu primeiro treino!</p>
      </div>
    ` : ""}
    <div class="plano-list">
      ${planos.map((p) => {
      const sessaoHoje = sessoesHoje.find((s) => s.planoId === p.id);
      const btnLabel = sessaoHoje?.concluido ? "Ver" : sessaoHoje ? "Continuar" : "Iniciar";
      return `
          <div class="card plano-card">
            <div class="plano-info">
              <div class="plano-info-top">
                <span class="divisao-badge">${p.divisao}</span>
                ${sessaoHoje?.concluido ? '<span class="badge-done">\u2713 Feito hoje</span>' : sessaoHoje ? '<span class="badge-progress">\u25CF Em andamento</span>' : ""}
              </div>
              <h3>${escapeHtml(p.nome)}</h3>
              <p class="text-muted">${p.exercicios.length} exerc\xEDcio${p.exercicios.length !== 1 ? "s" : ""}</p>
            </div>
            <div class="plano-actions">
              <button class="btn btn-primary btn-iniciar" data-id="${p.id}">${btnLabel}</button>
              <button class="btn-icon btn-deletar" data-id="${p.id}" title="Deletar">\u2715</button>
            </div>
          </div>
        `;
    }).join("")}
    </div>
    ${renderHistorico()}
  `;
    container.querySelector("#btn-novo-plano").onclick = () => renderFormPlano(container);
    container.querySelectorAll(".btn-iniciar").forEach((btn) => {
      btn.onclick = () => {
        const plano = db_default.getPlanos().find((p) => p.id === btn.dataset.id);
        if (plano) renderSessao(container, plano);
      };
    });
    container.querySelectorAll(".btn-deletar").forEach((btn) => {
      btn.onclick = () => {
        if (confirm("Deletar este plano? O hist\xF3rico de sess\xF5es \xE9 mantido.")) {
          db_default.deletePlano(btn.dataset.id);
          renderHome(container);
        }
      };
    });
  }
  function renderHistorico() {
    const sessoes = db_default.getSessoes().filter((s) => s.concluido).sort((a, b) => b.data.localeCompare(a.data)).slice(0, 5);
    if (sessoes.length === 0) return "";
    return `
    <div class="historico mt-lg">
      <h3>\xDAltimos treinos</h3>
      ${sessoes.map((s) => `
        <div class="historico-row">
          <span class="text-muted">${formatDate(s.data)}</span>
          <span><span class="divisao-badge">${s.planoDivisao}</span> ${escapeHtml(s.planoNome)}</span>
        </div>
      `).join("")}
    </div>
  `;
  }
  function renderFormPlano(container, plano = null) {
    const isEdit = !!plano;
    const data = plano || { nome: "", divisao: "A", exercicios: [] };
    container.innerHTML = `
    <div class="view-header">
      <button class="btn-back" id="btn-back">\u2190</button>
      <h1>${isEdit ? "Editar plano" : "Novo plano"}</h1>
    </div>
    <form id="form-plano" class="form-stack">
      <div class="field">
        <label>Nome do plano</label>
        <input type="text" id="plano-nome" value="${escapeHtml(data.nome)}" placeholder="Ex: Peito e Tr\xEDceps" required>
      </div>
      <div class="field">
        <label>Divis\xE3o</label>
        <div class="divisao-selector">
          ${["A", "B", "C", "D", "E", "F"].map((d) => `
            <label class="divisao-opt">
              <input type="radio" name="divisao" value="${d}" ${data.divisao === d ? "checked" : ""}>
              <span>${d}</span>
            </label>
          `).join("")}
        </div>
      </div>
      <div class="field">
        <label>Exerc\xEDcios</label>
        <div id="exercicio-list">
          ${data.exercicios.map(renderExercicioInput).join("")}
        </div>
        <button type="button" class="btn btn-secondary mt-md" id="btn-add-ex">+ Exerc\xEDcio</button>
      </div>
      <button type="submit" class="btn btn-primary btn-full mt-lg">${isEdit ? "Salvar altera\xE7\xF5es" : "Criar plano"}</button>
    </form>
  `;
    const exList = container.querySelector("#exercicio-list");
    container.querySelector("#btn-back").onclick = () => renderHome(container);
    exList.addEventListener("click", (e) => {
      if (e.target.closest(".btn-rm-ex")) {
        e.target.closest(".exercicio-input").remove();
      }
    });
    container.querySelector("#btn-add-ex").onclick = () => {
      const tmp = document.createElement("div");
      tmp.innerHTML = renderExercicioInput({ nome: "", series: 4, reps: "8-12", tempoDescanso: 90 });
      exList.appendChild(tmp.firstElementChild);
      exList.lastElementChild.querySelector(".ex-nome")?.focus();
    };
    container.querySelector("#form-plano").onsubmit = (e) => {
      e.preventDefault();
      const nome = container.querySelector("#plano-nome").value.trim();
      const divisao = container.querySelector('input[name="divisao"]:checked')?.value || "A";
      const exercicios = [...exList.querySelectorAll(".exercicio-input")].map((el) => ({
        id: el.dataset.id || crypto.randomUUID(),
        nome: el.querySelector(".ex-nome").value.trim(),
        series: parseInt(el.querySelector(".ex-series").value) || 3,
        reps: el.querySelector(".ex-reps").value.trim() || "8-12",
        tempoDescanso: parseInt(el.querySelector(".ex-descanso").value) || 90
      })).filter((ex) => ex.nome);
      if (!nome) {
        showToast("Informe o nome do plano");
        return;
      }
      if (exercicios.length === 0) {
        showToast("Adicione pelo menos um exerc\xEDcio");
        return;
      }
      if (isEdit) {
        db_default.updatePlano({ ...plano, nome, divisao, exercicios });
      } else {
        db_default.addPlano({ nome, divisao, exercicios });
      }
      showToast(isEdit ? "Plano atualizado!" : "Plano criado!");
      renderHome(container);
    };
  }
  function renderExercicioInput(ex) {
    return `
    <div class="exercicio-input" data-id="${ex.id || ""}">
      <div class="ex-row">
        <input class="ex-nome" type="text" placeholder="Nome do exerc\xEDcio" value="${escapeHtml(ex.nome || "")}">
        <button type="button" class="btn-icon btn-rm-ex" title="Remover">\u2715</button>
      </div>
      <div class="ex-params">
        <label>S\xE9ries<input class="ex-series" type="number" min="1" max="20" value="${ex.series || 3}"></label>
        <label>Reps<input class="ex-reps" type="text" placeholder="8-12" value="${ex.reps || "8-12"}"></label>
        <label>Descanso (s)<input class="ex-descanso" type="number" min="0" max="600" step="15" value="${ex.tempoDescanso || 90}"></label>
      </div>
    </div>
  `;
  }
  function renderSessao(container, plano) {
    let sessao = db_default.getTodaySessao(plano.id);
    if (!sessao) {
      sessao = db_default.addSessao({
        planoId: plano.id,
        planoNome: plano.nome,
        planoDivisao: plano.divisao,
        data: today(),
        concluido: false,
        exercicios: plano.exercicios.map((ex) => ({
          exercicioId: ex.id,
          nome: ex.nome,
          tempoDescanso: ex.tempoDescanso || 90,
          series: [],
          metaSeries: ex.series,
          metaReps: ex.reps
        }))
      });
    }
    renderSessaoUI(container, plano, sessao);
  }
  function renderSessaoUI(container, plano, sessao) {
    const totalSeries = sessao.exercicios.reduce((acc, ex) => acc + ex.metaSeries, 0);
    const seriesFeitas = sessao.exercicios.reduce((acc, ex) => acc + ex.series.length, 0);
    container.innerHTML = `
    <div class="view-header">
      <button class="btn-back" id="btn-back">\u2190</button>
      <div style="flex:1;min-width:0">
        <h1>${escapeHtml(plano.nome)}</h1>
        <span class="divisao-badge">${plano.divisao}</span>
      </div>
      ${sessao.concluido ? `<span class="badge-done">\u2713 Feito</span>` : `<span class="sessao-progress">${seriesFeitas}/${totalSeries}</span>`}
    </div>
    <div class="exercicio-sessao-list">
      ${sessao.exercicios.map((ex, ei) => buildExercicioSessaoHTML(ex, ei, sessao.concluido)).join("")}
    </div>
    ${!sessao.concluido ? `
      <button class="btn btn-primary btn-full mt-lg" id="btn-concluir">Marcar como conclu\xEDdo \u{1F4AA}</button>
    ` : ""}
  `;
    container.querySelector("#btn-back").onclick = () => renderHome(container);
    if (!sessao.concluido) {
      container.querySelector("#btn-concluir").onclick = () => {
        sessao.concluido = true;
        db_default.updateSessao(sessao);
        renderSessaoUI(container, plano, sessao);
        showToast("Treino conclu\xEDdo! \u{1F4AA}");
      };
      container.querySelectorAll(".btn-add-serie").forEach((btn) => {
        btn.onclick = () => {
          const ei = parseInt(btn.dataset.ei);
          const ex = sessao.exercicios[ei];
          const reps = parseInt(container.querySelector(`#reps-${ei}`).value) || 0;
          const carga = parseFloat(container.querySelector(`#carga-${ei}`).value) || 0;
          if (reps <= 0) {
            showToast("Informe as repeti\xE7\xF5es");
            return;
          }
          const isPR = db_default.checkAndUpdatePR(ex.nome, carga);
          ex.series.push({ reps, carga, pr: isPR });
          db_default.updateSessao(sessao);
          if (isPR && carga > 0) showToast(`\u{1F3C6} Novo PR em ${ex.nome}: ${carga}kg!`);
          if (ex.tempoDescanso > 0) startTimer(ex.tempoDescanso);
          renderSessaoUI(container, plano, sessao);
        };
      });
    }
  }
  function buildExercicioSessaoHTML(ex, ei, readonly) {
    const suggested = getSuggestedLoad(ex.nome, ex.metaSeries);
    const done = ex.series.length >= ex.metaSeries;
    return `
    <div class="card exercicio-sessao-card ${done ? "ex-done" : ""}">
      <div class="ex-sessao-header">
        <h3>${escapeHtml(ex.nome)}</h3>
        <span class="text-muted">${ex.series.length}/${ex.metaSeries} \xB7 ${ex.metaReps} reps</span>
      </div>
      ${ex.series.length > 0 ? `
        <div class="series-list">
          ${ex.series.map((s, si) => `
            <div class="serie-row ${s.pr ? "serie-pr" : ""}">
              <span class="serie-num">${si + 1}</span>
              <span>${s.reps} reps</span>
              <span>${s.carga > 0 ? s.carga + "kg" : "\u2014"}</span>
              ${s.pr ? `<span class="pr-badge">PR \u{1F3C6}</span>` : ""}
            </div>
          `).join("")}
        </div>
      ` : ""}
      ${!readonly && !done ? `
        <div class="add-serie-form">
          ${suggested !== null ? `<p class="sugestao">\u{1F4A1} Sugest\xE3o: ${suggested}kg</p>` : ""}
          <div class="add-serie-inputs">
            <input id="reps-${ei}" type="number" min="1" max="100" placeholder="Reps" inputmode="numeric">
            <input id="carga-${ei}" type="number" min="0" max="999" step="0.5" placeholder="Carga (kg)" value="${suggested !== null ? suggested : ""}" inputmode="decimal">
            <button class="btn btn-primary btn-add-serie" data-ei="${ei}">+ S\xE9rie</button>
          </div>
        </div>
      ` : ""}
    </div>
  `;
  }
  function getSuggestedLoad(exercicioNome, metaSeries) {
    const sessoes = db_default.getSessoes().filter((s) => s.concluido).sort((a, b) => b.data.localeCompare(a.data));
    for (const s of sessoes) {
      const ex = s.exercicios?.find((e) => e.nome === exercicioNome);
      if (!ex || ex.series.length === 0) continue;
      const maxCarga = Math.max(...ex.series.map((s2) => s2.carga));
      return ex.series.length >= (ex.metaSeries || metaSeries) ? maxCarga + 2.5 : maxCarga;
    }
    return null;
  }

  // js/views/progresso.js
  function mount2(container) {
    const sessoes = db_default.getSessoes().filter((s) => s.concluido);
    const streak = calcStreak(sessoes);
    const exercicios = getUniqueExercicios(sessoes);
    container.innerHTML = `
    <div class="view-header">
      <h1>Progresso</h1>
    </div>
    <div class="streak-card card">
      <span class="streak-num">${streak}</span>
      <span class="streak-label">dia${streak !== 1 ? "s" : ""} seguido${streak !== 1 ? "s" : ""} \u{1F525}</span>
    </div>
    <div class="mt-md">
      ${renderSemanaCompare(sessoes)}
    </div>
    <div class="field mt-lg">
      <label>Evolu\xE7\xE3o por exerc\xEDcio</label>
      <select id="ex-select">
        <option value="">Selecione um exerc\xEDcio...</option>
        ${exercicios.map((e) => `<option value="${e}">${e}</option>`).join("")}
      </select>
    </div>
    <div id="chart-container" class="mt-md"></div>
  `;
    container.querySelector("#ex-select").onchange = (e) => {
      const nome = e.target.value;
      const chartEl = container.querySelector("#chart-container");
      if (!nome) {
        chartEl.innerHTML = "";
        return;
      }
      const data = getExercicioData(sessoes, nome);
      chartEl.innerHTML = renderLineChart(data, nome, "var(--indigo)");
    };
  }
  function calcStreak(sessoes) {
    if (!sessoes.length) return 0;
    const datas = [...new Set(sessoes.map((s) => s.data))].sort().reverse();
    const t = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    let streak = 0;
    let cur = new Date(t);
    for (const data of datas) {
      const d = new Date(data);
      const diff = Math.round((cur - d) / 864e5);
      if (diff <= 1) {
        streak++;
        cur = d;
      } else break;
    }
    return streak;
  }
  function getUniqueExercicios(sessoes) {
    const set = /* @__PURE__ */ new Set();
    sessoes.forEach((s) => s.exercicios?.forEach((e) => set.add(e.nome)));
    return [...set].sort();
  }
  function getExercicioData(sessoes, nome) {
    return sessoes.filter((s) => s.exercicios?.some((e) => e.nome === nome)).map((s) => {
      const ex = s.exercicios.find((e) => e.nome === nome);
      const maxCarga = ex.series.length ? Math.max(...ex.series.map((s2) => s2.carga)) : 0;
      return { data: s.data, carga: maxCarga };
    }).sort((a, b) => a.data.localeCompare(b.data));
  }
  function renderSemanaCompare(sessoes) {
    const t = /* @__PURE__ */ new Date();
    const startOfWeek = new Date(t);
    startOfWeek.setDate(t.getDate() - t.getDay());
    const startOfLastWeek = new Date(startOfWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
    const fmt = (d) => d.toISOString().slice(0, 10);
    const thisWeek = sessoes.filter((s) => s.data >= fmt(startOfWeek)).length;
    const lastWeek = sessoes.filter((s) => s.data >= fmt(startOfLastWeek) && s.data < fmt(startOfWeek)).length;
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
        <span class="semana-num ${diff > 0 ? "text-success" : diff < 0 ? "text-danger" : ""}">${diff > 0 ? "+" : ""}${diff}</span>
        <span class="semana-label">Diferen\xE7a</span>
      </div>
    </div>
  `;
  }
  function renderLineChart(data, label, color = "var(--indigo)") {
    if (data.length === 0) return '<p class="text-muted text-center mt-md">Sem dados ainda.</p>';
    const W = 300, H = 150, PAD = 36;
    const values = data.map((d) => d.carga);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const xs = data.map((_, i) => PAD + i / Math.max(data.length - 1, 1) * (W - PAD * 2));
    const ys = data.map((d) => PAD + (1 - (d.carga - min) / range) * (H - PAD * 2));
    const polyline = xs.map((x, i) => `${x},${ys[i]}`).join(" ");
    const dots = xs.map((x, i) => `
    <circle cx="${x}" cy="${ys[i]}" r="4" fill="${color}">
      <title>${data[i].data}: ${data[i].carga}kg</title>
    </circle>
  `).join("");
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

  // js/views/hidratacao.js
  function mount3(container) {
    render(container);
  }
  function render(container) {
    const t = today();
    const config = db_default.getConfig();
    const meta = config.metaAgua || 2e3;
    const ml = db_default.getAgua(t).ml;
    const pct = Math.min(ml / meta, 1);
    const circunf = 2 * Math.PI * 52;
    const historico = Array.from({ length: 7 }, (_, i) => {
      const d = /* @__PURE__ */ new Date();
      d.setDate(d.getDate() - (6 - i));
      const data = d.toISOString().slice(0, 10);
      return { data, ml: db_default.getAgua(data).ml, label: `${d.getDate()}/${d.getMonth() + 1}` };
    });
    container.innerHTML = `
    <div class="view-header">
      <h1>Hidrata\xE7\xE3o</h1>
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
    ${ml >= meta ? `<p class="text-center text-success mt-md font-bold">Meta atingida! \u{1F389}</p>` : `<p class="text-center text-muted mt-md">${meta - ml}ml para a meta</p>`}
    <div class="agua-buttons mt-lg">
      ${[150, 200, 300, 500].map((v) => `
        <button class="btn btn-secondary btn-agua" data-ml="${v}">+${v}ml</button>
      `).join("")}
    </div>
    <div class="field mt-md">
      <label>Personalizado</label>
      <div class="add-serie-inputs">
        <input id="agua-custom" type="number" min="50" step="50" placeholder="ml" inputmode="numeric">
        <button class="btn btn-primary" id="btn-agua-custom">Adicionar</button>
        <button class="btn btn-secondary" id="btn-agua-reset" title="Zerar hoje">\u{1F504}</button>
      </div>
    </div>
    <div class="field mt-md">
      <label>Meta di\xE1ria</label>
      <div class="add-serie-inputs">
        <input id="agua-meta-input" type="number" min="500" step="100" value="${meta}" inputmode="numeric">
        <span class="text-muted" style="white-space:nowrap;font-size:.8rem">ml/dia</span>
        <button class="btn btn-secondary" id="btn-set-meta">Salvar</button>
      </div>
    </div>
    <div class="historico mt-lg">
      <h3>\xDAltimos 7 dias</h3>
      <div class="agua-historico-bars">
        ${historico.map((d) => {
      const p = Math.min(d.ml / meta, 1);
      const atingiu = d.ml >= meta;
      return `
            <div class="agua-bar-col">
              <div class="agua-bar-wrap">
                <div class="agua-bar-fill ${atingiu ? "agua-bar-full" : ""}" style="height:${Math.max(p * 100, 2)}%"></div>
              </div>
              <span class="agua-bar-label">${d.label}</span>
            </div>
          `;
    }).join("")}
      </div>
    </div>
  `;
    container.querySelectorAll(".btn-agua").forEach((btn) => {
      btn.onclick = () => {
        db_default.addAgua(t, parseInt(btn.dataset.ml));
        render(container);
      };
    });
    container.querySelector("#btn-agua-custom").onclick = () => {
      const v = parseInt(container.querySelector("#agua-custom").value);
      if (!v || v <= 0) {
        showToast("Valor inv\xE1lido");
        return;
      }
      db_default.addAgua(t, v);
      render(container);
    };
    container.querySelector("#btn-agua-reset").onclick = () => {
      if (confirm("Zerar registro de hoje?")) {
        db_default.setAgua(t, 0);
        render(container);
      }
    };
    container.querySelector("#btn-set-meta").onclick = () => {
      const v = parseInt(container.querySelector("#agua-meta-input").value);
      if (!v || v < 100) {
        showToast("Meta inv\xE1lida");
        return;
      }
      db_default.setConfig({ ...config, metaAgua: v });
      showToast("Meta atualizada!");
      render(container);
    };
  }

  // js/views/peso.js
  function mount4(container) {
    const state = { display: "", month: /* @__PURE__ */ new Date() };
    render2(container, state);
  }
  function render2(container, state) {
    const t = today();
    const pesos = db_default.getPesos();
    const todayPeso = pesos.find((p) => p.data === t);
    const weekAvg = calcWeekAvg(pesos, 0);
    const prevWeekAvg = calcWeekAvg(pesos, -1);
    const diff = weekAvg && prevWeekAvg ? +(weekAvg - prevWeekAvg).toFixed(1) : null;
    const displayValue = state.display || (todayPeso ? String(todayPeso.kg) : "");
    container.innerHTML = `
    <div class="view-header">
      <h1>Peso corporal</h1>
    </div>

    <div class="numpad-wrap">
      <div class="numpad-display">
        <span class="numpad-value">${displayValue || "\u2014"}</span>
        <span class="numpad-unit">kg</span>
      </div>
      ${todayPeso && !state.display ? `<p class="numpad-hint">Registrado hoje \xB7 toque para editar</p>` : ""}
      <div class="numpad-grid">
        ${[7, 8, 9, 4, 5, 6, 1, 2, 3].map((n) => `
          <button class="numpad-btn" data-num="${n}">${n}</button>
        `).join("")}
        <button class="numpad-btn" data-num=".">.</button>
        <button class="numpad-btn" data-num="0">0</button>
        <button class="numpad-btn numpad-del" data-action="del">\u232B</button>
        <button class="numpad-btn numpad-confirm" data-action="confirm">Salvar</button>
      </div>
    </div>

    <div class="semana-cards mt-lg">
      <div class="card semana-card">
        <span class="semana-num">${weekAvg !== null ? weekAvg + " kg" : "\u2014"}</span>
        <span class="semana-label">M\xE9dia esta semana</span>
      </div>
      <div class="card semana-card">
        <span class="semana-num ${diff !== null ? diff > 0 ? "text-danger" : diff < 0 ? "text-success" : "" : ""}">
          ${diff !== null ? (diff > 0 ? "+" : "") + diff + " kg" : "\u2014"}
        </span>
        <span class="semana-label">vs semana anterior</span>
      </div>
    </div>

    <div class="peso-calendar mt-lg">
      <div class="cal-header">
        <button class="cal-nav btn-icon" data-dir="-1">\u2039</button>
        <h3>${formatMonth(state.month)}</h3>
        <button class="cal-nav btn-icon" data-dir="1">\u203A</button>
      </div>
      ${renderCalendar(state.month, pesos, t)}
    </div>
  `;
    container.querySelectorAll(".numpad-btn[data-num]").forEach((btn) => {
      btn.onclick = () => {
        const n = btn.dataset.num;
        if (n === "." && state.display.includes(".")) return;
        if (n === "." && state.display === "") {
          state.display = "0";
        }
        const parts = state.display.split(".");
        if (parts[1] !== void 0 && parts[1].length >= 1) return;
        if (parts[0].length >= 3 && n !== ".") return;
        state.display += n;
        render2(container, state);
      };
    });
    container.querySelector('[data-action="del"]').onclick = () => {
      state.display = state.display.slice(0, -1);
      render2(container, state);
    };
    container.querySelector('[data-action="confirm"]').onclick = () => {
      const v = parseFloat(state.display);
      if (!v || v < 20 || v > 400) {
        showToast("Peso inv\xE1lido");
        return;
      }
      db_default.addPeso(t, v);
      state.display = "";
      showToast("Peso salvo!");
      render2(container, state);
    };
    container.querySelectorAll(".cal-nav").forEach((btn) => {
      btn.onclick = () => {
        const m = state.month;
        state.month = new Date(m.getFullYear(), m.getMonth() + parseInt(btn.dataset.dir), 1);
        render2(container, state);
      };
    });
  }
  function renderCalendar(month, pesos, todayStr) {
    const year = month.getFullYear();
    const m = month.getMonth();
    const firstDay = new Date(year, m, 1).getDay();
    const daysInMonth = new Date(year, m + 1, 0).getDate();
    const pesoMap = {};
    pesos.forEach((p) => {
      pesoMap[p.data] = p.kg;
    });
    const weekdays = ["D", "S", "T", "Q", "Q", "S", "S"];
    const emptyCells = Array.from({ length: firstDay }, () => `<div class="cal-cell cal-empty"></div>`).join("");
    const dayCells = Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1;
      const dateStr = `${year}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const peso = pesoMap[dateStr];
      const isToday = dateStr === todayStr;
      return `
      <div class="cal-cell ${isToday ? "cal-today" : ""} ${peso ? "cal-has-peso" : ""}">
        <span class="cal-day-num">${d}</span>
        ${peso ? `<span class="cal-peso-val">${peso}</span>` : ""}
      </div>
    `;
    }).join("");
    return `
    <div class="cal-grid">
      ${weekdays.map((d) => `<div class="cal-weekday">${d}</div>`).join("")}
      ${emptyCells}
      ${dayCells}
    </div>
  `;
  }
  function calcWeekAvg(pesos, weekOffset = 0) {
    const t = /* @__PURE__ */ new Date();
    const startOfThisWeek = new Date(t);
    startOfThisWeek.setDate(t.getDate() - t.getDay());
    startOfThisWeek.setHours(0, 0, 0, 0);
    const start = new Date(startOfThisWeek);
    start.setDate(start.getDate() + weekOffset * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const startStr = start.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);
    const week = pesos.filter((p) => p.data >= startStr && p.data < endStr);
    if (!week.length) return null;
    return +(week.reduce((s, p) => s + p.kg, 0) / week.length).toFixed(1);
  }
  function formatMonth(date) {
    return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  }

  // js/app.js
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
      });
    });
  }
  window.addEventListener("online", () => document.body.classList.remove("offline"));
  window.addEventListener("offline", () => document.body.classList.add("offline"));
  if (!navigator.onLine) document.body.classList.add("offline");
  registerView("treinos", mount);
  registerView("progresso", mount2);
  registerView("hidratacao", mount3);
  registerView("peso", mount4);
  var main = document.querySelector(".app-main");
  var navItems = document.querySelectorAll(".nav-item");
  navItems.forEach((item) => {
    item.addEventListener("click", () => navigate(item.dataset.view));
  });
  initRouter(main, navItems);
})();
