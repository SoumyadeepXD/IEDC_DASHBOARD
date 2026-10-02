const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const ACHIEVEMENTS_FILE = path.join(DATA_DIR, 'achievements.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const INITIAL_BACKUP_FILE = path.join(DATA_DIR, 'initial_achievements.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

// Backup initial data on startup if not already backed up
if (fs.existsSync(ACHIEVEMENTS_FILE) && !fs.existsSync(INITIAL_BACKUP_FILE)) {
  fs.copyFileSync(ACHIEVEMENTS_FILE, INITIAL_BACKUP_FILE);
}

// In-memory simple token cache
const activeTokens = new Set();

function generateToken() {
  const token = crypto.randomBytes(24).toString('hex');
  activeTokens.add(token);
  return token;
}

function isValidToken(token) {
  return activeTokens.has(token);
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html; charset=UTF-8',
    '.css': 'text/css; charset=UTF-8',
    '.js': 'application/javascript; charset=UTF-8',
    '.json': 'application/json; charset=UTF-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff'
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=UTF-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 5 * 1024 * 1024) { // 5MB limit
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        const parsed = body ? JSON.parse(body) : {};
        resolve(parsed);
      } catch (err) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function getStoredPassword() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      return config.adminPassword || 'admin123';
    }
  } catch (e) {
    console.error('Error reading config file:', e);
  }
  return 'admin123';
}

function checkAuth(req) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  return isValidToken(token);
}

