const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const os = require('os');
const { exec } = require('child_process');
const nodemailer = require('nodemailer');

const app = express();

// Configure email transporter
let transporter;
try {
    transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        }
    });
} catch (err) {
    console.log('Email service not configured. Password reset OTP will be logged to console only.');
}
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.disable('etag');

// Allow browser access from any origin
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    // Prevent caching for all API responses
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.header('Pragma', 'no-cache');
    res.header('Expires', '0');
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
const analyticsFile = path.join(dataDir, 'analytics.json');

// Ensure persistence files exist so the app can start cleanly
if (!fs.existsSync(ordersFile)) {
    fs.writeFileSync(ordersFile, '[]', 'utf8');
}
if (!fs.existsSync(usersFile)) {
    fs.writeFileSync(usersFile, '[]', 'utf8');
}
if (!fs.existsSync(analyticsFile)) {
    fs.writeFileSync(analyticsFile, '[]', 'utf8');
}

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
            fabric: 'Premium cotton blend with soft brushed fleece lining',
            fit: 'Relaxed fit for easy layering and everyday comfort',
            care: 'Machine wash cold, tumble dry low, do not bleach',
            totalStock: 60,
            paymentOptions: ['COD', 'Paystack', 'PayPal', 'Stripe', 'Flutterwave']
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
            fabric: '100% ring-spun cotton with breathable finish',
            fit: 'Classic fit with slightly tapered sleeves',
            care: 'Turn inside out, machine wash cold, hang dry for best results',
            totalStock: 60,
            paymentOptions: ['COD', 'Paystack', 'PayPal', 'Stripe', 'Flutterwave']
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
            fabric: 'Heavyweight denim with reinforced stitching and vintage wash',
            fit: 'Structured fit with room through the chest and shoulders',
            care: 'Wash inside out in cold water and air dry to preserve color',
            totalStock: 30,
            paymentOptions: ['COD', 'Paystack', 'PayPal', 'Stripe', 'Flutterwave']
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
            fabric: 'Durable twill with reinforced pocket details',
            fit: 'Modern tapered silhouette with relaxed mobility',
            care: 'Spot clean when needed and machine wash cold for long life',
            totalStock: 48,
            paymentOptions: ['COD', 'Paystack', 'PayPal', 'Stripe', 'Flutterwave']
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

// Initialize analytics tracking file
if (!fs.existsSync(analyticsFile)) {
    fs.writeFileSync(analyticsFile, JSON.stringify([], null, 2));
}

const supportedPayments = ['COD', 'PREPAY', 'Paystack', 'Flutterwave', 'Stripe', 'PayPal'];
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const allowedOrderStatuses = [
    'pending',
    'payment confirmed',
    'processing',
    'completed',
    'dispatched in 3 days',
    'on its way',
    'delivered'
];

function generateTrackingCode() {
    const random = Math.floor(Math.random() * 900) + 100;
    const timestamp = Date.now().toString().slice(-6);
    return `TRK-${timestamp}-${random}`;
}

function sendOrderNotifications(order, event = 'created') {
    const action = event === 'created' ? 'Order created' : 'Status updated';
    const message = `${action} for order ${order.id}: ${order.customer_name} (${order.customer_email || 'no email provided'}). Status: ${order.status}. Tracking: ${order.tracking_code}.`;
    console.log('📧 Sending order notification email:', message);
    console.log('📱 Sending order notification SMS to', order.phone_number || '[phone not provided]', 'with tracking code', order.tracking_code);
}

// --- ROUTES ---

// User Authentication
// 1. Sign up route
app.post('/api/signup', (req, res) => {
    try {
        let { name, email, password } = req.body;
        name = name ? String(name).trim() : '';
        email = email ? String(email).trim().toLowerCase() : '';
        password = password ? String(password) : '';

        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, message: 'Please enter a valid email address' });
        }

        if (password.length < 4) {
            return res.status(400).json({ success: false, message: 'Password must be at least 4 characters' });
        }

        const users = fs.existsSync(usersFile) ? JSON.parse(fs.readFileSync(usersFile, 'utf8')) : [];

        if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
            return res.status(400).json({ success: false, message: 'Email already registered' });
        }

        const newUser = {
            id: users.length + 1,
            name,
            email,
            password,
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));

        res.json({ success: true, message: 'Account created successfully', name: newUser.name, email: newUser.email, id: newUser.id });
    } catch (err) {
        console.error('Signup error:', err);
        res.status(500).json({ success: false, message: 'Failed to create account' });
    }
});

