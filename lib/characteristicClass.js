const EventEmitter =    require('events');
// overrideLogging();

/**
 * Sets up a D-Bus based characteristic for a BLE GATT service.  This class is based on the bluez D-Bus GATT API https://git.kernel.org/pub/scm/bluetooth/bluez.git/tree/doc/gatt-api.txt
 * 
 * emits **.on('ReadValue', (device))** and **.on('WriteValue', (device, arg1)**, that can be consumed to intercept the reading and writing of .Value.  They will be emitted when a BLE client request to read or write a characteristic.
 * 
 * * **dbus**: Is a D-Bus object based on dBus-native with access to the systembus.
 * * **sPath**: Is the service path for all characteristics. For example /com/netConfig. 
 * * **UUID**: Is the unique UUID number for this characteristic. If you need a number visit https://www.uuidgenerator.net/
 * * **node**: Is the node name for the characteristic (user friendly name)
 * * **flags**: Is an optional array of strings used to determine the access to this characteristic.  See https://git.kernel.org/pub/scm/bluetooth/bluez.git/tree/doc/gatt-api.txt#n236 for a list of supported flags. Default values are "encrypt-read","encrypt-write"
 * * **logIO**: If set true all characteristic read and wirte data will be logged to the console.  Defaults to false
 *
 * @param {object} dbus
 * @param {string} sPath
 * @param {string} UUID
 * @param {string} node
 * @param {arry} flags
 * @param {boolean} logIO
 */
class characteristic extends EventEmitter{
    constructor(dbus, sPath, UUID, node, flags, logIO = false){
        super();
        this.DBus = dbus;
        this.servicePath = sPath;
        this.UUID = UUID;
        this.node = node;
        this.logIO = logIO;
        this.flags = flags || ["encrypt-read","encrypt-write"];

        this.ifaceDesc = {
            name: 'org.bluez.GattCharacteristic1',
            methods: {
                ReadValue:  ['', 'ay', [], ['arry{byte}']],
                WriteValue: ['ay', '', ['arry{byte}'], []],
                StartNotify: ['', '', [], []],
                StopNotify: ['', '', [], []]
              },
              properties: {
                Service: 'o',
                UUID: 's',
                Flags: 'as',
                Value: 's',
                Notifying: 'b'
              },
              signals: {
              }
        };
        this.iface = {
            ReadValue: (options)=>{
                var optnObj = parseOptionsToObject(options)
                var device = optnObj.device;
                var offset = optnObj.offset;
                if(offset == 0){
                    // if offset > 0 the remote BLE device is still reading previous value don't fire a new event.
                    if(this.logIO){console.debug('<<<<<<< ReadValue for ' + this.node +', from ' + device)};
                    this.emit('ReadValue', device);
                } else {
                    if(this.logIO){console.debug('<<<<<<< Sending next data chunk to ' + device)};
                };
                var dataChunk = this.iface.Value.slice(offset, this.iface.Value.byteLength);
                if(this.logIO){console.debug('<<<<<<< [' + dataChunk.toString('utf8') + ']')};
                return dataChunk;
            },
            WriteValue:(arg1, options)=>{
                var optnObj = parseOptionsToObject(options)
                var device = optnObj.device;
                var offset = optnObj.offset;
                if(this.logIO){console.debug('>>>>>>> writeValue for ' + this.node +', from ' + device)};
                if(this.listenerCount('WriteValue') == 0){this.iface.Value = arg1;};        //set Val = arg1 if no event consumers 
                this.emit('WriteValue', device, arg1);
                if(this.logIO){console.debug('>>>>>>> [' + this.iface.Value.toString('utf8') + ']')};
                return null;
            },
            StartNotify:()=>{
                if(this.logIO){console.debug('Notify on for ' + this.node)};
                this.iface.Notifying = true;
                return null;
            },
            StopNotify:()=>{
                if(this.logIO){console.debug('Notify off for ' + this.node)};
                this.iface.Notifying = false;
                return null;
            },
            Service: this.servicePath,
            UUID: this.UUID,
            Flags: this.flags,
            Value: Buffer.from('Value not set'),
            Notifying: false
        };
        console.debug('Exporting D-Bus interface for ' + this.node + ' characteristic.');
        this.DBus.exportInterface(this.iface, this.iface.Service + '/' + this.node, this.ifaceDesc);

        // user descriptor for the characterist follows
        // for more details see https://www.bluetooth.com/specifications/gatt/viewer?attributeXmlFile=org.bluetooth.descriptor.gatt.characteristic_user_description.xml
        var descUUID = '2901-0000-1000-8000-00805f9b34fb'  
        var descName = 'userDescription'
        var charPath = this.servicePath + '/' + this.node;
        this.userDescription_ifaceDesc = {
            name: 'org.bluez.GattDescriptor1',
            methods: {
                ReadValue:  ['', 'ay', [], ['arry{byte}']],
                WriteValue: ['ay', '', ['arry{byte}'], []]
              },
              properties: {
                UUID: 's',
                Characteristic: 'o',
                Value: 's',
                Flags: 'as'
              },
              signals: {
              }
        };
        this.userDescription_iface = {
            ReadValue: (options)=>{
                return this.userDescription_iface.Value
            },
            WriteValue:(arg1, options)=>{
                console.warn('Caution unexpected behavor a write to the UserDescription was made and will be ignored...');
                return null;
            },
            UUID: descUUID,
            Characteristic: charPath,
            Value: Buffer.from(this.node),
            Flags: [["read"]]
        };
        this.DBus.exportInterface(this.userDescription_iface, this.iface.Service + '/' + this.node + '/' + descName, this.userDescription_ifaceDesc);
    };

