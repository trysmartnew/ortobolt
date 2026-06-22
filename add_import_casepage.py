Set-Content -Path scripts\add_import_casepage.py -Value @'
from pathlib import Path

file = Path('src/pages/CasePage.tsx')
lines = file.read_text(encoding='utf-8').split('\n')

# Verificar se já existe nos imports (corretamente)
has_import = any(
    line.startswith('import') and 'uploadImageToStorage' in line 
    for line in lines
)

if has_import:
    print('✅ uploadImageToStorage já está importado')
else:
    # Encontrar último import e inserir após
    last_import_idx = -1
    for i, line in enumerate(lines):
        if line.startswith('import'):
            last_import_idx = i
    
    if last_import_idx >= 0:
        lines.insert(last_import_idx + 1, "import { uploadImageToStorage } from '@/services/imageService';")
        file.write_text('\n'.join(lines), encoding='utf-8')
        print('✅ Import adicionado: uploadImageToStorage')
    else:
        print('❌ Nenhum import encontrado')
'@