// 2. Sign in route
app.post('/api/signin', (req, res) => {
    try {
        let { email, password } = req.body;
        email = email ? String(email).trim().toLowerCase() : '';
        password = password ? String(password) : '';

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }

        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, message: 'Please enter a valid email address' });
        }

        const users = fs.existsSync(usersFile) ? JSON.parse(fs.readFileSync(usersFile, 'utf8')) : [];
        const user = users.find(u => u.email.toLowerCase() === email && u.password === password);

        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        res.json({ success: true, message: 'Signed in successfully', name: user.name, email: user.email, id: user.id });
    } catch (err) {
        console.error('Signin error:', err);
        res.status(500).json({ success: false, message: 'Failed to sign in' });
    }
});

// 3. Request password reset OTP
app.post('/api/request-password-reset', async (req, res) => {
    try {
        const email = req.body.email ? String(req.body.email).trim().toLowerCase() : '';

        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, message: 'Please enter a valid email address' });
        }

        const users = fs.existsSync(usersFile) ? JSON.parse(fs.readFileSync(usersFile, 'utf8')) : [];
        const userIndex = users.findIndex(u => u.email.toLowerCase() === email);

        if (userIndex === -1) {
            return res.status(404).json({ success: false, message: 'No account found with that email' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = Date.now() + 10 * 60 * 1000; // 10 minutes

        users[userIndex].resetOtp = otp;
        users[userIndex].resetOtpExpiry = expiry;
        fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));

        // Log OTP for debugging/development
        console.log(`Password reset OTP for ${email}: ${otp}`);

        // Try to send OTP via email
        if (transporter) {
            try {
                await transporter.sendMail({
                    from: process.env.EMAIL_USER || 'noreply@clothbrand.com',
                    to: email,
                    subject: 'Password Reset Code',
                    html: `
                        <p>Hello,</p>
                        <p>You requested to reset your password. Use this code to complete the process:</p>
                        <h2 style="color: #667eea; font-size: 32px; letter-spacing: 4px;">${otp}</h2>
                        <p>This code will expire in 10 minutes.</p>
                        <p>If you didn't request this, please ignore this email.</p>
                        <p>Best regards,<br>Clothing Brand Team</p>
                    `
                });
                console.log(`OTP sent successfully to ${email}`);
            } catch (emailErr) {
                console.error('Failed to send OTP email:', emailErr);
                // Still return success - OTP was saved, just couldn't send email
            }
        }

        res.json({ success: true, message: 'Check your email for the password reset code.' });
    } catch (err) {
        console.error('Request password reset error:', err);
        res.status(500).json({ success: false, message: 'Failed to request password reset' });
    }
});

// 4. Reset password with OTP
app.post('/api/reset-password', (req, res) => {
    try {
        const email = req.body.email ? String(req.body.email).trim().toLowerCase() : '';
        const otp = req.body.otp ? String(req.body.otp).trim() : '';
        const newPassword = req.body.newPassword ? String(req.body.newPassword) : '';

        if (!email || !otp || !newPassword) {
            return res.status(400).json({ success: false, message: 'Email, OTP, and new password are required' });
        }

        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, message: 'Please enter a valid email address' });
        }

        if (newPassword.length < 4) {
            return res.status(400).json({ success: false, message: 'New password must be at least 4 characters' });
        }

        const users = fs.existsSync(usersFile) ? JSON.parse(fs.readFileSync(usersFile, 'utf8')) : [];
        const userIndex = users.findIndex(u => u.email.toLowerCase() === email);

        if (userIndex === -1) {
            return res.status(404).json({ success: false, message: 'No account found with that email' });
        }

        const user = users[userIndex];
        if (!user.resetOtp || !user.resetOtpExpiry) {
            return res.status(400).json({ success: false, message: 'No OTP request found. Please request a new OTP.' });
        }

        if (Date.now() > user.resetOtpExpiry) {
            return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
        }

        if (user.resetOtp !== otp) {
            return res.status(400).json({ success: false, message: 'Invalid OTP code' });
        }

        users[userIndex].password = newPassword;
        delete users[userIndex].resetOtp;
        delete users[userIndex].resetOtpExpiry;
        fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));

        res.json({ success: true, message: 'Password reset successfully. You can now sign in.' });
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ success: false, message: 'Failed to reset password' });
    }
});

