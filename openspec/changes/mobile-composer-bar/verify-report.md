# Verificación · mobile-composer-bar

```yaml
veredicto: no pasa
ronda: 1
fecha: 2026-10-12
vuelve_a: plan
tareas_a_medias: [5, 6, 7]
cumplidas: 4/7
a_medias: 3
de_mas: 3
escenarios: 10/14
comandos:
  - cmd: F=$(git diff --name-only origin/production | grep -E '\.(js|vue)$' | tr '\n' ' '); docker compose exec -T vite pnpm exec eslint ${=F}
    exit: 0
    esperado: "sin salida (0 errores)"
    obtenido: "0 errores, 1 warning: MacroList.vue:89 no-dynamic-keys (ya existía en la base, línea 82)"
    coincide: false
  - cmd: docker compose exec -T vite pnpm exec vitest run ReplyBox.spec.js WootWriter preview-picker
    exit: 0
    esperado: "Test Files >= 3, Failed = 0"
    obtenido: "4 archivos, 262 tests, 0 fallos"
    coincide: true
  - cmd: git diff --name-only origin/production -- app/models app/controllers app/services app/jobs db
    exit: 0
    esperado: "vacío"
    obtenido: "vacío"
    coincide: true
  - cmd: calcifer check 2699f65161
    exit: 0
    esperado: "(el plan no lo declara)"
    obtenido: "19 archivos; ningún validador cubre el diff; sin hallazgos"
    coincide: no_verificado
  - cmd: "B · navegador 390×844 y 1440×900 (chrome-devtools)"
    exit: null
    esperado: "4 invariantes de la sección B"
    obtenido: "no lo corrió el verify; medidas del orquestador en verification.md cubren las 4"
    coincide: no_verificado
  - cmd: "C · iPhone real"
    exit: null
    esperado: "@ y / con teclado real, envío, candado, cada fila del +"
    obtenido: "sin correr"
    coincide: no_verificado
```

## Cumplido (4 de 7)
- **1** Lista de sugerencias móvil (CaretAnchoredPicker, PreviewPicker, TeleportWithDirection, PreviewPicker.spec.js). Desvíos aceptados: prop `compact` en lugar de `hideSearch`; `maxHeight` calculado en línea (40 % de visualViewport). Hueco: la rama móvil de CaretAnchoredPicker no tiene spec propio.
- **2** Los cinco selectores pasan `:search-key` y sincronizan `searchQuery`.
- **3** ResizableEditorWrapper: compacto `h-auto` 2.75–7 rem, `data-expanded`, asa solo expandido.
- **4** ReplyTopPanel: `contents`, candado con `handleModeToggle`, maximizar con `showExpand`.

## A medias (5, 6, 7)
- **5 · ReplyBottomPanel.** «Pedir datos de contacto» sigue como botón (fila 2) y no como fila del `+`: `RequestContactInfoButton.vue` guarda su condición y acción internas, y el `archivos:` de la tarea no lo incluye (criterio inalcanzable con el cerco). El criterio se contradice: lista «el emoji» entre las filas del menú pero el título y la propuesta dicen que el emoji se quita. La fila «Macros» se muestra siempre en respuesta (el plan decía «si macros habilitados»).
- **6 · ReplyBox.** `openMacros` inserta `#` con `addIntoEditor`, pero no hay evidencia de que abra la lista de macros (`verification.md`: «no se confirmó»).
- **7 · verification.md.** Falta evidencia de que cada fila del `+` dispara su selector de archivos (solo se listan filas e inputs).

## De más (3)
- ReplyBox: placeholder en una línea con puntos suspensivos (commit 51d91126c4, ajuste visual).
- ReplyBottomPanel: `VideoCallButton` y `RequestContactInfoButton` quedan en la fila 2 en móvil; la propuesta decía que la videollamada no aparece en la barra móvil.
- CaretAnchoredPicker: `v-if="isMounted"` en el Teleport también retrasa un tick el selector flotante de escritorio.

## Escenarios con evidencia: 10 de 14
Sin evidencia: «Restricted replies force the note» (no se probó el candado deshabilitado), «The pill grows with the text» (solo se midió vacía y expandida), «Each row opens its action» (queda para iPhone), «Macros row opens the macro list».

## Con qué se probó
Lint: 0 errores y 1 warning preexistente (el plan declaraba «sin salida»; hay que corregir lo esperado, no el código). Vitest 4 archivos / 262 tests / 0 fallos. Backend vacío. `calcifer check` sin cobertura de validadores. B solo con la evidencia de `verification.md`; C sin correr.
