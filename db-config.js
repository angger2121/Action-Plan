// Database Configuration Keys (SUPABASE)
// Pisahkan file ini jika Anda ingin melakukan migrasi database.

const SUPABASE_URL = "https://vurksyaosszzmbnqrvtr.supabase.co";
const SUPABASE_KEY = "sb_publishable_qWftA7MPfUC-_e-s4U13Sg_B2yhwiup";

window.supabaseClient = null;

if (typeof window.supabase !== 'undefined') {
  window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}