    /**
     * Sets the value for this characteristic.  If a BLE client reads this characteristic this is the value that will be returned. 
     * 
     * @param {Buffer} valAsBuffer 
     */
    setValue(valAsBuffer = this.iface.Value){
        if(Buffer.isBuffer(valAsBuffer)){
            if(valAsBuffer.byteLength > 512){
                throw new Error('Characteristic ' + this.node +' setValue size is ' + valAsBuffer.byteLength +' bytes, and that is greater than max buf size of 512 bytes.');
            }
            this.iface.Value = valAsBuffer;  
        } else if(typeof valAsBuffer === "boolean"){
            if(valAsBuffer == true){
                this.iface.Value = Buffer.from('ture');
            } else {
                this.iface.Value = Buffer.from('false');
            }
        } else if(typeof valAsBuffer === "string") {
            var x = Buffer.from(valAsBuffer);
            if(valAsBuffer.byteLength > 512){
                throw new Error('Characteristic ' + this.node +' setValue size is ' + valAsBuffer.byteLength +' bytes, and that is greater than max buf size of 512 bytes.');
            }
            this.iface.Value = x;
        } else {
            console.error('Error not supported type. SetValue called with ' + valAsBuffer);
            throw new Error('setValue must be set with a buffer, string, or boolean. ');
        }
    }

    /**
     * If a Bluetooth LE client has requested notifications calling this methond will send ValAsBuffer to them.
     * 
     * The "notify" flag must be set when constructing this characteristic to give the remote client the option to request notificaiton.
     * valAsBuffer can be null (sends default value for characteristic), a buffer, a string, or a boolean value.
     * 
     * @param {Buffer} valAsBuffer 
     */
    notify(valAsBuffer = this.iface.Value){
        var buffToSend;
        if(Buffer.isBuffer(valAsBuffer)){
            if(valAsBuffer.byteLength > 512){
                throw new Error('Characteristic ' + this.node +' setValue size is ' + valAsBuffer.byteLength +' bytes, and that is greater than max buf size of 512 bytes.');
            }
            buffToSend = valAsBuffer;  
        } else if(typeof valAsBuffer === "boolean"){
            if(valAsBuffer == true){
                buffToSend = Buffer.from('ture');
            } else {
                buffToSend = Buffer.from('false');
            }
        } else if(typeof valAsBuffer === "string") {
            buffToSend = Buffer.from(valAsBuffer);
            if(valAsBuffer.byteLength > 512){
                throw new Error('Characteristic ' + this.node +' setValue size is ' + valAsBuffer.byteLength +' bytes, and that is greater than max buf size of 512 bytes.');
            }
        } else {
            console.error('Error not supported type. notify called with ' + valAsBuffer);
            throw new Error('notify must be set with a buffer, string, or boolean. ');
        }
        if(this.iface.Notifying == false){
            if(this.logIO){console.debug('Skipping this notification. No one has requested to be notified.')};
            return
        };
        var path = this.iface.Service + '/' + this.node;
        var iface = "org.freedesktop.DBus.Properties";
        var name = "PropertiesChanged";
        var signature = "sa{sv}";
        var notifyData = ["org.bluez.GattCharacteristic1",[["Value",["ay", buffToSend]]]];
        if(this.logIO){console.debug('Sending notification for ' + this.node)};
        this.DBus.sendSignal(path, iface, name, signature, notifyData);
        if(this.logIO){console.debug('<<<<<<< [' + buffToSend.toString('utf8') + ']')};
    };

    /**
     * Clears a previously requested notificaton. This is usually called when the remote client disconnects while receiving notificaitons. 
     */
    clearNotify(){
        this.iface.Notifying = false;
        console.debug('Notify cleared for ' + this.node);
        /*
        var path = this.iface.Service + '/' + this.node;
        var iface = "org.freedesktop.DBus.Properties";
        var name = "PropertiesChanged";
        var signature = "sa{sv}";
        var notifyData = ["org.bluez.GattCharacteristic1",[["Notifying",["b", false]]]];
        console.log('Sending Notifying PropertiesChanged D-Bus signal for ' + this.node);
        this.DBus.sendSignal(path, iface, name, signature, notifyData);
        */
    };
}

function parseOptionsToObject(options = []){
    var rtnObj = {
        device:'',
        offset:0
    }

    if(Array.isArray(options)){
        options.forEach(function(val, index){
            var detailsObj = val[1][0][0];
            if(val[0] == 'device'){
                rtnObj.device = (val[1][1]).toString();
            } else if(val[0] == 'offset') {
                rtnObj.offset = (val[1][1]).toString();
            } else if(val[0] != 'link') {
                //link is just stataing this is a Bluetooth LE packet 
                console.debug('\t' + val[0] + ' : ' + val[1][1] + ', of type -> ' + detailsObj.type + ' <-.');
            };
        });
    }; 
    return rtnObj;
}

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

module.exports = characteristic;