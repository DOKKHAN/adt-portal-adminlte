import { supabase } from "./auth.js";

const modules = {
  home: {
    title: "Inicio",
    permission: "dashboard.view",
    url: null
  },
  routines: {
    title: "Rutinas",
    permission: "routines.view",
    url: "https://app.mizen.cl/app/mizen/login?branch=master&embed=true"
  },
  students: {
    title: "Alumnos",
    permission: "students.view",
    url: "https://app.mizen.cl/app/mizen/login?branch=master&embed=true"
  },
  evaluations: {
    title: "Evaluaciones",
    permission: "evaluations.view",
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
  inventory: {
    title: "Inventario",
    permission: "inventory.view",
    url: "https://app.mizen.cl/app/mizen/login?branch=master&embed=true"
  }
};

const sidebarItems = [
  {
    type: "item",
    label: "Inicio",
    module: "home",
    permission: "dashboard.view",
    icon: "bi-speedometer"
  },
  {
    type: "section",
    label: "Entrenamiento",
    permission: "training.view",
    items: [
      {
        label: "Alumnos",
        module: "students",
        permission: "students.view",
        icon: "bi-people"
      },
      {
        label: "Evaluaciones",
        module: "evaluations",
        permission: "evaluations.view",
        icon: "bi-activity"
      },
      {
        label: "Rutinas",
        module: "routines",
        permission: "routines.view",
        icon: "bi-clipboard-check"
      }
    ]
  },
  {
    type: "section",
    label: "Métricas",
    permission: "metrics.view",
    items: [
      {
        type: "tree",
        label: "Reportes",
        permission: "reports.view",
        icon: "bi-bar-chart",
        items: [
          {
            label: "Métricas financieras",
            module: "financial",
            permission: "financial_metrics.view",
            icon: "bi-cash-coin"
          },
          {
            label: "Inventario",
            module: "inventory",
            permission: "inventory.view",
            icon: "bi-box-seam"
          }
        ]
      }
    ]
  }
];

let currentPermissions = [];
let activeModule = "home";
const THEME_STORAGE_KEY = "adt-portal-theme";

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

  const allowedItems = getAllowedSidebarItems(sidebarItems);
  console.log("allowed sidebar items:", allowedItems);

  for (const item of allowedItems) {
    appendSidebarItem(sidebarMenu, item);
  }

  sidebarMenu.querySelectorAll("[data-module]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      loadModule(link.dataset.module);
    });
  });

  setActiveSidebarItem(activeModule);
}

function getAllowedSidebarItems(items) {
  return items
    .map((item) => {
      if (item.type === "section") {
        const allowedSectionItems = getAllowedSidebarItems(item.items);
        const canSeeSection = !item.permission || hasPermission(item.permission);

        if (!canSeeSection || allowedSectionItems.length === 0) {
          return null;
        }

        return {
          ...item,
          items: allowedSectionItems
        };
      }

      if (item.type === "tree") {
        const allowedTreeItems = getAllowedSidebarItems(item.items);
        const canSeeTree = hasPermission(item.permission) || allowedTreeItems.length > 0;

        if (!canSeeTree) {
          return null;
        }

        return {
          ...item,
          items: allowedTreeItems
        };
      }

      return hasPermission(item.permission) ? item : null;
    })
    .filter(Boolean);
}

function appendSidebarItem(sidebarMenu, item) {
  if (item.type === "section") {
    const header = document.createElement("li");
    header.className = "nav-header";
    header.textContent = item.label;
    sidebarMenu.appendChild(header);

    for (const child of item.items) {
      appendSidebarItem(sidebarMenu, child);
    }

    return;
  }

  if (item.type === "tree") {
    sidebarMenu.appendChild(createTreeItem(item));
    return;
  }

  sidebarMenu.appendChild(createModuleItem(item));
}

function createModuleItem(item) {
  const li = document.createElement("li");
  li.className = "nav-item";
  li.innerHTML = `
    <a href="#" class="nav-link" data-module="${item.module}">
      <i class="nav-icon bi ${item.icon}"></i>
      <p>${item.label}</p>
    </a>
  `;

  return li;
}

function createTreeItem(item) {
  const li = document.createElement("li");
  li.className = "nav-item";
  li.innerHTML = `
    <a href="#" class="nav-link" data-tree-label="${item.label}">
      <i class="nav-icon bi ${item.icon}"></i>
      <p>
        ${item.label}
        <i class="nav-arrow bi bi-chevron-right"></i>
      </p>
    </a>
    <ul class="nav nav-treeview"></ul>
  `;

  const tree = li.querySelector(".nav-treeview");

  for (const child of item.items) {
    tree.appendChild(createModuleItem(child));
  }

  return li;
}

function hasPermission(permission) {
  return currentPermissions.includes(permission);
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

  document.querySelectorAll("#sidebarMenu .nav-item.menu-open").forEach((item) => {
    item.classList.remove("menu-open");
  });

  const activeLink = document.querySelector(`#sidebarMenu .nav-link[data-module="${moduleKey}"]`);
  const parentTree = activeLink?.closest(".nav-treeview");

  if (parentTree) {
    const treeItem = parentTree.closest(".nav-item");
    const treeLink = treeItem?.querySelector(":scope > .nav-link");

    treeItem?.classList.add("menu-open");
    treeLink?.classList.add("active");
  }
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

function applyTheme(theme) {
  const resolvedTheme = theme === "light" ? "light" : "dark";
  const themeIcon = document.getElementById("themeMenuIcon");

  document.documentElement.setAttribute("data-bs-theme", resolvedTheme);

  if (themeIcon) {
    themeIcon.className = `bi ${resolvedTheme === "dark" ? "bi-moon-fill" : "bi-sun-fill"}`;
  }

  document.querySelectorAll("[data-theme-value]").forEach((button) => {
    button.classList.toggle("active", button.dataset.themeValue === resolvedTheme);
  });
}

document.querySelectorAll("[data-theme-value]").forEach((button) => {
  button.addEventListener("click", () => {
    const theme = button.dataset.themeValue;

    localStorage.setItem(THEME_STORAGE_KEY, theme);
    applyTheme(theme);
  });
});

applyTheme(localStorage.getItem(THEME_STORAGE_KEY) || "dark");
initPortal();
