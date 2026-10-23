## ADDED Requirements

### Requirement: Listas con búsqueda de altura fija
La interfaz SHALL mantener constante el alto de las listas con buscador visible mientras el agente escribe en el buscador.

#### Scenario: Buscar etiquetas en la hoja móvil
- **GIVEN** la hoja de Etiquetas con el buscador visible
- **WHEN** el agente escribe y los resultados se reducen a una etiqueta
- **THEN** el alto de la lista no cambia
