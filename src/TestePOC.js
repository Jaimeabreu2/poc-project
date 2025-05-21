let laboratorios = [];
let areaSelecionada = "todas";

// Normaliza strings para busca
function normalizar(str) {
  return str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
}

// Carrega arquivo JSON de laboratórios
function carregarLaboratorios(arquivo) {
  console.log('Tentando carregar arquivo:', arquivo);
  fetch(arquivo)
    .then(res => {
      if (!res.ok) {
        alert('Erro ao carregar ' + arquivo + '. Verifique se o arquivo existe e está acessível.');
        throw new Error('Erro ao carregar ' + arquivo + ': status ' + res.status);
      }
      return res.json();
    })
    .then(data => {
      laboratorios = data;
      console.log('Laboratórios carregados:', laboratorios);
      mostrarResultados();
    })
    .catch(err => {
      alert('Erro ao carregar ou processar ' + arquivo + '.\nDicas:\n- Verifique se o arquivo está na mesma pasta do HTML.\n- Se estiver usando file://, rode um servidor local.\n- Veja detalhes no console.');
      console.error(err);
    });
}

// Altere o caminho para buscar o JSON no mesmo diretório do JS
carregarLaboratorios('laboratorios.json');

const searchBar = document.getElementById('search-bar');
const resultsList = document.getElementById('results');
const filterBtns = document.querySelectorAll('.filter-btn');

searchBar.addEventListener('input', mostrarResultados);

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    areaSelecionada = btn.dataset.area;
    mostrarResultados();
  });
});

document.addEventListener('DOMContentLoaded', () => {
  resultsList.style.maxHeight = '400px';
  resultsList.style.overflowY = 'auto';
  resultsList.style.border = '1px solid #eee';
  resultsList.style.marginTop = '10px';
  resultsList.style.padding = '0 8px';
});

// Mostra resultados filtrados
function mostrarResultados() {
  const query = normalizar(searchBar.value);
  resultsList.innerHTML = '';

  let filtrados = laboratorios.filter(lab => {
    const areaSelNorm = normalizar(areaSelecionada);
    let matchArea = areaSelNorm === "todas";
    if (!matchArea) {
      if (Array.isArray(lab.filtros)) {
        matchArea = lab.filtros.map(normalizar).includes(areaSelNorm);
      } else {
        const areaLabNorm = normalizar(lab.area);
        matchArea = areaLabNorm === areaSelNorm;
      }
    }
    if (query === '') {
      return matchArea;
    } else {
      const matchTexto = normalizar(lab.nome).includes(query) ||
        (lab.tags && lab.tags.some(tag => normalizar(tag).includes(query)));
      return matchArea && matchTexto;
    }
  });

  if (query === '') {
    filtrados = filtrados.slice(0, 10);
  } else {
    filtrados = filtrados.slice(0, 20);
  }

  if (filtrados.length > 0) {
    filtrados.forEach(lab => {
      const li = document.createElement('li');
      li.innerHTML = `<strong>${lab.nome}</strong><br><small>${lab.area}</small>`;
      resultsList.appendChild(li);
    });
  } else {
    resultsList.innerHTML = `<li>Nenhum resultado encontrado para o filtro <b>${areaSelecionada}</b>.</li>`;
  }
}