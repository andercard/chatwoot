> **Rama:** `picnic/fix-filter-mobile-dropdowns`
> **Base:** `e504ed5855`

El diff desde `Base` incluye este `proposal.md` y su `tasks.md`: son el cambio, no trabajo de más.

# Panel de filtros y sus dropdowns se cortan en móvil (Conversaciones y Contactos)

## Qué encontré

Captura: `chat.picnicart.com` en iPhone, panel «Filtrar conversaciones» cortado por la izquierda y por la derecha; la fila `Estado | Igual a | Abiertas | 🗑` y los botones `Agregar filtro / Limpiar / Aplicar` no caben. **El código desplegado es la rama `production` (fork, v4.17.1), no `develop`.**

- Código de `production` leído en `~/Desarrollo/chatwoot-worktrees/production/app/javascript/dashboard/…` (el checkout actual, `develop`, ya trae parches parciales que production no tiene: `diff` de ConversationFilter/ConditionRow/ChatListHeader/Multi|SingleSelect).
- `components-next/filter/ConversationFilter.vue:108` (production): panel `max-w-3xl lg:w-[750px] w-full … overflow-visible`. Vive dentro de `#conversationFilterTeleportTarget`, un `div` `absolute z-50 mt-2` **sin ancho** (`components/ChatListHeader.vue:~141,167`) pegado al botón de filtro → `w-full` se resuelve contra un padre que no mide nada y el panel se desplaza fuera del viewport.
- `components-next/filter/ContactsFilter.vue:107` (production): mismo panel con `min-w-96` (384px) → desborda en cualquier móvil de 375px.
- `components-next/filter/ConditionRow.vue:186` (production): fila `flex gap-2` **sin `flex-wrap`** y sin `shrink-0` en los `FilterSelect`; no puede apilar.
- Los dropdowns internos (`inputs/FilterSelect.vue`, `SingleSelect.vue`, `MultiSelect.vue`) renderizan un `DropdownBody` `absolute` dentro de `DropdownContainer` (`dropdown-menu/base/DropdownContainer.vue`): solo deciden arriba/abajo (`FilterSelect.vue` `dropdownPosition`), **nunca colisionan en horizontal** y los recorta cualquier ancestro con `overflow`.
- **Ya existe la solución en el repo y no está conectada aquí:** `DropdownContainer` renderiza vía `DropdownFloating` (teleport a `body`, `position: fixed`, usa `composables/useDropdownPosition.js`: flip vertical, shift horizontal con `margin=16`, `maxHeight` del espacio libre) cuando un ancestro llama `provideDropdownTeleport()` (`dropdown-menu/base/provider.js:26`). Único consumidor hoy: `routes/dashboard/settings/automation/AutomationRuleForm.vue:94`.
- Grafo: `codegraph_search "ConversationFilter"` → `ConversationFilter.vue` lo usa solo `ChatList.vue:14`; `codegraph_context` sobre «dropdown mobile overflow» → `DropdownMenu.vue` (legacy, no relacionado). Grep: `DropdownContainer` 8 consumidores, `useDropdownPosition` 4 (Popover, SidebarSortMenu, DropdownFloating).
- Trampa: al teleportar los menús a `body`, un clic en una opción cuenta como «clic fuera» del panel y lo cierra: `ConversationFilter.vue` y `ContactsFilter.vue` usan `v-on-click-outside` con `ignore: ['#toggle…Button']`. `DropdownContainer` ya resuelve esto con `ignore: ['[data-dropdown-menu]']` (`DropdownContainer.vue`); el panel debe hacer lo mismo.
- Estándar de librerías (conocimiento general, no leído del repo): Floating UI / Radix Popper / Headless UI resuelven popovers con *flip + shift + size* y `collisionPadding`, renderizados en portal con `position: fixed`; para paneles anchos en pantallas compactas, Material/iOS usan **bottom sheet** a ancho completo (Radix Dialog/Vaul). `useDropdownPosition` ya implementa flip+shift+padding, así que no hace falta librería nueva.

## Qué propongo, y qué queda afuera

