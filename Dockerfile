FROM node:11-alpine

WORKDIR /usr/src/app

# copy strict necessary to install dependencies
COPY package.json /usr/src/app
COPY yarn.lock /usr/src/app
COPY tsconfig.json /usr/src/app
COPY .yarnclean /usr/src/app

# install all dependencies
RUN yarn install

# copy source
COPY src/ /usr/src/app/src

# remove tests
RUN find . -type f -name "*.spec.ts" -delete

# build to javascript to avoid startup cost
RUN yarn build

# remove source and all dependencies
RUN rm -r src/ node_modules/

# install only production dependencies
RUN yarn install --production

STOPSIGNAL SIGINT

ENTRYPOINT [ "node", "build/entrypoint.js" ]
