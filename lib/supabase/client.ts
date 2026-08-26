import { createBrowserClient } from "@supabase/ssr";

const defaultUrl = "https://placeholder-project.supabase.co";
const defaultKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3NDI5NzYsImV4cCI6MjEwMjMxODk3Nn0.dummy";

export const createClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || defaultUrl;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || defaultKey;
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
};

export const supabase = createClient();


