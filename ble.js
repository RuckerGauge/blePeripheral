// const EventEmitter =      require("events");


class blePeripheral{
    /**
     * This is a test class to understand why my call back is not working.
     */
    constructor(cback){
        // super()
        this.logAllDBusMessages = false;
        this.logCharacteristicsIO = false;
        console.log('calling call back now');
        cback();
        return
    };

    pp(){
        console.log('okay get over it');
        console.log('COJTs = ' + this.logCharacteristicsIO);
    }
}

module.exports = blePeripheral;