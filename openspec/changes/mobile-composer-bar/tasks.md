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
  - listo cuando: bajo 640 px la raíz y los contenedores internos son `contents`; el micrófono, la firma, el citar respuesta, el artículo y "pedir datos de contacto" no se ven como botones sino como filas del menú `+` (con sus textos i18n, reutilizando las llaves existentes de tooltip; nueva `MOBILE_MENU.MACROS` y filas de acción) además de Fotos, Cámara, Adjuntar y plantillas; "Macros" emite `openMacros`; el botón `+` es la celda de la columna 1 y el de enviar redondo la de la columna 4; las filas de los toggles (firma, citar) muestran su estado; cerrar el menú al elegir una fila; en >= 640 px la fila de hoy no cambia
  - commit: `feat(mobile): the plus menu holds every composer action`

- [x] **6 · ReplyBox: cuadrícula de la barra, píldora y ámbar**
  - archivos: `app/javascript/dashboard/components/widgets/conversation/ReplyBox.vue`, `app/javascript/dashboard/components/widgets/conversation/specs/ReplyBox.spec.js`
  - depende de: 3, 4, 5
  - listo cuando: bajo 640 px `.reply-box` es una cuadrícula `[auto auto 1fr auto]` sin borde ni radio ni margen laterales, con respiro `env(safe-area-inset-bottom)`; el editor es una píldora (`rounded-3xl`, fondo propio, ámbar en nota privada, espacio a la derecha para candado y maximizar); `showExpand` se calcula con foco o contenido; `openMacros` inserta `#` en el editor con `addIntoEditor` y abre la lista de macros; los adjuntos y avisos (quedan sobre la fila, a ancho de la píldora); en >= 640 px el layout actual no cambia; los specs actuales de `ReplyBox` siguen en verde
  - commit: `feat(mobile): composer bar with a pill, lock and round send`

- [x] **7 · Verificar en navegador con viewport de iPhone**
  - archivos: `openspec/changes/mobile-composer-bar/verification.md`
  - depende de: 1, 2, 3, 4, 5, 6
  - listo cuando: el archivo registra, con medidas, que en viewport 390×844 (touch) con un teclado simulado (visual viewport de 420 px de alto): el menú `+` abre y cada fila dispara su selector de archivos; el botón de enviar redondo envía un mensaje de prueba; `/` y `@` (en nota privada) muestran la lista a ancho completo **encima** de la barra y el editor conserva el foco; escribir tras el disparador filtra; tocar una fila inserta; el candado alterna nota privada (píldora y enviar en ámbar); el maximizar expande y la barra vuelve a compacta tras enviar; a >= 1024 px nada cambió
  - commit: `docs(openspec): record the phone viewport checks for the composer bar`

- [x] **8 · Panel inferior: contacto y macros como filas, sin videollamada ni fila 2**
  - archivos: `app/javascript/dashboard/components/widgets/WootWriter/ReplyBottomPanel.vue`, `app/javascript/dashboard/components/widgets/RequestContactInfoButton.vue`, `app/javascript/dashboard/components/widgets/conversation/ReplyBox.vue`, `app/javascript/dashboard/i18n/locale/en/conversation.json`, `app/javascript/dashboard/i18n/locale/es/conversation.json`
  - depende de: ninguna
  - listo cuando: bajo 640 px «Pedir datos de contacto» es una fila del menú `+` (nueva prop opcional `asRow` en `RequestContactInfoButton` que pinta un botón-fila con ícono y la etiqueta existente `CONVERSATION.REQUEST_CONTACT_INFO.ACTION`/`PENDING_ACTION`, misma condición y acción; el menú se cierra al tocarla; sin la prop el componente se ve y comporta como hoy); la fila «Macros» solo aparece si la cuenta tiene macros (`ReplyBox` pasa `:enable-macros="isMacrosEnabled"` a `ReplyBottomPanel`, que lo usa en `showMacrosRow`); `VideoCallButton` y el botón de reproducir/pausa de la grabación ya no aparecen en la fila 2 móvil (videollamada `max-sm:hidden`; la grabación se ve dentro de la barra sin fila 2); el emoji no es fila (texto corregido en `tasks.md` de la tarea 5); en >= 640 px nada cambia
  - commit: `feat(mobile): contact request and macros rows in the plus menu, no video call on phones`

