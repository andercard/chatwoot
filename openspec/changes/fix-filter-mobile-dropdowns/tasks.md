# Tareas

- [x] **1 · Panel de Conversaciones: teleport de dropdowns y hoja inferior**
  - archivos: `app/javascript/dashboard/components-next/filter/ConversationFilter.vue`
  - depende de: ninguna
  - listo cuando: el script llama `provideDropdownTeleport()` y el `ignore` del click-outside incluye `[data-dropdown-menu]`; la raíz es `fixed inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-b-none` en móvil y desde `sm:` `static`/`overflow-visible`/ancho actual (`lg:w-[750px]`); la barra de botones usa `flex-wrap`
  - commit: `fix(filters): conversation filter panel fits mobile viewports`

- [x] **2 · Panel de Contactos: igual**
  - archivos: `app/javascript/dashboard/components-next/filter/ContactsFilter.vue`
  - depende de: ninguna
  - listo cuando: mismos criterios que la tarea 1 y se elimina `min-w-96`
  - commit: `fix(filters): contacts filter panel fits mobile viewports`

- [x] **3 · Fila de condición apilable**
  - archivos: `app/javascript/dashboard/components-next/filter/ConditionRow.vue`
  - depende de: ninguna
  - listo cuando: el contenedor de la fila usa `flex-wrap`, los tres `FilterSelect` llevan `shrink-0`, el bloque de valor + papelera conserva `min-w-0` y no hay ancho fijo que supere 343px
  - commit: `fix(filters): condition rows wrap on small screens`
