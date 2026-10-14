# Catálogo de WhatsApp en el compositor: enviar carrusel, tarjeta o lista de productos desde un modal, y verlos en la conversación

> **Rama:** `picnic/feat/whatsapp-catalog`
> **Base:** `53a21590ee`

El diff desde `Base` incluye este `proposal.md` y su `tasks.md`: son el cambio, no trabajo de más.

## Qué encontré

**Sin grafo:** el worktree `production` no tiene `.codegraph/` (`ls .codegraph` vacío) y en plan mode no puedo indexarlo; el alcance sale de `Read`/`grep` sobre ese worktree y no hay `codegraph_impact`. El apply debe correr `calcifer worktrees index` o `grep` por cada símbolo que cambie.

**Meta (docs oficiales leídas hoy; la fuente va entre paréntesis):**
- *Carrusel de productos* (`interactive.type: "carousel"`): **2 a 10 tarjetas**, `card_index` 0–9 único, cada tarjeta `type: "product"` con `action.product_retailer_id` + `catalog_id` (el mismo en todas); **cuerpo obligatorio, máx. 1024**; **sin header, footer ni botones**. (developers.facebook.com › catalogs/interactive-product-carousel-messages)
- *Tarjeta* (`interactive.type: "product"`): `action.catalog_id` + `product_retailer_id`; body y footer opcionales. Si el SKU no existe en el catálogo, la API rechaza y no envía. (…/catalogs/single-product-messages)
- *Lista* (`interactive.type: "product_list"`): **hasta 30 productos** en secciones (`sections[].title` + `product_items[].product_retailer_id`), **header de tipo texto obligatorio**, body obligatorio, footer opcional. Si al menos un SKU coincide se envía y los demás se descartan. Meta no documenta máx. de secciones ni límites de caracteres del header/título (hay que probar contra la API). (…/catalogs/multi-product-messages)
- *Vídeo:* la página de detalle de producto en WhatsApp **muestra solo imágenes**; los vídeos/GIF del producto no se ven. Los productos del catálogo sí tienen campo `videos`, pero WhatsApp no los usa. → **No habrá vídeo** ni en el envío ni en el detalle de la burbuja (así vemos lo mismo que el cliente).
- *Leer el catálogo:* `GET /{WABA}/product_catalogs` (permisos `whatsapp_business_management`, `whatsapp_business_messaging`, **`catalog_management`**, token de usuario) devuelve el catálogo conectado; los productos tienen `retailer_id, name, description, price, image_url, additional_image_urls, url`. (…/graph-api/reference/whats-app-business-account/product_catalogs, …/product-item). **Riesgo principal:** si el token del inbox no trae `catalog_management`, el descubrimiento automático falla → por eso el campo manual de respaldo y la guía en el modal.
- Los mensajes interactivos solo se envían dentro de la ventana de 24 h (no son plantillas).

