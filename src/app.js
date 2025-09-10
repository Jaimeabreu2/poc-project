// =============================
// ATENÇÃO: Mudança crítica!
// Todas as ocorrências visuais de "Patente(s)" devem ser exibidas como "Tecnologia(s)" para o usuário.
// Não altere variáveis internas, apenas garanta que no front end (botões, títulos, filtros, mensagens, etc.)
// o termo "Tecnologia" apareça no lugar de "Patente".
// =============================

'use strict';

document.addEventListener('DOMContentLoaded', () => {

  // Elementos principais da interface
  const abas = document.querySelectorAll('.aba');
  const filtrosPatentes = document.getElementById('filtros-patentes');
  const filtrosLaboratorios = document.getElementById('filtros-laboratorios');
  const listaResultados = document.getElementById('results');
  const searchBar = document.getElementById('search-bar');
  const naturezaCheckboxes = document.querySelectorAll('.natureza-checkbox');
  const botaoBusca = document.getElementById('botao-buscar');

  // Estado atual dos filtros e da aba ativa
  let abaAtual = 'patentes';
  let areasSelecionadas = new Set();      // Para laboratórios
  let tiposSelecionados = new Set();      // Para patentes
  let naturezaSelecionadas = new Set();   // Para checkbox natureza
  let textoBusca = '';

  // Áreas dos laboratórios
  const areas = [
    'ciencias humanas',
    'ciencias biologicas',
    'ciencias agrarias',
    'ciencias exatas e da terra',
    'ciencias da saude',
    'ciencias sociais aplicadas'
  ];

  // Tipos de patentes (nome dos arquivos e chave do JSON)
  const tiposPatentes = [
    'patentes-invencao',
    'patentes-utilidade',
    'desenhos-industriais',
    'programas-computadores'
  ];

  // Objetos para armazenar os dados carregados
  let dadosPatentes = {};
  let dadosLaboratorios = {};

  // Verifica se há uma query string na URL (busca inicial)
  const urlParams = new URLSearchParams(window.location.search);
  const query = urlParams.get('q');
  if (query) {
    searchBar.value = query;
    textoBusca = query.toLowerCase();
  }

  // Função para carregar dados JSON de patentes e laboratórios
  async function carregarDados() {
    try {
      // Carrega arquivos de patentes
      const fetchPatentesPromises = tiposPatentes.map(tipo =>
        fetch(`patentes/${tipo}.json`).then(res => {
          if (!res.ok) throw new Error(`Erro ao carregar ${tipo}`);
          return res.json();
        })
      );

      // Carrega arquivos de laboratórios por área
      const fetchLaboratoriosPromises = areas.map(area =>
        fetch(`laboratorios/laboratorios-${area.replace(/ /g, '-')}.json`).then(res => {
          if (!res.ok) throw new Error(`Erro ao carregar laboratórios de ${area}`);
          return res.json();
        })
      );

      // Aguarda todas as requisições
      const resultadosPatentes = await Promise.all(fetchPatentesPromises);
      const resultadosLaboratorios = await Promise.all(fetchLaboratoriosPromises);

      // Armazena dados das patentes por tipo
      tiposPatentes.forEach((tipo, i) => {
        dadosPatentes[tipo] = resultadosPatentes[i];
      });

      // Armazena dados dos laboratórios por área
      areas.forEach((area, i) => {
        dadosLaboratorios[area] = resultadosLaboratorios[i];
      });

      configurarBotoesAreasETipos();
      mostrarResultados();

    } catch (erro) {
      console.error(erro);
      listaResultados.innerHTML = '<li style="color:red;">Erro ao carregar os dados.</li>';
    }
  }

  // Alterna entre abas e ajusta visibilidade dos filtros
  abas.forEach(botao => {
    botao.addEventListener('click', () => {
      const tipo = botao.dataset.tipo;
      if (tipo === abaAtual) return;

      abas.forEach(b => b.classList.remove('ativa'));
      botao.classList.add('ativa');

      if (tipo === 'patentes') {
        filtrosPatentes.classList.add('ativo');
        filtrosLaboratorios.classList.remove('ativo');
      } else {
        filtrosLaboratorios.classList.add('ativo');
        filtrosPatentes.classList.remove('ativo');
      }

      abaAtual = tipo;
      resetarFiltrosDeArea();
      resetarFiltrosNatureza();
      configurarBotoesAreasETipos();
      mostrarResultados();
    });
  });

  // Configura os botões das áreas (laboratórios) ou tipos (patentes)
  function configurarBotoesAreasETipos() {
    const container = abaAtual === 'patentes' ? filtrosPatentes : filtrosLaboratorios;
    const botoes = container.querySelectorAll('.grupo-areas button');

    botoes.forEach(botao => {
      botao.classList.remove('ativa');
      botao.onclick = () => {
        const chave = botao.dataset.area;
        const jaAtivo = botao.classList.contains('ativa');

        if (jaAtivo) {
          // Se já está ativo, desmarque tudo (remove filtro)
          botoes.forEach(b => b.classList.remove('ativa'));
          if (abaAtual === 'patentes') {
            tiposSelecionados.clear();
          } else {
            areasSelecionadas.clear();
          }
        } else {
          // Remove todas as seleções anteriores
          botoes.forEach(b => b.classList.remove('ativa'));
          if (abaAtual === 'patentes') {
            tiposSelecionados.clear();
            tiposSelecionados.add(chave);
          } else {
            areasSelecionadas.clear();
            areasSelecionadas.add(chave);
          }
          botao.classList.add('ativa');
        }
        mostrarResultados();
      };
    });
  }

  // Limpa filtros visuais e dados de seleção das áreas ou tipos
  function resetarFiltrosDeArea() {
    const container = abaAtual === 'patentes' ? filtrosPatentes : filtrosLaboratorios;
    container.querySelectorAll('.grupo-areas button.ativa').forEach(btn => btn.classList.remove('ativa'));

    if (abaAtual === 'patentes') {
      tiposSelecionados.clear();
    } else {
      areasSelecionadas.clear();
    }
  }

  // Limpa checkboxes de natureza
  function resetarFiltrosNatureza() {
    naturezaCheckboxes.forEach(cb => cb.checked = false);
    naturezaSelecionadas.clear();
  }

  // Atualiza o Set de natureza ao marcar/desmarcar checkboxes
  naturezaCheckboxes.forEach(cb => {
  cb.addEventListener('change', () => {
    // Se o usuário marcou esse, desmarque todos os outros
    if (cb.checked) {
      naturezaCheckboxes.forEach(outroCb => {
        if (outroCb !== cb) outroCb.checked = false;
      });

      naturezaSelecionadas.clear();
      naturezaSelecionadas.add(cb.value.toLowerCase());

    } else {
      // Se desmarcou, limpa tudo
      naturezaSelecionadas.clear();
    }

    mostrarResultados();
  });
});


  // Atualiza textoBusca enquanto usuário digita
  searchBar.addEventListener('input', (e) => {
    textoBusca = normalizarTexto(e.target.value);
    mostrarResultados();
  });

  // Filtra por natureza (checkboxes)
  function filtrarPorNatureza(item) {
    if (naturezaSelecionadas.size === 0) return true;
    const naturezaItem = item.natureza ? item.natureza.toLowerCase() : '';
    return naturezaSelecionadas.has(naturezaItem);
  }
  //erros de digitação
  function normalizarTexto(texto) {
  return texto
    .normalize("NFD") // Normaliza caracteres com acento para forma decomponível
    .replace(/[\u0300-\u036f]/g, "") // Remove marcas de acento
    .toLowerCase()
    .trim();
}

  // Busca o termo em todos os campos relevantes do item (tecnologia ou laboratório)
  function filtrarPorTexto(item) {
    if (!textoBusca) return true;
    const busca = normalizarTexto(textoBusca);
    // Procura em todos os campos string do objeto
    for (const chave in item) {
      if (typeof item[chave] === 'string' && normalizarTexto(item[chave]).includes(busca)) {
        return true;
      }
      // Se for array de strings (ex: inventores)
      if (Array.isArray(item[chave])) {
        if (item[chave].some(val => typeof val === 'string' && normalizarTexto(val).includes(busca))) {
          return true;
        }
      }
    }
    return false;
  }

  // Troca textos visuais de "Patente(s)" para "Tecnologia(s)" no front end
  function ajustarTextosParaTecnologia() {
    // Abas
    abas.forEach(botao => {
      if (botao.dataset.tipo === 'patentes') {
        botao.textContent = 'Tecnologias';
      }
    });
    // Título do filtro
    // const filtrosTitulo = document.querySelector('#filtros-patentes .grupo-natureza span');
    // if (filtrosTitulo) filtrosTitulo.textContent = 'Natureza:';
    // Oculta o grupo-natureza do filtro de patentes
    const grupoNaturezaPatentes = document.querySelector('#filtros-patentes .grupo-natureza');
    if (grupoNaturezaPatentes) grupoNaturezaPatentes.style.display = 'none';
    // Botões dos tipos
    const botoesPatentes = document.querySelectorAll('#filtros-patentes .grupo-areas button');
    botoesPatentes.forEach(btn => {
      if (btn.textContent.toUpperCase().includes('PATENTES - MODELO DE UTILIDADE')) btn.textContent = 'TECNOLOGIAS - MODELO DE UTILIDADE';
      if (btn.textContent.toUpperCase().includes('PATENTES - INVENÇÃO')) btn.textContent = 'TECNOLOGIAS - INVENÇÃO';
    });
    // Título da página (opcional)
    if (document.title.includes('Patentes')) document.title = document.title.replace('Patentes', 'Tecnologias');
  }

  // Chama o ajuste ao carregar
  ajustarTextosParaTecnologia();

  // Mostra os resultados filtrados na tela
  function mostrarResultados() {
    listaResultados.innerHTML = '';

    if (abaAtual === 'patentes') {
      const dadosObj = dadosPatentes;
      const mostrarTodos = tiposSelecionados.size === 0;
      const resultadosFiltrados = [];

      if (mostrarTodos) {
        // Sem filtros: mostra todas as patentes de todos os tipos
        tiposPatentes.forEach(tipo => {
          const listaTipo = dadosObj[tipo] || [];
          listaTipo.forEach(item => {
            if (filtrarPorNatureza(item) && filtrarPorTexto(item)) {
              resultadosFiltrados.push(item);
            }
          });
        });
      } else {
        // Com filtro: mostra só os tipos selecionados
        tiposSelecionados.forEach(tipo => {
          const listaTipo = dadosObj[tipo] || [];
          listaTipo.forEach(item => {
            if (filtrarPorNatureza(item) && filtrarPorTexto(item)) {
              resultadosFiltrados.push(item);
            }
          });
        });
      }

      if (resultadosFiltrados.length === 0) {
        listaResultados.innerHTML = '<li style="color:#666;">Nenhuma tecnologia encontrada.</li>';
        return;
      }

      // Ordena alfabeticamente pelo nome, colocando nomes que começam com número/símbolo após os que começam com letra
      resultadosFiltrados.sort((a, b) => {
        const nomeA = (a.nome || a.titulo || '').toLocaleLowerCase();
        const nomeB = (b.nome || b.titulo || '').toLocaleLowerCase();
        const regexLetra = /^[a-zá-úà-ùãõâêîôûç]/i;
        const aLetra = regexLetra.test(nomeA);
        const bLetra = regexLetra.test(nomeB);
        if (aLetra && !bLetra) return -1;
        if (!aLetra && bLetra) return 1;
        return nomeA.localeCompare(nomeB, 'pt-BR');
      });

      resultadosFiltrados.forEach(item => {
        const li = criarItemResultado(item);
        // Se quiser exibir a natureza no futuro, descomente a linha abaixo:
        // if (item.natureza) {
        //   const spanNatureza = document.createElement('span');
        //   spanNatureza.textContent = ` (${item.natureza})`;
        //   spanNatureza.style.fontWeight = 'normal';
        //   spanNatureza.style.color = '#a593c6';
        //   li.appendChild(spanNatureza);
        // }
        listaResultados.appendChild(li);
      });

    } else {
      // Aba laboratórios (filtra por áreas)
      const dadosObj = dadosLaboratorios;
      const mostrarTodos = areasSelecionadas.size === 0;
      const resultadosFiltrados = [];

      if (mostrarTodos) {
        areas.forEach(area => {
          const listaArea = dadosObj[area] || [];
          listaArea.forEach(item => {
            if (filtrarPorNatureza(item) && filtrarPorTexto(item)) {
              resultadosFiltrados.push(item);
            }
          });
        });
      } else {
        areasSelecionadas.forEach(areaSelecionada => {
          const listaArea = dadosObj[areaSelecionada] || [];
          listaArea.forEach(item => {
            if (filtrarPorNatureza(item) && filtrarPorTexto(item)) {
              resultadosFiltrados.push(item);
            }
          });
        });
      }

      if (resultadosFiltrados.length === 0) {
        listaResultados.innerHTML = '<li style="color:#666;">Nenhum resultado encontrado.</li>';
        return;
      }

      // Ordena alfabeticamente pelo nome
      resultadosFiltrados.sort((a, b) => {
        const nomeA = (a.nome || a.titulo || '').toLocaleLowerCase();
        const nomeB = (b.nome || b.titulo || '').toLocaleLowerCase();
        return nomeA.localeCompare(nomeB, 'pt-BR');
      });

      resultadosFiltrados.forEach(item => {
        const li = criarItemResultado(item);
        listaResultados.appendChild(li);
      });
    }
  }
  // Normaliza o nome para aparecer no front
  function capitalizarNome(texto) {
  if (!texto || typeof texto !== 'string') return '';

  //excessões 
  const palavrasMinusculas = new Set([
    'de', 'da', 'do', 'das', 'dos',
    'e', 'em', 'com', 'para', 'por', 'a', 'o', 'as', 'os'
  ]);

   // Se tiver " - " (com espaço): capitaliza só antes
  if (texto.includes(' - ')) {
    const partes = texto.split(' - ');
    const antes = partes[0];
    const depois = partes.slice(1).join(' - '); // preserva se houver mais de um " - "

    const capitalizadoAntes = antes
      .toLowerCase()
      .split(' ')
      .map((palavra, i) => {
        return (i === 0 || !palavrasMinusculas.has(palavra))
          ? palavra.charAt(0).toUpperCase() + palavra.slice(1)
          : palavra;
      })
      .join(' ');

    return `${capitalizadoAntes} - ${depois}`;
  }

  // Se tiver hífen SEM espaço (ex: lab-val), não altera
  if (texto.includes('-')) {
    return texto;
  }

  // Capitaliza nome inteiro, respeitando preposições
  return texto
    .toLowerCase()
    .split(' ')
    .map((palavra, i) => {
      return (i === 0 || !palavrasMinusculas.has(palavra))
        ? palavra.charAt(0).toUpperCase() + palavra.slice(1)
        : palavra;
    })
    .join(' ');
}



  // Cria o elemento li para o resultado (link para detalhe)
  function criarItemResultado(item) {
    const li = document.createElement('li');
    li.textContent = capitalizarNome(item.nome); // Isso formatará o texto exibido, mesmo que o JSON tenha "LABORATORIO DE Matematica" ou qualquer outra variação de caixa.
    li.classList.add('item');
    li.style.cursor = 'pointer';

    li.addEventListener('click', () => {
      window.location.href = `detalhe.html?id=${encodeURIComponent(item.id)}`;
    });

    return li;
  }

  // Busca via botão ou tecla Enter
  function realizarBusca() {
    const termo = searchBar.value.trim();
    if (termo.length > 0) {
      window.location.href = `menubusca.html?q=${encodeURIComponent(termo)}`;
    }
  }

  botaoBusca.addEventListener('click', realizarBusca);

  searchBar.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      realizarBusca();
    }
  });

  // Inicializa carregamento dos dados
  carregarDados();

});