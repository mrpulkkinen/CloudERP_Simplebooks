FROM node:20-bullseye

WORKDIR /app

COPY package.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json

RUN npm install

COPY . .

RUN npm run build --workspace apps/api

EXPOSE 5010

CMD ["sh", "-c", "npm run prisma:migrate --workspace apps/api && npm run prisma:generate --workspace apps/api && npm run prisma:seed --workspace apps/api && npm run start --workspace apps/api"]