**Código (production @ `53a21590ee`):**
- `Message.content_attributes` es un JSON libre (`app/models/message.rb:112`); `Messages::MessageBuilder` ya acepta `content_attributes` del request (`app/builders/messages/message_builder.rb:41-46,151`). **Precedente exacto:** `Whatsapp::ContactInfoRequestService` crea el mensaje con `content_attributes.whatsapp_contact_info` (`app/services/whatsapp/contact_info_request_service.rb:1-30`, ruta `config/routes.rb:175`), el proveedor lo envía como `interactive` (`app/services/whatsapp/providers/whatsapp_cloud_contact_info_request_service.rb:11-20`) y la burbuja se elige por `contentAttributes.whatsappFlowResponse` (`components-next/message/Message.vue:301-303`).
- El proveedor decide cómo enviar en `WhatsappCloudService#send_message` (`whatsapp_cloud_service.rb:2-12`); la ventana de 24 h la comprueba `SendOnWhatsappService#perform_reply` (`send_on_whatsapp_service.rb:12-24`, `can_reply?`).
- **Trampa:** el reintento de un mensaje fallido **borra** `content_attributes` salvo el de contact-info (`conversations/messages_controller.rb:83-87`). Un catálogo fallido se reenviaría como texto plano si no se preserva `whatsapp_catalog`.
- `useCamelCase` pasa `content_attributes` a camelCase (`MessageList.vue:44-51`): en el front será `contentAttributes.whatsappCatalog`.
- Hay un endpoint de miembro de bandeja para datos de WhatsApp (`inboxes#message_templates`, `config/routes.rb:295-306`, `InboxPolicy#message_templates? → true`): el patrón a imitar para leer el catálogo.
- Compositor: botones de WhatsApp en escritorio (`ReplyBottomPanel.vue:499-520`) y filas del menú «+» del móvil (`mobileMenuItems`, `ReplyBottomPanel.vue:200-265`); modal de plantillas como patrón (`WhatsappTemplates/Modal.vue`); el envío pasa por `ReplyBox.vue` (`onSendReply` ~1029).
- El servicio de mensajes entrantes no trata el tipo `order` (grep sin coincidencias): los pedidos del cliente hoy no se muestran; el dev lo dejó para otra tanda.
- `docker compose ls` muestra el proyecto `production` con archivos del worktree `perf-lazy` además del de `production`: antes de probar, confirmar que el stack monta este worktree.
- El release `v4.18.0-picnic.8` terminó bien en GitHub Actions (run 38515098794, `success`); sigue pendiente su despliegue por la sesión del servidor.

## Qué propongo, y qué queda afuera

**Resultado:** en una conversación de WhatsApp Cloud, fuera de nota privada, el agente abre **Catálogo** (botón junto a los demás en escritorio, fila en el menú «+» en móvil) y en **un solo modal**:
1. **Elige el formato** (carrusel / tarjeta / lista). El formato fija los límites desde el principio.
2. **Elige productos**, agrupados por colección, con tope visible según el formato (contador «3 / 10»; al llegar al máximo no deja marcar más). Por eso **un envío = un mensaje de WhatsApp**: no hay reparto en varios mensajes.
3. **Llena los campos del formato** (obligatorios marcados), ver tabla.
4. **Envía desde el modal.** En la conversación el mensaje se ve como en WhatsApp (tarjetas, «Ver» abre el detalle con galería, título, precio, descripción y enlace).

| Formato | Productos | Campos del modal (límites de Meta) |
|---|---|---|
| Carrusel | 2 a 10 | Texto del mensaje **obligatorio** (≤ 1024). Sin encabezado ni pie (Meta no los admite) |
| Tarjeta | 1 | Texto del mensaje opcional (≤ 1024), pie opcional (≤ 60) |
| Lista | 1 a 30 | Encabezado **obligatorio** (texto, sugerido: nombre de la primera colección), texto del mensaje **obligatorio** (≤ 1024), pie opcional (≤ 60); secciones = las colecciones del modal |

**Dónde va el texto del cuerpo (propuesta; el dev la puede voltear):** todo en el modal, con el cuerpo **precargado con lo que ya haya escrito en el compositor**, que se limpia al enviar. Razón: encabezado y pie no existen en el compositor; partir los campos entre modal y compositor obliga a un borrador intermedio (chip, aviso, estados al cambiar de modo y nota privada) y deja dos sitios para un mismo mensaje. Costo: el cuerpo no usa las ayudas del editor (menciones, `/`), que en un cuerpo interactivo de WhatsApp (texto plano) tampoco aplican.

**Siempre visible, con guía:** el botón Catálogo aparece en toda bandeja WhatsApp Cloud (no solo con catálogo). Si **no hay catálogo asociado o falta el permiso**, al tocarlo el modal no muestra productos sino una **guía de qué hacer**: conectar un catálogo a la cuenta de WhatsApp Business en Meta, dar permiso `catalog_management` al token, o pegar el ID del catálogo en la configuración de la bandeja (enlace para administradores). El motivo (sin catálogo / sin permiso / error de Meta) lo da el backend.

