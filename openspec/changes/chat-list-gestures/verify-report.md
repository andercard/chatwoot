# Verificación · chat-list-gestures

```yaml
veredicto: pasa
ronda: 3
fecha: 2026-10-16
tareas_a_medias: []
cumplidas: 20/20
a_medias: 0
de_mas: 1
comandos:
  - cmd: git diff --name-only --diff-filter=d 5b6a7eba3c..HEAD -- '*.vue' '*.js' | xargs docker compose exec -T vite npx eslint
    exit: 0
    esperado: "0 errors"
    obtenido: "22 archivos · 0 errors, 9 warnings (@intlify/vue-i18n/no-dynamic-keys)"
    coincide: true
  - cmd: docker compose exec -T vite npx vitest run app/javascript/dashboard/store/modules/conversations app/javascript/dashboard/helper/specs/commons.spec.js
    exit: 0
    esperado: "exit 0, 0 failed"
    obtenido: "5 archivos · 154 tests passed"
    coincide: true
  - cmd: docker compose exec -T -e RAILS_ENV=test rails bundle exec rspec spec/finders/conversation_finder_spec.rb spec/services/conversations/filter_service_spec.rb spec/services/automation_rules
    exit: 0
    esperado: "0 failures"
    obtenido: "121 examples, 0 failures"
    coincide: true
  - cmd: docker compose exec -T rails bundle exec rubocop app/finders/conversation_finder.rb app/helpers/filters/filter_helper.rb app/services/automation_rules
    exit: 0
    esperado: "no offenses"
    obtenido: "5 files inspected, no offenses detected"
    coincide: true
  - cmd: git diff origin/production...HEAD --name-only
    exit: 0
    esperado: "sin .env, docker-compose.override.yml, .claude/, .codegraph/, tmp/"
    obtenido: "38 archivos, ninguno local"
    coincide: true
  - cmd: git diff --cached --name-only
    exit: 0
    esperado: "sin archivos locales"
    obtenido: "vacío (HEAD limpio)"
    coincide: true
  - cmd: calcifer check 5b6a7eba3c
    exit: 0
    esperado: "sin hallazgos nuevos"
    obtenido: "SIN REVISAR: ningún validador cubre los 37 archivos (eslint lo deja al CI)"
    coincide: no_verificado
```

## Cumplidas

Las 20 tareas (más la 0). Las tareas 4 y 5 quedaron REEMPLAZADAS por la 13 y la 14 por decisión del dev (la pestaña «No leídos» pasó al filtro avanzado); la reescritura es legítima.

## A medias

Ninguna.

## De más

- `MessagesView.vue#onScrollToMessage` también recibe ahora los enlaces con `messageId` en la query (`ConversationView.vue:174`): resalta el mensaje y, si no lo encuentra, ya no baja al final. Ningún criterio lo cubre.

## Hallazgos sobre el plan

- «Cómo se verifica» del `proposal.md` sigue describiendo `pnpm eslint` por directorios y el chip «No leídos»; los comandos vigentes son los de esta cabecera.
- Las tareas 17 y 18 listan `MessageContextMenu.vue` y `Base.vue`, que no cambiaron; los criterios se cumplen en `Message.vue` y `MessagesView.vue`.
- Sin verificar en navegador: arrastre con pulsación larga del panel de contacto (7), «Elegir fecha y hora», `contextmenu` nativo de Android, botón flotante entre 640 y 767 px, y que enviar un mensaje baje al final tras la corrección de la 18.
