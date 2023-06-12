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

### run with node/npm

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

### run as Docker Container

there is a included `docker-compose.yaml` file.
you can simply type:

```
docker compose build
docker compose up -d
docker compose logs -f
```

to build the image and start the docker container.

## Openhab Binding

install [modbus tcp binding](https://www.openhab.org/addons/bindings/modbus/) and add a `modbus.things` file to the `things` folder in the openhab settings

here is a sample modbus things config

modbus.things
```
// https://www.openhab.org/addons/bindings/modbus/
Bridge modbus:tcp:localhostTCP [ host="modbus", port=502, id=0, reconnectAfterMillis=15000 ] {

    // Production 1
    Bridge poller program1Poller [ start=1001, length=1, refresh=1000, type="holding" ] {
        Thing data lightPreset [ readStart="1001", readValueType="int16", writeStart="1001", writeValueType="int16", writeType="holding" ]
    }

    // Write-only entry: thing is child of tcp directly. No readStart etc. need to be defined.
    // Note that the openHAB state might differ from the physical slave since it is not refreshed at all
    Thing data P1Temperature    [ writeStart="1111", writeValueType="int16", writeType="holding" ]
    Thing data P1Humidity       [ writeStart="1112", writeValueType="int16", writeType="holding" ]
    Thing data P1Luminance      [ writeStart="1113", writeValueType="int16", writeType="holding" ]
    Thing data P1Co2            [ writeStart="1114", writeValueType="int16", writeType="holding" ]

    Thing data P1faultLight  [ writeStart="11", writeValueType="bit", writeType="coil" ]
    Thing data P1faultSensor [ writeStart="12", writeValueType="bit", writeType="coil" ]
}
```

you also need to connect this `things` to `items` via a `modbus.items` file

here is a matching example:

modbus.items
```
Number Program1      "Program1" <greenhouse>   (Lightcontroller1, Lights) { channel="modbus:data:localhostTCP:program1Poller:lightPreset:number"}

Number P1ModbusTemperature  "Temperatur Produktion 1 [%.1f °C]"         { channel="modbus:data:localhostTCP:P1Temperature:number"}
Number P1ModbusHumidity     "Luftfeuchtigkeit Produktion 1 [%.1f rel]"  { channel="modbus:data:localhostTCP:P1Humidity:number" }
Number P1ModbusLuminance    "Helligkeit Produktion 1 [%d ppm]"          { channel="modbus:data:localhostTCP:P1Luminance:number" }
Number P1ModbusCo2          "Co2 Level Produktion 1 [%d]"               { channel="modbus:data:localhostTCP:P1Co2:number" }

Number P1faultLight  "Status Licht Produktion1 [MAP(status.map):%s]"     <status>      { channel="modbus:data:localhostTCP:P1faultLight:number"}
Number P1faultSensor  "Status Sensor Produktion1 [MAP(status.map):%s]"   <status>      { channel="modbus:data:localhostTCP:P1faultSensor:number"}
```
