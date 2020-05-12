const Dbus =  require("dbus");
const logPrefix = 'advertisingClass.js | ';

// const serverUUID = Symbol();
// const servicePath = Symbol();
// const dBus = Symbol();

/**
 * This class creates a BLE advertisement based on the BlueZ advertising API https://git.kernel.org/pub/scm/bluetooth/bluez.git/tree/doc/advertising-api.txt
 * 
 * * **DBus**: Is ad Dbus object to the systembus
 * * **ServicePath**: is the parent node path this advertisement will be attached to as ServicePath/advertisement
 * * **ServerUUID**: is the UUID number to advertise for this peripheral.
 * 
 * @param {object} DBus
 * @param {string} ServicePath '/com/netConfig'
 * @param {string} ServerUUID '5a0379a8-d692-41d6-b51a-d1730ea6b9d6'
 */
class advertisement{
    constructor(DBusClient = Dbus.getBus('system'), rootNodeObj = Dbus.registerService('system', 'com.netConfig').createObject('/com/netConfig'), sPath = '/com/netConfig' , UUID = '5a0379a8-d692-41d6-b51a-d1730ea6b9d6'){
        this._DBusClient = DBusClient;
        // this._dBusService = DBusService;
        this._interfaceAddress = 'org.bluez.LEAdvertisement1'
        this.servicePath = sPath;
        this.UUID = UUID;

        this._nodeObj = rootNodeObj;
        this._iface1 = this._nodeObj.createInterface(this._interfaceAddress);

        this._iface1.addMethod('Release', {}, (cback)=>{
            logit('Advertising API has removed advertisement.')
        })

        this._iface1.addProperty('Type', {
            type: {type: 's'},
            getter:(callback)=>{
                callback(null, 'peripheral');
            }
        });

        this._iface1.addProperty('ServiceUUIDs', {
            type: {type: 'as'},
            getter: (callback)=>{
                callback(null, [this.UUID]);
            }
        });

        logit('Exporting '+ this._interfaceAddress +' interface for the ' + this.servicePath + ' node.')
        this._iface1.update();

        // this[dBus] = DBus;
        // this[servicePath] = ServicePath;
        // this[serverUUID] = ServerUUID;
        // var node = this[servicePath] + '/advertisement';
        // var ifaceDesc = {
        //     name: 'org.bluez.LEAdvertisement1',
        //     methods: {
        //     Release: ['', '', [], []]
        //     },
        //     properties: {
        //     Type: 's',
        //     ServiceUUIDs:'as',
        //     },
        //     signals: {
        //     }
        // };
        // var iface = {
        //     Release: function(){
        //     console.debug('advertisingClass.js -> Advertising API has removed advertisement.')
        //     },
        //     Type: 'peripheral',
        //     ServiceUUIDs:[this[serverUUID]],
        // };
        // console.debug('advertisingClass.js -> Exporting D-Bus interface for BLE advertising');
        // this[dBus].exportInterface(iface, node, ifaceDesc);
    };

    /**
     * Registers an advertisement object to be sent over the LE Advertising channel. 
     * 
     * See the bluez LE Advertising Manager API https://git.kernel.org/pub/scm/bluetooth/bluez.git/tree/doc/advertising-api.txt#n143
     */
    startAdvertising(){
        logit('Calling RegisterAdvertisement on org.bluez...');
        // var node = this.servicePath + '/advertisement';
        var node = this.servicePath;
        this._DBusClient.getInterface('org.bluez', '/org/bluez/hci0', 'org.bluez.LEAdvertisingManager1',(err, iface)=>{
            if(err){
                logit("Error with interface to 'org.bluez', '/org/bluez/hci0', 'org.bluez.LEAdvertisingManager1'");
                console.error('Failed to request interface ', err)
            } else {
                iface.RegisterAdvertisement(node, [], (err, result)=>{
                    if(err){
                      logit('Error calling RegisterAdvertisement method.')
                      console.error('Error calling RegisterAdvertisement method.', err);

                    } else {
                      logit('RegisterAdvertisement called.  Result = ' + result);
                    };
                });
            }; 
        });




        // var node = this[servicePath] + '/advertisement';
        // var service = this[dBus].getService('org.bluez');
        // var objectPath = '/org/bluez/hci0'
        // var iface = 'org.bluez.LEAdvertisingManager1'
        // service.getInterface(objectPath, iface, (err, iface) => {
        //     if(err){
        //         console.error('Failed to request interface ' + iface + ' at ' + objectPath);
        //         console.error(err);
        //         return;
        //     }
                
        //     iface.RegisterAdvertisement(node, [], (err, str) => {
        //         if (err) {
        //         console.error(`Error while calling RegisterAdvertisement: ${err}`);
        //         } else if (str) {
        //         console.debug(`advertisingClass.js -> RegisterAdvertisement returned: ${str}`);
        //         } else {
        //         console.debug('advertisingClass.js -> Advertising primary service and waiting for Bluetooth LE connections...');
        //         }
        //     });
        // });
    };

    /**
     * Unregisters an BLE advertisement that has been	previously registered.
     * See the bluez LE Advertising Manager API https://git.kernel.org/pub/scm/bluetooth/bluez.git/tree/doc/advertising-api.txt#n169
     */
    stopAdvertising(){
        logit('Calling UnregisterAdvertisement on org.bluez...');
        var node = this.servicePath + '/advertisement';
        this._DBusClient.getInterface('org.bluez', '/org/bluez/hci0', 'org.bluez.LEAdvertisingManager1',(err, iface)=>{
            if(err){
                logit("Error with interface to 'org.bluez', '/org/bluez/hci0', 'org.bluez.LEAdvertisingManager1'");
                console.error('Failed to request interface ', err)
            } else {
                iface.UnregisterAdvertisement(node, [], (err, result)=>{
                    if(err){
                      logit('Error calling UnregisterAdvertisement method.')
                      console.error('Error calling UnregisterAdvertisement method.', err);

                    } else {
                      logit('UnregisterAdvertisement called.  Result = ' + result);
                    };
                });
            }; 
        });


        // var node = this[servicePath] + '/advertisement';
        // var service = this[dBus].getService('org.bluez');
        // var objectPath = '/org/bluez/hci0'
        // var iface = 'org.bluez.LEAdvertisingManager1'
        // service.getInterface(objectPath, iface, (err, iface) => {
        //     if(err){
        //         console.error('Failed to request interface ' + iface + ' at ' + objectPath);
        //         console.error(err);
        //         return;
        //     }
                
        //     iface.UnregisterAdvertisement(node, (err, str) => {
        //         if (err) {
        //         console.error(`Error while calling UnregisterAdvertisement: ${err}`);
        //         } else if (str) {
        //         console.debug(`advertisingClass.js -> UnregisterAdvertisement returned: ${str}`);
        //         } else {
        //         console.debug('advertisingClass.js -> Stopped advertising primary service and waiting for Bluetooth LE connections...');
        //         }
        //     });
        // });
    };
};

function logit(txt = ''){
    console.debug(logPrefix + txt);
};

module.exports = advertisement;