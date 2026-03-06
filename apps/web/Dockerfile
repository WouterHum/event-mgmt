FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy app
COPY . .

EXPOSE 3000

# Run development server
CMD ["npm", "run", "dev"]