// 5. Get all clothes (for the customer to see)
app.get('/api/clothes', (req, res) => {
    // Prevent caching
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    try {
        let products = JSON.parse(fs.readFileSync(productsFile, 'utf8'));
        const search = (req.query.q || '').toString().trim().toLowerCase();
        const inStockOnly = req.query.inStock === 'true';

        if (search) {
            products = products.filter(product => {
                const name = (product.name || '').toLowerCase();
                const fabric = (product.fabric || '').toLowerCase();
                const fit = (product.fit || '').toLowerCase();
                const care = (product.care || '').toLowerCase();
                return name.includes(search) || fabric.includes(search) || fit.includes(search) || care.includes(search);
            });
        }

        if (inStockOnly) {
            products = products.filter(product => {
                if (product.outOfStock === true) {
                    return false;
                }
                if (product.totalStock > 0) {
                    return true;
                }
                if (!product.stock) {
                    return false;
                }
                return Object.values(product.stock).some(colorStock =>
                    Object.values(colorStock || {}).some(amount => parseInt(amount, 10) > 0)
                );
            });
        }

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
    // Prevent caching
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    res.json({
        currencies: Object.keys(exchangeRates),
        rates: exchangeRates
    });
});

app.post('/api/analytics', (req, res) => {
    try {
        const { eventType, label, payload } = req.body;
        if (!eventType) {
            return res.status(400).json({ error: 'eventType is required' });
        }
        const analytics = JSON.parse(fs.readFileSync(analyticsFile, 'utf8'));
        const entry = {
            id: analytics.length + 1,
            eventType,
            label: label || null,
            payload: payload || null,
            date: new Date().toISOString()
        };
        analytics.push(entry);
        fs.writeFileSync(analyticsFile, JSON.stringify(analytics, null, 2));
        console.log('📊 Analytics event:', eventType, label || '', payload || '');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save analytics event' });
    }
});

// 4. Customer selects an item (Post to Backend)
app.post('/api/order', (req, res) => {
    try {
        const { customerName, customerEmail, phoneNumber, deliveryAddress, productId, color, size, quantity, currency, paymentMethod } = req.body;

        // Input validation
        if (!customerName || !customerEmail || !phoneNumber || !deliveryAddress) {
            return res.status(400).json({ error: 'Missing customer information' });
        }

        if (!paymentMethod || !supportedPayments.includes(paymentMethod)) {
            return res.status(400).json({ error: `Payment method is required and must be one of: ${supportedPayments.join(', ')}` });
        }

        const orders = JSON.parse(fs.readFileSync(ordersFile, 'utf8'));
        const products = JSON.parse(fs.readFileSync(productsFile, 'utf8'));

        const product = products.find(p => p.id === parseInt(productId, 10));
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Check stock availability
        const requestedQuantity = parseInt(quantity, 10) || 1;
        if (requestedQuantity < 1) {
            return res.status(400).json({ error: 'Invalid quantity' });
        }

        const availableStock = product.stock && product.stock[color] ? product.stock[color][size] || 0 : 0;
        if (availableStock < requestedQuantity) {
            return res.status(400).json({ error: `Insufficient stock. Only ${availableStock} items available for ${color} ${size}.` });
        }

        const allowedPaymentOptions = Array.isArray(product.paymentOptions) && product.paymentOptions.length > 0
            ? product.paymentOptions
            : ['COD', 'PREPAY', 'Paystack', 'Flutterwave', 'Stripe', 'PayPal'];
        if (!allowedPaymentOptions.includes(paymentMethod)) {
            return res.status(400).json({ error: `This product does not support payment method ${paymentMethod}.` });
        }

        // Update stock
        product.stock[color][size] -= requestedQuantity;
        product.totalStock = Math.max(0, (product.totalStock || 0) - requestedQuantity);
        fs.writeFileSync(productsFile, JSON.stringify(products, null, 2));

        const paymentStatus = ['PREPAY', 'Paystack', 'Flutterwave', 'Stripe', 'PayPal'].includes(paymentMethod) ? 'Paid' : 'Due';
        const trackingCode = generateTrackingCode();
        const trackingUrl = `https://track.mybrand.com/${trackingCode}`;
        const newOrder = {
            id: orders.length + 1,
            customer_name: customerName,
            customer_email: customerEmail,
            phone_number: phoneNumber,
            delivery_address: deliveryAddress,
            product_id: product.id,
            color: color,
            size: size,
            quantity: requestedQuantity,
            currency: currency || 'USD',
            payment_method: paymentMethod,
            payment_status: paymentStatus,
            payment_screenshot: req.body.paymentScreenshot || null,
            status: 'pending',
            tracking_code: trackingCode,
            tracking_url: trackingUrl,
            notification_sent: true,
            date: new Date().toISOString()
        };

        orders.push(newOrder);
        fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2));

        sendOrderNotifications(newOrder);

        return res.json({ message: 'Order received!', orderId: newOrder.id, trackingCode, trackingUrl });
    } catch (err) {
        console.error('Order creation error:', err);
        res.status(500).json({ error: 'Failed to place order' });
    }
});

