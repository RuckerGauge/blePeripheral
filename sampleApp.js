const blePeripheral =         require("./blePeripheral.js");

const serviceName = 'com.netConfig';                              // peripheral's DBus service name
const serviceUUID = '27b5244f-94f3-4011-be53-6ac36bf22cf1'        // UUID to advertise as an Bluetooh LE service

console.log('Registering ->' + serviceName + '<- as a D-Bus system service...');
const bPrl = new blePeripheral(serviceName, serviceUUID, main);

function main(DBus){
  // bleSrvr.logAllDBusMessages=true;
  console.log('Initialize charcteristics...');
  var isAuthorized =  bPrl.Characteristic('00000001-94f3-4011-be53-6ac36bf22cf1', 'isAuthorized', [["read","write-without-response"]]);
  var cmd =           bPrl.Characteristic('00000002-94f3-4011-be53-6ac36bf22cf1', 'cmd', [["read","write"]]);
  var bigData =       bPrl.Characteristic('00000003-94f3-4011-be53-6ac36bf22cf1', 'bigData');
  var myIpAddress =   bPrl.Characteristic('00000004-94f3-4011-be53-6ac36bf22cf1', 'myIpAddress', [["encrypt-read"]]);
  var iNetReachable = bPrl.Characteristic('00000006-94f3-4011-be53-6ac36bf22cf1', 'iNetReachable', [["encrypt-read","notify","encrypt-write"]]);

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
    console.log(device + ' has sent a new cmd = ' + arg1[0]);
    var cmdNum = arg1.toString();
    switch (cmdNum) {
      case '1':
        console.log('Enable test pairing command received.');
        bPrl.pairModeOn(true);
        break;

      case '2':
        console.log('Disable test pairing command received.');
        bPrl.pairModeOn(false);
      break;

    
      default:
        console.log('no case for ' + cmdNum);
        break;
    }
  });
  
  setInterval(()=>{
    if(iNetReachable.iface.Notifying && !bPrl.client.connected){iNetReachable.clearNotify();}
    if(iNetReachable.iface.Notifying){iNetReachable.notify();}
  }, 15000);

  console.log('setting default characteristic values...');

  bigData.setValue(bigBuffer);
  myIpAddress.setValue('10.50.121.5');
  cmd.setValue('1=enable pairing, 2=disable pairing.');
  iNetReachable.setValue(Buffer.from([0x01, 0x02, 0xA2]));
};

console.log('display adapter properties:')
bPrl.Adapter.logAllProperties();

bPrl.on('ConnectionChange', (connected)=>{
  console.log('here are the details about the connected device:')
  bPrl.Device.logAllProperties(bPrl.client.devicePath);

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
    }
  } else {
    console.log('<-- ' + bleUserName + ' has disconnected from this server at ' + (new Date()).toLocaleTimeString());
  }
});


var bigBuffer = Buffer.alloc(512, 'i');
bigBuffer[0] = 0x00;
bigBuffer[511] = 0xFF;

