/**
 * This class is called to setup a GATT service for a BLE peripheral. This class is based on the bluez D-Bus GATT API https://git.kernel.org/pub/scm/bluetooth/bluez.git/tree/doc/gatt-api.txt 
 * 
 * After this class is initialized call the createObjManagerIface method and pass it an array of characteristics (characteristicClass.js).  
 * This method will create the Object Manager interface (from the array) used by the Bluez daemon to setup this device as a BLE peripheral.  
 * To inform the Bluez daemon this server is ready to be registered as a bluetooth service call the registerGattService method as a final step.   
 * In turn the Bluez daemon will make a call back to the object manager interface’s GetManagedObjects method.
 * 
 * * **UUID**: Is the unique UUID number for this services. If you need a number visit https://www.uuidgenerator.net/
 * * **node**: Is the node name for the server top level node (user friendly name)
 * * **DBus**: Is a D-Bus object based on dBus-native with access to the systembus.  
 *
 * @param {string} UUID
 * @param {string} node
 * @param {object} DBus
 */
class gattService{
  constructor(UUID = "5a0379a8-d692-41d6-b51a-d1730ea6b9d6",  node = "/com/netConfig", DBus = {}){
    this.DBus = DBus;
    this.UUID = UUID;
    this.node = node;

    this.ifaceDesc = {
        name: 'org.bluez.GattService1',
        methods: {
        },
        properties: {
          Primary: 'b',
          UUID: 's'
        },
        signals: {
        }
      };
    this.iface = {
        Primary: true,
        UUID: this.UUID
      };      
      
    console.log('Exporting D-Bus interface for ' + this.node + ' Gatt service.');
    this.DBus.exportInterface(this.iface, this.node, this.ifaceDesc);
  }

  /**
   * This method creates the object manager interface from an array of charcteristics.  
   * * **characteristics**: is an array of characteristicClass objects. 
   * 
   * @param {*} characteristics 
   */
  createObjManagerIface(characteristics = []){   
    var _serviceNode = this.node;    
    var objectDescription = 
    [
      [this.node,[["org.bluez.GattService1",[["UUID",["s",this.UUID]],["Primary",["b",true]]]]]]
    ];
    characteristics.forEach(function(char){
      var _node = char.node;
      var _UUID = char.UUID;
      var _flags = char.flags;
      objectDescription.push([_serviceNode+"/"+_node,[["org.bluez.GattCharacteristic1",[["UUID",["s",_UUID]],["Service",["o",_serviceNode]],["Flags",["as",_flags]]]]]]);
      //objectDescription.push([_serviceNode+"/"+_node+"/userDescription",[["org.bluez.GattDescriptor1",[["UUID",["s","00002901-0000-1000-8000-00805f9b34fb"]],["Characteristic",["o",_serviceNode+"/"+_node]],["Flags",["as",[["read"]]]]]]]]);
    });

    var ifaceDesc = {
      name: 'org.freedesktop.DBus.ObjectManager',
      methods: {
          GetManagedObjects: ['', 'a{oa{sa{sv}}}', [], ['dict_entry']]
      },
      properties: {
      },
      signals: {
      }
    };

    var iface = {
      GetManagedObjects: ()=> {
        console.log('GetManagedObjects method called. Responding with object description.');  
        console.log('__________________________________________________________________');
        console.dir(objectDescription, {depth: null});
        console.log('__________________________________________________________________');
        return objectDescription;
      }
    };
    this.DBus.exportInterface(iface, this.node, ifaceDesc);
    console.log('Added objectManager interface to Gatt Service.');
  };

/*  The following worked with the previous version of DBus
  createObjManagerIface(characteristics = []){   
    var _serviceNode = this.node;    
    var objectDescription = 
    [
      [this.node,[["org.bluez.GattService1",[["UUID",["s",this.UUID]],["Primary",["b",true]]]]]]
    ];
    characteristics.forEach(function(char){
      var _node = char.node;
      var _UUID = char.UUID;
      var _flags = char.flags;
      objectDescription.push([_serviceNode+"/"+_node,[["org.bluez.GattCharacteristic1",[["UUID",["s",_UUID]],["Service",["o",_serviceNode]],["Flags",["as",_flags]]]]]]);
      objectDescription.push([_serviceNode+"/"+_node+"/userDescription",[["org.bluez.GattDescriptor1",[["UUID",["s","00002901-0000-1000-8000-00805f9b34fb"]],["Characteristic",["o",_serviceNode+"/"+_node]],["Flags",["as",[["read"]]]]]]]]);
    });

    var ifaceDesc = {
      name: 'org.freedesktop.DBus.ObjectManager',
      methods: {
          GetManagedObjects: ['', 'a{oa{sa{sv}}}', [], ['dict_entry']]
      },
      properties: {
      },
      signals: {
      }
    };

    var iface = {
      GetManagedObjects: ()=> {
        console.log('GetManagedObjects method called. Responding with object description.');  
        return objectDescription;
      }
    };
    this.DBus.exportInterface(iface, this.node, ifaceDesc);
    console.log('Added objectManager interface to Gatt Service.');
  };
  */




/**
 * This method should be called after the createObjeMangerIface has been called to setup the object manager interface.
 * When this method is called it passess the object manger interface to the BlueZ daemon trigging the process in the BlueZ daemon that creates a BLE server.
 */
  registerGattService(){
    var service = this.DBus.getService('org.bluez');
    var objectPath = '/org/bluez/hci0'
    var iface = 'org.bluez.GattManager1'
    service.getInterface(objectPath, iface, (err, iface) => {
      if(err){
        console.error('Failed to request interface ' + iface + ' at ' + objectPath);
        console.error(err);
        return;
      }
      console.log('Registering application with org.bluez');		
      iface.RegisterApplication(this.node, [], (err, str) => {
        if (err) {
          console.error(`Error while calling registerApplication: ${err}`);
        } else if (str) {
          console.log(`register Applicaiton returned: ${str}`);
        }
      });
    })
  };
};


module.exports = gattService;