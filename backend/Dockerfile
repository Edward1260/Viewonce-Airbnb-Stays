# Use Node.js LTS (Long Term Support) version
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install app dependencies
RUN npm install

# Bundle app source
COPY . .

# Build the application
RUN npm run build

# Expose the application port
EXPOSE 3001

# Start the server using the production build
CMD ["npm", "run", "start:prod"]