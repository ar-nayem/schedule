// Plain Node/Express server for VPS deployment (Vercel not used here).
// Serves index.html and exposes POST /api/parse using the same handler
// signature Vercel would call (req, res) - api/parse.js needs no changes.

const express = require('express');
const path = require('path');
const parseHandler = require('./api/parse');

const app = express();

app.use(express.json({ limit: '15mb' }));
app.post('/api/parse', parseHandler);
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`schedule.arnayem.top listening on ${PORT}`));
