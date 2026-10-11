# Verificación · fix-filter-mobile-dropdowns

```yaml
veredicto: pasa
ronda: 1
fecha: 2026-10-11
tareas_a_medias: []
cumplidas: 3/3
a_medias: 0
de_mas: 0
comandos:
  - cmd: calcifer check e504ed5855
    exit: 0
    esperado: "sin hallazgos nuevos"
    obtenido: "0 hallazgos; 5 archivos sin revisar (eslint delegado a CI)"
    coincide: true
  - cmd: eslint (binario directo, sin --fix) sobre components-next/filter
    exit: 0
    esperado: "sin errores, exit 0"
    obtenido: "0 errores, 5 warnings preexistentes (no-dynamic-keys)"
    coincide: true
  - cmd: "navegador 375x812, Conversaciones -> filtro"
    exit: null
    esperado: "panel dentro del ancho, menús dentro del viewport, el panel sigue abierto al elegir"
    obtenido: "probado por el dev en iPhone (Tailscale, 100.x:3005): hoja inferior a ancho completo, fila Estado/Igual a/valor/papelera apilada, botones visibles, sin recorte lateral"
    coincide: true
  - cmd: "navegador 375x812, Contactos -> filtro"
    exit: null
    esperado: "igual que en Conversaciones"
    obtenido: "no corrido: el verify no tiene navegador"
    coincide: no_verificado
  - cmd: "navegador desktop >=1024px"
    exit: null
    esperado: "popover bajo el botón, 750px, los menús abren"
    obtenido: "no corrido: el verify no tiene navegador"
    coincide: no_verificado
  - cmd: git diff --stat e504ed5855..HEAD
    exit: 0
    esperado: "solo los 3 archivos de filter más el change de openspec"
    obtenido: "ConditionRow.vue, ContactsFilter.vue, ConversationFilter.vue, proposal.md, tasks.md"
    coincide: true
```

Las 3 tareas cumplidas, ninguna a medias, nada de más. Los tres criterios de navegador quedan `no_verificado`: hay que probarlos a mano. Riesgo declarado: en ConversationFilter el panel `fixed` vive dentro de `#conversationFilterTeleportTarget`; falla si algún ancestro tiene transform/filter/backdrop-filter.

Hallazgo sobre el plan: `pnpm eslint <dir>` lintea todo `app/`; se usó el binario de eslint directo.
