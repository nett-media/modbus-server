const modbus = require("modbus-stream");
const fs = require('fs').promises;

/*
const os = require('os');
const networkInterfaces = os.networkInterfaces();
console.log(networkInterfaces)
*/

const dataFile = 'data/registers.json';

// env variables
const SERVER_PORT = process.env.SERVER_PORT || 502;

let registers = new Uint16Array(2200); // Erstelle ein Array für die Register


// add timestap to log output
const timestamp = () => `[${new Date().toUTCString()}]`
const log = (...args) => console.log(timestamp(), ...args)


function Uint16toBuffer(values) {
    const buffer = Buffer.alloc(values.length * 2);
    for (let i = 0; i < values.length; i++) {
        buffer.writeUInt16BE(values[i], i * 2);
    }
    //console.log("Uint16toBuffer: ", buffer)
    return buffer
}

function readCoils(request, reply) {
  //console.log(request.request)
  const start = request.request.address;
  const end = start + request.request.quantity
  const values = registers.slice(start, end)
  //log("Read Coil (" + start + "): ", values) // do not flood log file
  reply(null, values)
}

function writeSingleCoil(request, reply) {
  //console.log(request.request)
  const address = request.request.address;
  let coil = request.request.value
  log("Write Coil (" + address + "): " + coil)
  registers.set([coil], address)
  reply(null, address, coil)
}

function writeMultipleCoils(request, reply) {
  //console.log(request.request)
  const start = request.request.address;
  const quantity = request.request.quantity
  const values = request.request.values
  if(values.length >= quantity) {
    const coils = values.slice(0,quantity)
    log("Write Coils (" + start + "): " + coils)
    //console.log(coils)
    registers.set(coils, start)
    reply(null, start, coils)
  } else {
    // error
    reply(null, null)
  }
}

function readRegister0304(request, reply) {
    //console.log(request.request)
    const start = request.request.address;
    const end = start + request.request.quantity
    const values = registers.slice(start, end)
    //log("Read Register (" + start + "): ", values) // do not flood log file
    //reply(null, Buffer.from(values.buffer)); // Byte Order from Host System
    reply(null, Uint16toBuffer(values))
}

function writeRegister(request, reply) {
  //console.log(request.request)
  const start = request.request.address;
  let bufferValues = []
  switch(request.request.code) {
    case "WriteSingleRegister":
      bufferValues = [ request.request.value ]; // make it an array to share code with multiple registers
      break
    case "WriteMultipleRegisters":
      bufferValues = request.request.values;
      break
  }
  // convert multi byte values into single Value
  const numberValues = bufferValues.map((buffer) => buffer.readUInt16BE(0));
  registers.set(numberValues, start);
  log("Write Registers (" + start +"):", numberValues);

  // Hier kannst du einen HTTP-Request an openHAB senden, um eine Aktion auszulösen

  if(request.request.code == "WriteSingleRegister") {
    reply(null, start, request.request.value);
  } else {
    reply(null, start, request.request.quantity);
  }

}

// Beim Start des Programms die Daten laden
loadData().then(() => {
  modbus.tcp.server({ debug: null }, (connection) => {

    // function code 0x01
    connection.on("read-coils", readCoils);

    // function code 0x05
    connection.on("write-single-coil", writeSingleCoil);

    // function code 0x15
    connection.on("write-multiple-coils", writeMultipleCoils);

    // function code 0x03
    connection.on("read-holding-registers", readRegister0304);

    // function code 0x04
    connection.on("read-input-registers", readRegister0304);

    // function code 0x06
    connection.on("write-single-register", writeRegister);

    // function code 0x10
    connection.on("write-multiple-registers", writeRegister);

  }).listen(SERVER_PORT/*, () => {
    modbus.tcp.connect(8502, { debug: "client" }, (err, connection) => {

      //connection.readCoils({ address: 4, quantity: 1 }, (err, info) => {
      //    //console.log("response", info.response.data);
      //    console.log("response", info);
      //});

      connection.writeSingleCoil({ address: 11, value: 0 }, (err, info) => {
          //console.log("response", info.response.data);
          console.log("response", info.response);
      });

  });
  }*/); // Modbus Server auf Port 502
  console.log("Modbus TCP Server listening on port: ", SERVER_PORT)
});

