const Dbus =            require("dbus");

const logPrefix = 'gattServiceClass.js | ';


/**
 * This class is called to setup a GATT service for a BLE peripheral. This class is based on the bluez D-Bus GATT API https://git.kernel.org/pub/scm/bluetooth/bluez.git/tree/doc/gatt-api.txt 
 * 
 * After this class is initialized call the createObjManagerIface method and pass it an array of characteristics (characteristicClass.js).  
 * This method will create the Object Manager interface (from the array) used by the Bluez daemon to setup this device as a BLE peripheral.  
 * To inform the Bluez daemon this server is ready to be registered as a bluetooth service call the registerGattService method as a final step.   
 * In turn the Bluez daemon will make a call back to the object manager interface’s GetManagedObjects method.
 * 
 * * **UUID**: Is the unique UUID number for this service. If you need a number visit https://www.uuidgenerator.net/
 * * **node**: Is the node name for the server top level node (user friendly name)
 * * **DBus**: Is a D-Bus object based on dBus-native with access to the systembus.  
 *
 * @param {string} UUID
 * @param {string} node
 * @param {object} DBus
 */
class gattService{
  constructor(rootDBusObj = Dbus.registerService('system', 'com.netConfig').createObject('/com/netConfig'), sPath = "/com/netConfig",  UUID = "5a0379a8-d692-41d6-b51a-d1730ea6b9d6", ){
    this.DBusOld = {};
    this._rootDBusObj = rootDBusObj
    this._interfaceAdd = 'org.bluez.GattService1'
    this.servicePath = sPath;
    this.UUID = UUID;
    this.prmary = true;
    this._iface1 = this._rootDBusObj.createInterface(this._interfaceAdd);

    this._iface1.addProperty('Primary', {
      type: {type: 'b'},
      getter: (callback)=>{
        callback(null, this.prmary);
      }
    });

    this._iface1.addProperty('UUID', {
      type: {type: 's'},
      getter: (callback)=>{
          callback(null, this.UUID);
      }
    });    

    logit('Exporting '+ this._interfaceAdd +' interface for the ' + this.servicePath + ' node.')
    this._iface1.update();

  };

  /**
   * This method creates the object manager interface from an array of charcteristics.  
   * * **characteristics**: is an array of characteristicClass objects. 
   * 
   * @param {*} characteristics 
   */
  createObjManagerIface(characteristics = []){   
    var _serviceNode = this.servicePath;    
    var objectDescription = 
    [
      [this.servicePath,[["org.bluez.GattService1",[["UUID",["s",this.UUID]],["Primary",["b",true]]]]]]
    ];
    characteristics.forEach(function(char){
      var _node = char.node;
      var _UUID = char.UUID;
      var _flags = char.flags;
      var _notifying = char.iface.Notifying

      objectDescription.push([_serviceNode+"/"+_node,[["org.bluez.GattCharacteristic1",[["UUID",["s",_UUID]],["Service",["o",_serviceNode]],["Flags",["as",_flags]],["Notifying",["b",_notifying]]]]]]);
      // objectDescription.push([_serviceNode+"/"+_node+"/userDescription",[["org.bluez.GattDescriptor1",[["UUID",["s","00002901-0000-1000-8000-00805f9b34fb"]],["Characteristic",["o",_serviceNode+"/"+_node]],["Flags",["as",["read"]]]]]]]);
    });

    // objectDescription = [
    //   ['/com/sampleApp',
    //     [
    //       ['org.bluez.GattService1',[
    //           ['UUID', ['s', '27b5244f-94f3-4011-be53-6ac36bf22cf1' ]],
    //           ['Primary', ['b', true]]
    //         ]
    //       ]
    //     ]
    //   ]
    // ];

    // objectDescription = ['org.bluez.GattService1',
    //   {'Primary': true},
    //   {'UUID': '27b5244f-94f3-4011-be53-6ac36bf22cf1'}
    // ]; 
 
    // objectDescription = [{'org.bluez.GattService1':{
    //   'Primary': true,
    //   'UUID': '27b5244f-94f3-4011-be53-6ac36bf22cf1'}
    // }]; 

    // objectDescription = [{'org.bluez.GattService1':[
    //   {'Primary': true},
    //   {'UUID': '27b5244f-94f3-4011-be53-6ac36bf22cf1'}]
    // }]; //a{sa{sv}}



    objectDescription = [['com.rgMan'],[ {'org.bluez.GattService1':[
      {'Primary': true},
      {'UUID': '27b5244f-94f3-4011-be53-6ac36bf22cf1'}]
    }]]; //a{sa{sv}}    

    this._iface_OM = this._rootDBusObj.createInterface('org.freedesktop.DBus.ObjectManager');
    // this._iface_OM.addMethod('GetManagedObjects', {out: {type: 'a{oa{sa{sv}}}', name: 'dict_entry'}}, (cback)=>{

    this._iface_OM.addMethod('GetManagedObjects', {out: {type: 'a{sa{sv}}', name: 'dict_entry'}}, (cback)=>{
      logit('GetManagedObjects method called. Responding with object description.');  
      logit('__________________________________________________________________\n');
      console.dir(objectDescription, {depth: null});
      cback(null, objectDescription)
      logit('__________________________________________________________________');
      // I would like to fire an event here so we know when the service is ready for calls
    });

    this._iface_OM.update();
    logit('Exporting org.freedesktop.DBus.ObjectManager interface for the ' + this.servicePath + ' node.')
  };

