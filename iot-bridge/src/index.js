/**
 * SafariCharge IoT Bridge — MQTT + Modbus bridge to /api/ingest
 */
// Use CJS require for broad Node compatibility without a build step
const mqtt        = require('mqtt');
const ModbusRTU   = require('modbus-serial');
const express     = require('express');
const fetch       = (...args) => import('node-fetch').then(({default: f}) => f(...args));
const pino        = require('pino');

const log = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty' }
    : undefined,
});

const SITE_ID      = process.env.SITE_ID            ?? 'default';
const INGEST_URL   = process.env.SC_INGEST_URL       ?? 'http://app:3000/api/ingest';
const INGEST_TOKEN = process.env.SC_INGEST_TOKEN     ?? '';
const TOPIC_PREFIX = process.env.MQTT_TOPIC_PREFIX   ?? 'safaricharge/';

async function sendReading(metric, value, unit = '', source = 'mqtt') {
  try {
    const res = await fetch(INGEST_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(INGEST_TOKEN ? { Authorization: `Bearer ${INGEST_TOKEN}` } : {}),
      },
      body: JSON.stringify({ siteId: SITE_ID, source, metric, value: Number(value), unit, ts: new Date().toISOString() }),
    });
    if (!res.ok) log.warn({ status: res.status, metric }, 'Ingest rejected');
  } catch (err) {
    log.error({ err, metric }, 'Failed to forward reading');
  }
}

// ─── MQTT ────────────────────────────────────────────────────────────────────
const MQTT_URL = process.env.MQTT_BROKER_URL;
if (MQTT_URL) {
  const client = mqtt.connect(MQTT_URL, {
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    clientId: `sc-bridge-${Math.random().toString(16).slice(2)}`,
    reconnectPeriod: 5000,
  });
  client.on('connect', () => {
    log.info({ url: MQTT_URL }, 'MQTT connected');
    client.subscribe(`${TOPIC_PREFIX}#`);
  });
  client.on('message', (topic, payload) => {
    const metric = topic.replace(TOPIC_PREFIX, '').replace(/\//g, '_');
    const raw = payload.toString().trim();
    let value;
    try {
      const p = JSON.parse(raw);
      value = typeof p === 'object' ? (p.value ?? p.v) : p;
    } catch { value = parseFloat(raw); }
    if (Number.isFinite(value)) sendReading(metric, value, '', 'mqtt');
    else log.warn({ topic, raw }, 'Non-numeric payload ignored');
  });
  client.on('error', (err) => log.error({ err }, 'MQTT error'));
} else {
  log.info('MQTT_BROKER_URL not set — MQTT disabled');
}

// ─── Modbus TCP ───────────────────────────────────────────────────────────────
// Adapt MODBUS_REGISTER_MAP to your inverter's register table.
const MODBUS_HOST    = process.env.MODBUS_HOST;
const MODBUS_PORT    = parseInt(process.env.MODBUS_PORT    ?? '502',  10);
const MODBUS_UNIT_ID = parseInt(process.env.MODBUS_UNIT_ID ?? '1',    10);
const MODBUS_POLL_MS = parseInt(process.env.MODBUS_POLL_MS ?? '5000', 10);

// Default map: Growatt SPH series holding registers
const REGISTER_MAP = [
  { register: 0x0000, metric: 'pv_power_w',   scale: 0.1, unit: 'W'  },
  { register: 0x0001, metric: 'battery_soc',  scale: 1,   unit: '%'  },
  { register: 0x0004, metric: 'load_power_w', scale: 0.1, unit: 'W'  },
];

if (MODBUS_HOST) {
  const mc = new ModbusRTU();
  async function poll() {
    try {
      if (!mc.isOpen) {
        await mc.connectTCP(MODBUS_HOST, { port: MODBUS_PORT });
        mc.setID(MODBUS_UNIT_ID);
        log.info({ host: MODBUS_HOST }, 'Modbus connected');
      }
      for (const reg of REGISTER_MAP) {
        try {
          const { data } = await mc.readHoldingRegisters(reg.register, 1);
          await sendReading(reg.metric, data[0] * reg.scale, reg.unit, 'modbus');
        } catch (e) { log.warn({ err: e, reg: reg.register }, 'Register read failed'); }
      }
    } catch (err) {
      log.error({ err }, 'Modbus poll error — retrying');
      try { mc.close(); } catch {}
    }
  }
  setInterval(poll, MODBUS_POLL_MS);
  poll();
} else {
  log.info('MODBUS_HOST not set — Modbus disabled');
}

// ─── Health endpoint ──────────────────────────────────────────────────────────
const server = express();
server.get('/health', (_, res) => res.json({ status: 'ok', ts: Date.now() }));
server.listen(4000, () => log.info('IoT bridge health endpoint on :4000'));
