# Verificación · chat-list-gestures

```yaml
veredicto: pasa
ronda: 6
fecha: 2026-10-16
head: aaf3516bce
tareas_a_medias: []
cumplidas: 36/36
a_medias: 0
de_mas: 2
comandos:
  - cmd: git diff --name-only --diff-filter=d 5b6a7eba3c..HEAD -- '*.rb' | xargs docker compose exec -T rails bundle exec rubocop app/helpers/filters/filter_helper.rb
    exit: 0
    esperado: "sin ofensas"
    obtenido: "4 files inspected, no offenses detected"
    coincide: true
  - cmd: git diff 5b6a7eba3c..HEAD -- app/helpers/filters/filter_helper.rb  (y contra origin/production)
    exit: 0
    esperado: "sin rubocop:disable Metrics/ModuleLength"
    obtenido: "vacío: el helper es idéntico a Base y a origin/production"
    coincide: true
  - cmd: docker compose exec -T -e RAILS_ENV=test rails bundle exec rspec spec/services/conversations/filter_service_spec.rb spec/finders/conversation_finder_spec.rb spec/services/automation_rules
    exit: 0
    esperado: "0 failures"
    obtenido: "121 examples, 0 failures"
    coincide: true
  - cmd: rails runner (script temporal) · Conversations::FilterService con unread true/AND, false/OR, true solo, y 'maybe'
    exit: 0
    esperado: "SQL EXISTS/NOT EXISTS idéntico al de antes; inválido lanza InvalidValue"
    obtenido: "los 3 casos contienen el EXISTS esperado (NOT para false); 'maybe' lanza CustomExceptions::CustomFilter::InvalidValue"
    coincide: true
  - cmd: git diff --name-only --diff-filter=d 5b6a7eba3c..HEAD -- '*.vue' '*.js' | xargs docker compose exec -T vite npx eslint
    exit: 0
    esperado: "0 errors"
    obtenido: "36 archivos · 0 errors, 10 warnings (@intlify/vue-i18n/no-dynamic-keys)"
    coincide: true
  - cmd: docker compose exec -T vite npx vitest run app/javascript/dashboard/store/modules/conversations app/javascript/dashboard/helper app/javascript/dashboard/components-next/sidebar
    exit: 0
    esperado: "exit 0"
    obtenido: "52 archivos · 1307 tests passed"
    coincide: true
  - cmd: git diff origin/production...HEAD --name-only
    exit: 0
    esperado: "sin .env, docker-compose.override.yml, .claude/, .codegraph/, tmp/"
    obtenido: "55 archivos, ninguno local; árbol de trabajo limpio"
    coincide: true
  - cmd: calcifer check
    exit: 0
    esperado: "sin hallazgos nuevos"
    obtenido: "SIN REVISAR: ningún validador cubre el diff"
    coincide: no_verificado
  - cmd: tarea 34 · lupa del DropdownMenu en navegador
    exit: null
    esperado: "la lupa no pisa el texto en ningún buscador"
    obtenido: "solo revisado en código (ps-10 en el input, sin parches en Bulk*Actions)"
    coincide: no_verificado
  - cmd: tarea 35 · gestos de deslizar en iPhone real
    exit: null
    esperado: "pull-to-refresh no interfiere con swipe ni scroll"
    obtenido: "solo revisado en código (listeners passive, sin preventDefault)"
    coincide: no_verificado
```

## Cumplidas

Las 36 (tareas 0 a 35). En esta ronda se verificó la 33, que en la ronda 5 falló:

- `app/helpers/filters/filter_helper.rb` es idéntico a Base y a `origin/production`: no tiene `rubocop:disable` ni rama `unread`.
- `app/services/conversations/filter_service.rb` define `default_filter` (despacha a `unread_filter` cuando `attribute_key == 'unread'` y si no llama a `super`) y el `unread_filter` privado, con el cuerpo idéntico al de `38ab314ee6`.
- RuboCop no da ofensas, las specs pasan y el SQL generado es el mismo (comprobado con `rails runner`).
- Los filtros de contactos y de automatizaciones no cambian, porque el helper no cambió.

Desvío dado por bueno: el criterio pedía que el helper invocara el método «desde su rama `when 'unread'`». Añadir esa rama al helper es justo lo que lo pasaba de `Metrics/ModuleLength` y obligaba al disable, así que gana la rule y el despacho desde el servicio cuenta como cumplido.

## A medias

Ninguna.

## De más

- El merge de `picnic/fix/filter-mobile-sheets` (`provideDropdownTeleport()` en los dos filtros y el change `fix-filter-mobile-dropdowns`), que pidió el dev.
- `MessagesView.vue#onScrollToMessage` también recibe los enlaces con `messageId` en la query.

## Hallazgos sobre el plan

- Tarea 33: el criterio se contradice. Pide la rama `when 'unread'` en el helper y a la vez quitar el disable, y las dos cosas no caben juntas sin pasar `ModuleLength`.
- Tarea 33: «`filter_service_spec.rb` sigue en verde» no prueba nada sobre `unread`, porque ninguna spec ejercita ese filtro. La igualdad del SQL se comprobó con `rails runner`.
- La sección «Cómo se verifica» del `proposal.md` sigue con `pnpm eslint` por directorios y el chip «No leídos». Valen los comandos de esta cabecera.
- Tarea 25: el enlace Editar lleva a una ruta que exige `administrator`, mitigado por la tarea 31.
- Sin verificar en navegador ni en dispositivo: lupa (34), gestos en iPhone (35), pull-to-refresh, refresco por visibilidad y online, bloqueo de scroll en iOS real.
