# AdminLTE Component Guide

Este proyecto usa AdminLTE 4 + Bootstrap 5 con HTML, CSS y JavaScript puro.

No introducir React, Vue, Angular ni un build step. Los archivos publicados se sirven directamente desde `public/` por Nginx.

## Reglas

- Usar componentes AdminLTE/Bootstrap para sidebar, cards, alerts, badges, buttons, tables, forms y modals.
- Usar Bootstrap Icons desde `/vendor/bootstrap-icons/`.
- No modificar archivos dentro de `public/vendor/` salvo que se este actualizando explicitamente la version de vendor.
- Mantener cambios propios en `public/assets/css/custom.css`, `public/assets/js/auth.js` y `public/assets/js/portal.js`.
- Siempre versionar JS/CSS importados desde HTML con `?v=...`.
- Despues de instalar o actualizar dependencias, ejecutar `npm run vendor:copy`.

## Sidebar Item

```html
<li class="nav-item">
  <a href="#" class="nav-link" data-module="reports">
    <i class="nav-icon bi bi-bar-chart"></i>
    <p>Reportes</p>
  </a>
</li>
```

## Card

```html
<div class="card">
  <div class="card-header">
    <h3 class="card-title">Resumen</h3>
  </div>
  <div class="card-body">
    Contenido del modulo.
  </div>
</div>
```

## Alert

```html
<div class="alert alert-warning" role="alert">
  Revisa los datos antes de continuar.
</div>
```

## Badge

```html
<span class="badge text-bg-success">Activo</span>
```

## Button

```html
<button class="btn btn-primary" type="button">
  <i class="bi bi-save me-1"></i>
  Guardar
</button>
```
