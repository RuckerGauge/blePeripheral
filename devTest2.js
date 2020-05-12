// const blePeripheral =   require("./blePeripheral.js");
// "dbus": "git+https://github.com/RuckerGauge/node-dbus.git#JR_addSupportForObjectPath"
// "dbus": "^1.0.7"



// const serviceName = 'com.sampleApp';                          // peripheral's DBus service name
// const serviceUUID = '27b5244f-94f3-4011-be53-6ac36bf22cf1'    // UUID to advertise as an Bluetooh LE service

// const bPrl = new blePeripheral(serviceName, serviceUUID, main);

// function main(){
//     console.log('Main callback is starting now..');
//     bPrl.logCharacteristicsIO = true;
//     console.log('logCharacteristicsIO enabled = ' + bPrl.logCharacteristicsIO);

//     var isAuthorized =  bPrl.Characteristic('00000001-94f3-4011-be53-6ac36bf22cf1', 'isAuthorized', ["read","write-without-response"]);
//     var cmd =           bPrl.Characteristic('00000002-94f3-4011-be53-6ac36bf22cf1', 'cmd', ["read","write"]);
//     var cpuTemp =       bPrl.Characteristic('00000006-94f3-4011-be53-6ac36bf22cf1', 'cpuTemp', ["encrypt-read","notify"]);    
// };


const DBus =              require("dbus");

var service = DBus.registerService('system', 'com.sampleApp');
var obj = service.createObject('/nodejs/dbus/ExampleService');

// Create interface

var iface1 = obj.createInterface('com.sampleApp.org.bluez.GattService1');

iface1.addMethod('Dummy', {}, function(callback) {
	setTimeout(function() {
		callback();
	}, 1000);
});

iface1.addMethod('MakeError', { out: DBus.Define(String) }, function(callback) {
	callback(new DBus.Error('nodejs.dbus.ExampleService.ErrorTest', 'Some error'));
});

iface1.addMethod('Hello', { out: DBus.Define(String) }, function(callback) {
	callback(null, 'Hello There!');
});

iface1.addMethod('SendObject', { in: [ DBus.Define(Object) ], out: DBus.Define(Object) }, function(obj, callback) {
	callback(null, obj);
});

iface1.addMethod('SendVarient', { in: [ DBus.Define('Auto') ], out: DBus.Define('Auto') }, function(obj, callback) {
	console.log(obj);
	callback(null, obj);
});

iface1.addMethod('Ping', { out: DBus.Define(String) }, function(callback) {
	callback('Pong!');
});

iface1.addMethod('Equal', {
	in: [
		DBus.Define(Number),
		DBus.Define(Number)
	],
	out: DBus.Define(Boolean)
}, function(a, b, callback) {

	if (a == b)
		callback(null, true);
	else
		callback(null, false);

});

iface1.addMethod('GetNameList', { out: DBus.Define(Array, 'list') }, function(callback) {
	callback(null, [
		'Fred',
		'Stacy',
		'Charles',
		'Rance',
		'Wesley',
		'Frankie'
	]);
});

iface1.addMethod('GetContacts', { out: DBus.Define(Object, 'contacts') }, function(callback) {
	callback(null, {
		Fred: {
			email: 'fred@mandice.com',
			url: 'http://fred-zone.blogspot.com/',
			age: 28,
			tel: [
				'09263335xx',
				'0936123456'
			]
		},
		Stacy: {
			email: 'stacy@mandice.com',
			age: 28,
			url: 'http://www.mandice.com/'
		},
		Charles: {
			email: 'charles@mandice.com',
			url: 'http://www.mandice.com/'
		},
		Rance: {
			email: 'lzy@mandice.com',
			url: 'http://www.mandice.com/'
		},
		Wesley: {
			email: 'wesley@mandice.org',
			url: 'http://www.mandice.org/'
		},
		Frankie: {
			email: 'frankie@mandice.com',
			address: [
				{
					country: 'Taipei'
				},
				{
					country: 'New Taipei'
				}
			]
		}
	});
});

// Writable property
var author = 'Fred Chien';
iface1.addProperty('Author', {
	type: DBus.Define(String),
	getter: function(callback) {
		callback(null, author);
	},
	setter: function(value, complete) {
		author = value;

		complete();
	}
});

// Read-only property
var url = 'http://stem.mandice.org';
iface1.addProperty('URL', {
	type: DBus.Define(String),
	getter: function(callback) {
		callback(null, url);
	}
});

// Read-only property
var jsOS = 'Stem OS';
iface1.addProperty('JavaScriptOS', {
	type: DBus.Define(String),
	getter: function(callback) {
		callback(null, jsOS);
	}
});

// Signal
var counter = 0;
iface1.addSignal('pump', {
	types: [
		DBus.Define(Number)
	]
});

iface1.update();

// Emit signal per one second
setInterval(function() {
	counter++;
	iface1.emit('pump', counter);
}, 1000);