// 5. Admin View (What you see on the backend)
app.get('/admin/orders', (req, res) => {
    // Prevent caching
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
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
                payment_method: order.payment_method || 'N/A',
                payment_screenshot: order.payment_screenshot || null,
                payment_status: order.payment_status || (order.payment_method === 'PREPAY' ? 'Paid' : 'Due'),
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
        const status = (req.body.status || '').toString().trim();

        if (!status) {
            return res.status(400).json({ error: 'Status is required' });
        }

        if (!allowedOrderStatuses.includes(status)) {
            return res.status(400).json({ error: `Status must be one of: ${allowedOrderStatuses.join(', ')}` });
        }

        const orders = JSON.parse(fs.readFileSync(ordersFile, 'utf8'));
        const orderIndex = orders.findIndex(o => o.id === orderId);

        if (orderIndex === -1) {
            return res.status(404).json({ error: 'Order not found' });
        }

        orders[orderIndex].status = status;
        fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2));
        sendOrderNotifications(orders[orderIndex], 'status updated');

        res.json({ message: 'Order status updated successfully', order: orders[orderIndex] });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update order status' });
    }
});

// Clear all orders (admin only)
app.delete(['/api/admin/orders', '/admin/orders'], (req, res) => {
    try {
        // Clear the orders file by writing an empty array
        fs.writeFileSync(ordersFile, JSON.stringify([], null, 2));
        res.json({ message: 'All orders cleared successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to clear orders' });
    }
});

