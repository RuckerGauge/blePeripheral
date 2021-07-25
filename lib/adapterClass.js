const DBus = require("dbus");

const logPrefix = 'adapterClass.js | ';

class adapter {
    /**
     * This class uses the bluez adapter API to read and set properties of the physical bluetooth adapter.  
     * To enable pairing call parModeOn(true).  Then try to read an encrypted characteristic with your smartphone.
     * For more information see https://git.kernel.org/pub/scm/bluetooth/bluez.git/tree/doc/adapter-api.txt
     * @param {object} DBusClient Is a dbus system object
     */
    constructor(DBusClient = DBus.getBus('system')) {
        this._DBusClient = DBusClient;
        this._interfaceAddress = 'org.bluez.Adapter1'
    };

    /**
     * This method will enable and disable pairing on the physical adapter.  By default this is disabled.  To allolw a user to pair / bond with this peripheral you must call this method with true.  Then when the central tries to access a secure characteristic they will be allowed to pair and bond.
     * This method is usualy called as the result of a user pusing a pair button on the physical device.  Once enabled the device will remain pariable until this method is called agian and passed a boolean false.
     * 
     * @param {boolean} booleanValue false
     */
    pairModeOn(booleanValue = false) {
        logit('setting pairable = ' + booleanValue);
        this.setBooleanProperty('Pairable', booleanValue);
    }

    /**
     * Turns the power on or off to the physical Bluetooth Adapter.  True = on, false = off,
     * @param {boolean} booleanValue false
     */
    powerOn(booleanValue = false) {
        logit('setting power = ' + booleanValue);
        this.setBooleanProperty('Powered', booleanValue);
    }

    /** Reads a property and returns a promise.
     *  resolved promise can be a string or bool.
     * @param {string} propertyName = Property Name to read
     * @param {string} objectPath = Object path for example '/org/bluez/hci0'
     * @returns {Promise<string|boolean>} returns promise that will be either a string or boolean
     */
    getProperty(propertyName = 'Pairable', objectPath = '/org/bluez/hci0') {
        return new Promise((resolve, reject) => {
            this._DBusClient.getInterface('org.bluez', objectPath, 'org.freedesktop.DBus.Properties', (err, iface) => {
                if (err) {
                    logit("Error with interface to 'org.bluez', " + objectPath + ", 'org.freedesktop.DBus.Properties'");
                    reject('Failed to request interface ', err)
                } else {
                    iface.Get(this._interfaceAddress, propertyName, (err, result) => {
                        if (err) {
                            logit('Error calling getProperty method.')
                            reject('Error calling getProperty method.', err);
                        } else {
                            resolve(result);
                        };
                    });
                };
            });
        });
    };

    /**
     * Logs all properties for deviceObjPath to the console. Used during develoment to get a list of properties.
     * @param {string} objectPath '/org/bluez/hci0'
     * @returns {Promise<object>} returns object when promise is resolved of key value pairs of device proprities.
     */
    logAllProperties(objectPath = '/org/bluez/hci0') {
        return new Promise((resolve, reject) => {
            this._DBusClient.getInterface('org.bluez', objectPath, 'org.freedesktop.DBus.Properties', (err, iface) => {
                if (err) {
                    logit("Error with interface to 'org.bluez', " + objectPath + ", 'org.freedesktop.DBus.Properties'");
                    reject('Failed to request interface ', err)
                } else {
                    iface.GetAll(this._interfaceAddress, (err, result) => {
                        if (err) {
                            logit('Error calling GetAll Properties method.')
                            reject('Error calling GetAll Properties method.', err);
                        } else {
                            console.dir(result, { depth: null });
                            resolve(result);
                        };
                    });
                };
            });
        });
    };

    /**
     * Sets the value of a property.  For a list of propertyNames call to logAllProperties.
     * As of version 2 this method can be used to set properties that have boolean values (true or false) as well as other types like string.
     * @param {string} propertyName 'Trusted'
     * @param {boolean} value true
     * @param {string} objectPath '/org/bluez/hci0'
     */

    setBooleanProperty(propertyName = 'Pairable', value = true, objectPath = '/org/bluez/hci0') {
        this._DBusClient.getInterface('org.bluez', objectPath, 'org.freedesktop.DBus.Properties', (err, iface) => {
            if (err) {
                logit("Error with interface to 'org.bluez', " + objectPath + ", 'org.freedesktop.DBus.Properties'");
                console.error('Failed to request interface ', err);
            } else {
                iface.Set(this._interfaceAddress, propertyName, value, (err, result) => {
                    if (err) {
                        logit('Error calling Set Boolean Property method. propertyName = ' + propertyName + ', objectPath = ' + objectPath);
                        console.error('Error calling Set Boolean Property method.', err);
                    };
                    if (result) {
                        logit('Result from set Property = ' + result);
                    };
                });
            };
        });
    };
};

function logit(txt = '') {
    console.debug(logPrefix + txt);
};

module.exports = adapter;
