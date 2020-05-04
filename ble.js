const EventEmitter =      require("events");


class blePeripheral extends EventEmitter{
    /**
     * This is a test class to understand why my call back is not working.
     */
    constructor(callback){
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