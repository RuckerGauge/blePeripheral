class gattService{
  constructor(
    UUID = "5a0379a8-d692-41d6-b51a-d1730ea6b9d6", 
    node = "/com/netConfig",
    DBus = {}
    ){
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
      objectDescription.push([_serviceNode+"/"+_node+"/desc0",[["org.bluez.GattDescriptor1",[["UUID",["s","2901-0000-1000-8000-00805f9b34fb"]],["Characteristic",["o",_serviceNode+"/"+_node]],["Flags",["as",[["read"]]]]]]]]);
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
      GetManagedObjects: function() {
        console.log('GetManagedObjects method called. Responding with object description.');       
        return objectDescription;
      }
    }
    this.DBus.exportInterface(iface, this.node, ifaceDesc);
    console.log('Added objectManager interface to Gatt Service.');
  };

  createObjManagerIfaceBACKUP(characteristics = []){   
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
      GetManagedObjects: function() {
        console.log('GetManagedObjects method called. Responding with object description.');       
        return objectDescription;
      }
    }
    this.DBus.exportInterface(iface, this.node, ifaceDesc);
    console.log('Added objectManager interface to Gatt Service.');
  };

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