'use strict';

class LabApp {
  constructor() {
    this.areaFiles = {
      todas: 'laboratorios.json',
      'ciencias humanas': 'laboratorios_ciencias_humanas.json',
      'ciencias exatas e da terra': 'laboratorios_ciencias_exatas_e_da_terra.json',
      'ciencias biologicas': 'laboratorios_ciencias_biologicas.json',
      'ciencias da saude': 'laboratorios_ciencias_da_saude.json',
      'ciencias agrarias': 'laboratorios_ciencias_agrarias.json',
      'ciencias sociais aplicadas': 'laboratorios_ciencias_sociais_aplicadas.json'
    };
    this.allLabs = [];
    this.selectedArea = 'todas';
    this.locationFilter = '';
    // cache DOM
    this.searchBar = document.getElementById('search-bar');
    this.resultsList = document.getElementById('results');
    this.filterContainer = document.querySelector('.filters');
    this.erroDiv = this._createErroDiv();
    this.modal = this._createModal();
    // bind handlers
    this.searchBar.addEventListener('input', this._debounce(() => this.showResults()));
    this.filterContainer.addEventListener('click', e => {
      if (!e.target.matches('.filter-btn')) return;
      const area = e.target.dataset.area;
      this.selectedArea = area;
      this.loadArea(area);
    });
    this.resultsList.addEventListener('click', e => {
      if (e.target.matches('.show-more')) return this._showAll();
      if (e.target.matches('.detail-btn')) {
        const idx = e.target.dataset.idx;
        this.showDetails(this.currentSlice[idx]);
      }
    });
  }

  async init() {
    await this.loadAll();
    this.searchBar.focus();    // dá foco à barra de busca após carregar
  }

  async fetchData(file) {
    const res = await fetch(file);
    if (!res.ok) throw new Error(res.statusText);
    return res.json();
  }

  extractLabs(data) {
    if (Array.isArray(data)) return data;
    if (data.laboratorios) return data.laboratorios;
    let flat = [];
    Object.values(data).forEach(v => Array.isArray(v) && flat.push(...v));
    return flat.length ? flat : Object.values(data).filter(v => typeof v === 'object');
  }

  _createErroDiv() {
    const d = document.createElement('div');
    d.id = 'lab-erro';
    d.style.cssText = 'color:#b00;text-align:center;margin:10px 0';
    this.resultsList.before(d);
    return d;
  }

  _createModal() {
    // cria modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'lab-modal';
    modalOverlay.style.cssText = [
      'display:none',
      'position:fixed',
      'top:0;left:0',
      'width:100%;height:100%',
      'background:rgba(0,0,0,0.5)',
      'justify-content:center;align-items:center',
      'z-index:1000'
    ].join(';');
    const modalContent = document.createElement('div');
    modalContent.style.cssText = [
      'background:#fff',
      'padding:20px',
      'border-radius:8px',
      'max-width:80%;max-height:80%',
      'overflow:auto',
      'position:relative'
    ].join(';');
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = 'position:absolute;top:10px;right:10px;font-size:1.5rem;background:none;border:none;cursor:pointer;';
    closeBtn.addEventListener('click', () => modalOverlay.style.display = 'none');

    modalContent.appendChild(closeBtn);
    const detailsDiv = document.createElement('div');
    detailsDiv.id = 'lab-details';
    modalContent.appendChild(detailsDiv);
    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);

    // adiciona fechamento ao clicar fora do conteúdo
    modalOverlay.addEventListener('click', e => {
      if (e.target === modalOverlay) {
        modalOverlay.style.display = 'none';
        detailsDiv.innerHTML = '';
      }
    });

    return modalOverlay;
  }

  renderList(labs) {
    const MAX = 20;
    this.resultsList.innerHTML = '';
    this.currentSlice = labs.slice(0, MAX);
    if (!labs.length) return this.resultsList.innerHTML = '<li>Nenhum laboratório encontrado.</li>';
    this.currentSlice.forEach((lab, i) => {
      const li = document.createElement('li');

      // aplica imagem de background se disponível (prefixo para assets locais)
      const rawUrl = lab.imagem || lab.image || lab.foto;
      if (rawUrl) {
        const imgPath = /^https?:/.test(rawUrl)
          ? rawUrl
          : `assets/${rawUrl}`;        // remove "./src/", aponta para src/assets/

        li.style.backgroundImage = `url(${imgPath})`;
        li.style.backgroundSize = 'cover';
        li.style.backgroundPosition = 'center';
      }

      li.textContent = lab.nome || lab.name || JSON.stringify(lab);

      // botão de detalhes
      const btn = document.createElement('button');
      btn.textContent = 'Ver detalhes';
      btn.className = 'detail-btn';
      btn.dataset.idx = i;
      li.append(btn);
      this.resultsList.append(li);
    });
    if (labs.length > MAX) {
      const more = document.createElement('button');
      more.textContent = `Mostrar mais ${labs.length - MAX}`;
      more.className = 'show-more';
      this.resultsList.append(more);
    }
  }

  showDetails(lab) {
    const detailsDiv = document.getElementById('lab-details');
    detailsDiv.innerHTML = '';  // limpa antes de inserir
    // document.body.style.overflow = 'hidden';  // trava scroll no background

    Object.entries(lab).forEach(([key, value]) => {
      let displayValue;
      if (Array.isArray(value)) {
        displayValue = value.join(', ');
      } else if (value && typeof value === 'object') {
        displayValue = `<pre>${JSON.stringify(value, null, 2)}</pre>`;
      } else {
        displayValue = value ?? '—';
      }
      const p = document.createElement('p');
      p.innerHTML = `<strong>${key}:</strong> ${displayValue}`;
      detailsDiv.appendChild(p);
    });
    this.modal.style.display = 'flex'; // mostra modal por último
  }

  showResults() {
    const q = this._normalize(this.searchBar.value);
    const filtered = this.allLabs.filter(lab => {
      const text = this._normalize([
        lab.nome,
        ...(lab.area||[]),
        ...(lab.tags||[]),
        lab.localizacao,
        lab.responsavel
      ].filter(Boolean).join(' '));
      const okText = q.split(' ').every(w => text.includes(w));
      const okLoc = !this.locationFilter || (lab.localizacao && this._normalize(lab.localizacao).includes(this.locationFilter));
      return okText && okLoc;
    });
    this.renderList(filtered);
  }

  async loadArea(area) {
    this.erroDiv.textContent = '';
    try {
      const data = await this.fetchData(this.areaFiles[this._normalize(area)] || this.areaFiles.todas);
      this.allLabs = this.extractLabs(data);
      this.showResults();
    } catch {
      this.erroDiv.textContent = `Erro ao carregar área ${area}`;
    }
  }

  async loadAll() {
    try {
      const all = await Promise.all(
        Object.values(this.areaFiles).map(f => this.fetchData(f).then(this.extractLabs).catch(()=>[]))
      );
      this.allLabs = all.flat();
      this.showResults();
    } catch {
      this.erroDiv.textContent = 'Erro ao carregar todos os laboratórios';
    }
  }

  _normalize(str) {
    return str
      ? str.normalize('NFD')
           .replace(/[\u0300-\u036f]/g, '')
           .toLowerCase()
           .replace(/[^\w\s]/g, '')
           .replace(/\s+/g, ' ')
           .trim()
      : '';
  }
  _debounce(fn, ms = 250) {
    let t; return (...a) => { clearTimeout(t); t = setTimeout(()=>fn(...a),ms); };
  }
  _showAll() { this.renderList(this.allLabs); }
}

// inicialização única
document.addEventListener('DOMContentLoaded', () => new LabApp().init());