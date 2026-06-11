import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const config = window.APP_CONFIG;

export const supabase = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_ANON_KEY
);

const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  loginError.textContent = "";

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    loginError.textContent = "Correo o contraseña incorrectos.";
    return;
  }

  window.location.href = "/index.html";
});