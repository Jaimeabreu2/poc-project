'use strict';

// mapeia nomes de campo para labels mais legíveis
const FIELD_LABELS = {
  nome: 'Nome',
  descricao: 'Descrição',
  responsavel: 'Responsável',
  lattes: 'Currículo Lattes',
  email: 'E-mail',
  telefone: 'Telefone',
  site: 'Site',
  localizacao: 'Localização',
  area: 'Área de Conhecimento',
  natureza: 'Natureza',
  vinculado: 'Vinculado',
  horario: 'Horário de Funcionamento',
  parcerias: 'Parcerias',
  equipe: 'Equipe',
  infraestrutura: 'Infraestrutura',
  tags: 'Tags'
};

const NATURE_KEYS = ['misto','pesquisa','ensino','extensao'];
const NATURE_LABELS = {
  misto:    'Misto',
  pesquisa: 'Pesquisa',
  ensino:   'Ensino',
  extensao: 'Extensão'
};

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
    this.currentOffset = 0;
    // cache DOM
    this.searchBar = document.getElementById('search-bar');
    this.resultsList = document.getElementById('results');
    this.filterContainer = document.querySelector('.filters');
    // garante existência do container de filtros por natureza
    this.natureFilterContainer = document.querySelector('.filters-nature');
    if (!this.natureFilterContainer) {
      this.natureFilterContainer = document.createElement('div');
      this.natureFilterContainer.className = 'filters-nature';
      this.filterContainer.insertAdjacentElement('afterend', this.natureFilterContainer);
    }
    this.erroDiv = this._createErroDiv();
    this.modal = this._createModal();
    // --- comentar filtros por área ---
    // this.filterBtns = Array.from(this.filterContainer.querySelectorAll('.filter-btn'));
    // this.filterContainer.addEventListener('click', e => {
    //   if (!e.target.matches('.filter-btn')) return;
    //   const area = e.target.dataset.area;
    //   this.selectedArea = area;
    //   this.filterBtns.forEach(btn => 
    //     btn.classList.toggle('active', btn.dataset.area === area)
    //   );
    //   this.loadArea(area);
    // });

    // --- configurar filtros por natureza ---
    this.selectedNature = '';
    if (this.natureFilterContainer) {
      this.natureFilterContainer.addEventListener('click', e => {
        if (!e.target.matches('.filter-btn-nature')) return;
        const nature = e.target.dataset.nature;
        this.selectedNature = nature;
        Array.from(this.natureFilterContainer.querySelectorAll('.filter-btn-nature'))
          .forEach(btn => btn.classList.toggle('active', btn.dataset.nature === nature));
        this.showResults();
      });
    }

    // listener único para detalhes e mostrar mais
    this.resultsList.addEventListener('click', e => {
      if (e.target.matches('button.show-more')) {
        this.renderList(this.allLabs, this.currentOffset + 20); // mantém paginação incremental
        return;
      }
      if (e.target.matches('.detail-btn')) {
        const idx = parseInt(e.target.dataset.idx, 10);
        this.showDetails(this.allLabs[idx]);
      }
    });
  }

  async init() {
    await this.loadArea(this.selectedArea); // mantém carga inicial
    this.renderNatureFilters(this.allLabs);
    this.searchBar.focus();    // dá foco à barra de busca após carregar
  }

  fetchData(file) {
    this.erroDiv.textContent = 'Buscando ' + file + '...';
    return fetch(file)
      .then(res => { if (!res.ok) throw new Error(res.statusText); return res.json(); })
      .finally(() => this.erroDiv.textContent = '');
  }

  async loadArea(area) {
    this.erroDiv.textContent = 'Carregando...';
    try {
      const data = await this.fetchData(this.areaFiles[this._normalize(area)] || this.areaFiles.todas);
      this.allLabs = this.extractLabs(data);
      this.renderNatureFilters(this.allLabs);
      this.showResults();
      this.erroDiv.textContent = '';
    } catch (e) {
      this.erroDiv.textContent = `Erro ao carregar área ${area}: ${e.message}`;
    }
  }

  async loadAll() {
    this.erroDiv.textContent = 'Carregando todos os laboratórios...';
    try {
      const all = await Promise.all(
        Object.values(this.areaFiles).map(f =>
          this.fetchData(f).then(this.extractLabs).catch(()=>[])
        )
      );
      this.allLabs = all.flat();
      this.showResults();
      this.erroDiv.textContent = '';
    } catch (e) {
      this.erroDiv.textContent = 'Erro ao carregar todos os laboratórios: ' + e.message;
    }
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

  renderList(labs, offset = 0) {
    this.currentOffset = offset;
    const slice = labs.slice(offset, offset + 20);
    this.resultsList.innerHTML = '';
    slice.forEach((lab, i) => {
      const li = document.createElement('li');
      li.className = 'lab-card';

      // imagem
      const rawUrl = lab.imagem || lab.image || lab.foto;
      if (rawUrl) {
        const img = document.createElement('img');
        img.src = /^https?:/.test(rawUrl) ? rawUrl : `assets/${rawUrl}`;
        li.appendChild(img);
      }

      const cont = document.createElement('div');
      cont.className = 'content';

      // título clicável
      const title = document.createElement('h4');
      title.textContent = lab.nome;
      title.style.cursor = 'pointer';
      title.addEventListener('click', () => this.showDetails(lab));
      cont.appendChild(title);

      // botão detalhes
      const btn = document.createElement('button');
      btn.className = 'detail-btn';
      btn.textContent = 'Ver detalhes';
      btn.dataset.idx = offset + i;
      cont.appendChild(btn);

      li.appendChild(cont);
      this.resultsList.appendChild(li);
    });

    // quantos faltam
    const remaining = labs.length - (offset + 20);
    if (remaining > 0) {
      const liMore = document.createElement('li');
      liMore.style.textAlign = 'center';
      const moreBtn = document.createElement('button');
      moreBtn.textContent = `Mostrar mais ${remaining} laboratórios...`;
      moreBtn.addEventListener('click', () => this.renderList(labs, offset + 20));
      liMore.appendChild(moreBtn);
      this.resultsList.appendChild(liMore);
    }
  }

  showDetails(lab) {
    const detailsDiv = document.getElementById('lab-details');
    detailsDiv.innerHTML = '';

    // aplica padding ao container para melhor layout
    detailsDiv.style.padding = '1rem';
    detailsDiv.style.maxWidth = '600px';

    // 1) Cabeçalho: nome do lab e coordenador
    const h2 = document.createElement('h2');
    h2.textContent = lab.nome;
    h2.style.margin = '0 0 0.5rem';
    detailsDiv.appendChild(h2);

    if (lab.responsavel) {
      const h3 = document.createElement('h3');
      h3.textContent = 'Coordenador: ' + lab.responsavel;
      h3.style.margin = '0 0 1rem';
      detailsDiv.appendChild(h3);
    }

    // 1.1) Resumo breve a partir do campo Descrição (primeira frase)
    if (lab.descricao) {
      const full = lab.descricao.trim();
      const end  = full.indexOf('.') > -1 ? full.indexOf('.') + 1 : full.length;
      const resumo = document.createElement('p');
      resumo.textContent    = full.slice(0, end);
      resumo.style.margin   = '0 0 1rem';
      resumo.style.fontStyle = 'italic';
      detailsDiv.appendChild(resumo);
    }

    // 2) Campos principais e úteis
    const MAIN_FIELDS = [
      'email',
      'telefone',
      'site',
      'localizacao',
      'area',
      'horario',
      'tags'
    ];

    MAIN_FIELDS.forEach(key => {
      const value = lab[key];
      if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) return;
      const label = FIELD_LABELS[key] || key;
      let content = '';

      if (Array.isArray(value)) {
        content = '<ul>' + value.map(item => `<li>${item}</li>`).join('') + '</ul>';
      } else {
        content = String(value).replace(/\n+/g, '<br>').trim();
      }

      const p = document.createElement('p');
      p.innerHTML = `<strong>${label}:</strong> ${content}`;
      p.style.margin = '0.5rem 0';
      p.style.lineHeight = '1.4';
      detailsDiv.appendChild(p);
    });

    // 3) Mostra modal
    this.modal.style.display = 'flex';
  }

  showResults() {
    const q = this._normalize(this.searchBar.value);
    const filtered = this.allLabs.filter(lab => {
      const text = this._normalize([
        lab.nome,
        ...(lab.area||[]),
        ...(lab.tags||[]),
        lab.localizacao,
        lab.responsavel,
        lab.natureza
      ].filter(Boolean).join(' '));
      const okText   = q.split(' ').every(w => text.includes(w));
      const okLoc    = !this.locationFilter ||
                       (lab.localizacao && this._normalize(lab.localizacao).includes(this.locationFilter));
      const natures  = this._parseNatures(lab.natureza);
      const okNature = !this.selectedNature || natures.includes(this.selectedNature);
      return okText && okLoc && okNature;
    });
    this.renderList(filtered);
  }

  // --- novo método de construção dos botões de natureza ---
  renderNatureFilters(labs) {
    if (!this.natureFilterContainer) return;
    this.natureFilterContainer.innerHTML = '';

    // botão "Todas"
    const allBtn = document.createElement('button');
    allBtn.className        = 'filter-btn-nature';
    allBtn.dataset.nature   = '';
    allBtn.textContent      = 'Todas';
    if (!this.selectedNature) allBtn.classList.add('active');
    this.natureFilterContainer.appendChild(allBtn);

    // filtros fixos
    NATURE_KEYS.forEach(key => {
      const btn = document.createElement('button');
      btn.className      = 'filter-btn-nature';
      btn.dataset.nature = key;
      btn.textContent    = NATURE_LABELS[key];
      if (this.selectedNature === key) btn.classList.add('active');
      this.natureFilterContainer.appendChild(btn);
    });
  }

  // divide string de natureza em array normalizado
  _parseNatures(str) {
    if (!str) return [];
    return Array.from(new Set(
      str
        .split(/\s*(?:,|;|\be\b|\se\s)\s*/i)
        .map(n => this._normalize(n) === 'mista' ? 'misto' : this._normalize(n))
        .filter(Boolean)
    ));
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
}

// inicialização única
document.addEventListener('DOMContentLoaded', () => {
  new LabApp().init();
  toggleBg(); // inicia slideshow de fundo
});

// alterna entre bg1 e bg2 a cada 10s
function toggleBg() {
  document.body.classList.add('bg1');
  setInterval(() => {
    document.body.classList.toggle('bg1');
    document.body.classList.toggle('bg2');
  }, 10000);
}

const assetPath = 'assets';

function displayResults(labs) {
  results.innerHTML = '';
  labs.forEach(lab => {
   const cardHTML = `
+     <img src="${assetPath}/${lab.img}" alt="${lab.name}">
     <h3>${lab.name}</h3>
     <p>${lab.description}</p>
     <a href="${lab.link}">Saiba mais</a>
   `;
    const li = document.createElement('li');
    li.className = 'lab-card';
    li.innerHTML = cardHTML;
    results.appendChild(li);
  });
}