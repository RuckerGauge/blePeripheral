const cp = require('child_process');

const logPrefix = 'adapterClass.js | ';

class adapter{
    /**
     * This class uses the bluez adapter API to read and set properties of the physical bluetooth adapter.
     * For more information see https://git.kernel.org/pub/scm/bluetooth/bluez.git/tree/doc/adapter-api.txt
     */
    constructor(){
        this.ifaceAddress = 'org.bluez.Adapter1'
    };

    /**
     * This method will enable and disable pairing on the physical adapter.  By default this is disabled.  To allolw a user to pair / bond with this peripheral you must call this method with true.  Then when the central tries to access a secure characteristic they will be allowed to pair and bond.
     * This method is usualy called as the result of a user pusing a pair button on the physical device.  Once enabled the device will remain pariable until this method is called agian and passed a boolean false.
     * 
     * @param {boolean} booleanValue false
     */
    pairModeOn(booleanValue = false){
        logit('setting pairable = ' + booleanValue);
        this.setBooleanProperty('Pairable', booleanValue);
    }

    /**
     * Turns the power on or off to the physical Bluetooth Adapter.  True = on, false = off,
     * @param {boolean} booleanValue false
     */
    powerOn(booleanValue = false){
        logit('setting power = ' + booleanValue);
        this.setBooleanProperty('Powered', booleanValue);
    }

  /** Synchronously reads a property and retuns value as a string.  Returns Null if error.
    * 
    * @param {string} propertyName = Property Name to read
    * @param {string} objectPath = Object path for example /org/bluez/hci0
    * @returns {string} returns property value as string
    */
   getPropertySync(propertyName =  'Pairable', objectPath = '/org/bluez/hci0'){  
    let rString = null;
    try{
        let rsltBuffer = cp.execSync('/usr/bin/gdbus call --system --dest org.bluez --object-path '+ objectPath+' --method org.freedesktop.DBus.Properties.Get ' + this.ifaceAddress + ' ' + propertyName);
        rString = String(rsltBuffer);
        rString = rString.split('<')[1].split('>')[0];
        if(rString.indexOf("'") == 0 && rString.lastIndexOf("'"  == (rString.length - 1))){
            rString = rString.slice(1, rString.length - 1);
        }; 
    } catch(err){
        console.error('Error with getPropertySync for ' + propertyName + ' at ' + objectPath);
    }
    return rString;
    };

    /** Reads a property and returns a promise.
     *  resolved promise can be a string or bool.
     * @param {string} propertyName = Property Name to read
     * @param {string} objectPath = Object path for example '/org/bluez/hci0'
     * @returns {Promise<string|boolean>} returns promise that will be either a string or boolean
     */
    getProperty(propertyName =  'Pairable', objectPath = '/org/bluez/hci0'){
        return new Promise((resolve, reject)=>{
            cp.exec('/usr/bin/gdbus call --system --dest org.bluez --object-path '+ objectPath+' --method org.freedesktop.DBus.Properties.Get ' + this.ifaceAddress + ' '+ propertyName, (error, stdOut, stdErr)=>{
                if (error){
                console.error('Error executing Get Property for ' + propertyName + ' at ' + objectPath, error);
                reject(error);
                } else {
                    if (stdErr){
                        console.error('Error getting property for ' + propertyName + ' at ' + objectPath, stdErr);
                        reject(stdErr);
                    } else {
                        let rString = String(stdOut).trim();
                        rString = rString.split('<')[1].split('>')[0];
                        if(rString.indexOf("'") == 0 && rString.lastIndexOf("'"  == (rString.length - 1))){
                        rString = rString.slice(1, rString.length - 1);
                        };
                        if(rString == 'true'){rString = true;}
                        else if(rString == 'false'){rString = false;};
                        resolve(rString);
                    };
                };
            });
        });
    };

    /**
     * Logs all properties (synchronously) for deviceObjPath to the console. Used during develoment to get a list of properties.
     * @param {string} objectPath '/org/bluez/hci0'
     * @returns {object} returns an object of key value pairs = to device proprities.
     */
    logAllProperties(objectPath = '/org/bluez/hci0'){
        logit('Synchronously logging all properties for ' + objectPath);
        let rsltObj = {};
        try{
            let rsltBuffer = cp.execSync('/usr/bin/gdbus call --system --dest org.bluez --object-path '+ objectPath+' --method org.freedesktop.DBus.Properties.GetAll ' + this.ifaceAddress);
            rsltObj = parseProperties(rsltBuffer);
            console.dir(rsltObj,{depth:null});
        } catch(err){
            console.error('Error with logAllProperties for ' + objectPath, err);
        };
        return rsltObj;
    };

    /**
     * Sets the boolean value of a property.  For a list of propertyNames call to logAllProperties.
     * This method can only be used to set properties that have boolean vlues (true or false)
     * @param {string} propertyName 'Pairable'
     * @param {boolean} value true
     * @param {string} objectPath '/org/bluez/hci0'
     * @returns {string} result of dbus-send command. Empty if error
     */
    setBooleanProperty(propertyName = 'Pairable', value = true, objectPath = '/org/bluez/hci0'){
        let rsltObj = '';
        try{
            rsltObj = cp.execSync('/usr/bin/dbus-send --system --dest=org.bluez --print-reply '+ objectPath +' org.freedesktop.DBus.Properties.Set string:' + this.ifaceAddress + ' string:' + propertyName + ' variant:boolean:'+ value);
            rsltObj = String(rsltObj);
        } catch(err){
            console.error('Error with setBooleanProperty for ' + objectPath, err);
        };
        return rsltObj;
    };
};