1. Los dropdowns del panel de filtros pasan a la capa flotante existente (`provideDropdownTeleport()` + `ignore '[data-dropdown-menu]'`): colisión con el viewport y sin recortes.
2. Panel responsivo mobile-first: en `<640px` es una **hoja inferior** (`fixed inset-x-0 bottom-0`, ancho completo, `max-h` en `dvh`, scroll interno, esquinas superiores redondeadas); desde `sm:` vuelve al popover actual (`lg:w-[750px]`).
3. Fila de condición y barra de botones apilan con `flex-wrap`.

**Queda afuera:** teleport por defecto en todos los `DropdownContainer` (8 consumidores); scrim/arrastre-para-cerrar de la hoja; portar los parches de `develop` que no tocan este bug (TextArea longText, `ChatListHeader` contacto); nuevos specs (CLAUDE.md: no specs sin pedirlo; `ConditionRow.spec.js` ni existe en production); i18n (no hay textos nuevos); cambios a `develop`/upstream.

## Con qué restricciones

- **Trabajo en el worktree `~/Desarrollo/chatwoot-worktrees/production`, rama nueva `picnic/fix-filter-mobile-dropdowns` desde `production`** (skill `picnicart-feature`); el checkout actual `develop` no se toca. El apply debe correr con ese directorio como cwd.
- `design-foundations.md`: mobile-first (`sm` 640px; base = móvil), solo Tailwind, sin CSS propio/scoped/inline, utilidades lógicas (`ms/me/start/end`), `rem` para dimensiones arbitrarias.
- `vue-components.md`: `<script setup>`, import por alias (`next/dropdown-menu/base/provider`), sin strings desnudos.
- Commits convencionales, sin referenciar a Claude; no commitear `docker-compose.override.yml`, `.claude/`, etc.
- Entorno: Ruby/Node solo en Docker (`docker compose exec vite pnpm eslint …`); un entorno a la vez, el de production.

## Encontrado de paso

- `ChatListHeader.vue` tiene dos `id="toggleConversationFilterButton"` duplicados (`~134, 148`), HTML inválido; no se toca aquí.

## Tareas

- [ ] **1 · Panel de Conversaciones: teleport de dropdowns y hoja inferior**
  - archivos: `app/javascript/dashboard/components-next/filter/ConversationFilter.vue`
  - depende de: ninguna
  - listo cuando: el script llama `provideDropdownTeleport()` y el `ignore` del click-outside incluye `[data-dropdown-menu]`; la raíz es `fixed inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-b-none` en móvil y desde `sm:` `static`/`overflow-visible`/ancho actual (`lg:w-[750px]`); la barra de botones usa `flex-wrap`
  - commit: `fix(filters): conversation filter panel fits mobile viewports`

- [ ] **2 · Panel de Contactos: igual**
  - archivos: `app/javascript/dashboard/components-next/filter/ContactsFilter.vue`
  - depende de: ninguna
  - listo cuando: mismos criterios que la tarea 1 y se elimina `min-w-96`
  - commit: `fix(filters): contacts filter panel fits mobile viewports`

- [ ] **3 · Fila de condición apilable**
  - archivos: `app/javascript/dashboard/components-next/filter/ConditionRow.vue`
  - depende de: ninguna
  - listo cuando: el contenedor de la fila usa `flex-wrap`, los tres `FilterSelect` llevan `shrink-0`, el bloque de valor + papelera conserva `min-w-0` y no hay ancho fijo que supere 343px
  - commit: `fix(filters): condition rows wrap on small screens`

## Cómo se verifica

Este cambio altera solo presentación (layout/posición); no cambia comportamiento de negocio: sin `specs/`.

- Lint (debe terminar sin errores, exit 0):
  `docker compose exec vite pnpm eslint app/javascript/dashboard/components-next/filter` (desde el worktree production).
- Navegador, viewport 375×812, en Conversaciones → botón filtro: el panel queda dentro del ancho (sin scroll horizontal: `document.documentElement.scrollWidth === 375`), todos los botones visibles; abrir «Estado», «Igual a» y «Abiertas»: cada menú queda dentro del viewport con ≥16px de margen y **elegir una opción no cierra el panel**.
- Igual en Contactos → filtro.
- Viewport desktop ≥1024px: el panel se ve como antes (popover bajo el botón, 750px) y los menús siguen abriendo.
- Nada se movió fuera de `components-next/filter/` (`git diff --stat production..HEAD` lista solo los 3 archivos más el change de openspec).
