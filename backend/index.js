const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4000;

// Configure PostgreSQL pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle pg client', err);
});

// Middleware
app.use(cors());
app.use(express.json());

// Health Check
app.get(['/api/health', '/api/Health'], (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// GET /api/monitors - Returns monitors with nested 24h ping logs
app.get('/api/monitors', async (req, res) => {
  try {
    const monitorsResult = await pool.query(
      'SELECT id, url, status, last_checked, created_at FROM monitors ORDER BY id DESC'
    );
    const monitors = monitorsResult.rows;

    if (monitors.length === 0) {
      return res.status(200).json([]);
    }

    const logsResult = await pool.query(
      `SELECT id, monitor_id, status_code, response_time_ms, is_up, checked_at 
       FROM ping_logs 
       WHERE checked_at > NOW() - INTERVAL '24 hours' 
       ORDER BY checked_at ASC`
    );

    const historyMap = {};
    for (const log of logsResult.rows) {
      if (!historyMap[log.monitor_id]) {
        historyMap[log.monitor_id] = [];
      }
      historyMap[log.monitor_id].push(log);
    }

    const payload = monitors.map((monitor) => ({
      ...monitor,
      history: historyMap[monitor.id] || [],
    }));

    res.status(200).json(payload);
  } catch (err) {
    console.error('Error fetching monitors:', err);
    res.status(500).json({ error: 'Internal server error fetching monitors' });
  }
});

// POST /api/monitors - Add new monitor
app.post('/api/monitors', async (req, res) => {
  try {
    let { url } = req.body;

    if (!url || typeof url !== 'string' || !url.trim()) {
      return res.status(400).json({ error: 'URL is required' });
    }

    url = url.trim();

    // Auto-prepend https:// if neither http:// nor https:// is present
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    const result = await pool.query(
      'INSERT INTO monitors (url) VALUES ($1) RETURNING *',
      [url]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Monitor for this URL already exists' });
    }
    console.error('Error creating monitor:', err);
    res.status(500).json({ error: 'Internal server error creating monitor' });
  }
});

// DELETE /api/monitors/:id - Delete monitor
app.delete('/api/monitors/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const monitorId = parseInt(id, 10);

    if (isNaN(monitorId)) {
      return res.status(400).json({ error: 'Invalid monitor ID' });
    }

    await pool.query('DELETE FROM monitors WHERE id = $1', [monitorId]);
    res.status(204).send();
  } catch (err) {
    console.error('Error deleting monitor:', err);
    res.status(500).json({ error: 'Internal server error deleting monitor' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});

module.exports = app;
