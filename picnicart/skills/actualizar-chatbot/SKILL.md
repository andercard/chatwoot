---
name: actualizar-chatbot
description: Actualizar el Chatwoot desplegado (el "chatbot") a una versión nueva de nuestra imagen andercard/chatwoot — revisar migraciones y variables nuevas, respaldar la base, desplegar con el orden correcto, verificar y saber hacer rollback. Úsala cuando el usuario diga "actualiza chatbot", "actualiza Chatwoot a la versión nueva", "despliega la nueva imagen", "sube la versión picnic.N" o "hay una release nueva del fork".
---

# Actualizar el Chatwoot desplegado (servidor)

Esta skill es **genérica**: no contiene datos del servidor. Los valores concretos (carpeta del `docker-compose.yml`, nombres de servicios y contenedores, usuario y base de Postgres, dominio) los tomas de las notas/entorno de ESTE servidor; si no los conoces, **pregunta al usuario, no los inventes**. No imprimas ni copies valores de `.env`.

## Reglas que no se rompen

- **Manual y confirmado:** antes de cada paso que cambia algo (migrar, `up -d`, cambiar el tag) di qué vas a hacer y espera un "sí". Lo de solo lectura y el respaldo no necesitan confirmación.
- **Staging y producción son la MISMA instancia** (staging es una cuenta de producción). Lo que se despliega afecta a ambos a la vez. Elige un momento tranquilo y avisa al usuario.
- Imágenes **siempre con tag exacto** (`andercard/chatwoot:v4.17.1-picnic.N`), nunca `latest`. Web y worker (Sidekiq) **con el mismo tag**.
- Nunca: `docker compose down -v`, borrar volúmenes, tocar n8n u otros servicios, cambiar la versión de Postgres/Redis en el mismo despliegue, ejecutar `db:rollback`/`db:reset`/`db:drop`.
- Si algo no cuadra, **para y reporta**; no improvises.

## Cómo publica Chatwoot (para entender qué esperar)

- Releases con tag `vX.Y.Z`: una menor cada ~1 mes (4.13.0 abr, 4.14.0 may, 4.15.0 jun, 4.16.0 jul, 4.17.0 ago, 4.18.0 sep) y parches (`X.Y.1`, `X.Y.2`) en medio.
- La guía oficial de actualización con Docker: bajar imágenes nuevas, levantar y ejecutar `bundle exec rails db:chatwoot_prepare` (crea la base si no existe, si existe **migra**, y carga la configuración de instalación). **No** cubre respaldos, variables de entorno, cambios de Postgres/Redis ni rollback: eso es responsabilidad nuestra. Si la instalación es muy antigua, no se salta directo a la última: se pasa por versiones intermedias, ejecutando `db:chatwoot_prepare` en cada una.
- Nuestras imágenes son `v<versión de Chatwoot>-picnic.<n>`: mismo código de esa versión de Chatwoot + nuestros cambios. Subir `picnic.N` → `picnic.N+1` suele traer solo nuestros cambios; subir de `v4.17.1-…` a `v4.18.0-…` trae TODO lo de Chatwoot de ese salto (el caso con más riesgo).

## 1. Qué versión hay y a cuál vamos

1. Versión actual: el tag de `image:` del servicio web y del worker en el compose (deben coincidir) y `curl -s https://<dominio>/api` (campo `version`).
2. Versión destino: la que diga el usuario. Comprueba que existe la imagen:
   ```bash
   curl -s -o /dev/null -w '%{http_code}\n' https://hub.docker.com/v2/repositories/andercard/chatwoot/tags/<TAG_DESTINO>   # debe ser 200
   ```
3. Si el salto es de versión **menor de Chatwoot** (ej. 4.17 → 4.18) o salta más de una: avisa que es riesgo mayor y que se hace una versión por vez si hay duda.

## 2. Revisar qué cambia (solo lectura)

Define `OLD=<tag actual>` y `NEW=<tag destino>`. El repositorio del fork es público:

```bash
# Migraciones nuevas: nombres que existen en NEW y no en OLD
for t in $OLD $NEW; do curl -s "https://api.github.com/repos/andercard/chatwoot/contents/db/migrate?ref=$t" | python3 -c 'import json,sys; print("\n".join(sorted(x["name"] for x in json.load(sys.stdin))))' > /tmp/mig_$t.txt; done
comm -13 /tmp/mig_$OLD.txt /tmp/mig_$NEW.txt

# Variables de entorno nuevas / cambiadas (plantilla de Chatwoot)
diff <(curl -s https://raw.githubusercontent.com/andercard/chatwoot/$OLD/.env.example) <(curl -s https://raw.githubusercontent.com/andercard/chatwoot/$NEW/.env.example)

# Compose de producción de Chatwoot (imagen de Postgres/Redis, comandos) y versiones de runtime
for f in docker-compose.production.yaml .ruby-version .nvmrc; do echo "== $f"; diff <(curl -s https://raw.githubusercontent.com/andercard/chatwoot/$OLD/$f) <(curl -s https://raw.githubusercontent.com/andercard/chatwoot/$NEW/$f) && echo "sin cambios"; done
```

