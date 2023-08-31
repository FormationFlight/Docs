# Setting up iNav with FormationFlight

## Configure

### Set the serial port for MSP

In the "Ports" section of the iNav Configurator, find the port on which you've connected your FormationFlight device. Enable the MSP switch, and Save.


### Enable the Radar OSD

Follow the [iNav documentation](https://github.com/iNavFlight/inav/wiki/OSD-Hud-and-ESP32-radars) to enable OSD Radar, namely the `osd_hud_radar_` items.
Note: iNav HUD does not activate until a heading is established, so if you only have a GPS connected, you might need to walk outside with the aircraft until a heading can be calculated by iNav.

## Examples

### Walksnail

The Radar OSD can be seen in the middle of this screenshot (indicating peer "B")
![ArduPilot Radar Screenshot](/assets/images/walksnail_and_inav.PNG)

### Analog

Please contribute your analog iNav FormationFlight screenshots! Send them to MUSTARDTIGER on the [Discord](https://discord.gg/npaX3VxQjh).
