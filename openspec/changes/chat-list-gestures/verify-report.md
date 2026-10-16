# Verificación · chat-list-gestures

```yaml
veredicto: no pasa
ronda: 1
fecha: 2026-10-15
vuelve_a: apply
tareas_a_medias: [9]
cumplidas: 11/12
a_medias: 1
de_mas: 0
comandos:
  - cmd: docker compose exec -T vite npx eslint <15 archivos .vue/.js del diff desde Base>
    exit: 0
    esperado: "0 errors"
    obtenido: "0 errors, 5 warnings (@intlify/vue-i18n/no-dynamic-keys)"
    coincide: true
  - cmd: docker compose exec -T vite npx vitest run app/javascript/dashboard/store/modules/conversations app/javascript/dashboard/helper/specs/commons.spec.js
    exit: 0
    esperado: "exit 0, 0 failed"
    obtenido: "5 archivos · 154 tests passed"
    coincide: true
  - cmd: docker compose exec -e RAILS_ENV=test rails bundle exec rspec spec/finders/conversation_finder_spec.rb
    exit: 0
    esperado: "0 failures"
    obtenido: "24 examples, 0 failures"
    coincide: true
  - cmd: docker compose exec rails bundle exec rubocop app/finders/conversation_finder.rb
    exit: 0
    esperado: "no offenses"
    obtenido: "1 file inspected, no offenses detected"
    coincide: true
  - cmd: git diff origin/production...HEAD --name-only (en lugar de `git diff --cached --name-only`, que con todo commiteado devuelve vacío)
    exit: 0
    esperado: "sin .env, docker-compose.override.yml, .claude/, .codegraph/"
    obtenido: "25 archivos, ninguno local"
    coincide: true
  - cmd: calcifer check 5b6a7eba3c
    exit: 0
    esperado: "sin hallazgos nuevos"
    obtenido: "SIN REVISAR: ningún validador del repo cubre los 24 archivos (eslint lo deja al CI)"
    coincide: no_verificado
```

## A medias

**Tarea 9.** El criterio pide que la pestaña "No leídos" no muestre ningún número y sigue mostrando «0».

- En `TabsItem.vue` se agregó `v-if="showBadge && getItemCount !== undefined"`, pero el prop `count` conserva `default: 0`. Cuando `ChatTypeTabs` pasa `:count="item.count"` con `undefined`, Vue aplica el valor por omisión y `getItemCount` vale `0`, así que el badge se pinta (comprobado en el contenedor `vite` con un componente equivalente).
- El commit cambió el default de `index` (de `0` a `undefined`), no el de `count`. Parece que se tocó el prop equivocado, y ese cambio de `index` no lo pidió ningún criterio.
- Las otras dos partes de la tarea sí están en el código: `min-w-0` en `.conversations-list-wrap` (ancho de 375 px no medido por el verify, sí medido en QA manual: 375 px) y conteos estables (`actions.js` salta `onListRequestStarted` con `unread`).

Archivo a corregir: `app/javascript/dashboard/components/ui/Tabs/TabsItem.vue`.

## Cumplidas (11)

0 · rama; 1 · píldora e ícono del canal; 2 · deslizar y hoja de Estados; 3 · responder con flecha y gesto; 4 · filtro `unread` en el finder; 5 · chip No leídos; 6 · selección masiva y Leído/No leído en lote; 7 · panel de contacto con pulsación larga (solo por código: el arrastre táctil no se puede probar con eventos sintéticos); 8 · handlers `v-bind` y primer nombre; 10 · barra masiva sin desborde (a 340/375 px solo por código y QA manual); 11 · botón flotante oculto con la barra (solo por código).

Las tareas 8 a 11 se añadieron tras la QA manual y son legítimas: ningún `listo cuando` de las tareas 1 a 7 se aflojó.

## De más

Nada fuera del plan. Revisiones pedidas, limpias: ninguna acción de eliminar nueva; el ⋯ de la burbuja conserva sus opciones; textos nuevos en `en` y `es`; las tareas 4 y 5 usan `conversation_type=unread`.

## Hallazgos sobre el plan

- «Cómo se verifica» declara `git diff --cached --name-only`, que con todo commiteado no prueba nada; usar `git diff origin/production...HEAD --name-only`.
- `pnpm eslint` lintea todo `app/**`; el plan debería declarar `npx eslint` sobre los archivos del diff.
- `calcifer check` no cubre estos archivos (`no_verificado`).
