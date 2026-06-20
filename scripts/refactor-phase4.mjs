import fs from 'fs';
import path from 'path';

const cssPath = path.resolve('src/index.css');
let cssContent = fs.readFileSync(cssPath, 'utf-8');

// 1. Adicionar token navy-mid
if (!cssContent.includes('--color-navy-mid')) {
  cssContent = cssContent.replace(
    /--color-navy-gradient: #002d6b;/,
    '--color-navy-gradient: #002d6b;\n  --color-navy-mid: #003d8f;'
  );
  fs.writeFileSync(cssPath, cssContent, 'utf-8');
  console.log('✅ Token --color-navy-mid adicionado');
}

const srcDir = path.resolve('src');

// 2. Substituicoes em className
const classNameReplacements = [
  { search: /focus-within:ring-\[#0056b3\]/g, replace: 'focus-within:ring-primary' },
  { search: /to-\[#0056b3\]\/20/g, replace: 'to-primary/20' },
  { search: /border-\[#0056b3\]\s+border-t-transparent/g, replace: 'border-primary border-t-transparent' },
  // String JS especifica em ui.tsx
  { search: /'bg-\[#0056b3\]\s+text-white\s+hover:bg-\[#004494\]\s+focus:ring-\[#0056b3\]\s+shadow-sm'/g, replace: "'bg-primary text-white hover:bg-primary-dark focus:ring-primary shadow-sm'" }
];

// 3. Substituicoes em inline styles e strings JS (gradientes)
const styleReplacements = [
  { search: /#0056b3/g, replace: 'var(--color-primary)' },
  { search: /#004494/g, replace: 'var(--color-primary-dark)' },
  { search: /#001a40/g, replace: 'var(--color-navy)' },
  { search: /#001941/g, replace: 'var(--color-navy)' },
  { search: /#002d6b/g, replace: 'var(--color-navy-gradient)' },
  { search: /#003d8f/g, replace: 'var(--color-navy-mid)' },
  { search: /#38BDF8/g, replace: 'var(--color-accent)' }
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
let totalChanges = 0;

for (const file of files) {
  // Pular ProfilePage.tsx para preservar props do Recharts (stroke/fill)
  if (file.includes('ProfilePage.tsx')) continue;
  
  let content = fs.readFileSync(file, 'utf-8');
  const original = content;
  let fileChanges = 0;
  
  // Aplicar substituicoes em className
  const classNameRegex = /className=(["'`])([^"'`]*)\1|className=\{([^}]*)\}/g;
  content = content.replace(classNameRegex, (match, quote, staticClasses, dynamicExpr) => {
    if (staticClasses) {
      let newClasses = staticClasses;
      for (const r of classNameReplacements) {
        const matches = newClasses.match(r.search);
        if (matches) {
          fileChanges += matches.length;
          newClasses = newClasses.replace(r.search, r.replace);
        }
      }
      return `className=${quote}${newClasses}${quote}`;
    } else if (dynamicExpr) {
      let newExpr = dynamicExpr;
      for (const r of classNameReplacements) {
        const matches = newExpr.match(r.search);
        if (matches) {
          fileChanges += matches.length;
          newExpr = newExpr.replace(r.search, r.replace);
        }
      }
      return `className={${newExpr}}`;
    }
    return match;
  });
  
  // Aplicar substituicoes em inline styles (style={{ ... }}) e strings JS de gradientes
  // Regex para capturar style={{ ... }} ou style="..."
  const styleRegex = /style=\{\{([^}]*)\}\}|style=(["'])([^"']*)\2/g;
  content = content.replace(styleRegex, (match, inlineObj, quote, inlineStr) => {
    if (inlineObj) {
      let newObj = inlineObj;
      for (const r of styleReplacements) {
        const matches = newObj.match(r.search);
        if (matches) {
          fileChanges += matches.length;
          newObj = newObj.replace(r.search, r.replace);
        }
      }
      return `style={{${newObj}}}`;
    } else if (inlineStr) {
      let newStr = inlineStr;
      for (const r of styleReplacements) {
        const matches = newStr.match(r.search);
        if (matches) {
          fileChanges += matches.length;
          newStr = newStr.replace(r.search, r.replace);
        }
      }
      return `style=${quote}${newStr}${quote}`;
    }
    return match;
  });
  
  // Aplicar substituicoes em strings JS puras (ex: gradientes em objetos de configuracao)
  // Regex para capturar strings entre aspas simples ou duplas que contenham linear-gradient
  const gradientStringRegex = /(['"])linear-gradient\([^)]*\)\1/g;
  content = content.replace(gradientStringRegex, (match) => {
    let newStr = match;
    for (const r of styleReplacements) {
      const matches = newStr.match(r.search);
      if (matches) {
        fileChanges += matches.length;
        newStr = newStr.replace(r.search, r.replace);
      }
    }
    return newStr;
  });
  
  if (content !== original) {
    const openBraces = (content.match(/{/g) || []).length;
    const closeBraces = (content.match(/}/g) || []).length;
    
    if (openBraces !== closeBraces) {
      console.error(`❌ ERRO: Integridade comprometida em ${file}`);
      continue;
    }
    
    fs.writeFileSync(file, content, 'utf-8');
    totalChanges += fileChanges;
    console.log(`✅ ${path.relative(process.cwd(), file)}: ${fileChanges} alteracoes`);
  }
}

console.log(`\n=== RESUMO ===`);
console.log(`Total de substituicoes: ${totalChanges}`);
