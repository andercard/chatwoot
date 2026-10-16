# Tareas · chat-list-gestures

El diff desde `Base` incluye este `proposal.md` y su `tasks.md`: son el cambio, no trabajo de más.


- [x] **0 · Preparar la rama** (antes de escribir el change)
  - archivos: ninguno (solo git)
  - depende de: ninguna
  - listo cuando: existe `picnic/feat/chat-list-gestures` creada desde `picnic/feat/mobile-header-inbox-name` y es la rama actual; `Rama:` y `Base:` del proposal se toman de ahí
  - commit: ninguno

- [x] **1 · Píldora de escribiendo e ícono del canal en la tarjeta**
  - archivos: `app/javascript/dashboard/components/widgets/conversation/ConversationCard.vue`, `app/javascript/dashboard/components-next/Conversation/ConversationCard/TypingPill.vue` (nuevo), `app/javascript/dashboard/i18n/locale/en/chatlist.json`, `app/javascript/dashboard/i18n/locale/es/chatlist.json`
  - depende de: 0
  - listo cuando: con un `typing_on` de otro usuario la tarjeta de esa conversación muestra la píldora bajo la hora con 1, 2 o 3+ nombres (agente, bot o contacto), se quita con `typing_off` o a los 30 s; el ícono del canal (`getInboxIconByType`) aparece junto a la hora en todas las tarjetas; el contador de no leídos queda debajo de la píldora; la vista previa del último mensaje no cambia
  - commit: `feat(chat-list): show who is typing and the channel icon on the conversation card`

- [x] **2 · Gestos de deslizar en la tarjeta y hoja de Estados**
  - archivos: `app/javascript/dashboard/components/ConversationItem.vue`, `app/javascript/dashboard/composables/useSwipeGesture.js` (nuevo), `app/javascript/dashboard/components-next/Conversation/ConversationCard/SwipeActions.vue` (nuevo), `app/javascript/dashboard/components-next/Conversation/ConversationCard/ConversationStatusSheet.vue` (nuevo), `app/javascript/dashboard/i18n/locale/en/chatlist.json`, `app/javascript/dashboard/i18n/locale/es/chatlist.json`
  - depende de: 1
  - listo cuando: en móvil con puntero táctil, arrastrar una tarjeta a la derecha revela "No leído" (o "Leído" si ya tiene `unread_count`), que usa `markAsUnread`/`markAsRead` inyectados; a la izquierda revela "Asignarme" (asigna al usuario actual vía `assignAgent` inyectado) y "Estados", que abre una hoja desde abajo con Resolver o Reabrir, Pendiente y Posponer según el estado actual; Resolver pasa por `updateConversationStatus` (valida atributos requeridos); Posponer ofrece las opciones de `snoozeHelpers` y elegir fecha con el selector existente; no hay botón Eliminar ni "Más"; el scroll vertical y el toque simple siguen funcionando; en escritorio la tarjeta no cambia
  - commit: `feat(chat-list): swipe actions with a status sheet on mobile`

- [x] **3 · Responder con flecha visible y deslizar**
  - archivos: `app/javascript/dashboard/components-next/message/Message.vue`, `app/javascript/dashboard/i18n/locale/en/conversation.json`, `app/javascript/dashboard/i18n/locale/es/conversation.json`
  - depende de: 2
  - listo cuando: en escritorio, al pasar el mouse sobre una burbuja aparecen una flecha (Responder, solo ícono) y un ⋯ con las opciones que el menú ya tiene (sin añadir ni quitar ninguna); en móvil, deslizar la burbuja a la derecha cita el mensaje (queda en la caja con `ReplyToMessage` y la burbuja enviada muestra la cita); en inboxes sin soporte (`inboxSupportsReplyTo` falso para ese sentido: Instagram, Email, SMS, Line, 360dialog saliente) no aparecen ni la flecha ni el gesto; usa `useSwipeGesture` de la tarea 2
  - commit: `feat(messages): visible reply button and swipe to reply`

