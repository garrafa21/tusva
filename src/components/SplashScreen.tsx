import { useEffect, useState } from "react";

export function SplashScreen({ show }: { show: boolean }) {
  const [hidden, setHidden] = useState(!show);

  useEffect(() => {
    if (!show) {
      const t = setTimeout(() => setHidden(true), 450);
      return () => clearTimeout(t);
    }
    setHidden(false);
  }, [show]);

  if (hidden) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-gradient-dawn transition-opacity duration-500 ${
        show ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      <div className="relative flex flex-col items-center">
        <div className="absolute inset-0 -m-8 rounded-full bg-gradient-gold opacity-30 blur-3xl animate-glow-pulse" />
        <div className="relative animate-float">
          <img
            src="/logo-tusva.jpg"
            alt="TUSVA"
            className="w-28 h-28 rounded-full object-cover shadow-glow-gold ring-2 ring-gold/60"
          />
        </div>
        <p className="mt-6 font-display text-2xl tracking-widest text-gradient-vinho">TUSVA</p>
        <p className="mt-1 text-xs text-muted-foreground tracking-[0.4em] uppercase">Salve Iansã</p>
      </div>
    </div>
  );
}
