const EventEmitter =      require("events");
const cp =                require('child_process');
const DBusOld =           require("dbus-native");
const Dbus =              require("dbus");
const DeviceClass =       require("./lib/deviceClass.js");
const AdapterClass =      require("./lib/adapterClass.js");
const Characteristic =    require("./lib/characteristicClass.js");
const GattService =       require("./lib/gattServiceClass.js");
const Advertisement =     require("./lib/advertisingClass.js");

const logPrefix = 'blePeripheral.js | ';

const dbusOld = Symbol();

var allCharacteristics = [];
var Client = {
  devicePath:'',
  connected:false,
  paired:false,
  name:""
}

/**
 * This class creates a Bluetooth LE Peripheral as a D-Bus system service according to the bluez API.  For more information see the gatt-api.txt, agent-api.txt, advertising-api.txt and device-api.txt on the bluez.git found here: https://git.kernel.org/pub/scm/bluetooth/bluez.git/tree/doc
 * 
 * This class creates a LEAdvertisement packet with the serverUUID.  This advertisement packet will be visible to clients and will allow them to find the server and connect.  Once a connection is established the advertisement will stop until the client disconnects.   
 * 
 * This class controles the pairing property of the BT adapter.  By default pairing is disabled and can be enabled by calling the pairModeOn(true) method.  The pairing / bonding process is triggered when a user tries to access a secure characteristic. 
 * 
 * emits **.on('ConnectionChange', (connected))** when a new Bluetooth LE client connects or disconnects. Only detects bonded devices.
 * emits **.on('pairKey',(pKey, obj)** called with the pair key when a client tries to pair with server.  Set this.pairButtonPushed = true to allow user to pari with device.
 * 
 * * **ServiceName**: Is the service name for the GATT server.  A GATT Server is a collection of Characteristics.  This Service Name will be hosted on the D-Bus system bus and must be referenced in a .conf file in the /etc/dbus-1/system.d directory (see the netConfig.conf for an example)
 * * **ServerUUID**: This is the UUID for the Bluetooth LE server.  If you need a number visit https://www.uuidgenerator.net/.  
 * * **callback**: The callback is called once the server has been successfully registered on the system D-Bus.  It must configure at least one characteristic using the Characteristic method in this class (see sampleApp.js main() for an example).
 * * **PrimryService**:  Set to true if this server is going to advertise its services (it is the primary service).  Set it to false if another app is already advertising a service. 
 * 
 * @param {string} ServiceName example: 'com.netConfig'
 * @param {string} ServerUUID example: '5a0379a8-d692-41d6-b51a-d1730ea6b9d6'
 * @param {object} callback
 * @param {boolean} PrimaryService example: true
 */
class blePeripheral extends EventEmitter{
  //Private field declarations:
  // #dbusService requires version 12 of node.  We are stuck on version 10
  
  constructor(ServiceName ='com.netConfig', ServerUUID = '4b1268a8-d692-41d6-b51a-d1730ea6b9d6', callback = function(){}, PrimaryService = true){
    super();
    this.primaryService = PrimaryService;
    this.serviceName = ServiceName;
    this.serverUUID = ServerUUID;
    this.servicePath = `/${this.serviceName.replace(/\./g, '/')}`;        // Replace . with / (com.netConfig = /com/netConfig).;
    // this[dbusOld] = DBusOld.systemBus();
    
    this.client = Client;
    this.logAllDBusMessages = false;
    this.logCharacteristicsIO = false;

    try{
      this._dbusService = Dbus.registerService('system', this.serviceName)
    } catch (err) {
      console.error('Could not connect to the DBus system bus.  Check .conf file in the /etc/dbus-1/system.d directory', err);
      throw new Error('Could not connect to the DBus system bus.  Check .conf file in the /etc/dbus-1/system.d directory');
    }

    // //To Do the next 4 class need to be rewirtten. 
    this.Device = new DeviceClass(); 
    // this.Adapter = new AdapterClass(DBusOld.systemBus()); // this is a dbus client.  I dont think it needs to be passed the system buss
    // this.Advertisement = new Advertisement(this[dbusOld], this.servicePath, this.serverUUID);   //I think we need to pass this#dbusService to this class
    // this.gattService = new GattService(this.serverUUID, this.servicePath, this[dbusOld]);       //I think we need to pass this#dbusService to this class
    
    logit(`Successfully requested service name "${this.serviceName}"!`);
    this._connectionManager();

    // this[dbusOld].requestName(this.serviceName, 0x4, (err, retCode) => {                               // The 0x4 flag means that we don't want to be queued if the service name we are requesting is already
    //   // If there was an error, warn user and fail
    //   if (err) {
    //     throw new Error(
    //       `Could not request service name ${this.serviceName}, the error was: ${err}.`
    //     );
    //   }


    //   if (retCode === 1) {                                                              // Return code 0x1 means we successfully had the name
    //     console.debug(`Successfully requested service name "${this.serviceName}"!`);
    //     this._connectionManager();
    //     this.Adapter.pairModeOn(false);
    //     console.debug('blePdripheral.js -> * * * * * * * callback to setup characteristics * * * * * * *')
    //     callback(this[dbusOld]);
    //     console.debug('blePdripheral.js -> * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *')
    //     console.debug('blePdripheral.js -> Setup and initialize GATT service...');
    //     this.gattService.createObjManagerIface(allCharacteristics);
    //     this.gattService.registerGattService();
    //     if(this.primaryService == true){
    //       this.Advertisement.startAdvertising();
    //     }
    //   } else {                                                                      
    //     throw new Error(                                                                //(https://dbus.freedesktop.org/doc/api/html/group__DBusShared.html#ga37a9bc7c6eb11d212bf8d5e5ff3b50f9)
    //       `Failed to request service name "${this.serviceName}". Check what return code "${retCode}" means. See https://dbus.freedesktop.org/doc/api/html/group__DBusShared.html#ga37a9bc7c6eb11d212bf8d5e5ff3b50f9`
    //     );
    //   }
    // });
  }

