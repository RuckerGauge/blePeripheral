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
    var cpuTemp =       bPrl.Characteristic('00000006-94f3-4011-be53-6ac36bf22cf1', 'cpuTemp', ["encrypt-read","notify"]);    

    var temp = 1;
    setInterval(()=>{
        if(cpuTemp.iface.Notifying){
            cpuTemp.notify('the number is ' + temp);
            temp++;
            if(temp > 10){
                cpuTemp.clearNotify();
            }
        } else {
            temp = 1;
        };
    },10000);

    cmd.setValue('Enter a command number:');

    isAuthorized.on('ReadValue', (device)=>{
        console.log(bPrl.client.name + ', ' + device + ' has connected and checking if it is authorized');
        if(bPrl.client.paired == true){
          console.log('\tpaired = true');
          isAuthorized.setValue(Buffer.from('true'));
        } else {
          console.log('\tpaired = false');
          isAuthorized.setValue(Buffer.from('false'));
        };
    });
};

setTimeout(()=>{
    console.log('Restarting...')
    bPrl.restartGattService();
},60000)




// "dbus": "git+https://github.com/RuckerGauge/node-dbus.git#JR_addSupportForObjectPath"
// "dbus": "^1.0.7"