# Verificación · chat-list-gestures

```yaml
veredicto: pasa
ronda: 4
fecha: 2026-10-16
tareas_a_medias: []
cumplidas: 29/29
a_medias: 0
de_mas: 2
comandos:
  - cmd: git diff --name-only --diff-filter=d 5b6a7eba3c..HEAD -- '*.vue' '*.js' | xargs docker compose exec -T vite npx eslint
    exit: 0
    esperado: "0 errors"
    obtenido: "35 archivos · 0 errors, 9 warnings (@intlify/vue-i18n/no-dynamic-keys, los mismos 9 de la ronda 3)"
    coincide: true
  - cmd: docker compose exec -T vite npx vitest run app/javascript/dashboard/store/modules/conversations app/javascript/dashboard/helper app/javascript/dashboard/components-next/sidebar
    exit: 0
    esperado: "exit 0"
    obtenido: "52 archivos · 1307 tests passed"
    coincide: true
  - cmd: docker compose exec -T -e RAILS_ENV=test rails bundle exec rspec spec/finders/conversation_finder_spec.rb spec/services/conversations/filter_service_spec.rb spec/services/automation_rules
    exit: 0
    esperado: "0 failures"
    obtenido: "121 examples, 0 failures"
    coincide: true
  - cmd: docker compose exec -T rails bundle exec rubocop app/finders/conversation_finder.rb app/helpers/filters/filter_helper.rb app/services/automation_rules
    exit: 0
    esperado: "sin ofensas"
    obtenido: "5 files inspected, no offenses detected"
    coincide: true
  - cmd: git diff origin/production...HEAD --name-only
    exit: 0
    esperado: "sin .env, docker-compose.override.yml, .claude/, .codegraph/, tmp/"
    obtenido: "54 archivos, ninguno local; árbol de trabajo limpio"
    coincide: true
  - cmd: git diff origin/production -- vite.config.ts
    exit: 0
    esperado: "vacío"
    obtenido: "vacío"
    coincide: true
  - cmd: calcifer check 5b6a7eba3c
    exit: 0
    esperado: "sin hallazgos nuevos"
    obtenido: "SIN REVISAR: ningún validador cubre los 53 archivos (deja eslint al CI)"
    coincide: no_verificado
```

## Cumplidas

Las 29 (tareas 0 a 28). Las tareas 21 a 28 se añadieron tras la tercera ronda de pruebas del dev en su iPhone: telón y bloqueo de scroll compartidos y aplicados a todas las hojas y al menú principal, búsqueda y enlace Editar en la hoja de etiquetas, buscador sin lupa pisada, estado Pendiente e íconos grandes en la barra masiva, aviso claro al eliminar un mensaje, y refresco al volver a primer plano y al tirar de la lista.

## A medias

Ninguna.

## De más

- El merge de `picnic/fix/filter-mobile-sheets` (`provideDropdownTeleport()` en los dos filtros y el change `fix-filter-mobile-dropdowns`), pedido por el dev para que el filtro no se corte en móvil.
- `MessagesView.vue#onScrollToMessage` también recibe los enlaces con `messageId` en la query.

## Hallazgos sobre el plan

- «Cómo se verifica» del `proposal.md` sigue con `pnpm eslint` por directorios y el chip «No leídos»; valen los comandos de esta cabecera.
- Tarea 26: los íconos solo crecen por debajo de `sm`; el criterio no lo limitaba.
- Tarea 25: el enlace Editar lleva a una ruta que exige `administrator`; para un agente no administrador no está verificado.
- La lupa pisada se arregló desde el padre; la causa está en `components-next/dropdown-menu/DropdownMenu.vue`.
- Sin verificar en navegador: pull-to-refresh, refresco por visibilidad y online, bloqueo de scroll en iOS real, telón del DatePicker, filtro de contactos y menús de orden de contactos y empresas.
