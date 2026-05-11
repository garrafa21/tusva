export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      avisos: {
        Row: {
          conteudo: string
          created_at: string
          criado_por: string | null
          id: string
          lido_por: string[]
          prioridade: Database["public"]["Enums"]["prioridade_aviso"]
          titulo: string
        }
        Insert: {
          conteudo: string
          created_at?: string
          criado_por?: string | null
          id?: string
          lido_por?: string[]
          prioridade?: Database["public"]["Enums"]["prioridade_aviso"]
          titulo: string
        }
        Update: {
          conteudo?: string
          created_at?: string
          criado_por?: string | null
          id?: string
          lido_por?: string[]
          prioridade?: Database["public"]["Enums"]["prioridade_aviso"]
          titulo?: string
        }
        Relationships: []
      }
      cambones: {
        Row: {
          cambone_user_id: string
          created_at: string
          criado_por: string | null
          evento_id: string
          id: string
          medium_user_id: string
        }
        Insert: {
          cambone_user_id: string
          created_at?: string
          criado_por?: string | null
          evento_id: string
          id?: string
          medium_user_id: string
        }
        Update: {
          cambone_user_id?: string
          created_at?: string
          criado_por?: string | null
          evento_id?: string
          id?: string
          medium_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cambones_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias_estudo: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      confirmacoes_presenca: {
        Row: {
          created_at: string
          evento_id: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          evento_id: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          evento_id?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "confirmacoes_presenca_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
        ]
      }
      entidades: {
        Row: {
          categoria: string
          como_trabalha: string | null
          created_at: string
          descricao: string | null
          elementos: string | null
          id: string
          medium_user_id: string | null
          nome: string
        }
        Insert: {
          categoria: string
          como_trabalha?: string | null
          created_at?: string
          descricao?: string | null
          elementos?: string | null
          id?: string
          medium_user_id?: string | null
          nome: string
        }
        Update: {
          categoria?: string
          como_trabalha?: string | null
          created_at?: string
          descricao?: string | null
          elementos?: string | null
          id?: string
          medium_user_id?: string | null
          nome?: string
        }
        Relationships: []
      }
      ervas_banhos: {
        Row: {
          created_at: string
          descricao: string | null
          dia_semana: number | null
          evento_id: string | null
          finalidade: string | null
          id: string
          imagem_url: string | null
          linha: string | null
          titulo: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          dia_semana?: number | null
          evento_id?: string | null
          finalidade?: string | null
          id?: string
          imagem_url?: string | null
          linha?: string | null
          titulo: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          dia_semana?: number | null
          evento_id?: string | null
          finalidade?: string | null
          id?: string
          imagem_url?: string | null
          linha?: string | null
          titulo?: string
        }
        Relationships: []
      }
      escalas_limpeza: {
        Row: {
          created_at: string
          criado_por: string | null
          data: string
          descricao: string | null
          funcao: string | null
          id: string
          responsaveis: string[]
          status: string
          tipo_escala: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          criado_por?: string | null
          data: string
          descricao?: string | null
          funcao?: string | null
          id?: string
          responsaveis?: string[]
          status?: string
          tipo_escala?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          criado_por?: string | null
          data?: string
          descricao?: string | null
          funcao?: string | null
          id?: string
          responsaveis?: string[]
          status?: string
          tipo_escala?: string
          updated_at?: string
        }
        Relationships: []
      }
      estudos: {
        Row: {
          categoria_id: string | null
          conteudo: string
          created_at: string
          criado_por: string | null
          id: string
          imagem_url: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          categoria_id?: string | null
          conteudo: string
          created_at?: string
          criado_por?: string | null
          id?: string
          imagem_url?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          categoria_id?: string | null
          conteudo?: string
          created_at?: string
          criado_por?: string | null
          id?: string
          imagem_url?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estudos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_estudo"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos: {
        Row: {
          created_at: string
          criado_por: string | null
          data_fim: string | null
          data_inicio: string
          descricao: string | null
          id: string
          linha: string | null
          local: string | null
          tipo: Database["public"]["Enums"]["tipo_evento"]
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          criado_por?: string | null
          data_fim?: string | null
          data_inicio: string
          descricao?: string | null
          id?: string
          linha?: string | null
          local?: string | null
          tipo?: Database["public"]["Enums"]["tipo_evento"]
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          criado_por?: string | null
          data_fim?: string | null
          data_inicio?: string
          descricao?: string | null
          id?: string
          linha?: string | null
          local?: string | null
          tipo?: Database["public"]["Enums"]["tipo_evento"]
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      funcoes_gira: {
        Row: {
          created_at: string
          criado_por: string | null
          evento_id: string
          funcao: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          criado_por?: string | null
          evento_id: string
          funcao: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          criado_por?: string | null
          evento_id?: string
          funcao?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "funcoes_gira_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
        ]
      }
      mensalidades: {
        Row: {
          created_at: string
          data_pagamento: string | null
          data_vencimento: string
          id: string
          mes_referencia: string
          status: string
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          created_at?: string
          data_pagamento?: string | null
          data_vencimento: string
          id?: string
          mes_referencia: string
          status?: string
          updated_at?: string
          user_id: string
          valor?: number
        }
        Update: {
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string
          id?: string
          mes_referencia?: string
          status?: string
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      notification_vapid_keys: {
        Row: {
          created_at: string
          id: number
          private_key: string
          public_key: string
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: number
          private_key: string
          public_key: string
          subject?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          private_key?: string
          public_key?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      prayer_requests: {
        Row: {
          created_at: string
          descricao: string | null
          expires_at: string
          id: string
          titulo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          expires_at?: string
          id?: string
          titulo: string
          user_id: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          expires_at?: string
          id?: string
          titulo?: string
          user_id?: string
        }
        Relationships: []
      }
      prayer_supports: {
        Row: {
          created_at: string
          id: string
          request_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          request_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          request_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prayer_supports_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "prayer_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          data_entrada: string | null
          data_nascimento: string | null
          id: string
          nome: string
          nome_espiritual: string | null
          telefone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          data_entrada?: string | null
          data_nascimento?: string | null
          id?: string
          nome: string
          nome_espiritual?: string | null
          telefone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          data_entrada?: string | null
          data_nascimento?: string | null
          id?: string
          nome?: string
          nome_espiritual?: string | null
          telefone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_seen_at: string
          p256dh: string
          platform: string | null
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_seen_at?: string
          p256dh: string
          platform?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_seen_at?: string
          p256dh?: string
          platform?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      reposicao_itens: {
        Row: {
          created_at: string
          id: string
          is_custom: boolean
          nome: string
          reposicao_id: string
          requires_color: boolean
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_custom?: boolean
          nome: string
          reposicao_id: string
          requires_color?: boolean
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_custom?: boolean
          nome?: string
          reposicao_id?: string
          requires_color?: boolean
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "reposicao_itens_reposicao_id_fkey"
            columns: ["reposicao_id"]
            isOneToOne: false
            referencedRelation: "reposicoes"
            referencedColumns: ["id"]
          },
        ]
      }
      reposicao_respostas: {
        Row: {
          color_detail: string | null
          created_at: string
          id: string
          reposicao_item_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color_detail?: string | null
          created_at?: string
          id?: string
          reposicao_item_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color_detail?: string | null
          created_at?: string
          id?: string
          reposicao_item_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reposicao_respostas_reposicao_item_id_fkey"
            columns: ["reposicao_item_id"]
            isOneToOne: false
            referencedRelation: "reposicao_itens"
            referencedColumns: ["id"]
          },
        ]
      }
      reposicoes: {
        Row: {
          created_at: string
          created_by: string
          descricao: string | null
          expires_at: string
          id: string
          status: string
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          descricao?: string | null
          expires_at?: string
          id?: string
          status?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          descricao?: string | null
          expires_at?: string
          id?: string
          status?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_server_now: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      mark_aviso_lido: { Args: { _aviso_id: string }; Returns: undefined }
      set_mensalidade_status: {
        Args: { _mensalidade_id: string; _status: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "membro" | "escala"
      prioridade_aviso: "normal" | "importante" | "urgente"
      tipo_evento:
        | "gira"
        | "festa"
        | "reuniao"
        | "outro"
        | "desenvolvimento"
        | "caboclos"
        | "pretos_velhos"
        | "eres"
        | "baianos"
        | "marinheiros"
        | "boiadeiros"
        | "ciganos"
        | "malandragem"
        | "esquerda"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "membro", "escala"],
      prioridade_aviso: ["normal", "importante", "urgente"],
      tipo_evento: [
        "gira",
        "festa",
        "reuniao",
        "outro",
        "desenvolvimento",
        "caboclos",
        "pretos_velhos",
        "eres",
        "baianos",
        "marinheiros",
        "boiadeiros",
        "ciganos",
        "malandragem",
        "esquerda",
      ],
    },
  },
} as const
