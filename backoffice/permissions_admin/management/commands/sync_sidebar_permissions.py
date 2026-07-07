from django.core.management.base import BaseCommand

from permissions_admin.models import AppPermission, AppRolePermission


SIDEBAR_PERMISSIONS = [
    {
        "key": "dashboard.view",
        "module": "Inicio",
        "action": "view",
        "label": "Inicio",
        "description": "Ver el inicio del portal.",
    },
    {
        "key": "students.view",
        "module": "Alumnos",
        "action": "view",
        "label": "Alumnos: ver",
        "description": "Ver el modulo de alumnos.",
    },
    {
        "key": "students.manage",
        "module": "Alumnos",
        "action": "manage",
        "label": "Alumnos: editar",
        "description": "Crear o editar alumnos.",
    },
    {
        "key": "evaluations.create",
        "module": "Evaluaciones",
        "action": "create",
        "label": "Evaluaciones: crear",
        "description": "Crear o editar evaluaciones.",
    },
    {
        "key": "routines.view",
        "module": "Rutinas",
        "action": "view",
        "label": "Rutinas: ver",
        "description": "Ver el modulo de rutinas.",
    },
    {
        "key": "reports.view",
        "module": "Reportes",
        "action": "view",
        "label": "Reportes",
        "description": "Ver el menu Reportes.",
    },
    {
        "key": "financial_metrics.view",
        "module": "Metricas financieras",
        "action": "view",
        "label": "Metricas financieras",
        "description": "Ver metricas financieras.",
    },
]


class Command(BaseCommand):
    help = "Sincroniza permisos del sidebar y los asigna al rol owner."

    def handle(self, *args, **options):
        for item in SIDEBAR_PERMISSIONS:
            permission, _ = AppPermission.objects.update_or_create(
                key=item["key"],
                defaults={
                    "module": item["module"],
                    "action": item["action"],
                    "label": item["label"],
                    "description": item["description"],
                },
            )
            AppRolePermission.objects.get_or_create(role="owner", permission=permission)

        self.stdout.write(
            self.style.SUCCESS(
                f"Permisos sincronizados: {len(SIDEBAR_PERMISSIONS)}. Rol owner actualizado."
            )
        )
