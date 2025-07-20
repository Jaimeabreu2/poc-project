const fs   = require('fs/promises');
const path = require('path');

(async () => {
  const dir   = __dirname;
  const files = (await fs.readdir(dir))
    .filter(f => f.startsWith('laboratorios_') && f.endsWith('.json'));

  for (const file of files) {
    const filePath = path.join(dir, file);
    const data     = await fs.readFile(filePath, 'utf-8');
    const labs     = JSON.parse(data);
    const counts   = labs.reduce((m, lab) => {
      const key = (lab.nome||'').trim().toLowerCase();
      m[key] = (m[key]||0) + 1;
      return m;
    }, {});

    const dupes = Object.entries(counts).filter(([,c]) => c > 1);
    if (dupes.length) {
      console.log(`\n${file}: encontrou ${dupes.length} nome(s) duplicado(s):`);
      dupes.forEach(([nome, c]) =>
        console.log(`  • "${nome}" → ${c} vezes`)
      );
    } else {
      console.log(`\n${file}: nenhum lab repetido.`);
    }
  }
})();
