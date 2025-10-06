FROM node:20-alpine
ENV CI=true
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm i -g pnpm && pnpm install
COPY . .
EXPOSE 3000
CMD ["pnpm","dev","--port","3000","--hostname","0.0.0.0"]

