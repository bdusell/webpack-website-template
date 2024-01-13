ARG DEV_IMAGE
FROM ${DEV_IMAGE}:latest
COPY package.json package-lock.json ./
RUN npm install
COPY assets ./assets
COPY webpack-config ./webpack-config
COPY webpack.cli.js .browserslistrc .eslintrc.yml ./
COPY src ./src
RUN npm run build -- --no-clean
