# FormationFlight Hardware

## Supported Hardware

FormationFlight supports many targets for different hardware. If you don't see your hardware in this list, feel free to ask in the [FormationFlight Discord](https://discord.gg/npaX3VxQjh)

### ExpressLRS Hardware

Highly recommended for new users. The smallest, lightest, most affordable way to get started with FormationFlight.

FormationFlight runs on nearly every ExpressLRS receiver, using the same board definitions ExpressLRS itself uses. That covers ESP8285, ESP32, ESP32-C3 and ESP32-S3 receivers with an SX127x (900 MHz), SX1280 (2.4 GHz) or LR1121 (dual band) radio, including receivers with a PA/LNA, true diversity receivers, antenna-switching receivers, and Gemini dual-radio receivers. The [Web Installer](installer/index.md) lists every supported receiver by manufacturer.

What is not supported:

- PWM-only receivers. FormationFlight talks to your flight controller over a UART, and these have none.
- Receivers with a built-in VTx.
- STM32-based receivers, such as the FrSky R9 family and the original HappyModel ES915RX.

ExpressLRS 900 MHz receivers run on 868 or 915 MHz, 2.4 GHz receivers on 2.4 GHz, and LR1121 receivers on any of the three. Their RF front ends are not built for 433 MHz, so that band is not offered on them.

### Legacy Targets

Legacy targets from iNav Radar are also supported in FormationFlight. Each one boots on the band in its name, and can be switched to another in the node's web UI.

| Target Name             | Radios              | Supported Hardware             |
|-------------------------|---------------------|--------------------------------|
| `diy_LoRa_lilygo10_433` | 433MHz LoRa, ESPNOW | TTGO/LILYGO LoRa32 v1.0 433MHz |
| `diy_LoRa_lilygo10_868` | 868MHz LoRa, ESPNOW | TTGO/LILYGO LoRa32 v1.0 868MHz |
| `diy_LoRa_lilygo10_915` | 915MHz LoRa, ESPNOW | TTGO/LILYGO LoRa32 v1.0 915MHz |
| `diy_LoRa_lilygo14_433` | 433MHz LoRa, ESPNOW | TTGO/LILYGO LoRa32 v1.4 433MHz |
| `diy_LoRa_lilygo14_868` | 868MHz LoRa, ESPNOW | TTGO/LILYGO LoRa32 v1.4 868MHz |
| `diy_LoRa_lilygo14_915` | 915MHz LoRa, ESPNOW | TTGO/LILYGO LoRa32 v1.4 915MHz |
| `diy_LoRa_lilygo16_433` | 433MHz LoRa, ESPNOW | TTGO/LILYGO LoRa32 v1.6 433MHz |
| `diy_LoRa_lilygo16_868` | 868MHz LoRa, ESPNOW | TTGO/LILYGO LoRa32 v1.6 868MHz |
| `diy_LoRa_lilygo16_915` | 915MHz LoRa, ESPNOW | TTGO/LILYGO LoRa32 v1.6 915MHz |
| `diy_LoRa_lilygo20_433` | 433MHz LoRa, ESPNOW | TTGO/LILYGO LoRa32 v2.0 433MHz |
| `diy_LoRa_lilygo20_868` | 868MHz LoRa, ESPNOW | TTGO/LILYGO LoRa32 v2.0 868MHz |
| `diy_LoRa_lilygo20_915` | 915MHz LoRa, ESPNOW | TTGO/LILYGO LoRa32 v2.0 915MHz |

### DIY Targets

Targets for non-standard hardware that might be useful for a few folks. For example, the T-Beam has built-in OLED & GPS which is nice for a beacon not attached to an FC, such as inside a car or at a landing point

| Target Name                  | Radios              | Supported Hardware        |
|------------------------------|---------------------|---------------------------|
| `diy_LoRa_lilygo_t-beam_915` | 915MHz LoRa, ESPNOW | TTGO/LILYGO T-Beam 915MHz |


### ESPNOW Targets

ESPNOW is a fallback radio protocol for FormationFlight, supported on ESP chips without LoRa. Its max range is 1.5km under **ideal conditions** and more like 200m under normal conditions. Prefer LoRa in every case, but ESPNOW is left as an option for those who want to use it.

| Target Name                      | Radios | Supported Hardware                            |
|----------------------------------|--------|-----------------------------------------------|
| `diy_ESPNOW_esp8266`             | ESPNOW | Various ESP8266 dev boards / embedded devices |
| `diy_ESPNOW_wemosd1`             | ESPNOW | Wemos D1 Mini                                 |
| `diy_ESPNOW_lolin_d32`           | ESPNOW | LoLin D32 ESP32 dev board                     |
| `diy_ESPNOW_adafruit_qtpy_esp32` | ESPNOW | Adafruit QtPy ESP32 dev board                 |

