# Base Image
FROM node:20-alpine

# Working Directory
WORKDIR /app

# Install Dependencies
COPY package*.json ./
RUN npm install

# Copy Source Code
COPY . .

# Expose Vite Port
EXPOSE 5173

# Start Command (Dev Mode with Host Access)
CMD ["npm", "run", "dev", "--", "--host"]
