# Tareas · whatsapp-catalog

El diff desde `Base` incluye este `proposal.md` y su `tasks.md`: son el cambio, no trabajo de más.


- [x] **1 · Constructor del payload de Meta y límites**
  - archivos: `app/services/whatsapp/catalog_message_payload_builder.rb`, `spec/services/whatsapp/catalog_message_payload_builder_spec.rb`
  - depende de: ninguna
  - listo cuando: existe `Whatsapp::CatalogMessagePayloadBuilder` con constantes de topes por formato (carrusel 2–10, tarjeta 1, lista 1–30) y un método que, dado el texto y `content_attributes['whatsapp_catalog']`, devuelve el hash `interactive` de Meta: carrusel con `type: 'carousel'`, `body.text`, `action.cards[]` (`card_index` 0..n-1, `type: 'product'`, `action.product_retailer_id` y `catalog_id` en cada una) y sin header/footer; tarjeta con `type: 'product'` (body y footer solo si existen); lista con `type: 'product_list'`, `header: {type: 'text', text}`, `body`, `footer` opcional, `action.catalog_id` y `sections[]` agrupadas por `item['section']` conservando el orden; lanza error con mensaje claro si el número de productos sale del tope del formato o falta catálogo/SKU/cuerpo (carrusel, lista) /encabezado (lista); el spec cubre los tres formatos y esos errores con IDs inventados
  - commit: `feat(whatsapp): build interactive catalog payloads`

- [ ] **2 · Crear el mensaje de catálogo desde la conversación (endpoint)**
  - archivos: `app/services/whatsapp/catalog_message_service.rb`, `app/controllers/api/v1/accounts/conversations/catalog_messages_controller.rb`, `config/routes.rb`, `spec/services/whatsapp/catalog_message_service_spec.rb`, `spec/controllers/api/v1/accounts/conversations/catalog_messages_controller_spec.rb`
  - depende de: 1
  - listo cuando: `POST …/conversations/:conversation_id/catalog_message` (ruta junto a `contact_info_request`, `config/routes.rb:175`) recibe `kind` (`carousel|product|product_list`), `content`, `header`, `footer`, `catalog_id` y `products[]` con `retailer_id, name, price, image_urls, description, url, section`; el controlador responde 422 si el formato, los topes, los campos obligatorios del formato o el catálogo son inválidos, o si el inbox no es WhatsApp Cloud; el servicio crea **un** `Message` saliente vía `Messages::MessageBuilder` con `content` = cuerpo y `content_attributes.whatsapp_catalog`; la respuesta devuelve el mensaje creado; specs cubren los tres formatos, el tope (11 en carrusel, 31 en lista, 2 en tarjeta → 422) y los campos obligatorios faltantes
  - commit: `feat(whatsapp): create a catalog message from a conversation`

- [ ] **3 · Enviar y reintentar mensajes de catálogo por WhatsApp Cloud**
  - archivos: `app/services/whatsapp/providers/whatsapp_cloud_service.rb`, `app/controllers/api/v1/accounts/conversations/messages_controller.rb`, `spec/services/whatsapp/providers/whatsapp_cloud_service_spec.rb`, `spec/controllers/api/v1/accounts/conversations/messages_controller_spec.rb`
  - depende de: 1
  - listo cuando: `send_message` envía como `interactive` (payload del constructor de la tarea 1, `type: 'interactive'`, mismo `process_response`) cuando el mensaje trae `content_attributes['whatsapp_catalog']` y no tiene adjuntos; `retry_content_attributes` conserva `whatsapp_catalog` además de contact-info; los specs existentes de ambos archivos siguen en verde y los nuevos cubren el cuerpo HTTP enviado y que el reintento mantiene el catálogo
  - commit: `feat(whatsapp): send catalog messages through the cloud provider`

