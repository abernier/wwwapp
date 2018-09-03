# Inherit from Node alpine 3.6 - see: https://github.com/nodejs/docker-node/blob/994f8286cb0efc92578902d5fd11182f63a59869/8/alpine/Dockerfile
FROM node:8.10.0-alpine

RUN apk add --no-cache \
  curl \
	wget \
	ca-certificates \
	make

ARG wwwapp_env
ARG wwwapp_www_host__port
ARG wwwapp_www_nodedebug__port

ENV USERNAME node
ENV HOME /home/$USERNAME
ENV APP_PATH $HOME/app
ENV APP_PORT $wwwapp_www_host__port
ENV DEBUGGER_PORT $wwwapp_www_nodedebug__port

#
# Dockerize (see: https://github.com/jwilder/dockerize#for-alpine-images)
#

ENV DOCKERIZE_VERSION 0.5.0
RUN wget --quiet https://github.com/jwilder/dockerize/releases/download/v$DOCKERIZE_VERSION/dockerize-alpine-linux-amd64-v$DOCKERIZE_VERSION.tar.gz \
	&& tar -C /usr/local/bin -xzvf dockerize-alpine-linux-amd64-v$DOCKERIZE_VERSION.tar.gz \
	&& rm dockerize-alpine-linux-amd64-v$DOCKERIZE_VERSION.tar.gz

#
# Heroku CLI (see: https://devcenter.heroku.com/articles/heroku-cli#standalone)
#

# RUN wget --quiet https://cli-assets.heroku.com/heroku-cli/channels/stable/heroku-cli-linux-x64.tar.gz -O /tmp/heroku.tar.gz \
# 	&& mkdir /tmp/heroku-cli && tar -xzf /tmp/heroku.tar.gz -C /tmp/heroku-cli \
# 	&& mkdir -p /usr/local/lib /usr/local/bin \
# 	&& mv /tmp/heroku-cli /usr/local/lib/heroku \
# 	&& ln -s /usr/local/lib/heroku/bin/heroku /usr/local/bin/heroku \
# 	&& rm /tmp/heroku.tar.gz

#

WORKDIR $APP_PATH

# node_modules (see: http://bitjudo.com/blog/2014/03/13/building-efficient-dockerfiles-node-dot-js/)
COPY package*.json /tmp/
RUN sh -c "cd /tmp && npm install" \
	&& mv /tmp/node_modules $APP_PATH/node_modules \
	&& npm cache clean --force

COPY . $APP_PATH

RUN ls -al && make ENV=$wwwapp_env

#
# user rights (see: https://devcenter.heroku.com/articles/container-registry-and-runtime#run-the-image-as-a-non-root-user)
#

# RUN addgroup -S $USERNAME && adduser -S -g $USERNAME -h $HOME $USERNAME \
# 	&& chown -R $USERNAME:$USERNAME $APP_PATH
#USER $USERNAME

EXPOSE $APP_PORT
EXPOSE $wwwapp_www_proxy__port
EXPOSE $DEBUGGER_PORT

CMD ["npm", "start"]