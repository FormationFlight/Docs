---
title: Web Installer
description: Flash FormationFlight onto your board from the browser.
---

# Web Installer

Flash FormationFlight straight from your browser. Pick your board, set the band and (optionally) your group, then flash it over USB or download a file for a node that is already running FormationFlight.

Flashing over USB needs a browser with Web Serial: Chrome, Edge or Opera on a desktop. Downloading works anywhere.

<div id="ff-installer" class="ff-installer" markdown="0">
  <p>Loading the installer&hellip;</p>
  <noscript><p>The installer needs JavaScript.</p></noscript>
</div>

## Connecting your board

Boards with USB (ESP32 dev boards, LilyGO, Heltec) just plug in.

ExpressLRS receivers have no USB of their own. Wire them to a USB-to-serial adapter (an "FTDI") as shown in [Getting Started](../getting-started.md#connect-boards-without-usb): adapter TX to receiver RX, RX to TX, 5V and GND. Then put the receiver in bootloader mode by holding its **BOOT** button, or bridging the BOOT pad to ground, while you plug the adapter in. Release it once it is powered.

!!! tip "Already running FormationFlight?"
    You do not need to wire anything up to update it. Download the file here, join the node's WiFi, and upload it on the node's **Update** page. ExpressLRS receivers and other ESP8285 boards get a `.bin.gz`: upload it as it is, without unzipping it. Those boards only have room to receive the compressed image.

## What the options do

**LoRa band** is the band the node boots on. Every node in a group has to be on the same one, and it has to be legal where you fly. You can change it later in the node's web UI. Only the bands your board's radio is built for are offered, so ExpressLRS 900 MHz receivers offer 868 and 915, never 433.

**Node name** and **group passphrase** are applied the first time the node boots with no saved settings, so a new node comes up already named and in your group. A node that already has settings keeps them, unless you tick **Erase the whole flash first**. That also wipes WiFi and Follow settings.

---

<small>The first FormationFlight web installer was written by [Pastor Hudson](https://github.com/pastorhudson) ([original project](https://github.com/pastorhudson/formationflight-web-installer)). Flashing uses Espressif's [esptool-js](https://github.com/espressif/esptool-js).</small>
