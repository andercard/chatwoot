# Lista de conversaciones: escribiendo, gestos, no leídos, selección masiva y responder

> **Rama:** `picnic/feat/chat-list-gestures`
> **Base:** `7c91030a30`

## Qué encontré

Investigado en el worktree `~/Desarrollo/chatwoot-worktrees/production` (rama `picnic/feat/mobile-header-inbox-name`, HEAD `7c91030a30`). **Sin `.codegraph/` en ese worktree**: `codegraph_context` contestó con el índice del checkout `develop`, así que todo lo de abajo se confirmó leyendo los archivos del worktree.

- **Escribiendo ya viaja completo hasta el store.** `actionCable.js:265-306` guarda en `conversationTypingStatus` al usuario que escribe (`{id,name,type}`) y lo apaga solo a los 30 s. `action_cable_listener.rb:191-200` lo emite a miembros del inbox, administradores y al contacto, sin el que escribe. Hoy solo se pinta en `MessagesView.vue:557-571`; `ConversationCard.vue` no lo lee.
- **Lucía (bot) ya puede avisar sin tocar backend.** `Conversations::TypingStatusManager` usa `Current.user`, y `access_token_auth_helper.rb:20-37` deja entrar a un `AgentBot` en `toggle_typing_status`. El evento sale con `AgentBot#push_event_data` (`agent_bot.rb:50-57`, `type: 'agent_bot'`). Solo falta que n8n llame al endpoint.
- **El cliente solo avisa por widget web y API pública; con WhatsApp no sale en Chatwoot.** Entre agentes (y de Lucía a agentes) sí funciona en cualquier canal, porque nace dentro de Chatwoot. Ningún servicio de canal de Chatwoot maneja "typing" entrante (`app/services/whatsapp|telegram|instagram|messages` sin coincidencias). En Meta, los webhooks de WhatsApp solo traen `messages` (mensajes entrantes y `statuses` sent/delivered/read/failed), sin evento de escritura; Telegram solo ofrece `sendChatAction` del bot al usuario; Instagram tiene `typing_on` solo del negocio al usuario. Las búsquedas no devolvieron la referencia oficial de Meta, así que sigue siendo una conclusión por ausencia, no por una frase explícita de Meta.
- **Canal en la tarjeta.** `ConversationItem.vue:74-75` solo activa `showInboxName` con más de un inbox y sin inbox activo; el ícono del canal no se pinta junto a la hora (`ConversationCard.vue:216-232`).
- **Menú contextual ya trae las acciones.** `ConversationItem.vue:24-36` inyecta `markAsUnread`, `markAsRead`, `assignAgent`, `updateConversationStatus`; `ChatList.vue:684-702, 721-760` las implementa (resolver pasa por la validación de atributos requeridos). Los gestos y la hoja de Estados deben reutilizarlas, no duplicarlas.
- **Gestos: no hay ninguno en la lista.** Solo `SheetHandle.vue` usa punteros. `@vueuse/core` está bloqueado en **12.0.0** (`pnpm-lock.yaml:1584`), que ya trae `useSwipe`, `useBreakpoints` y el resto de lo que se necesita: **no hace falta actualizar la versión** y se evita el riesgo.
- **Arrastre sensible en el panel de contacto (móvil).** `ContactPanel.vue:151-160` usa `vuedraggable` (Sortable.js) con `handle=".drag-handle"` y sin `delay`: el encabezado de cada sección es el asa, así que un scroll que empieza ahí arrastra la sección. Sortable.js ya soporta `delay` y `delay-on-touch-only`, sin dependencias nuevas.
- **Filtro de no leídos: no existe.** Solo hay orden `unread` (`ConversationBasicFilter.vue:87`). El parámetro `conversation_type` ya viaja de punta a punta (`api/inbox/conversation.js:17-32,106-114` → `ConversationFinder#filter_by_conversation_type`, `conversation_finder.rb:~120-135`, que hoy conoce `mention`, `participating`, `unattended`). La condición de "no leído" ya existe como `Conversation.unread_messages_condition` (`conversation.rb:~236-250`). El filtro en tiempo real vive en `applyPageFilters` (`store/modules/conversations/helpers.js:38`).
- **Selección masiva ya existe** (`conversationBulkActions/Index.vue`: etiquetas, agente, equipo, estado vía `BulkActionsJob`) pero solo se activa con el checkbox al pasar el mouse sobre el avatar (`ConversationCard.vue:123-148`); no hay forma táctil. Falta marcar leído/no leído en lote.
- **Responder.** `Message.vue:412-415` ya gatea `replyTo` con `inboxSupportsReplyTo` (lista en `useInbox.js:17-35`), pero el `MessageContextMenu` solo abre con clic derecho (`Message.vue:447-461`, `hide-button`), por eso nadie lo ve. La cita ya se muestra: `ReplyToMessage.vue` en la caja y `Base.vue:91-130` en la burbuja.
- **Eliminar:** `DELETE conversations/:id` existe, pero no se agrega. `DELETE messages/:id` solo reescribe el contenido en Chatwoot (`messages_controller.rb:21-26`), no borra en el proveedor. No existe editar al enviar (`update` solo cambia estado). El menú ⋯ de la burbuja conserva sus opciones tal cual: no se agrega ni se quita nada. **"Eliminar para todos" no entra en esta tanda:** Telegram lo permite por API (`deleteMessage`, solo mensajes de menos de 48 h), pero WhatsApp Cloud no tiene endpoint de borrado según las fuentes consultadas (SleekFlow y DelightChat, secundarias; no encontré la referencia oficial de Meta) y Instagram no pude confirmarlo. Con WhatsApp como canal principal, el botón prometería algo que no ocurre. Si se quiere después: permiso nuevo por rol de asesor y solo en los canales que lo soporten.
- **Arreglo del filtro cortado** ya existe en `picnic/fix-filter-mobile-dropdowns` (sin publicar; `max-h-[85dvh] overflow-y-auto` en `ConversationFilter.vue:110` recorta los desplegables). No se reimplementa.

