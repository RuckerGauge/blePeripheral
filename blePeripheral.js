/*
  To give this class access to the D-Bus system bus you must place 
  the netConfig.conf file in the /etc/dbus-1/system.d directory
*/
const EventEmitter =      require("events");
const DBus =              require("dbus-native");
const BLEDevice =         require("./lib/deviceClass.js");
const AdapterClass =      require("./lib/adapterClass.js");
const Characteristic =    require("./lib/characteristicClass.js");
const GattService =       require("./lib/gattServiceClass.js")

const bleDevice = new BLEDevice(DBus.systemBus());
const adapter = new AdapterClass(DBus.systemBus());

var allCharacteristics = [];
var client = {
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
 * emits **.on('ConnectionChange', (connected))** when a new Bluetooth LE client connects of disconnects. Only detects bonded devices.
 * emits **.on('pairKey',(pKey, obj)** called with the pair key when a client tries to pair with server.  Set this.pairButtonPushed = true to allow user to pari with device.
 * 
 * * **ServiceName**: Is the service name for the GATT server.  A GATT Server is a collection of Characteristics.  This Service Name will be hosted on the D-Bus system bus and must be referenced in a .conf file in the /etc/dbus-1/system.d directory (see the netConfig.conf for an example)
 * * **ServerUUID**: This is the UUID for the Bluetooth LE server.  If you need a number visit https://www.uuidgenerator.net/.  
 * * **callback**: The callback is called once the server has been successfully registered on the system D-Bus.  It must configure at least one characteristic using the Characteristic method in this class (see sampleApp.js main() for an example).
 * * **PrimryService**:  Set to true if this server is going to advertise its services (it is the primary service).  Set it to false if another app is already advertising a service. 
 * 
 * @param {string} ServiceName
 * @param {string} ServerUUID
 * @param {object} callback
 * @param {boolean} PrimaryService
 */
class blePeripheral extends EventEmitter{
  constructor(ServiceName ='com.netConfig', ServerUUID = '5a0379a8-d692-41d6-b51a-d1730ea6b9d6', callback = function(){}, PrimaryService = true){
      super();
      this.primaryService = PrimaryService;
      this.serviceName = ServiceName;
      this.serverUUID = ServerUUID;
      this.servicePath = `/${this.serviceName.replace(/\./g, '/')}`;        // Replace . with / (com.netConfig = /com/netConfig).;
      this.dBus = DBus.systemBus();
      this.agentIface = {};
      this.client = client;
      this.logAllDBusMessages = false;
      this.logCharacteristicsIO = false;

      if (!this.dBus) {
        throw new Error('Could not connect to the DBus system bus.  Check .conf file in the /etc/dbus-1/system.d directory');
      };

      this.dBus.requestName(this.serviceName, 0x4, (err, retCode) => {                               // The 0x4 flag means that we don't want to be queued if the service name we are requesting is already
      // If there was an error, warn user and fail
      if (err) {
        throw new Error(
          `Could not request service name ${this.serviceName}, the error was: ${err}.`
        );
      }
      if (retCode === 1) {                                                              // Return code 0x1 means we successfully had the name
        console.log(`Successfully requested service name "${this.serviceName}"!`);
        this._connectionManager();
        this.pairModeOn(false);
        console.log('* * * * * * * callback to setup characteristics * * * * * * *')
        callback(this.dBus);
        console.log('* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *')
        console.log('Setup and initialize GATT service...');
        var gattService = new GattService(this.serverUUID, this.servicePath, this.dBus);
        gattService.createObjManagerIface(allCharacteristics);
        gattService.registerGattService();
        if(this.primaryService == true){
          this._createAdvertisementIface();
          this.startAdvertising();
        }
      } else {                                                                      
        throw new Error(                                                                //(https://dbus.freedesktop.org/doc/api/html/group__DBusShared.html#ga37a9bc7c6eb11d212bf8d5e5ff3b50f9)
          `Failed to request service name "${this.serviceName}". Check what return code "${retCode}" means. See https://dbus.freedesktop.org/doc/api/html/group__DBusShared.html#ga37a9bc7c6eb11d212bf8d5e5ff3b50f9`
        );
      }
    });
  }

/**
 * Registers an advertisement object to be sent over the LE Advertising channel. 
 * 
 * See the bluez LE Advertising Manager API https://git.kernel.org/pub/scm/bluetooth/bluez.git/tree/doc/advertising-api.txt#n143
 */
  startAdvertising(){
    var node = this.servicePath + '/advertisement';
    var service = this.dBus.getService('org.bluez');
    var objectPath = '/org/bluez/hci0'
    var iface = 'org.bluez.LEAdvertisingManager1'
    service.getInterface(objectPath, iface, (err, iface) => {
      if(err){
        console.error('Failed to request interface ' + iface + ' at ' + objectPath);
        console.error(err);
        return;
      }
		
      iface.RegisterAdvertisement(node, [], (err, str) => {
        if (err) {
          console.error(`Error while calling RegisterAdvertisement: ${err}`);
        } else if (str) {
          console.log(`RegisterAdvertisement returned: ${str}`);
        } else {
          console.log('Advertising primary service and waiting for Bluetooth LE connections...');
        }
      });
    })
  }

/**
 * Unregisters an BLE advertisement that has been	previously registered.
 * See the bluez LE Advertising Manager API https://git.kernel.org/pub/scm/bluetooth/bluez.git/tree/doc/advertising-api.txt#n169
 */
  stopAdvertising(){
    var node = this.servicePath + '/advertisement';
    var service = this.dBus.getService('org.bluez');
    var objectPath = '/org/bluez/hci0'
    var iface = 'org.bluez.LEAdvertisingManager1'
    service.getInterface(objectPath, iface, (err, iface) => {
      if(err){
        console.error('Failed to request interface ' + iface + ' at ' + objectPath);
        console.error(err);
        return;
      }
		
      iface.UnregisterAdvertisement(node, (err, str) => {
        if (err) {
          console.error(`Error while calling UnregisterAdvertisement: ${err}`);
        } else if (str) {
          console.log(`UnregisterAdvertisement returned: ${str}`);
        } else {
          console.log('Stopped advertising primary service and waiting for Bluetooth LE connections...');
        }
      });
    })
  }

  /**
   * This method will enable and disable pairing on the physical adapter.  By default this is disabled.  To allolw a user to pair / bond with this Peripheral you must call this method with true.  Then when the client tries to access a secure characteristic they will be allowed to pair and bond.
   * This method is usualy called as the result of a user pusing a pair button on the physical device.  Once enabled the device will remain pariable until this method is called agian and passed a boolean false.
   * 
   * @param {*} booleanValue 
   */
  pairModeOn(booleanValue = false){
    console.log('setting pairable = ' + booleanValue);
    adapter.setBooleanProperty('Pairable', booleanValue);
  }


/**
 * Creates a characteristic for a BLE GATT service.  These characteristics are based on the bluez D-Bus GATT API https://git.kernel.org/pub/scm/bluetooth/bluez.git/tree/doc/gatt-api.txt
 * 
 *  emits **.on('ReadValue', (device))** and **.on('WriteValue', (device, arg1)**, that can be consumed to intercept the reading and writting of .Value.  They will be emiited when a BLE client request to read or write a characteristic.
 *  
 * * **UUID**: Is the unique UUID number for this characteristic. If you need a number visit https://www.uuidgenerator.net/
 * * **node**: Is the node name for the characteristic (user friendly name)
 * * **flags**: Is an optional array of strings used to determine the access to this characteristic.  See https://git.kernel.org/pub/scm/bluetooth/bluez.git/tree/doc/gatt-api.txt#n236 for a list of supported flags. Default values are "encrypt-read","encrypt-write"
 * 
 * @param {string} UUID
 * @param {string} node
 * @param {Array} flags
 */
  Characteristic(UUID, node, flags){
    var x = new Characteristic(this.dBus, this.servicePath, UUID, node, flags, this.logCharacteristicsIO);
    allCharacteristics.push(x);
    return (x);
  }

  _connectionManager(){
    console.log('setting up monitoring of org.bluez for events..')    
    this.dBus.addMatch("type='signal', member='PropertiesChanged'");
    //this.dBus.addMatch("type='signal', member='InterfacesAdded'");
    this.dBus.connection.on('message', (arg1)=> { 
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
                      this.client.paired = await bleDevice.getProperty('Paired', client.devicePath);
                    } catch (err){
                      console.log(err);
                      this.client.paired = false;
                    }
                    try{                  
                      this.client.name = await bleDevice.getProperty('Name', client.devicePath);
                    } catch (err){
                      console.log(err);
                      this.client.name = '';
                    }
                  } else if (val2[1][1].toString() == 'false'){
                    this.client.connected = false;
                    this.client.paired = false;
                  }
                  this.emit('ConnectionChange', this.client.connected);
                  if(this.listenerCount('ConnectionChange') == 0){
                    console.log('Conneciton Event, time = ' + (new Date()).toLocaleTimeString());
                    console.log('\tdevicePath : ' + this.client.devicePath);
                    console.log('\t      name : ' + this.client.name);
                    console.log('\t connected : ' + this.client.connected);
                    console.log('\t    paired : ' + this.client.paired);
                  }
                } else if(val2[0].toString() == 'Name'){
                  this.client.name = val2[1][1].toString();
                  console.log(path + ' name now = ' + this.client.name);
                  if(this.client.connected == false){                     //Bluez doesnt always change the property for connected.  This is an attempt to cath a connection when a name change happens as the user has to be connected to change the name
                    this.client.connected = true;
                    this.client.devicePath = path;
                    this.emit('ConnectionChange', this.client.connected);
                    if(this.listenerCount('ConnectionChange') == 0){
                      console.log('Conneciton Event, time = ' + (new Date()).toLocaleTimeString());
                      console.log('\tdevicePath : ' + this.client.devicePath);
                      console.log('\t      name : ' + this.client.name);
                      console.log('\t connected : ' + this.client.connected);
                      console.log('\t    paired : ' + this.client.paired);
                    }
                  }

                } else if(val2[0].toString() == 'Paired'){
                  var x = val2[1][1].toString();
                  if(x == 'true'){
                    this.client.paired = true;
                  } else {
                    this.client.paired = false;
                  }
                  console.log(path + ' paired now = ' + this.client.paired + ', firing ConnectionChange event.');
                  this.emit('ConnectionChange', this.client.connected);
                }
              });
            };
          });
        }; 
      };
    });
  }

  _createAdvertisementIface(){
    var node = this.servicePath + '/advertisement';
    var ifaceDesc = {
      name: 'org.bluez.LEAdvertisement1',
      methods: {
        Release: ['', '', [], []]
      },
      properties: {
        Type: 's',
        ServiceUUIDs:'as',
      },
      signals: {
      }
    };
    var iface = {
      Release: function(){
        console.log('Advertising API has removed advertisement.')
      },
      Type: 'peripheral',
      ServiceUUIDs:[[this.serverUUID]],
    };
    console.log('Exporting D-Bus interface for BLE advertising');
    this.dBus.exportInterface(iface, node, ifaceDesc);
  }
};

function printDbusLogMsg(msg){
  console.log("\n- - - - D-Bus Monitoring message follows - - - -"); 
  console.dir(msg, {depth: null});
  console.log("- - - - - - - - - - - - - - - - - - - - - - - - -");
}

module.exports = blePeripheral;