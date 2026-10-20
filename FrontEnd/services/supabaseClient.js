import { createClient } from "@supabase/supabase-js";

// Supabase project values, hardcoded on purpose (class project).
// The anon/publishable key is public: it is meant to be shipped to the browser.
const SUPABASE_URL = "https://equpjznhzqkbhnnhpzbo.supabase.co";
// TODO: paste the anon/publishable key (Dashboard → Project Settings → API)
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxdXBqem5oenFrYmhubmhwemJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4MzA0NDUsImV4cCI6MjEwNzQwNjQ0NX0.i4mBMfeH9vTE7ceYwj0XXuth-esdszztv0ZlwlLfyGg";

// The client stores and refreshes the session in the browser.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
