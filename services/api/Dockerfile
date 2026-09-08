FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY services/api/package.json ./
COPY package.json ../

# Install dependencies
RUN npm install --workspace=services/api

# Copy source
COPY services/api/src ./src
COPY services/api/tsconfig.json ./

# Build
RUN npm run build

EXPOSE 3001

CMD ["node", "dist/index.js"]
