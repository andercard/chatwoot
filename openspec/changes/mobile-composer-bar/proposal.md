# Compositor móvil tipo app: barra compacta, candado en la píldora y listas de @ y / sobre el teclado

> **Rama:** `picnic/feat/mobile-composer-bar`
> **Base:** `2699f65161`

## Qué encontré

Sin `.codegraph/` en el worktree (no se inicializa en plan mode, es solo lectura): lo afirmado se leyó de los archivos con `rg` y `Read`. Base de trabajo: `origin/production` = `2699f65161` (incluye `v4.18.0-picnic.4`, el primer intento). Ningún plan ni rama existente cubre esto (`calcifer list-plans`: solo `image-optimization-frontend`; `git branch -a`: nada de "composer").

**Por qué @ y / no se ven como en la app (causa, no síntoma):**
- Los cinco selectores del editor (`TagAgents.vue`, `CannedResponse.vue`, `MacroList.vue`, `VariableList.vue`, `keyboardEmojiSelector.vue`) pasan por **un solo componente**, `components-next/preview-picker/CaretAnchoredPicker.vue`.
- Ese componente teletransporta una tarjeta `fixed` al `body` (`CaretAnchoredPicker.vue`, bloque `<TeleportWithDirection to="body">`) y la coloca con `window.innerHeight` y `getBoundingClientRect`. En iPhone esas coordenadas no coinciden con lo que se ve cuando el teclado está abierto (el teclado achica el *visual viewport*, no la ventana). Mi arreglo de `.4` solo cambió el cálculo de "arriba/abajo" (`visibleBottom`); no cambia el modelo (tarjeta flotante con coordenadas de pantalla), por eso en el teléfono real no quedó como la app.
- `PreviewPicker.vue` lleva **su propio campo de búsqueda con foco automático** (`onMounted(() => searchRef.value?.focus())`, `PreviewPicker.vue`): al abrir `@` o `/` el foco salta del editor a ese campo (es el "Ander" de tu captura). En la app el texto se escribe en el editor y filtra la lista.
- El editor ya expone lo que hace falta para filtrar desde el editor: el plugin de sugerencias actualiza en vivo `mentionSearchKey` / `cannedSearchKey` en cada tecla (`Editor.vue`, `createSuggestionPlugin`, `onChange: ... searchTerm.value = args.text`), y se pasa como `search-key` a cada selector; pero los selectores lo leen **solo al montar** (`const searchQuery = ref(props.searchKey)` en `TagAgents.vue`, `CannedResponse.vue`, `MacroList.vue`). Escribir `Escape`/`Backspace` en el campo del selector lo maneja `useKeyboardEvents` dentro de `CaretAnchoredPicker.vue`.

**Por qué la barra no se parece a la app:**
- `ReplyBox.vue` (template, ~`:1435`) apila tres bloques dentro de `.reply-box`: `ReplyTopPanel` (pestañas Responder/Nota privada, sparkle, maximizar; `ReplyTopPanel.vue`), el editor con adjuntos (`.reply-box__top`) y `ReplyBottomPanel` (emoji, adjuntar, micrófono, firma, plantillas, enviar; `ReplyBottomPanel.vue`). La app tiene una sola fila `[+] [sparkle] [píldora con 🔒] [enviar]`.
- El editor mide una **altura fija** de 120 px por defecto (`ResizableEditorWrapper.vue`: `DEFAULT_HEIGHT = 120`, clase `.resizable-editor-body` con `height: clamp(...)`) y el contenido no hace crecer el editor (solo Copilot llama a `requestEditorHeight`). Una píldora de una línea exige otra regla en móvil. El botón "expandir" ya existe (`toggleEditorExpand`, expuesto y usado por `MessagesView.vue:463-465`).
- El modo nota privada es un estado de `ReplyBox` (`replyType`/`isPrivate`, `setReplyMode`); `ReplyTopPanel.vue` ya trae `handleModeToggle` que alterna Responder/Nota (con `isReplyRestricted` forzando nota). El candado-en-la-píldora reutiliza esa función.
- `FileUpload` (`vue-upload-component`) acepta `capture` y se dispara con `document.getElementById(id).click()`; ya lo hace el atajo `$mod+Alt+KeyA` (`ReplyBottomPanel.vue`) y mi menú `+` de `.4`.
- Qué **no** se probó en `.4`: el menú `+` y el botón de enviar redondo solo se vieron en una captura estática; no se abrieron ni se probó un envío en viewport de teléfono. Este cambio lo trae como criterio explícito.

