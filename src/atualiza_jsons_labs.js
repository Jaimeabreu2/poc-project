// Script Node.js para atualizar os arquivos JSON de laboratórios a partir do Mapeamento.txt

const fs   = require('fs/promises');
const fs2  = require('fs');
const path = require('path');

// Mapeamento das áreas para arquivos JSON (inclui 'todas')
const AREA_TO_JSON = {
  "todas": "laboratorios.json",
  "ciências humanas": "laboratorios_ciencias_humanas.json",
  "ciências exatas e da terra": "laboratorios_ciencias_exatas_e_da_terra.json",
  "ciências biológicas": "laboratorios_ciencias_biologicas.json",
  "ciências da saúde": "laboratorios_ciencias_da_saude.json",
  "ciências agrárias": "laboratorios_ciencias_agrarias.json",
  "ciências sociais aplicadas": "laboratorios_ciencias_sociais_aplicadas.json"
};

// keys permitidas no JSON final
const ALLOWED_KEYS = [
  'nome','descricao','responsavel','lattes',
  'email','telefone','site','localizacao',
  'area','natureza','vinculado','horario',
  'parcerias','equipe','infraestrutura','tags'
];

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

    // pega apenas nome e área; detalhes virão de Mapeamento.txt
    const lab = {
      nome,
      area: busca('Área de Conhecimento:\\s*([^\\n]+)', block, 'i') || ''
    };
    if (lab.area) labs.push(lab);
  }
  // dedupe pelo nome exato
  const unique = {};
  labs.forEach(l => { unique[l.nome.trim()] = l; });
  return Object.values(unique);
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

// utilitário de normalização (remove acentos e pontuação)
function normalizeKey(s) {
  return (s||'')
    .normalize('NFD')                   // separa letras + acentos
    .replace(/[\u0300-\u036f]/g, '')    // remove acentos
    .replace(/[^\w\s]/g, '')            // remove símbolos (hífens, etc.)
    .toLowerCase()
    .trim();
}

// conta campos preenchidos em um objeto (usado no dedupe)
function countFilled(obj) {
  return Object.values(obj).filter(v => v !== undefined && v !== '').length;
}

// 1) parseMapping ajustado para usar normalizeKey em headers e keys
function parseMapping(text) {
  const map = {};
  let currentKey = '';
  let descLines = null;

  text.split(/\r?\n/).forEach(line => {
    const ln = line.trim();
    // novo bloco
    if (/^(LABORATÓRIO|CENTRO)/.test(ln)) {
      // salva descrição pendente
      if (currentKey && descLines) {
        map[currentKey].descricao = descLines.join(' ').trim();
        descLines = null;
      }
      currentKey = normalizeKey(ln);
      map[currentKey] = {};
    }
    else if (/^DESCRIÇÃO\b/i.test(ln) && currentKey) {
     // inicia captura de descrição multilinha
      descLines = [];
    }
    else if (descLines !== null) {
     // continua capturando até encontrar uma chave padrão ou fim
     if (ln === '' || /^[A-ZÁÉÍÓÚÃÕ ]+:/i.test(ln)) {
       // finaliza descrição
       map[currentKey].descricao = descLines.join(' ').trim();
       descLines = null;
       // cai para processar linha como KV, se for o caso
     }
     if (descLines) {
       descLines.push(ln);
       return;
     }
    }
    else if (currentKey) {
      const kv = ln.match(/^([^:]+):\s*(.+)$/);
      if (kv) {
        const key = normalizeKey(kv[1]);
        map[currentKey][key] = kv[2].trim();
      }
    }
  });

// caso descrição fique em aberto até o fim do arquivo
 if (currentKey && descLines) {
   map[currentKey].descricao = descLines.join(' ').trim();
 }

  return map;
}

// 1) carrega mapeamento e gera labDetails global
const mappingTxt = fs2.readFileSync(path.join(__dirname,'Mapeamento.txt'),'utf8');
const labDetails = parseMapping(mappingTxt);

// 4) salvaJsons e dedupeJsonFiles usam labDetails...
async function salvaJsons(agrupados, baseDir) {
  for (const area of Object.keys(agrupados)) {
    const filePath = path.join(baseDir, AREA_TO_JSON[area]);
    let existentes = [];
    try { existentes = JSON.parse(await fs.readFile(filePath,'utf8')); }
    catch {}

    // pré-preenche existentes
    existentes.forEach(exist => {
      const info = labDetails[normalizeKey(exist.nome)];
      if (info) Object.entries(info).forEach(([k,v])=>{
        if (!exist[k] && v) exist[k] = v;
      });
    });

    // mescla novos labs e atualiza campos vazios
    let added = 0, updated = 0;
    agrupados[area].forEach(lab => {
      const key = normalizeKey(lab.nome);
      const idx = existentes.findIndex(e=>normalizeKey(e.nome)===key);
      if (idx>=0) {
        Object.entries(lab).forEach(([k,v])=>{
          if (!existentes[idx][k] && v) {
            existentes[idx][k]=v; updated++;
          }
        });
      } else {
        existentes.push(lab); added++;
      }
    });

    // dedupe final priorizando mais campos preenchidos
    const byName = {};
    existentes.forEach(l=>{
      const key = normalizeKey(l.nome);
      if (!byName[key] || countFilled(l)>countFilled(byName[key])) {
        byName[key]=l;
      }
    });
    const finalList = Object.values(byName);
    
    // valida e limpa chaves extras
    finalList.forEach(lab => {
      if (!lab.nome || !lab.area) {
        console.warn(`Lab inválido (sem nome ou área):`, lab);
      }
    });
    const cleaned = finalList.map(lab => {
      const obj = {};
      ALLOWED_KEYS.forEach(k => {
        if (lab[k] !== undefined) obj[k] = lab[k];
      });
      return obj;
    });

    await fs.writeFile(filePath, JSON.stringify(cleaned, null, 2));
    console.log(`Área "${area}": total único ${cleaned.length}.`);
  }
}

async function dedupeJsonFiles(baseDir) {
  for (const file of Object.values(AREA_TO_JSON)) {
    const filePath = path.join(baseDir, file);
    let existentes = [];
    try { existentes = JSON.parse(await fs.readFile(filePath,'utf-8')); }
    catch {}

    // dedupe final priorizando mais campos preenchidos
    const byName = {};
    existentes.forEach(l=>{
      const key = normalizeKey(l.nome);
      if (!byName[key] || countFilled(l)>countFilled(byName[key])) {
        byName[key]=l;
      }
    });
    const finalList = Object.values(byName);
    
    await fs.writeFile(filePath, JSON.stringify(finalList,null,2));
    console.log(`Arquivo "${file}": total único ${finalList.length}.`);
  }
}

(async function main(){
  try {
    const baseDir = __dirname;
    // 2) lê e agrupa stubs de labs
    const txt   = await fs.readFile(path.join(baseDir,'Mapeamento.txt'),'utf8');
    const labs  = parseLabs(txt);
    const agrup = agrupaPorArea(labs);
    // inclui 'todas' para atualizar laboratorios.json
    agrup['todas'] = labs;

    // 3) pré-merge de detalhes antes de salvar
    labs.forEach(lab => {
      const info = labDetails[normalizeKey(lab.nome)];
      if (info) Object.assign(lab, info);
    });

    // 4) grava e 5) dedupe final
    await salvaJsons(agrup, baseDir);
    await dedupeJsonFiles(baseDir);

    console.log('Atualização concluída.');
  } catch (err) {
    console.error('Erro na atualização:', err.message);
  }
})();