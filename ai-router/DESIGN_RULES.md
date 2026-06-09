# Regras de Design do OrtoBolt

## REGRAS OBRIGATÓRIA: REUTILIZAÇÃO DE COMPONENTES

A Central NUNCA deve criar novos componentes visuais quando um equivalente já existir em src/components/ui.tsx.

Componentes disponíveis (uso obrigatório):
- Button, Card, Input, Modal, Badge, Avatar, Select, Textarea

Antes de criar qualquer elemento visual:
1. Verifique se já existe em src/components/ui.tsx
2. USE APENAS componentes existentes
3. É PROIBIDO criar novos componentes visuais duplicados
