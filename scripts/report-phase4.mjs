import fs from 'fs';
import path from 'path';

const srcDir = path.resolve('src');
const patterns = [
  { search: /#0056b3/g, token: 'primary' },
  { search: /#001a40/g, token: 'navy' },
  { search: /#001941/g, token: 'navy' },
  { search: /#004494/g, token: 'primary-dark' },
  { search: /#002d6b/g, token: 'navy-gradient' },
  { search: /#38BDF8/g, token: 'accent' },
  { search: /#0066cc/g, token: 'primary-mid' },
  { search: /#003d8f/g, token: 'navy-mid' }
];

function walk(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const res = path.resolve(dir, entry.name);
    if (entry.isDirectory()) walk(res, files);
    else if (entry.isFile() && (res.endsWith('.tsx') || res.endsWith('.ts'))) files.push(res);
  }
  return files;
}

const files = walk(srcDir);
const report = {};

for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');
  const fileMatches = [];

  lines.forEach((line, index) => {
    for (const p of patterns) {
      const matches = line.match(p.search);
      if (matches) {
        fileMatches.push({ 
          line: index + 1, 
          token: p.token, 
          search: matches[0], 
          count: matches.length,
          content: line.trim() 
        });
      }
    }
  });

  if (fileMatches.length > 0) {
    report[path.relative(process.cwd(), file)] = fileMatches;
  }
}

console.log('=== RELATORIO FASE 4 - OCORRENCIAS RESTANTES ===');
console.log(`Arquivos afetados: ${Object.keys(report).length}\n`);
for (const [file, matches] of Object.entries(report)) {
  const total = matches.reduce((sum, m) => sum + m.count, 0);
  console.log(`📄 ${file} (${total} ocorrencias)`);
  for (const m of matches) {
    console.log(`   L${m.line}: [${m.token}] ${m.search} (${m.count}x) -> "${m.content.substring(0, 110)}${m.content.length > 110 ? '...' : ''}"`);
  }
  console.log('');
}
