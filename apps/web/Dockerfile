FROM node:20-bullseye

WORKDIR /app

COPY package.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json

RUN npm install

COPY . .

RUN npm run build --workspace apps/web

EXPOSE 3000

CMD ["npm", "run", "start", "--workspace", "apps/web"]
