f = 'src/services/supabase.ts'
content = open(f, encoding='utf-8').read()

new_function = '''
export async function upsertUserProfile(supaUser: {
  id: string;
  email?: string | null;
  user_metadata?: { full_name?: string; name?: string; avatar_url?: string };
}): Promise<void> {
  const name = supaUser.user_metadata?.full_name
    || supaUser.user_metadata?.name
    || supaUser.email?.split('@')[0]
    || 'Usuário';
  const avatar = supaUser.user_metadata?.avatar_url ?? null;
  await supabase.from('users').upsert(
    {
      id:           supaUser.id,
      email:        supaUser.email ?? null,
      name,
      avatar,
      role:         'veterinarian',
      specialty:    'Ortopedia Veterinária',
      crmv:         '',
      institution:  '',
      preferences: {
        notifications: true,
        theme:         'light',
        language:      'pt',
        autoAnalysis:  true,
        reportFormat:  'pdf',
      },
    },
    { onConflict: 'id', ignoreDuplicates: true }
  );
}
'''

# Adicionar função ao final do arquivo
if 'upsertUserProfile' not in content:
    content = content.rstrip() + '\n' + new_function
    print('✅ upsertUserProfile adicionada')
else:
    print('⚠️  upsertUserProfile já existe')

open(f, 'w', encoding='utf-8').write(content)
print('✅ supabase.ts salvo')
