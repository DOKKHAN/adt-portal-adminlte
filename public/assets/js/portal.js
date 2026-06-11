import { supabase } from "./auth.js";

const modules = {
  home: {
    title: "Inicio",
    permission: "dashboard.view",
    url: null
  },
  routines: {
    title: "Rutinas",
    permission: "routines.create",
    url: "https://app.mizen.cl/app/mizen/login?branch=master&embed=true"
  },
  students: {
    title: "Alumnos",
    permission: "students.view",
    url: "https://app.mizen.cl/app/mizen/login?branch=master&embed=true"
  },
  evaluations: {
    title: "Evaluaciones",
    permission: "evaluations.create",
    url: "https://app.mizen.cl/app/mizen/login?branch=master&embed=true"
  },
  reports: {
    title: "Reportes",
    permission: "reports.view",
    url: "https://app.mizen.cl/app/mizen/login?branch=master&embed=true"
  },
  financial: {
    title: "Métricas financieras",
    permission: "financial_metrics.view",
    url: "https://app.mizen.cl/app/mizen/login?branch=master&embed=true"
  },
  users: {
    title: "Usuarios",
    permission: "users.manage",
    url: "https://app.mizen.cl/app/mizen/login?branch=master&embed=true"
  },
  settings: {
    title: "Configuración",
    permission: "settings.manage",
    url: "https://app.mizen.cl/app/mizen/login?branch=master&embed=true"
  }
};

const sidebarItems = [
  {
    label: "Inicio",
    module: "home",
    permission: "dashboard.view",
    icon: "bi-speedometer"
  },
  {
    label: "Rutinas",
    module: "routines",
    permission: "routines.create",
    icon: "bi-clipboard-check"
  },
  {
    label: "Alumnos",
    module: "students",
    permission: "students.view",
    icon: "bi-people"
  },
  {
    label: "Evaluaciones",
    module: "evaluations",
    permission: "evaluations.create",
    icon: "bi-activity"
  },
  {
    label: "Reportes",
    module: "reports",
    permission: "reports.view",
    icon: "bi-bar-chart"
  },
  {
    label: "Métricas financieras",
    module: "financial",
    permission: "financial_metrics.view",
    icon: "bi-cash-coin"
  },
  {
    label: "Usuarios",
    module: "users",
    permission: "users.manage",
    icon: "bi-person-gear"
  },
  {
    label: "Configuración",
    module: "settings",
    permission: "settings.manage",
    icon: "bi-gear"
  }
];

let currentPermissions = [];
let activeModule = "home";

async function initPortal() {
  const { data, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !data.session) {
    if (sessionError) {
      console.error("Error validando sesión:", sessionError);
    }
    window.location.href = "/login.html";
    return;
  }

  console.log("session.user.email:", data.session.user.email);

  const { data: permissionsData, error: permissionsError } = await supabase.rpc("get_my_permissions");

  if (permissionsError) {
    console.error("Error obteniendo permisos:", permissionsError);
    window.location.href = "/login.html";
    return;
  }

  console.log("permissionsData:", permissionsData);

  if (!permissionsData || permissionsData.length === 0) {
    await supabase.auth.signOut();
    window.location.href = "/login.html";
    return;
  }

  const profile = permissionsData[0];

  document.getElementById("userInfo").textContent =
    `${profile.full_name || profile.email} · ${profile.role}`;
  updateUserChrome(profile);

  currentPermissions = permissionsData.map((row) => row.permission_key);
  console.log("currentPermissions:", currentPermissions);

  renderSidebar();
}

function renderSidebar() {
  const sidebarMenu = document.getElementById("sidebarMenu");
  sidebarMenu.innerHTML = "";

  const allowedItems = sidebarItems.filter((item) =>
    currentPermissions.includes(item.permission)
  );
  console.log("allowed sidebar items:", allowedItems);

  for (const item of allowedItems) {
    const li = document.createElement("li");
    li.className = "nav-item";

    li.innerHTML = `
      <a href="#" class="nav-link" data-module="${item.module}">
        <i class="nav-icon bi ${item.icon}"></i>
        <p>${item.label}</p>
      </a>
    `;

    sidebarMenu.appendChild(li);
  }

  sidebarMenu.querySelectorAll("[data-module]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      loadModule(link.dataset.module);
    });
  });

  setActiveSidebarItem(activeModule);
}

function loadModule(moduleKey) {
  const module = modules[moduleKey];

  if (!module) {
    return;
  }

  if (!currentPermissions.includes(module.permission)) {
    showForbidden();
    return;
  }

  activeModule = moduleKey;
  setActiveSidebarItem(moduleKey);
  document.getElementById("moduleTitle").textContent = module.title;

  if (!module.url) {
    document.getElementById("homeView").style.display = "block";
    document.getElementById("frameView").style.display = "none";
    document.getElementById("mainFrame").src = "";
    return;
  }

  document.getElementById("homeView").style.display = "none";
  document.getElementById("frameView").style.display = "block";
  document.getElementById("mainFrame").src = module.url;
}

function setActiveSidebarItem(moduleKey) {
  document.querySelectorAll("#sidebarMenu .nav-link").forEach((link) => {
    link.classList.toggle("active", link.dataset.module === moduleKey);
  });
}

function updateUserChrome(profile) {
  const displayName = profile.full_name || profile.email || "Usuario";
  const role = profile.role || "sin rol";
  const initials = getInitials(displayName);

  setText("userTopbarName", displayName);
  setText("userMenuName", displayName);
  setText("userMenuRole", role);
  setText("userAvatar", initials);
  setText("userMenuAvatar", initials);
}

function getInitials(value) {
  return value
    .split("@")[0]
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("") || "ADT";
}

function setText(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = value;
  }
}

function showForbidden() {
  document.getElementById("moduleTitle").textContent = "Acceso restringido";
  document.getElementById("homeView").style.display = "block";
  document.getElementById("frameView").style.display = "none";
  document.getElementById("homeView").innerHTML = `
    <div class="alert alert-danger">
      No tienes permisos para acceder a este módulo.
    </div>
  `;
}

document.getElementById("logoutButton")?.addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.href = "/login.html";
});

document.querySelectorAll("[data-theme-value]").forEach((button) => {
  button.addEventListener("click", () => {
    document.documentElement.setAttribute("data-bs-theme", button.dataset.themeValue);
  });
});

initPortal();