**Qué se guarda:** `content` = texto del cuerpo y `content_attributes.whatsapp_catalog = { kind, catalog_id, header, footer, items: [{ retailer_id, name, price, image_urls[], description, url, section }] }` = **foto del momento del envío** (WhatsApp muestra siempre el precio vivo; la burbuja es lo que el agente vio al enviar). Las imágenes se referencian por URL del catálogo, no se copian.

**Descubrimiento del catálogo:** automático (`product_catalogs` del WABA) con respaldo manual `provider_config['catalog_id']` editable en la configuración de la bandeja.

**No entra (queda dicho):**
- Enviar varios mensajes de una vez (varias tarjetas, partir un carrusel de 11): con los topes por formato no hace falta; para varias tarjetas se repite el envío.
- Formularios/Flows y cualquier otro interactivo: siguen como hoy.
- Mensaje de catálogo completo (`catalog_message`), vídeo, carrito, «añadir al pedido», checkout.
- **Pedidos entrantes (`type: order`)**: otra tanda; el dev pidió dejarlo guardado en memoria (engram), lo hago al aprobar (en plan mode no puedo escribir).
- Otros proveedores (360dialog) y otros canales; nota privada.
- Editar el catálogo de Meta, búsqueda por texto, paginación infinita (se carga una vez, cacheado 5 min).

## Con qué restricciones
- Solo fork; sin PR a Chatwoot. Rama desde `origin/production`. Commits convencionales, **sin mencionar IA**; stagear por archivo; nunca `.env`, `docker-compose.override.yml`, `.claude/`, `.codegraph/`.
- Rails: validar parámetros en el controlador (422), sin fallbacks especulativos, sin helpers de un solo uso; clases compactas `module/class`; RuboCop 150 cols. Sin migración (todo en JSON existente).
- Enterprise: revisar `enterprise/` antes de tocar `WhatsappCloudService` (hay `prepend_mod_with` al final del archivo); no debería cambiar.
- Vue: `<script setup>` en archivos nuevos, Tailwind únicamente (sin CSS propio ni inline), utilidades lógicas (`ms/me/start/end`), `rem` en medidas arbitrarias, constantes con nombre para los topes (2/10/1/30, 1024/60/24), i18n sin textos sueltos (`en` y `es` en `conversation.json`; fuente en `en`). Burbujas nuevas en `components-next/message/`.
- Specs JS: `docker compose run --rm --no-deps -T vite pnpm exec vitest run <ruta>`; Ruby: `docker compose exec -e RAILS_ENV=test rails bundle exec rspec <ruta>`, ambos desde `~/Desarrollo/chatwoot-worktrees/production`. Los subagentes no usan `docker compose exec` contra otro worktree.
- Las tareas que comparten archivo van en serie (reflejado en `depende de`); `ReplyBox.vue` y `config/routes.rb` los tocan pocas tareas a propósito.
- Todo valor privado (token, IDs de WABA/catálogo/teléfono) vive en `~/.config/picnicart/` y en la BD local; nunca en el repo, specs ni commits. Los specs usan IDs inventados.

## Preguntas abiertas (supuestos asumidos, corregibles)
1. Cuerpo y campos en el modal (cuerpo precargado desde el compositor), sin borrador sobre el input. Si el dev prefiere el cuerpo en el input clásico, cambian las tareas 6 y 8 (aparece un borrador con aviso «escribe el texto» sobre el input).
2. Tarjeta = 1 producto por envío.
3. Los límites de caracteres del encabezado (60) y del título de sección (24) son los habituales; Meta no los documenta. Se confirman con el número de pruebas.
4. Fuera de la ventana de 24 h el botón Catálogo queda deshabilitado con el mismo motivo que ya muestra el compositor; en nota privada no aparece.