- [ ] **4 · Leer el catálogo de Meta (colecciones, productos y motivo si no hay)**
  - archivos: `app/services/whatsapp/catalog_service.rb`, `app/controllers/api/v1/accounts/inboxes_controller.rb`, `app/policies/inbox_policy.rb`, `config/routes.rb`, `spec/services/whatsapp/catalog_service_spec.rb`, `spec/controllers/api/v1/accounts/inboxes_controller_spec.rb`
  - depende de: 2 (comparten `config/routes.rb`: van en serie)
  - listo cuando: `GET …/inboxes/:id/whatsapp_catalog` responde 200 con `status` (`ok`, `no_catalog`, `missing_permission` o `error`) y, si `ok`, `catalog_id` y `collections[]` (`id`, `name`, `products[]` con `retailer_id, name, price, image_urls, description, url`) más una colección «sin colección» para productos fuera de toda colección; usa `provider_config['catalog_id']` si existe y si no `GET /{WABA}/product_catalogs`; un error de permiso de Meta se traduce a `missing_permission` y la ausencia de catálogo a `no_catalog` (nunca un 500); cachea 5 min por bandeja solo los resultados `ok`; 422 si la bandeja no es WhatsApp Cloud; `InboxPolicy#whatsapp_catalog?` permite a quien ve la bandeja; el token nunca sale al navegador; specs con respuestas de Graph simuladas (sin tokens reales); y **antes de cerrar la tarea** el subagente comprueba la forma real de la respuesta con una lectura de solo lectura desde el contenedor del stack local, sin imprimir el token, y documenta en su reporte los campos reales (`price` e `image_url`)
  - commit: `feat(whatsapp): read the connected catalog from Meta`

- [ ] **5 · Ayudantes, cliente de API y textos del front**
  - archivos: `app/javascript/dashboard/helper/whatsappCatalog.js`, `app/javascript/dashboard/helper/specs/whatsappCatalog.spec.js`, `app/javascript/dashboard/api/inboxes.js`, `app/javascript/dashboard/api/whatsappCatalogMessages.js`, `app/javascript/dashboard/i18n/locale/en/conversation.json`, `app/javascript/dashboard/i18n/locale/es/conversation.json`
  - depende de: 2, 4
  - listo cuando: `whatsappCatalog.js` exporta los topes por formato (carrusel 2–10, tarjeta 1, lista 1–30) y de texto (1024 / 60 / 24), `validateCatalogForm({ kind, items, body, header, footer })` que devuelve los errores por campo según la tabla (carrusel sin cuerpo, lista sin encabezado, fuera de tope, textos largos) y `groupProductsBySection`; `api/inboxes.js` suma `getWhatsappCatalog(inboxId)` y `api/whatsappCatalogMessages.js` suma `create(conversationId, payload)`; `en` y `es` traen el espacio `CATALOG.*` con todos los textos de las tareas 6–8 (botón, pasos del modal, contador «3 / 10», campos y errores, guía de configuración por motivo, detalle del producto); el spec cubre los tres formatos en los bordes 0/1/2/10/11/30/31 y la validación de campos
  - commit: `feat(whatsapp): catalog helpers, API clients and strings`

- [ ] **6 · Modal de catálogo: formato, productos, campos y guía**
  - archivos: `app/javascript/dashboard/components/widgets/conversation/WhatsappCatalog/Modal.vue`, `app/javascript/dashboard/components/widgets/conversation/WhatsappCatalog/ProductRow.vue`, `app/javascript/dashboard/components/widgets/conversation/WhatsappCatalog/SetupGuide.vue`, `app/javascript/dashboard/components/widgets/conversation/WhatsappCatalog/specs/Modal.spec.js`
  - depende de: 5
  - listo cuando: el modal abre en el paso de **formato** y, según lo elegido, carga el catálogo, lista productos por colección con marcado múltiple y un contador «n / máx» que impide pasar del tope (tarjeta = 1), muestra los campos del formato con su obligatoriedad y contador de caracteres, valida con `validateCatalogForm`, precarga el cuerpo con el texto recibido del compositor, y envía con `whatsappCatalogMessages.create`, emitiendo `sent` (y `close`); si el estado del catálogo no es `ok` muestra `SetupGuide` con los pasos del motivo (sin catálogo, sin permiso, error) y el enlace a la configuración de la bandeja solo para administradores; en escritorio es un diálogo centrado y bajo 640 px una hoja inferior a ancho completo con scroll interno y acciones fijas; estados de carga y error; sin botones de compra ni carrito; el spec cubre el tope de 10 en carrusel, los campos obligatorios de lista, el envío con el payload esperado y la guía con `no_catalog`
  - commit: `feat(whatsapp): catalog dialog with format, products and fields`

