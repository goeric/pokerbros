// Database types for Supabase
export type Database = {
  public: {
    Tables: {
      players: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          nickname: string | null;
          email: string;
          totalIn: number;
          totalOut: number;
          gamesPlayed: number;
          biggestWin: number;
          biggestLoss: number;
          createdAt: string;
        };
        Insert: {
          id?: string;
          first_name: string;
          last_name: string;
          nickname?: string | null;
          email: string;
          totalIn?: number;
          totalOut?: number;
          gamesPlayed?: number;
          biggestWin?: number;
          biggestLoss?: number;
          createdAt?: string;
        };
        Update: {
          id?: string;
          first_name?: string;
          last_name?: string;
          nickname?: string | null;
          email?: string;
          totalIn?: number;
          totalOut?: number;
          gamesPlayed?: number;
          biggestWin?: number;
          biggestLoss?: number;
          createdAt?: string;
        };
      };
      admin_users: {
        Row: {
          id: string;
          email: string;
          is_superadmin: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          is_superadmin?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          is_superadmin?: boolean;
          created_at?: string;
        };
      };
    };
  };
};
