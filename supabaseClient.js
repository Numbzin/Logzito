// supabaseClient.js
const { createClient } = require("@supabase/supabase-js");

// Copie essas duas informações do painel do Supabase
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; // service_role key

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

module.exports = { supabase };
