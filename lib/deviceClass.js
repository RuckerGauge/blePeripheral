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
    try{
      let rsltBuffer = cp.execSync('/usr/bin/gdbus call --system --dest org.bluez --object-path '+ objectPath+' --method org.freedesktop.DBus.Properties.GetAll org.bluez.Device1');
      // let rsltStr = String(rsltBuffer);
      // rsltStr = rsltStr.slice(1, rsltStr.length - 1);   //Remove ( from front and ) from end
      // logit('before parse:'+rsltStr);
      let rsltObj = parseProperties(rsltBuffer);
      logit('all Properties for ' + objectPath + ':');
      // logit(rsltStr);
      console.dir(rsltObj,{depth:null});
    } catch(err){
      console.error('Error with logAllProperties for ' + objectPath, err);
    };
  };

  logAllProperties_old(deviceObjPath = '/org/bluez/hci0/dev_00_DB_70_C8_0C_7F'){
    this[service].getInterface(deviceObjPath, 'org.freedesktop.DBus.Properties', (err, iface) => {
    if(err){
      console.error('Failed to request interface ' + iface + ' at ' + deviceObjPath);
      console.error(err);
      return;
    }
      //iface.GetAll( pInterfanceName, (err, str) => {
      console.debug('deviceClass.js -> calling GetAll...');
      iface.GetAll(this[deviceName], (err,str) => {
        if (err) {
        console.error(`Error while calling GetAll: ${err}`);
        } else if (str) {
          console.debug('deviceClass.js -> Get All returned:');
          if(Array.isArray(str)){
            str.forEach(function(val, index){
              var detailsObj = val[1][0][0]
              console.debug('deviceClass.js -> \t' + val[0] + ' : ' + val[1][1] + ', of type -> ' + detailsObj.type + ' <-.');
            })
            return str
          } else {
            console.debug(str);
          }
        }
      });
    })    
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
  let returnObj = {};
  let pString = String(propeties).trim();
  console.log('\n->'+pString+'<-\n');

  pString = pString.slice(2, pString.length - 3);   //Remove ({ from front and },) from end
  let psArray = pString.split('>,');
  psArray.forEach((val, ndx)=>{
    console.log('val ->' + val + '<-')
    let fArray = val.split(': <');
    if(fArray.length == 2){
      fArray[0] = fArray[0].trim()
      fArray[1] = fArray[1].trim()
      let fName = fArray[0].slice(1, fArray[0].length - 1); //Remove ' from front and ' from end
      // let fValue = fArray[1].slice(1, fArray[1].length - 1); //Remove < from front and > from end
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