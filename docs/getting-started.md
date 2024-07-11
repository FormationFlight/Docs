# Getting Started with FormationFlight

## What is FormationFlight?

FormationFlight is open-source inter-UAS positioning & telemetry for FPV pilots. Have you ever lost your friend while flying FPV as a group, had a friend want to join up who can't find you, or wanted to chase cars / do motion cinematic work more easily? FormationFlight is for you!

### How does FormationFlight work?

Using a small additional radio board attached to your flight controller, FormationFlight broadcasts your position information to other pilots in the area, and places the position information from other pilots into your flight controller's OSD through MSP.

### What hardware should I use for FormationFlight?

Presently, the best boards to use are repurposed ExpressLRS receivers like the HappyModel EP1 or similar. **Note that using ExpressLRS itself is not required to use FormationFlight**. FormationFlight is RC-link agnostic and works with TBS Crossfire, TBS Tracer, IRC Ghost, DragonLink, FrSky, whatever you may choose to use, and requires its own hardware, it just happens that ExpressLRS hardware makes a good platform for FormationFlight.

FormationFlight supports a 2.4GHz LoRa, 900MHz LoRa, 433MHz LoRa, and 2.4GHz ESPNOW. 2.4GHz LoRa is highly recommended, and will achieve approximately 5-10km of range under normal conditions. FormationFlight has been tested to run next to ExpressLRS 2.4GHz without meaningfully degrading the performance of either system. FormationFlight runs at 10mW and at the low end of the ExpressLRS hop table.

---

## Setting up your FormationFlight system

### Connect

To flash FormationFlight firmware to your FormationFlight radio, you must first connect the radio device to a PC. For some boards (ESP dev boards like the Lolin or TTGO series) this can be done with a USB connection. For others like ExpressLRS receivers, you must use an external UART interface, commonly referred to as "an FTDI". 

#### Connect boards with USB

Flashing dev boards with USB is easy! Just connect your board via USB and continue to the flashing section below

#### Connect boards without USB

To flash boards without built-in USB, you'll need a UART interface. An example of one of these boards is [here](https://www.amazon.com/FT232RL-Adapter-Breakout-Converter-Arduino/dp/B08B878T7T).

Connect your board according to the diagram below.

![UART flashing diagram](/assets/images/FTDIConn.png)

Now you'll need to put the board into bootloader mode - this is done by connecting the GPIO0 pin to ground. On ExpressLRS receivers for example, there's a pad marked "BOOT". This pad must be connected to ground while power is applied to the board to enter bootloader mode. Once your board is in bootloader mode, continue to the flashing section.

### Flash

#### Install ESP flasher

You can download an easy to use ESP flasher tool from [Jason8266's ESP\_Flasher repo](https://github.com/Jason2866/ESP_Flasher/releases). This tool makes it easy to install the FormationFlight firmware on your ESP board of choice.

[Download Flasher :fontawesome-solid-download:](https://github.com/Jason2866/ESP_Flasher/releases){ .md-button }

#### Download pre-built binaries

A simple way to install FormationFlight is by downloading pre-built binaries from [GitHub Releases](https://github.com/FormationFlight/FormationFlight/releases/latest). Choose the correct binary file for your board (for example, `expresslrs_rx_2400` for a 2.4GHz ExpressLRS receiver without PA/LNA like the HappyModel EP1/EP2).

See the list of [supported hardware](/hardware/) for other targets.

[Download Firmware :fontawesome-solid-microchip:](https://github.com/FormationFlight/FormationFlight/releases/latest){ .md-button }

#### Flash your board

Configure ESP-Flasher with the serial port of your board, and select the firmware.bin file for your board

![ESP-Flasher screenshot](/assets/images/ESP-Flasher_pi0pgRDAuP.png)

### Install

Your FormationFlight radio should be attached to a spare UART on your flight controller. As with any UART, make sure to cross over the RX & TX lines, and to give the radio power from a 5V connection.

If you're out of UARTs (such as if you're using an F411 flight controller), you can try out [GPS passthrough](/advanced/#msp-gps-injection).

### Configure

FormationFlight is designed to require minimal configuration of its own. Your flight controller software however will need to be configured to talk to FormationFlight

#### iNav

[More Info :fontawesome-solid-arrow-right:](/flight-controller/inav){ .md-button }

iNav includes native support for FormationFlight. Follow their documentation on enabling the HUD [here](https://github.com/iNavFlight/inav/wiki/OSD-Hud-and-ESP32-radars#esp32-lora-modem-inav-radar-project) and **don't forget to enable the crosshair OSD element**.

Note that iNav's implementation uses a "HUD" design, where MUSTARDTIGER's Ardupilot and Betaflight implementations use a simpler "vector to point" implementation like the home arrow.

The Radar OSD can be seen in the middle of this screenshot (indicating peer "B")
![ArduPilot Radar Screenshot](/assets/images/walksnail_and_inav.PNG)

#### ArduPilot

[More Info :fontawesome-solid-arrow-right:](/flight-controller/ardupilot){ .md-button }

As of 2023-06, ArduPilot does not yet natively support FormationFlight. However, the FormationFlight development team has an early release fork of ArduPilot which supports FormationFlight, available [here](https://github.com/MUSTARDTIGERFPV/ArduPilot). Be warned that this is prerelease software. Assume that it will crash your plane, kick your dog, and set your house on fire. With that in mind, the developers have been flying this modified version for a few months now without issue.

The Radar OSD can be seen in the bottom-left of this screenshot (beginning with "C")
![ArduPilot Radar Screenshot](/assets/images/image-12.png)

#### Betaflight

As of 2023-06, Betaflight does not yet natively support FormationFlight. However, the FormationFlight development team has an early release fork of Betaflight which supports FormationFlight, available [here](https://github.com/MUSTARDTIGERFPV/Betaflight). Be warned that this is prerelease software. Assume that it will crash your quad, kick your dog, and set your house on fire. With that in mind, the developers have been flying this modified version for a few months now without issue.

Configuration of this fork is left as an exercise to the reader. OSD element positioning is CLI-only and hasn't been tested / polished nearly as much as Ardupilot. If you have questions, [Join us on the Discord](https://discord.gg/npaX3VxQjh).

### Test

Now that your FormationFlight setup is installed, flashed, and running, let's test it to make sure everything is configured properly. You can use the peer spoof endpoint to inject peers and make sure your flight controller understands them properly

1. Power up your FC & FormationFlight setup
1. Connect to the WiFi Network for your FormationFlight radio using a PC. The network name and password are documented [here](/wifi/).
1. Wait until your FC has GPS lock by watching your OSD or telemetry
1. Confirm your FormationFlight setup has connected to the FC and pulled GPS - visit http://192.168.4.1/gnssmanager/status and look for lat/lon values
    - If your FormationFlight setup isn't showing GPS values, make sure it can see the FC by visiting http://192.168.4.1/ and looking at the "host" parameter - if it displays "NoFC", your FormationFlight setup can't talk to your flight controller, and you should check its wiring and pins
1. Open command prompt or terminal on your PC and enter the following command to enable spoofing on FormationFlight:
```sh
$ curl -X POST http://192.168.4.1/peermanager/spoof
```
1. Confirm that the command has returned `OK` as a result
1. Observe your OSD - you should see 5 peers all around you at varying distances from 100m to 600m dependent on setup
1. Make sure to power cycle the system before you fly to disable spoofing mode!

If you run into any trouble, visit our [troubleshooting](/troubleshooting) section, or come to the [FormationFlight Discord](https://discord.gg/npaX3VxQjh)'s #help-and-support channel

