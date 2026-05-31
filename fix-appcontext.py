f = 'src/contexts/AppContext.tsx'
content = open(f, encoding='utf-8').read()

# 1. Remover bloco manual de token
old_block = (
    '    if (!rememberMe) {\n'
    '      const projectRef = import.meta.env.VITE_SUPABASE_URL\n'
    '        .replace(\'https://\', \'\').split(\'.\')[0];\n'
    '      const key = `sb-${projectRef}-auth-token`;\n'
    '      const token = localStorage.getItem(key);\n'
    '      if (token) {\n'
    '        sessionStorage.setItem(key, token);\n'
    '        localStorage.removeItem(key);\n'
    '      }\n'
    '    }'
)

# 2. Substituir pelo flag simples no sessionStorage
new_block = "    sessionStorage.setItem('ortobolt_remember_me', rememberMe ? '1' : '0');"

if old_block in content:
    content = content.replace(old_block, new_block)
    print('✅ Bloco manual substituído por flag sessionStorage')
else:
    print('⚠️  Bloco não encontrado — verifique indentação')

open(f, 'w', encoding='utf-8').write(content)
print('✅ AppContext.tsx salvo')
