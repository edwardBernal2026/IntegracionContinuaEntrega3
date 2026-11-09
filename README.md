# Entrega proyecto 1 – Docker con dos contenedores comunicados

[![Docker CI](https://github.com/edwardBernal2026/IntegracionContinuaEntrega3/actions/workflows/docker-ci.yml/badge.svg)](https://github.com/edwardBernal2026/IntegracionContinuaEntrega3/actions/workflows/docker-ci.yml)

Proyecto de Integración Continua (Escenario 3). Dos contenedores que se comunican dentro de una red propia de Docker:

| Servicio | Papel | Imagen base | Puerto |
|----------|-------|-------------|--------|
| `app` (contenedor 1) | API REST de notas (Node.js + Express) | `node:20.18.1-alpine3.20` | `3000` (publicado al host) |
| `db` (contenedor 2) | Base de datos PostgreSQL con volumen persistente | `postgres:16.6-alpine3.20` | `5432` (solo dentro de la red) |

La API se conecta a la base de datos usando el **nombre del servicio `db`** (`DB_HOST=db`), resuelto por el DNS interno de Docker en la red `red_notas`. Entre contenedores no se usa `localhost` ni IPs fijas; `localhost:3000` solo sirve para entrar a la API **desde el equipo host** por el puerto publicado.

```
 Navegador / curl (equipo host)
       │  http://localhost:3000  (puerto publicado)
       ▼
┌──────────────────────── red_notas (bridge) ────────────────────────┐
│  ┌──────────────┐   SQL a  db:5432   ┌───────────────┐            │
│  │ app (Node.js)│ ─────────────────▶ │ db (Postgres) │──▶ volumen │
│  │  notas-app   │ ◀───────────────── │   notas-db    │  notas_db_ │
│  └──────────────┘    resultados      └───────────────┘   data     │
└────────────────────────────────────────────────────────────────────┘
```

## Estructura

```
.
├── app/                       # Contenedor 1: API
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── package.json / package-lock.json
│   └── src/index.js
├── db/                        # Contenedor 2: PostgreSQL
│   ├── Dockerfile
│   ├── .dockerignore
│   └── init.sql               # crea la tabla "notas"
├── scripts/prueba-comunicacion.sh   # prueba de ida y vuelta app → db → app
├── .github/workflows/docker-ci.yml  # pipeline de GitHub Actions
├── docker-compose.yml
├── .env.example               # plantilla de variables (el .env real NO se sube)
└── .gitignore
```

## Requisitos

- Docker 24+ con Docker Compose v2.24 o superior

## Cómo levantar los contenedores

```bash
# 1. (Recomendado) Crear su propio .env y cambiar la contraseña.
#    Si no existe .env, Compose usa los valores de ejemplo de .env.example.
cp .env.example .env

# 2. Construir las imágenes
docker compose build

# 3. Levantar los dos servicios
docker compose up -d

# 4. Ver el estado
docker ps
docker network inspect red_notas
```

## Probar la comunicación entre contenedores

Prueba automática. Se ejecuta **dentro de la red `red_notas` y solo con nombres de servicio**: resuelve `db` desde `app`, guarda una nota en `http://app:3000`, la lee y la verifica en PostgreSQL.

```bash
sh scripts/prueba-comunicacion.sh
```

Prueba manual dentro de la red (nombres de servicio):

```bash
docker compose exec app getent hosts db
docker run --rm --network red_notas busybox:1.36.1 wget -qO- http://app:3000/health
```

Prueba manual desde el equipo host (puerto publicado):

```bash
curl http://localhost:3000/health
curl -X POST http://localhost:3000/notas -H "Content-Type: application/json" -d '{"texto":"Hola desde app"}'
curl http://localhost:3000/notas
```

## Endpoints de la API

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/health` | Estado de la API y de la conexión a `db` |
| POST | `/notas` | Guarda una nota `{"texto": "..."}` |
| GET | `/notas` | Lista todas las notas |
| GET | `/notas/:id` | Lee una nota |

## Apagar

```bash
docker compose down        # conserva los datos (volumen notas_db_data)
docker compose down -v     # borra también el volumen
```

## Integración continua

El workflow [`.github/workflows/docker-ci.yml`](.github/workflows/docker-ci.yml) se ejecuta en cada `push` y `pull_request`: valida el `docker-compose.yml`, construye las dos imágenes, levanta los servicios y ejecuta la prueba de comunicación. Si existe el secreto `POSTGRES_PASSWORD` en el repositorio lo usa; si no, genera una contraseña aleatoria para la ejecución.

## Seguridad

- Las credenciales viven en `.env`, que está en `.gitignore`; se versiona solo `.env.example`.
- Ningún secreto en el código: la API lee todo de variables de entorno.
- `.dockerignore` en cada servicio evita copiar `node_modules`, `.env` y archivos innecesarios a las imágenes.
- La API corre con el usuario sin privilegios `node`; la base de datos no publica su puerto al host.
