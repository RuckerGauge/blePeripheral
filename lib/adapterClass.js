const service = Symbol();
const deviceName = Symbol();
/**
 * This class uses the bluez adapter API to read and set properties of the bluetooth adapter.
 * For more information see https://git.kernel.org/pub/scm/bluetooth/bluez.git/tree/doc/adapter-api.txt
 * 
 * * **DBus**: Is ad Dbus object to the systembus
 * 
 * @param {object} DBus
 */
class adapter{
    constructor(DBus = {}){
        this[service] = DBus.getService('org.bluez');
        this[deviceName] = 'org.bluez.Adapter1';
    };

    /**
     * This method will enable and disable pairing on the physical adapter.  By default this is disabled.  To allolw a user to pair / bond with this Peripheral you must call this method with true.  Then when the central tries to access a secure characteristic they will be allowed to pair and bond.
     * This method is usualy called as the result of a user pusing a pair button on the physical device.  Once enabled the device will remain pariable until this method is called agian and passed a boolean false.
     * 
     * @param {*} booleanValue 
     */
    pairModeOn(booleanValue = false){
        console.log('setting pairable = ' + booleanValue);
        this.setBooleanProperty('Pairable', booleanValue);
    }

    getProperty(propertyName =  'Pairable', deviceObjPath = '/org/bluez/hci0'){  
        var promise = new Promise((resolve, reject)=>{
            this[service].getInterface(deviceObjPath, 'org.freedesktop.DBus.Properties', (err, iface) => {
                if(err){
                    console.error('Failed to request interface ' + iface + ' at ' + deviceObjPath);
                    console.error(err);
                    reject(new Error('Failed to request interface ' + iface + ' at ' + deviceObjPath));
                }
                iface.Get( this[deviceName], propertyName, (err, str) => {
                    if (err) {
                        //console.error('Error while calling interface ' + iface + ' at ' + deviceObjPath + ', for ' + propertyName);
                        reject('Error looking up ' + propertyName + ' for ' + deviceObjPath);
                    } else if (str) {
                        var x = str[1].toString();
                        if(x == 'true'){x = true;}
                        else if(x == 'false'){x = false;};
                        console.log(propertyName + ' = ' + x );
                        resolve(x);
                    }
                });
            });
        });
    return promise;
    };

    showAllProperties(deviceObjPath = '/org/bluez/hci0'){
        this[service].getInterface(deviceObjPath, 'org.freedesktop.DBus.Properties', (err, iface) => {
        if(err){
          console.error('Failed to request interface ' + iface + ' at ' + deviceObjPath);
          console.error(err);
          return;
        }
          //iface.GetAll( pInterfanceName, (err, str) => {
          console.log('calling GetAll...');
          iface.GetAll(this[deviceName], (err,str) => {
            if (err) {
            console.error(`Error while calling GetAll: ${err}`);
            } else if (str) {
              console.log('Get All returned:');
              if(Array.isArray(str)){
                str.forEach(function(val, index){
                  var detailsObj = val[1][0][0]
                  console.log('\t' + val[0] + ' : ' + val[1][1] + ', of type -> ' + detailsObj.type + ' <-.');
                })
                return str
              } else {
                console.log(str);
              }
            }
          });
        })    
    };

  
    setBooleanProperty(propertyName =  'Pairable', value = true, deviceObjPath = '/org/bluez/hci0'){
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
                console.log(propertyName + ' = ' + str[1]);
                return str[1];
                }
            });
        })
    };


};

module.exports = adapter;