# Tareas · whatsapp-locations

El diff desde `Base` incluye este `proposal.md` y su `tasks.md`: son el cambio, no trabajo de más.


- [x] **1 · Selector de color sin recorte en móvil**
  - archivos: `app/javascript/dashboard/components/widgets/ColorPicker.vue`
  - depende de: ninguna
  - listo cuando: en ancho móvil (375 px) el panel `Chrome` queda dentro del flujo del modal (empuja el contenido, no se superpone ni se recorta) y desde `sm` hacia arriba conserva el comportamiento actual flotante; no se añade CSS nuevo
  - commit: `fix(labels): keep the color picker inside the modal on phones`

- [x] **2 · Ajuste del banner de actualización**
  - archivos: `app/javascript/dashboard/components/ui/Banner.vue`
  - depende de: ninguna
  - listo cuando: queda aplicado el cambio de `b61bda8657` (el banner crece y el texto no se corta en teléfonos); se trae con `git cherry-pick` y se reescribe el mensaje sin trailers
  - nota: al ejecutar, `Banner.vue` ya traía `min-h-12` (el cambio entró en `picnic.12` por squash); el cherry-pick quedó vacío y se omitió. Sin commit.
  - commit: ninguno (ya estaba en la base)

- [x] **3 · Filtro "Mensajes" con Leídos / No leídos**
  - archivos: `app/javascript/dashboard/components-next/filter/provider.js`, `app/javascript/dashboard/components-next/filter/ConditionRow.vue`, `app/javascript/dashboard/i18n/locale/en/advancedFilters.json`, `app/javascript/dashboard/i18n/locale/es/advancedFilters.json`, `app/javascript/dashboard/components-next/filter/specs/` (solo los specs que dejen de pasar)
  - depende de: ninguna
  - listo cuando: el atributo se llama "Mensajes" / "Messages"; el selector de valor ofrece "No leídos" y "Leídos" (o *Unread/Read*) en lugar de Verdadero/Falso; el payload sigue enviando `unread` con `true` (no leídos) / `false` (leídos); las opciones personalizadas del tipo se toman de la definición del filtro (`options`) y los demás `booleanSelect` (atributos personalizados tipo checkbox) siguen mostrando Verdadero/Falso
  - commit: `feat(filters): filter messages by read or unread instead of true or false`

- [x] **4 · Columna y modelo de ubicaciones**
  - archivos: `db/migrate/<timestamp>_add_locations_to_channel_whatsapp.rb`, `db/schema.rb`, `app/models/channel/whatsapp.rb`, `app/views/api/v1/models/_inbox.json.jbuilder`
  - depende de: ninguna
  - listo cuando: `channel_whatsapp.locations` es jsonb `default: []`; el modelo valida la lista (máx. 50; cada ítem con `id`, `name`, `address`, `latitude`, `longitude` dentro de rango) y el inbox serializa `locations` para todos los agentes cuando es WhatsApp; la migración corre y revierte limpia
  - commit: `feat(whatsapp): store saved locations on the channel`

- [x] **5 · Endpoint para guardar la lista de ubicaciones**
  - archivos: `app/controllers/api/v1/accounts/inboxes/whatsapp_locations_controller.rb`, `config/routes.rb`, `config/locales/en.yml`
  - depende de: 4
  - listo cuando: `PUT /api/v1/accounts/:account_id/inboxes/:inbox_id/whatsapp_locations` (solo administradores, solo inbox WhatsApp Cloud) reemplaza la lista, asigna `id` (uuid) a las nuevas y responde 422 con mensaje de `en.yml` si algún dato es inválido
  - commit: `feat(whatsapp): endpoint to manage saved locations`

- [ ] **6 · Envío del mensaje de ubicación**
  - archivos: `app/controllers/api/v1/accounts/conversations/location_messages_controller.rb`, `app/services/whatsapp/location_message_service.rb`, `app/services/whatsapp/providers/whatsapp_cloud_service.rb`, `app/services/whatsapp/send_on_whatsapp_service.rb`, `config/routes.rb`, `config/locales/en.yml`, `spec/services/whatsapp/location_message_service_spec.rb`
  - depende de: 5
  - listo cuando: `POST …/conversations/:id/location_message` acepta **o** `location_id` (ubicación guardada: nombre, dirección y coordenadas se toman del canal) **o** `latitude` y `longitude` (ubicación actual del agente, sin nombre ni dirección; contenido `Ubicación actual` y las coordenadas en texto) y crea el mensaje saliente con `content_attributes.whatsapp_location`; `SendOnWhatsappService` lo manda a la Cloud API como `type: 'location'` (`name` y `address` solo cuando existen); un `location_id` inexistente, coordenadas fuera de rango, mandar ambos modos a la vez, o una conversación que no es WhatsApp Cloud devuelve 422; el spec del servicio cubre el payload guardado, el payload de ubicación actual y el id inexistente
  - commit: `feat(whatsapp): send saved locations from a conversation`