function parseProperties(propeties){
    // parses the following:
    // ->({'Address': <'B4:F6:1C:53:EF:B3'>, 'AddressType': <'public'>, 'Name': <'iPad'>, 'Alias': <'iPad'>, 'Appearance': <uint16 640>, 'Icon': <'multimedia-player'>, 'Paired': <true>, 'Trusted': <false>, 'Blocked': <false>, 'LegacyPairing': <false>, 'Connected': <true>, 'UUIDs': <['00001800-0000-1000-8000-00805f9b34fb', '00001801-0000-1000-8000-00805f9b34fb', '00001805-0000-1000-8000-00805f9b34fb', '0000180a-0000-1000-8000-00805f9b34fb', '0000180f-0000-1000-8000-00805f9b34fb', '7905f431-b5ce-4e99-a40f-4b1e122d00d0', '89d3502b-0f36-433a-8ef4-c502ad55f8dc', '9fa480e0-4967-4542-9390-d343dc5d04ae', 'd0611e78-bbb4-4591-a5f8-487910ae4366']>, 'Adapter': <objectpath '/org/bluez/hci0'>, 'ServicesResolved': <true>},)<-
    let returnObj = {};
    let pString = String(propeties).trim();
    pString = pString.slice(2, pString.length - 3);   //Remove ({ from front and },) from end
    pString = pString + ','   // put , back at end 
    let psArray = pString.split('>,');
    psArray.forEach((val, ndx)=>{
      let fArray = val.split(': <');
      if(fArray.length == 2){
        fArray[0] = fArray[0].trim();
        fArray[1] = fArray[1].trim();
        let fName = fArray[0].slice(1, fArray[0].length - 1); //Remove ' from front and ' from end
        let fValue = fArray[1];
        if(fValue.indexOf("'") == 0 && fValue.lastIndexOf("'"  == (fValue.length - 1))){
          fValue = fValue.slice(1, fValue.length - 1);
        }; 
        if(fValue == 'true'){fValue = true;}
        else if(fValue == 'false'){fValue = false;};
        returnObj[fName] = fValue;
      };
    });
    return returnObj;
  };

function logit(txt = ''){
    console.debug(logPrefix + txt);
};

module.exports = adapter;


    // /**
    //  * Reads the value of a property.  Returns a promise that can be used with async and await commands.
    //  * @param {*} propertyName 'Pairable'
    //  * @param {*} deviceObjPath '/org/bluez/hci0'
    //  */
    // getProperty_old(propertyName =  'Pairable', deviceObjPath = '/org/bluez/hci0'){  
    //     var promise = new Promise((resolve, reject)=>{
    //         this[service].getInterface(deviceObjPath, 'org.freedesktop.DBus.Properties', (err, iface) => {
    //             if(err){
    //                 console.error('Failed to request interface ' + iface + ' at ' + deviceObjPath);
    //                 console.error(err);
    //                 reject(new Error('Failed to request interface ' + iface + ' at ' + deviceObjPath));
    //             }
    //             iface.Get( this[deviceName], propertyName, (err, str) => {
    //                 if (err) {
    //                     //console.error('Error while calling interface ' + iface + ' at ' + deviceObjPath + ', for ' + propertyName);
    //                     reject('Error looking up ' + propertyName + ' for ' + deviceObjPath);
    //                 } else if (str) {
    //                     var x = str[1].toString();
    //                     if(x == 'true'){x = true;}
    //                     else if(x == 'false'){x = false;};
    //                     console.debug(propertyName + ' = ' + x );
    //                     resolve(x);
    //                 }
    //             });
    //         });
    //     });
    // return promise;
    // };


    // /**
    //  * Sets the boolean value of a property.  For a list of propertyNames call to logAllProperties.
    //  * This method can only be used to set properties that have boolean vlues (true or false)
    //  * @param {string} propertyName 'Pairable'
    //  * @param {boolean} value true
    //  * @param {string} deviceObjPath '/org/bluez/hci0'
    //  */
    // setBooleanProperty_old(propertyName =  'Pairable', value = true, deviceObjPath = '/org/bluez/hci0'){
    //     this[service].getInterface(deviceObjPath, 'org.freedesktop.DBus.Properties', (err, iface) => {
    //         if(err){
    //             console.error('Failed to SetProperty interface ' + iface + ' at ' + deviceObjPath);
    //             console.error(err);
    //             return;
    //         }
    //         iface.Set( this[deviceName], propertyName, ["b",value], (err, str) => {
    //             if (err) {
    //             console.error('Error while calling setProperty interface ' + iface + ' at ' + deviceObjPath + ', for ' + propertyName);
    //             } else if (str) {
    //             console.debug(propertyName + ' = ' + str[1]);
    //             return str[1];
    //             }
    //         });
    //     })
    // };