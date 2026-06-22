Set-Content -Path scripts\audit_realtime.py -Value @'
from pathlib import Path
import os

print("=" * 70)
print("AUDITORIA: Supabase Realtime no projeto")
print("=" * 70)

# 1. Verificar configuração do Supabase
print("\n[1] Configuração do Supabase (src/services/supabase.ts)...")
supabase_file = Path('src/services/supabase.ts')
if supabase_file.exists():
    content = supabase_file.read_text(encoding='utf-8')
    lines = content.split('\n')
    
    # Procurar por channel, subscribe, realtime
    for i, line in enumerate(lines, 1):
        if any(keyword in line.lower() for keyword in ['channel', 'subscribe', 'realtime', 'on(']):
            print(f"  {i}: {line.strip()[:120]}")
else:
    print("  ❌ Arquivo não encontrado")

# 2. Verificar uso de Realtime em componentes
print("\n[2] Uso de Realtime em componentes...")
src_dir = Path('src')
for root, dirs, files in os.walk(src_dir):
    if 'node_modules' in root:
        continue
    for file in files:
        if file.endswith(('.ts', '.tsx')):
            path = Path(root) / file
            try:
                content = path.read_text(encoding='utf-8')
                if 'channel' in content.lower() or 'subscribe' in content.lower():
                    print(f"\n  Arquivo: {path}")
                    lines = content.split('\n')
                    for i, line in enumerate(lines, 1):
                        if 'channel' in line.lower() or 'subscribe' in line.lower():
                            print(f"    {i}: {line.strip()[:120]}")
            except:
                pass

# 3. Verificar estrutura do ClinicalCase no Supabase
print("\n[3] Estrutura do ClinicalCase (tipos)...")
types_file = Path('src/types/index.ts')
if types_file.exists():
    content = types_file.read_text(encoding='utf-8')
    lines = content.split('\n')
    in_interface = False
    for i, line in enumerate(lines, 1):
        if 'interface ClinicalCase' in line:
            in_interface = True
            print(f"  {i}: {line}")
        elif in_interface:
            print(f"  {i}: {line}")
            if '}' in line:
                break

print("\n" + "=" * 70)
print("AUDITORIA CONCLUÍDA")
print("=" * 70)
'@