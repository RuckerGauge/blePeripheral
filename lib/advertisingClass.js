// Based on BlueZ advertising API https://git.kernel.org/pub/scm/bluetooth/bluez.git/tree/doc/advertising-api.txt
class advertisement{
    constructor(DBus = {}, servicePath = '/com/netConfig' , serverUUID = '5a0379a8-d692-41d6-b51a-d1730ea6b9d6'){
        this.dBus = DBus;
        this.servicePath = servicePath;
        this.serverUUID = serverUUID;
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
    };


    /**
     * Registers an advertisement object to be sent over the LE Advertising channel. 
     * 
     * See the bluez LE Advertising Manager API https://git.kernel.org/pub/scm/bluetooth/bluez.git/tree/doc/advertising-api.txt#n143
     */
    startAdvertising(){
        var node = this[servicePath] + '/advertisement';
        var service = this[dBus].getService('org.bluez');
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
        var node = this[servicePath] + '/advertisement';
        var service = this[dBus].getService('org.bluez');
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



};

module.exports = advertisement;