- [ ] **7 · API del front e i18n de ubicaciones**
  - archivos: `app/javascript/dashboard/api/whatsappLocations.js`, `app/javascript/dashboard/api/whatsappLocationMessages.js`, `app/javascript/dashboard/i18n/locale/en/whatsappLocations.json`, `app/javascript/dashboard/i18n/locale/es/whatsappLocations.json`, `app/javascript/dashboard/i18n/locale/en/index.js`, `app/javascript/dashboard/i18n/locale/es/index.js`
  - depende de: 6
  - listo cuando: los dos clientes siguen el patrón de `api/whatsappCatalogMessages.js` y las claves `WHATSAPP_LOCATIONS.*` (pestaña, formulario, selector, errores) existen en `en` y `es` y quedan registradas en el índice de cada idioma
  - commit: `feat(whatsapp): api clients and translations for saved locations`

- [ ] **8 · Pestaña "Ubicaciones" en ajustes del inbox**
  - archivos: `app/javascript/dashboard/routes/dashboard/settings/inbox/settingsPage/WhatsappLocationsPage.vue`, `app/javascript/dashboard/routes/dashboard/settings/inbox/Settings.vue`, `app/javascript/dashboard/i18n/locale/en/inboxMgmt.json`, `app/javascript/dashboard/i18n/locale/es/inboxMgmt.json`
  - depende de: 7
  - listo cuando: en un inbox WhatsApp Cloud, el administrador ve la pestaña, agrega, edita y borra ubicaciones (nombre, dirección, latitud, longitud, con validación de rango) y al guardar la lista persiste tras recargar; el formulario es usable a 375 px
  - commit: `feat(whatsapp): manage saved locations from the inbox settings`

- [ ] **9 · Selector de ubicaciones en el compositor**
  - archivos: `app/javascript/dashboard/components-next/whatsapp-location/LocationPicker.vue`, `app/javascript/dashboard/components/widgets/WootWriter/ReplyBottomPanel.vue`, `app/javascript/dashboard/components/widgets/conversation/ReplyBox.vue`
  - depende de: 7
  - listo cuando: en un inbox WhatsApp Cloud aparece la acción "Ubicación" en el menú "+" móvil y en la barra desktop (también sin ubicaciones guardadas, porque "Ubicación actual" siempre está); abre una hoja inferior (móvil) o modal (desktop) cuya primera fila es "Ubicación actual" y debajo cada ubicación guardada (nombre y dirección debajo); tocar "Ubicación actual" pide permiso al navegador, y si lo concede envía de inmediato las coordenadas capturadas, y si lo niega o falla muestra una alerta sin enviar; tocar una guardada envía, cierra el selector y el mensaje aparece en la conversación; mientras se captura o envía la fila queda deshabilitada (sin doble envío); cerrar tocando el fondo no deja pasar el clic a lo de abajo (convención de overlays del fork)
  - commit: `feat(whatsapp): pick a saved location from the composer`

El diff desde `Base` incluye este `proposal.md` y su `tasks.md`: son el cambio, no trabajo de más. Este cambio **sí altera comportamiento** (filtro y envío de ubicaciones), así que lleva `specs/` con un requisito por capacidad (filtro de mensajes leídos/no leídos; ubicaciones de WhatsApp).

- [x] **10 · Altura fija en listas con búsqueda**
  - archivos: `app/javascript/dashboard/components-next/Conversation/ConversationCard/ConversationLabelsSheet.vue`, `app/javascript/dashboard/components-next/filter/inputs/MultiSelect.vue`, `app/javascript/dashboard/components-next/filter/inputs/SingleSelect.vue`, `app/javascript/dashboard/components-next/filter/inputs/FilterSelect.vue`, `app/javascript/dashboard/components-next/combobox/ComboBoxDropdown.vue`, `app/javascript/dashboard/components-next/dropdown-menu/DropdownMenu.vue`
  - depende de: ninguna
  - listo cuando: con el buscador visible, escribir y borrar texto no cambia el alto de la lista ni mueve la hoja o el desplegable (los resultados vacíos muestran el mensaje dentro del mismo alto); sin buscador la lista se ajusta al contenido como antes; la hoja móvil de etiquetas conserva su alto con "Pq" y con el campo vacío; sin CSS nuevo (clases Tailwind) y alturas en `dvh`/`rem`
  - commit: `fix(ui): keep searchable lists at a fixed height while filtering`

Paralelismo: 1, 2, 3, 4 y 10 son independientes entre sí; 5→6→7 en serie (comparten `routes.rb`, `en.yml` y el modelo); 8 y 9 en paralelo tras la 7.
