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
  financial: {
    title: "Métricas financieras",
    permission: "financial_metrics.view",
    url: "https://app.mizen.cl/app/mizen/login?branch=master&embed=true"
  },
  users: {
    title: "Usuarios",
    permission: "users.manage",
    url: "https://app.mizen.cl/app/mizen/login?branch=master&embed=true"
  }
};

const sidebarItems = [
  {
    label: "Inicio",
    module: "home",
    permission: "dashboard.view"
  },
  {
    label: "Rutinas",
    module: "routines",
    permission: "routines.create"
  },
  {
    label: "Alumnos",
    module: "students",
    permission: "students.view"
  },
  {
    label: "Métricas financieras",
    module: "financial",
    permission: "financial_metrics.view"
  },
  {
    label: "Usuarios",
    module: "users",
    permission: "users.manage"
  }
];

let currentPermissions = [];

async function initPortal() {
  const { data } = await supabase.auth.getSession();

  if (!data.session) {
    window.location.href = "/login.html";
    return;
  }

  document.getElementById("userInfo").textContent = data.session.user.email;

    const { data: permissionsData, error: permissionsError } = await supabase.rpc("get_my_permissions");

    if (permissionsError) {
    console.error("Error obteniendo permisos:", permissionsError);
    window.location.href = "/login.html";
    return;
    }

    if (!permissionsData || permissionsData.length === 0) {
    await supabase.auth.signOut();
    window.location.href = "/login.html";
    return;
    }

    const profile = permissionsData[0];

    document.getElementById("userInfo").textContent =
    `${profile.full_name || profile.email} · ${profile.role}`;

    currentPermissions = permissionsData.map((row) => row.permission_key);

  renderSidebar();
}

function renderSidebar() {
  const sidebarMenu = document.getElementById("sidebarMenu");
  sidebarMenu.innerHTML = "";

  const allowedItems = sidebarItems.filter((item) =>
    currentPermissions.includes(item.permission)
  );

  for (const item of allowedItems) {
    const li = document.createElement("li");
    li.className = "nav-item";

    li.innerHTML = `
      <a href="#" class="nav-link" data-module="${item.module}">
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

initPortal();