 /**
 * This method should be called after the createObjeMangerIface has been called to setup the object manager interface.
 * When this method is called it passess the object manger interface to the BlueZ daemon trigging the process in the BlueZ daemon that creates a BLE server.
 */
  registerGattService(){
    var service = this.DBusOld.getService('org.bluez');
    var objectPath = '/org/bluez/hci0'
    var iface = 'org.bluez.GattManager1'
    service.getInterface(objectPath, iface, (err, iface) => {
      if(err){
        console.error('Failed to request interface ' + iface + ' at ' + objectPath);
        console.error(err);
        return;
      }
      console.debug('gattServiceClass.js -> Registering application with org.bluez');		
      iface.RegisterApplication(this.servicePath, [], (err, str) => {
        if (err) {
          console.error(`Error while calling registerApplication: ${err}`);
        } else if (str) {
          console.debug(`gattServiceClass.js -> register Applicaiton returned: ${str}`);
        }
      });
    })
  };

  /**
   * This unregisters the services that has been previously registered.  Note it does not stop broadcast of a service. 
   */
  unRegisterGattService(){
    var service = this.DBusOld.getService('org.bluez');
    var objectPath = '/org/bluez/hci0'
    var iface = 'org.bluez.GattManager1'
    service.getInterface(objectPath, iface, (err, iface) => {
      if(err){
        console.error('Failed to request interface ' + iface + ' at ' + objectPath);
        console.error(err);
        return;
      }
      console.debug('gattServiceClass.js -> Unregistering application with org.bluez');		
      iface.UnregisterApplication(this.servicePath, (err, str) => {
        if (err) {
          console.error(`Error while calling UnregisterApplication: ${err}`);
        } else if (str) {
          console.debug(`gattServiceClass.js -> Unregister Applicaiton returned: ${str}`);
        }
      });
    })
  };

  clearAllNotifications(characteristics = []){   
    characteristics.forEach(function(char){
      char.iface.Notifying = false;
    });
  };

  /** Checks all characteristics and returns true if any have iface.Notifying true
   * 
   * @param {[object]} characteristics is an array of characteristics 
   * @return {boolean} true if any characteristic is notifying. 
   */
  isAnyoneNotifying(characteristics = []){
    var chk = false
    characteristics.forEach(function(char){
      if(char.iface.Notifying == true){
        console.debug(char.iface.UUID + ' is notifying.');
        chk = true;
      };
    });
    return chk;
  };

};

function logit(txt = ''){
  console.debug(logPrefix + txt);
};

module.exports = gattService;