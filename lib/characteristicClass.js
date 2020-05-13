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
 * dbus-send --system --dest=com.sampleApp --print-reply /com/sampleApp/cmd org.bluez.GattCharacteristic1.ReadValue array:string:[[device,x/y/z],[offset,0]]
 * dbus-send --system --dest=com.sampleApp --print-reply=literal /com/sampleApp/cmd org.bluez.GattCharacteristic1.WriteValue string:"tips" array:string:[[device,x/y/z],[offset,0]]
 * dbus-send --system --dest=com.sampleApp --print-reply /com/sampleApp org.freedesktop.DBus.ObjectManager.GetManagedObjects
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

        this.iface = {
            Service: this.servicePath,
            UUID: this.UUID,
            Flags: this.flags,
            Value: Buffer.from('Value not set', 'utf-8'),
            Notifying: false
        };

        this._nodeObj = this.dBusService.createObject(this.servicePath + '/' + this.node);
        this._iface1 = this._nodeObj.createInterface('org.bluez.GattCharacteristic1');
        this._iface2 = this._nodeObj.createInterface('org.freedesktop.DBus.Properties');

        this._iface1.addMethod('ReadValue',{in: [{type: '{sv}', name: 'options'}], out: {type: 'ay', name: 'value'} }, (options, cback)=>{
            var device = options.device;
            var offset = options.offset;
            if(offset == 0 || offset == undefined){
                // if offset > 0 the remote BLE device is still reading previous value don't fire a new event.
                if(this.logIO){logit('<<<<<<< ReadValue for ' + this.node +', from ' + device)};
                this.emit('ReadValue', device);
            } else {
                if(this.logIO){logit('<<<<<<< Sending next data chunk to ' + device)};
            };
            var dataChunk = this.iface.Value.slice(offset, this.iface.Value.byteLength);
            if(this.logIO){logit('<<<<<<< [' + dataChunk.toString('utf8') + ']')};
            cback(null, [...dataChunk]); //... is a spread operator used to expand Value 
        });

        this._iface1.addMethod('WriteValue', {in: [{type: 'ay', name: 'value'}, {type: '{sv}', name: 'options'}] }, (arg1, options, cback)=>{
            var device = options.device;
            if(this.logIO){logit('>>>>>>> writeValue for ' + this.node +', from ' + device)};
            if(this.listenerCount('WriteValue') == 0){
                logit('no event consumers, setting characteristic value.')
                this.iface.Value = Buffer.from(arg1, 'utf-8')
            };        
            this.emit('WriteValue', device, arg1);
            if(this.logIO){logit('>>>>>>> [' + this.iface.Value.toString('utf8') + ']')};
            cback(null, {});
        });

        this._iface1.addMethod('StartNotify', {}, ()=>{
            if(this.logIO){logit('Notify on for ' + this.node)};
            this.iface.Notifying = true;
            return null;
        });

        this._iface1.addMethod('StopNotify', {}, ()=>{
            if(this.logIO){logit('Notify off for ' + this.node)};
            this.iface.Notifying = false;
            return null;
        });

        this._iface1.addProperty('Service', {
            type: {type: 'o'},
            getter: (callback)=>{
                callback(null, this.servicePath);
            }
        });

        this._iface1.addProperty('UUID', {
            type: {type: 's'},
            getter: (callback)=>{
                callback(null, this.UUID);
            }
        });

        this._iface1.addProperty('Flags', {
            type: {type: 'as'},
            getter: (callback)=>{
                callback(null, this.flags);
            }
        });

        this._iface1.addProperty('Value', {
            type: {type: 'ay'},
            getter: (callback)=>{
                callback(null, [...this.iface.Value]);
            }
        });

        this._iface1.addProperty('Notifying', {
            type: {type: 'b'},
            getter: (callback)=>{
                callback(null, this.iface.Notifying);
            }
        });
        this._iface1.update();

        this._iface2.addSignal('PropertiesChanged', {
            types: [
                {type: 's', name: 'interface_name'},
                {type: 'a{sv}', name: 'changed_properties'},
                {type: 'av', name: 'invalidated_properties'},
            ]
        });
        this._iface2.update()


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
            if(this.logIO){console.debug('characteristicClass.js -> Skipping this notification. No one has requested to be notified.')};
            return
        };
        if(this.logIO){logit('Sending notification for ' + this.node)};
        this._iface2.emitSignal('PropertiesChanged', ['org.bluez.GattCharacteristic1', 'Value', [...buffToSend]])
        if(this.logIO){logit('<<<<<<< [' + buffToSend.toString('utf8') + ']')};

        // var path = this.iface.Service + '/' + this.node;
        // var iface = "org.freedesktop.DBus.Properties";
        // var name = "PropertiesChanged";
        // var signature = "sa{sv}";
        // var notifyData = ["org.bluez.GattCharacteristic1",[["Value",["ay", buffToSend]]]];
        // if(this.logIO){console.debug('characteristicClass.js -> Sending notification for ' + this.node)};
        // this.dBusService.sendSignal(path, iface, name, signature, notifyData);
        // this._iface2.emitSignal('PropertiesChanged', ['org.bluez.GattCharacteristic1', 'Value', buffToSend])
        // if(this.logIO){console.debug('characteristicClass.js -> <<<<<<< [' + buffToSend.toString('utf8') + ']')};
    };

    /**
     * Clears a previously requested notificaton. This is usually called when the remote client disconnects while receiving notificaitons. 
     */
    clearNotify(){
        this.iface.Notifying = false;
        this._iface2.emitSignal('PropertiesChanged', ['org.bluez.GattCharacteristic1', 'Notifying', false])
        logit('Notify cleared for ' + this.node);
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

function logit(txt = ''){
    console.debug(logPrefix + txt);
};

module.exports = characteristic;