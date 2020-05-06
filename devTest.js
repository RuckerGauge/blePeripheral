const blePeripheral =   require("./blePeripheral.js");

const serviceName = 'com.sampleApp';                          // peripheral's DBus service name
const serviceUUID = '27b5244f-94f3-4011-be53-6ac36bf22cf1'    // UUID to advertise as an Bluetooh LE service

const bPrl = new blePeripheral(serviceName, serviceUUID, main);

function main(){
    console.log('Main callback is starting now..');
    bPrl.logCharacteristicsIO = true;
    console.log('logCharacteristicsIO enabled = ' + bPrl.logCharacteristicsIO);

    var isAuthorized =  bPrl.Characteristic('00000001-94f3-4011-be53-6ac36bf22cf1', 'isAuthorized', ["read","write-without-response"]);
    var cmd =           bPrl.Characteristic('00000002-94f3-4011-be53-6ac36bf22cf1', 'cmd', ["read","write"]);

};