- [x] **4 · Filtro "unread" en el finder**
  - archivos: `app/finders/conversation_finder.rb`
  - depende de: 0
  - listo cuando: `GET /api/v1/accounts/:id/conversations?conversation_type=unread` devuelve solo conversaciones con mensajes entrantes posteriores a `agent_last_seen_at` (o con `agent_last_seen_at` nulo), usando `Conversation.unread_messages_condition` con `EXISTS`; los demás valores de `conversation_type` y las cuentas de `meta` no cambian; RuboCop sin ofensas
  - commit: `feat(conversations): filter the list by unread messages`

- [x] **5 · Chip "No leídos" en la lista**
  - archivos: `app/javascript/dashboard/components/ChatList.vue`, `app/javascript/dashboard/store/modules/conversations/helpers.js`, `app/javascript/dashboard/i18n/locale/en/chatlist.json`, `app/javascript/dashboard/i18n/locale/es/chatlist.json`
  - depende de: 2, 4
  - listo cuando: junto a Mías / Sin asignar / Todos hay un chip "No leídos" sin número que pide la lista con `assignee_type=all` + `conversation_type=unread`; un mensaje entrante nuevo agrega la conversación al chip y marcarla leída la quita sin recargar (`applyPageFilters` filtra por `unread_count > 0`); al volver a otra pestaña se restauran los filtros previos
  - commit: `feat(chat-list): add an unread tab`

- [x] **6 · Modo selección masiva y Leído/No leído en lote**
  - archivos: `app/javascript/dashboard/components/ChatList.vue`, `app/javascript/dashboard/components/ChatListHeader.vue`, `app/javascript/dashboard/components/ConversationItem.vue`, `app/javascript/dashboard/components/widgets/conversation/ConversationCard.vue`, `app/javascript/dashboard/components/widgets/conversation/conversationBulkActions/Index.vue`, `app/javascript/dashboard/components/widgets/conversation/conversationBulkActions/BulkReadActions.vue` (nuevo), `app/javascript/dashboard/i18n/locale/en/chatlist.json`, `app/javascript/dashboard/i18n/locale/es/chatlist.json`, `app/javascript/dashboard/i18n/locale/en/bulkActions.json`, `app/javascript/dashboard/i18n/locale/es/bulkActions.json`
  - depende de: 1, 2, 5
  - listo cuando: un botón ☑ junto a filtro y orden, o una pulsación larga sobre una tarjeta (con puntero táctil), activa el modo selección; en ese modo tocar una tarjeta alterna su selección (sin abrirla) y el checkbox siempre es visible; se ve "N seleccionadas", "Todas" y cerrar; la barra de acciones trae las existentes (etiquetas, agente, equipo, estado) y Leído/No leído, que aplican `markMessagesRead`/`markMessagesUnread` a cada conversación seleccionada; en móvil la barra va abajo; salir del modo limpia la selección; el checkbox al pasar el mouse en escritorio sigue funcionando; no hay acción de eliminar
  - commit: `feat(chat-list): selection mode with bulk read and unread`

- [x] **7 · Reordenar secciones del panel de contacto solo con pulsación larga en móvil**
  - archivos: `app/javascript/dashboard/routes/dashboard/conversation/ContactPanel.vue`
  - depende de: 0
  - listo cuando: con puntero táctil, un scroll vertical que empieza sobre el encabezado de una sección no la arrastra y el panel se desplaza normal; mantener pulsado el encabezado alrededor de 0,5 s (constante con nombre) activa el arrastre y reordena; con ratón el arrastre sigue arrancando de inmediato; el orden guardado (`onDragEnd`) no cambia; sin dependencias nuevas (`delay` y `delay-on-touch-only` de `vuedraggable`)
  - commit: `fix(contact-panel): require a long press to reorder sections on touch`


