import { createClient } from "@supabase/supabase-js";

export const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
export const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

export const TMDB_API_KEY = import.meta.env.PUBLIC_TMDB_API_KEY;
export const OMDB_API_KEY = import.meta.env.PUBLIC_OMDB_API_KEY;

export const db = createClient(supabaseUrl, supabaseAnonKey);