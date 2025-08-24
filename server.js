const express = require('express');
const app = express();
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const activeUsers = new Map();

require('dotenv').config();

const PORT = process.env.PORT || 3000;
const MESSAGES_FILE = path.join(__dirname, 'messages.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/dashboard.html'));
});

// Ensure messages file exists
if (!fs.existsSync(MESSAGES_FILE)) {
  fs.writeFileSync(MESSAGES_FILE, JSON.stringify([], null, 2));
}

// Utility: read messages safely
function readMessages() {
  try {
    const data = fs.readFileSync(MESSAGES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading messages file:", err);
    return [];
  }
}

// Utility: write messages safely
function writeMessages(messages) {
  try {
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2));
  } catch (err) {
    console.error("Error writing messages file:", err);
  }
}

// GET all messages
app.get('/api/messages', (req, res) => {
  const messages = readMessages();
  res.json(messages);
});

// POST a new message
app.post('/api/messages', (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Message text is required' });

  // Format time as HH:MM (24h)
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const newMessage = { time, text };

  const messages = readMessages();
  messages.push(newMessage);
  writeMessages(messages);

  res.status(201).json(newMessage);
});

app.post('/track-online', (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  activeUsers.set(ip, Date.now());
  res.sendStatus(200);
});

app.get('/online-users', (req, res) => {
  const now = Date.now();
  const ACTIVE_WINDOW = 30000; // 30 seconds

  let count = 0;
  for (let [ip, lastSeen] of activeUsers.entries()) {
    if (now - lastSeen < ACTIVE_WINDOW) {
      count++;
    } else {
      activeUsers.delete(ip); // Remove inactive
    }
  }

  res.json({ online: count });
});

app.listen(PORT, () => {
  console.log(`✅ Server running at port ${PORT}`);
});