- [x] **8 · QA: los gestos de la tarjeta no se disparan y la píldora se corta**
  - archivos: `app/javascript/dashboard/components-next/Conversation/ConversationCard/SwipeActions.vue`, `app/javascript/dashboard/components-next/Conversation/ConversationCard/TypingPill.vue`
  - depende de: 6
  - listo cuando: `SwipeActions.vue` enlaza los handlers del gesto como listeners que Vue sí registra (`v-bind="handlers"`, no `v-on`, porque las claves son `onPointerdown`, `onClickCapture`…) y con eventos de puntero táctiles un arrastre a la izquierda deja `translateX` negativo en el contenedor `touch-pan-y` y a la derecha positivo; `TypingPill.vue` muestra el primer nombre de cada persona (no el nombre completo) con un ancho máximo suficiente para que "Tatiana escribe…" y "Tatiana y Lucía escriben…" se lean sin recorte en una columna de 340 px
  - commit: `fix(chat-list): bind the swipe handlers and show first names in the typing pill`

- [x] **9 · QA: el chip No leídos ensancha la lista, muestra 0 y encoge los conteos**
  - archivos: `app/javascript/dashboard/components/ChatList.vue`, `app/javascript/dashboard/components/ChatListHeader.vue`, `app/javascript/dashboard/components/ui/Tabs/TabsItem.vue`, `app/javascript/dashboard/store/modules/conversations/actions.js`
  - depende de: 6
  - listo cuando: con 375 px de ancho `.conversations-list-wrap` mide 375 px (hoy 417: el panel desborda y las tarjetas quedan cortadas a la derecha, y los botones de orden/colapsar del encabezado quedan fuera de pantalla). Los puntos de la pestaña "No leídos" (badge 0 y conteos) quedaron sin objeto al quitarla la tarea 13
  - commit: `fix(chat-list): keep the list inside the viewport and the tab counts stable on the unread tab`

- [x] **10 · QA: la barra de acciones masivas se desborda**
  - archivos: `app/javascript/dashboard/components/widgets/conversation/conversationBulkActions/Index.vue`, `app/javascript/dashboard/components/widgets/conversation/conversationBulkActions/BulkReadActions.vue`
  - depende de: 6
  - listo cuando: en una lista de 340 px (escritorio) y de 375 px (móvil) la barra muestra el contador de seleccionadas, "Limpiar", "Todas", cerrar, los íconos de etiquetas/agente/equipo/estado y los botones Leído y No leído dentro de su propio contenedor, sin salirse ni taparse con el editor de respuesta
  - commit: `fix(chat-list): lay out the bulk action bar inside its container`

- [x] **11 · QA: el botón flotante de menú tapa la barra de acciones masivas en móvil**
  - archivos: `app/javascript/dashboard/components/widgets/conversation/conversationBulkActions/Index.vue`
  - depende de: 10
  - listo cuando: en móvil (menos de 640 px) con el modo selección activo, el botón flotante `#mobile-sidebar-launcher` queda oculto y no tapa los íconos ni el botón Leído de la barra (el launcher ya se oculta cuando existe `[data-mobile-sheet]` en el `body`); al salir del modo selección el launcher vuelve a verse; en escritorio no cambia nada
  - commit: `fix(chat-list): hide the floating menu button while the bulk bar is open on mobile`

- [x] **12 · Quitar el botón ☑ del encabezado de la lista**
  - archivos: `app/javascript/dashboard/components/ChatListHeader.vue`, `app/javascript/dashboard/components/ChatList.vue`, `app/javascript/dashboard/i18n/locale/en/chatlist.json`, `app/javascript/dashboard/i18n/locale/es/chatlist.json`
  - depende de: 11
  - listo cuando: el encabezado de la lista ya no muestra el botón ☑ (solo quedan filtro, orden y colapsar) y no sobran la prop, el evento ni la clave i18n `CHAT_LIST.SELECTION.TOGGLE`; el modo selección sigue activándose con la pulsación larga en móvil y con el checkbox al pasar el mouse sobre el avatar en escritorio; salir del modo con la × de la barra sigue limpiando la selección
  - commit: `fix(chat-list): drop the selection toggle button from the list header`

