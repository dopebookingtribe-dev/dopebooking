// Hand-written to match supabase/migrations. Replace with generated types
// (`npx supabase gen types typescript --linked`) once the project is linked.

export type AppRole =
  | "customer"
  | "promoter"
  | "artist"
  | "seller"
  | "provider"
  | "staff"
  | "admin";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_path: string | null;
          country: string | null;
          phone: string | null;
          marketing_opt_in: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: {
          display_name?: string | null;
          avatar_path?: string | null;
          country?: string | null;
          phone?: string | null;
          marketing_opt_in?: boolean;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          user_id: string;
          role: AppRole;
          granted_by: string | null;
          created_at: string;
        };
        Insert: { user_id: string; role: AppRole; granted_by?: string | null };
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      has_role: { Args: { required: AppRole }; Returns: boolean };
      is_staff: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: { app_role: AppRole };
    CompositeTypes: Record<string, never>;
  };
};
