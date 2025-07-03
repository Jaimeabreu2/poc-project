const fs = require('fs');
const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('Uso: node validate-json.js <caminho1.json> [outro.json] …');
  process.exit(1);
}
files.forEach(file => {
  try {
    const text = fs.readFileSync(file, 'utf8');
    JSON.parse(text);
    console.log(`${file}: válido`);
  } catch (e) {
    console.error(`${file}: inválido → ${e.message}`);
  }
});
