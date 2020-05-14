const blePeripheral =   require("./blePeripheral.js");
const fs =              require('fs');                        // Used to read CPU temperature in /sys/class/thermal/thermal_zone0/temp file.
const cp =              require('child_process');             // Used to spawn /bin/hostname -I to get IP Address.

const serviceName = 'com.sampleApp';                          // peripheral's DBus service name
const serviceUUID = '27b5244f-94f3-4011-be53-6ac36bf22cf1'    // UUID to advertise as an Bluetooh LE service

var bigBuffer = Buffer.alloc(512, 'i');
bigBuffer[0] = 0x00;
bigBuffer[511] = 0xFF;

console.log('Registering ->' + serviceName + '<- as a D-Bus system service...');
const bPrl = new blePeripheral(serviceName, serviceUUID, main);

function main(DBus){
  bPrl.logCharacteristicsIO = true;
  console.log('Initialize charcteristics...');
  var isAuthorized =  bPrl.Characteristic('00000001-94f3-4011-be53-6ac36bf22cf1', 'isAuthorized', ["read","write-without-response"]);
  var cmd =           bPrl.Characteristic('00000002-94f3-4011-be53-6ac36bf22cf1', 'cmd', ["read","write","notify"]);
  var bigData =       bPrl.Characteristic('00000003-94f3-4011-be53-6ac36bf22cf1', 'bigData');
  var myIpAddress =   bPrl.Characteristic('00000004-94f3-4011-be53-6ac36bf22cf1', 'myIpAddress', ["encrypt-read"]);
  var cpuTemp =       bPrl.Characteristic('00000006-94f3-4011-be53-6ac36bf22cf1', 'cpuTemp', ["encrypt-read","notify"]);

  console.log('Registering event handlers...');

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

  cmd.on('WriteValue', (device, arg1)=>{
    var cmdNum = String.fromCharCode(arg1);
    console.log(device + ' has sent a new cmd = ' + cmdNum);
    switch (cmdNum) {
      case '1':
        console.log('Enable test pairing command received.');
        bPrl.Adapter.pairModeOn(true);
        break;

      case '2':
        console.log('Disable test pairing command received.');
        bPrl.Adapter.pairModeOn(false);
      break;

      case '3':
        console.log('Display adapter properties:')
        bPrl.Adapter.logAllProperties()
        .then(rsltObj =>{
          cmd.notify(JSON.stringify(rsltObj));
        })
        .catch(err=>{
          console.error('Error calling Display adapter properties', err);
        });
      break;

      case '4':
        console.log('Connected device properties:')
        bPrl.Device.logAllProperties(bPrl.client.devicePath)
        .then(rsltObj =>{
          cmd.notify(JSON.stringify(rsltObj));
        })
        .catch(err=>{
          console.error('Error calling Connected device properties', err);
        });
      break;

      case '5':
        console.log('Testing setting trusted to true');
        bPrl.Device.setBooleanProperty('Trusted', true);
      break;

      case '6':
        console.log('Testing setting trusted to false');
        bPrl.Device.setBooleanProperty('rusted', false);
      break;
    
      default:
        console.log('no case for ' + cmdNum);
        break;
    }
  });
  
  cpuTemp.on('ReadValue', (device)=>{
    console.log(device + ' is reading CPU temperature..');
    cpuTemp.setValue(getCpuTemp());
  })

  setInterval(()=>{
    if(cpuTemp.iface.Notifying){
      cpuTemp.setValue(getCpuTemp());
      cpuTemp.notify();
    }
  }, 15000);

  console.log('setting default characteristic values...');
  updateAll();
  function updateAll(){
    bigData.setValue(bigBuffer);
    myIpAddress.setValue(getIP());
    cmd.setValue('1=enable pairing, 2=disable pairing. 3=log adapter, 4=log connected device');
    cpuTemp.setValue(getCpuTemp());
  };
};

bPrl.on('ConnectionChange', (connected)=>{
  var bleUserName = '';
  if(bPrl.client.name == ''){
    bleUserName = bPrl.client.devicePath;
  } else {
    bleUserName = bPrl.client.name;
  };
  if(connected == true){
    console.log('--> ' + bleUserName + ' has connected to this server at ' + (new Date()).toLocaleTimeString());
    if(bPrl.client.paired == false){
      console.log('--> ' + 'CAUTION: This BLE device is not authenticated.');
    } else if(bPrl.client.paired == true){
      console.log('--> This device is paired and can read and write encrypted characteristics.')
    } else {
      console.warn("--> this device's paired state is not an expected value: " + bPrl.client.paired);
    };
  } else {
    console.log('<-- ' + bleUserName + ' has disconnected from this server at ' + (new Date()).toLocaleTimeString());
    
    if(bPrl.areAnyCharacteristicsNotifying() == true){
      console.log('Cleanup leftover notifications...')
      bPrl.clearAllNotifications();
    };
  };
});

/**
 * Reads the CPU temperature on Raspberry Pi. 
 * Returns temperature in fahrenheit as a string.
 */
function getCpuTemp(){
  cpuTempStr = '';
  try{
    cpuTempStr = fs.readFileSync('/sys/class/thermal/thermal_zone0/temp');
    var f = parseInt(cpuTempStr)  * .001;
    f = f * 1.8 + 32; 
    cpuTempStr = f.toFixed(2).toString();  
  }
  catch(err){
    console.log('error reading CPU Temperature ');
    return 'not supported on this hardware';
  };

  return cpuTempStr + '°F';
};

/**
 * Returns local IP address of Raspberry Pi as a string.
 */
function getIP(){                      
  var ipAdd = ''
  try{
    // get ip address (may be more than one)
    var rsp = cp.execSync('/bin/hostname -I');
    var str = rsp.toString();    
    var y = str.split('\n');
    ipAdd = y[0].trim();    

  }
  catch(err){
    console.log('error reading IP Address');
    return "not supported on this hardware";
  };

  return ipAdd;
}