// --- ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ---
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let allProducts = []; // Храним загруженные товары, чтобы не дергать сервер каждый раз

// --- 1. ЗАГРУЗКА И ОТРИСОВКА ТОВАРОВ ---
async function fetchProducts() {
    try {
        const response = await fetch('http://localhost:5000/api/products');
        allProducts = await response.json(); // Сохраняем в глобальную переменную
        renderProducts(allProducts);
    } catch (error) {
        console.error('Ошибка загрузки товаров:', error);
        const grid = document.getElementById('product-grid');
        if (grid) grid.innerHTML = `<p style="color: red;">Не удалось загрузить товары. Проверьте сервер.</p>`;
    }
}

function renderProducts(products) {
    const grid = document.getElementById('product-grid');
    if (!grid) return; // Защита: если мы не на главной странице, выходим

    if (products.length === 0) {
        grid.innerHTML = `<p>В магазине пока нет товаров.</p>`;
        return;
    }

    grid.innerHTML = products.map(product => {
        // Картинка или заглушка
        const imageHtml = product.image_url 
            ? `<img src="${product.image_url}" alt="${product.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px 8px 0 0;">`
            : `<div style="display:flex; height:100%; align-items:center; justify-content:center;"><i class="fas fa-cookie-bite fa-4x" style="color: #dcdde1;"></i></div>`;

        // Проверяем, есть ли товар в корзине
        const cartItem = cart.find(item => item.id === product.id);

        let controlsHtml = '';
        if (cartItem) {
            controlsHtml = `
                <div class="quantity-controls" style="display: flex; align-items: center; justify-content: space-between; background: #f8f9fa; border-radius: 6px; padding: 4px;">
                    <button onclick="changeQty(${product.id}, -1)" style="width: 30px; height: 30px; background: #e74c3c; border: none; color: white; border-radius: 4px; cursor: pointer; font-weight: bold;">-</button>
                    <span style="font-weight: bold; font-size: 1.1rem; min-width: 20px; text-align: center;">${cartItem.quantity}</span>
                    <button onclick="changeQty(${product.id}, 1)" style="width: 30px; height: 30px; background: #27ae60; border: none; color: white; border-radius: 4px; cursor: pointer; font-weight: bold;">+</button>
                </div>
            `;
        } else {
            controlsHtml = `
                <button onclick="addToCart(${product.id}, '${product.name}', ${product.price})" style="width: 100%; padding: 10px; background: #e67e22; border: none; color: white; border-radius: 6px; cursor: pointer; font-weight: bold; transition: 0.2s;">
                    <i class="fas fa-shopping-basket"></i> В корзину
                </button>
            `;
        }

        return `
            <div class="product-card" style="border: 1px solid #eee; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); display: flex; flex-direction: column;">
                <div class="product-img" style="height: 180px; background: #f4f7f6; border-radius: 8px 8px 0 0;">${imageHtml}</div>
                <div class="product-info" style="padding: 15px; display: flex; flex-direction: column; flex-grow: 1;">
                    <h3 style="margin: 0 0 10px 0; font-size: 1.1rem; color: #2c3e50;">${product.name}</h3>
                    <p class="product-price" style="font-weight: bold; margin: 0 0 15px 0; font-size: 1.2rem; color: #27ae60;">${product.price} ₽</p>
                    <div class="product-controls" style="margin-top: auto;">
                        ${controlsHtml}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// --- 2. УПРАВЛЕНИЕ КОРЗИНОЙ ---

function updateCartCounter() {
    const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const counterElement = document.getElementById('cart-count');
    if (counterElement) {
        counterElement.innerText = totalCount;
    }
    localStorage.setItem('cart', JSON.stringify(cart));
}

// ИСПРАВЛЕНО: принимает ровно 3 параметра напрямую из кнопки
window.addToCart = (id, name, price) => {
    const existingProduct = cart.find(item => item.id === id);

    if (existingProduct) {
        existingProduct.quantity += 1;
    } else {
        cart.push({ id, name, price, quantity: 1 });
    }

    updateCartCounter();
    renderProducts(allProducts); // Мгновенно обновляем кнопку на +/-
};

// ИСПРАВЛЕНО: универсальная функция обновления количества
window.changeQty = (id, delta) => {
    const index = cart.findIndex(item => item.id === id);
    if (index !== -1) {
        cart[index].quantity += delta;
        if (cart[index].quantity <= 0) {
            cart.splice(index, 1); // Удаляем, если 0
        }
    }
    
    updateCartCounter(); 

    // Обновляем витрину, если мы на главной
    if (document.getElementById('product-grid')) renderProducts(allProducts);
    
    // Обновляем модалку, если она открыта
    const modal = document.getElementById('cart-modal');
    if (modal && modal.style.display === 'block') renderCart(); 

    // Обновляем список оформления заказа, если мы на странице checkout
    if (document.getElementById('checkout-items-list')) renderCheckout();
};

// --- 3. МОДАЛЬНОЕ ОКНО И ОФОРМЛЕНИЕ ЗАКАЗА ---

window.toggleModal = () => {
    const modal = document.getElementById('cart-modal');
    if (!modal) return;

    if (modal.style.display === 'block') {
        modal.style.display = 'none';
    } else {
        modal.style.display = 'block';
        renderCart();
    }
};

function renderCart() {
    const cartItems = document.getElementById('cart-items');
    const totalPriceElement = document.getElementById('total-price');
    if (!cartItems) return;

    if (cart.length === 0) {
        cartItems.innerHTML = '<p>Корзина пуста :(</p>';
        totalPriceElement.innerText = '0';
        return;
    }

    cartItems.innerHTML = cart.map(item => `
        <div class="cart-item" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #eee;">
            <span style="font-weight: bold; width: 40%;">${item.name}</span>
            <div class="quantity-controls" style="display: flex; align-items: center; gap: 8px;">
                <button onclick="changeQty(${item.id}, -1)" style="width: 25px; height: 25px; background: #e74c3c; border: none; color: white; border-radius: 4px; cursor: pointer;">-</button>
                <span style="min-width: 15px; text-align: center;">${item.quantity}</span>
                <button onclick="changeQty(${item.id}, 1)" style="width: 25px; height: 25px; background: #27ae60; border: none; color: white; border-radius: 4px; cursor: pointer;">+</button>
            </div>
            <span style="width: 25%; text-align: right; font-weight: bold;">${item.price * item.quantity} ₽</span>
        </div>
    `).join('');

    totalPriceElement.innerText = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

function checkout() {
    if (cart.length === 0) {
        alert("Корзина пуста!");
        return;
    }
    window.location.href = 'checkout.html';
}

function renderCheckout() {
    const list = document.getElementById('checkout-items-list');
    const total = document.getElementById('checkout-total');
    if (!list) return;

    if (cart.length === 0) {
        list.innerHTML = `<div style="text-align:center; padding: 20px;"><p>Ваша корзина пуста :(</p><a href="index.html" style="color: #e67e22; font-weight: bold;">Вернуться к покупкам</a></div>`;
        if (total) total.innerText = '0';
        return;
    }

    list.innerHTML = cart.map(item => `
        <div class="cart-item" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px dashed #ccc; padding-bottom: 10px;">
            <div class="item-info">
                <strong>${item.name}</strong>
                <div style="font-size: 0.8rem; color: #888;">${item.price} ₽ / шт.</div>
            </div>
            <div class="quantity-controls">
                <button onclick="changeQty(${item.id}, -1)" style="padding: 2px 8px; cursor: pointer;">-</button>
                <span style="margin: 0 10px;">${item.quantity}</span>
                <button onclick="changeQty(${item.id}, 1)" style="padding: 2px 8px; cursor: pointer;">+</button>
            </div>
            <div style="font-weight: bold;">${item.price * item.quantity} ₽</div>
        </div>
    `).join('');

    if (total) total.innerText = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

// Отправка заказа (на странице checkout.html)
window.confirmOrder = async () => {
    if (cart.length === 0) return;

    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const orderData = {
        user_name: document.getElementById('user-name').value,
        user_phone: document.getElementById('user-phone').value,
        user_address: document.getElementById('user-address').value,
        items: cart,
        total_price: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        user_id: currentUser ? currentUser.id : null 
    };

    try {
        const response = await fetch('http://localhost:5000/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });

        if (response.ok) {
            alert("✨ Заказ успешно оформлен!");
            cart = [];
            localStorage.removeItem('cart');
            window.location.href = 'index.html';
        }
    } catch (error) {
        console.error(error);
        alert("Ошибка при отправке заказа");
    }
};

// --- 4. НАВИГАЦИЯ И ИНИЦИАЛИЗАЦИЯ ---

function updateNav() {
    const navLinks = document.querySelector('.nav-links');
    const loginLink = document.getElementById('nav-login-link');
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));

    const existingAdminLink = document.getElementById('nav-admin-link');
    if (existingAdminLink) existingAdminLink.remove();

    if (currentUser) {
        if (loginLink) loginLink.innerText = currentUser.full_name.split(' ')[0];

        if (currentUser.role === 'admin' || currentUser.email === 'sergejnikitin8112@gmail.com') {
            const adminLi = document.createElement('li');
            adminLi.id = 'nav-admin-link';
            adminLi.innerHTML = `<a href="admin.html" style="color: #e67e22; font-weight: bold; border: 1px solid #e67e22; padding: 5px 10px; border-radius: 5px;"><i class="fas fa-user-shield"></i> Админ-панель</a>`;
            navLinks.appendChild(adminLi);
        }
    } else {
        if (loginLink) loginLink.innerText = 'Войти';
    }
}

// Закрытие модального окна кликом вне его
window.onclick = function(event) {
    const modal = document.getElementById('cart-modal');
    if (event.target == modal) modal.style.display = "none";
}

// Инициализация при старте страницы
document.addEventListener('DOMContentLoaded', () => {
    updateCartCounter();
    updateNav();
    if (document.getElementById('product-grid')) fetchProducts();
    if (document.getElementById('checkout-items-list')) renderCheckout();
});