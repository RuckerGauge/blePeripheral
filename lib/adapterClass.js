// Based on BlueZ adapterAPI https://git.kernel.org/pub/scm/bluetooth/bluez.git/tree/doc/adapter-api.txt
class adapter{
  constructor(DBus = {}){
    this.DBus = DBus;
    this.service = this.DBus.getService('org.bluez');
    this.iFace = 'org.freedesktop.DBus.Properties';
    this.deviceName = 'org.bluez.Adapter1';
    }


    getProperty(propertyName =  'Pairable', deviceObjPath = '/org/bluez/hci0'){  
        var promise = new Promise((resolve, reject)=>{
            this.service.getInterface(deviceObjPath, this.iFace, (err, iface) => {
                if(err){
                    console.error('Failed to request interface ' + iface + ' at ' + deviceObjPath);
                    console.error(err);
                    reject(new Error('Failed to request interface ' + iface + ' at ' + deviceObjPath));
                }
                iface.Get( this.deviceName, propertyName, (err, str) => {
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
        this.service.getInterface(deviceObjPath, this.iFace, (err, iface) => {
        if(err){
          console.error('Failed to request interface ' + iface + ' at ' + deviceObjPath);
          console.error(err);
          return;
        }
          //iface.GetAll( pInterfanceName, (err, str) => {
          console.log('calling GetAll...');
          iface.GetAll(this.deviceName, (err,str) => {
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
        this.service.getInterface(deviceObjPath, this.iFace, (err, iface) => {
            if(err){
                console.error('Failed to SetProperty interface ' + iface + ' at ' + deviceObjPath);
                console.error(err);
                return;
            }
            iface.Set( this.deviceName, propertyName, ["b",value], (err, str) => {
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