**Decisiones del dev (preguntas del paso 4):** el botón de maximizar va **dentro de la píldora, arriba a la derecha**, visible solo con foco o texto; los botones que la app no muestra (micrófono, firma, citar respuesta, artículo, pedir datos de contacto) **pasan al menú `+` como filas**; el emoji se quita en móvil (el teclado del iPhone ya lo trae).

## Qué propongo, y qué queda afuera

**Resultado en pantalla < 640 px (`sm` de `tailwind.config.js:199`); arriba de 640 px todo queda como hoy.**
1. **Listas de @, /, # y `{{`:** una lista de filas a **ancho completo, pegada encima de la barra** (dentro de `.reply-box`, `absolute bottom-full`, sin teletransportar al `body`, sin coordenadas de pantalla: sube y baja con el compositor, venga el teclado que venga). Sin campo de búsqueda ni pestañas: el editor **conserva el foco** y el texto que escribes después del disparador filtra la lista. Tocar una fila inserta y deja el teclado abierto. Filas de una línea: título a la izquierda, subtítulo gris a la derecha.
2. **Barra compacta:** una fila `[+] [sparkle] [píldora] [enviar]`. La píldora es el editor (crece hasta ~5 líneas y luego hace scroll) con el **candado dentro, a la derecha**: tocarlo alterna nota privada (la píldora y el botón de enviar pasan a ámbar, como en la app) y, arriba a la derecha de la píldora, el icono de maximizar con foco o texto. Las pestañas Responder/Nota privada y el contador de caracteres no se muestran en móvil (el contador sigue visible cuando se acerca al límite, ver restricciones). El botón `+` abre la lista Fotos / Cámara / Adjuntar archivo / Macros / Plantillas WhatsApp y las filas movidas (Grabar audio, Firma, Citar respuesta, Artículo, Pedir datos).
3. **Expandir sigue funcionando:** el icono de la píldora llama al mismo `toggleEditorSize` → `toggleEditorExpand`; ya expandido, muestra el asa de arrastre y la altura vuelve a la compacta tras enviar.

**No entra:** el botón de videollamada (solo widget/API; los inboxes de Picnic son WhatsApp) se queda en el layout actual y **no** aparece en la barra móvil — si hace falta, tarea aparte; cambios de escritorio (>= 640 px); el selector de modo en `NewConversation` (usa otro editor); Copilot ampliado en móvil; publicación (PR, tag, despliegue) — se hace después de verificar, con confirmación.

## Con qué restricciones

- Fork Picnic Art: rama nueva `picnic/feat/mobile-composer-bar` desde `origin/production`; PR al fork, squash. Nada de esto va a Chatwoot upstream.
- `CLAUDE.md` del repo: solo Tailwind (sin CSS propio ni estilos en línea nuevos; las variables `--editor-*` de `ResizableEditorWrapper.vue` ya existen), utilidades lógicas (`start`/`end`/`ms`/`me`), `<script setup>` en componentes nuevos (los legacy Options API se tocan lo mínimo), textos solo por i18n (`en` + `es` en este fork; `vue/no-bare-strings-in-template` falla el lint si no), commits convencionales **sin mencionar IA**.
- `.claude/rules/dev-environment.md`: todo en Docker; lint `docker compose exec -T vite pnpm exec eslint <archivos>` (en zsh: `${=F}` para varios archivos); specs `docker compose exec -T vite pnpm exec vitest run <ruta>`. Nada de archivos locales en commits.
- `display: contents` en los paneles superior e inferior (para que sus botones sean celdas de la cuadrícula de `.reply-box`) es la técnica elegida: no duplica la lógica de Copilot, adjuntos ni plantillas. Si una pantalla lo rompe, el criterio de verificación lo detecta.
- Tocar mouse/teclado en escritorio no cambia: todo clase móvil usa `max-sm:` o `sm:hidden`.
- El contador de caracteres (`isMessageLengthReachingThreshold`) sigue visible en móvil cuando aplica (WhatsApp/Twilio SMS), como texto pequeño sobre la barra: es información de límite, no decoración.

## Cómo se verifica

Provisional: los números salen de `origin/production` y la ronda 1 del verify los reemplaza por los reales.

**Criterio del cambio entero (altera lo que se ve):** en un viewport de teléfono el compositor tiene la forma `[+] [sparkle] [píldora con candado] [enviar]`, `@` y `/` se ven como filas encima de la barra con el editor enfocado, y a >= 640 px el compositor es idéntico al de hoy.

