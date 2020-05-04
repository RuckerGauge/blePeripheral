// const blePeripheral =   require("./blePeripheral.js");
const blePeripheral =       require("./ble.js")

const serviceName = 'com.sampleApp';                          // peripheral's DBus service name
const serviceUUID = '27b5244f-94f3-4011-be53-6ac36bf22cf1'    // UUID to advertise as an Bluetooh LE service


const bPrl = new blePeripheral(main);
    
function main (){
    console.log('Main call back is starting now..');
    bPrl.logCharacteristicsIO = true;
    console.log('logCharacteristicsIO enabled = ' + bPrl.logCharacteristicsIO);


    //console.dir(this, {depth:null});

    //var isAuthorized =  bp.Characteristic('00000001-94f3-4011-be53-6ac36bf22cf1', 'isAuthorized', ["read","write-without-response"]);

};
