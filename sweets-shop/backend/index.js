require('dotenv').config();


const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');


const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());


const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root_password',
    database: process.env.DB_NAME || 'sweets_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4'
});

db.on('connection', function (connection) {
    connection.query('SET NAMES utf8mb4');
});

// Проверка подключения к БД
db.getConnection((err, connection) => {
    if (err) {
        console.error('Ошибка подключения к БД:', err.message);
    } else {
        console.log('Успешное подключение к MySQL');
        connection.release();
    }
});

app.get('/api/products', (req, res) => {
    const sql = "SELECT * FROM products";
    db.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

app.get('/', (req, res) => {
    res.send('Сервер магазина сладостей запущен!');
});

app.listen(PORT, () => {
    console.log(`Сервер работает на порту ${PORT}`);
});

// Обработка оформления заказа
app.post('/api/orders', (req, res) => {
    const { user_name, user_phone, user_address, items, total_price, user_id } = req.body;
    
    const sql = `INSERT INTO orders 
                 (user_name, user_phone, user_address, items, total_price, user_id) 
                 VALUES (?, ?, ?, ?, ?, ?)`;
    
    const values = [
        user_name, 
        user_phone, 
        user_address, 
        JSON.stringify(items), 
        total_price, 
        user_id || null
    ];

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Ошибка при сохранении заказа" });
        }
        res.status(201).json({ success: true, orderId: result.insertId });
    });
});

// Получение всех заказов для админки
app.get('/api/orders', (req, res) => {
    const sql = "SELECT * FROM orders ORDER BY created_at DESC";
    db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// Удаление заказа
app.delete('/api/orders/:id', (req, res) => {
    const { id } = req.params;
    db.query("DELETE FROM orders WHERE id = ?", [id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Заказ удален' });
    });
});

// Обновление статуса заказа
app.patch('/api/orders/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    db.query("UPDATE orders SET status = ? WHERE id = ?", [status, id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Статус обновлен' });
    });
});

// Получение истории заказов конкретного клиента по телефону
app.get('/api/customers/:phone', (req, res) => {
    const { phone } = req.params;
    const sql = "SELECT * FROM orders WHERE user_phone = ? ORDER BY created_at DESC";
    
    db.query(sql, [phone], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Маршрут для авторизации админа
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    const sql = "SELECT * FROM admins WHERE username = ? AND password = ?";

    db.query(sql, [username, password], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        if (results.length > 0) {
            res.json({ success: true, message: 'Авторизация успешна' });
        } else {
            res.status(401).json({ success: false, message: 'Неверный логин или пароль' });
        }
    });
});

// Регистрация пользователя
// Маршрут регистрации
app.post('/api/auth/register', (req, res) => {
    const { full_name, email, phone, address, password, code } = req.body;
    // Проверка кода
    if (!verifyCodes[email] || verifyCodes[email].toString() !== code.toString()) {
        return res.status(400).json({ success: false, message: "Неверный или просроченный код" });
    }

    const checkSql = "SELECT * FROM users WHERE email = ?";
    db.query(checkSql, [email], (err, results) => {
        if (results.length > 0) {
            return res.status(400).json({ success: false, message: "Пользователь уже существует" });
        }

        const insertSql = "INSERT INTO users (full_name, email, phone, address, password) VALUES (?, ?, ?, ?, ?)";
        db.query(insertSql, [full_name, email, phone, address, password], (err, result) => {
            delete verifyCodes[email];
            res.status(201).json({ 
                success: true, 
                user: { id: result.insertId, full_name, email } 
            });
        });
    });
});

// Вход пользователя
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    const sql = "SELECT * FROM users WHERE email = ? AND password = ?";

    db.query(sql, [email, password], (err, results) => {
        if (err) return res.status(500).json({ error: "Ошибка сервера" });

        if (results.length > 0) {
            const user = results[0];
            delete user.password; 
            res.json({ success: true, user });
        } else {
            res.status(401).json({ success: false, message: "Неверная почта или пароль" });
        }
    });
});

// Получение истории заказов для конкретного пользователя
app.get('/api/user/orders/:userId', (req, res) => {
    const { userId } = req.params;
    const sql = "SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC";
    db.query(sql, [userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

const nodemailer = require('nodemailer');

const verifyCodes = {}; 

// Настройка почтового сервера
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'oriflame.bisn@gmail.com', 
        pass: 'zclt dogw ajim ryzn' 
    }
});

// Маршрут для отправки кода
app.post('/api/auth/send-code', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email обязателен" });

    const code = Math.floor(100000 + Math.random() * 900000);
    verifyCodes[email] = code;

    const mailOptions = {
        from: 'Candy Cloud <oriflame.bisn@gmail.com>',
        to: email,
        subject: 'Код подтверждения регистрации',
        text: `Ваш код для регистрации в Candy Cloud: ${code}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log(error);
            return res.status(500).json({ success: false, message: "Ошибка отправки письма" });
        }
        res.json({ success: true, message: "Код отправлен на почту" });
    });
});

// Добавление нового товара
app.post('/api/products', (req, res) => {
    const { name, price, description, image_url } = req.body;

    const sql = "INSERT INTO products (name, price, description, image_url) VALUES (?, ?, ?, ?)";
    
    db.query(sql, [name, price, description || '', image_url || ''], (err, result) => {
        if (err) {
            console.error("ОШИБКА SQL:", err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, productId: result.insertId });
    });
});

// Маршрут для удаления товара
app.delete('/api/products/:id', (req, res) => {
    const productId = req.params.id;
    const sql = "DELETE FROM products WHERE id = ?";

    db.query(sql, [productId], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: "Товар удален" });
    });
});

app.use('/uploads', express.static('uploads'));