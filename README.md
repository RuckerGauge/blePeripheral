# blePeripheral
This is a Node.js class for creating a Bluetooth LE (Low Energy) peripheral based on Bluez 5.50 and its D-Bus based API.  This class supports secure encrypted connections to IOS introduced in Bluetooth 4.2 as LE Secure connections.  Here is a quote from the [Bluetooth blog:]( https://blog.bluetooth.com/bluetooth-pairing-part-4) “LE Secure Connections is an enhanced security feature introduced in Bluetooth v4.2. It uses a Federal Information Processing Standards (FIPS) compliant algorithm called Elliptic Curve Diffie Hellman (ECDH) for key generation.” 
If you want to securely connect your IOS device to your Raspberry Pi over BLE you must implement this level of security or else Apple will not allow the device to bind.  
## Hardware Requirements
* Raspberry Pi Zero W
* iPhone or iPad with [LightBlue Explorer]( https://itunes.apple.com/us/app/lightblue-explorer/id557428110?mt=8) app.

This class was developed based on the Raspberry Pi Zero W’s built in bluetooth radio.  Other Raspberry Pi models may work but only the Pi Zero W has been tested.  
To properly test this class, you will need an IOS device with the BLE development tool [LightBlue Explorer]( https://itunes.apple.com/us/app/lightblue-explorer/id557428110?mt=8).  I have tested it with an iPhone 7 and iPad pro.  It should also work with an Android device I just haven't tested it.  There is a [LightBlue install](https://play.google.com/store/apps/details?id=com.punchthrough.lightblueexplorer&hl=en_US) on the Google Play store.  If someone can give this a try and document the results I will be happy to include a link to their site.  
## Software Requirements
This class requires blueZ version 5.50 (blueZ is the bluetooth daemon for debian linux) on top of Raspbian Stretch Lite.  The bluetooth version included in Raspbian Stretch Lite (blueZ 5.43) is old and does not support Bluetooth 4.2 secure connections to an IOS device.  To setup the software for Raspberry Pi Zero W follow the instructions here [Raspberry Pi Zero W Bluez V5.50 upgrades steps.]( https://github.com/RuckerGauge/Raspberry-Pi-Zero-W-Bluez-5.50-upgrade-steps)<br>
 
 If you don't care about securely bonding to an IOS device, you can run this class on the generic Raspbian Stretch Lite install.  To do this you have to enable the -e experimental flag on the ExecStart line in /lib/systemd/system/bluetooth.service.  This class uses the advertising-API over D-Bus and that is only available in BlueZ 5.43 if running in experimental mode.  This is not the case in BlueZ 5.50 as the Advertising-API is fully supported.  

# Install and load sampleApp
on the Raspberry Pi Zero W from a [SSH session](https://www.raspberrypi.org/magpi/ssh-remote-control-raspberry-pi/):
* Type **git clone https://github.com/RuckerGauge/blePeripheral.git**
* Type `cd blePeripheral && npm install`
* Type `sudo cp netConfig.conf /etc/dbus-1/system.d`  This gives our sample app permission to bring up a services on the system D-Bus.
* Type **sudo node sampleApp** <p>
At this point you should have a Bluetooth LE (BLE) peripheral up and running on your Raspberry Pi Zero W.  The sample app sets up several test characteristics you can connect to for testing.  It also starts advertising as a BLE service so a bluetooth central (your iPhone) can find and connect to it.   The next step is to connect to this peripheral from an IOS device.  


