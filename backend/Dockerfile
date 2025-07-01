# Imagen base
FROM node:18-alpine

# Crear directorio de trabajo
WORKDIR /app

# Copiar archivos
COPY package*.json ./
RUN npm install

COPY . .

# Puerto que usa Cloud Run
ENV PORT=8080
EXPOSE 8080

# Comando de inicio
CMD ["npm", "start"]
