# Contenedor 2: base de datos PostgreSQL
# Imagen base oficial con versión fija (no "latest")
FROM postgres:16.6-alpine3.20

# Script de inicialización: crea la tabla "notas" la primera vez que arranca el volumen
COPY init.sql /docker-entrypoint-initdb.d/01-init.sql

EXPOSE 5432
