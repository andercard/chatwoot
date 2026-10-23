# Ubicaciones de WhatsApp, filtro de mensajes leídos y arreglos móviles

> **Rama:** `picnic/feat/whatsapp-locations`
> **Base:** `c37c4da474`

Entorno: worktree `~/Desarrollo/chatwoot-worktrees/production`, rama nueva `picnic/feat/whatsapp-locations` creada desde `origin/production` (tag `v4.18.0-picnic.12`, `c37c4da474`). Sin índice codegraph en ese worktree: el MCP apunta al checkout `develop`, así que todo lo de abajo se leyó directo en el worktree de producción (degradación conocida).

## Qué encontré

**1. Selector de color cortado.** `components/widgets/ColorPicker.vue:67-69` posiciona el `Chrome` con `absolute -mt-2.5 z-[9999]`. Dentro del modal de etiquetas (`settings/labels/EditLabel.vue:81`, raíz `overflow-auto`) el panel sale del flujo, se recorta y tapa "Mostrar en barra lateral" y los botones (captura 1). `AddLabel.vue` usa el mismo componente. Otros consumidores: `inbox/Settings.vue`, `channels/Website.vue`, `PortalBaseSettings.vue`.

**2. Filtro "Mensajes no leídos".** `components-next/filter/provider.js:113-125`: `inputType: 'booleanSelect'`, operador solo `equal_to`; `ConditionRow.vue:92-95` pinta las opciones con `FILTER.ATTRIBUTE_LABELS.TRUE/FALSE` ("Verdadero/Falso"). Backend (`app/services/conversations/filter_service.rb:68-75`) y filtrado en cliente (`store/modules/conversations/helpers/filterHelpers.js:71-73,311-320`) ya se comportan como "tiene mensajes entrantes sin leer" = `true` / `false`. El contrato `true`/`false` es el que guardan las carpetas de filtros existentes, así que no se toca. Solo cambia lo que ve el agente.

**3. Ubicaciones de WhatsApp.** El catálogo es la plantilla a seguir: `Conversations::CatalogMessagesController` → `Whatsapp::CatalogMessageService` → mensaje con `content_attributes['whatsapp_catalog']` → `SendOnWhatsappService#send_session_message` (`send_on_whatsapp_service.rb:53-65`) lo desvía a `channel.send_catalog_message`. En el front: botón `catalog` en `ReplyBottomPanel.vue:268` (menú "+" móvil) y `:529` (barra desktop), `ReplyBox.vue:944` abre el modal, hoja móvil en `components-next/whatsapp-catalog/CatalogSheet.vue`. `WhatsappCloudService#send_message` (`whatsapp_cloud_service.rb:2-12`) no conoce el tipo `location`. Las plantillas viven en una columna jsonb del canal (`channel_whatsapp.message_templates`, `db/schema.rb:747`) y `_inbox.json.jbuilder:144-147` la expone a todos los agentes; `provider_config` solo se expone a administradores, por eso no sirve para guardar ubicaciones. Ojo del repo: `inboxes/updateInbox` manda FormData y los objetos anidados llegan como `"[object Object]"`, así que la lista de ubicaciones se guarda con un endpoint JSON propio y no por el update del inbox.

## Qué propongo, y qué queda afuera

Una rama, tres bloques, un commit por tarea:

- **A.** Arreglo del selector de color (visible y usable en móvil) y rescate del ajuste de banner `b61bda8657` (una línea en `Banner.vue`) que no entró en `picnic.12`.
- **B.** Filtro de conversaciones "Mensajes" con valor **Leídos / No leídos** (misma semántica, textos claros).
- **D.** Altura fija en los selectores con búsqueda: hoy la lista se encoge al escribir y todo "baja" (captura de la hoja móvil de Etiquetas con "Pq", y los desplegables de filtros). Con búsqueda activa la lista mantiene siempre la misma altura.
- **C.** Ubicaciones: el admin las gestiona en una pestaña **Ubicaciones** de los ajustes del inbox WhatsApp Cloud (nombre, dirección, latitud, longitud); en el compositor un selector (hoja en móvil, modal en desktop) lista cada una con nombre arriba y dirección abajo; al tocar una se envía un mensaje WhatsApp `type: "location"` (pin con nombre y dirección). Primera fila fija del selector: **"Ubicación actual"**, que pide permiso al navegador (`navigator.geolocation`), captura latitud y longitud del agente y las **envía directo** (no las adjunta al borrador). Requiere HTTPS (producción y `tailscale serve` lo son; `localhost` también); si el permiso se niega o falla, se muestra una alerta y no se envía nada. El mensaje se guarda como texto `nombre\ndirección` con `content_attributes.whatsapp_location`; sin burbuja nueva.

Decisiones tomadas con el dev: gestión en ajustes del inbox; cuatro campos manuales; burbuja de texto.