Si `comm` lista migraciones, **lee cada una** (`https://raw.githubusercontent.com/andercard/chatwoot/$NEW/db/migrate/<archivo>`) y clasifícala:

| Tipo de migración | Riesgo | Qué hacer |
|---|---|---|
| Agregar tabla / columna nullable / índice en tabla chica | Bajo (aditiva) | El código anterior la ignora; rollback de imagen sin restaurar |
| Agregar índice o columna con default en tablas grandes (`messages`, `conversations`, `contacts`, `audits`…) | Medio: puede bloquear o tardar | Ver tamaño de la tabla (`SELECT count(*)` aproximado) y avisar el tiempo esperado; ejecutar en ventana tranquila |
| Backfill / migración de datos (`backfill_*`, `update_all`, `find_each`) | Medio: puede tardar mucho | Estimar filas; preguntar si se hace con la app parada |
| Renombrar / borrar columna o tabla, cambiar tipo | **Alto (destructiva)** | Respaldo obligatorio verificado; parar los contenedores viejos antes de migrar; rollback = restaurar el respaldo |

También revisa: ¿cambió la imagen de Postgres/Redis o la versión de Ruby/Node? (si cambió Postgres, no se mezcla con este despliegue). ¿Variables nuevas en `.env.example`? Dile al usuario cuáles y qué hacen; **no las agregues sin su confirmación** y sin imprimir secretos.

Entrega al usuario un **resumen corto**: versión actual → destino, migraciones (con su clasificación), variables nuevas, y tu recomendación (seguir / esperar / hacerlo con parada).

## 3. Respaldo (obligatorio si hay migraciones)

```bash
docker exec <contenedor-postgres> pg_dump -U <usuario> -Fc <base> > chatwoot_$(date +%F_%H%M).dump
ls -lh chatwoot_*.dump | tail -1                      # tamaño razonable, no 0
pg_restore --list chatwoot_<fecha>.dump | head -3     # (en el contenedor o con el cliente disponible) el archivo se puede leer
```

Guárdalo fuera del volumen de Postgres y anota su ruta. Si el usuario no lo tiene claro, no continúes sin respaldo verificado. (Redis no se respalda: son colas; revisa que Sidekiq no tenga muchos trabajos pendientes antes de parar nada.)

## 4. Desplegar (pide confirmación antes de este paso)

Orden elegido: **migrar con la imagen nueva ANTES de reemplazar los contenedores**, así el código nuevo nunca corre contra un esquema viejo. (La guía oficial hace `down → pull → up → prepare`; la nuestra evita ese tramo.)

1. Cambiar `image:` del web **y** del worker a `andercard/chatwoot:<TAG_DESTINO>` (guarda copia del compose anterior).
2. `docker compose pull <web> <worker>`.
3. Migrar con la imagen nueva:
   ```bash
   docker compose run --rm <web> bundle exec rails db:chatwoot_prepare
   ```
   Si hay migraciones **destructivas**, antes: `docker compose stop <web> <worker>` (parada breve) y avísalo.
4. `docker compose up -d <web> <worker>`.
5. Mientras tanto no toques Postgres, Redis ni n8n.

## 5. Verificar

- `curl -s https://<dominio>/api` → `version` = destino, `queue_services: "ok"`, `data_services: "ok"`.
- `docker compose logs --tail 100 <web> <worker>` sin errores ni reinicios en bucle; Sidekiq procesando.
- Que el usuario compruebe: entrar a la cuenta de staging, y que el **chatbot** responda a un mensaje de WhatsApp de prueba (n8n no cambia, pero depende de que el webhook de Chatwoot siga funcionando).
- Reporta: versión final, migraciones aplicadas, tiempo de parada, ruta del respaldo.

## 6. Rollback

1. Volver `image:` al tag anterior (web y worker) → `docker compose up -d <web> <worker>`.
2. Migraciones aditivas: no hace falta restaurar. Destructivas, o si la app queda mal por datos: restaurar el respaldo (`pg_restore -c -d <base> <archivo>`) **solo con confirmación explícita**, con los contenedores parados.
3. Anotar qué falló antes de reintentar.

## Después

Pide al usuario que anote en sus notas privadas la versión desplegada y la fecha. Si la actualización fue de versión menor de Chatwoot, que lo mencione en la sesión del repositorio para ajustar la guía `03-release-despliegue.md`.
