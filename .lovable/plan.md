

# Plano do App TUSVA - Terreiro de Umbanda Senhora dos Ventos e das Almas

## Visao Geral

App completo para gestao do terreiro com dois perfis: **Mae de Santo (admin)** e **Filhos da casa (membros)**. Conectado ao Supabase para autenticacao, banco de dados e notificacoes.

## Estrutura do App

```text
/login              - Tela de login
/                   - Dashboard (diferente para admin vs filho)
/calendario         - Calendario de giras, festas, reunioes
/escalas            - Escalas de limpeza
/avisos             - Mural de avisos/notificacoes
/estudos            - Area de estudos (conteudos da mae de santo)
/estudos/:id        - Conteudo individual de estudo
/perfil             - Perfil do usuario
/admin/membros      - (admin) Gerenciar filhos da casa
/admin/cadastrar    - (admin) Cadastrar novo filho
/reset-password     - Redefinir senha
```

## Banco de Dados (Supabase)

**Tabelas:**
- `profiles` - nome, telefone, avatar, nome_espiritual, data_entrada
- `user_roles` - controle admin/membro (tabela separada, conforme regras de seguranca)
- `eventos` - giras, festas, reunioes (tipo, data, hora, descricao, local)
- `escalas_limpeza` - data, responsaveis (array de user_ids), status
- `avisos` - titulo, conteudo, criado_por, data, prioridade
- `estudos` - titulo, conteudo (texto rico), imagens, categoria, criado_por, data
- `categorias_estudo` - ex: "Firmezas", "Tronos", "Fundamentos"

## Funcionalidades por Fase

### Fase 1 - Base (implementacao inicial)
1. **Conectar Supabase** e criar tabelas/RLS
2. **Autenticacao** - Login por email/senha. Mae de santo cadastra os filhos (cria conta para eles)
3. **Layout principal** - Sidebar/bottom nav com logo TUSVA, navegacao, tema escuro com cores do terreiro (roxo/dourado)
4. **Dashboard** - Resumo do proximo evento, proximo turno de limpeza, avisos recentes

### Fase 2 - Funcionalidades Core
5. **Calendario** - Admin cria/edita eventos (giras, festas, reunioes). Filhos visualizam
6. **Escalas de limpeza** - Admin monta escalas, filhos veem suas responsabilidades
7. **Avisos** - Admin publica avisos, aparecem como notificacoes dentro do app (badge no sino)
8. **Gerenciar membros** - Admin cadastra/remove filhos, atribui funcoes

### Fase 3 - Estudos
9. **Area de estudos** - Admin cria conteudos com texto e imagens (ex: "Como firmar o anjo da guarda", "Trono da Lei")
10. **Categorias** - Organizar estudos por tema

## Design/UI

- Tema escuro principal com acentos em roxo e dourado (remetendo a Umbanda)
- Logo do terreiro (imagem enviada) no topo/sidebar
- Mobile-first (PWA-ready) - maioria vai acessar pelo celular
- Icones tematicos com Lucide React
- Componentes shadcn/ui existentes

## Detalhes Tecnicos

- Supabase Auth para login, Supabase Database para dados
- RLS em todas as tabelas (admin pode tudo, membros so leem)
- Funcao `has_role` para checar admin sem recursao no RLS
- React Router para navegacao, TanStack Query para dados
- Notificacoes in-app com badge counter (sem push por ora)
- Responsivo com bottom navigation no mobile

## Ordem de Implementacao

Vou comecar pela Fase 1 completa (Supabase + auth + layout + dashboard), depois avancar para as funcionalidades.

