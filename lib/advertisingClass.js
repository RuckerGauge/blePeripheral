const DBus = require("dbus");

const logPrefix = 'advertisingClass.js | ';

class advertisement {
    /**
     * This class creates a BLE advertisement based on the BlueZ advertising API https://git.kernel.org/pub/scm/bluetooth/bluez.git/tree/doc/advertising-api.txt
     
     * @param {object} rootNodeObj Is the root object of this dbus server: DBus.registerService('system', 'com.netConfig').createObject('/com/netConfig')
     * @param {string} sPath Is the node name for the server top level node (user friendly name) '/com/netConfig'
     * @param {string} UUID Is the unique UUID number for this service. If you need a number visit https://www.uuidgenerator.net/ 
     */
    constructor(rootNodeObj = DBus.registerService('system', 'com.netConfig').createObject('/com/netConfig'), sPath = '/com/netConfig', UUID = '5a0379a8-d692-41d6-b51a-d1730ea6b9d6') {
        this._DBusClient = rootNodeObj.service.bus
        this._interfaceAddress = 'org.bluez.LEAdvertisement1'
        this.servicePath = sPath;
        this.UUID = UUID;
        this._nodeObj = rootNodeObj;

        this._iface1 = this._nodeObj.createInterface(this._interfaceAddress);
        this._iface1.addMethod('Release', {}, (cback) => {
            logit('Advertising API has removed advertisement.')
        })
        this._iface1.addProperty('Type', {
            type: { type: 's' },
            getter: (callback) => {
                callback(null, 'peripheral');
            }
        });
        this._iface1.addProperty('ServiceUUIDs', {
            type: { type: 'as' },
            getter: (callback) => {
                callback(null, [this.UUID]);
            }
        });
        logit('Exporting ' + this._interfaceAddress + ' interface for the ' + this.servicePath + ' node.')
        this._iface1.update();
    };

    /**
     * Registers an advertisement object to be sent over the LE Advertising channel. 
     * 
     * See the bluez LE Advertising Manager API https://git.kernel.org/pub/scm/bluetooth/bluez.git/tree/doc/advertising-api.txt#n143
     */
    startAdvertising() {
        logit('Calling RegisterAdvertisement on org.bluez...');
        var node = this.servicePath;
        this._DBusClient.getInterface('org.bluez', '/org/bluez/hci0', 'org.bluez.LEAdvertisingManager1', (err, iface) => {
            if (err) {
                logit("Error with interface to 'org.bluez', '/org/bluez/hci0', 'org.bluez.LEAdvertisingManager1'");
                console.error('Failed to request interface ', err)
            } else {
                iface.RegisterAdvertisement(node, [], (err, result) => {
                    if (err) {
                        logit('Error calling RegisterAdvertisement method.')
                        console.error('Error calling RegisterAdvertisement method.', err);

                    } else {
                        if (result) {
                            logit('RegisterAdvertisement called.  Result = ' + result);
                        } else {
                            logit('RegisterAdvertisement complete.');
                        };

                    };
                });
            };
        });
    };

    /**
     * Unregisters an BLE advertisement that has been	previously registered.
     * See the bluez LE Advertising Manager API https://git.kernel.org/pub/scm/bluetooth/bluez.git/tree/doc/advertising-api.txt#n169
     */
    stopAdvertising() {
        logit('Calling UnregisterAdvertisement on org.bluez...');
        var node = this.servicePath;
        this._DBusClient.getInterface('org.bluez', '/org/bluez/hci0', 'org.bluez.LEAdvertisingManager1', (err, iface) => {
            if (err) {
                logit("Error with interface to 'org.bluez', '/org/bluez/hci0', 'org.bluez.LEAdvertisingManager1'");
                console.error('Failed to request interface ', err)
            } else {
                iface.UnregisterAdvertisement(node, [], (err, result) => {
                    if (err) {
                        logit('Error calling UnregisterAdvertisement method.')
                        console.error('Error calling UnregisterAdvertisement method.', err);

                    } else {
                        if (result) {
                            logit('UnregisterAdvertisement called.  Result = ' + result);
                        } else {
                            logit('UnregisterAdvertisement complete.');
                        };
                    };
                });
            };
        });
    };
};

function logit(txt = '') {
    console.debug(logPrefix + txt);
};

module.exports = advertisement;