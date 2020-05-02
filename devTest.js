const blePeripheral =   require("./blePeripheral.js");

const serviceName = 'com.sampleApp';                          // peripheral's DBus service name
const serviceUUID = '27b5244f-94f3-4011-be53-6ac36bf22cf1'    // UUID to advertise as an Bluetooh LE service

overrideLogging();

const bPrl = new blePeripheral(serviceName, serviceUUID, main);


function main(DBus){
    console.log('devTest.js main called...');
};


/** Overrides console.error, console.warn, and console.debug
 * By placing <#> in front of the log text it will allow us to filter them with systemd
 * For example to just see errors and warnings use journalctl with the -p4 option 
 */
function overrideLogging(){
    const orignalConErr = console.error;
    const orignalConWarn = console.warn;
    const orignalConDebug = console.debug;
    console.error = ((data = '', arg = '')=>{orignalConErr('<3>'+data, arg)});
    console.warn = ((data = '', arg = '')=>{orignalConWarn('<4>'+data, arg)});
    console.debug = ((data = '', arg = '')=>{orignalConDebug('<7>'+data, arg)});
  };