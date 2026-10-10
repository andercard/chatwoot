# 02 · Flujo de trabajo Git

## Remotes (ya configurados)

```
origin    https://github.com/andercard/chatwoot.git   ← nuestro fork (push aquí)
upstream  git@github.com:chatwoot/chatwoot.git        ← Chatwoot oficial (solo fetch; push bloqueado)
```

`git push` siempre va al fork. Para traer novedades de Chatwoot: `git fetch upstream --tags`.

## Ramas

| Rama | Vive en | Basada en | Qué contiene |
|---|---|---|---|
| `production` | fork | tag de release de Chatwoot (hoy `v4.17.1`) | Lo que corre en producción: release + nuestros cambios + carpeta `picnicart/` |
| `picnic/<tipo>/<slug>` | fork | `production` | Un cambio nuestro (ej. `picnic/feat/menu-pedidos`) |
| `develop` | local | `upstream/develop` | Espejo de Chatwoot; nunca se commitea aquí |
| `<tipo>/<slug>` | fork | `upstream/develop` | Contribución para mandar a Chatwoot (PR a `chatwoot/chatwoot`) |

Regla de oro: **un cambio nuestro sale de `production`; una contribución a Chatwoot sale de `upstream/develop`.** No se mezclan en la misma rama.

## Commits (igual que Chatwoot)

- Conventional Commits en minúscula e imperativo: `type(scope): asunto`.
  - Tipos: `feat`, `fix`, `perf`, `refactor`, `chore`, `docs`, `test`, `build`, `ci`, `style`, `revert`.
  - Ejemplos: `feat(whatsapp): add order confirmation template`, `fix(inbox): keep assignee on reopen`.
- Un commit = un cambio coherente. Sin "wip"/"fix typo" sueltos antes del PR (squash si hace falta).
- No mencionar herramientas de IA en los mensajes.
- Nunca commitear: `.env`, `docker-compose.override.yml`, `.agents/`, `.claude/`, `.cursor/`, `.codegraph/`, `.mcp.json`, `opencode.jsonc`.

## Cambio nuestro (va a producción)

```bash
cd ~/Desarrollo/chatwoot-worktrees/production
git switch production && git pull
git switch -c picnic/feat/<slug>
# … cambios + specs …   (antes de abrir PR: skill pr-ready)
git push -u origin HEAD
gh pr create -R andercard/chatwoot --base production --title "feat(scope): ..." --body-file /tmp/body.md
```

- PR en **nuestro fork** contra `production`, con la misma plantilla que Chatwoot: resumen para usuario, `Closes`, `How to test` / `How to reproduce`, `What changed`, capturas si hay UI.
- Merge con **squash** (un commit por cambio en `production`; facilita rollback y futuras actualizaciones).
- Preferir cambios **aditivos y aislados** (nuevos archivos, `prepend_mod_with`, flags) frente a editar código existente de Chatwoot: cada edición a un archivo upstream es un posible conflicto al actualizar de versión.
- Si el cambio le sirve a todos, considera mandarlo también a Chatwoot (flujo de abajo) para no cargarlo para siempre.

## Contribución a Chatwoot (upstream)

```bash
cd ~/Desarrollo/chatwoot
git switch develop && git pull          # develop sigue a upstream/develop
git switch -c fix/<slug>
# … cambios … skill pr-ready → skill pr-create
git push -u origin HEAD
gh pr create -R chatwoot/chatwoot --base develop --head andercard:fix/<slug> ...
```

Estándar de Chatwoot (resumido): título semántico validado por CI, 1 aprobación de maintainer, el bot Codex revisa cada PR (contestar o corregir cada hallazgo P1/P2 y comentar `@codex review`), PRs pequeños (~120 líneas), solo `en.json`/`en.yml`, nada de forks/white-label en upstream.

## Actualizar a una nueva versión de Chatwoot

Ver [03 · Release y despliegue](03-release-despliegue.md#actualizar-la-versión-de-chatwoot).

## Archivos locales que nunca van en un PR

Son solo de tu máquina. **No** se versionan y se ignoran de dos maneras:

| Archivo / carpeta | Para qué sirve | Dónde se ignora |
|---|---|---|
| `.env` | variables locales y contraseña local | `.gitignore` del repo (línea `.env`) |
| `.claude/`, `.cursor/` | rules y skills de Claude / Cursor | `.gitignore` del repo |
| `docker-compose.override.yml` | puerto 3005 y arreglos de Docker | `.git/info/exclude` (solo tu clon) |
| `.agents/` | skills y script que genera las rules de Cursor | `.git/info/exclude` |
| `.codegraph/`, `.mcp.json`, `opencode.jsonc` | índice de CodeGraph y configuración MCP | `.git/info/exclude` |
| `.husky/_/` | ayudante generado de husky en el worktree | `.git/info/exclude` |

`.git/info/exclude` es el `.gitignore` personal: vive dentro de `.git`, nunca se sube al fork ni a Chatwoot y **lo comparten el checkout principal y el worktree `production`**. No se pierde al cambiar de rama.

⚠️ Excepción: `AGENTS.md` es un archivo versionado y localmente tiene un bloque de CodeGraph agregado. Git lo ve como modificado (`M AGENTS.md`), y no se puede ignorar. Al preparar un commit o un PR **agrega los archivos por nombre** (`git add <archivos>`, nunca `git add .` ni `git commit -a`) y revisa con `git diff --cached --name-only` que `AGENTS.md` no aparezca. Si aparece: `git restore --staged AGENTS.md`.

## Nota sobre el hook pre-push

`bin/validate_push` bloquea el push cuando la rama **actual** es `develop` o `master`. Por eso los pushes de `production` se hacen desde el worktree `chatwoot-worktrees/production`, no desde el checkout principal parado en `develop`.
