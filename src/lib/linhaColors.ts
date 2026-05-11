// Mapa central das cores das linhas espirituais — TUSVA (Iansã Balé)
// Cada linha tem: gradiente (classe utilitária), badge (bg+text), borda e emoji.

export type LinhaKey =
  | "caboclos"
  | "pretos_velhos"
  | "eres"
  | "baianos"
  | "marinheiros"
  | "boiadeiros"
  | "ciganos"
  | "malandragem"
  | "esquerda";

export const linhaLabel: Record<string, string> = {
  caboclos: "Caboclos",
  pretos_velhos: "Pretos Velhos",
  eres: "Erês",
  baianos: "Baianos",
  marinheiros: "Marinheiros",
  boiadeiros: "Boiadeiros",
  ciganos: "Ciganos",
  malandragem: "Malandragem",
  esquerda: "Exu & Pombagira",
};

export const linhaEmoji: Record<string, string> = {
  caboclos: "🪶",
  pretos_velhos: "🕯️",
  eres: "🍭",
  baianos: "🌴",
  marinheiros: "⚓",
  boiadeiros: "🐂",
  ciganos: "🔮",
  malandragem: "🎩",
  esquerda: "🔥",
};

// Gradiente forte (para hero/banner)
export const linhaGradient: Record<string, string> = {
  caboclos: "bg-linha-caboclos",
  pretos_velhos: "bg-linha-pretos-velhos",
  eres: "bg-linha-eres",
  baianos: "bg-linha-baianos",
  marinheiros: "bg-linha-marinheiros",
  boiadeiros: "bg-linha-boiadeiros",
  ciganos: "bg-linha-ciganos",
  malandragem: "bg-linha-malandros",
  esquerda: "bg-linha-esquerda",
};

// Badge sutil (chip) — fundo translúcido e texto contrastado
export const linhaBadge: Record<string, string> = {
  caboclos: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30",
  pretos_velhos: "bg-zinc-500/15 text-zinc-800 dark:text-zinc-200 border border-zinc-500/30",
  eres: "bg-pink-500/15 text-pink-700 dark:text-pink-300 border border-pink-500/30",
  baianos: "bg-yellow-500/15 text-yellow-800 dark:text-yellow-300 border border-yellow-500/30",
  marinheiros: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30",
  boiadeiros: "bg-amber-700/15 text-amber-800 dark:text-amber-300 border border-amber-700/30",
  ciganos: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-500/30",
  malandragem: "bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30",
  esquerda: "bg-red-900/15 text-red-900 dark:text-red-300 border border-red-900/30",
};

// Texto sobre o gradiente forte
export const linhaOnGradientText: Record<string, string> = {
  caboclos: "text-white",
  pretos_velhos: "text-white",
  eres: "text-white",
  baianos: "text-zinc-900",
  marinheiros: "text-sky-900",
  boiadeiros: "text-amber-50",
  ciganos: "text-white",
  malandragem: "text-white",
  esquerda: "text-white",
};

export function linhaInfo(linha?: string | null) {
  const key = (linha ?? "") as LinhaKey;
  return {
    label: linhaLabel[key] ?? linha ?? "Linha",
    emoji: linhaEmoji[key] ?? "✨",
    gradient: linhaGradient[key] ?? "bg-gradient-vinho",
    badge: linhaBadge[key] ?? "bg-secondary text-muted-foreground border border-border",
    onGradient: linhaOnGradientText[key] ?? "text-white",
  };
}