// Clear delivered/approved orders (admin only)
app.delete(['/api/admin/orders/delivered', '/admin/orders/delivered'], (req, res) => {
    try {
        const orders = JSON.parse(fs.readFileSync(ordersFile, 'utf8'));
        // Keep only orders that are not delivered/approved
        const remainingOrders = orders.filter(order => 
            order.status !== 'delivered' && order.status !== 'completed'
        );
        fs.writeFileSync(ordersFile, JSON.stringify(remainingOrders, null, 2));
        res.json({ 
            message: `Delivered orders cleared successfully. Removed ${orders.length - remainingOrders.length} orders.` 
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to clear delivered orders' });
    }
});

// Get all registered users for admin
app.get(['/admin/users', '/api/admin/users'], (req, res) => {
    // Prevent caching
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    try {
        if (!fs.existsSync(usersFile)) {
            console.log('Users file does not exist, creating empty file');
            fs.writeFileSync(usersFile, JSON.stringify([], null, 2));
            return res.json([]);
        }

        const rawUsers = fs.readFileSync(usersFile, 'utf8').trim();
        let users = [];
        
        if (rawUsers && rawUsers.length > 0) {
            try {
                users = JSON.parse(rawUsers);
                if (!Array.isArray(users)) {
                    users = [];
                }
            } catch (parseErr) {
                console.error('Error parsing users JSON:', parseErr);
                users = [];
            }
        }
        
        console.log('Returning users:', users.length, 'users');
        res.json(users);
    } catch (err) {
        console.error('Error reading users file:', err);
        res.status(500).json({ error: 'Failed to load users' });
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
    // Prevent caching
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
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
        const { name, price, colors, sizes, stock, outOfStock, paymentOptions, paymentMode } = req.body;

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

        if (req.body.hasOwnProperty('paymentOptions') || req.body.hasOwnProperty('paymentMode')) {
            products[productIndex].paymentOptions = Array.isArray(paymentOptions) ? paymentOptions :
                paymentMode === 'COD' ? ['COD'] :
                paymentMode === 'PREPAY' ? ['PREPAY'] : ['COD', 'PREPAY'];
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
        const { name, price, paymentMode, paymentOptions } = req.body;
        
        if (!name || !price) {
            return res.status(400).json({ error: 'Name and price are required' });
        }
        
        const paymentOptionValues = Array.isArray(paymentOptions) ? paymentOptions :
            paymentMode === 'COD' ? ['COD'] :
            paymentMode === 'PREPAY' ? ['PREPAY'] : ['COD', 'PREPAY'];

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
            totalStock: 60,
            paymentOptions: paymentOptionValues
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

// Serve static files with no caching
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir, {
    setHeaders: (res, path) => {
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
    }
}));

// Fallback to index.html for SPA routes
app.use((req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.includes('.')) {
        return next();
    }
    res.sendFile(path.join(publicDir, 'index.html'));
});

const HOST = process.env.HOST || '0.0.0.0';
const PUBLIC_HOST = process.env.PUBLIC_HOST || 'localhost';

// Function to open browser
function openBrowser(url) {
    console.log('🌐 Opening application in a web browser...');

    if (os.platform() === 'win32') {
        // Try Microsoft Edge first, then fallback to the default browser
        const edgeCommand = `start "" msedge "${url}"`;
        exec(edgeCommand, (error) => {
            if (!error) {
                console.log(`✅ Opened ${url} in Microsoft Edge`);
                return;
            }
            const fallbackCommand = `start "" "${url}"`;
            exec(fallbackCommand, (fallbackError) => {
                if (fallbackError) {
                    console.log(`Could not open browser automatically. Please visit: ${url}`);
                } else {
                    console.log(`✅ Opened ${url} in the default browser`);
                }
            });
        });
    } else if (os.platform() === 'darwin') {
        exec(`open "${url}"`, (error) => {
            if (error) {
                console.log(`Could not open browser automatically. Please visit: ${url}`);
            } else {
                console.log(`✅ Opened ${url} in the default browser`);
            }
        });
    } else {
        exec(`xdg-open "${url}"`, (error) => {
            if (error) {
                console.log(`Could not open browser automatically. Please visit: ${url}`);
            } else {
                console.log(`✅ Opened ${url} in the default browser`);
            }
        });
    }
}

// AI Chatbot endpoint
app.post('/api/chatbot', (req, res) => {
    try {
        const { message } = req.body;
        const userMessage = (message || '').toString().toLowerCase().trim();
        
        let response = '';
        
        // Basic AI responses based on keywords
        if (userMessage.includes('hello') || userMessage.includes('hi') || userMessage.includes('hey')) {
            response = '👋 Hello! Welcome to our clothing brand. How can I help you today?';
        } else if (userMessage.includes('product') || userMessage.includes('clothes') || userMessage.includes('shirt') || userMessage.includes('hoodie') || userMessage.includes('jacket')) {
            response = '👕 We offer premium quality clothing including hoodies, graphic tees, denim jackets, and cargo pants. All made with high-quality fabrics and available in multiple sizes and colors. Check out our collection on the main page!';
        } else if (userMessage.includes('price') || userMessage.includes('cost') || userMessage.includes('how much')) {
            response = '💰 Our prices range from $25 for graphic tees to $85 for denim jackets. We offer flexible payment options including COD, Paystack, PayPal, Stripe, and Flutterwave.';
        } else if (userMessage.includes('size') || userMessage.includes('sizes')) {
            response = '📏 We offer Small, Medium, and Large sizes for most items. Please check individual product pages for exact size availability.';
        } else if (userMessage.includes('order') || userMessage.includes('track') || userMessage.includes('status')) {
            response = '📦 To check your order status, please provide your order ID. Our order statuses include: pending, payment confirmed, processing, dispatched in 3 days, on its way, and delivered.';
        } else if (userMessage.includes('payment') || userMessage.includes('pay')) {
            response = '💳 We accept multiple payment methods: Cash on Delivery (COD), Paystack, PayPal, Stripe, and Flutterwave. All payments are secure and processed instantly.';
        } else if (userMessage.includes('delivery') || userMessage.includes('shipping') || userMessage.includes('ship')) {
            response = '🚚 We offer fast and reliable delivery. Orders are typically dispatched within 3 working days after payment confirmation. You\'ll receive tracking updates via SMS and email.';
        } else if (userMessage.includes('return') || userMessage.includes('refund') || userMessage.includes('exchange')) {
            response = '🔄 We want you to love your purchase! Please contact our support team for returns, refunds, or exchanges. We\'ll work with you to make it right.';
        } else if (userMessage.includes('contact') || userMessage.includes('support') || userMessage.includes('help')) {
            response = '📞 You can reach our support team through the contact information on our website. We\'re here to help with any questions or concerns!';
        } else if (userMessage.includes('thank') || userMessage.includes('thanks')) {
            response = '🙏 You\'re welcome! Happy shopping with our clothing brand. Feel free to ask if you need anything else!';
        } else if (userMessage.includes('bye') || userMessage.includes('goodbye')) {
            response = '👋 Goodbye! Thanks for chatting with us. Have a great day!';
        } else if (userMessage.includes('creator') || userMessage.includes('who made') || userMessage.includes('who created') || userMessage.includes('developer') || userMessage.includes('built by') || userMessage.includes('made by')) {
            response = '👨‍💻 This website was created by **Fasanya Temiloluwa Iyanu**, a Cyber Security Analyst and Web Developer.\n\n📧 **Email:** temiloluwafasany8@gmail.com\n📱 **Phone:** 09128361081\n\nHe specializes in building secure, modern web applications and ensuring cybersecurity best practices!';
        } else {
            // Default response with helpful suggestions
            response = '🤔 I\'m here to help! You can ask me about:\n• Our products and pricing\n• Order tracking and status\n• Payment methods\n• Shipping and delivery\n• Size information\n• Returns and exchanges\n• Who created this website\n\nWhat would you like to know?';
        }
        
        res.json({ response: response });
    } catch (err) {
        console.error('Chatbot error:', err);
        res.status(500).json({ response: 'Sorry, I\'m experiencing some technical difficulties. Please try again later.' });
    }
});

// Start server only when running locally
if (require.main === module) {
    app.listen(PORT, HOST, () => {
        console.log(`✓ Server running at http://${PUBLIC_HOST}:${PORT}`);
        console.log(`✓ Shop: http://${PUBLIC_HOST}:${PORT}`);
        console.log(`✓ Admin Panel: http://${PUBLIC_HOST}:${PORT}/admin.html`);
        console.log(`\n🚀 Starting your Clothing Brand application...`);

        const isAutoOpenAllowed =
            process.env.OPEN_BROWSER !== 'false' &&
            !process.env.CI &&
            !process.env.RAILWAY_ENVIRONMENT &&
            !process.env.HEROKU;

        if (isAutoOpenAllowed) {
            // Open browser after a short delay to ensure server is ready
            setTimeout(() => {
                openBrowser(`http://${PUBLIC_HOST}:${PORT}`);
                // Also open admin panel after another delay
                setTimeout(() => {
                    openBrowser(`http://${PUBLIC_HOST}:${PORT}/admin.html`);
                }, 1500);
            }, 1000);
        }
    });
} else {
    module.exports = app;
}