- [x] **9 · Caja expandida que sube sobre los íconos, a todo el ancho**
  - archivos: `app/javascript/dashboard/components/widgets/conversation/ReplyBox.vue`, `app/javascript/dashboard/components/widgets/WootWriter/ReplyTopPanel.vue`, `app/javascript/dashboard/components/widgets/WootWriter/ReplyBottomPanel.vue`, `app/javascript/dashboard/components/widgets/conversation/ResizableEditorWrapper.vue`
  - depende de: 8
  - listo cuando: bajo 640 px y con `data-expanded` en el wrapper, `.reply-box__top` ocupa las 4 columnas en la fila 1 (ancho ≈ el de `.reply-box` menos su padding), `+`, sparkle y enviar pasan a la fila 2 (misma base: comparten el borde inferior, ±2 px), el candado queda abajo a la derecha dentro de la caja y el botón de contraer arriba a la derecha; con ámbar en nota privada; la caja anima su altura (transición de 150–300 ms, comprobable con `getComputedStyle(...).transitionDuration`) y vuelve a compacta de una línea al contraer o enviar; sin `data-expanded` el layout compacto de la ronda 1 no cambia; en >= 640 px nada cambia; `ReplyBox.spec.js` sigue en verde
  - commit: `feat(mobile): the expanded editor rises over the buttons at full width`

- [x] **10 · Evidencia en navegador de lo que faltaba**
  - archivos: `openspec/changes/mobile-composer-bar/verification.md`, `openspec/changes/mobile-composer-bar/specs/mobile-composer/spec.md`
  - depende de: 8, 9
  - listo cuando: `verification.md` registra, con medidas en viewport 390×844 touch y teclado simulado de 420 px: (a) tocar cada fila Fotos/Cámara/Adjuntar dispara el `click()` de su `input[type=file]` (espiando `HTMLInputElement.prototype.click`); (b) `@` en nota privada filtra al escribir más caracteres; (c) con respuestas restringidas el candado está deshabilitado y el compositor está en nota; (d) la píldora crece al escribir varias líneas hasta ≈5 líneas (≈7 rem) y luego hace scroll; (e) `#` abre la lista de macros (en cuenta con macros) y la fila «Macros» no aparece sin macros; (f) en expandido la caja ocupa el ancho completo por encima de la fila de íconos y se anima; (g) «Pedir datos de contacto» aparece como fila cuando la conversación lo permite; el delta ajusta el escenario «Each row opens its action» para listar contacto y macros condicionada y agrega «Expanded editor rises over the buttons»
  - commit: `docs(openspec): record the second round of phone checks for the composer bar`

- [x] **11 · Ajustes visuales tras probar en el celular**
  - archivos: `app/javascript/dashboard/components-next/preview-picker/PreviewPicker.vue`, `app/javascript/dashboard/components/widgets/WootWriter/ReplyTopPanel.vue`, `app/javascript/dashboard/components/widgets/conversation/ReplyBox.vue`, `app/javascript/dashboard/components/widgets/WootWriter/ReplyBottomPanel.vue`
  - depende de: ninguna
  - listo cuando: en la lista móvil los títulos de grupo («Agentes», «Equipos») tienen aire vertical arriba y abajo (≈ 0.5 rem); el contenedor del candado es un círculo (`rounded-full`, mismo ancho y alto) en reposo y en ámbar; el compositor compacto móvil tiene menos espacio superior (la barra se ve como la de la app: ≈ 0.375 rem sobre la píldora en vez de 0.5 rem + la separación actual) sin cambiar la base inferior ni el respiro de `safe-area`; en escritorio el botón de adjuntar queda alineado con los demás botones de la fila (el contenedor del adjuntar no cambia el alineamiento: `contents` desde 640 px)
  - commit: `fix(mobile): polish the group headings, the lock circle, the bar spacing and the desktop attach button`

- [x] **12 · Mensajes rápidos también en notas privadas**
  - archivos: `app/javascript/dashboard/components/widgets/WootWriter/Editor.vue`
  - depende de: ninguna
  - listo cuando: al escribir `/` en una nota privada se abre la lista de respuestas predefinidas igual que en una respuesta pública (en móvil y en escritorio); el `@` de menciones sigue funcionando en nota privada; elegir una respuesta la inserta como texto en la nota; en respuesta pública nada cambia
  - commit: `feat(editor): canned responses are suggested in private notes too`

