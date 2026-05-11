import { cn } from "@/lib/utils";

const palette = [
  "bg-vinho text-vinho-foreground",
  "bg-gradient-vinho text-white",
  "bg-gradient-gold text-vinho",
  "bg-zinc-800 text-white",
  "bg-rose-700 text-white",
  "bg-amber-600 text-white",
  "bg-stone-700 text-white",
];

function hashCode(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h << 5) - h + str.charCodeAt(i);
  return Math.abs(h);
}

function initials(name?: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type Props = {
  name?: string | null;
  src?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  ring?: "none" | "gold" | "vinho";
  className?: string;
};

const sizeMap = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-14 h-14 text-base",
  xl: "w-20 h-20 text-xl",
};

const ringMap = {
  none: "",
  gold: "ring-2 ring-gold/70 ring-offset-2 ring-offset-background",
  vinho: "ring-2 ring-primary/70 ring-offset-2 ring-offset-background",
};

export function UserAvatar({ name, src, size = "md", ring = "none", className }: Props) {
  const colorIdx = hashCode(name ?? "?") % palette.length;
  const colorClass = palette[colorIdx];

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center overflow-hidden font-semibold shrink-0 shadow-card",
        sizeMap[size],
        ringMap[ring],
        !src && colorClass,
        className,
      )}
      title={name ?? undefined}
    >
      {src ? (
        <img src={src} alt={name ?? ""} className="w-full h-full object-cover" />
      ) : (
        <span className="font-display tracking-tight">{initials(name)}</span>
      )}
    </div>
  );
}