## Qué propongo, y qué queda afuera

Rama nueva `picnic/feat/chat-list-gestures` desde la rama actual (que ya trae el header con el inbox), 100 % frontend salvo una rama de 3 líneas en el finder:

1. Píldora "escribiendo" bajo la hora (`Tatiana escribe…` · `Tatiana y Lucía escriben…` · `3 escribiendo…`) más ícono del canal junto a la hora, siempre visible. Contador de no leídos debajo de la píldora.
2. Móvil, deslizar en la tarjeta: derecha = No leído/Leído; izquierda = Asignarme y Estados. Estados abre hoja desde abajo (Resolver o Reabrir, Pendiente, Posponer con las opciones de `snoozeHelpers` y elegir fecha reutilizando el selector existente).
3. Responder: flecha (solo ícono) y ⋯ al pasar el mouse sobre la burbuja en escritorio; deslizar la burbuja a la derecha en móvil. Solo en los inboxes que ya lo soportan.
4. Chip "No leídos" junto a Mías / Sin asignar / Todos, **sin contador**, vía `conversation_type=unread`.
5. Modo selección táctil: botón ☑ junto a filtro y orden **y también pulsación larga sobre una tarjeta** para entrar; tocar alterna selección; barra de acciones abajo en móvil (las existentes + Leído/No leído). En escritorio se mantiene el checkbox al pasar el mouse.
6. Panel de contacto en móvil: el reordenar secciones por arrastre solo arranca tras mantener pulsado (~0,5 s) con el dedo; el scroll ya no reordena. Con ratón no cambia.

**Queda afuera:** Fijar, "Más", eliminar en cualquier sitio nuevo, editar mensajes, accesos al pasar el mouse en escritorio para la tarjeta (el clic derecho actual se mantiene), contador del chip, enviar "escribiendo" de Chatwoot hacia WhatsApp (rama upstream `feat/whatsapp-typing-indicators`), endpoint nuevo para Lucía (ya existe), cualquier cambio a la app nativa, specs nuevos (el `CLAUDE.md` del repo los pide solo si se solicitan).

Este cambio **sí altera comportamiento visible** (nuevos gestos, chip, modo selección), pero no un requisito de dominio de Chatwoot: no hay `specs/` en OpenSpec, solo tareas y criterios.

## Con qué restricciones

- Rules aplicables: Vue `<script setup>` + Composition API, PascalCase, solo Tailwind (sin CSS propio ni scoped), utilidades lógicas (`ms`, `me`, `start`, `end`), `rem` para dimensiones arbitrarias, constantes con nombre para umbrales y duraciones (distancia de swipe, 30 s), sin strings sueltos en templates (i18n), componentes nuevos en `components-next/`. El único estilo dinámico permitido es el `translate` ligado al dedo del gesto (ya hay precedente de `:style` dinámico en `ConversationCard.vue:141`).
- Textos nuevos en **`en` y `es`** (decisión del dev: la UI de producción es en español).
- Ruby: línea máx. 150, RuboCop limpio; la rama `unread` en el finder va junto a las demás de `filter_by_conversation_type`. Revisar `enterprise/` por override del finder (hoy solo hay `call_finder.rb`).
- Rendimiento: el filtro `unread` debe usar `EXISTS` sobre `messages` con `account_id` y `conversation_id` (índices existentes), sin conteo extra de `meta`.
- Los gestos usan eventos de puntero solo con `pointerType` táctil, `touch-action: pan-y` y umbral de movimiento horizontal para no romper el scroll vertical ni la selección de texto.
- Commits: Conventional Commits, sin mencionar IA, sin archivos locales. **El hook husky usa eslint del host (no hay Node):** el lint se corre en Docker y el commit con `--no-verify` requiere que el dev lo autorice otra vez (la autorización previa fue solo para el commit del header).
- No tocar el stack de WhatsApp de otras sesiones; el stack `production-*` ya está arriba desde esta sesión.

