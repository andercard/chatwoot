# Verificación · whatsapp-catalog

```yaml
veredicto: no pasa
ronda: 1
fecha: 2026-10-14
vuelve_a: plan
tareas_a_medias: [7, 9, 17]
cumplidas: 19/22
a_medias: 3
de_mas: 1
escenarios: 15/23
comandos:
  - cmd: rspec (servicios de catálogo, proveedor Cloud, conversations, inboxes_controller)
    exit: 0
    esperado: "0 failures"
    obtenido: "284 examples, 0 failures"
    coincide: true
  - cmd: rubocop sobre los 16 archivos .rb del diff
    exit: 0
    esperado: "no offenses"
    obtenido: "16 files inspected, no offenses detected"
    coincide: true
  - cmd: vitest (helper, conversation, WootWriter, whatsapp-catalog, message) con docker compose exec
    exit: 0
    esperado: "Failed = 0"
    obtenido: "61 archivos · 1489 tests, 0 fallos"
    coincide: true
  - cmd: eslint sobre los .js/.vue del diff
    exit: 1
    esperado: "0 errores"
    obtenido: "2 errores prettier/prettier en Settings.vue:1002 y :1009, 8 warnings no-dynamic-keys"
    coincide: false
  - cmd: git diff --name-only 53a21590ee..HEAD -- db app/models
    exit: 0
    esperado: "vacío"
    obtenido: "vacío"
    coincide: true
  - cmd: invariante de topes 0/1/2/10/11/30/31 (backend 422 y validateCatalogForm)
    exit: 0
    esperado: "fuera de rango se rechaza en ambos, dentro pasa"
    obtenido: "cubierto por catalog_messages_controller_spec y whatsappCatalog.spec.js, en verde"
    coincide: true
  - cmd: B. navegador local 390x844 y 1440x900
    exit: null
    esperado: "botón, guía, topes, burbujas sin desborde"
    obtenido: "no se corrió desde el agente (login); el dev probó a mano en escritorio e iPhone sin registro"
    coincide: no_verificado
  - cmd: C. humano con iPhone y número de pruebas (Lucía)
    exit: null
    esperado: "llegan a WhatsApp, Meta acepta los límites 60/24, el reintento conserva el catálogo"
    obtenido: "no se corrió: Lucía no se levantó"
    coincide: no_verificado
  - cmd: calcifer check 53a21590ee
    exit: 0
    esperado: "sin hallazgos nuevos"
    obtenido: "SIN REVISAR: ningún validador cubre los 44 archivos (eslint lo deja al CI)"
    coincide: no_verificado
```

## Qué quedó a medias

- **Tarea 9:** el campo de ID de catálogo funciona, pero el lint del diff falla con 2 errores `prettier/prettier` en `routes/dashboard/settings/inbox/Settings.vue` (líneas 1002 y 1009). El plan declara «0 errores».
- **Tarea 17:** `CatalogSheet` no es el único contenedor: la burbuja conserva un overlay propio para la lista de «Ver artículos» (`components-next/message/bubbles/WhatsappCatalog.vue:119-164`, `Teleport` con `fixed inset-0` y un botón de texto «Close»). Al abrir un producto desde esa lista, `CatalogSheet` queda apilado encima.
- **Tarea 7:** la lista no muestra el encabezado que escribe el agente (`WhatsappCatalog.vue:36`, `v-if="catalog.header && !isList"`; el título toma primero `section`, que siempre viene en las listas). El spec no lo comprueba.

## Qué se hizo de más

- `app/services/whatsapp/providers/whatsapp_cloud_service.rb:1` agrega `# rubocop:disable Metrics/ClassLength`; ninguna tarea lo pidió.

## Escenarios del delta (15 de 23 con evidencia)

Los contradice la evidencia (tumban el veredicto):
- «Products outside any collection»: desde la ronda 6 el servidor ya no agrupa; un producto sin colección vuelve con `collection_ids: []` y no existe una colección «sin colección». El escenario y el texto «grouped by collection» quedaron de la ronda 1.
- «Missing permission»: la guía debería nombrar el permiso y la alternativa del ID manual; en `en/conversation.json` `SETUP_GUIDE.MISSING_PERMISSION` solo dice «catalog permissions».

No probados: «See more… without selecting» (que el producto quede sin seleccionar), «Selection limit» (30/30 en la UI), «Text carried from the composer» (limpieza del compositor tras `sent`), «Prefetch makes the dialog instant» (y `loadFirstPage` siempre pone `isLoading` aunque la página esté en caché), «Drag to close on phones», «Detail opened from the chat closes by dragging».

## Sobre el plan

- Las rondas 2 a 6 fueron legítimas (peticiones explícitas del dev), pero las tareas 4 y 10 siguen tildadas con criterios que hoy son falsos (`collections[].products`, colección «sin colección», caché de 5 min, `products` en `whatsapp_catalog`) y sin marca de «reemplazada por la 19».
- No queda constancia en el repo de las comprobaciones contra el catálogo real que exigían las tareas 4 y 19.
- El comando JS de «Cómo se verifica» dice `docker compose run`; se corrió con `exec` porque `run` daña `node_modules`. El plan debe actualizarlo.
- `send_catalog_message` fija la versión del Graph en `v24.0`; «Encontrado de paso» anunciaba `WHATSAPP_API_VERSION`.

## Adónde vuelve

`plan`: dos criterios del delta están mal (producto sin colección, guía de permiso) y las tareas 4 y 10 quedaron obsoletas. Las tareas 7, 9 y 17 fallan por primera vez y su arreglo es de apply.
