# 🌹 Reformulação TUSVA — Identidade Iansã Balé

Pacote grande com refinamento visual completo + 4 funcionalidades espirituais novas, agora alinhado às cores reais do terreiro e das entidades.

---

## 🎨 Nova paleta oficial do terreiro

**Identidade TUSVA (Iansã Balé):**
- **Branco** (base principal, pureza)
- **Vinho / Vermelho profundo** (cor primária, força de Iansã)
- **Dourado** (acento, detalhes nobres)
- **Preto** (contraste, elegância)

**Cores das linhas espirituais:**
| Linha | Cor principal | Cor secundária |
|---|---|---|
| Caboclos | Verde | — |
| Erês | Rosa | Azul claro |
| Pretos Velhos | Branco | Preto |
| Baianos | Amarelo | Preto |
| Marinheiros | Azul claro | Branco |
| Boiadeiros | Marrom | — |
| Ciganos | Laranja (multicolor opcional) | — |
| Malandros | Vermelho | Branco |
| Exu / Pombagira | Preto | Vermelho |

Cada linha terá um **gradiente de duas cores** + ícone próprio aplicado em cards, badges, banners de evento e Dashboard.

---

## 🎨 PARTE 1 — Reformulação Visual

### 1.1 Sistema de design refeito (`index.css` + `tailwind.config.ts`)
- Substituir tokens roxo/dourado atuais por:
  - `--primary`: vinho profundo (≈ HSL 350 70% 32%)
  - `--accent`: dourado (≈ HSL 42 80% 50%)
  - `--background`: branco quente
  - Modo escuro: preto profundo + vinho saturado + dourado luminoso
- Novos tokens de gradiente:
  - `--gradient-tusva`: vinho → dourado (header e CTAs principais)
  - `--gradient-iansa`: branco → vinho (banners hero)
  - Um gradiente por linha (`--gradient-caboclos`, `--gradient-eres`, etc.)
- Sombras elegantes: `--shadow-card`, `--shadow-elegant`, `--shadow-glow-gold`, `--shadow-glow-vinho`.
- Keyframes novos: `fade-in-up`, `scale-in`, `shimmer`, `float`, `glow-pulse`, `slide-indicator`.

### 1.2 Splash screen
- `SplashScreen.tsx` no primeiro carregamento: logo TUSVA centralizado, fundo branco com leve textura, halo dourado pulsante, fade-out em ~1.5s.

### 1.3 Skeleton loaders
- Substituir todos os `"Carregando..."` por skeletons em: Dashboard, Calendário, Escalas, Avisos, Estudos, Reposição, Financeiro, Admin.

### 1.4 Dashboard redesenhado
- **Saudação personalizada por horário** ("Boa noite, Mãe Tathi 🌙 Salve Iansã!").
- **Card grande "Próximo Evento":**
  - Fundo com gradiente da linha (ex: verde caboclos, rosa/azul erês).
  - Ícone grande da linha + nome + data formatada bonita.
  - **Countdown ao vivo** ("faltam 3 dias 4h 12min").
  - Botão "Confirmar presença" direto no card com efeito glow dourado ao clicar.
- **Grid de atalhos rápidos** com hover-scale, ícones em círculo dourado:
  - 🔔 Avisos novos (badge vermelho com contagem)
  - 📋 Escala da semana
  - 💰 Financeiro (status do mês)
  - 🎂 Aniversariantes
  - 🙏 Firmezas ativas
- Decorações sutis: pequenos elementos dourados nos cantos dos cards (estilo "fio de ouro").

### 1.5 Avatares coloridos (`UserAvatar.tsx`)
- Quando não há foto, mostra iniciais sobre fundo gerado pelo hash do nome usando paleta vinho/dourado/branco/preto.
- Borda dourada sutil para admins, vermelha para escala.
- Aplicado em: AppLayout, Dashboard, Avisos, Escalas, confirmações, Admin.

### 1.6 Animações de transição
- `PageTransition` — fade-in-up entre rotas.
- Stagger nas listas (Avisos, Calendário, Estudos, Firmezas).
- Feedback visual ao confirmar presença/votar/firmar (scale + glow dourado momentâneo).
- Toasts com ícone dourado.

### 1.7 Refinamentos gerais
- Bottom nav mobile com **indicador animado** (barra dourada que desliza para o item ativo).
- Header com leve gradiente vinho → vinho mais escuro (ou branco no light mode com borda dourada).
- Cards com `hover:shadow-elegant` + leve translateY.
- Botões primários com gradiente vinho → vinho escuro + brilho dourado no hover.
- Logo TUSVA recebe halo dourado sutil no header.
- Tipografia: títulos em Montserrat 700/800 com letter-spacing apertado para sensação "premium".

---

