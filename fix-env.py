f = '.env.local'
content = open(f, encoding='utf-8').read()

old_url = 'VITE_SUPABASE_URL=https://fhecacefkmnqtkdsldsy.supabase.co'
new_url = 'VITE_SUPABASE_URL=https://iatncfufdldzppmjwmvt.supabase.co'

if old_url in content:
    content = content.replace(old_url, new_url)
    print('✅ URL corrigida para projeto ativo')
else:
    print('⚠️  URL não encontrada')

open(f, 'w', encoding='utf-8').write(content)
print('✅ .env.local salvo')
