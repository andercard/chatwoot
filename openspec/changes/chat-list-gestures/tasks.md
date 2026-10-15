# Tareas · chat-list-gestures

El diff desde `Base` incluye este `proposal.md` y su `tasks.md`: son el cambio, no trabajo de más.


- [x] **0 · Preparar la rama** (antes de escribir el change)
  - archivos: ninguno (solo git)
  - depende de: ninguna
  - listo cuando: existe `picnic/feat/chat-list-gestures` creada desde `picnic/feat/mobile-header-inbox-name` y es la rama actual; `Rama:` y `Base:` del proposal se toman de ahí
  - commit: ninguno

- [ ] **1 · Píldora de escribiendo e ícono del canal en la tarjeta**
  - archivos: `app/javascript/dashboard/components/widgets/conversation/ConversationCard.vue`, `app/javascript/dashboard/components-next/Conversation/ConversationCard/TypingPill.vue` (nuevo), `app/javascript/dashboard/i18n/locale/en/chatlist.json`, `app/javascript/dashboard/i18n/locale/es/chatlist.json`
  - depende de: 0
  - listo cuando: con un `typing_on` de otro usuario la tarjeta de esa conversación muestra la píldora bajo la hora con 1, 2 o 3+ nombres (agente, bot o contacto), se quita con `typing_off` o a los 30 s; el ícono del canal (`getInboxIconByType`) aparece junto a la hora en todas las tarjetas; el contador de no leídos queda debajo de la píldora; la vista previa del último mensaje no cambia
  - commit: `feat(chat-list): show who is typing and the channel icon on the conversation card`

- [ ] **2 · Gestos de deslizar en la tarjeta y hoja de Estados**
  - archivos: `app/javascript/dashboard/components/ConversationItem.vue`, `app/javascript/dashboard/composables/useSwipeGesture.js` (nuevo), `app/javascript/dashboard/components-next/Conversation/ConversationCard/SwipeActions.vue` (nuevo), `app/javascript/dashboard/components-next/Conversation/ConversationCard/ConversationStatusSheet.vue` (nuevo), `app/javascript/dashboard/i18n/locale/en/chatlist.json`, `app/javascript/dashboard/i18n/locale/es/chatlist.json`
  - depende de: 1
  - listo cuando: en móvil con puntero táctil, arrastrar una tarjeta a la derecha revela "No leído" (o "Leído" si ya tiene `unread_count`), que usa `markAsUnread`/`markAsRead` inyectados; a la izquierda revela "Asignarme" (asigna al usuario actual vía `assignAgent` inyectado) y "Estados", que abre una hoja desde abajo con Resolver o Reabrir, Pendiente y Posponer según el estado actual; Resolver pasa por `updateConversationStatus` (valida atributos requeridos); Posponer ofrece las opciones de `snoozeHelpers` y elegir fecha con el selector existente; no hay botón Eliminar ni "Más"; el scroll vertical y el toque simple siguen funcionando; en escritorio la tarjeta no cambia
  - commit: `feat(chat-list): swipe actions with a status sheet on mobile`

- [ ] **3 · Responder con flecha visible y deslizar**
  - archivos: `app/javascript/dashboard/components-next/message/Message.vue`, `app/javascript/dashboard/i18n/locale/en/conversation.json`, `app/javascript/dashboard/i18n/locale/es/conversation.json`
  - depende de: 2
  - listo cuando: en escritorio, al pasar el mouse sobre una burbuja aparecen una flecha (Responder, solo ícono) y un ⋯ con las opciones que el menú ya tiene (sin añadir ni quitar ninguna); en móvil, deslizar la burbuja a la derecha cita el mensaje (queda en la caja con `ReplyToMessage` y la burbuja enviada muestra la cita); en inboxes sin soporte (`inboxSupportsReplyTo` falso para ese sentido: Instagram, Email, SMS, Line, 360dialog saliente) no aparecen ni la flecha ni el gesto; usa `useSwipeGesture` de la tarea 2
  - commit: `feat(messages): visible reply button and swipe to reply`

