# Base Image
FROM node:20-alpine

# Working Directory
WORKDIR /app

# Install Dependencies
COPY package*.json ./
RUN npm install

# Installation of nodemon for hot-reloading (optional but good for dev)
RUN npm install -g nodemon

# Copy Source Code
COPY . .

# Expose API Port
EXPOSE 3001

# Start Command
# Using 'npm start' to avoid Windows-specific syntax in 'npm run dev'
# We will rely on docker-compose environment variables to set NODE_ENV
CMD ["npm", "start"]
