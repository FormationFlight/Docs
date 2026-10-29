# Advanced Topics

The topics on this page have a limited audience and often require some degree of development experience. If you are curious about anything on this page and get lost, feel free to reach out on the [FormationFlight Discord](https://discord.gg/npaX3VxQjh).

## Custom build defines

There are some common compile-time build flags one may wish to pass to change the behavior of FormationFlight. The flags and their behavior are specified here.

### LoRa Power

FormationFlight defaults to very low output power, 10 mW; LoRa has tremendous range (10km+) even at these very low power levels, and keeping power low helps to reduce interference with other systems on the same band like your control link.

Power is a setting, not a build flag: **LoRa TX power** under Settings, Radios in the node's web UI. It takes effect immediately. On ExpressLRS hardware it is rounded down to the receiver's own power levels (10, 25, 50, 100 mW and so on), and on a receiver with a PA it sets the power out of the PA, not the radio chip. The dashboard shows what the node actually settled on. Every band also has a legal ceiling that the setting cannot exceed.

### MSP GPS Injection

Certain flight controller hardware like the F411 is severely limited on UARTs. FormationFlight includes the ability to read directly attached GPS hardware and to inject the readings into your flight controller as MSP GPS. This is pre-alpha as of 2023-07, but in short, you need to add the following defines to the FormationFlight build target, specific to your hardware, and attach an NMEA-speaking GPS to the pins specified. FormationFlight will do its best to autodiscover the baud rate of your GPS.

```
-D GNSS_ENABLED=1
-D GNSS_UART_INDEX=2
-D GNSS_PIN_RX=34
-D GNSS_PIN_TX=12
-D GNSS_INJECT
```

### Encryption

FormationFlight supports encryption. OTA packets are sent by default using AES-128-XTS with a key derived from the `GROUPKEY` specified at compile time. The default `GROUPKEY` is `opensesame`, allowing FormationFlight users to see each other by default, but also to provide some additional protections against invalid packets (that is to say, a packet must both decrypt *and* pass validation to be passed through the stack), which prevents mostly-zero packets from validating.

Note that we use the XTS mode; this isn't really secure *at all* given we use a static "tweak". The stated goal of this feature is to keep disparate groups from seeing each other and to maybe prevent passive snooping, not to prevent coordinated attacks. Coordinated attack prevention would necessitate a stream cipher which requires keeping & sending counters and nonces which just aren't worth it for this project. 

If you wish to keep your own group separate from other FormationFlight groups, you can change the `GROUPKEY` at compile time through a custom define:

```
-D GROUPKEY="hunter2"
```

## WiFi Flashing

FormationFlight supports WiFi OTA firmware upgrades through the standard espota protocol. The easiest way to use this function is to choose the "Upload" action on any of the targets ending in `_via_WiFi` in PlatformIO, but a tool to make OTA flashing easier is planned.

## Useful snippets

Since certain parameters of FormationFlight can be changed via the HTTP API, certain snippets can be useful to copy-and-paste.

```sh
# Disable radio #1 (LoRa)
curl -X POST http://192.168.4.1/radiomanager/radio_set_enabled -d "index=1&status=false"
# Enable radio #1 (LoRa)
curl -X POST http://192.168.4.1/radiomanager/radio_set_enabled -d "index=1&status=true"
# Begin spoofing GPS location of this FF radio
curl -X POST http://192.168.4.1/gnssmanager/spoof -d "lat=45.171546&lon=5.722387"
# Begin spoofing peers
curl -X POST http://192.168.4.1/mspmanager/spoof
# Reboot the FormationFlight radio
curl -X POST http://192.168.4.1/system/reboot
# Put the FormationFlight radio into bootloader mode
curl -X POST http://192.168.4.1/system/bootloader
```
