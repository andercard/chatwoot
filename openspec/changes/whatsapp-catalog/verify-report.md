# Verificación · whatsapp-catalog

```yaml
veredicto: pasa
ronda: 3
fecha: 2026-10-14
tareas_a_medias: []
cumplidas: 25/25
a_medias: 0
de_mas: 1
escenarios: 22/22
comandos:
  - cmd: rspec (payload_builder, catalog_message_service, catalog_service, whatsapp_cloud_service, conversations/, inboxes_controller)
    exit: 0
    esperado: "0 failures"
    obtenido: "284 examples, 0 failures"
    coincide: true
  - cmd: rubocop sobre los 16 archivos .rb del diff
    exit: 0
    esperado: "no offenses"
    obtenido: "16 files inspected, no offenses detected"
    coincide: true
  - cmd: vitest (helper, conversation, WootWriter, whatsapp-catalog, message, settings/inbox) con docker compose exec
    exit: 0
    esperado: "Failed = 0"
    obtenido: "68 archivos · 1564 tests, 0 fallos"
    coincide: true
  - cmd: eslint sobre los 21 .js/.vue del diff
    exit: 0
    esperado: "0 errores"
    obtenido: "0 errores, 8 warnings no-dynamic-keys"
    coincide: true
  - cmd: git diff --name-only 53a21590ee..HEAD -- db app/models
    exit: 0
    esperado: "vacío"
    obtenido: "vacío"
    coincide: true
  - cmd: invariante de topes 0/1/2/10/11/30/31 (422 del backend y validateCatalogForm)
    exit: 0
    esperado: "fuera de rango se rechaza en ambos, dentro pasa"
    obtenido: "en verde dentro de las corridas anteriores"
    coincide: true
  - cmd: B. navegador local 390x844 y 1440x900
    exit: null
    esperado: "botón, guía, topes, burbujas sin desborde"
    obtenido: "comprobado por el orquestador en Chrome de escritorio (guardar/vaciar ID de catálogo, lista y detalle en una sola hoja, clic en el fondo sin atravesar); el dev probó el resto a mano en escritorio e iPhone"
    coincide: no_verificado
  - cmd: C. prueba humana con iPhone y el número de pruebas
    exit: null
    esperado: "llegan a WhatsApp, Meta acepta los límites 60/24, el reintento conserva el catálogo"
    obtenido: "sin registro formal: el dev recibió carrusel y lista en su teléfono"
    coincide: no_verificado
  - cmd: calcifer check 53a21590ee
    exit: 0
    esperado: "sin hallazgos nuevos"
    obtenido: "SIN REVISAR: ningún validador cubre los 45 archivos (eslint lo deja al CI)"
    coincide: no_verificado
```

Rondas anteriores: la 1 (`no pasa`, 15/23: lint de `Settings.vue`, overlay duplicado en la burbuja, encabezado de la lista oculto, dos escenarios obsoletos) y la 2 (`no pasa`, 19/22: la tarea 25 pedía refrescar en segundo plano solo con datos vencidos, pero el criterio se contradecía; se resolvió con stale-while-revalidate).

## Qué se cumplió
25 de 25 tareas (las 4, 5, 6, 10 y 15 solo en lo que sigue vigente; el resto de su criterio lo cubren las 12/18/22, 19, 11/21 y 17). Detalle por tarea y archivo en el reporte del verificador de la ronda 3.

## Qué quedó a medias
Ninguna. Limitación aceptada: si el usuario ya cargó más páginas con scroll cuando llega el refresco en segundo plano, la lista vuelve a la primera página.

## Qué se hizo de más
- `app/services/whatsapp/providers/whatsapp_cloud_service.rb:1` agrega `# rubocop:disable Metrics/ClassLength` (el método nuevo supera el límite; hay precedentes en el repo).

## Escenarios
22 de 22 con evidencia. Sin test automático: la fila del menú «+» en móvil (solo el indicador compartido) y el umbral de arrastre de `SheetHandle` (queda para la prueba manual).
