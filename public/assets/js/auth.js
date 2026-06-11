import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const config = window.APP_CONFIG;

export const supabase = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_ANON_KEY
);

const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const loginSlogan = document.getElementById("loginSlogan");
const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");

const loginSlogans = [
  "Entrena, mide tu progreso y sigue avanzando",
  "Tu compromiso hoy es su éxito mañana.",
  "Presentes en cada paso, desde el primer día.",
  "Acompañar no es una tarea, es nuestra promesa.",
  "Expertos en guiar, apasionados por servir.",
  "La excelencia se nota en los detalles que cuidas.",
  "Somos el equipo que hace el entrenamiento más humano."
];

function getRandomSloganIndex(currentIndex = -1) {
  if (loginSlogans.length <= 1) {
    return 0;
  }

  let nextIndex = Math.floor(Math.random() * loginSlogans.length);

  while (nextIndex === currentIndex) {
    nextIndex = Math.floor(Math.random() * loginSlogans.length);
  }

  return nextIndex;
}

if (loginSlogan) {
  let sloganIndex = getRandomSloganIndex();
  loginSlogan.textContent = `"${loginSlogans[sloganIndex]}"`;

  window.setInterval(() => {
    loginSlogan.classList.add("is-changing");

    window.setTimeout(() => {
      sloganIndex = getRandomSloganIndex(sloganIndex);
      loginSlogan.textContent = `"${loginSlogans[sloganIndex]}"`;

      window.requestAnimationFrame(() => {
        loginSlogan.classList.remove("is-changing");
      });
    }, 800);
  }, 5000);
}

if (togglePassword && passwordInput) {
  togglePassword.addEventListener("click", () => {
    const shouldShowPassword = passwordInput.type === "password";

    passwordInput.type = shouldShowPassword ? "text" : "password";
    togglePassword.setAttribute("aria-pressed", String(shouldShowPassword));
    togglePassword.setAttribute(
      "aria-label",
      shouldShowPassword ? "Ocultar contraseña" : "Mostrar contraseña"
    );
  });
}

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
