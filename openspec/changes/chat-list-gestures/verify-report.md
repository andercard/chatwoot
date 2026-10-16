# Verificación · chat-list-gestures

```yaml
veredicto: no pasa
ronda: 2
fecha: 2026-10-16
vuelve_a: plan
tareas_a_medias: [4, 5, 18]
cumplidas: 17/20
a_medias: 3
de_mas: 2
comandos:
  - cmd: git diff --name-only --diff-filter=d 5b6a7eba3c..HEAD -- '*.vue' '*.js' | xargs docker compose exec -T vite npx eslint
    exit: 0
    esperado: "0 errors"
    obtenido: "30 archivos · 0 errors, 10 warnings (@intlify/vue-i18n/no-dynamic-keys)"
    coincide: true
  - cmd: docker compose exec -T vite npx vitest run app/javascript/dashboard/store/modules/conversations app/javascript/dashboard/helper/specs/commons.spec.js
    exit: 0
    esperado: "exit 0, 0 failed"
    obtenido: "5 archivos · 154 tests passed"
    coincide: true
  - cmd: docker compose exec -T -e RAILS_ENV=test rails bundle exec rspec spec/finders/conversation_finder_spec.rb spec/services/conversations/filter_service_spec.rb
    exit: 0
    esperado: "0 failures"
    obtenido: "71 examples, 0 failures"
    coincide: true
  - cmd: docker compose exec -T rails bundle exec rubocop app/finders/conversation_finder.rb app/helpers/filters/filter_helper.rb lib/filters
    exit: 0
    esperado: "no offenses"
    obtenido: "2 files inspected, no offenses detected"
    coincide: true
  - cmd: git diff origin/production...HEAD --name-only
    exit: 0
    esperado: "sin .env, docker-compose.override.yml, .claude/, .codegraph/, tmp/"
    obtenido: "49 archivos, ninguno local"
    coincide: true
  - cmd: calcifer check 5b6a7eba3c
    exit: 0
    esperado: "sin hallazgos nuevos"
    obtenido: "SIN REVISAR: ningún validador cubre los 48 archivos (eslint lo deja al CI)"
    coincide: no_verificado
```

## A medias

- **4 y 5:** sus criterios (filtro `conversation_type=unread` y pestaña «No leídos») quedaron contradichos por la tarea 13, que los quitó por decisión del dev. Se reescribieron como REEMPLAZADAS por 13 y 14.
- **18:** la tarea de la cita rompía el desplazamiento al final al enviar o recibir mensajes (`onScrollToMessage` sin `messageId`). Se reabrió, se corrigió el código y se amplió el criterio.

## De más

- El `git merge -X theirs` de `picnic/fix-filter-mobile-dropdowns` pisaba cambios de production (`showStatusFilter`, `SheetHandle`, `DatePicker`…). Se revirtió; el arreglo se reenganchó aparte en `picnic/fix/filter-mobile-sheets` y no forma parte de este plan.
- La API de automatizaciones aceptaba `unread`: se excluyó con la tarea 20.