**A. Automático**
- Lint de todo lo tocado: `F=$(git diff --name-only origin/production | grep -E '\.(js|vue)$' | tr '\n' ' '); docker compose exec -T vite pnpm exec eslint ${=F}` → sin salida (0 errores). Medido en `.4`: sin salida.
- Specs afectados: `docker compose exec -T vite pnpm exec vitest run app/javascript/dashboard/components/widgets/conversation/specs/ReplyBox.spec.js app/javascript/dashboard/components/widgets/WootWriter app/javascript/dashboard/components-next/preview-picker` → 0 fallos. Medido hoy sobre el worktree (sin los cambios de `.4`): 3 archivos, 258 tests, 0 fallos; el nuevo `PreviewPicker.spec.js` suma uno o más archivos (cota: `Test Files >= 3`, `Failed = 0`).
- Sin backend: `git diff --name-only origin/production -- app/models app/controllers app/services app/jobs db` → vacío.

**B. En el navegador (lo que faltó en `.4`):** con `chrome-devtools` en viewport 390×844 touch:
- los elementos `.reply-box button` visibles incluyen `+`, sparkle, candado y enviar, en la misma fila (misma coordenada vertical de base ±2 px) — invariante, no conteo;
- con `visualViewport.height` forzado a 420 px, el borde inferior de la lista queda por encima del borde superior de la barra y el borde superior de la lista dentro de `visualViewport` (invariante);
- `document.activeElement` sigue dentro de `.ProseMirror` mientras la lista está abierta;
- en 1440×900 el DOM visible del compositor es el de hoy (pestañas Responder/Nota privada presentes, sin botón `+`).

**C. Humano (iPhone real, con la versión instalada en la pantalla de inicio):** `@` y `/` con teclado real, enviar un mensaje, alternar el candado, abrir cada fila del `+`. Esto no se puede reemplazar con el navegador de escritorio.

El change se archiva con `openspec` solo tras esa prueba humana; publicar (PR, `v4.18.0-picnic.5`) requiere confirmación aparte.

---

# Ronda 2 (tras el verify de la ronda 1)

### Qué encontré

Sin `.codegraph/` en el worktree (plan mode es solo lectura): lo afirmado sale de leer archivos con `rg`/`Read` y de pruebas en el navegador de la ronda 1.

**Lo que pidió el dev (captura de la caja expandida):**
- Al expandir hoy la píldora queda en la columna 3 de la cuadrícula (`ReplyBox.vue`, `.reply-box__top` con `max-sm:col-start-3 max-sm:row-start-1`), entre el `+`/sparkle de la izquierda y el enviar de la derecha: queda angosta con "bordes blancos grandes" a los lados (en la prueba: 246 px de 390). Lo que quiere: la caja **sale desde abajo y sube por encima de los íconos** `+`, sparkle y enviar, ocupa **todo el ancho**, con el panel interior blanco y con una **animación corta**; los íconos quedan en una fila debajo y el candado dentro de la caja.
- Hoy el expandido se detecta con `data-expanded` en `.resizable-editor-wrapper`, que ya lleva `group/wrapper` (`ResizableEditorWrapper.vue`); `ReplyTopPanel.vue` ya usa `max-sm:group-data-[expanded]/wrapper:...`. Ese es el gancho para reordenar la cuadrícula sin JS nuevo.
- La altura compacta usa `!h-auto` (`ResizableEditorWrapper.vue`); de `auto` a un alto fijo **no se anima** con CSS, así que la animación pide valores numéricos.

**Lo que dejó a medias el verify (`verify-report.md`):**
- «Pedir datos de contacto» quedó como botón suelto en la fila 2 porque `RequestContactInfoButton.vue` guarda adentro su condición (`showButton`) y su acción (`requestContactInfo`, `emit('requestTemplate')`) y no estaba en el cerco de la tarea 5. Decisión del dev (por la explicación en chat): pasa a **fila del menú `+`**, así que se amplía el cerco.
- «Macros» se muestra siempre en respuesta (`showMacrosRow = !isOnPrivateNote`, `ReplyBottomPanel.vue:200`); decisión del dev: **solo si la cuenta tiene macros** → `ReplyBox.vue` ya calcula `isMacrosEnabled` (`FEATURE_FLAGS.MACROS`, `ReplyBox.vue:204`) y se lo pasa al editor (`:enable-macros`, `:1546`); falta pasarlo al panel inferior.
- El criterio de la tarea 5 se contradice: lista «el emoji» entre las filas del menú pero el título y la propuesta dicen que se quita en móvil. Se corrige el texto (el emoji se quita, no es fila).
- La videollamada (`VideoCallButton`, solo web widget/API) aparece en móvil en la fila 2 (`ReplyBottomPanel.vue:562-582`) aunque la propuesta decía que no. Decisión: se oculta en móvil (`max-sm:hidden`); los inboxes de Picnic son WhatsApp.
- Sin evidencia en navegador de: filtrado tras `@`; candado deshabilitado con respuestas restringidas; la píldora creciendo hasta ~5 líneas; que cada fila del `+` dispara su selector de archivos; que `#` abre la lista de macros.
- `verification.md` y el delta `specs/mobile-composer/spec.md` quedan por actualizar con esto.