function readAchievements() {
  try {
    if (fs.existsSync(ACHIEVEMENTS_FILE)) {
      return JSON.parse(fs.readFileSync(ACHIEVEMENTS_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('Error reading achievements:', err);
  }
  return [];
}

function writeAchievements(data) {
  fs.writeFileSync(ACHIEVEMENTS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // API Routes
  if (pathname.startsWith('/api/')) {
    try {
      // 1. GET /api/achievements
      if (req.method === 'GET' && pathname === '/api/achievements') {
        const achievements = readAchievements();
        return sendJson(res, 200, { success: true, data: achievements });
      }

      // 2. POST /api/admin/login
      if (req.method === 'POST' && pathname === '/api/admin/login') {
        const body = await parseJsonBody(req);
        const storedPass = getStoredPassword();
        if (body.password === storedPass) {
          const token = generateToken();
          return sendJson(res, 200, {
            success: true,
            token,
            message: 'Authentication successful'
          });
        } else {
          return sendJson(res, 401, {
            success: false,
            message: 'Incorrect admin password'
          });
        }
      }

      // 3. POST /api/admin/change-password
      if (req.method === 'POST' && pathname === '/api/admin/change-password') {
        if (!checkAuth(req)) {
          return sendJson(res, 401, { success: false, message: 'Unauthorized' });
        }
        const body = await parseJsonBody(req);
        if (!body.newPassword || body.newPassword.trim().length < 4) {
          return sendJson(res, 400, { success: false, message: 'Password must be at least 4 characters long' });
        }
        let config = {};
        if (fs.existsSync(CONFIG_FILE)) {
          config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        }
        config.adminPassword = body.newPassword.trim();
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
        return sendJson(res, 200, { success: true, message: 'Admin password updated successfully' });
      }

      // 4. POST /api/achievements (Add achievement)
      if (req.method === 'POST' && pathname === '/api/achievements') {
        if (!checkAuth(req)) {
          return sendJson(res, 401, { success: false, message: 'Unauthorized. Admin login required.' });
        }
        const body = await parseJsonBody(req);
        if (!body.title || !body.year) {
          return sendJson(res, 400, { success: false, message: 'Title and Year are required.' });
        }

        const achievements = readAchievements();
        const newAchievement = {
          id: body.id || `ach-${body.year}-${Date.now().toString(36)}`,
          year: parseInt(body.year, 10),
          title: body.title.trim(),
          position: body.position ? body.position.trim() : 'Participant / Winner',
          awardTier: body.awardTier || 'winner',
          category: body.category ? body.category.trim() : 'Hackathon & Innovation',
          organization: body.organization ? body.organization.trim() : '',
          description: body.description ? body.description.trim() : '',
          badge: body.badge || (body.awardTier === 'winner' ? '🏆 Winner' : '🎖️ Awardee'),
          featured: Boolean(body.featured),
          tags: Array.isArray(body.tags) ? body.tags : (body.tags ? body.tags.split(',').map(t => t.trim()).filter(Boolean) : [])
        };

        achievements.unshift(newAchievement);
        writeAchievements(achievements);
        return sendJson(res, 201, { success: true, data: newAchievement, message: 'Achievement added successfully' });
      }

      // 5. PUT /api/achievements/:id
      if (req.method === 'PUT' && pathname.startsWith('/api/achievements/')) {
        if (!checkAuth(req)) {
          return sendJson(res, 401, { success: false, message: 'Unauthorized. Admin login required.' });
        }
        const id = decodeURIComponent(pathname.replace('/api/achievements/', ''));
        const body = await parseJsonBody(req);
        const achievements = readAchievements();
        const index = achievements.findIndex(a => a.id === id);

        if (index === -1) {
          return sendJson(res, 404, { success: false, message: 'Achievement not found' });
        }

        achievements[index] = {
          ...achievements[index],
          ...body,
          id, // ensure ID is preserved
          year: parseInt(body.year || achievements[index].year, 10)
        };

        writeAchievements(achievements);
        return sendJson(res, 200, { success: true, data: achievements[index], message: 'Achievement updated successfully' });
      }

      // 6. DELETE /api/achievements/:id
      if (req.method === 'DELETE' && pathname.startsWith('/api/achievements/')) {
        if (!checkAuth(req)) {
          return sendJson(res, 401, { success: false, message: 'Unauthorized. Admin login required.' });
        }
        const id = decodeURIComponent(pathname.replace('/api/achievements/', ''));
        let achievements = readAchievements();
        const initialLength = achievements.length;
        achievements = achievements.filter(a => a.id !== id);

        if (achievements.length === initialLength) {
          return sendJson(res, 404, { success: false, message: 'Achievement not found' });
        }

        writeAchievements(achievements);
        return sendJson(res, 200, { success: true, message: 'Achievement deleted successfully' });
      }

      // 7. POST /api/admin/reset
      if (req.method === 'POST' && pathname === '/api/admin/reset') {
        if (!checkAuth(req)) {
          return sendJson(res, 401, { success: false, message: 'Unauthorized' });
        }
        if (fs.existsSync(INITIAL_BACKUP_FILE)) {
          const initialData = JSON.parse(fs.readFileSync(INITIAL_BACKUP_FILE, 'utf8'));
          writeAchievements(initialData);
          return sendJson(res, 200, { success: true, data: initialData, message: 'Dataset reset to original whiteboard achievements' });
        }
        return sendJson(res, 400, { success: false, message: 'Backup file not found' });
      }

      // 8. POST /api/admin/import
      if (req.method === 'POST' && pathname === '/api/admin/import') {
        if (!checkAuth(req)) {
          return sendJson(res, 401, { success: false, message: 'Unauthorized' });
        }
        const body = await parseJsonBody(req);
        if (Array.isArray(body)) {
          writeAchievements(body);
          return sendJson(res, 200, { success: true, data: body, message: `Successfully imported ${body.length} achievements` });
        }
        return sendJson(res, 400, { success: false, message: 'Expected JSON array of achievements' });
      }

      return sendJson(res, 404, { success: false, message: 'API route not found' });
    } catch (err) {
      console.error('API Error:', err);
      return sendJson(res, 500, { success: false, message: err.message || 'Internal Server Error' });
    }
  }

  // Static File Serving
  let relativePath = pathname === '/' ? '/index.html' : pathname;
  // Prevent directory traversal attacks
  const safePath = path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, '');
  let filePath = path.join(__dirname, safePath);
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    filePath = path.join(PUBLIC_DIR, safePath);
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const contentType = getMimeType(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } else {
    // If not found, serve index.html for client-side routing fallback or 404
    const indexFallback = fs.existsSync(path.join(__dirname, 'index.html'))
      ? path.join(__dirname, 'index.html')
      : path.join(PUBLIC_DIR, 'index.html');
    if (fs.existsSync(indexFallback)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8' });
      fs.createReadStream(indexFallback).pipe(res);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
    }
  }
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Achievement Sliding Deck Server running!`);
  console.log(`📡 Local URL: http://localhost:${PORT}`);
  console.log(`🔐 Default Admin Password: ${getStoredPassword()}`);
  console.log(`====================================================`);
});