## Preguntas abiertas

Ninguna. Decididas con el dev: rama de prueba aparte con el arreglo del filtro, chip sin contador, textos en `en` y `es`.

## Encontrado de paso

- `ConversationHeader.vue:152`: clase `cucursor-pointer` con typo (el botón del id nunca muestra cursor de mano). No se toca aquí.
- Al levantar `production-*` antes, rails registró `FATAL ERROR: JavaScript heap out of memory` (vite autoBuild) y la app quedó en blanco: hay que revisar la salud del contenedor `vite` antes de probar.
- `picnicart/` documenta que el acceso desde el móvil es por Tailscale (`http://$(tailscale ip -4):3005`) y nada escucha en la LAN; si vite bloquea el host, se corrige solo en `docker-compose.override.yml` (nunca se commitea).

## Cómo se verifica

El diff desde `Base` incluye este `proposal.md` y su `tasks.md`: son el cambio, no trabajo de más. Este cambio **sí altera comportamiento visible** pero no un requisito de dominio: no hay `specs/`.

Lint y backend (todo en Docker, desde `~/Desarrollo/chatwoot-worktrees/production`; los valores se miden en el apply, no se fijan aquí):

```bash
docker compose exec -T vite pnpm eslint app/javascript/dashboard/components app/javascript/dashboard/components-next app/javascript/dashboard/composables app/javascript/dashboard/store/modules/conversations   # 0 errors
docker compose exec -T vite pnpm vitest run app/javascript/dashboard/store/modules/conversations app/javascript/dashboard/helper/specs/commons.spec.js   # exit 0, 0 failed
docker compose exec -e RAILS_ENV=test rails bundle exec rspec spec/finders/conversation_finder_spec.rb   # 0 failures
docker compose exec rails bundle exec rubocop app/finders/conversation_finder.rb   # no offenses
git diff --cached --name-only   # sin .env, docker-compose.override.yml, .claude/, .codegraph/
```

Imagen y URLs (después de la tarea 6):

1. `git switch -c picnic/test/integration` desde `picnic/feat/chat-list-gestures` y `git merge --no-ff picnic/fix-filter-mobile-dropdowns`; esa rama **no se sube** y no se usa para PR.
2. `docker compose build` del worktree `production` y `docker compose up -d`; esperar a que `vite` sirva sin `heap out of memory` (`docker compose logs vite rails`).
3. Escritorio: `http://localhost:3005`. Móvil: `http://$(tailscale ip -4):3005` (el teléfono necesita Tailscale). Entrar con las credenciales del seed del repo (`db/seeds.rb`), sin repetirlas en el chat.

Pruebas que corro yo en el navegador del pane (escritorio y preset móvil 375×812; los gestos con `PointerEvent` táctil sintético porque los clics del pane llegan como ratón):

- Escribiendo: `toggle_typing_status` con token de agente, con token de un `AgentBot` creado por `rails runner` (caso Lucía) y con dos a la vez: aparecen 1, 2 y 3+ nombres, el ícono del canal sigue visible, la píldora se apaga con `off` y a los 30 s.
- Gestos de lista: derecha alterna Leído/No leído; izquierda Asignarme asigna al usuario actual; Estados cambia de Abierta a Pendiente, a Resuelta y a Pospuesta (opción fija y fecha elegida), y de vuelta; con un atributo requerido pendiente Resolver abre el modal; el scroll vertical sigue; en escritorio la tarjeta no se mueve.
- Responder: flecha y ⋯ en escritorio solo en inboxes con soporte; deslizar en móvil; cita en caja y en burbuja enviada; en un inbox sin soporte no hay flecha ni gesto. Eliminar no aparece en ningún sitio nuevo.
- Chip No leídos: filtra; un mensaje entrante nuevo lo suma; abrir la conversación lo quita.
- Selección masiva: ☑, tocar, "N seleccionadas", Todas, etiquetas, agente, equipo, estado y Leído/No leído en lote; salir limpia.
- Panel de contacto en móvil: scroll desde un encabezado no reordena; pulsación larga sí; en escritorio el arrastre inmediato sigue.
- Regresión: filtro avanzado y orden como hoja inferior (arreglo del filtro), checkbox al pasar el mouse, clic derecho en la tarjeta, header con el inbox junto al id.

Entrega al dev: resumen de qué salió bien, qué salió mal y qué hay que corregir, con las URLs de móvil y escritorio.
