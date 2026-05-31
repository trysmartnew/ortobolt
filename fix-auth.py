f = 'src/contexts/AppContext.tsx'
content = open(f, encoding='utf-8').read()

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

old_sign = 'await supabase.auth.signInWithPassword({ email, password });'
new_sign = 'await supabase.auth.signInWithPassword({ email, password, options: { persistSession: rememberMe } });'

if old_block in content:
    content = content.replace(old_block, '')
    print('✅ Bloco manual removido')
else:
    print('⚠️  Bloco não encontrado — verifique indentação')

if old_sign in content:
    content = content.replace(old_sign, new_sign)
    print('✅ signInWithPassword atualizado')
else:
    print('⚠️  Linha signIn não encontrada')

open(f, 'w', encoding='utf-8').write(content)
print('✅ Arquivo salvo')
