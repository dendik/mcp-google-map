FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

ARG GOOGLE_MAPS_API_KEY
ENV GOOGLE_MAPS_API_KEY=${GOOGLE_MAPS_API_KEY}

CMD ["node", "dist/index.cjs"] 
