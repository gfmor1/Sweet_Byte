import { createClient } from "@supabase/supabase-js";

// Supabase project values, hardcoded on purpose (class project).
// The anon/publishable key is public: it is meant to be shipped to the browser.
const SUPABASE_URL = "https://equpjznhzqkbhnnhpzbo.supabase.co";
// TODO: paste the anon/publishable key (Dashboard → Project Settings → API)
const SUPABASE_ANON_KEY = "PASTE_ANON_KEY_HERE";

// The client stores and refreshes the session in the browser.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