// Funktion zum Speichern des Uint16Array als JSON-Datei
async function saveData() {
  try {
    const json = JSON.stringify(Array.from(registers));
    console.log(`Saving data to ${dataFile}`);
    await fs.writeFile(dataFile, json, 'utf-8');
    console.log('Daten erfolgreich gespeichert');
  } catch (err) {
    console.error('Fehler beim Speichern der Daten:', err);
  }
}

// Funktion zum Laden des Uint16Array aus der JSON-Datei
async function loadData() {
  try {
    const json = await fs.readFile(dataFile, 'utf-8');
    registers = Uint16Array.from(JSON.parse(json));
    console.log('Daten erfolgreich geladen');
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log('Daten-Datei nicht gefunden, initialisiere ein neues Uint16Array');
    } else {
      console.error('Fehler beim Laden der Daten:', err);
    }
  }
}



// Beim Beenden des Programms die Daten speichern
async function gracefulShutdown() {
  console.log("beende Modbus Server")
  await saveData();
  process.exit(0);
}

// Fange verschiedene Beendigungsereignisse ab, um die Daten zu speichern
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
process.on('SIGQUIT', () => {
  console.log('SIGQUIT received');
  gracefulShutdown();
});
process.on('uncaughtException', (err) => {
  console.error('Unerwarteter Fehler:', err);
  gracefulShutdown();
});

/*
Anfrage:
2023-03-29T19:05:05.003Z >> server 0x[ 00, 01, 00, 00, 00, 06, 00, 04, 00, 05, 00, 01 ]

    00, 01: Transaction Identifier (2 Bytes), wird verwendet, um Anfrage-Antwort-Paare zu korrelieren.
    00, 00: Protocol Identifier (2 Bytes), für Modbus immer 0x0000.
    00, 06: Length Field (2 Bytes), gibt die Anzahl der verbleibenden Bytes in der Nachricht an (Funktionscode + Daten). In diesem Fall sind es 6 Bytes.
    00: Unit Identifier (1 Byte), wird verwendet, um individuelle Geräte in einer Modbus TCP-Verbindung zu identifizieren (in diesem Fall Gerät 0).
    04: Function Code (1 Byte), in diesem Fall 0x04 für "Read Input Registers".
    00, 05: Startadresse (2 Bytes), gibt die erste Registeradresse an, die gelesen werden soll (in diesem Fall Register 5).
    00, 01: Anzahl der Register (2 Bytes), gibt an, wie viele Register gelesen werden sollen (in diesem Fall 1 Register).

Antwort:
2023-03-29T19:05:05.006Z << server 0x[ 00, 01, 00, 00, 00, 05, 00, 04, 02, 00, 05 ]

    00, 01: Transaction Identifier (2 Bytes), identisch mit dem der Anfrage, um Anfrage-Antwort-Paare zu korrelieren.
    00, 00: Protocol Identifier (2 Bytes), für Modbus immer 0x0000.
    00, 05: Length Field (2 Bytes), gibt die Anzahl der verbleibenden Bytes in der Nachricht an (Funktionscode + Daten). In diesem Fall sind es 5 Bytes.
    00: Unit Identifier (1 Byte), identisch mit dem der Anfrage (in diesem Fall Gerät 0).
    04: Function Code (1 Byte), in diesem Fall 0x04 für "Read Input Registers".
    02: Byte Count (1 Byte), gibt die Anzahl der Bytes in der Antwort an, die Registerdaten enthalten (in diesem Fall 2 Bytes).
    00, 05: Registerwert (2 Bytes), der gelesene Registerwert (in diesem Fall 5).
*/