- [ ] **7 · Burbuja de catálogo con detalle**
  - archivos: `app/javascript/dashboard/components-next/message/bubbles/WhatsappCatalog.vue`, `app/javascript/dashboard/components-next/message/bubbles/WhatsappCatalogDetail.vue`, `app/javascript/dashboard/components-next/message/bubbles/specs/WhatsappCatalog.spec.js`, `app/javascript/dashboard/components-next/message/Message.vue`
  - depende de: 5 (comparte `conversation.json` con la 6: el orquestador las pone en serie)
  - listo cuando: `Message.vue` elige la burbuja nueva cuando `contentAttributes.whatsappCatalog` existe (al lado de `whatsappFlowResponse`); el carrusel se ve como tarjetas horizontales con foto, título, precio y «Ver»; la tarjeta como una sola; la lista con encabezado, miniatura, nombre de colección, «N artículos» y «Ver artículos»; el texto del mensaje arriba como cuerpo y el pie si existe; tocar «Ver» o una tarjeta abre el detalle (galería de fotos con indicador, título, precio, descripción, enlace; sin botón de añadir al pedido ni vídeo); en móvil el carrusel hace scroll horizontal táctil y el detalle ocupa la pantalla; colores y bordes de Chatwoot; el spec cubre los tres tipos y abrir el detalle
  - commit: `feat(whatsapp): show catalog messages in the conversation`

- [ ] **8 · Botón de catálogo en el compositor**
  - archivos: `app/javascript/dashboard/components/widgets/WootWriter/ReplyBottomPanel.vue`, `app/javascript/dashboard/components/widgets/conversation/ReplyBox.vue`, `app/javascript/dashboard/components/widgets/conversation/specs/ReplyBox.spec.js`
  - depende de: 6
  - listo cuando: en toda bandeja WhatsApp Cloud, fuera de nota privada, aparece el botón Catálogo en escritorio (junto a los demás) y una fila «Catálogo» en el menú «+» del móvil; fuera de la ventana de 24 h queda deshabilitado con el motivo que ya muestra el compositor; al tocarlo se abre el modal de la tarea 6 pasándole el texto actual del editor, y al emitir `sent` se limpia el editor; en bandejas que no son WhatsApp Cloud el botón no existe; el adjunto y el texto que el agente tenía no se pierden si cierra el modal sin enviar; `ReplyBox.spec.js` sigue en verde y se agrega un caso para botón visible/oculto
  - commit: `feat(whatsapp): catalog button in the composer`

- [ ] **9 · ID de catálogo manual en la configuración de la bandeja**
  - archivos: `app/javascript/dashboard/routes/dashboard/settings/inbox/channels/CloudWhatsapp.vue`, `app/javascript/dashboard/routes/dashboard/settings/inbox/Settings.vue`, `app/javascript/dashboard/i18n/locale/en/inboxMgmt.json`, `app/javascript/dashboard/i18n/locale/es/inboxMgmt.json`
  - depende de: 4
  - listo cuando: en la configuración de una bandeja WhatsApp Cloud existe un campo opcional «ID del catálogo» que se guarda en `provider_config.catalog_id` y que la lectura de la tarea 4 respeta; vacío = descubrimiento automático; el texto de ayuda explica cuándo hace falta (token sin permiso de catálogo); sin cambios en el alta de bandejas nuevas
  - commit: `feat(whatsapp): optional catalog id in the inbox settings`

