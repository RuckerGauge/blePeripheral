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
* Type `git clone https://github.com/RuckerGauge/blePeripheral.git`
* Type `cd blePeripheral && npm install`
* Type `sudo cp netConfig.conf /etc/dbus-1/system.d`  This gives our sample app permission to bring up a services on the system D-Bus.
* Type `sudo node sampleApp` 
---
At this point you should have a Bluetooth LE (BLE) peripheral up and running on your Raspberry Pi Zero W.  The sample app sets up several test characteristics you can connect to for testing.  It also starts advertising as a BLE service so a bluetooth central (your iPhone) can find and connect to it.   The next step is to connect to this peripheral from an IOS device.  

# Test with iPhone
* Install the [LightBlue Explorer]( https://itunes.apple.com/us/app/lightblue-explorer/id557428110?mt=8) app on your iPhone or iPad and open it.
* The Peripherals Nearby list should have your device as you named it in the main.conf.  If you followed my bluetooth 5.50 install steps the name will be **rGauge Transmitter**. Tap on that device to open and connect to the Raspberry Pi Zero W peripheral. You should see the following screen:
![pic of rGauge Transmitter](/pics/IMG_1378.PNG)
* You will see five characteristics labeled isAuthorized, cmd, bigData, myIpAddress and iNetReachable.  The first two can be accessed without binding to the Raspberry Pi as they have normal Read and Write flags set.  However, the last three (bigData, myIpAddress, iNetReachable) require that you bind your iPhone before you read their data.  Their characteristics are flagged as encrypt-read and encrypt-write.  So for now do not tap on them we will stay focused on the first two.

* Tap on the isAuthorized characteristic to open and read its value.  You will see a hex value that doesn’t make much sense.  It is hex encoded ASCII characters and to decode it you can tap on the word hex in upper right side of the screen.  Select the UTF-8 String option and you will see that the value is the word “false”.  This characteristic can be used to tell your IOS app if this device is bound or not with this peripheral.  It will change to “true” when we pair the iPhone to the device. 

