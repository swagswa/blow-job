import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://neccxqidnhpijsvlcsbn.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lY2N4cWlkbmhwaWpzdmxjc2JuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxOTUxMTMsImV4cCI6MjA4ODc3MTExM30.SGRTtxZI_FAKwRYvZpmC0IZZEpQb3tBZpL7kXRHMkcU";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
