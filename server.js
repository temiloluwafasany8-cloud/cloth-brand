const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const os = require('os');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Allow browser access from any origin
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Initialize data files
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

// Create uploads directory for images
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const productsFile = path.join(dataDir, 'products.json');
const ordersFile = path.join(dataDir, 'orders.json');
const usersFile = path.join(dataDir, 'users.json');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Initialize products
if (!fs.existsSync(productsFile)) {
    const products = [
        { 
            id: 1, 
            name: 'Signature Hoodie', 
            price: 55.00, 
            image: '/uploads/1777976484745-475682227.jpeg',
            colors: ['Black', 'White'],
            sizes: ['Small', 'Medium', 'Large'],
            stock: {
                'Black': { 'Small': 10, 'Medium': 10, 'Large': 10 },
                'White': { 'Small': 10, 'Medium': 10, 'Large': 10 }
            },
            totalStock: 60
        },
        { 
            id: 2, 
            name: 'Graphic Tee', 
            price: 25.00, 
            image: '/uploads/1777976484745-475682227.jpeg',
            colors: ['Black', 'White'],
            sizes: ['Small', 'Medium', 'Large'],
            stock: {
                'Black': { 'Small': 10, 'Medium': 10, 'Large': 10 },
                'White': { 'Small': 10, 'Medium': 10, 'Large': 10 }
            },
            totalStock: 60
        },
        { 
            id: 3, 
            name: 'Denim Jacket', 
            price: 85.00, 
            image: '/uploads/1777976484745-475682227.jpeg',
            colors: ['Blue', 'Black'],
            sizes: ['Small', 'Medium', 'Large'],
            stock: {
                'Blue': { 'Small': 5, 'Medium': 5, 'Large': 5 },
                'Black': { 'Small': 5, 'Medium': 5, 'Large': 5 }
            },
            totalStock: 30
        },
        { 
            id: 4, 
            name: 'Cargo Pants', 
            price: 45.00, 
            image: '/uploads/1777976484745-475682227.jpeg',
            colors: ['Khaki', 'Black'],
            sizes: ['Small', 'Medium', 'Large'],
            stock: {
                'Khaki': { 'Small': 8, 'Medium': 8, 'Large': 8 },
                'Black': { 'Small': 8, 'Medium': 8, 'Large': 8 }
            },
            totalStock: 48
        }
    ];
    fs.writeFileSync(productsFile, JSON.stringify(products, null, 2));
}

// Initialize orders
if (!fs.existsSync(ordersFile)) {
    fs.writeFileSync(ordersFile, JSON.stringify([], null, 2));
}

// Initialize users
if (!fs.existsSync(usersFile)) {
    fs.writeFileSync(usersFile, JSON.stringify([], null, 2));
}

// --- ROUTES ---

// User Authentication
// 1. Sign up route
app.post('/api/signup', (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }
        
        const users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
        
        // Check if email already exists
        if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
            return res.status(400).json({ success: false, message: 'Email already registered' });
        }
        
        const newUser = {
            id: users.length + 1,
            name: name,
            email: email,
            password: password, // In production, use bcrypt for hashing
            createdAt: new Date().toISOString()
        };
        
        users.push(newUser);
        fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
        
        res.json({ success: true, message: 'Account created successfully', name: name });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to create account' });
    }
});

// 2. Sign in route
app.post('/api/signin', (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }
        
        const users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
        
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }
        
        res.json({ success: true, message: 'Signed in successfully', name: user.name });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to sign in' });
    }
});

// 3. Get all clothes (for the customer to see)
app.get('/api/clothes', (req, res) => {
    try {
        const products = JSON.parse(fs.readFileSync(productsFile, 'utf8'));
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: 'Failed to load products' });
    }
});

// Currency exchange rates (simplified - in production, use a real API)
const exchangeRates = {
    USD: 1,
    EUR: 0.85,
    GBP: 0.73,
    JPY: 110,
    CAD: 1.25,
    AUD: 1.35,
    NGN: 750
};

app.get('/api/currencies', (req, res) => {
    res.json({
        currencies: Object.keys(exchangeRates),
        rates: exchangeRates
    });
});

