## ADDED Requirements

### Requirement: Filtro de mensajes leídos y no leídos
El sistema SHALL ofrecer en los filtros de conversaciones el atributo "Mensajes" con los valores "No leídos" y "Leídos", y SHALL enviar al servidor `unread` con `true` para no leídos y `false` para leídos.

#### Scenario: Filtrar por no leídos
- **GIVEN** conversaciones con y sin mensajes entrantes sin leer
- **WHEN** el agente elige Mensajes igual a "No leídos" y aplica el filtro
- **THEN** la lista muestra solo conversaciones con mensajes sin leer y el payload lleva `unread` con `true`

#### Scenario: Filtrar por leídos
- **GIVEN** las mismas conversaciones
- **WHEN** el agente elige Mensajes igual a "Leídos"
- **THEN** la lista muestra solo conversaciones sin mensajes sin leer y el payload lleva `unread` con `false`

#### Scenario: Carpeta guardada antes del cambio
- **GIVEN** una carpeta de filtros guardada con `unread` igual a `true`
- **WHEN** el agente la abre
- **THEN** funciona igual y el valor se muestra como "No leídos"
