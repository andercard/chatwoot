# Verificación · mobile-composer-bar

```yaml
veredicto: no pasa
ronda: 2
fecha: 2026-10-12
vuelve_a: plan
tareas_a_medias: [9, 10]
cumplidas: 8/10
a_medias: 2
de_mas: 2
escenarios: 14/17
comandos:
  - cmd: F=$(git diff --name-only origin/production | grep -E '\.(js|vue)$' | tr '\n' ' '); docker compose exec -T vite pnpm exec eslint ${=F}
    exit: 0
    esperado: "0 errores; único aviso admitido MacroList.vue no-dynamic-keys"
    obtenido: "0 errores, 1 warning: MacroList.vue:89:16 no-dynamic-keys (14 archivos)"
    coincide: true
  - cmd: docker compose exec -T vite pnpm exec vitest run ReplyBox.spec.js WootWriter preview-picker
    exit: 0
    esperado: "Failed = 0, Test Files >= 4"
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
    obtenido: "21 archivos; ningún validador cubre el diff; sin hallazgos"
    coincide: no_verificado
  - cmd: "B2 · +, sparkle y enviar con el mismo top (±2 px) en la fila 2; candado dentro de la caja"
    exit: null
    esperado: "mismo top ±2 px"
    obtenido: "top 804 / 804 / 796; comparten el bottom (836); candado dentro de la caja"
    coincide: false
  - cmd: "B4 · sin macros habilitadas no existe la fila Macros"
    exit: null
    esperado: "no existe"
    obtenido: "no medido; solo por código"
    coincide: no_verificado
  - cmd: "B5 · a 1440×900 el DOM visible es el de hoy"
    exit: null
    esperado: "pestañas presentes, sin botón +"
    obtenido: "solo medido en la ronda 1"
    coincide: no_verificado
  - cmd: "C · iPhone real"
    exit: null
    esperado: "@ y /, enviar, candado, expandir/contraer, cada fila del +"
    obtenido: "sin correr"
    coincide: no_verificado
```

## Cumplido (8 de 10)
Tareas 1 a 8. La 5 (texto corregido), la 6 (`#` abre la lista, vacía en la cuenta local sin macros), la 7 (espía de `click()` en Fotos/Cámara/Adjuntar) y la 8 (contacto como fila con `asRow`, macros con `enableMacros`, videollamada oculta, sin fila 2) quedaron cumplidas.

## A medias (9, 10)
- **9:** el criterio «+, sparkle y enviar a la misma altura» y su invariante B2 (mismo `top` ±2 px) no se cumplen como están escritos: miden 32, 32 y 40 px de alto con `top` 804, 804 y 796; comparten el `bottom` (836). El defecto está en el criterio (en la ronda 1 se había escrito «misma base»). Además: el alto de la caja solo se anima en Chromium ≥ 129 (`interpolate-size`); en iOS solo se anima la entrada (`animate-fade-in-up` 0.3 s). «Vuelve a compacta al contraer» no se midió con el layout de la tarea 9.
- **10:** faltan tres mediciones exigidas: (c) candado deshabilitado con respuestas restringidas, (e) ausencia de la fila «Macros» sin macros, (g) fila «Pedir datos de contacto» visible. El delta añadió escenarios nuevos pero el requisito del menú sigue listando «Macros» sin condición.

## De más (2, arrastrados)
Placeholder en una línea con puntos suspensivos (ReplyBox); `v-if="isMounted"` en el Teleport de CaretAnchoredPicker, que retrasa un tick el selector de escritorio. Observación: reproducir/pausa de la grabación y el sparkle comparten celda (col 2) y se solaparían durante una grabación con Captain habilitado; no se probó.

## Escenarios con evidencia: 14 de 17
Sin evidencia: Restricted replies force the note (candado deshabilitado), Contact request row, Collapsing returns to the bar (con el layout de la tarea 9). Desktop is unchanged solo se midió en la ronda 1.
