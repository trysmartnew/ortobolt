path = "src/pages/GalleryPage.tsx"

with open(path, "rb") as f:
    raw = f.read()

lines = raw.splitlines(keepends=True)

idx = 264  # linha 265 (1-indexed)
target = lines[idx]
eol = target[len(target.rstrip(b"\r\n")):]  # preserva o terminador desta linha
stripped = target.rstrip(b"\r\n")

old_line = '              <div className="relative">'.encode("utf-8")

if stripped == old_line:
    new_texts = [
        '              <div',
        '                className="relative cursor-pointer"',
        '                onClick={() => openCase(c)}',
        '                title="Abrir Colaboração Clínica"',
        '              >',
    ]
    new_lines = [t.encode("utf-8") + eol for t in new_texts]
    lines = lines[:idx] + new_lines + lines[idx + 1:]
    with open(path, "wb") as f:
        f.write(b"".join(lines))
    print(f"OK: linha 265 substituida por 5 linhas. Novo total: {len(lines)} linhas.")
else:
    print("ABORTADO: linha 265 nao corresponde ao esperado, nada foi alterado.")
    print("Conteudo atual da linha 265 (repr):", repr(stripped))