- [x] **13 · Quitar la pestaña "No leídos" y su filtro por conversation_type**
  - archivos: `app/javascript/dashboard/components/ChatList.vue`, `app/javascript/dashboard/store/modules/conversations/helpers.js`, `app/javascript/dashboard/store/modules/conversations/actions.js`, `app/javascript/dashboard/components/ui/Tabs/TabsItem.vue`, `app/finders/conversation_finder.rb`, `app/javascript/dashboard/i18n/locale/en/chatlist.json`, `app/javascript/dashboard/i18n/locale/es/chatlist.json`
  - depende de: 12
  - listo cuando: la lista vuelve a tener solo Mías / Sin asignar / Todos (sin pestaña "No leídos") y no queda código muerto de ella: sin `UNREAD_TAB_KEY`, sin `filterByUnread`, sin la rama `when 'unread'` del finder, sin el camino que evitaba sobrescribir los conteos en `fetchAllConversations`, sin la clave `CHAT_LIST.ASSIGNEE_TYPE_TABS.unread` ni el cambio de `index` en `TabsItem.vue` (que vuelva a como estaba en `origin/production`); `conversation_finder_spec.rb` sigue en verde y las demás pestañas igual
  - commit: `refactor(chat-list): remove the unread tab in favor of the advanced filter`

- [x] **14 · "No leídos" como atributo del filtro avanzado**
  - archivos: `lib/filters/filter_keys.yml`, `app/helpers/filters/filter_helper.rb`, `app/javascript/dashboard/components-next/filter/provider.js`, `app/javascript/dashboard/components-next/filter/helper/filterHelper.js`, `app/javascript/dashboard/components-next/filter/helper/filterAttributeIcons.js`, `app/javascript/dashboard/store/modules/conversations/helpers/filterHelpers.js`, `app/javascript/dashboard/i18n/locale/en/advancedFilters.json`, `app/javascript/dashboard/i18n/locale/es/advancedFilters.json`
  - depende de: 11
  - listo cuando: en el filtro de conversaciones (icono de filtro) aparece el atributo "Mensajes no leídos" con valor Sí/No (selector booleano) y operador "es igual a"; `POST /api/v1/accounts/:id/conversations/filter` con `attribute_key: unread`, `filter_operator: equal_to`, `values: ['true']` devuelve solo conversaciones con mensajes entrantes posteriores a `agent_last_seen_at` (o con `agent_last_seen_at` nulo) usando `EXISTS` sobre `messages` con `account_id` y `conversation_id` (con `false` devuelve las leídas con `NOT EXISTS`), combinable con otras condiciones y con AND/OR; en tiempo real una conversación se agrega o sale según `unread_count`; los demás atributos y las automatizaciones no cambian; RuboCop limpio
  - commit: `feat(filters): filter conversations by unread messages in the advanced filter`

- [x] **15 · Barra de acciones masivas: hoja inferior en móvil y solo íconos**
  - archivos: `app/javascript/dashboard/components/widgets/conversation/conversationBulkActions/Index.vue`, `app/javascript/dashboard/components/widgets/conversation/conversationBulkActions/BulkLabelActions.vue`, `app/javascript/dashboard/components/widgets/conversation/conversationBulkActions/BulkAgentActions.vue`, `app/javascript/dashboard/components/widgets/conversation/conversationBulkActions/BulkTeamActions.vue`, `app/javascript/dashboard/components/widgets/conversation/conversationBulkActions/BulkUpdateActions.vue`, `app/javascript/dashboard/components/widgets/conversation/conversationBulkActions/BulkReadActions.vue`, `app/javascript/dashboard/components/widgets/conversation/conversationBulkActions/BulkActionSheet.vue` (nuevo), `app/javascript/dashboard/i18n/locale/en/bulkActions.json`, `app/javascript/dashboard/i18n/locale/es/bulkActions.json`
  - depende de: 11
  - listo cuando: en móvil (menos de 640 px) tocar el ícono de etiquetas, agente, equipo o estado de la barra abre una hoja desde abajo (con asa y fondo que al tocarlo solo cierra, sin dejar pasar el clic) con las mismas opciones que hoy salían en un desplegable que se salía de pantalla; al aplicar o cerrar la hoja se cierra y la barra con la selección vuelve a verse sin perder lo seleccionado; en escritorio los desplegables actuales no cambian; Leído y No leído muestran solo el ícono (con `aria-label` y `title` con el texto actual)
  - commit: `fix(chat-list): open the bulk actions in a bottom sheet on mobile and keep icons only`

