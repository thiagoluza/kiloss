import { today } from './utils.js';

const DB = {
  // --- Planos ---
  getPlanos() { return JSON.parse(localStorage.getItem('planos') || '[]'); },
  savePlanos(v) { localStorage.setItem('planos', JSON.stringify(v)); },
  addPlano(plano) {
    plano.id = crypto.randomUUID();
    const list = this.getPlanos();
    list.push(plano);
    this.savePlanos(list);
    return plano;
  },
  updatePlano(plano) {
    const list = this.getPlanos();
    const i = list.findIndex(p => p.id === plano.id);
    if (i >= 0) list[i] = plano;
    this.savePlanos(list);
  },
  deletePlano(id) {
    this.savePlanos(this.getPlanos().filter(p => p.id !== id));
  },

  // --- Sessões ---
  getSessoes() { return JSON.parse(localStorage.getItem('sessoes') || '[]'); },
  saveSessoes(v) { localStorage.setItem('sessoes', JSON.stringify(v)); },
  addSessao(sessao) {
    sessao.id = crypto.randomUUID();
    const list = this.getSessoes();
    list.push(sessao);
    this.saveSessoes(list);
    return sessao;
  },
  updateSessao(sessao) {
    const list = this.getSessoes();
    const i = list.findIndex(s => s.id === sessao.id);
    if (i >= 0) list[i] = sessao;
    this.saveSessoes(list);
  },
  getTodaySessao(planoId) {
    const t = today();
    return this.getSessoes().find(s => s.planoId === planoId && s.data === t);
  },

  // --- PRs ---
  getPRs() { return JSON.parse(localStorage.getItem('prs') || '{}'); },
  savePRs(v) { localStorage.setItem('prs', JSON.stringify(v)); },
  checkAndUpdatePR(nome, carga) {
    if (!carga || carga <= 0) return false;
    const prs = this.getPRs();
    const key = nome.toLowerCase().trim();
    if (!prs[key] || carga > prs[key].carga) {
      prs[key] = { carga, data: today() };
      this.savePRs(prs);
      return true;
    }
    return false;
  },
  getPR(nome) {
    return this.getPRs()[nome.toLowerCase().trim()] || null;
  },

  // --- Água ---
  getAguaAll() { return JSON.parse(localStorage.getItem('agua') || '{}'); },
  getAgua(data) { return (this.getAguaAll()[data] || { ml: 0 }); },
  addAgua(data, ml) {
    const all = this.getAguaAll();
    if (!all[data]) all[data] = { ml: 0 };
    all[data].ml = Math.max(0, all[data].ml + ml);
    localStorage.setItem('agua', JSON.stringify(all));
    return all[data];
  },
  setAgua(data, ml) {
    const all = this.getAguaAll();
    all[data] = { ml: Math.max(0, ml) };
    localStorage.setItem('agua', JSON.stringify(all));
  },

  // --- Peso ---
  getPesos() { return JSON.parse(localStorage.getItem('pesos') || '[]'); },
  addPeso(data, kg) {
    const list = this.getPesos();
    const i = list.findIndex(p => p.data === data);
    if (i >= 0) list[i].kg = kg;
    else list.push({ data, kg });
    list.sort((a, b) => a.data.localeCompare(b.data));
    localStorage.setItem('pesos', JSON.stringify(list));
  },
  deletePeso(data) {
    const list = this.getPesos().filter(p => p.data !== data);
    localStorage.setItem('pesos', JSON.stringify(list));
  },

  // --- Catálogo de exercícios ---
  getExercicios() { return JSON.parse(localStorage.getItem('ex_catalog') || '[]'); },
  addExercicio(ex) {
    ex.id = crypto.randomUUID();
    const list = this.getExercicios();
    list.push(ex);
    localStorage.setItem('ex_catalog', JSON.stringify(list));
    return ex;
  },
  updateExercicio(ex) {
    const list = this.getExercicios();
    const i = list.findIndex(e => e.id === ex.id);
    if (i >= 0) list[i] = ex;
    localStorage.setItem('ex_catalog', JSON.stringify(list));
  },
  deleteExercicio(id) {
    const list = this.getExercicios().filter(e => e.id !== id);
    localStorage.setItem('ex_catalog', JSON.stringify(list));
  },

  // --- Config ---
  getConfig() { return JSON.parse(localStorage.getItem('config') || '{"metaAgua":2000}'); },
  setConfig(v) { localStorage.setItem('config', JSON.stringify(v)); },
};

export default DB;
