const DBus = require("dbus");

const logPrefix = 'deviceClass.js | ';

class device {
    /**
     * This class uses the bluez device API to read and set properties of the connected BLE user.
     * When a remote client connects to this peripheral a representation of the remote device’s configuration is created by BlueZ.  
     * This API can be used to manage the properties of that remote client.
     * For more information see https://git.kernel.org/pub/scm/bluetooth/bluez.git/tree/doc/device-api.txt
     * @param {object} DBusClient Is a dbus system object
     */
    constructor(DBusClient = DBus.getBus('system')) {
        this._DBusClient = DBusClient;
        this._interfaceAddress = 'org.bluez.Device1'
    };

    /** Reads a property and returns a promise.
     *  resloved promise can be a string or bool.
     * @param {string} propertyName = Property Name to read
     * @param {string} objectPath = Object path for example /org/bluez/hci0/dev_00_DB_70_CC_0C_7F
     * @returns {Promise<string|boolean>} returns promise that will be either a string or boolean
     */

    getProperty(propertyName = 'Trusted', objectPath = '/org/bluez/hci0/dev_00_DB_72_C8_0C_7F') {
        return new Promise((reslove, reject) => {
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
                            reslove(result);
                        };
                    });
                };
            });
        });
    };

    /**
     * Logs all properties for deviceObjPath to the console. Used during develoment to get a list of properties.
     * @param {string} objectPath '/org/bluez/hci0/dev_00_DB_70_C8_0C_7F'
     * @returns {Promise<object>} returns object when promise is resolved of key value pairs of device proprities.
     */
    logAllProperties(objectPath = '/org/bluez/hci0/dev_00_DB_70_C8_0C_7F') {
        return new Promise((reslove, reject) => {
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
                            reslove(result);
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
     * @param {string} objectPath '/org/bluez/hci0/dev_00_DB_70_C8_0C_7F'
     */

    setBooleanProperty(propertyName = 'Trusted', value = true, objectPath = '/org/bluez/hci0/dev_00_DB_70_C8_0C_7F') {
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

module.exports = device;