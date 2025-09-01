const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(bodyParser.json());

// SQLite DB setup
const db = new sqlite3.Database('./docushop.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    price REAL,
    description TEXT,
    image TEXT,
    category TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS shipping (
    id INTEGER PRIMARY KEY,
    discreet REAL DEFAULT 30.00,
    express REAL DEFAULT 50.00
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    billing TEXT,
    cart TEXT,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);
});

// Product endpoints
app.get('/products', (req, res) => {
  const { category } = req.query;
  let sql = 'SELECT * FROM products';
  let params = [];
  if (category) {
    sql += ' WHERE category = ?';
    params.push(category);
  }
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({error: err.message});
    res.json(rows);
  });
});

app.post('/products', (req, res) => {
  const { name, price, description, image, category } = req.body;
  db.run('INSERT INTO products (name, price, description, image, category) VALUES (?, ?, ?, ?, ?)', [name, price, description, image, category], function(err) {
    if (err) return res.status(500).json({error: err.message});
    res.json({id: this.lastID});
  });
});

app.put('/products/:id', (req, res) => {
  const { name, price, description, image, category } = req.body;
  db.run('UPDATE products SET name = ?, price = ?, description = ?, image = ?, category = ? WHERE id = ?', [name, price, description, image, category, req.params.id], function(err) {
    if (err) return res.status(500).json({error: err.message});
    res.json({success: true});
  });
});

app.delete('/products/:id', (req, res) => {
  db.run('DELETE FROM products WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({error: err.message});
    res.json({success: true});
  });
});

// Shipping endpoints
app.get('/shipping', (req, res) => {
  db.get('SELECT discreet, express FROM shipping WHERE id = 1', (err, row) => {
    if (err) return res.status(500).json({error: err.message});
    if (!row) return res.json({discreet: 30.00, express: 50.00});
    res.json(row);
  });
});

app.post('/shipping', (req, res) => {
  const { discreet, express } = req.body;
  db.run('INSERT OR REPLACE INTO shipping (id, discreet, express) VALUES (1, ?, ?)', [discreet, express], function(err) {
    if (err) return res.status(500).json({error: err.message});
    res.json({success: true});
  });
});

// Order endpoints
app.post('/order', (req, res) => {
  const { billing, cart } = req.body;
  db.run('INSERT INTO orders (billing, cart) VALUES (?, ?)', [JSON.stringify(billing), JSON.stringify(cart)], function(err) {
    if (err) return res.status(500).json({error: err.message});
    res.json({orderId: this.lastID});
  });
});

app.get('/order/:id', (req, res) => {
  db.get('SELECT * FROM orders WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({error: err.message});
    if (!row) return res.status(404).json({error: 'Order not found'});
    res.json(row);
  });
});

app.delete('/order/:id', (req, res) => {
  db.run('UPDATE orders SET status = "cancelled" WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({error: err.message});
    res.json({success: true});
  });
});

app.listen(PORT, () => {
  console.log(`DocuShop backend running on port ${PORT}`);
});
