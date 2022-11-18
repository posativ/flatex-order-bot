FROM node:16-alpine

RUN apk add --update python3 make g++ && rm -rf /var/cache/apk/*


# Create app directory
WORKDIR /usr/src/app

# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm ci

COPY ./tsconfig*.json ./
COPY ./src ./src
COPY ./.eslint* ./

RUN npm run build

ENV NODE_ENV=production

ENTRYPOINT ["node", "dist/app.js"]
