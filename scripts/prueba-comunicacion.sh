#!/usr/bin/env sh
# Prueba de ida y vuelta dentro de la red red_notas, usando solo NOMBRES DE SERVICIO:
#   cliente --(http://app:3000)--> app --(db:5432)--> db
# El cliente es un contenedor temporal conectado a la misma red, así que no se usa
# localhost ni ninguna IP fija.
set -e

RED="red_notas"
CLIENTE="docker run --rm --network $RED busybox:1.36.1"
API="http://app:3000"
docker pull -q busybox:1.36.1 >/dev/null

echo "== 1. El contenedor app resuelve el nombre de servicio 'db' (DNS interno de Docker) =="
docker compose exec -T app getent hosts db

echo
echo "== 2. Estado de la API y de su conexión con db ($API/health) =="
$CLIENTE wget -qO- "$API/health"
echo

echo
echo "== 3. Guardar una nota (POST $API/notas) =="
TEXTO="Prueba de comunicacion $(date '+%Y-%m-%d %H:%M:%S')"
RESP=$($CLIENTE wget -qO- --header 'Content-Type: application/json' \
  --post-data "{\"texto\": \"$TEXTO\"}" "$API/notas")
echo "$RESP"
ID=$(echo "$RESP" | sed -E 's/.*"id":([0-9]+).*/\1/')

echo
echo "== 4. Leer la nota guardada (GET $API/notas/$ID) =="
LEIDA=$($CLIENTE wget -qO- "$API/notas/$ID")
echo "$LEIDA"

echo
echo "== 5. Verificar el dato directamente en PostgreSQL (contenedor db) =="
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT * FROM notas ORDER BY id DESC LIMIT 3;"'

echo "$LEIDA" | grep -q "$TEXTO" && echo "RESULTADO: OK - el dato hizo ida y vuelta app -> db -> app usando nombres de servicio"
