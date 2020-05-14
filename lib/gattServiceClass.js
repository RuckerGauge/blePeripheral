const DBus =  require("dbus");

const logPrefix = 'gattServiceClass.js | ';

class gattService{
  /**
   * This class is called to setup a GATT service for a BLE peripheral. This class is based on the bluez D-Bus GATT API https://git.kernel.org/pub/scm/bluetooth/bluez.git/tree/doc/gatt-api.txt 
   * 
   * After this class is initialized call the createObjManagerIface method and pass it an array of characteristics (characteristicClass.js).  
   * This method will create the Object Manager interface (from the array) used by the Bluez daemon to setup this device as a BLE peripheral.  
   * To inform the Bluez daemon this server is ready to be registered as a bluetooth service call the registerGattService method as a final step.   
   * In turn the Bluez daemon will make a call back to the object manager interface’s GetManagedObjects method.
   * @param {object} rootNodeObj Is the root object of this dbus server: DBus.registerService('system', 'com.netConfig').createObject('/com/netConfig')
   * @param {string} sPath Is the node name for the server top level node (user friendly name) '/com/netConfig'
   * @param {string} UUID Is the unique UUID number for this service. If you need a number visit https://www.uuidgenerator.net/ 
   */
  constructor(rootNodeObj = DBus.registerService('system', 'com.netConfig').createObject('/com/netConfig'), sPath = '/com/netConfig',  UUID = '5a0379a8-d692-41d6-b51a-d1730ea6b9d6'){
    this.DBusOld = {};
    this._DBusClient = rootNodeObj.service.bus
    this._interfaceAddress =  'org.bluez.GattService1' 
    this.servicePath = sPath;
    this.UUID = UUID;
    this._nodeObj = rootNodeObj;
    this.prmary = true;

    this._iface1 = this._nodeObj.createInterface(this._interfaceAddress);
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
    logit('Exporting '+ this._interfaceAddress +' interface for the ' + this.servicePath + ' node.')
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
    var objectDescription = {
      [this.servicePath]:{
        'org.bluez.GattService1':{
          'UUID': this.UUID,
          'Primary': this.prmary
        }
      }
    }
    characteristics.forEach(function(char){
      var _node = char.node;
      var _UUID = char.UUID;
      var _flags = char.flags;
      var _notifying = char.iface.Notifying

      objectDescription[_serviceNode+"/"+_node] = {
        'org.bluez.GattCharacteristic1':{
          'UUID': _UUID,
          'Service': _serviceNode,
          'Flags': _flags,
          'Notifying': _notifying
        },
        'org.bluez.GattDescriptor1':{
          'UUID': '00002901-0000-1000-8000-00805f9b34fb',
          'Characteristic': _serviceNode+'/'+_node,
          'Flags': ['read']
        }
      }
    });

    this._iface_OM = this._nodeObj.createInterface('org.freedesktop.DBus.ObjectManager');
    this._iface_OM.addMethod('GetManagedObjects', {out: {type: 'a{oa{sa{sv}}}', name: 'dict_entry'}}, (cback)=>{
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
    logit('Calling RegisterApplication on org.bluez...')
    this._DBusClient.getInterface('org.bluez', '/org/bluez/hci0', 'org.bluez.GattManager1',(err, iface)=>{
      if(err){
        logit("Error with interface to 'org.bluez', '/org/bluez/hci0', 'org.bluez.GattManager1'");
        console.error('Failed to request interface ', err)
      } else {
        iface.RegisterApplication(this.servicePath, [], (err, result)=>{
          if(err){
            if(err.dbusName != 'org.freedesktop.DBus.Error.NoReply'){
            logit('Error registerGattService, RegisterApplication method.')
            console.error('Error registerGattService, RegisterApplication method.', err);
            };
            } else {
              if(result){
                logit('RegisterApplication called.  Result = ' + result);
            } else {
                logit('RegisterApplication complete.');
            };
          };
        })
      };
    })
  };

  /**
   * This unregisters the services that has been previously registered.  Note it does not stop broadcast of a service. 
   */
  unRegisterGattService(){
    logit('Calling UnregisterApplication on org.bluez...')
    this._DBusClient.getInterface('org.bluez', '/org/bluez/hci0', 'org.bluez.GattManager1',(err, iface)=>{
      if(err){
        logit("Error with interface to 'org.bluez', '/org/bluez/hci0', 'org.bluez.GattManager1'");
        console.error('Failed to request interface ', err)
      } else {
        iface.UnregisterApplication(this.servicePath, [], (err, result)=>{
          if(err){
            if(err.dbusName != 'org.freedesktop.DBus.Error.NoReply'){
            logit('Error registerGattService, UnregisterApplication method.')
            console.error('Error registerGattService, UnregisterApplication method.', err);
            };
            } else {
              if(result){
                logit('UnregisterApplication called.  Result = ' + result);
            } else {
                logit('UnregisterApplication complete.');
            };
          };
        })
      };
    })
  };

  /**
   * sets all characteristics iface.Notifying = false
   * @param {[object]} characteristics is an array of characteristicClass objects
   */
  clearAllNotifications(characteristics = []){   
    characteristics.forEach(function(char){
      char.clearNotify();
      // char.iface.Notifying = false;
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