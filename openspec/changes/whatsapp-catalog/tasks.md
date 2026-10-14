# Tareas · whatsapp-catalog

El diff desde `Base` incluye este `proposal.md` y su `tasks.md`: son el cambio, no trabajo de más.


- [x] **1 · Constructor del payload de Meta y límites**
  - archivos: `app/services/whatsapp/catalog_message_payload_builder.rb`, `spec/services/whatsapp/catalog_message_payload_builder_spec.rb`
  - depende de: ninguna
  - listo cuando: existe `Whatsapp::CatalogMessagePayloadBuilder` con constantes de topes por formato (carrusel 2–10, tarjeta 1, lista 1–30) y un método que, dado el texto y `content_attributes['whatsapp_catalog']`, devuelve el hash `interactive` de Meta: carrusel con `type: 'carousel'`, `body.text`, `action.cards[]` (`card_index` 0..n-1, `type: 'product'`, `action.product_retailer_id` y `catalog_id` en cada una) y sin header/footer; tarjeta con `type: 'product'` (body y footer solo si existen); lista con `type: 'product_list'`, `header: {type: 'text', text}`, `body`, `footer` opcional, `action.catalog_id` y `sections[]` agrupadas por `item['section']` conservando el orden; lanza error con mensaje claro si el número de productos sale del tope del formato o falta catálogo/SKU/cuerpo (carrusel, lista) /encabezado (lista); el spec cubre los tres formatos y esos errores con IDs inventados
  - commit: `feat(whatsapp): build interactive catalog payloads`

- [x] **2 · Crear el mensaje de catálogo desde la conversación (endpoint)**
  - archivos: `app/services/whatsapp/catalog_message_service.rb`, `app/controllers/api/v1/accounts/conversations/catalog_messages_controller.rb`, `config/routes.rb`, `spec/services/whatsapp/catalog_message_service_spec.rb`, `spec/controllers/api/v1/accounts/conversations/catalog_messages_controller_spec.rb`
  - depende de: 1
  - listo cuando: `POST …/conversations/:conversation_id/catalog_message` (ruta junto a `contact_info_request`, `config/routes.rb:175`) recibe `kind` (`carousel|product|product_list`), `content`, `header`, `footer`, `catalog_id` y `products[]` con `retailer_id, name, price, image_urls, description, url, section`; el controlador responde 422 si el formato, los topes, los campos obligatorios del formato o el catálogo son inválidos, o si el inbox no es WhatsApp Cloud; el servicio crea **un** `Message` saliente vía `Messages::MessageBuilder` con `content` = cuerpo y `content_attributes.whatsapp_catalog`; la respuesta devuelve el mensaje creado; specs cubren los tres formatos, el tope (11 en carrusel, 31 en lista, 2 en tarjeta → 422) y los campos obligatorios faltantes
  - commit: `feat(whatsapp): create a catalog message from a conversation`

- [x] **3 · Enviar y reintentar mensajes de catálogo por WhatsApp Cloud**
  - archivos: `app/services/whatsapp/providers/whatsapp_cloud_service.rb`, `app/controllers/api/v1/accounts/conversations/messages_controller.rb`, `spec/services/whatsapp/providers/whatsapp_cloud_service_spec.rb`, `spec/controllers/api/v1/accounts/conversations/messages_controller_spec.rb`
  - depende de: 1
  - listo cuando: `send_message` envía como `interactive` (payload del constructor de la tarea 1, `type: 'interactive'`, mismo `process_response`) cuando el mensaje trae `content_attributes['whatsapp_catalog']` y no tiene adjuntos; `retry_content_attributes` conserva `whatsapp_catalog` además de contact-info; los specs existentes de ambos archivos siguen en verde y los nuevos cubren el cuerpo HTTP enviado y que el reintento mantiene el catálogo
  - commit: `feat(whatsapp): send catalog messages through the cloud provider`

