FROM node:lts-slim
#USER node
EXPOSE 502
WORKDIR /modbus
RUN mkdir -p /modbus/data
COPY ./modbus-server.js ./package.json ./package-lock.json ./
#COPY ./data/registers.json* ./data // fails if registers.json does not exist..
COPY ./data/* ./data 
RUN npm clean-install --omit=dev
VOLUME /modbus/data

ARG buildtime_env=production 
ENV NODE_ENV=$buildtime_env 
CMD [ "sh", "-c", "exec node modbus-server.js" ]
#CMD [ "node", "modbus-server.js" ]
#CMD [ "bash" ]
