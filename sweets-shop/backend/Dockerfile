FROM node:18-slim

WORKDIR /app

# Копируем файлы зависимостей
COPY package*.json ./

# Установка зависимости
RUN npm install

COPY . .

# Открываем порт
EXPOSE 5000

# Запускаем сервер через node
CMD ["node", "index.js"]