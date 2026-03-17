FROM node:25.7.0-alpine3.23

WORKDIR /app

COPY package.json .

RUN npm install

COPY . .

CMD ["npm", "start"]