## ✨ PARTE 2 — Funcionalidades Espirituais Novas

### 2.1 Aniversariantes do mês
- Coluna `data_nascimento` (date, nullable) em `profiles`, editável em `/perfil`.
- Card no Dashboard "🎂 Aniversariantes do mês" com nome + dia, ordenado pelo próximo.
- Edge function `birthday-notify` (cron diário) envia push aos aniversariantes do dia.

### 2.2 Histórico pessoal de presença
- Seção em `/perfil`:
  - Total de giras confirmadas (lifetime).
  - Presenças últimos 30/90 dias.
  - % de comparecimento.
  - Linha mais frequentada (com cor da linha).
- Calculado a partir de `event_rsvps` + `events`.

### 2.3 Pedidos de firmeza/oração 🙏
- Tabelas:
  - `prayer_requests` (id, user_id, titulo, descricao, created_at, expires_at = +30d)
  - `prayer_supports` (id, request_id, user_id) — quem está firmando
- Nova página `/firmezas`:
  - Lista de pedidos ativos, cards brancos com fio de ouro e nome do solicitante.
  - Botão "🙏 Estou firmando" (toggle, mostra contagem de pessoas firmando).
  - Botão "Novo pedido" → modal título + descrição.
- RLS: todos autenticados leem/criam; só dono ou admin apaga.
- Auto-arquivamento após 30 dias.
- Notificação push opcional ao criar pedido (avisa todos).
- Adiciona item no menu mobile e desktop.

### 2.4 Banhos & Ervas da semana
- Nova aba dentro de `/estudos`: **"Banhos & Ervas"**.
- Tabela `ervas_banhos` (id, dia_semana 0-6, linha, titulo, descricao, finalidade).
- Cards com cor da linha do dia + ícone de erva, organizados por dia da semana.
- Admin cadastra/edita; todos leem.

---

## 🛠️ Detalhes técnicos

### Migrações
```sql
-- Aniversariantes
ALTER TABLE profiles ADD COLUMN data_nascimento date;

-- Firmezas
CREATE TABLE prayer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  titulo text NOT NULL,
  descricao text,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '30 days')
);
CREATE TABLE prayer_supports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES prayer_requests ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(request_id, user_id)
);
ALTER TABLE prayer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_supports ENABLE ROW LEVEL SECURITY;
-- Policies: select para autenticados; insert para próprio user_id;
-- delete para dono ou admin (has_role).

-- Banhos & Ervas
CREATE TABLE ervas_banhos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dia_semana smallint CHECK (dia_semana BETWEEN 0 AND 6),
  linha text,
  titulo text NOT NULL,
  descricao text,
  finalidade text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE ervas_banhos ENABLE ROW LEVEL SECURITY;
-- Select: autenticados. Insert/update/delete: admin.
```

### Edge function nova
- `birthday-notify` (cron diário 09:00 BRT) — busca aniversariantes do dia, envia push reaproveitando `push-send`.

### Arquivos novos
- `src/components/SplashScreen.tsx`
- `src/components/UserAvatar.tsx`
- `src/components/PageTransition.tsx`
- `src/components/skeletons/` (DashboardSkeleton, ListSkeleton, etc.)
- `src/pages/Firmezas.tsx`
- `src/lib/linhaColors.ts` (mapa central de cores das linhas)
- `supabase/functions/birthday-notify/index.ts`

### Arquivos modificados
- `src/index.css`, `tailwind.config.ts` — paleta vinho/dourado + gradientes + keyframes
- `src/App.tsx` — rota `/firmezas`, splash, page transitions
- `src/components/AppLayout.tsx` — header refinado, indicador animado, UserAvatar, novo item nav
- `src/pages/Dashboard.tsx` — redesign completo
- `src/pages/Perfil.tsx` — data nascimento + histórico
- `src/pages/Estudos.tsx` — aba Banhos & Ervas
- `src/pages/Calendario.tsx`, `Avisos.tsx`, `Escalas.tsx`, `Reposicao.tsx`, `Financeiro.tsx`, `AdminMembros.tsx` — skeletons + animações + UserAvatar + cores das linhas atualizadas

### Memórias a atualizar
- `mem://style/visual-direction` — nova paleta vinho/dourado/branco/preto
- `mem://index.md` Core — substituir "roxo" por "vinho/dourado, identidade Iansã Balé"
- Nova memória `mem://style/linha-colors` com mapa oficial das cores das entidades

---

## ⚠️ Observações
- Mantém timezone São Paulo, fonte Montserrat, login por username.
- Não muda lógica de auth, roles, escalas ou financeiro.
- Modo claro/escuro continuam funcionando, ambos com a nova identidade.
- Entrego em uma única leva; recomendo testar página por página depois.
