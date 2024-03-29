const cp = require('child_process');

const logPrefix = 'deviceClass.js | ';

class device{
  /**
   * This class uses the bluez device API to read and set properties of the connected BLE user.
   * When a remote client connects to this peripheral a representation of the remote device’s configuration is created by BlueZ.  
   * This API can be used to manage the properties of that remote client.
   * For more information see https://git.kernel.org/pub/scm/bluetooth/bluez.git/tree/doc/device-api.txt
   */
  constructor(){
    this.ifaceAddress = 'org.bluez.Device1'
  }

  /** Synchronously reads a property and retuns value as a string.  Returns Null if error.
    * 
    * @param {string} propertyName = Property Name to read
    * @param {string} objectPath = Object path for example /org/bluez/hci0/dev_00_DB_70_C8_0C_7F
    * @returns {string} returns property value as string
    */
  getPropertySync(propertyName =  'Trusted', objectPath = '/org/bluez/hci0/dev_00_DB_70_C8_0C_7F'){  
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
   * @param {string} objectPath = Object path for example /org/bluez/hci0/dev_00_DB_70_CC_0C_7F
   * @returns {Promise<string|boolean>} returns promise that will be either a string or boolean
   */
  getProperty(propertyName =  'Trusted', objectPath = '/org/bluez/hci0/dev_00_DB_72_C8_0C_7F'){
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
   * @param {string} objectPath '/org/bluez/hci0/dev_00_DB_70_C8_0C_7F'
   * @returns {object} returns an object of key value pairs = to device proprities.
   */
  logAllProperties(objectPath = '/org/bluez/hci0/dev_00_DB_70_C8_0C_7F'){
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
   * @param {string} propertyName 'Trusted'
   * @param {boolean} value true
   * @param {string} objectPath '/org/bluez/hci0/dev_00_DB_70_C8_0C_7F'
   * @returns {string} result of dbus-send command. Empty if error
   */
  setBooleanProperty(propertyName = 'Trusted', value = true, objectPath = '/org/bluez/hci0/dev_00_DB_70_C8_0C_7F'){
    let rsltObj = '';
    try{
      rsltObj = cp.execSync('/usr/bin/dbus-send --system --dest=org.bluez --print-reply '+ objectPath +' org.freedesktop.DBus.Properties.Set string:' + this.ifaceAddress + ' string:' + propertyName + ' variant:boolean:'+ value)
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

module.exports = device;