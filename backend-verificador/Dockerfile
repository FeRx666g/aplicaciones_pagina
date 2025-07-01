FROM node:20

# Crear carpeta de trabajo
WORKDIR /app

# Copiar archivos
COPY package*.json ./
RUN npm install
COPY . .

# Exponer puerto
EXPOSE 8080

# Comando para iniciar el servidor
CMD ["node", "index.js"]
