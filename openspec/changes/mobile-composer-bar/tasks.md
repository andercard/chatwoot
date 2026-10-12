# Tareas · mobile-composer-bar

El diff desde `Base` incluye este `proposal.md` y su `tasks.md`: son el cambio, no trabajo de más.

- [x] **1 · Lista de sugerencias móvil en el selector compartido**
  - archivos: `app/javascript/dashboard/components-next/preview-picker/CaretAnchoredPicker.vue`, `app/javascript/dashboard/components-next/preview-picker/PreviewPicker.vue`, `app/javascript/dashboard/components-next/TeleportWithDirection.vue`, `app/javascript/dashboard/components-next/preview-picker/PreviewPicker.spec.js`
  - depende de: ninguna
  - listo cuando: bajo 640 px y dentro de un `.reply-box`, el selector se teletransporta a ese elemento (`TeleportWithDirection` acepta `String` o `HTMLElement` en `to`), se coloca `absolute inset-x-0 bottom-full`, sin campo de búsqueda, sin pestañas/vista previa, sin foco automático, con `@mousedown.prevent` para no quitar el foco al editor, filas de una línea (título a la izquierda, subtítulo a la derecha) y `max-h` de ~40 % de la altura visible; el filtro sigue la prop nueva `searchKey` (sin `Backspace` propio: el plugin cierra la lista al borrar el disparador); sin `.reply-box` o con >= 640 px el comportamiento y el cálculo actuales no cambian; el spec cubre: sin buscador y sin foco en modo móvil, buscador y foco en escritorio
  - commit: `feat(mobile): suggestion lists sit above the composer on phones`

- [x] **2 · Los selectores filtran con lo que se escribe en el editor**
  - archivos: `app/javascript/dashboard/components/widgets/conversation/TagAgents.vue`, `app/javascript/dashboard/components/widgets/conversation/CannedResponse.vue`, `app/javascript/dashboard/components/widgets/conversation/MacroList.vue`, `app/javascript/dashboard/components/widgets/conversation/VariableList.vue`, `app/javascript/dashboard/components/widgets/WootWriter/keyboardEmojiSelector.vue`
  - depende de: 1
  - listo cuando: cada selector pasa `:search-key="searchKey"` a `CaretAnchoredPicker` y su `searchQuery` se mantiene sincronizado con `props.searchKey`; en escritorio sigue mandando el campo del propio selector
  - commit: `feat(mobile): pickers filter with the text typed in the editor`

- [x] **3 · Editor compacto y expansible en móvil**
  - archivos: `app/javascript/dashboard/components/widgets/conversation/ResizableEditorWrapper.vue`
  - depende de: ninguna
  - listo cuando: bajo 640 px y sin expandir, `.resizable-editor-body` mide `auto` entre una línea (≈2.75 rem) y ≈5 líneas con scroll y el asa de arrastre no se muestra; el wrapper marca `data-expanded` cuando `appliedHeight > default`; expandido, usa la altura de hoy y muestra el asa; tras enviar vuelve a compacto; en >= 640 px nada cambia
  - commit: `feat(mobile): compact auto-growing editor with an expanded mode`

- [x] **4 · Panel superior: candado en la píldora, sparkle y maximizar**
  - archivos: `app/javascript/dashboard/components/widgets/WootWriter/ReplyTopPanel.vue`
  - depende de: ninguna
  - listo cuando: bajo 640 px la raíz es `contents`, las pestañas Responder/Nota privada y el contador de la fila quedan ocultas, el botón sparkle queda como celda propia, aparece un botón de candado (alterna Responder/Nota con `handleModeToggle`, deshabilitado y forzado a nota si `isReplyRestricted`, `aria-label` con `CONVERSATION.REPLYBOX.PRIVATE_NOTE`, icono distinto en cada modo) superpuesto al borde derecho de la píldora y un botón de maximizar arriba a la derecha de la píldora que solo se ve con la prop nueva `showExpand`; en >= 640 px la fila de hoy no cambia
  - commit: `feat(mobile): private note lock and expand button live in the pill`

- [x] **5 · Panel inferior: menú + completo, sin emoji, enviar en la cuadrícula**
  - archivos: `app/javascript/dashboard/components/widgets/WootWriter/ReplyBottomPanel.vue`, `app/javascript/dashboard/i18n/locale/en/conversation.json`, `app/javascript/dashboard/i18n/locale/es/conversation.json`
  - depende de: ninguna
  - listo cuando: bajo 640 px la raíz y los contenedores internos son `contents`; el emoji, el micrófono, la firma, el citar respuesta, el artículo y "pedir datos de contacto" no se ven como botones sino como filas del menú `+` (con sus textos i18n, reutilizando las llaves existentes de tooltip; nueva `MOBILE_MENU.MACROS` y filas de acción) además de Fotos, Cámara, Adjuntar y plantillas; "Macros" emite `openMacros`; el botón `+` es la celda de la columna 1 y el de enviar redondo la de la columna 4; las filas de los toggles (firma, citar) muestran su estado; cerrar el menú al elegir una fila; en >= 640 px la fila de hoy no cambia
  - commit: `feat(mobile): the plus menu holds every composer action`

- [x] **6 · ReplyBox: cuadrícula de la barra, píldora y ámbar**
  - archivos: `app/javascript/dashboard/components/widgets/conversation/ReplyBox.vue`, `app/javascript/dashboard/components/widgets/conversation/specs/ReplyBox.spec.js`
  - depende de: 3, 4, 5
  - listo cuando: bajo 640 px `.reply-box` es una cuadrícula `[auto auto 1fr auto]` sin borde ni radio ni margen laterales, con respiro `env(safe-area-inset-bottom)`; el editor es una píldora (`rounded-3xl`, fondo propio, ámbar en nota privada, espacio a la derecha para candado y maximizar); `showExpand` se calcula con foco o contenido; `openMacros` inserta `#` en el editor con `addIntoEditor` y abre la lista de macros; los adjuntos y avisos (quedan sobre la fila, a ancho de la píldora); en >= 640 px el layout actual no cambia; los specs actuales de `ReplyBox` siguen en verde
  - commit: `feat(mobile): composer bar with a pill, lock and round send`

- [ ] **7 · Verificar en navegador con viewport de iPhone**
  - archivos: `openspec/changes/mobile-composer-bar/verification.md`
  - depende de: 1, 2, 3, 4, 5, 6
  - listo cuando: el archivo registra, con medidas, que en viewport 390×844 (touch) con un teclado simulado (visual viewport de 420 px de alto): el menú `+` abre y cada fila dispara su selector de archivos; el botón de enviar redondo envía un mensaje de prueba; `/` y `@` (en nota privada) muestran la lista a ancho completo **encima** de la barra y el editor conserva el foco; escribir tras el disparador filtra; tocar una fila inserta; el candado alterna nota privada (píldora y enviar en ámbar); el maximizar expande y la barra vuelve a compacta tras enviar; a >= 1024 px nada cambió
  - commit: `docs(openspec): record the phone viewport checks for the composer bar`
