f = 'src/contexts/AppContext.tsx'
content = open(f, encoding='utf-8').read()

# 1. Adicionar upsertUserProfile ao import
old_import = 'import { supabase, fetchUserProfile } from \'@/services/supabase\';'
new_import = 'import { supabase, fetchUserProfile, upsertUserProfile } from \'@/services/supabase\';'

if old_import in content:
    content = content.replace(old_import, new_import)
    print('✅ import atualizado')
else:
    print('⚠️  import não encontrado')

# 2. Atualizar setUserFromSession para upsert antes de fetch
old_session = (
    'const setUserFromSession = useCallback(async (supaUser: { id: string }) => {\n'
    '    if (!supaUser.id) {\n'
    '      setAuthLoading(false);\n'
    '      return;\n'
    '    }\n'
    '    \n'
    '    const profile = await fetchUserProfile(supaUser.id);\n'
    '    if (profile) {\n'
    '      setUser(profile);\n'
    '      setIsLoggedIn(true);\n'
    '      setCurrentView(\'app\');\n'
    '    }\n'
    '    setAuthLoading(false);\n'
    '  }, []);'
)

new_session = (
    'const setUserFromSession = useCallback(async (supaUser: { id: string; email?: string | null; user_metadata?: Record<string, string> }) => {\n'
    '    if (!supaUser.id) {\n'
    '      setAuthLoading(false);\n'
    '      return;\n'
    '    }\n'
    '    await upsertUserProfile(supaUser);\n'
    '    const profile = await fetchUserProfile(supaUser.id);\n'
    '    if (profile) {\n'
    '      setUser(profile);\n'
    '      setIsLoggedIn(true);\n'
    '      setCurrentView(\'app\');\n'
    '    }\n'
    '    setAuthLoading(false);\n'
    '  }, []);'
)

if old_session in content:
    content = content.replace(old_session, new_session)
    print('✅ setUserFromSession atualizado')
else:
    print('⚠️  setUserFromSession não encontrado')

open(f, 'w', encoding='utf-8').write(content)
print('✅ AppContext.tsx salvo')