- [x] **4 · Leer el catálogo de Meta (colecciones, productos y motivo si no hay)**
  - archivos: `app/services/whatsapp/catalog_service.rb`, `app/controllers/api/v1/accounts/inboxes_controller.rb`, `app/policies/inbox_policy.rb`, `config/routes.rb`, `spec/services/whatsapp/catalog_service_spec.rb`, `spec/controllers/api/v1/accounts/inboxes_controller_spec.rb`
  - depende de: 2 (comparten `config/routes.rb`: van en serie)
  - listo cuando: `GET …/inboxes/:id/whatsapp_catalog` responde 200 con `status` (`ok`, `no_catalog`, `missing_permission` o `error`) y, si `ok`, `catalog_id` y `collections[]` (`id`, `name`, `products[]` con `retailer_id, name, price, image_urls, description, url`) más una colección «sin colección» para productos fuera de toda colección; usa `provider_config['catalog_id']` si existe y si no `GET /{WABA}/product_catalogs`; un error de permiso de Meta se traduce a `missing_permission` y la ausencia de catálogo a `no_catalog` (nunca un 500); cachea 5 min por bandeja solo los resultados `ok`; 422 si la bandeja no es WhatsApp Cloud; `InboxPolicy#whatsapp_catalog?` permite a quien ve la bandeja; el token nunca sale al navegador; specs con respuestas de Graph simuladas (sin tokens reales); y **antes de cerrar la tarea** el subagente comprueba la forma real de la respuesta con una lectura de solo lectura desde el contenedor del stack local, sin imprimir el token, y documenta en su reporte los campos reales (`price` e `image_url`)
  - commit: `feat(whatsapp): read the connected catalog from Meta`

- [x] **5 · Ayudantes, cliente de API y textos del front**
  - archivos: `app/javascript/dashboard/helper/whatsappCatalog.js`, `app/javascript/dashboard/helper/specs/whatsappCatalog.spec.js`, `app/javascript/dashboard/api/inboxes.js`, `app/javascript/dashboard/api/whatsappCatalogMessages.js`, `app/javascript/dashboard/i18n/locale/en/conversation.json`, `app/javascript/dashboard/i18n/locale/es/conversation.json`
  - depende de: 2, 4
  - listo cuando: `whatsappCatalog.js` exporta los topes por formato (carrusel 2–10, tarjeta 1, lista 1–30) y de texto (1024 / 60 / 24), `validateCatalogForm({ kind, items, body, header, footer })` que devuelve los errores por campo según la tabla (carrusel sin cuerpo, lista sin encabezado, fuera de tope, textos largos) y `groupProductsBySection`; `api/inboxes.js` suma `getWhatsappCatalog(inboxId)` y `api/whatsappCatalogMessages.js` suma `create(conversationId, payload)`; `en` y `es` traen el espacio `CATALOG.*` con todos los textos de las tareas 6–8 (botón, pasos del modal, contador «3 / 10», campos y errores, guía de configuración por motivo, detalle del producto); el spec cubre los tres formatos en los bordes 0/1/2/10/11/30/31 y la validación de campos
  - commit: `feat(whatsapp): catalog helpers, API clients and strings`

- [x] **6 · Modal de catálogo: formato, productos, campos y guía**
  - archivos: `app/javascript/dashboard/components/widgets/conversation/WhatsappCatalog/Modal.vue`, `app/javascript/dashboard/components/widgets/conversation/WhatsappCatalog/ProductRow.vue`, `app/javascript/dashboard/components/widgets/conversation/WhatsappCatalog/SetupGuide.vue`, `app/javascript/dashboard/components/widgets/conversation/WhatsappCatalog/specs/Modal.spec.js`
  - depende de: 5
  - listo cuando: el modal abre en el paso de **formato** y, según lo elegido, carga el catálogo, lista productos por colección con marcado múltiple y un contador «n / máx» que impide pasar del tope (tarjeta = 1), muestra los campos del formato con su obligatoriedad y contador de caracteres, valida con `validateCatalogForm`, precarga el cuerpo con el texto recibido del compositor, y envía con `whatsappCatalogMessages.create`, emitiendo `sent` (y `close`); si el estado del catálogo no es `ok` muestra `SetupGuide` con los pasos del motivo (sin catálogo, sin permiso, error) y el enlace a la configuración de la bandeja solo para administradores; en escritorio es un diálogo centrado y bajo 640 px una hoja inferior a ancho completo con scroll interno y acciones fijas; estados de carga y error; sin botones de compra ni carrito; el spec cubre el tope de 10 en carrusel, los campos obligatorios de lista, el envío con el payload esperado y la guía con `no_catalog`
  - commit: `feat(whatsapp): catalog dialog with format, products and fields`