// 4. Customer selects an item (Post to Backend)
app.post('/api/order', (req, res) => {
    try {
        const { customerName, customerEmail, phoneNumber, deliveryAddress, productId, color, size, quantity, currency } = req.body;
        const orders = JSON.parse(fs.readFileSync(ordersFile, 'utf8'));
        const products = JSON.parse(fs.readFileSync(productsFile, 'utf8'));
        
        const product = products.find(p => p.id === parseInt(productId));
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        // Check stock availability
        const requestedQuantity = parseInt(quantity) || 1;
        const availableStock = product.stock[color] && product.stock[color][size] ? product.stock[color][size] : 0;
        
        if (availableStock < requestedQuantity) {
            return res.status(400).json({ error: `Insufficient stock. Only ${availableStock} items available for ${color} ${size}.` });
        }
        
        // Update stock
        product.stock[color][size] -= requestedQuantity;
        product.totalStock -= requestedQuantity;
        fs.writeFileSync(productsFile, JSON.stringify(products, null, 2));
        
        const newOrder = {
            id: orders.length + 1,
            customer_name: customerName,
            customer_email: customerEmail || 'Not provided',
            phone_number: phoneNumber || 'Not provided',
            delivery_address: deliveryAddress || 'Not provided',
            product_id: product.id,
            color: color || 'Not specified',
            size: size || 'Not specified',
            quantity: requestedQuantity,
            currency: currency || 'USD',
            status: 'Pending',
            date: new Date().toISOString()
        };
        
        orders.push(newOrder);
        fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2));
        
        res.json({ message: "Order received!", orderId: newOrder.id });
    } catch (err) {
        res.status(500).json({ error: 'Failed to place order' });
    }
});

// 5. Admin View (What you see on the backend)
app.get('/admin/orders', (req, res) => {
    try {
        const orders = JSON.parse(fs.readFileSync(ordersFile, 'utf8'));
        const products = JSON.parse(fs.readFileSync(productsFile, 'utf8'));
        
        const result = orders.map(order => {
            const productId = parseInt(order.product_id, 10);
            const product = products.find(p => p.id === productId);
            return {
                id: order.id,
                customer_name: order.customer_name,
                customer_email: order.customer_email || 'N/A',
                phone_number: order.phone_number || 'N/A',
                delivery_address: order.delivery_address || 'N/A',
                item: product ? product.name : 'Unknown',
                color: order.color || 'N/A',
                size: order.size || 'N/A',
                quantity: order.quantity || 1,
                currency: order.currency || 'USD',
                status: order.status,
                date: order.date
            };
        });
        
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'Failed to load orders' });
    }
});

// Update order status
app.put('/admin/orders/:id/status', (req, res) => {
    try {
        const orderId = parseInt(req.params.id, 10);
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ error: 'Status is required' });
        }

        const orders = JSON.parse(fs.readFileSync(ordersFile, 'utf8'));
        const orderIndex = orders.findIndex(o => o.id === orderId);

        if (orderIndex === -1) {
            return res.status(404).json({ error: 'Order not found' });
        }

        orders[orderIndex].status = status;
        fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2));

        res.json({ message: 'Order status updated successfully', order: orders[orderIndex] });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update order status' });
    }
});

// Get orders for a specific user
app.get('/api/user/orders', (req, res) => {
    try {
        // For now, we'll get orders by email from query parameter
        // In a real app, this would use authentication tokens
        const email = req.query.email;
        
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const orders = JSON.parse(fs.readFileSync(ordersFile, 'utf8'));
        const products = JSON.parse(fs.readFileSync(productsFile, 'utf8'));
        
        const userOrders = orders
            .filter(order => order.customer_email === email)
            .map(order => {
                // Find the product name
                const product = products.find(p => p.id == order.product_id);
                return {
                    ...order,
                    item: product ? product.name : 'Unknown Product'
                };
            });
        
        // Sort by date (newest first)
        userOrders.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        res.json(userOrders);
    } catch (err) {
        res.status(500).json({ error: 'Failed to load user orders' });
    }
});

// 6. Product Management APIs
// Get all products for admin
app.get('/api/admin/products', (req, res) => {
    try {
        const products = JSON.parse(fs.readFileSync(productsFile, 'utf8'));
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: 'Failed to load products' });
    }
});

