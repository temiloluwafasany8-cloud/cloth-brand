const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const PORT = 3000;
const HOST = process.env.HOST || '0.0.0.0';

app.use(bodyParser.json());
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Initialize Database
const db = new sqlite3.Database(':memory:'); // Using memory for now; change to 'brand.db' for permanent storage

db.serialize(() => {
    // Table for your products
    db.run("CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT, price REAL)");
    // Table for customer selections/orders
    db.run("CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_name TEXT, product_id INTEGER, status TEXT)");

    // Add some initial items to your brand
    db.run("INSERT INTO products (name, price) VALUES ('Signature Hoodie', 55.00)");
    db.run("INSERT INTO products (name, price) VALUES ('Graphic Tee', 25.00)");
});

// --- ROUTES ---

// 1. Get all clothes (for the customer to see)
app.get('/api/clothes', (req, res) => {
    db.all("SELECT * FROM products", [], (err, rows) => {
        res.json(rows);
    });
});

// 2. Customer selects an item (Post to Backend)
app.post('/api/order', (req, res) => {
    const { customerName, productId } = req.body;
    db.run("INSERT INTO orders (customer_name, product_id, status) VALUES (?, ?, 'Pending')", 
    [customerName, productId], function(err) {
        res.send({ message: "Order received!", orderId: this.lastID });
    });
});

// 3. Admin View (What you see on the backend)
app.get('/admin/orders', (req, res) => {
    db.all("SELECT orders.id, orders.customer_name, products.name as item FROM orders JOIN products ON orders.product_id = products.id", 
    [], (err, rows) => {
        res.json(rows);
    });
});

app.use(express.static('public'));

app.listen(PORT, HOST, () => {
    console.log(`Server running at http://${HOST}:${PORT}`);
});