### Qué propongo, y qué queda afuera

1. **Caja expandida desde abajo (< 640 px, con `data-expanded`):** la cuadrícula pasa a dos filas. Fila 1: la caja ocupa las 4 columnas (todo el ancho útil, sin bordes grandes), esquinas superiores redondeadas, fondo neutro (ámbar en nota privada), con el candado abajo a la derecha y el botón de contraer (el mismo ícono de maximizar) arriba a la derecha. Fila 2: `+`, sparkle y enviar. Al expandir la caja sube con una transición de ~200 ms; al contraer o enviar vuelve a la barra compacta de una línea.
2. **Menú `+`:** «Pedir datos de contacto» como fila (misma condición y acción que hoy), «Macros» solo con macros habilitadas, sin videollamada, sin fila 2 en la cuadrícula.
3. **Evidencia que faltaba**, medida en el navegador y registrada en `verification.md`; criterios del delta ajustados.

**No entra:** la prueba en iPhone real (la hace el dev); cambios de escritorio (>= 640 px); publicar (PR/tag) — después de verificar, con confirmación; mover a upstream.

### Con qué restricciones
- Mismas que la ronda 1: Tailwind solo, utilidades lógicas, sin textos fijos (i18n `en`+`es`), `max-sm:`/`sm:hidden` para no tocar escritorio, commits convencionales sin mencionar IA, lint/specs en Docker acotados a lo tocado (`${=F}` en zsh).
- La animación se hace con transición de altura/transformación de Tailwind (`transition-*`, `duration-200`); los únicos estilos en línea siguen siendo las variables `--editor-*` que ya existían.
- `RequestContactInfoButton.vue` se usa también en escritorio: el cambio es una prop opcional (`asRow`) que no altera su salida por defecto.


### Cómo se verifica

Provisional: los valores de abajo salen de `origin/production` y de la ronda 1; la ronda 2 del verify los reemplaza por los reales.

**Criterio del cambio entero:** en un viewport de teléfono, al expandir, la caja de escritura ocupa todo el ancho y queda por encima de los íconos `+`, sparkle y enviar, con animación; el menú `+` contiene contacto y macros (esta solo con macros habilitadas); y a >= 640 px el compositor es el de hoy.

**A. Automático**
- Lint: `F=$(git diff --name-only origin/production | grep -E '\.(js|vue)$' | tr '\n' ' '); docker compose exec -T vite pnpm exec eslint ${=F}` → 0 errores; el único aviso admitido es el ya existente `MacroList.vue` `no-dynamic-keys` (se corrige lo esperado, no el código).
- Specs: `docker compose exec -T vite pnpm exec vitest run app/javascript/dashboard/components/widgets/conversation/specs/ReplyBox.spec.js app/javascript/dashboard/components/widgets/WootWriter app/javascript/dashboard/components-next/preview-picker` → `Failed = 0`, `Test Files >= 4` (ronda 1: 4 archivos, 262 tests).
- Sin backend: `git diff --name-only origin/production -- app/models app/controllers app/services app/jobs db` → vacío.

**B. Navegador (invariantes, 390×844 touch):**
- con `data-expanded`, el ancho de `.reply-box__top` ≥ `.reply-box` menos 24 px y su `bottom` ≤ `top` del botón `+` (la caja queda por encima de los íconos);
- `+`, sparkle y enviar comparten la misma coordenada `top` (±2 px) en la fila 2 y el candado queda dentro de la caja;
- el espía de `click()` registra una llamada por cada fila Fotos/Cámara/Adjuntar;
- sin macros habilitadas no existe la fila «Macros»;
- a 1440×900 el DOM visible es el de hoy (pestañas Responder/Nota privada, sin botón `+`).

**C. Humano (iPhone real, app instalada en la pantalla de inicio):** `@` y `/` con teclado real, enviar, alternar el candado, expandir y contraer, abrir cada fila del `+`.

El change se archiva solo tras la prueba humana; publicar (`v4.18.0-picnic.5`) requiere confirmación aparte.

