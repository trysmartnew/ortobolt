f = 'src/App.tsx'
content = open(f, encoding='utf-8').read()

old_block = (
    '    // Listener de mudanças de auth — usa refs, nunca stale\n'
    '    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {\n'
    '  if (session?.user) {\n'
    '    setSessionRef.current(session.user);\n'
    '  }\n'
    '\n'
    '    // TRATAMENTO DE LOGOUT\n'
    '    if (event === \'SIGNED_OUT\') {\n'
    '      logoutRef.current();\n'
    '    }\n'
    '\n'
    '    // ATUALIZAÇÃO DE TOKEN\n'
    '    if (event === \'TOKEN_REFRESHED\' && session?.user) {\n'
    '      setSessionRef.current(session.user);\n'
    '    }\n'
    '  }\n'
    ');'
)

new_block = (
    '    // Listener de mudanças de auth — usa refs, nunca stale\n'
    '    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {\n'
    '      if (session?.user) {\n'
    '        setSessionRef.current(session.user);\n'
    '      }\n'
    '      // CONTROLE DE rememberMe — token já gravado aqui, timing correto\n'
    '      if (event === \'SIGNED_IN\' && session?.user) {\n'
    '        const remember = sessionStorage.getItem(\'ortobolt_remember_me\');\n'
    '        if (remember === \'0\') {\n'
    '          const projectRef = import.meta.env.VITE_SUPABASE_URL\n'
    '            .replace(\'https://\', \'\').split(\'.\')[0];\n'
    '          const key = `sb-${projectRef}-auth-token`;\n'
    '          const token = localStorage.getItem(key);\n'
    '          if (token) {\n'
    '            sessionStorage.setItem(key, token);\n'
    '            localStorage.removeItem(key);\n'
    '          }\n'
    '          sessionStorage.removeItem(\'ortobolt_remember_me\');\n'
    '        }\n'
    '      }\n'
    '      // TRATAMENTO DE LOGOUT\n'
    '      if (event === \'SIGNED_OUT\') {\n'
    '        logoutRef.current();\n'
    '      }\n'
    '      // ATUALIZAÇÃO DE TOKEN\n'
    '      if (event === \'TOKEN_REFRESHED\' && session?.user) {\n'
    '        setSessionRef.current(session.user);\n'
    '      }\n'
    '    }\n'
    ');'
)

if old_block in content:
    content = content.replace(old_block, new_block)
    print('✅ onAuthStateChange atualizado com controle rememberMe')
else:
    print('⚠️  Bloco não encontrado')

open(f, 'w', encoding='utf-8').write(content)
print('✅ App.tsx salvo')
