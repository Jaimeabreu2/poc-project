// Script Node.js para atualizar os arquivos JSON de laboratórios a partir do Mapeamento.txt

const fs = require('fs/promises');
const path = require('path');

// Mapeamento das áreas para arquivos JSON
const AREA_TO_JSON = {
  "ciências humanas": "laboratorios_ciencias_humanas.json",
  "ciências exatas e da terra": "laboratorios_ciencias_exatas_e_da_terra.json",
  "ciências biológicas": "laboratorios_ciencias_biologicas.json",
  "ciências da saúde": "laboratorios_ciencias_da_saude.json",
  "ciências agrárias": "laboratorios_ciencias_agrarias.json",
  "ciências sociais aplicadas": "laboratorios_ciencias_sociais_aplicadas.json"
};

function normalizarArea(area) {
  area = (area || '').toLowerCase();
  for (const k of Object.keys(AREA_TO_JSON)) {
    if (area.includes(k)) return k;
  }
  return null;
}

function busca(regex, bloco, flags = '') {
  const m = bloco.match(new RegExp(regex, flags));
  return m ? m[1].trim() : '';
}

function buscaMultiplos(regex, bloco, flags = '') {
  const matches = [];
  const re = new RegExp(regex, flags + 'g');
  let m;
  while ((m = re.exec(bloco))) {
    matches.push(m[1].trim());
  }
  return matches;
}

function parseLabs(txt) {
  const labs = [];
  // Divide por blocos de laboratório (nome em maiúsculas e LABORATÓRIO ou CENTRO)
  const blocks = txt.split(/\n(?=(LABORAT[ÓO]RIO|CENTRO)[^\n]*\n)/g).filter(b => b.trim().length > 0);
  for (let block of blocks) {
    const lines = block.split('\n');
    const nome = lines[0].trim();
    if (!nome.match(/^(LABORAT[ÓO]RIO|CENTRO)/)) continue;
    const bloco = block;

    const lab = { nome };

    // Sempre pega a descrição do laboratório do bloco do Mapemento.txt
    lab.descricao = busca('DESCRIÇÃO\\n([\\s\\S]+?)(?:\\n[A-Z]{3,}|$)', bloco, 'i') || '';
    lab.responsavel = busca('Coordenação:\\s*([^\\n\\(]+)', bloco, 'i');
    lab.lattes = busca('Lattes\\s*-\\s*(https?://[^\\s\\)]+)', bloco, 'i');
    lab.email = busca('E-mail:\\s*([^\\s]+)', bloco, 'i');
    lab.telefone = busca('Telefone:\\s*([^\\n]+)', bloco, 'i');
    lab.site = busca('Site:\\s*([^\\s]+)', bloco, 'i');
    lab.localizacao = busca('Endereço:\\s*([^\\n]+)', bloco, 'i');
    lab.area = busca('Área de Conhecimento:\\s*([^\\n]+)', bloco, 'i');
    lab.natureza = busca('Natureza:\\s*([^\\n]+)', bloco, 'i');
    lab.vinculado = busca('Vinculado:\\s*([^\\n]+)', bloco, 'i');
    lab.horario = busca('Horário de Funcionamento:\\s*([^\\n]+)', bloco, 'i');
    lab.parcerias = buscaMultiplos('PARCERIAS\\s*(?:Interna:|Externa:)?\\s*([\\s\\S]+?)(?:\\n[A-Z]{3,}|$)', bloco, 'i');
    lab.equipe = busca('EQUIPE\\n([\\s\\S]+?)(?:\\n[A-Z]{3,}|$)', bloco, 'i');
    lab.infraestrutura = busca('INFRAESTRUTURA\\n([\\s\\S]+?)(?:\\n[A-Z]{3,}|$)', bloco, 'i');
    lab.tags = [];

    // Tenta pegar tags a partir de "Áreas de Atuação" ou "tags" explícitas
    let tags = busca('Áreas de Atuação:\\s*([^\\n]+)', bloco, 'i');
    if (tags) {
      lab.tags = tags.split(/[;,\/]/).map(t => t.trim()).filter(Boolean);
    }

    // Adiciona se tiver área válida
    if (lab.area) labs.push(lab);
  }
  return labs;
}

function agrupaPorArea(labs) {
  const agrupados = {};
  for (const k of Object.keys(AREA_TO_JSON)) agrupados[k] = [];
  for (const lab of labs) {
    const area = normalizarArea(lab.area);
    if (area) agrupados[area].push(lab);
  }
  return agrupados;
}

async function salvaJsons(agrupados, baseDir) {
  for (const area of Object.keys(agrupados)) {
    const labs = agrupados[area];
    const filePath = path.join(baseDir, AREA_TO_JSON[area]);
    let existentes = [];
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      existentes = JSON.parse(data);
    } catch (e) { /* arquivo pode não existir */ }
    // Garante nomes únicos (case-insensitive)
    const nomesExistentes = new Set(existentes.map(l => (l.nome || '').toLowerCase().trim()));
    // Adicione apenas labs novos (não repetidos)
    const novos = labs.filter(l => !nomesExistentes.has((l.nome || '').toLowerCase().trim()));
    // Junte existentes + novos, mas garanta que não há duplicados finais
    const todos = [...existentes];
    for (const lab of novos) {
      if (!todos.some(l => (l.nome || '').toLowerCase().trim() === (lab.nome || '').toLowerCase().trim())) {
        todos.push(lab);
      }
    }
    // Salve todos os labs únicos no JSON da área
    await fs.writeFile(
      filePath,
      JSON.stringify(todos, null, 2)
    );
  }
}

async function main() {
  const baseDir = __dirname;
  const txtPath = path.join(baseDir, 'Mapeamento.txt');
  const txt = await fs.readFile(txtPath, 'utf-8');
  const labs = parseLabs(txt);
  const agrupados = agrupaPorArea(labs);
  await salvaJsons(agrupados, baseDir);
  console.log('Atualização concluída.');
}

if (require.main === module) {
  main();
}