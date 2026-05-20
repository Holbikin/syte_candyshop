SET NAMES 'utf8mb4';
SET CHARACTER SET utf8mb4;

CREATE DATABASE IF NOT EXISTS sweets_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sweets_db;

CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    category VARCHAR(100),
    description TEXT,
    image_url VARCHAR(255)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO products (name, price, category, description) VALUES
('Клубничное облако', 450.00, 'Зефир', 'Нежнейший зефир из натуральных ягод'),
('Шоколадный трюфель', 800.00, 'Конфеты', 'Французский шоколад и сливки');


CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_name VARCHAR(255) NOT NULL,
    user_phone VARCHAR(50) NOT NULL,
    user_address TEXT NOT NULL,
    items JSON NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE orders ADD COLUMN status VARCHAR(50) DEFAULT 'Новый';

CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL
);

-- админ
INSERT INTO admins (username, password) VALUES ('admin', '1234');

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(50) NOT NULL,
    address TEXT,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE orders ADD COLUMN user_id INT NULL;
ALTER TABLE orders ADD FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user';

UPDATE users SET role = 'admin' WHERE email = 'sergejnikitin8112@gmail.com';

ALTER TABLE products ADD COLUMN image_url TEXT;