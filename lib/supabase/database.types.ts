// Read-model types for this migration subset. Regenerate from the local DB after migration validation.
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: { display_name?: string | null };
        Relationships: [];
      };
      workspaces: {
        Row: {
          id: string;
          name: string;
          type: 'personal' | 'household';
          created_by: string | null;
          deleted_at: string | null;
          purge_after: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type: 'personal' | 'household';
          created_by?: string | null;
          deleted_at?: string | null;
          purge_after?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: { name?: string };
        Relationships: [];
      };
      workspace_members: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          role: 'owner' | 'member';
          status: 'active' | 'removed';
          joined_at: string;
          removed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          role: 'owner' | 'member';
          status?: 'active' | 'removed';
          joined_at?: string;
          removed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          role?: 'owner' | 'member';
          status?: 'active' | 'removed';
          removed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'workspace_members_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      consume_otp_limit: {
        Args: { operation: string; email_hash: string; ip_hash: string; challenge_id: string };
        Returns: { allowed: boolean; retry_after?: number };
      };
      ensure_personal_workspace: { Args: never; Returns: undefined };
      ensure_household_workspace: { Args: never; Returns: string };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