## Encontrado de paso
- `retry_content_attributes` descarta todo `content_attributes` salvo contact-info (`messages_controller.rb:83-87`): afecta a otros metadatos de mensajes fallidos; aquí solo se agrega `whatsapp_catalog`.
- `whatsapp_cloud_service.rb:120,125` usan `v13.0`/`v14.0` fijos; para catálogo se usará la versión de `WHATSAPP_API_VERSION` como hace el servicio de contact-info. No se unifica aquí.

## Cómo se verifica

Provisional: todos los comandos crean archivos que este cambio todavía no escribe, así que no hay números que pegar; la ronda 1 de verify reemplaza lo provisional por lo que den.

**Criterio del cambio entero (cambia lo que el sistema hace → lleva delta en `specs/whatsapp-catalog/spec.md`):** un agente con una bandeja WhatsApp Cloud conectada a un catálogo elige el formato, marca productos dentro del tope de ese formato, completa los campos obligatorios, envía desde el modal, y en la conversación ve lo mismo que el cliente (tarjetas, lista, detalle con fotos); sin catálogo, el modal le explica qué configurar.

**A. Automático (cada comando debe salir con 0 fallos)**
- Ruby: `docker compose exec -e RAILS_ENV=test rails bundle exec rspec spec/services/whatsapp/catalog_message_payload_builder_spec.rb spec/services/whatsapp/catalog_message_service_spec.rb spec/services/whatsapp/catalog_service_spec.rb spec/services/whatsapp/providers/whatsapp_cloud_service_spec.rb spec/controllers/api/v1/accounts/conversations spec/controllers/api/v1/accounts/inboxes_controller_spec.rb` → `0 failures`.
- Estilo Ruby: `docker compose exec rails bundle exec rubocop <archivos .rb del diff>` → `no offenses`.
- JS: `docker compose run --rm --no-deps -T vite pnpm exec vitest run app/javascript/dashboard/helper/specs/whatsappCatalog.spec.js app/javascript/dashboard/components/widgets/conversation app/javascript/dashboard/components-next/message` → `Failed = 0`.
- Lint JS del diff: `F=$(git diff --name-only origin/production | grep -E '\.(js|vue)$' | tr '\n' ' '); docker compose run --rm --no-deps -T vite pnpm exec eslint ${=F}` → 0 errores.
- Alcance: `git diff --name-only origin/production -- db app/models` → vacío (sin migración ni cambios de modelo).
- Invariante de topes (backend y front deben coincidir): para cada formato, un número de productos fuera de su rango se rechaza con 422 en el backend y con error de campo en `validateCatalogForm`, y dentro de su rango pasa en ambos (los specs de las tareas 1, 2 y 5 lo prueban en los bordes 0/1/2/10/11/30/31).

**B. Navegador local (390×844 táctil y 1440×900):** con el stack del worktree `production` y una bandeja WhatsApp Cloud local cuya respuesta de Graph se simula: el botón aparece en WhatsApp Cloud, no en otros canales ni en nota privada; sin catálogo el modal muestra la guía; el modal empieza por el formato, el contador impide pasar de 10 en carrusel y de 30 en lista, y los campos obligatorios bloquean el envío vacío; las burbujas de los tres formatos y su detalle se ven sin desborde horizontal de la página.

**C. Humano (iPhone real con el número de pruebas, Lucía local):** (1) enviar un carrusel de 3 paquetes, una tarjeta y una lista de 5: llegan a WhatsApp y se parecen a las capturas; (2) la lista con encabezado y secciones es aceptada por Meta (confirma los límites de 60/24 caracteres); (3) un mensaje fuera de ventana falla con el error normal y **reintentar** conserva el catálogo; (4) la burbuja de Chatwoot muestra lo mismo que WhatsApp, con su detalle; (5) con un token sin permiso de catálogo el modal explica qué hacer y el ID manual lo resuelve.

El change se archiva solo tras la prueba humana; publicar (`v4.18.0-picnic.9`) requiere confirmación aparte.