  /**
   * Clears all notificaitons and restarts Gatt Service.
   * 
   * Note: this has no affect on advertisement packet.
   */
  restartGattService(){
    console.debug('blePdripheral.js -> Clearing all notifications...');
    this.gattService.clearAllNotifications(allCharacteristics);
    console.debug('blePdripheral.js -> Unregistering Gatt Service...');
    this.gattService.unRegisterGattService();
    console.debug('blePdripheral.js -> Reregistering Gatt Service...');
    this.gattService.registerGattService();
  }

  /** 
   * Checks all characteristics and returns true if any have iface.Notifying = true
   * If they are then it is recommended to restart Gatt Service on disconnect
   * 
   * @return {boolean} true if any characteristic is notifying. 
   */
  areAnyCharacteristicsNotifying(){
    return this.gattService.isAnyoneNotifying(allCharacteristics);
  };

/**
 * Creates a characteristic for a BLE GATT service.  These characteristics are based on the bluez D-Bus GATT API https://git.kernel.org/pub/scm/bluetooth/bluez.git/tree/doc/gatt-api.txt
 * 
 *  emits **.on('ReadValue', (device))** and **.on('WriteValue', (device, arg1)**, that can be consumed to intercept the reading and writting of .Value.  They will be emitted when a BLE central request to read or write a characteristic.
 *  
 * * **UUID**: Is the unique UUID number for this characteristic. If you need a number visit https://www.uuidgenerator.net/
 * * **node**: Is the node name for the characteristic (user friendly name)
 * * **flags**: Is an optional array of strings used to determine the access to this characteristic.  See https://git.kernel.org/pub/scm/bluetooth/bluez.git/tree/doc/gatt-api.txt#n236 for a list of supported flags. Default values are "encrypt-read","encrypt-write"
 * 
 * @param {string} UUID '00000001-94f3-4011-be53-6ac36bf22cf1'
 * @param {string} node 'myVarName'
 * @param {Array} flags [["encrypt-read", "notify", "encrypt-write"]]
 */
  Characteristic(UUID, node, flags){
    var x = new Characteristic(this[dbusOld], this.servicePath, UUID, node, flags, this.logCharacteristicsIO);
    allCharacteristics.push(x);
    return (x);
  };

//   function spawnCommand(command = '/bin/journalctl', args = ['-f', '-urgMan'], log = (val)=>{console.log('--> '+val+' <--')}){
//     spawnedCmd = cp.spawn(command, args);
//     spawnedCmd.stdout.on('data', ((data)=>{
//         notifyChunck(data, log);
//     }));
//     spawnedCmd.stderr.on('data', ((data)=>{
//         log('Err->' + data);
//     }));
// };

  _connectionManager(){
    logit('setting up monitoring of org.bluez for events..');
    let spawnedCmd = cp.spawn('/usr/bin/gdbus', ['monitor', '--system', '--dest', 'org.bluez'])
    spawnedCmd.stdout.on('data', ((data)=>{
        var strData = String(data);
        if(strData.trim().startsWith('/org/bluez/hci0/dev_')){
          // logit('->' + strData.trim() + '<- ');
          let nodeId = strData.trim().split(':', 1)[0];
          let devPars = strData.trim().split('org.bluez.Device1')[1].split('{')[1].split('}')[0]
          logit(nodeId + ' ' + devPars);
          this.client.devicePath = nodeId;
          if(devPars.includes("'ServicesResolved': <true>")){
            this._emitConnectionChange(nodeId);
          }else if(devPars.includes("'ServicesResolved': <false>")){
            console.log('fire an event and remove this guy...');
          };
        };
        
    }));
    spawnedCmd.stderr.on('data', ((data)=>{
        logit('Err->' + data);
    }));
  };

