const EventEmitter =      require("events");
const cp =                require('child_process');
const DBus =              require("dbus");
const DeviceClass =       require("./lib/deviceClass.js");
const AdapterClass =      require("./lib/adapterClass.js");
const Characteristic =    require("./lib/characteristicClass.js");
const GattService =       require("./lib/gattServiceClass.js");
const Advertisement =     require("./lib/advertisingClass.js");

const logPrefix = 'blePeripheral.js | ';

// const dbusOld = Symbol();

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
  constructor(ServiceName ='com.netConfig', ServerUUID = '4b1268a8-d692-41d6-b51a-d1730ea6b9d6', callback = function(){}, PrimaryService = true){
    super();
    this.primaryService = PrimaryService;
    this.serviceName = ServiceName;
    this.serverUUID = ServerUUID;
    this.servicePath = `/${this.serviceName.replace(/\./g, '/')}`;        // Replace . with / (com.netConfig = /com/netConfig).;
    this.client = Client;
    this.logAllDBusMessages = false;
    this.logCharacteristicsIO = false;
    


    logit('Constructing dbus interface...') 
    this._dbusService = DBus.registerService('system', this.serviceName);
    this._rootNodeObj = this._dbusService.createObject(this.servicePath);
    this._dBusClient = this._rootNodeObj.service.bus

    logit(`Successfully requested service name "${this.serviceName}"!`);
    
    // //To Do the next 4 class need to be rewirtten. 
    this.Device = new DeviceClass(); 
    this.Adapter = new AdapterClass();
    this.gattService = new GattService(this._dBusClient, this._rootNodeObj, this.servicePath, this.serverUUID);   
    // this.Advertisement = new Advertisement(this._dBusClient, this._rootNodeObj, this.servicePath, this.serverUUID);    
    this.Advertisement = new Advertisement(this._dBusClient, this._rootNodeObj, this.servicePath, this.serverUUID); 

    this._connectionManager();
    this.Adapter.pairModeOn(false);

    process.nextTick(()=>{
      logit('* * * * * * * callback to setup characteristics * * * * * * *')
      callback()
      logit('* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *')
      logit('Setup and initialize GATT service...');
      this.gattService.createObjManagerIface(allCharacteristics);
      this.gattService.registerGattService();
      setTimeout(()=>{
        if(this.primaryService == true){this.Advertisement.startAdvertising()};
      },30000);
      
    });
      
    


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
  };

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
  };

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
    var x = new Characteristic(this._dbusService, this.servicePath, UUID, node, flags, this.logCharacteristicsIO);
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
      if(this.logAllDBusMessages){logit(strData)};
      if(strData.trim().startsWith('/org/bluez/hci0/dev_')){
        let nodeId = strData.trim().split(':', 1)[0];
        let devPars = strData.trim().split('org.bluez.Device1')[1].split('{')[1].split('}')[0]
        // logit(nodeId + ' ' + devPars);
        if(devPars.includes("'ServicesResolved': <true>")  || devPars.includes("'AddressType':")){
          this._emitConnectionChange(nodeId);
        }else if(devPars.includes("'ServicesResolved': <false>")){
          this.client.devicePath = nodeId;
          this.client.paired = false;
          this.client.connected = false;
          this.client.name = '';
          this.emit('ConnectionChange', this.client.connected, this.client.devicePath);
          if(this.listenerCount('ConnectionChange') == 0){
            logit('Conneciton Event, time = ' + (new Date()).toLocaleTimeString());
            logit('\tdevicePath : ' + this.client.devicePath);
            logit('\t      name : ' + this.client.name);
            logit('\t connected : ' + this.client.connected);
            logit('\t    paired : ' + this.client.paired);
          };
        };
      };
    }));
    spawnedCmd.stderr.on('data', ((data)=>{
        logit('Err->' + data);
    }));
  };

  _emitConnectionChange(nodeId = '/org/bluez/hci0/dev_B4_F6_1C_53_EF_B3'){
    let promises = [];
    //DO NOT CHANGE THE ORDER OF THE FOLLOWING THREE CALLS!
    promises.push(this.Device.getProperty('Paired', nodeId));
    promises.push(this.Device.getProperty('Name', nodeId));
    promises.push(this.Device.getProperty('Connected', nodeId));
    //DO NOT CHANGE THE ORDER OF THE ABOVE THREE CALLS!
    Promise.all(promises)
    .then((rslt)=>{
      if(Array.isArray(rslt)){
        this.client.devicePath = nodeId;
        this.client.paired = rslt[0];
        this.client.name = rslt[1];
        this.client.connected = rslt[2]
        this.emit('ConnectionChange', this.client.connected, this.client.devicePath);
        if(this.listenerCount('ConnectionChange') == 0){
          logit('Conneciton Event, time = ' + (new Date()).toLocaleTimeString());
          logit('\t  devicePath : ' + this.client.devicePath);
          logit('\t        name : ' + this.client.name);
          logit('\t   connected : ' + this.client.connected);
          logit('\t      paired : ' + this.client.paired);
        };
      } else {
        console.error('Error blePeripheral.js _emitConnectionChange promise resloved was not an array.  Result was ' + rslt);
      };
    })
    .catch((err)=>{
      logit('Error resolving one or all promises in _emitConnectionChange');
      console.error('Error resolving all promises. ', err);
    });
  };
};

function logit(txt = ''){
  console.debug(logPrefix + txt);
};

module.exports = blePeripheral;