- [x] **16 · Deslizar: acciones reordenadas, sin bordes redondeados y hoja de etiquetas**
  - archivos: `app/javascript/dashboard/components-next/Conversation/ConversationCard/SwipeActions.vue`, `app/javascript/dashboard/components-next/Conversation/ConversationCard/ConversationLabelsSheet.vue` (nuevo), `app/javascript/dashboard/components/ConversationItem.vue`, `app/javascript/dashboard/i18n/locale/en/chatlist.json`, `app/javascript/dashboard/i18n/locale/es/chatlist.json`
  - depende de: 13
  - listo cuando: al deslizar a la derecha se ven juntos Leído/No leído y Asignarme; al deslizar a la izquierda se ven Estados y Etiquetas (Asignarme ya no está a ese lado); los botones de acción no tienen bordes redondeados ni huecos entre sí ni respecto a la tarjeta; "Etiquetas" abre una hoja desde abajo con las etiquetas de la cuenta (las de la conversación marcadas), permite marcar/desmarcar y un botón Guardar que aplica solo las diferencias a esa conversación con `assignLabels`/`removeLabels` inyectados, y cierra la hoja; el fondo de la hoja al tocarlo solo cierra; sigue sin haber Eliminar ni "Más"
  - commit: `feat(chat-list): rearrange the swipe actions and add a labels sheet`

- [x] **17 · Mensaje: botones fijos, Traducir solo si hay integración**
  - archivos: `app/javascript/dashboard/components-next/message/Message.vue`, `app/javascript/dashboard/modules/conversations/components/MessageContextMenu.vue`, `app/javascript/dashboard/i18n/locale/en/conversation.json`, `app/javascript/dashboard/i18n/locale/es/conversation.json`
  - depende de: 11
  - listo cuando: en escritorio la flecha de responder y el ⋯ están siempre visibles junto a la burbuja (sin necesitar hover); en móvil el ⋯ está siempre visible junto a la burbuja (responder sigue siendo deslizar); el menú conserva sus opciones actuales, incluida "Añadir como respuesta predeterminada" donde ya existía, salvo "Traducir", que solo aparece si la integración de Google Translate de la cuenta está habilitada (hoy aparece siempre y no hace nada); sin Eliminar ni Editar nuevos
  - commit: `fix(messages): keep the reply and options buttons visible and hide translate without the integration`

- [x] **18 · Tocar una cita lleva al mensaje original**
  - archivos: `app/javascript/dashboard/components-next/message/bubbles/Base.vue`, `app/javascript/dashboard/components/widgets/conversation/MessagesView.vue`
  - depende de: 11
  - listo cuando: al tocar la cita dentro de una burbuja la conversación se desplaza al mensaje original y lo resalta unos instantes; si el original no está cargado todavía se piden mensajes anteriores hasta encontrarlo (con un tope razonable) y si no aparece no se salta al final; funciona igual para cualquier canal con respuestas (todos guardan `in_reply_to`)
  - commit: `fix(messages): scroll to the quoted message when tapping a reply`

- [x] **19 · QA: el filtro "No leídos" deja la lista vacía en el navegador**
  - archivos: `app/javascript/dashboard/store/modules/conversations/helpers/filterHelpers.js`
  - depende de: 14
  - listo cuando: al aplicar "Mensajes no leídos = Verdadero" desde el filtro, la lista muestra las conversaciones que devuelve el servidor (hoy el contador dice 20 y la lista queda vacía porque la comparación en el cliente no entiende que el valor llega como `{ id: true, name: 'Verdadero' }`); con "Falso" muestra solo las leídas; combinar con otro filtro sigue funcionando
  - commit: `fix(filters): read the unread filter value the way the selector sends it`