  _emitConnectionChange(nodeId = '/org/bluez/hci0/dev_B4_F6_1C_53_EF_B3'){

    // var Client = {
    //   devicePath:'',
    //   connected:false,
    //   paired:false,
    //   name:""
    // }

    // let promises = [];
    // promises.push(this.Device.getProperty('Paired', nodeId));
    // promises.push(this.Device.getProperty('Name', nodeId));
    // promises.push(this.Device.getProperty('Connected', nodeId));

    // Promise.all(promises)
    // .then((rslt)=>{
    //   logit('promise resloved with ' + rslt);
    // })
    // .catch((err)=>{
    //   logit('Error resolving all promises ' + err);
    // });

    this.Device.logAllProperties(nodeId);

    // this.emit('ConnectionChange', this.client.connected, Client.devicePath);
    // if(this.listenerCount('ConnectionChange') == 0){
    //   console.debug('blePdripheral.js -> Conneciton Event, time = ' + (new Date()).toLocaleTimeString());
    //   console.debug('blePdripheral.js -> \tdevicePath : ' + this.client.devicePath);
    //   console.debug('blePdripheral.js -> \t      name : ' + this.client.name);
    //   console.debug('blePdripheral.js -> \t connected : ' + this.client.connected);
    //   console.debug('blePdripheral.js -> \t    paired : ' + this.client.paired);
    // };
  };

  _connectionManager_old(){
    console.debug('blePdripheral.js -> setting up monitoring of org.bluez for events..')    
    this[dbusOld].addMatch("type='signal', member='PropertiesChanged'");
    //this[dBus].addMatch("type='signal', member='InterfacesAdded'");
    this[dbusOld].connection.on('message', (arg1)=> { 
      if(this.logAllDBusMessages){printDbusLogMsg(arg1);};
      var path = '';
      if(arg1.path){path = arg1.path};
        if(path.search('/org/bluez/hci0/dev_') == 0){    
          if(Array.isArray(arg1.body)){
            arg1.body.forEach((val)=>{          
            if(Array.isArray(val)){
              val.forEach(async (val2)=>{
                if(val2[0].toString() == 'Connected'){
                  if(val2[1][1].toString() == 'true'){
                    this.client.connected = true;
                    this.client.devicePath = path;  
                    try{                  
                      this.client.paired = await this.Device.getProperty('Paired', Client.devicePath);
                    } catch (err){
                      console.error('blePeripheral', err);
                      this.client.paired = false;
                    }
                    try{                  
                      this.client.name = await this.Device.getProperty('Name', Client.devicePath);
                    } catch (err){
                      console.error('blePeripheral', err);
                      this.client.name = '';
                    }
                  } else if (val2[1][1].toString() == 'false'){
                    this.client.connected = false;
                    this.client.devicePath = path;
                    this.client.paired = false;
                  }
                  this.emit('ConnectionChange', this.client.connected, Client.devicePath);
                  if(this.listenerCount('ConnectionChange') == 0){
                    console.debug('blePdripheral.js -> Conneciton Event, time = ' + (new Date()).toLocaleTimeString());
                    console.debug('blePdripheral.js -> \tdevicePath : ' + this.client.devicePath);
                    console.debug('blePdripheral.js -> \t      name : ' + this.client.name);
                    console.debug('blePdripheral.js -> \t connected : ' + this.client.connected);
                    console.debug('blePdripheral.js -> \t    paired : ' + this.client.paired);
                  }
                } else if(val2[0].toString() == 'Name'){
                  this.client.name = val2[1][1].toString();
                  console.debug(path + ' name now = ' + this.client.name);
                  if(this.client.connected == false){                     //Bluez doesnt always change the property for connected.  This is an attempt to cath a connection when a name change happens as the user has to be connected to change the name
                    this.client.connected = true;
                    this.client.devicePath = path;
                    this.emit('ConnectionChange', this.client.connected, Client.devicePath);
                    if(this.listenerCount('ConnectionChange') == 0){
                      console.debug('blePdripheral.js -> Conneciton Event, time = ' + (new Date()).toLocaleTimeString());
                      console.debug('blePdripheral.js -> \tdevicePath : ' + this.client.devicePath);
                      console.debug('blePdripheral.js -> \t      name : ' + this.client.name);
                      console.debug('blePdripheral.js -> \t connected : ' + this.client.connected);
                      console.debug('blePdripheral.js -> \t    paired : ' + this.client.paired);
                    }
                  }

                } else if(val2[0].toString() == 'Paired'){
                  var x = val2[1][1].toString();
                  if(x == 'true'){
                    this.client.paired = true;
                  } else {
                    this.client.paired = false;
                  }
                  this.client.devicePath = path;
                  console.debug(path + ' paired now = ' + this.client.paired + ', firing ConnectionChange event.');
                  this.emit('ConnectionChange', this.client.connected, Client.devicePath);
                }
              });
            };
          });
        }; 
      };
    });
  };


};

function printDbusLogMsg(msg){
  console.log("\n- - - - D-Bus Monitoring message follows - - - -"); 
  console.dir(msg, {depth: null});
  console.log("- - - - - - - - - - - - - - - - - - - - - - - - -");
}


function logit(txt = ''){
  console.debug(logPrefix + txt)
};

module.exports = blePeripheral;