// Update product (full update)
app.put('/api/admin/products/:id', (req, res) => {
    console.log('PUT /api/admin/products/:id called with id:', req.params.id);
    try {
        const productId = parseInt(req.params.id);
        const { name, price, colors, sizes, stock, outOfStock } = req.body;

        const products = JSON.parse(fs.readFileSync(productsFile, 'utf8'));
        const productIndex = products.findIndex(p => p.id === productId);

        if (productIndex === -1) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Update product properties
        console.log('PUT request received for product', productId);
        console.log('Request body:', JSON.stringify(req.body, null, 2));
        
        if (req.body.hasOwnProperty('name')) products[productIndex].name = name;
        if (req.body.hasOwnProperty('price')) products[productIndex].price = price;
        if (req.body.hasOwnProperty('colors')) products[productIndex].colors = colors;
        if (req.body.hasOwnProperty('sizes')) products[productIndex].sizes = sizes;
        if (req.body.hasOwnProperty('outOfStock')) products[productIndex].outOfStock = outOfStock;
        if (req.body.hasOwnProperty('stock')) {
            products[productIndex].stock = stock;
            // Recalculate total stock
            let totalStock = 0;
            Object.values(stock).forEach(colorStock => {
                Object.values(colorStock).forEach(sizeStock => {
                    totalStock += sizeStock;
                });
            });
            products[productIndex].totalStock = totalStock;
        }

        fs.writeFileSync(productsFile, JSON.stringify(products, null, 2));

        res.json({ message: 'Product updated successfully', product: products[productIndex] });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update product' });
    }
});

// Upload product image
app.post('/api/admin/products/:id/image', upload.single('image'), (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }
        
        const products = JSON.parse(fs.readFileSync(productsFile, 'utf8'));
        const productIndex = products.findIndex(p => p.id === productId);
        
        if (productIndex === -1) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        // Update product image path
        products[productIndex].image = '/uploads/' + req.file.filename;
        fs.writeFileSync(productsFile, JSON.stringify(products, null, 2));
        
        res.json({ 
            message: 'Image uploaded successfully', 
            imageUrl: products[productIndex].image,
            product: products[productIndex]
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to upload image' });
    }
});

// Add new product
app.post('/api/admin/products', (req, res) => {
    try {
        const { name, price } = req.body;
        
        if (!name || !price) {
            return res.status(400).json({ error: 'Name and price are required' });
        }
        
        const products = JSON.parse(fs.readFileSync(productsFile, 'utf8'));
        const newId = Math.max(...products.map(p => p.id), 0) + 1;
        
        const newProduct = {
            id: newId,
            name: name,
            price: parseFloat(price),
            image: '/uploads/1777976484745-475682227.jpeg',
            colors: ['Black', 'White'],
            sizes: ['Small', 'Medium', 'Large'],
            stock: {
                'Black': {
                    'Small': 10,
                    'Medium': 10,
                    'Large': 10
                },
                'White': {
                    'Small': 10,
                    'Medium': 10,
                    'Large': 10
                }
            },
            totalStock: 60
        };
        
        products.push(newProduct);
        fs.writeFileSync(productsFile, JSON.stringify(products, null, 2));
        
        res.json({ message: 'Product added successfully', product: newProduct });
    } catch (err) {
        res.status(500).json({ error: 'Failed to add product' });
    }
});

// Delete product
app.delete('/api/admin/products/:id', (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        
        const products = JSON.parse(fs.readFileSync(productsFile, 'utf8'));
        const productIndex = products.findIndex(p => p.id === productId);
        
        if (productIndex === -1) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        // Check if product has orders
        const orders = JSON.parse(fs.readFileSync(ordersFile, 'utf8'));
        const hasOrders = orders.some(order => order.product_id === productId);
        
        if (hasOrders) {
            return res.status(400).json({ error: 'Cannot delete product with existing orders' });
        }
        
        products.splice(productIndex, 1);
        fs.writeFileSync(productsFile, JSON.stringify(products, null, 2));
        
        res.json({ message: 'Product deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete product' });
    }
});

// Serve static files
app.use(express.static('public'));

const HOST = process.env.HOST || '0.0.0.0';

// Start server
app.listen(PORT, HOST, () => {
    console.log(`✓ Server running at http://${HOST}:${PORT}`);
    console.log(`✓ Shop: http://${HOST}:${PORT}`);
    console.log(`✓ Admin Panel: http://${HOST}:${PORT}/admin.html`);
});