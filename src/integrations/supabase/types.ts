export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      ateliers: {
        Row: {
          active: boolean | null
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          sector: Database["public"]["Enums"]["document_sector"]
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          sector: Database["public"]["Enums"]["document_sector"]
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          sector?: Database["public"]["Enums"]["document_sector"]
        }
        Relationships: [
          {
            foreignKeyName: "ateliers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_liaisons: {
        Row: {
          client_id: string
          created_at: string | null
          created_by: string | null
          liaison_id: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          created_by?: string | null
          liaison_id: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          created_by?: string | null
          liaison_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_liaisons_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_liaisons_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_liaisons_liaison_id_fkey"
            columns: ["liaison_id"]
            isOneToOne: false
            referencedRelation: "liaisons"
            referencedColumns: ["id"]
          },
        ]
      }
      document_pages: {
        Row: {
          created_at: string | null
          document_id: string | null
          id: string
          image_path: string
          page_number: number
          text_content: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          document_id?: string | null
          id?: string
          image_path: string
          page_number: number
          text_content?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          document_id?: string | null
          id?: string
          image_path?: string
          page_number?: number
          text_content?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_pages_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          atelier_id: string | null
          client_visible: boolean | null
          created_at: string | null
          created_by: string | null
          document_type: Database["public"]["Enums"]["document_type"]
          extracted_text: Json | null
          file_name: string
          file_path: string
          id: string
          liaison_id: string | null
          ocr_completed_at: string | null
          ocr_error: string | null
          ocr_status: string | null
          operation_id: string | null
          processed: boolean | null
          processed_at: string | null
          processed_by: string | null
          sector: Database["public"]["Enums"]["document_sector"]
          status: string | null
          total_pages: number | null
          updated_at: string | null
        }
        Insert: {
          atelier_id?: string | null
          client_visible?: boolean | null
          created_at?: string | null
          created_by?: string | null
          document_type: Database["public"]["Enums"]["document_type"]
          extracted_text?: Json | null
          file_name: string
          file_path: string
          id?: string
          liaison_id?: string | null
          ocr_completed_at?: string | null
          ocr_error?: string | null
          ocr_status?: string | null
          operation_id?: string | null
          processed?: boolean | null
          processed_at?: string | null
          processed_by?: string | null
          sector: Database["public"]["Enums"]["document_sector"]
          status?: string | null
          total_pages?: number | null
          updated_at?: string | null
        }
        Update: {
          atelier_id?: string | null
          client_visible?: boolean | null
          created_at?: string | null
          created_by?: string | null
          document_type?: Database["public"]["Enums"]["document_type"]
          extracted_text?: Json | null
          file_name?: string
          file_path?: string
          id?: string
          liaison_id?: string | null
          ocr_completed_at?: string | null
          ocr_error?: string | null
          ocr_status?: string | null
          operation_id?: string | null
          processed?: boolean | null
          processed_at?: string | null
          processed_by?: string | null
          sector?: Database["public"]["Enums"]["document_sector"]
          status?: string | null
          total_pages?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_atelier_id_fkey"
            columns: ["atelier_id"]
            isOneToOne: false
            referencedRelation: "ateliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_liaison_id_fkey"
            columns: ["liaison_id"]
            isOneToOne: false
            referencedRelation: "liaisons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      image_tests: {
        Row: {
          created_at: string | null
          error: string | null
          extracted_text: string | null
          id: string
          image_path: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          error?: string | null
          extracted_text?: string | null
          id?: string
          image_path: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          error?: string | null
          extracted_text?: string | null
          id?: string
          image_path?: string
          status?: string | null
        }
        Relationships: []
      }
      liaisons: {
        Row: {
          active: boolean | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          name: string
          reference_code: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          reference_code: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          reference_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "liaisons_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean | null
          created_at: string | null
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      document_sector: "Embarquement" | "SAT" | "Cable"
      document_status: "pending" | "processing" | "completed" | "error"
      document_type: "Qualité" | "Mesures" | "Production"
      user_role: "admin" | "operator" | "client"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
