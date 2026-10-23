## ADDED Requirements

### Requirement: Ubicaciones guardadas por canal
El sistema SHALL permitir a los administradores guardar en un inbox de WhatsApp Cloud hasta 50 ubicaciones con nombre, dirección, latitud y longitud, y SHALL mostrarlas a todos los agentes del inbox.

#### Scenario: Guardar una ubicación
- **GIVEN** un administrador en la pestaña Ubicaciones de un inbox WhatsApp Cloud
- **WHEN** guarda "Casa Paraíso" con dirección y coordenadas válidas
- **THEN** la ubicación persiste tras recargar y aparece en el selector del compositor de los agentes

#### Scenario: Coordenadas fuera de rango
- **GIVEN** un formulario de ubicación
- **WHEN** la latitud está fuera de -90..90 o la longitud fuera de -180..180
- **THEN** el servidor responde 422 y no guarda nada

### Requirement: Envío de una ubicación guardada
El sistema SHALL enviar a la conversación de WhatsApp Cloud un mensaje de tipo `location` con nombre, dirección y coordenadas tomados del canal al elegir una ubicación guardada.

#### Scenario: Enviar una ubicación guardada
- **GIVEN** una conversación de WhatsApp Cloud y la ubicación "Casa Paraíso" guardada
- **WHEN** el agente la elige en el selector
- **THEN** el cliente recibe un pin con el nombre y la dirección, y el agente ve el mensaje `nombre` y `dirección` en la conversación

#### Scenario: Ubicación inexistente
- **GIVEN** un `location_id` que no existe en el canal
- **WHEN** se llama al endpoint de envío
- **THEN** el servidor responde 422 y no crea mensaje

### Requirement: Envío de la ubicación actual
El sistema SHALL ofrecer "Ubicación actual" como primera opción del selector, SHALL pedir permiso de ubicación al navegador y, si se concede, SHALL enviar de inmediato las coordenadas capturadas como mensaje `location`.

#### Scenario: Permiso concedido
- **GIVEN** el selector de ubicaciones abierto en un contexto seguro
- **WHEN** el agente elige "Ubicación actual" y acepta el permiso
- **THEN** el cliente recibe un pin en las coordenadas capturadas

#### Scenario: Permiso denegado
- **GIVEN** el selector abierto
- **WHEN** el agente elige "Ubicación actual" y el navegador deniega o falla
- **THEN** se muestra una alerta y no se envía ningún mensaje
