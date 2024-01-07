FROM ${DEV_IMAGE_NAME}:latest
COPY package.json package-lock.json ./
RUN npm install
COPY assets ./assets
COPY webpack.*.js .browserslistrc .eslintrc.yml ./
COPY src ./src
RUN npm run build -- --no-clean
