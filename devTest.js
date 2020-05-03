const blePeripheral =   require("./blePeripheral.js");

const serviceName = 'com.sampleApp';                          // peripheral's DBus service name
const serviceUUID = '27b5244f-94f3-4011-be53-6ac36bf22cf1'    // UUID to advertise as an Bluetooh LE service



const bPrl = new blePeripheral(serviceName, serviceUUID, main)
    
function main (dbus){
    bPrl.logCharacteristicsIO = true;
    console.log('Initialize charcteristics...');

    console.dir(this, {depth:null});

    //var isAuthorized =  bPrl.Characteristic('00000001-94f3-4011-be53-6ac36bf22cf1', 'isAuthorized', ["read","write-without-response"]);

};
