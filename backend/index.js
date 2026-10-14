const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const axios = require('axios');
const cron = require('node-cron');
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

// Send Discord Webhook Alert
async function sendDiscordAlert(url, newStatus, statusCode, errorMsg) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl || !webhookUrl.trim()) {
    return;
  }

  const isUp = newStatus === 'UP';
  const color = isUp ? 3066993 : 15158332; // Green (3066993) for UP, Red (15158332) for DOWN
  const title = isUp ? '🟢 Monitor Recovered: UP' : '🔴 Monitor Incident: DOWN';

  const fields = [
    { name: 'URL', value: url, inline: false },
    { name: 'Status', value: newStatus, inline: true },
    { name: 'Status Code', value: statusCode ? String(statusCode) : 'N/A', inline: true },
  ];

  if (errorMsg) {
    fields.push({ name: 'Error Details', value: String(errorMsg), inline: false });
  }

  const embed = {
    title,
    color,
    fields,
    timestamp: new Date().toISOString(),
  };

  try {
    await axios.post(webhookUrl.trim(), { embeds: [embed] }, { timeout: 5000 });
  } catch (err) {
    console.error('Failed to send Discord alert:', err.message);
  }
}

// Health check a single monitor and persist results
async function checkMonitor(monitor) {
  const startTime = Date.now();
  let statusCode = null;
  let isUp = false;
  let newStatus = 'DOWN';
  let errorMsg = null;

  try {
    const response = await axios.get(monitor.url, {
      timeout: 8000,
      validateStatus: () => true,
    });

    statusCode = response.status;
    if (statusCode >= 200 && statusCode <= 399) {
      isUp = true;
      newStatus = 'UP';
    } else {
      isUp = false;
      newStatus = 'DOWN';
      errorMsg = `HTTP status ${statusCode}`;
    }
  } catch (err) {
    isUp = false;
    newStatus = 'DOWN';
    statusCode = err.response ? err.response.status : null;
    errorMsg = err.code || err.message || 'Request failed';
  }

  const responseTimeMs = Date.now() - startTime;

  // CRITICAL ANTI-SPAM RULE: Trigger ONLY on transitions (not initial PENDING)
  if (monitor.status !== 'PENDING' && monitor.status !== newStatus) {
    await sendDiscordAlert(monitor.url, newStatus, statusCode, errorMsg);
  }

  try {
    // Update monitor status and last_checked
    await pool.query(
      'UPDATE monitors SET status = $1, last_checked = NOW() WHERE id = $2',
      [newStatus, monitor.id]
    );

    // Insert ping log
    await pool.query(
      `INSERT INTO ping_logs (monitor_id, status_code, response_time_ms, is_up) 
       VALUES ($1, $2, $3, $4)`,
      [monitor.id, statusCode, responseTimeMs, isUp]
    );
  } catch (dbErr) {
    console.error(`Database error during health check for monitor ${monitor.id}:`, dbErr.message);
  }
}

// Schedule node-cron task running every 60 seconds (* * * * *)
cron.schedule('* * * * *', async () => {
  try {
    const res = await pool.query('SELECT id, url, status FROM monitors');
    const monitors = res.rows;
    if (monitors.length > 0) {
      await Promise.all(monitors.map(checkMonitor));
    }
  } catch (err) {
    console.error('Error running scheduled health check cron:', err.message);
  }
});

// Health Check Endpoint
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

// POST /api/monitors - Add new monitor and run immediate initial check
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

    const createdMonitor = result.rows[0];

    // Trigger initial health check asynchronously
    checkMonitor(createdMonitor).catch((checkErr) => {
      console.error(`Initial check failed for monitor ${createdMonitor.id}:`, checkErr.message);
    });

    res.status(201).json(createdMonitor);
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
