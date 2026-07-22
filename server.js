require('dotenv').config();
const express = require('express');
const path = require('path');
const QRCode = require('qrcode');
require('./database');

const app = express();
const PORT = process.env.PORT || 3847;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/customer', require('./routes/customer'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/admin', require('./routes/admin'));

app.get('/api/qr', async (req, res) => {
  try {
    const upiId = process.env.UPI_ID || 'yadav022@fam';
    const upiName = process.env.UPI_NAME || 'GemsSMM Panel';
    const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(upiName)}&cu=INR`;
    const qr = await QRCode.toDataURL(upiUrl, { width: 280, margin: 2, color: { dark: '#000000', light: '#ffffff' } });
    res.json({ qr, upi_id: upiId, upi_name: upiName });
  } catch (e) {
    res.status(500).json({ error: 'QR generation failed' });
  }
});

app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
  const file = req.path.endsWith('.html') ? req.path : req.path + '.html';
  const filePath = path.join(__dirname, 'public', file === '/.html' ? 'index.html' : file);
  if (req.path === '/' || req.path === '/index.html') {
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
  res.sendFile(filePath, (err) => {
    if (err) res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
});

app.listen(PORT, () => {
  console.log(`\n  Gems SMM Panel running at http://localhost:${PORT}\n`);
  console.log('  Admin: admin / admin123');
  console.log('  Reseller: reseller / reseller123\n');
});
