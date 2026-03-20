import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import net from "net";
import os from "os";
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const SSDP = require('node-ssdp');
const BonjourService = require('bonjour-service');

const SSDPClient = SSDP.Client;
const Bonjour = BonjourService.Bonjour;

async function startServer() {
  const app = express();
  const PORT = 3000;
  const db = new Database("security_events.db");

  // Initialize DB
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      camera_id TEXT,
      object_type TEXT,
      confidence REAL,
      image_data TEXT
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
    CREATE TABLE IF NOT EXISTS cameras (
      id TEXT PRIMARY KEY,
      name TEXT,
      ip TEXT,
      port TEXT,
      username TEXT,
      password TEXT,
      channel INTEGER,
      streamType INTEGER,
      enabled INTEGER,
      zones TEXT
    );
  `);

  // Migration: Add columns if they don't exist (for existing databases)
  const tableInfo = db.prepare("PRAGMA table_info(cameras)").all() as any[];
  const columns = tableInfo.map(c => c.name);
  if (!columns.includes('channel')) {
    db.exec(`
      DROP TABLE IF EXISTS cameras;
      CREATE TABLE cameras (
        id TEXT PRIMARY KEY,
        name TEXT,
        ip TEXT,
        port TEXT,
        username TEXT,
        password TEXT,
        channel INTEGER,
        streamType INTEGER,
        enabled INTEGER,
        zones TEXT
      );
    `);
  }

  app.use(express.json({ limit: '10mb' }));

  // API Routes
  app.get("/api/cameras", (req, res) => {
    const cameras = db.prepare("SELECT * FROM cameras").all();
    res.json(cameras.map(cam => ({
      ...cam,
      enabled: Boolean(cam.enabled),
      zones: JSON.parse(cam.zones || '[]')
    })));
  });

  app.post("/api/cameras", (req, res) => {
    const cameras = req.body;
    const deleteStmt = db.prepare("DELETE FROM cameras");
    const insertStmt = db.prepare("INSERT INTO cameras (id, name, ip, port, username, password, channel, streamType, enabled, zones) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    
    const transaction = db.transaction((camList) => {
      deleteStmt.run();
      for (const cam of camList) {
        insertStmt.run(
          cam.id, 
          cam.name, 
          cam.ip, 
          cam.port, 
          cam.username || '', 
          cam.password || '', 
          cam.channel || 1, 
          cam.streamType || 0, 
          cam.enabled ? 1 : 0, 
          JSON.stringify(cam.zones)
        );
      }
    });

    transaction(cameras);
    res.json({ success: true });
  });

  app.post("/api/cameras/test", (req, res) => {
    const { ip, port } = req.body;
    
    if (!ip || !port) {
      return res.status(400).json({ success: false, message: "IP and Port required" });
    }

    const client = new net.Socket();
    client.setTimeout(5000); // 5 second timeout

    client.connect(parseInt(port), ip, () => {
      client.destroy();
      res.json({ success: true, message: "Connection established" });
    });

    client.on('error', (err) => {
      client.destroy();
      let message = err.message;
      if (err.message.includes('ECONNREFUSED')) message = "Connection refused (check port)";
      if (err.message.includes('ENETUNREACH')) message = "Network unreachable";
      if (err.message.includes('EHOSTUNREACH')) message = "Host unreachable (check IP)";
      res.json({ success: false, message });
    });

    client.on('timeout', () => {
      client.destroy();
      res.json({ success: false, message: "Timed out (check IP/Port or Firewall)" });
    });
  });

  app.get("/api/cameras/discover", async (req, res) => {
    const { start, end } = req.query;
    const interfaces = os.networkInterfaces();
    const localIps: string[] = [];
    
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]!) {
        if (iface.family === 'IPv4' && !iface.internal) {
          localIps.push(iface.address);
        }
      }
    }

    if (localIps.length === 0) {
      return res.json({ success: false, message: "No local network interfaces found" });
    }

    const baseIp = localIps[0].split('.').slice(0, 3).join('.');
    const foundCameras: { ip: string, port: number, protocol?: string }[] = [];
    const portsToScan = [554, 80, 8080];
    
    const scanIp = (ip: string, port: number): Promise<void> => {
      return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(150);
        socket.on('connect', () => {
          if (!foundCameras.some(c => c.ip === ip && c.port === port)) {
            foundCameras.push({ ip, port, protocol: 'TCP' });
          }
          socket.destroy();
          resolve();
        });
        socket.on('timeout', () => {
          socket.destroy();
          resolve();
        });
        socket.on('error', () => {
          socket.destroy();
          resolve();
        });
        socket.connect(port, ip);
      });
    };

    // 1. UPnP Discovery
    const upnpPromise = new Promise<void>((resolve) => {
      try {
        if (!SSDPClient) {
          console.warn('SSDPClient not found, skipping UPnP discovery');
          return resolve();
        }
        const client = new SSDPClient();
        client.on('response', (headers: any, statusCode: any, rinfo: any) => {
          if (rinfo.address && !foundCameras.some(c => c.ip === rinfo.address)) {
            foundCameras.push({ ip: rinfo.address, port: 554, protocol: 'UPnP' });
          }
        });
        client.search('ssdp:all');
        setTimeout(() => {
          try { client.stop(); } catch (e) {}
          resolve();
        }, 2000);
      } catch (err) {
        console.error('UPnP discovery error:', err);
        resolve();
      }
    });

    // 2. mDNS Discovery
    const mdnsPromise = new Promise<void>((resolve) => {
      try {
        if (!Bonjour) {
          console.warn('Bonjour not found, skipping mDNS discovery');
          return resolve();
        }
        const bonjour = new Bonjour();
        const browser = bonjour.find({ type: 'rtsp' });
        browser.on('up', (service: any) => {
          if (service.addresses && service.addresses[0]) {
            foundCameras.push({ ip: service.addresses[0], port: service.port || 554, protocol: 'mDNS' });
          }
        });
        setTimeout(() => {
          try { bonjour.destroy(); } catch (e) {}
          resolve();
        }, 2000);
      } catch (err) {
        console.error('mDNS discovery error:', err);
        resolve();
      }
    });

    // 3. Custom Range Port Scan
    const startNum = parseInt(start as string) || 1;
    const endNum = parseInt(end as string) || 50;
    const scanPromises: Promise<void>[] = [];
    for (let i = startNum; i <= endNum; i++) {
      const ip = `${baseIp}.${i}`;
      for (const port of portsToScan) {
        scanPromises.push(scanIp(ip, port));
      }
    }

    await Promise.all([upnpPromise, mdnsPromise, ...scanPromises]);
    
    // Deduplicate
    const uniqueCameras = Array.from(new Map(foundCameras.map(c => [c.ip + c.port, c])).values());
    
    res.json({ success: true, baseIp, foundCameras: uniqueCameras });
  });

  app.get("/api/events", (req, res) => {
    const events = db.prepare("SELECT * FROM events ORDER BY timestamp DESC LIMIT 50").all();
    res.json(events);
  });

  app.post("/api/events", (req, res) => {
    const { camera_id, object_type, confidence, image_data } = req.body;
    const stmt = db.prepare("INSERT INTO events (camera_id, object_type, confidence, image_data) VALUES (?, ?, ?, ?)");
    stmt.run(camera_id, object_type, confidence, image_data);
    res.json({ success: true });
  });

  app.get("/api/settings", (req, res) => {
    const settings = db.prepare("SELECT * FROM settings").all();
    res.json(settings);
  });

  app.post("/api/settings", (req, res) => {
    const { key, value } = req.body;
    const stmt = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
    stmt.run(key, value);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
