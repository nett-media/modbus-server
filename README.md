# modbus-server

Modbus Server for OpenHAB

This is a simple modbus-server using `modbus-stream` npm package.

main motivation for this script is a missing modbus-server binding in openhab (see also https://community.openhab.org/t/modbus-tcp-server/105331)

## Clone Repository

```
clone https://github.com/nett-media/modbus-server.git
```

## Running the Modbus Server

there are 2 different ways to run the server

1. npm development testing

First install dependencies 

```
cd modbus-server
npm install
```

for starting the server you can use presets defined in package.json

```
npm run serve // "NODE_ENV=development nodemon modbus-server.js",
npm run serve:8502 // "SERVER_PORT=8502 NODE_ENV=development nodemon modbus-server.js",
npm run serve:production // "NODE_ENV=production node modbus-server.js"
```

2. dockerized

there is a included `docker-compose.yaml` file.
you can simply type:

```
docker compose build
docker compose up -d
docker compose logs -f
```

to build the image and start the docker container.