**D, qué componentes:** hoja móvil de etiquetas (`components-next/Conversation/ConversationCard/ConversationLabelsSheet.vue:105-106`, lista con `max-h-[50dvh]`), los tres selectores del filtro (`filter/inputs/MultiSelect.vue` y `SingleSelect.vue` con `dropdownMaxHeight` por defecto `max-h-80`; `FilterSelect.vue:130` con `[&>ul]:max-h-72`), y los desplegables compartidos `combobox/ComboBoxDropdown.vue:92` (`max-h-60`) y `dropdown-menu/DropdownMenu.vue` (`showSearch`). Se cambia `max-h-*` por altura fija **solo cuando el buscador está visible**; sin buscador (pocas opciones) la lista sigue ajustándose al contenido. Otros buscadores (Centro de ayuda, políticas de asignación, plantillas) quedan fuera, que se revisan después si se ven mal.

**No entra:** pegar enlaces de Google Maps, "solicitar ubicación al cliente" (mensaje interactivo `location_request_message`), ubicaciones a nivel cuenta, burbuja con mapa, operador "distinto de" en el filtro, enviar fuera de la ventana de 24 h (igual que catálogo/texto), proveedores distintos de WhatsApp Cloud, cambios en locales que no sean `en` y `es`, specs nuevos salvo el del validador de ubicaciones.

## Con qué restricciones

- Migración con `bundle exec rails g migration` (versión real), sin foreign keys (`CLAUDE.md`, `.claude/rules/migrations.md`).
- Validar parámetros en el controlador y devolver 422 con los errores existentes; el envío recibe `location_id` y el servidor toma las coordenadas del canal, no del cliente.
- Tailwind únicamente, `<script setup>`, componentes nuevos en `components-next/`, sin CSS propio nuevo; i18n sin strings sueltos: `en` y `es` (el fork es producto propio en español). `ColorPicker.vue` ya tiene SCSS heredado: solo se cambian clases, no se agrega más.
- Antes de tocar modelo/servicios, revisar `enterprise/` por overrides de `Channel::Whatsapp` y `WhatsappCloudService` (hay `prepend_mod_with`).
- Commits convencionales y **sin ninguna referencia a Claude** (regla del repo del fork; sin línea Co-Authored-By). El hook husky no corre en worktrees nuevos: correr eslint/rubocop a mano.

## Preguntas abiertas

Ninguna bloqueante. Supuestos: máximo 50 ubicaciones por canal; latitud −90..90, longitud −180..180; nombre ≤ 100 y dirección ≤ 300 caracteres (los límites de WhatsApp son más holgados, es para evitar basura).

## Encontrado de paso

- `components-next/filter/provider.js:118` declara `dataType: 'text'` para `unread` aunque `lib/filters/filter_keys.yml:19` dice `"unread"`; inconsistencia heredada, no se toca.
- Hay ramas locales ya integradas por squash (`picnic/fix/*`, `perf/*`) que `git branch` sigue mostrando "adelantadas"; ruido, no se limpia aquí.


## Cómo se verifica

Los valores son provisionales: el stack Docker de este worktree no se levantó durante el plan y la ronda 1 del verify los reemplaza por los números reales.

```bash
cd ~/Desarrollo/chatwoot-worktrees/production
docker compose exec -e RAILS_ENV=test rails bundle exec rspec spec/services/whatsapp/location_message_service_spec.rb spec/services/conversations/filter_service_spec.rb   # 0 failures
docker compose exec rails bundle exec rubocop app/controllers/api/v1/accounts app/services/whatsapp app/models/channel/whatsapp.rb db/migrate   # no offenses
docker compose exec vite pnpm eslint app/javascript/dashboard/components-next app/javascript/dashboard/components/widgets app/javascript/dashboard/routes/dashboard/settings   # 0 errors
docker compose exec vite pnpm test app/javascript/dashboard/components-next/filter app/javascript/dashboard/store/modules/conversations   # 0 failing
docker compose exec rails bundle exec rails db:migrate:status | grep locations   # up
```

Criterio del cambio entero, en navegador (http://localhost:3005, 375 px y desktop):
1. Ajustes › Etiquetas › Editar etiqueta: el selector de color se ve completo y se puede elegir color en móvil.
2. Conversaciones › Filtros › Mensajes › "No leídos" y "Leídos" devuelven listas distintas y complementarias; una carpeta de filtros guardada antes con `unread = true` sigue funcionando.
3. Inbox WhatsApp Cloud › Ubicaciones: crear "Casa Paraíso" con dirección y coordenadas; aparece en el selector del compositor con el nombre y la dirección debajo; al tocarla el mensaje llega al número de prueba como pin con nombre y dirección (prueba con `picnicart/dev/lucia.sh up --switch`, y siempre cerrar con `lucia.sh down`).
4. El banner de actualización no corta el texto a 375 px.
5. Hoja de Etiquetas en móvil y desplegables de filtros: escribir en el buscador no cambia el alto de la lista.
6. Compositor › Ubicación › "Ubicación actual": el navegador pide permiso, y al aceptarlo el número de prueba recibe un pin en las coordenadas del teléfono del agente (comprobar contra el dispositivo, necesita HTTPS: `https://<tailnet>:8443`).
