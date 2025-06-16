window.addEventListener('DOMContentLoaded', () => {
  (() => {
    // Estado global
    let laboratorios = [];
    let areaSelecionada = "todas";
    let filtroLocalizacao = "";

    // Mapeamento de área para arquivo JSON (chaves normalizadas)
    const AREA_TO_JSON = {
      "todas": "src/laboratorios_ciencias_biologicas.json", // "laboratorios_ciencias_da_saude.json",
      "ciencias humanas": "https://github.com/Jaimeabreu2/poc-project/blob/98a7d3b7e2da7639269705927a18bf309057b3f0/src/laboratorios_ciencias_agrarias.json"  //  "laboratorios_ciencias_humanas.json",
      "ciencias exatas e da terra": "laboratorios_ciencias_exatas_e_da_terra.json",
      "ciencias biologicas": "laboratorios_ciencias_biologicas.json",
      "ciencias da saude": "laboratorios_ciencias_da_saude.json",
      "ciencias agrarias": "laboratorios_ciencias_agrarias.json",
      "ciencias sociais aplicadas": "laboratorios_ciencias_sociais_aplicadas.json"
    };

    /* function normalizar(str) {
      return str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
    } */

    function normalizar(str) {
    return str
    ? str
        .normalize("NFD")                    // decompor acentos
        .replace(/[\u0300-\u036f]/g, "")    // remover acentos
        .toLowerCase()
        .replace(/[^\w\s]/g, "")            // remover caracteres especiais (pontuação)
        .replace(/\s+/g, " ")               // substituir múltiplos espaços por um único espaço
        .trim()
    : "";
    }


    // Elementos DOM principais
    const searchBar = document.getElementById('search-bar');
    const resultsList = document.getElementById('results');
    const filterBtns = document.querySelectorAll('.filter-btn');
    let autocompleteDiv = null;
    const erroDiv = document.createElement('div');
    erroDiv.id = 'lab-erro';
    erroDiv.style.color = '#b00';
    erroDiv.style.textAlign = 'center';
    erroDiv.style.margin = '10px 0 0 0';
    resultsList.parentNode.insertBefore(erroDiv, resultsList);

    // Normaliza área para comparação e para uso no mapeamento
    function normalizarArea(area) {
      if (!area) return '';
      // Suporta área como array ou string
      if (Array.isArray(area)) area = area[0];
      return area
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z\s]/g, '')
        .trim();
    }

    // Verifica se o laboratório pertence à área selecionada
    function labTemArea(lab, areaNorm) {
      if (areaNorm === 'todas') return true;
      if (!lab.area) return false;
      // Suporta área como array ou string
      if (Array.isArray(lab.area)) {
        return lab.area.some(a => normalizarArea(a) === areaNorm);
      }
      return normalizarArea(lab.area) === areaNorm;
    }

    // Carrega laboratórios do JSON da área selecionada
    function carregarLaboratoriosPorArea(area) {
      const areaNorm = normalizarArea(area);
      const arquivo = AREA_TO_JSON[areaNorm] || AREA_TO_JSON["todas"];
      erroDiv.textContent = '';
      resultsList.innerHTML = '<li style="color:#888;text-align:center;">Carregando laboratórios...</li>';
      // Corrija o caminho do fetch para ser relativo ao HTML principal, não ao JS
      fetch(arquivo)
        .then(res => {
          if (!res.ok) {
            erroDiv.textContent = 'Erro ao carregar ' + arquivo + '. Verifique se o arquivo existe e está acessível.';
            throw new Error('Erro ao carregar ' + arquivo + ': status ' + res.status);
          }
          return res.json();
        })
        .then(data => {
          laboratorios = Array.isArray(data) ? data : [];
          console.log('Laboratórios carregados:', laboratorios.length); // <-- Aqui
          mostrarResultados();
        })
        .catch(err => {
          erroDiv.textContent = 'Erro ao carregar ou processar ' + arquivo + '. Verifique se o arquivo existe, está válido e acessível.';
          laboratorios = [];
          mostrarResultados();
        });
    }

    // Debounce para busca
    function debounce(fn, delay = 250) {
      let timer = null;
      return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
      };
    }

    /* // Busca flexível: aceita palavras parciais
    function buscaLab(lab, query) {
      if (!query) return true;
      const q = normalizar(query);
      // Suporta área e tags como array ou string
      const campos = [
        lab.nome,
        ...(Array.isArray(lab.area) ? lab.area : [lab.area]),
        ...(Array.isArray(lab.tags) ? lab.tags : (lab.tags ? [lab.tags] : [])),
        lab.localizacao,
        lab.responsavel,
        lab.descricao,
        lab.descrição
      ].filter(Boolean).map(normalizar).join(' ');
      // Corrija: busca flexível, cada palavra deve ser substring de campos
      return q.split(' ').every(pal => campos.indexOf(pal) !== -1 || campos.includes(pal));
    } */

    function buscaLab(lab, query) {
  if (!query) return true;
  const q = normalizar(query);
  const campos = [
    lab.nome,
    ...(Array.isArray(lab.area) ? lab.area : [lab.area]),
    ...(Array.isArray(lab.tags) ? lab.tags : (lab.tags ? [lab.tags] : [])),
    lab.localizacao,
    lab.responsavel,
    lab.descricao,
    lab.descrição
  ].filter(Boolean).map(normalizar).join(' ');

  // Agora cada palavra digitada precisa apenas estar contida nos campos
  return q.split(' ').every(pal => campos.includes(pal));
}


    // Mostra resultados filtrados
    function mostrarResultados() {
      const query = searchBar.value.trim();
      const locQuery = normalizar(filtroLocalizacao);
      resultsList.innerHTML = '';

      if (!Array.isArray(laboratorios) || laboratorios.length === 0) {
        resultsList.innerHTML = `<li style="color:#b00;text-align:center;">Nenhum laboratório encontrado.</li>`;
        return;
      }

      let filtrados = laboratorios.filter(lab => {
        const matchQuery = buscaLab(lab, query);
        const matchLoc = locQuery === '' ||
          (lab.localizacao && normalizar(lab.localizacao).includes(locQuery)) ||
          (lab.contato && lab.contato.endereco && normalizar(lab.contato.endereco).includes(locQuery));
        return matchQuery && matchLoc;
      });

      // Remova qualquer .slice(0, 10) aqui! (não existe, mas garanta)
      filtrados.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

      const total = filtrados.length;
      if (total > 0) {
        resultsList.innerHTML = `<li style="color:#007bff;text-align:center;font-weight:bold;">${total} laboratório${total > 1 ? 's' : ''} encontrado${total > 1 ? 's' : ''}</li>`;
        filtrados.forEach(lab => {
          resultsList.appendChild(criarElementoResultado(lab, normalizar(query)));
        });
      } else {
        resultsList.innerHTML = `<li style="color:#b00;text-align:center;">Nenhum resultado encontrado para o filtro <b>${areaSelecionada}</b>${filtroLocalizacao ? ', localização: <b>' + filtroLocalizacao + '</b>' : ''}.</li>`;
      }
    }

    // Filtro por área
    filterBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault(); // Evita comportamento inesperado de foco ou submit
        // Evita recarregar ou piscar a tela
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        areaSelecionada = btn.dataset.area;
        searchBar.value = '';
        filtroLocalizacao = '';
        if (document.getElementById('filtro-localizacao')) document.getElementById('filtro-localizacao').value = '';
        carregarLaboratoriosPorArea(areaSelecionada);
      });
    });

    // Filtro por localização
    if (searchBar && !document.getElementById('filtro-localizacao')) {
      const filtroDiv = document.createElement('div');
      filtroDiv.innerHTML = `
        <input id="filtro-localizacao" placeholder="Filtrar por localização" style="margin-bottom:8px;width:220px;">
      `;
      searchBar.parentNode.insertBefore(filtroDiv, searchBar.nextSibling);

      const filtroLocInput = document.getElementById('filtro-localizacao');
      if (filtroLocInput) {
        filtroLocInput.addEventListener('input', debounce(e => {
          filtroLocalizacao = e.target.value;
          mostrarResultados();
        }, 200));
      }
    }

    // Autocomplete/sugestões
    if (!document.getElementById('autocomplete-sugestoes')) {
      autocompleteDiv = document.createElement('div');
      autocompleteDiv.id = 'autocomplete-sugestoes';
      Object.assign(autocompleteDiv.style, {
        position: 'absolute',
        background: '#fff',
        border: '1px solid #ccc',
        zIndex: 1000,
        display: 'none',
        maxHeight: '200px',
        overflowY: 'auto',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        color: '#222',
        fontSize: '1em'
      });
      searchBar.parentNode.appendChild(autocompleteDiv);

      if (searchBar) {
        searchBar.addEventListener('input', debounce(() => {
          mostrarResultados();
          mostrarSugestoesAutocomplete();
        }, 200));
        searchBar.addEventListener('focus', mostrarSugestoesAutocomplete);
      }

      function mostrarSugestoesAutocomplete() {
        if (!autocompleteDiv || !searchBar) return;
        const val = searchBar.value.trim();
        if (!val) {
          autocompleteDiv.style.display = 'none';
          return;
        }
        const valNorm = normalizar(val);
        const sugestoes = laboratorios
          .map(lab => lab.nome)
          .filter(Boolean)
          .filter(nome => normalizar(nome).includes(valNorm))
          .slice(0, 8);
        if (sugestoes.length === 0) {
          autocompleteDiv.style.display = 'none';
          return;
        }
        autocompleteDiv.innerHTML = sugestoes.map(s => `<div data-sugestao="${s}" style="padding:6px 12px;cursor:pointer;">${s}</div>`).join('');
        autocompleteDiv.style.top = (searchBar.offsetTop + searchBar.offsetHeight) + 'px';
        autocompleteDiv.style.left = searchBar.offsetLeft + 'px';
        autocompleteDiv.style.width = searchBar.offsetWidth + 'px';
        autocompleteDiv.style.display = 'block';
      }

      document.addEventListener('mousedown', (e) => {
        if (autocompleteDiv && !autocompleteDiv.contains(e.target) && e.target !== searchBar) {
          autocompleteDiv.style.display = 'none';
        }
      });
      autocompleteDiv.addEventListener('mousedown', e => {
        if (e.target && e.target.dataset && e.target.dataset.sugestao) {
          searchBar.value = e.target.dataset.sugestao;
          mostrarResultados();
          autocompleteDiv.style.display = 'none';
        }
      });
    } else {
      autocompleteDiv = document.getElementById('autocomplete-sugestoes');
    }

    // Cria elemento de resultado
    function criarElementoResultado(lab, query) {
      const li = document.createElement('li');
      let nomeDest = lab.nome || '';
      if (query) {
        const regex = new RegExp(`(${query})`, 'gi');
        nomeDest = nomeDest.replace(regex, '<mark>$1</mark>');
      }
      li.innerHTML = `
        <strong class="lab-nome" data-lab="${encodeURIComponent(lab.nome || '')}" style="cursor:pointer;color:#2a5d9f;text-decoration:underline;">${nomeDest}</strong>
        <button type="button" data-lab="${encodeURIComponent(lab.nome || '')}" style="margin-left:10px;">Ver detalhes</button>
      `;
      li.querySelector('.lab-nome').addEventListener('click', e => {
        mostrarDetalhesLaboratorio(e.target.dataset.lab);
      });
      li.querySelector('button').addEventListener('click', e => {
        mostrarDetalhesLaboratorio(e.target.dataset.lab);
      });
      return li;
    }

    // Modal de detalhes do laboratório
    function mostrarDetalhesLaboratorio(nomeLab) {
      const nomeDec = decodeURIComponent(nomeLab);
      // Busca por nome exato (pode ser case sensitive, então normaliza)
      const lab = laboratorios.find(l => (l.nome || '').toLowerCase() === nomeDec.toLowerCase());
      if (!lab) return;

      let modal = document.getElementById('lab-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'lab-modal';
        Object.assign(modal.style, {
          position: 'fixed',
          top: '0', left: '0', right: '0', bottom: '0',
          background: 'rgba(0,0,0,0.65)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        });
        modal.innerHTML = `
          <div id="lab-modal-content" style="background:#1a2233;max-width:650px;width:98%;padding:32px 24px 24px 24px;border-radius:16px;position:relative;box-shadow:0 8px 32px #000a;color:#fff;">
            <button id="lab-modal-close" style="position:absolute;top:10px;right:16px;font-size:26px;background:none;border:none;cursor:pointer;color:#fff;">&times;</button>
            <div id="lab-modal-body"></div>
          </div>
        `;
        document.body.appendChild(modal);
        document.getElementById('lab-modal-close').onclick = () => { modal.style.display = 'none'; };
        modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
      } else {
        modal.style.display = 'flex';
      }

      function info(label, value, color = "#b3e6ff", icon = "") {
        return value ? `<div style="margin:4px 0;"><b>${icon ? icon + ' ' : ''}${label}:</b> <span style="color:${color}">${value}</span></div>` : '';
      }

      const area = Array.isArray(lab.area) ? lab.area.join(', ') : (lab.area || '');
      const tags = lab.tags && lab.tags.length ? lab.tags.join(', ') : '';
      const descricao = typeof lab.descricao === "string" ? lab.descricao : (lab.descrição || '');
      const resumo = lab.descricao_resumida || lab.resumo || '';
      const email = lab.email || (lab.contato && lab.contato.email) || '';
      const site = lab.site || (lab.contato && lab.contato.site) || '';
      const responsavel = lab.responsavel || '';
      const localizacao = lab.localizacao || (lab.contato && lab.contato.endereco) || '';
      const telefone = lab.telefone || lab.fone || (lab.contato && lab.contato.telefone) || '';
      const natureza = lab.natureza || '';
      const vinculado = lab.vinculado || '';
      const outros = lab.outros || '';
      const contatoExtra = lab.contato && typeof lab.contato === 'object'
        ? Object.entries(lab.contato)
            .filter(([k]) => !['endereco','telefone','email','site'].includes(k))
            .map(([k,v]) => info(k.charAt(0).toUpperCase()+k.slice(1), v))
            .join('')
        : '';

      function gerarResumoDescricao(desc, responsavel) {
        if (!desc) return responsavel ? `Coordenador: ${responsavel}` : '';
        const ponto = desc.indexOf('.') !== -1 ? desc.indexOf('.') + 1 : desc.length;
        let resumo = desc.slice(0, Math.max(ponto, 120));
        if (resumo.length > 180) resumo = resumo.slice(0, 180) + '...';
        if (responsavel && !resumo.toLowerCase().includes(responsavel.toLowerCase())) {
          resumo += ` <br><span style="color:#ffd700;">Coordenador: ${responsavel}</span>`;
        }
        return resumo;
      }

      const resumoAuto = resumo || gerarResumoDescricao(descricao, responsavel);

      const enderecoMaps = localizacao
        ? `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(localizacao)}" target="_blank" style="color:#ffd700;text-decoration:underline;">Ver no mapa</a>`
        : '';

      const btnCopyEmail = email
        ? `<button onclick="navigator.clipboard.writeText('${email}')" style="margin-left:8px;padding:2px 8px;border-radius:4px;border:none;background:#ffd700;color:#1a2233;cursor:pointer;font-size:0.95em;">Copiar e-mail</button>`
        : '';

      const btnCopyEndereco = localizacao
        ? `<button onclick="navigator.clipboard.writeText('${localizacao}')" style="margin-left:8px;padding:2px 8px;border-radius:4px;border:none;background:#ffd700;color:#1a2233;cursor:pointer;font-size:0.95em;">Copiar endereço</button>`
        : '';

      const destaque = `
        <div style="margin-bottom:10px;">
          <span style="background:#ffd700;color:#1a2233;padding:2px 10px;border-radius:8px;font-weight:bold;">${area}</span>
        </div>
        ${
          responsavel
            ? `<div style="margin-bottom:10px;">
                  <span style="background:#223366;color:#ffd700;padding:2px 10px;border-radius:8px;">
                    <b>Coordenador:</b> ${responsavel}
                  </span>
               </div>`
            : ''
        }
      `;

      const dataCriacao = lab.data_criacao || lab.dataCriacao || '';
      const dataAtualizacao = lab.data_atualizacao || lab.dataAtualizacao || '';

      document.getElementById('lab-modal-body').innerHTML = `
        <h2 style="margin-top:0;color:#ffd700;font-size:1.5em;">${lab.nome || '(Sem nome)'}</h2>
        ${destaque}
        <div style="margin-bottom:10px;">
          ${info('Natureza', natureza, "#b3e6ff", "🏷️")}
          ${info('Vinculado', vinculado, "#b3e6ff", "🏛️")}
          ${info('Telefone', telefone, "#b3e6ff", "📞")}
          ${info('Email', email ? `<a href="mailto:${email}" style="color:#ffd700">${email}</a>${btnCopyEmail}` : '', "#b3e6ff", "✉️")}
          ${site ? `<div style="margin:4px 0;"><b>Site:</b> <a href="${site.startsWith('http') ? site : 'http://' + site}" target="_blank" style="color:#ffd700;text-decoration:underline;">${site}</a></div>` : ''}
          ${info('Localização', localizacao + (enderecoMaps ? ' ' + enderecoMaps + btnCopyEndereco : ''), "#b3e6ff", "📍")}
          ${info('Tags', tags, "#b3e6ff", "🏷️")}
          ${contatoExtra}
          ${outros ? `<div style="margin:4px 0;"><b>Outros:</b> <span style="color:#b3e6ff">${outros}</span></div>` : ''}
          ${dataCriacao ? `<div style="margin:4px 0;"><b>Data de criação:</b> <span style="color:#b3e6ff">${dataCriacao}</span></div>` : ''}
          ${dataAtualizacao ? `<div style="margin:4px 0;"><b>Última atualização:</b> <span style="color:#b3e6ff">${dataAtualizacao}</span></div>` : ''}
        </div>
        ${resumoAuto ? `<div style="margin:18px 0 8px 0;padding:10px 12px;background:#223366;border-radius:8px;border-left:4px solid #ffd700;color:#fff;">
          <b>Resumo:</b><br>
          <span style="font-size:1.04em;line-height:1.5;">${resumoAuto}</span>
        </div>` : ''}
        <div style="margin:8px 0 0 0;padding:14px 12px;background:#223366;border-radius:8px;border-left:4px solid #ffd700;color:#fff;">
          <b>Descrição:</b><br>
          <span style="font-size:1.05em;line-height:1.6;">
            ${
              descricao
                ? (
                    descricao +
                    (responsavel
                      ? `<br><span style="color:#ffd700;"><b>Coordenador:</b> ${responsavel}</span>`
                      : '')
                  )
                : (
                  `Laboratório vinculado a ${vinculado || 'instituição não informada'}${area ? ', atuando na área de ' + area : ''}${tags ? ', com foco em: ' + tags : ''}${responsavel ? ', responsável: ' + responsavel : ''}${localizacao ? ', localizado em: ' + localizacao : ''}.`
                )
            }
          </span>
        </div>
      `;
      modal.style.display = 'flex';
    }

    // Caminho do fetch relativo ao HTML
    function getJsonFileName(areaFiltro) {
      const areaNorm = normalizarArea(areaFiltro);
      if (areaNorm.startsWith('ciencias sociais')) return AREA_TO_JSON["ciencias sociais aplicadas"];
      return AREA_TO_JSON[areaNorm] || AREA_TO_JSON["todas"];
    }

    function onFiltroAreaClick(area) {
      areaSelecionada = area;
      searchBar.value = '';
      filtroLocalizacao = '';
      if (document.getElementById('filtro-localizacao')) document.getElementById('filtro-localizacao').value = '';
      carregarLaboratoriosPorArea(areaSelecionada);
    }

    if (searchBar && resultsList) {
      carregarLaboratoriosPorArea("todas");
    }
  })();
});
