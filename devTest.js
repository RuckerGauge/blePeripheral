const blePeripheral =   require("./blePeripheral.js");

const serviceName = 'com.sampleApp';                          // peripheral's DBus service name
const serviceUUID = '27b5244f-94f3-4011-be53-6ac36bf22cf1'    // UUID to advertise as an Bluetooh LE service


const bPrl = new blePeripheral(serviceName, serviceUUID, ()=>{main});


function main(){
    bPrl.logCharacteristicsIO = true;
    console.log('Initialize charcteristics...');
    var isAuthorized =  bPrl.Characteristic('00000001-94f3-4011-be53-6ac36bf22cf1', 'isAuthorized', ["read","write-without-response"]);
    // var cmd =           bPrl.Characteristic('00000002-94f3-4011-be53-6ac36bf22cf1', 'cmd', ["read","write"]);
    // var bigData =       bPrl.Characteristic('00000003-94f3-4011-be53-6ac36bf22cf1', 'bigData');
    // var myIpAddress =   bPrl.Characteristic('00000004-94f3-4011-be53-6ac36bf22cf1', 'myIpAddress', ["encrypt-read"]);
    // var cpuTemp =       bPrl.Characteristic('00000006-94f3-4011-be53-6ac36bf22cf1', 'cpuTemp', ["encrypt-read","notify"]);
    
    // console.log('Registering event handlers...');
    
    // isAuthorized.on('ReadValue', (device)=>{
    //     console.log(bPrl.client.name + ', ' + device + ' has connected and checking if it is authorized');
    //     if(bPrl.client.paired == true){
    //     console.log('\tpaired = true');
    //     isAuthorized.setValue(Buffer.from('true'));
    //     } else {
    //     console.log('\tpaired = false');
    //     isAuthorized.setValue(Buffer.from('false'));
    //     };
    // });
    
    // cmd.on('WriteValue', (device, arg1)=>{
    //     console.log(device + ' has sent a new cmd = ' + arg1[0]);
    //     var cmdNum = arg1.toString();
    //     switch (cmdNum) {
    //     case '1':
    //         console.log('Enable test pairing command received.');
    //         bPrl.Adapter.pairModeOn(true);
    //         break;
    
    //     case '2':
    //         console.log('Disable test pairing command received.');
    //         bPrl.Adapter.pairModeOn(false);
    //     break;
    
    //     case '3':
    //     console.log('Display adapter properties:')
    //     bPrl.Adapter.logAllProperties();
    //     break;
    
    //     case '4':
    //     console.log('Connected device properties:')
    //     bPrl.Device.logAllProperties(bPrl.client.devicePath);
    //     break;
        
    //     default:
    //         console.log('no case for ' + cmdNum);
    //         break;
    //     }
    // });
    
    // cpuTemp.on('ReadValue', (device)=>{
    //     console.log(device + ' is reading CPU temperature..');
    //     cpuTemp.setValue(getCpuTemp());
    // })
    
    // setInterval(()=>{
    //     if(cpuTemp.iface.Notifying){
    //     cpuTemp.setValue(getCpuTemp());
    //     cpuTemp.notify();
    //     }
    // }, 15000);
    
    // console.log('setting default characteristic values...');
    // updateAll();
    // function updateAll(){
    //     bigData.setValue(bigBuffer);
    //     myIpAddress.setValue(getIP());
    //     cmd.setValue('1=enable pairing, 2=disable pairing. 3=log adapter, 4=log connected device');
    //     cpuTemp.setValue(getCpuTemp());
    // };
};
