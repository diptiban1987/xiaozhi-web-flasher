# Xiaozhi AI - Bread Compact ESP32 Board

## Overview

The **Bread Compact ESP32** is a development board built around the **ESP32 WROOM-32D** chip. It features an OLED display, I2S microphone, I2S speaker amplifier, a 4G module (ML307), and touch controls — all on a breadboard-friendly layout.

## Specifications

| Component | Detail |
|-----------|--------|
| MCU | ESP32 WROOM-32D (dual-core Xtensa LX6, 240MHz) |
| Flash | 4MB SPI flash |
| PSRAM | 8MB (optional, depending on module variant) |
| Display | SSD1306 OLED 128x64 or 128x32 (I2C) |
| Audio Input | I2S digital microphone (INMP441 / MSM261) |
| Audio Output | I2S amplifier + speaker (MAX98357 / PCM5102) |
| Connectivity | Wi-Fi 802.11 b/g/n, Bluetooth 4.2 BR/EDR + BLE |
| Cellular | ML307 4G module (UART) |
| Buttons | Boot (GPIO0), Touch (GPIO5), ASR Wake (GPIO19) |
| LED | Built-in status LED (GPIO2) |

## Pinout

| Function | GPIO | Notes |
|----------|------|-------|
| **Display** | | |
| OLED SDA | GPIO 21 | I2C data |
| OLED SCL | GPIO 22 | I2C clock |
| **I2S Microphone** | | |
| MIC WS | GPIO 25 | Word select (L/R) |
| MIC SCK | GPIO 26 | Bit clock |
| MIC DIN | GPIO 25 | Data input |
| **I2S Speaker** | | |
| SPK DOUT | GPIO 33 | Data output |
| SPK BCLK | GPIO 14 | Bit clock |
| SPK LRCK | GPIO 27 | Left/right clock |
| **4G Module (ML307)** | | |
| ML307 RX | GPIO 16 | Connect to ML307 TX |
| ML307 TX | GPIO 17 | Connect to ML307 RX |
| **Buttons** | | |
| BOOT | GPIO 0 | Hold during reset for flash mode |
| TOUCH | GPIO 5 | Touch-to-talk |
| ASR WAKE | GPIO 19 | Wake word trigger |
| **Other** | | |
| Status LED | GPIO 2 | Active high |
| Lamp Control | GPIO 18 | MOSFET/lamp control (MCP test) |

## Wiring Diagram (Text)

```
ESP32 WROOM-32D                    OLED SSD1306
┌─────────────┐                   ┌──────────┐
│ GPIO 4 ─────┼───────────────────│ SDA      │
│ GPIO 15 ────┼───────────────────│ SCL      │
│ 3.3V ───────┼───────────────────│ VCC      │
│ GND ────────┼───────────────────│ GND      │
└─────────────┘                   └──────────┘

ESP32                             I2S Mic (INMP441)
┌─────────────┐                   ┌──────────┐
│ GPIO 25 ────┼───────────────────│ WS       │
│ GPIO 26 ────┼───────────────────│ SCK      │
│ GPIO 32 ────┼───────────────────│ DOUT     │
│ 3.3V ───────┼───────────────────│ VDD      │
│ GND ────────┼───────────────────│ GND      │
│ GPIO 15 ────┼───────────────────│ L/R      │(*) 
└─────────────┘                   └──────────┘
(*) L/R = GND for left channel, 3.3V for right

ESP32                             I2S Amp (MAX98357)
┌─────────────┐                   ┌──────────┐
│ GPIO 33 ────┼───────────────────│ DIN      │
│ GPIO 14 ────┼───────────────────│ BCLK     │
│ GPIO 27 ────┼───────────────────│ LRC      │
│ 5V ─────────┼───────────────────│ VDD      │
│ GND ────────┼───────────────────│ GND      │
│             │                   │ OUT+ ──── Speaker (+)
│             │                   │ OUT- ──── Speaker (-)
└─────────────┘                   └──────────┘

ESP32                             ML307 4G Module
┌─────────────┐                   ┌──────────┐
│ GPIO 16 ────┼───────────────────│ TX       │
│ GPIO 17 ────┼───────────────────│ RX       │
│ GND ────────┼───────────────────│ GND      │
└─────────────┘                   └──────────┘
```

## How to Flash (Web Flasher)

1. **Open** [xiaozhi-web-flasher](https://diptiban1987.github.io/xiaozhi-web-flasher/) in **Chrome** or **Edge** (desktop).
2. **Plug in** your ESP32 via USB.
3. **Click Connect** → select the COM port in the browser dialog.
4. **Click Flash Device** → wait ~1-2 minutes (do not unplug).
5. **Reboot** → the device boots and creates a **Xiaozhi-XXXX** Wi-Fi hotspot.
6. **Connect** your phone/computer to that hotspot (no password).
7. **Setup portal** opens automatically → enter your home Wi-Fi credentials.

The device will reboot again and connect to your home Wi-Fi. You're done!

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Failed to open serial port" | Close Arduino IDE / Serial Monitor / Putty, unplug & replug USB, refresh page |
| "No device found" | Check USB cable (must support data, not charge-only), try a different USB port |
| OLED not working | Check I2C wiring (GPIO4=SDA, GPIO15=SCL), verify 3.3V power |
| No audio | Check I2S wiring, verify speaker is connected to amp OUT+ / OUT- |
| 4G not connecting | Check SIM card is inserted, verify antenna is connected, check signal strength |
| Device not booting after flash | Hold BOOT button (GPIO0), press and release EN/RST, release BOOT — re-enter flash mode and flash again |

## Build from Source (for developers)

Requires ESP-IDF v5.5 or later.

```bash
cd xiaozhi-firmware
idf.py set-target esp32
idf.py menuconfig
# Navigate: Xiaozhi Assistant → Board Type → 面包板 ESP32 DevKit
idf.py build
```

### ESP32-S3 (esp32s3-korvo2-v3)

```bash
cd xiaozhi-firmware
idf.py set-target esp32s3
idf.py menuconfig
# Navigate: Xiaozhi Assistant → Board Type → ESP-Korvo-2 V3
idf.py build
```

The merged binary will be at `build/merged-binary.bin`.

## Board Variants

| Variant | Display | Config |
|---------|---------|--------|
| bread-compact-esp32 | SSD1306 128x64 OLED | Default |
| bread-compact-esp32-128x32 | SSD1306 128x32 OLED | Set `CONFIG_OLED_SSD1306_128X32=y` |
| bread-compact-esp32-lcd | ST7789/ST7735/etc. LCD | Uses SPI LCD instead of I2C OLED |
| esp32s3-korvo2-v3 | LCD (480x480) | ESP32-S3 Korvo-2 V3 (16MB flash, 8MB PSRAM, QIO 80MHz) |
