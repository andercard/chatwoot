# Verificación · whatsapp-locations

```yaml
veredicto: no pasa
ronda: 1
fecha: 2026-10-23
vuelve_a: apply
tareas_a_medias: [3, 5, 8]
cumplidas: 7/10
a_medias: 3
de_mas: 3
escenarios: 4/9
comandos:
  - cmd: docker compose exec -T -e RAILS_ENV=test rails bundle exec rspec spec/services/whatsapp/location_message_service_spec.rb spec/services/conversations/filter_service_spec.rb
    exit: 0
    esperado: "0 failures (provisional)"
    obtenido: "52 examples, 0 failures"
    coincide: true
  - cmd: docker compose exec -T rails bundle exec rubocop <9 archivos Ruby del cambio>
    exit: 0
    esperado: "no offenses (provisional)"
    obtenido: "9 files inspected, no offenses detected"
    coincide: true
  - cmd: docker compose exec -T vite npx eslint <18 archivos JS/Vue del cambio>
    exit: 0
    esperado: "0 errors (provisional)"
    obtenido: "0 errors, 6 warnings (2 nuevos: claves dinamicas en WhatsappLocationsPage.vue:125,127)"
    coincide: true
  - cmd: docker compose exec -T vite pnpm vitest run app/javascript/dashboard/components-next/filter app/javascript/dashboard/store/modules/conversations
    exit: 0
    esperado: "0 failing (provisional)"
    obtenido: "5 archivos, 137 tests passed"
    coincide: true
  - cmd: docker compose exec rails bundle exec rails db:migrate:status | grep locations
    exit: 0
    esperado: "up"
    obtenido: "up 20261023032509 Add locations to channel whatsapp"
    coincide: true
  - cmd: calcifer check c37c4da474
    exit: 0
    esperado: "sin hallazgos nuevos"
    obtenido: "SIN REVISAR: ningun validador cubre los 39 archivos"
    coincide: true
  - cmd: "criterio manual en navegador, puntos 1-6 (375 px y desktop)"
    exit: null
    esperado: "los 6 puntos se cumplen"
    obtenido: "no corrido"
    coincide: no_verificado
  - cmd: "envio real a la Cloud API (lucia.sh up --switch)"
    exit: null
    esperado: "llega un pin al numero de prueba"
    obtenido: "no corrido; payload comprobado con HTTParty stubeado"
    coincide: no_verificado
```

## Veredicto: no pasa

Tres tareas marcadas [x] no cumplen su `listo cuando`. Es la primera vez (no había reporte anterior), así que vuelve a `apply`.

## Cumplidas (7)

- **1** ColorPicker.vue:68 · en móvil `relative`, desde `sm` vuelve a `sm:absolute sm:-mt-2.5 sm:z-[9999]`. Sin CSS nuevo.
- **2** Banner.vue:84 ya trae `min-h-12` en la base; marcada sin commit, criterio intacto.
- **4** migración, schema (solo columna y versión), `validate_locations`, `_inbox.json.jbuilder:147`. Comprobado: down/up, un agente no admin recibe `locations`, 51 ítems y lat 91 dan 422.
- **6** controlador, servicio, `send_location_message`, `SendOnWhatsappService`. Guardada 200 `"Casa Paraíso\nCalle 1"`; actual 200 `"Current location\n4.5, -74.1"`; id inexistente, dos modos, rango y conversación no WhatsApp dan 422 sin crear mensaje; payload `type: location`. El texto `Current location` en vez de `Ubicación actual` se da por cumplido por la rule `i18n.md` (solo en.yml); hallazgo del plan: el criterio pide un literal en español que la rule impide, y con `es.yml` sin la clave una cuenta en español guardará "Current location".
- **7** clientes de API y claves `WHATSAPP_LOCATIONS.*` en en y es. Hallazgo del plan: `i18n.md` prohíbe tocar `es/*.json`, la tarea 7 siguió al plan y la 6 a la rule.
- **9** LocationPicker.vue, ReplyBottomPanel.vue, ReplyBox.vue. No escuchar `sent` es legítimo. Sin probar en navegador.
- **10** ConversationLabelsSheet (`h-[50dvh]`), MultiSelect, SingleSelect, FilterSelect, ComboBoxDropdown, DropdownMenu. Sin probar en navegador.

## A medias (3)

- **3 · Filtro Leídos / No leídos.** Falla «los demás `booleanSelect` siguen mostrando Verdadero/Falso». `ConditionRow.vue:248` usa `currentFilter.options ?? booleanOptions`, pero `filterHelper.js:90-93` da `options: []` a todo atributo personalizado que no sea `list`, y `[] ?? x` devuelve `[]`: un atributo personalizado checkbox queda sin opciones. Regresión.
- **5 · Endpoint de ubicaciones.** Falla «422 con mensaje de `en.yml`». Los mensajes por ítem salen de cadenas fijas en `Channel::Whatsapp::LOCATION_RULES` y `validate_locations` ("must have a latitude between -90 and 90", etc.); solo los rechazos de forma y tipo de inbox usan `en.yml`.
- **8 · Pestaña Ubicaciones.** Falla «agrega, edita… y persiste». `components-next/input/Input.vue:65-66` emite `Number(value)` con `type="number"`; `WhatsappLocationsPage.vue` usa `type: 'number'` y luego `validateRow`/`inRange` llaman `row.latitude.trim()`: `TypeError` tras teclear una coordenada, fuera del `try`, así que nunca llama a la API. Además el `catch` lee `error.response.data.message` pero el backend responde `{error: ...}`. Sin montar en vitest (límite de `fs.allow`): evidencia por lectura.

## De más (3)

- `app/models/channel/whatsapp.rb:48` `validate :validate_provider_config, unless: -> { persisted? && changed == ['locations'] }`: sano y necesario; sin él cada PUT llama a Meta. Comprobado.
- `Channel::Whatsapp#send_location_message`: fuera de los archivos declarados de la tarea 6, mismo patrón que `send_catalog_message`.
- `# rubocop:disable/enable Metrics/ClassLength` envolviendo todo `whatsapp_cloud_service.rb`: nadie lo revisó contra un criterio; juzgarlo en el review.

## Escenarios (4 de 9 con evidencia, 1 contradicho)

- conversation-filters: filtrar por no leídos, por leídos y carpeta guardada: **no probados** (ni `filter_service_spec` ni `filterHelpers.spec` mencionan `unread`).
- searchable-lists: buscar etiquetas en la hoja móvil: **no probado** (código con `h-[50dvh]`, sin navegador).
- whatsapp-locations: guardar una ubicación **contradicho** (la pestaña no puede guardar coordenadas tecleadas); coordenadas fuera de rango, enviar guardada, ubicación inexistente y permiso concedido (servidor) con evidencia; permiso denegado **no probado**.

## Notas

`calcifer check` salió 0 pero ningún validador cubrió los 39 archivos. Las decisiones del apply 6 (annotaterb restaurado) y 7 (sin specs de request ni Vue) se confirman y no cuentan como falta.