- [x] **7 · Burbuja de catálogo con detalle**
  - archivos: `app/javascript/dashboard/components-next/message/bubbles/WhatsappCatalog.vue`, `app/javascript/dashboard/components-next/message/bubbles/WhatsappCatalogDetail.vue`, `app/javascript/dashboard/components-next/message/bubbles/specs/WhatsappCatalog.spec.js`, `app/javascript/dashboard/components-next/message/Message.vue`
  - depende de: 5 (comparte `conversation.json` con la 6: el orquestador las pone en serie)
  - listo cuando: `Message.vue` elige la burbuja nueva cuando `contentAttributes.whatsappCatalog` existe (al lado de `whatsappFlowResponse`); el carrusel se ve como tarjetas horizontales con foto, título, precio y «Ver»; la tarjeta como una sola; la lista con encabezado, miniatura, nombre de colección, «N artículos» y «Ver artículos»; el texto del mensaje arriba como cuerpo y el pie si existe; tocar «Ver» o una tarjeta abre el detalle (galería de fotos con indicador, título, precio, descripción, enlace; sin botón de añadir al pedido ni vídeo); en móvil el carrusel hace scroll horizontal táctil y el detalle ocupa la pantalla; colores y bordes de Chatwoot; el spec cubre los tres tipos y abrir el detalle
  - commit: `feat(whatsapp): show catalog messages in the conversation`

- [x] **8 · Botón de catálogo en el compositor**
  - archivos: `app/javascript/dashboard/components/widgets/WootWriter/ReplyBottomPanel.vue`, `app/javascript/dashboard/components/widgets/conversation/ReplyBox.vue`, `app/javascript/dashboard/components/widgets/conversation/specs/ReplyBox.spec.js`
  - depende de: 6
  - listo cuando: en toda bandeja WhatsApp Cloud, fuera de nota privada, aparece el botón Catálogo en escritorio (junto a los demás) y una fila «Catálogo» en el menú «+» del móvil; fuera de la ventana de 24 h queda deshabilitado con el motivo que ya muestra el compositor; al tocarlo se abre el modal de la tarea 6 pasándole el texto actual del editor, y al emitir `sent` se limpia el editor; en bandejas que no son WhatsApp Cloud el botón no existe; el adjunto y el texto que el agente tenía no se pierden si cierra el modal sin enviar; `ReplyBox.spec.js` sigue en verde y se agrega un caso para botón visible/oculto
  - commit: `feat(whatsapp): catalog button in the composer`

- [x] **9 · ID de catálogo manual en la configuración de la bandeja**
  - archivos: `app/javascript/dashboard/routes/dashboard/settings/inbox/channels/CloudWhatsapp.vue`, `app/javascript/dashboard/routes/dashboard/settings/inbox/Settings.vue`, `app/javascript/dashboard/i18n/locale/en/inboxMgmt.json`, `app/javascript/dashboard/i18n/locale/es/inboxMgmt.json`
  - depende de: 4
  - listo cuando: en la configuración de una bandeja WhatsApp Cloud existe un campo opcional «ID del catálogo» que se guarda en `provider_config.catalog_id` y que la lectura de la tarea 4 respeta; vacío = descubrimiento automático; el texto de ayuda explica cuándo hace falta (token sin permiso de catálogo); sin cambios en el alta de bandejas nuevas
  - commit: `feat(whatsapp): optional catalog id in the inbox settings`


## Ronda 2 · ajustes tras la prueba del dev (catálogo primero, buscador, rendimiento)

Esta ronda **reemplaza el flujo del modal de las tareas 5 y 6** (formato primero) por: ver el catálogo → seleccionar → formato. Las tareas 1–4, 7 y 9 no cambian de comportamiento; la 4 cambia la forma de su respuesta (la consume solo el modal).

- [x] **10 · Catálogo en una sola llamada, sin «All Products» y con caché**
  - archivos: `app/services/whatsapp/catalog_service.rb`, `app/controllers/api/v1/accounts/inboxes_controller.rb`, `spec/services/whatsapp/catalog_service_spec.rb`, `spec/controllers/api/v1/accounts/inboxes_controller_spec.rb`
  - depende de: ninguna
  - listo cuando: `GET …/inboxes/:id/whatsapp_catalog` hace como máximo **una** lectura de `product_catalogs` (el ID del catálogo se cachea 24 h por bandeja) y **una** lectura paginada de `/{catalog_id}/products` pidiendo `product_sets{id,name}` en cada producto (sin leer cada colección por separado); responde `{ status, catalog_id, collections: [{ id, name, count }], products: [{ retailer_id, name, price, image_urls, description, url, collection_ids: [] }] }` con cada producto **una sola vez**, y la colección por defecto de Meta llamada «All Products» **no** aparece en `collections` ni en `collection_ids`; el resultado `ok` se cachea 15 min por bandeja y `?refresh=1` lo salta y lo vuelve a guardar; los errores siguen sin cachearse y los estados `no_catalog`/`missing_permission`/`error` no cambian; los specs cubren la lectura en una llamada, el producto en dos colecciones (una sola fila con dos `collection_ids`), la exclusión de «All Products», la caché y `refresh`
  - commit: `perf(whatsapp): read the catalog in one call and cache it`

