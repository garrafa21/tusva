import React, { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  isLoading: boolean;
  profile: { nome: string; nome_espiritual: string | null; avatar_url: string | null } | null;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  isAdmin: false,
  isLoading: true,
  profile: null,
  signOut: async () => {},
});

const funcoesGiraLabel: Record<string, string> = {
  porteira: "Porteira",
  senha_chamar: "Senha (Chamar Consulente)",
  senha_direcionar: "Senha (Direcionar Consulente)",
  apoio_conga: "Apoio Congá",
};

const limpezaLabel: Record<string, string> = {
  cozinha: "Cozinha",
  banheiro: "Banheiro",
  espaco_kids: "Espaço Kids",
  conga: "Congá",
  salao: "Salão",
  escada: "Escada",
  lixos: "Lixos",
};

const linhaEspiritualLabel: Record<string, string> = {
  caboclos: "Caboclos",
  pretos_velhos: "Pretos Velhos",
  eres: "Erês",
  baianos: "Baianos",
  marinheiros: "Marinheiros",
  boiadeiros: "Boiadeiros",
  ciganos: "Ciganos",
  malandragem: "Malandragem",
  esquerda: "Esquerda",
};

async function showSystemNotification(title: string, body: string) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;

  try {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.showNotification(title, {
          body,
          icon: "/logo-tusva.jpg",
          badge: "/favicon.ico",
        });
        return;
      }
    }
  } catch {
    // fallback below
  }

  new Notification(title, { body, icon: "/logo-tusva.jpg" });
}

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<AuthContextType["profile"]>(null);

  const fetchUserData = async (userId: string) => {
    const [roleResult, profileResult] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle(),
      supabase.from("profiles").select("nome, nome_espiritual, avatar_url").eq("user_id", userId).maybeSingle(),
    ]);
    setIsAdmin(!!roleResult.data);
    if (profileResult.data) {
      setProfile(profileResult.data);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        setTimeout(() => fetchUserData(session.user.id), 0);
      } else {
        setIsAdmin(false);
        setProfile(null);
      }
      setIsLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserData(session.user.id);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) return;

    const userId = session.user.id;

    const channel = supabase
      .channel(`user-notifications-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "avisos" },
        (payload) => {
          const aviso = payload.new as { prioridade?: string; titulo?: string };
          const prioridade = (aviso.prioridade ?? "normal").toUpperCase();
          void showSystemNotification(`Você tem um aviso ${prioridade}`, aviso.titulo ?? "Novo aviso disponível");
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "eventos" },
        (payload) => {
          const evento = payload.new as { titulo?: string; tipo?: string; linha?: string };
          const linha = evento.linha ? (linhaEspiritualLabel[evento.linha] ?? evento.linha) : evento.titulo ?? "Linha";
          const isGira = evento.tipo === "gira" || evento.tipo === "desenvolvimento";

          if (isGira) {
            void showSystemNotification(`GIRA DE ${String(linha).toUpperCase()}`, "CONFIRME SUA PRESENÇA!");
            return;
          }

          void showSystemNotification("Novo evento cadastrado", evento.titulo ?? "Confira o calendário");
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "escalas_limpeza" },
        (payload) => {
          const escala = payload.new as { responsaveis?: string[]; tipo_escala?: string; funcao?: string; descricao?: string };
          const responsaveis = escala.responsaveis ?? [];
          if (!responsaveis.includes(userId)) return;

          const tipo = escala.tipo_escala === "gira" ? "Limpeza pós-gira" : "Limpeza fim de semana";
          const funcao = escala.funcao ? (limpezaLabel[escala.funcao] ?? escala.funcao) : "Limpeza geral";
          void showSystemNotification("Nova escala para você", `${tipo}: ${funcao}${escala.descricao ? ` — ${escala.descricao}` : ""}`);
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "cambones" },
        (payload) => {
          const cambone = payload.new as { cambone_user_id?: string };
          if (cambone.cambone_user_id !== userId) return;
          void showSystemNotification("Nova atribuição", "Você foi escalado como cambone.");
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "funcoes_gira" },
        (payload) => {
          const funcao = payload.new as { user_id?: string; funcao?: string };
          if (funcao.user_id !== userId) return;
          void showSystemNotification("Nova função na gira", `Sua função: ${funcoesGiraLabel[funcao.funcao ?? ""] ?? funcao.funcao ?? "Função"}`);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [session?.user]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, isAdmin, isLoading, profile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
