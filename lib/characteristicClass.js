const EventEmitter =    require('events');
const Dbus =            require("dbus");

const logPrefix = 'characteristicClass.js | ';

/**
 * Sets up a D-Bus based characteristic for a BLE GATT service.  This class is based on the bluez D-Bus GATT API https://git.kernel.org/pub/scm/bluetooth/bluez.git/tree/doc/gatt-api.txt
 * 
 * emits **.on('ReadValue', (device))** and **.on('WriteValue', (device, arg1)**, that can be consumed to intercept the reading and writing of .Value.  They will be emitted when a BLE client request to read or write a characteristic.
 * 
 * gdbus introspect --system --dest com.sampleApp --object-path / --recurse  To see this dBus interface
 * gdbus call --system --dest com.sampleApp --object-path /com/sampleApp --method org.bluez.GattCharacteristic1.ReadValue
 * dbus-send --system --dest=com.sampleApp --print-reply /com/sampleApp org.bluez.GattCharacteristic1.ReadValue
 * dbus-send --system --dest=com.sampleApp --print-reply=literal /com/sampleApp org.bluez.GattCharacteristic1.WriteValue string:"funTips"
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
    constructor(DBusService = Dbus.registerService('system', 'com.netConfig') , sPath = '/com/netConfig', UUID, node, flags, logIO = false){
        super();
        this.dBusService = DBusService;
        this.servicePath = sPath;
        this.UUID = UUID;
        this.node = node;
        this.logIO = logIO;
        this.flags = flags || ["encrypt-read","encrypt-write"];

        this.ifProperties = {
            Service: this.servicePath,
            UUID: this.UUID,
            Flags: this.flags,
            Value: Buffer.from('Value not set').toString('utf8'),
            Notifying: false
        };

        this.nodeObj = this.dBusService.createObject(this.servicePath);
        this.iface1 = this.nodeObj.createInterface('org.bluez.GattCharacteristic1');
        this.iface2 = this.nodeObj.createInterface('org.freedesktop.DBus.Properties');

        // this.iface1.addMethod('ReadValue',{out: {type: 'ay', name: 'arry{byte}'}}, (cback)=>{
        this.iface1.addMethod('ReadValue',{out: {type: 'ay', name: 'arry{byte}'}}, (cback)=>{
            // logit('name = ' + name);
            // logit('quality = ' + quality);



            // var optnObj = parseOptionsToObject(options)
            // var device = optnObj.device;
            // var offset = optnObj.offset;
            // if(offset == 0){
            //     // if offset > 0 the remote BLE device is still reading previous value don't fire a new event.
            //     if(this.logIO){logit('<<<<<<< ReadValue for ' + this.node +', from ' + device)};
            //     this.emit('ReadValue', device);
            // } else {
            //     if(this.logIO){logit('<<<<<<< Sending next data chunk to ' + device)};
            // };
            // var dataChunk = this.ifProperties.Value.slice(offset, this.ifProperties.Value.byteLength);
            // if(this.logIO){logit('<<<<<<< [' + dataChunk.toString('utf8') + ']')};
            // // return dataChunk;
            this.ifProperties.Value = new Uint8Array([21, 31]);
            console.log('sending response...')
            console.log(this.ifProperties.Value);
            cback(null, this.ifProperties.Value);
        });

        this.iface1.addMethod('WriteValue', {in: [{type: 'ay', name: 'arry{byte}'}] }, (arg1, cback)=>{
            logit('arg1 ->' + arg1 + '<-');
            console.log(arg1);
            logit('as dir:');
            console.dir(arg1,{depth:null});
            var options = [];
            var optnObj = parseOptionsToObject(options)
            var device = optnObj.device;
            var offset = optnObj.offset;
            if(this.logIO){logit('>>>>>>> writeValue for ' + this.node +', from ' + device)};
            if(this.listenerCount('WriteValue') == 0){this.ifProperties.Value = arg1;};        //set Val = arg1 if no event consumers 
            this.emit('WriteValue', device, arg1);
            if(this.logIO){logit('>>>>>>> [' + this.ifProperties.Value.toString('utf8') + ']')};
            cback(null, {});
        });

        this.iface1.addMethod('StartNotify', {}, ()=>{
            if(this.logIO){logit('Notify on for ' + this.node)};
            this.ifProperties.Notifying = true;
            return null;
        });

        this.iface1.addMethod('StopNotify', {}, ()=>{
            if(this.logIO){logit('Notify off for ' + this.node)};
            this.ifProperties.Notifying = false;
            return null;
        });

        this.iface1.addProperty('Service', {
            type: {type: 'o'},
            getter: (callback)=>{
                callback(null, this.servicePath);
            }
        });

        this.iface1.addProperty('UUID', {
            type: {type: 's'},
            getter: (callback)=>{
                callback(null, this.UUID);
            }
        });

        this.iface1.addProperty('Flags', {
            type: {type: 'as'},
            getter: (callback)=>{
                callback(null, this.flags);
            }
        });

        this.iface1.addProperty('Value', {
            type: {type: 's'},
            getter: (callback)=>{
                callback(null, this.ifProperties.Value);
            }
        });

        this.iface1.addProperty('Notifying', {
            type: {type: 'b'},
            getter: (callback)=>{
                callback(null, false);
            }
        });

        this.iface1.update();

        this.iface2.addSignal('PropertiesChanged', {
            types: [
                {type: 's', name: 'interface_name'},
                {type: 'a{sv}', name: 'changed_properties'},
                {type: 'av', name: 'invalidated_properties'},
            ]
        });

        // this.iface = {
        //     ReadValue: (options)=>{
        //         var optnObj = parseOptionsToObject(options)
        //         var device = optnObj.device;
        //         var offset = optnObj.offset;
        //         if(offset == 0){
        //             // if offset > 0 the remote BLE device is still reading previous value don't fire a new event.
        //             if(this.logIO){console.debug('characteristicClass.js -> <<<<<<< ReadValue for ' + this.node +', from ' + device)};
        //             this.emit('ReadValue', device);
        //         } else {
        //             if(this.logIO){console.debug('characteristicClass.js -> <<<<<<< Sending next data chunk to ' + device)};
        //         };
        //         var dataChunk = this.iface.Value.slice(offset, this.iface.Value.byteLength);
        //         if(this.logIO){console.debug('characteristicClass.js -> <<<<<<< [' + dataChunk.toString('utf8') + ']')};
        //         return dataChunk;
        //     },
        //     WriteValue:(arg1, options)=>{
        //         var optnObj = parseOptionsToObject(options)
        //         var device = optnObj.device;
        //         var offset = optnObj.offset;
        //         if(this.logIO){console.debug('characteristicClass.js -> >>>>>>> writeValue for ' + this.node +', from ' + device)};
        //         if(this.listenerCount('WriteValue') == 0){this.iface.Value = arg1;};        //set Val = arg1 if no event consumers 
        //         this.emit('WriteValue', device, arg1);
        //         if(this.logIO){console.debug('characteristicClass.js -> >>>>>>> [' + this.iface.Value.toString('utf8') + ']')};
        //         return null;
        //     },
        //     StartNotify:()=>{
        //         if(this.logIO){console.debug('characteristicClass.js -> Notify on for ' + this.node)};
        //         this.iface.Notifying = true;
        //         return null;
        //     },
        //     StopNotify:()=>{
        //         if(this.logIO){console.debug('characteristicClass.js -> Notify off for ' + this.node)};
        //         this.iface.Notifying = false;
        //         return null;
        //     },
        //     Service: this.servicePath,
        //     UUID: this.UUID,
        //     Flags: this.flags,
        //     Value: Buffer.from('Value not set'),
        //     Notifying: false
        // };
        // console.debug('characteristicClass.js -> Exporting D-Bus interface for ' + this.node + ' characteristic.');
        // this.dBusService.exportInterface(this.iface, this.iface.Service + '/' + this.node, this.ifaceDesc);

        // // user descriptor for the characterist follows
        // // for more details see https://www.bluetooth.com/specifications/gatt/viewer?attributeXmlFile=org.bluetooth.descriptor.gatt.characteristic_user_description.xml
        // var descUUID = '2901-0000-1000-8000-00805f9b34fb'  
        // var descName = 'userDescription'
        // var charPath = this.servicePath + '/' + this.node;
        // this.userDescription_ifaceDesc = {
        //     name: 'org.bluez.GattDescriptor1',
        //     methods: {
        //         ReadValue:  ['', 'ay', [], ['arry{byte}']],
        //         WriteValue: ['ay', '', ['arry{byte}'], []]
        //       },
        //       properties: {
        //         UUID: 's',
        //         Characteristic: 'o',
        //         Value: 's',
        //         Flags: 'as'
        //       },
        //       signals: {
        //       }
        // };
        // this.userDescription_iface = {
        //     ReadValue: (options)=>{
        //         return this.userDescription_iface.Value
        //     },
        //     WriteValue:(arg1, options)=>{
        //         console.warn('Caution unexpected behavor a write to the UserDescription was made and will be ignored...');
        //         return null;
        //     },
        //     UUID: descUUID,
        //     Characteristic: charPath,
        //     Value: Buffer.from(this.node),
        //     Flags: [["read"]]
        // };
        // this.dBusService.exportInterface(this.userDescription_iface, this.iface.Service + '/' + this.node + '/' + descName, this.userDescription_ifaceDesc);
    };

    /**
     * Sets the value for this characteristic.  If a BLE client reads this characteristic this is the value that will be returned. 
     * 
     * @param {Buffer} valAsBuffer 
     */
    setValue(valAsBuffer = this.ifProperties.Value){
        if(Buffer.isBuffer(valAsBuffer)){
            if(valAsBuffer.byteLength > 512){
                throw new Error('Characteristic ' + this.node +' setValue size is ' + valAsBuffer.byteLength +' bytes, and that is greater than max buf size of 512 bytes.');
            }
            this.ifProperties.Value = valAsBuffer;  
        } else if(typeof valAsBuffer === "boolean"){
            if(valAsBuffer == true){
                this.ifProperties.Value = Buffer.from('ture');
            } else {
                this.ifProperties.Value = Buffer.from('false');
            }
        } else if(typeof valAsBuffer === "string") {
            var x = Buffer.from(valAsBuffer);
            if(valAsBuffer.byteLength > 512){
                throw new Error('Characteristic ' + this.node +' setValue size is ' + valAsBuffer.byteLength +' bytes, and that is greater than max buf size of 512 bytes.');
            }
            this.ifProperties.Value = x;
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
    notify(valAsBuffer = this.ifProperties.Value){
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
        if(this.ifProperties.Notifying == false){
            if(this.logIO){console.debug('characteristicClass.js -> Skipping this notification. No one has requested to be notified.')};
            return
        };
        // var path = this.iface.Service + '/' + this.node;
        // var iface = "org.freedesktop.DBus.Properties";
        // var name = "PropertiesChanged";
        // var signature = "sa{sv}";
        // var notifyData = ["org.bluez.GattCharacteristic1",[["Value",["ay", buffToSend]]]];
        if(this.logIO){console.debug('characteristicClass.js -> Sending notification for ' + this.node)};
        // this.dBusService.sendSignal(path, iface, name, signature, notifyData);
        this.iface2.emitSignal('PropertiesChanged', ['org.bluez.GattCharacteristic1', 'Value', buffToSend])
        if(this.logIO){console.debug('characteristicClass.js -> <<<<<<< [' + buffToSend.toString('utf8') + ']')};
    };

    /**
     * Clears a previously requested notificaton. This is usually called when the remote client disconnects while receiving notificaitons. 
     */
    clearNotify(){
        this.ifProperties.Notifying = false;
        console.debug('characteristicClass.js -> Notify cleared for ' + this.node);
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

    // [['device', '/x/y/z'],['offset', '0']]

    if(Array.isArray(options)){
        options.forEach(function(val, index){
            var detailsObj = val[1][0][0];
            if(val[0] == 'device'){
                rtnObj.device = (val[1][1]).toString();
            } else if(val[0] == 'offset') {
                rtnObj.offset = (val[1][1]).toString();
            } else if(val[0] != 'link') {
                //link is just stataing this is a Bluetooth LE packet 
                console.debug('characteristicClass.js -> \t' + val[0] + ' : ' + val[1][1] + ', of type -> ' + detailsObj.type + ' <-.');
            };
        });
    }; 
    return rtnObj;
}

function logit(txt = ''){
    console.debug(logPrefix + txt);
};

module.exports = characteristic;