- [x] **11 · Ayudantes: buscador, formatos disponibles y precarga en memoria**
  - archivos: `app/javascript/dashboard/helper/whatsappCatalog.js`, `app/javascript/dashboard/helper/specs/whatsappCatalog.spec.js`, `app/javascript/dashboard/helper/whatsappCatalogCache.js`, `app/javascript/dashboard/helper/specs/whatsappCatalogCache.spec.js`, `app/javascript/dashboard/api/inboxes.js`, `app/javascript/dashboard/i18n/locale/en/conversation.json`, `app/javascript/dashboard/i18n/locale/es/conversation.json`
  - depende de: 10
  - listo cuando: `whatsappCatalog.js` suma `filterCatalogProducts(products, { query, collectionId })` (sin distinguir mayúsculas/acentos, busca en nombre y descripción) y `getAvailableFormats(count)` que devuelve para cada formato si está disponible y por qué no (`MIN_ITEMS`/`MAX_ITEMS` con el número), con topes carrusel 2–10, tarjeta 1, lista 1–30 y tope global de selección 30; `whatsappCatalogCache.js` expone `loadCatalog(inboxId, { force })` que guarda el resultado `ok` en memoria 5 min por bandeja, comparte la petición en curso entre llamadas simultáneas y no guarda errores, y `prefetchCatalog(inboxId)` que lo precarga en silencio sin lanzar errores; `api/inboxes.js` acepta `refresh` en `getWhatsappCatalog`; `en` y `es` suman textos de buscador, «Todos», «Seleccionar», «Cancelar selección», «Ver más», selector de formato, motivos de formato no disponible, «Actualizar»; los specs cubren búsqueda con acentos, formatos disponibles con 0/1/2/10/11/30/31 seleccionados, y la caché (una sola petición para dos llamadas simultáneas, expiración y no cachear errores)
  - commit: `feat(whatsapp): catalog search, format availability and in-memory cache`

- [ ] **12 · Modal en dos vistas: Productos y Formato**
  - archivos: `app/javascript/dashboard/components/widgets/conversation/WhatsappCatalog/Modal.vue`, `app/javascript/dashboard/components/widgets/conversation/WhatsappCatalog/ProductRow.vue`, `app/javascript/dashboard/components/widgets/conversation/WhatsappCatalog/specs/Modal.spec.js`
  - depende de: 11
  - listo cuando: el modal abre directamente en la vista **Productos**: buscador arriba, chips de colecciones («Todos» y las de `collections`) y la lista con cada producto una sola vez (miniatura con carga diferida, nombre, precio) y un botón **Ver más** que abre el detalle del producto (galería de fotos, título, precio, descripción, enlace; sin vídeo ni botones de compra) reutilizando `components-next/message/bubbles/WhatsappCatalogDetail.vue`; el botón **Seleccionar** activa el modo selección (casillas visibles, contador «n / 30», tope global 30, barra inferior con «Siguiente» que solo se habilita con al menos 1 y botón para salir de la selección); la vista **Formato** muestra un selector con los tres formatos donde los no disponibles para la cantidad elegida aparecen deshabilitados con su motivo, y debajo los campos del formato (obligatorios marcados, contadores) y el botón Enviar, con «Atrás» que conserva la selección; usa `loadCatalog` de la caché (el catálogo precargado aparece al instante, con un indicador de carga solo si aún no hay datos) y un botón Actualizar que fuerza la recarga; si el estado no es `ok` sigue mostrando `SetupGuide`; en móvil sigue siendo hoja inferior con acciones fijas; el spec cubre la búsqueda filtrando la lista, que un producto en dos colecciones aparece una vez, Ver más abriendo el detalle, el flujo Seleccionar → Formato con carrusel deshabilitado con 1 producto y lista habilitada, y el envío con el payload esperado
  - commit: `feat(whatsapp): catalog dialog with browse, search and select modes`

- [ ] **13 · Precarga del catálogo al abrir una conversación de WhatsApp Cloud**
  - archivos: `app/javascript/dashboard/components/widgets/conversation/ReplyBox.vue`, `app/javascript/dashboard/components/widgets/conversation/specs/ReplyBox.spec.js`
  - depende de: 11
  - listo cuando: al montar el compositor (y al cambiar de bandeja) en una conversación de WhatsApp Cloud se llama a `prefetchCatalog(inbox.id)` una sola vez por bandeja sin bloquear ni mostrar errores, y no se llama en otros canales ni en nota privada; `ReplyBox.spec.js` sigue en verde y un caso verifica que se precarga en WhatsApp Cloud y no en otros canales
  - commit: `perf(whatsapp): prefetch the catalog when the composer opens`
