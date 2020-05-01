const Dbus =              require("dbus");
const cp =                require('child_process');
const logPrefix = 'deviceClass.js | ';
const service = Symbol();
const deviceName = Symbol();

/**
 * This class uses the bluez device API to read and set properties of the connected BLE user.
 * When a remote client connects to this peripheral a representation of the remote device’s configuration is created by BlueZ.  
 * This API can be used to manage the properties of that remote client.
 * For more information see https://git.kernel.org/pub/scm/bluetooth/bluez.git/tree/doc/device-api.txt
 * 
 */

class device{

  constructor(){
    this[service] = {}//DBus.getService('org.bluez');
    this[deviceName] = 'org.bluez.Device1';
    this.dBus = Dbus.getBus('system');
    this.serviceName = 'org.bluez'
    //this.objectPath = 'org.bluez.Device1'
    //convert this class to use gdbus
    //get all properties->  gdbus call --system --dest org.bluez --object-path /org/bluez/hci0/dev_B4_F6_1C_53_EF_B3 --method org.freedesktop.DBus.Properties.GetAll org.bluez.Device1
    //get one object->      gdbus call --system --dest org.bluez --object-path /org/bluez/hci0/dev_B4_F6_1C_53_EF_B3 --method org.freedesktop.DBus.Properties.Get org.bluez.Device1 Paired


  }

   /** Synchronously reads a property and retuns value as a string.  Returns Null if error.
    * 
    * @param {*} propertyName = Property Name to read
    * @param {*} objectPath = Object path for example /org/bluez/hci0/dev_00_DB_70_C8_0C_7F
    */
  getPropertySync(propertyName =  'Trusted', objectPath = '/org/bluez/hci0/dev_00_DB_70_C8_0C_7F'){  
    logit('Synchronously getting property '+ propertyName +' for ' + objectPath);
    let rString = null;
    try{
      let rsltBuffer = cp.execSync('/usr/bin/gdbus call --system --dest org.bluez --object-path '+ objectPath+' --method org.freedesktop.DBus.Properties.Get org.bluez.Device1 '+ propertyName);
      rString = String(rsltBuffer);
      rString = rString.split('<')[1].split('>')[0];
      if(rString.indexOf("'") == 0 && rString.lastIndexOf("'"  == (rString.length - 1))){
        rString = rString.slice(1, rString.length - 1);
      }; 
    } catch(err){
      console.error('Error with getPropertySync for ' + propertyName + ' at ' + objectPath);
    }
    logit('->' + rString + '<-');
    return rString;
  };

  /** Reads a property and returns a promise.
   *  resloved value can be a string or bool.
   * @param {*} propertyName = Property Name to read
   * @param {*} objectPath = Object path for example /org/bluez/hci0/dev_00_DB_70_C8_0C_7F
   */
  getProperty(propertyName =  'Trusted', objectPath = '/org/bluez/hci0/dev_00_DB_70_C8_0C_7F'){
    logit('Getting property '+ propertyName +' for ' + objectPath);
    return new Promise((reslove, reject)=>{
      cp.exec('/usr/bin/gdbus call --system --dest org.bluez --object-path '+ objectPath+' --method org.freedesktop.DBus.Properties.Get org.bluez.Device1 '+ propertyName, (error, stdOut, stdErr)=>{
        if (error){
          console.error('Error executing Get Property for ' + propertyName + ' at ' + objectPath, err);
          reject(error);
        } else {
          if (stdErr){
            console.error('Error getting property for ' + propertyName + ' at ' + objectPath, err);
            reject(stdErr);
          } else {
            logit('stdOut ->' + stdOut + '<-');
            let rString = String(stdOut);
            rString = rString.split('<')[1].split('>')[0];
            if(rString.indexOf("'") == 0 && rString.lastIndexOf("'"  == (rString.length - 1))){
              rString = rString.slice(1, rString.length - 1);
            };
            if(rString == 'true'){rString = true;}
            else if(rString == 'false'){rString = false;};
            reslove(rString);
          };
        };
      });
    });
  };

  /**
   * Logs all properties (synchronously) for deviceObjPath to the console. Used during develoment to get a list of properties.
   * @param {*} objectPath '/org/bluez/hci0/dev_00_DB_70_C8_0C_7F'
   */
  logAllProperties(objectPath = '/org/bluez/hci0/dev_00_DB_70_C8_0C_7F'){
    logit('Synchronously loggs all properties for ' + objectPath);
    let rsltObj = {};
    try{
      let rsltBuffer = cp.execSync('/usr/bin/gdbus call --system --dest org.bluez --object-path '+ objectPath+' --method org.freedesktop.DBus.Properties.GetAll org.bluez.Device1');
      rsltObj = parseProperties(rsltBuffer);
      logit('all Properties for ' + objectPath + ':');
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
   * @param {string} deviceObjPath '/org/bluez/hci0/dev_00_DB_70_C8_0C_7F'
   */
  setBooleanProperty(propertyName =  'Trusted', value = true, deviceObjPath = '/org/bluez/hci0/dev_00_DB_70_C8_0C_7F'){
      this[service].getInterface(deviceObjPath, 'org.freedesktop.DBus.Properties', (err, iface) => {
          if(err){
              console.error('Failed to SetProperty interface ' + iface + ' at ' + deviceObjPath);
              console.error(err);
              return;
          }
          iface.Set( this[deviceName], propertyName, ["b",value], (err, str) => {
              if (err) {
              console.error('Error while calling setProperty interface ' + iface + ' at ' + deviceObjPath + ', for ' + propertyName);
              } else if (str) {
              console.debug(propertyName + ' = ' + str[1]);
              return str[1];
              }
          });
      })
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
  return returnObj
};

function logit(txt = ''){
  console.debug(logPrefix + txt)
};

module.exports = device;