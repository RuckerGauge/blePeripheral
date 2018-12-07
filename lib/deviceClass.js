
class device{
  constructor(DBus = {}){
    this.DBus = DBus;
    this.service = this.DBus.getService('org.bluez');
    this.iFace = 'org.freedesktop.DBus.Properties';
    this.deviceName = 'org.bluez.Device1';
    }
    monConnected(deviceObjPath = '/org/bluez/hci0/dev_00_DB_70_C8_0C_7F'){
        var dPath = deviceObjPath

        this.service.getInterface(dPath, this.iFace, (err, iface) => {
            if(err){
                console.error('Failed to request interface ' + iface + ' at ' + deviceObjPath);
                console.error(err);
            }
            iface.on('PropertiesChanged', (data, data2) => {
                console.log('propetiesChanged Fired data follows:');
                console.log(data);
                console.log('data 2 follows:')
                console.log(data2);
            });
        });
    
    }

    getProperty(propertyName =  'Trusted', deviceObjPath = '/org/bluez/hci0/dev_00_DB_70_C8_0C_7F'){  
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
                        //console.log(propertyName + ' = ' + x );
                        resolve(x);
                    }
                });
            });
        });
    return promise;
    };

    showAllProperties(deviceObjPath = '/org/bluez/hci0/dev_00_DB_70_C8_0C_7F'){
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

  
    setProperty(propertyName =  'Trusted', deviceObjPath = '/org/bluez/hci0/dev_00_DB_70_C8_0C_7F', value = true){
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

module.exports = device;