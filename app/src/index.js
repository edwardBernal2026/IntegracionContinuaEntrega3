const express = require('express');
const { Pool } = require('pg');

// Toda la configuración llega por variables de entorno (ningún secreto en el código).
// DB_HOST es el NOMBRE DEL SERVICIO de Docker Compose ("db"), no localhost ni una IP.
const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
});

const app = express();
app.use(express.json());

// Estado de la API y de la conexión con la base de datos
app.get('/health', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT version() AS version, inet_server_addr() AS ip');
    res.json({
      api: 'ok',
      db_host: process.env.DB_HOST,
      db_ip_resuelta: rows[0].ip,
      postgres: rows[0].version,
    });
  } catch (err) {
    res.status(503).json({ api: 'ok', db: 'sin conexión', error: err.message });
  }
});

// Guardar una nota (escritura en el contenedor 2)
app.post('/notas', async (req, res) => {
  const { texto } = req.body || {};
  if (!texto || typeof texto !== 'string') {
    return res.status(400).json({ error: 'El campo "texto" es obligatorio' });
  }
  const { rows } = await pool.query(
    'INSERT INTO notas (texto) VALUES ($1) RETURNING id, texto, creada_en',
    [texto]
  );
  res.status(201).json(rows[0]);
});

// Leer todas las notas (lectura desde el contenedor 2)
app.get('/notas', async (_req, res) => {
  const { rows } = await pool.query('SELECT id, texto, creada_en FROM notas ORDER BY id');
  res.json(rows);
});

// Leer una nota por id
app.get('/notas/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT id, texto, creada_en FROM notas WHERE id = $1', [
    req.params.id,
  ]);
  if (rows.length === 0) return res.status(404).json({ error: 'No encontrada' });
  res.json(rows[0]);
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno' });
});

const port = Number(process.env.APP_PORT || 3000);
app.listen(port, () => {
  console.log(`API escuchando en el puerto ${port}; base de datos en ${process.env.DB_HOST}`);
});
