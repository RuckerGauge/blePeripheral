#!/usr/bin/python
# Copyright 2016 The Chromium OS Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""A simple script to set/reset advertising intervals through dbus methods.
Usage:
    $ ./example-advertising-intervals --set min_interval_ms max_interval_ms
    $ ./example-advertising-intervals --reset
    Example:
    # Set both min and max advertising intervals to 200 ms.
    $ ./example-advertising-intervals --set 200 200
    # Reset the advertising intervals.
    $ ./example-advertising-intervals --reset
"""
import argparse
import dbus
import time
import subprocess
class Advertising(object):
    """A convenient wrapper for dbus advertising interface."""
    def __init__(self):
        """Construct the advertising interface object."""
        self.bus = dbus.SystemBus()
        self.adapter = self.bus.get_object('org.bluez', '/org/bluez/hci0')
        self.advertising = dbus.Interface(self.adapter,
                                          'org.bluez.LEAdvertisingManager1')
        self.advertising.check_output = self.check_output
    def interface(self):
        """Return the advertising inerface object."""
        return self.advertising
    @staticmethod
    def check_output():
        """Output btmgmt info."""
        # Wait a little while for dbus method to complete.
        time.sleep(0.2)
        # Check the current settings using btmgmt.
        btmgmt_info = 'btmgmt info'
        for line in subprocess.check_output(btmgmt_info.split()).splitlines():
            if 'current settings' in line:
                print line.strip()
def _parse():
    """Parse the command line options."""
    parser = argparse.ArgumentParser(
            description='Set/Reset advertising intervals.')
    parser.add_argument('-s', '--set',
                        help='set advertising intervals',
                        type=int, nargs=2, default=[None, None])
    parser.add_argument('-r', '--reset',
                        help='reset advertising intervals', action="store_true")
    args = parser.parse_args()
    args.min_interval_ms, args.max_interval_ms = args.set
    return args
if __name__ == '__main__':
    advertising = Advertising().interface()
    args = _parse()
    if args.reset:
        print 'advertising.ResetAdvertising()'
        advertising.ResetAdvertising()
    elif args.min_interval_ms is not None and args.max_interval_ms is not None:
        print ('advertising.SetAdvertisingIntervals(%d, %d)' %
               (args.min_interval_ms, args.max_interval_ms))
        advertising.SetAdvertisingIntervals(args.min_interval_ms,
                                            args.max_interval_ms)
    advertising.check_output()
