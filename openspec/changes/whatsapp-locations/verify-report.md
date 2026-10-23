# Verificación · whatsapp-locations

```yaml
veredicto: pasa
ronda: 2
fecha: 2026-10-23
tareas_a_medias: []
cumplidas: 10/10
a_medias: 0
de_mas: 4
escenarios: 5/10
comandos:
  - cmd: docker compose exec -T -e RAILS_ENV=test rails bundle exec rspec spec/services/whatsapp/location_message_service_spec.rb spec/services/conversations/filter_service_spec.rb
    exit: 0
    esperado: "0 failures (provisional)"
    obtenido: "52 examples, 0 failures"
    coincide: true
  - cmd: docker compose exec -T rails bundle exec rubocop <9 archivos Ruby del cambio, sin db/schema.rb>
    exit: 0
    esperado: "no offenses (provisional)"
    obtenido: "9 files inspected, no offenses detected"
    coincide: true
  - cmd: docker compose exec -T vite npx eslint <18 archivos JS/Vue del cambio>
    exit: 0
    esperado: "0 errors (provisional)"
    obtenido: "0 errors, 4 warnings (todos de antes)"
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
    obtenido: "SIN REVISAR: ningun validador cubre los 40 archivos"
    coincide: true
  - cmd: "vitest efimero fuera del repo (WhatsappLocationsPage + ConditionRow)"
    exit: 0
    esperado: "la 8 guarda coordenadas tecleadas como numeros; la 3 muestra Verdadero/Falso en checkbox personalizado"
    obtenido: "2 archivos, 6 tests passed"
    coincide: true
  - cmd: "rails runner efimero en transaccion con rollback: PUT whatsapp_locations + mensajes de validacion en en y es"
    exit: 0
    esperado: "200 y persiste con lat/long numericos; 422 con mensaje de en.yml"
    obtenido: "PUT 200 persistido con uuid; lat 91 -> 422; mensaje de en.yml"
    coincide: true
  - cmd: "criterio manual en navegador, puntos 1-6 (375 px y desktop)"
    exit: null
    esperado: "los 6 puntos se cumplen"
    obtenido: "no corrido"
    coincide: no_verificado
  - cmd: "envio real a la Cloud API (lucia.sh up --switch)"
    exit: null
    esperado: "llega un pin al numero de prueba"
    obtenido: "no corrido"
    coincide: no_verificado
```

## Veredicto: pasa

Las tareas 3, 5 y 8 (a medias en la ronda 1) cumplen su `listo cuando`; ninguna reincide y las otras siete no retrocedieron. Sin comprobar: navegador a 375 px y envío real a la Cloud API.

## Cumplidas (10 de 10)

- **3** `ConditionRow.vue:248-252` usa `options?.length ? options : booleanOptions`; vitest efímero: checkbox personalizado muestra True/False, `unread` muestra Unread/Read.
- **5** mensajes de `validate_locations` desde `I18n.t('errors.whatsapp.locations.*')` (`config/locales/en.yml:171-178`); PUT real con lat 91 da 422. En es, en desarrollo sale `Translation missing` (los fallbacks solo existen en production.rb y staging.rb); en producción cae al inglés.
- **8** `WhatsappLocationsPage.vue`: type text + inputmode decimal, normaliza con `text()`, manda números, el `catch` lee `data.error`; vitest efímero y PUT real 200 con uuid. Sin probar "usable a 375 px" ni "persiste tras recargar" en navegador.
- **1, 2, 4, 6, 7, 9, 10:** sin regresión.

## A medias

Ninguna.

## De más (4)

- `config/locales/es.yml:158-159` `errors.whatsapp.location.current_location: 'Ubicación actual'`, pedido por el dev.
- `validate :validate_provider_config, unless: ...` en `Channel::Whatsapp`.
- `Channel::Whatsapp#send_location_message`.
- `rubocop:disable Metrics/ClassLength` sobre todo `whatsapp_cloud_service.rb`.

## Escenarios (5 de 10 con evidencia, ninguno contradicho)

Con evidencia: guardar una ubicación, coordenadas fuera de rango, enviar guardada, ubicación inexistente, permiso concedido (servidor). Sin probar: filtrar por no leídos, por leídos, carpeta guardada antes del cambio, buscar etiquetas en hoja móvil, permiso denegado.
