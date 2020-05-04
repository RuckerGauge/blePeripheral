const EventEmitter =      require("events");


class blePeripheral extends EventEmitter{
    /**
     * This is a test class to understand why my call back is not working.
     * @param {*} ServiceName 
     * @param {*} ServerUUID 
     * @param {*} callback 
     * @param {*} PrimaryService 
     */
    constructor(ServiceName ='com.netConfig', ServerUUID = '4b1268a8-d692-41d6-b51a-d1730ea6b9d6', callback = function(){}, PrimaryService = true){
        super()
        this.logAllDBusMessages = false;
        this.logCharacteristicsIO = false;
        console.log('calling all back now');
        callback();
    };

    pp(){
        console.log('okay get over it');
        console.log('COJTs = ' + this.logCharacteristicsIO);
    }
}

module.exports = blePeripheral;