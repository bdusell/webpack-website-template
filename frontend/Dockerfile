FROM bdusell-frontend-dev
COPY package.json package-lock.json ./
RUN npm install
COPY assets ./assets
COPY webpack.*.js .eslintrc.yml ./
COPY src ./src
RUN npm run build