- [ ] **4 · Filtro "unread" en el finder**
  - archivos: `app/finders/conversation_finder.rb`
  - depende de: 0
  - listo cuando: `GET /api/v1/accounts/:id/conversations?conversation_type=unread` devuelve solo conversaciones con mensajes entrantes posteriores a `agent_last_seen_at` (o con `agent_last_seen_at` nulo), usando `Conversation.unread_messages_condition` con `EXISTS`; los demás valores de `conversation_type` y las cuentas de `meta` no cambian; RuboCop sin ofensas
  - commit: `feat(conversations): filter the list by unread messages`

- [ ] **5 · Chip "No leídos" en la lista**
  - archivos: `app/javascript/dashboard/components/ChatList.vue`, `app/javascript/dashboard/store/modules/conversations/helpers.js`, `app/javascript/dashboard/i18n/locale/en/chatlist.json`, `app/javascript/dashboard/i18n/locale/es/chatlist.json`
  - depende de: 2, 4
  - listo cuando: junto a Mías / Sin asignar / Todos hay un chip "No leídos" sin número que pide la lista con `assignee_type=all` + `conversation_type=unread`; un mensaje entrante nuevo agrega la conversación al chip y marcarla leída la quita sin recargar (`applyPageFilters` filtra por `unread_count > 0`); al volver a otra pestaña se restauran los filtros previos
  - commit: `feat(chat-list): add an unread tab`

- [ ] **6 · Modo selección masiva y Leído/No leído en lote**
  - archivos: `app/javascript/dashboard/components/ChatList.vue`, `app/javascript/dashboard/components/ChatListHeader.vue`, `app/javascript/dashboard/components/ConversationItem.vue`, `app/javascript/dashboard/components/widgets/conversation/ConversationCard.vue`, `app/javascript/dashboard/components/widgets/conversation/conversationBulkActions/Index.vue`, `app/javascript/dashboard/components/widgets/conversation/conversationBulkActions/BulkReadActions.vue` (nuevo), `app/javascript/dashboard/i18n/locale/en/chatlist.json`, `app/javascript/dashboard/i18n/locale/es/chatlist.json`, `app/javascript/dashboard/i18n/locale/en/bulkActions.json`, `app/javascript/dashboard/i18n/locale/es/bulkActions.json`
  - depende de: 1, 2, 5
  - listo cuando: un botón ☑ junto a filtro y orden, o una pulsación larga sobre una tarjeta (con puntero táctil), activa el modo selección; en ese modo tocar una tarjeta alterna su selección (sin abrirla) y el checkbox siempre es visible; se ve "N seleccionadas", "Todas" y cerrar; la barra de acciones trae las existentes (etiquetas, agente, equipo, estado) y Leído/No leído, que aplican `markMessagesRead`/`markMessagesUnread` a cada conversación seleccionada; en móvil la barra va abajo; salir del modo limpia la selección; el checkbox al pasar el mouse en escritorio sigue funcionando; no hay acción de eliminar
  - commit: `feat(chat-list): selection mode with bulk read and unread`

- [ ] **7 · Reordenar secciones del panel de contacto solo con pulsación larga en móvil**
  - archivos: `app/javascript/dashboard/routes/dashboard/conversation/ContactPanel.vue`
  - depende de: 0
  - listo cuando: con puntero táctil, un scroll vertical que empieza sobre el encabezado de una sección no la arrastra y el panel se desplaza normal; mantener pulsado el encabezado alrededor de 0,5 s (constante con nombre) activa el arrastre y reordena; con ratón el arrastre sigue arrancando de inmediato; el orden guardado (`onDragEnd`) no cambia; sin dependencias nuevas (`delay` y `delay-on-touch-only` de `vuedraggable`)
  - commit: `fix(contact-panel): require a long press to reorder sections on touch`

