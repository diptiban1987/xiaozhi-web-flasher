# Build & Flash Guide

## Pin Configuration (Nayak S3 OLED)

| Component | Signal | GPIO | Notes |
|---|---|---|---|
| **OLED** | SDA | GPIO 8 | I2C |
| **OLED** | SCL | GPIO 9 | I2C |
| **INMP441** | SCK (BCLK) | GPIO 14 | I2S mic clock |
| **INMP441** | WS (LRCLK) | GPIO 15 | I2S mic word select |
| **INMP441** | SD (Data) | GPIO 16 | I2S mic data |
| **MAX98357A** | BCLK | GPIO 17 | I2S speaker clock |
| **MAX98357A** | LRC | GPIO 18 | I2S speaker word select |
| **MAX98357A** | DIN | GPIO 21 | I2S speaker data |
| **LED** | Built-in | GPIO 2 | |
| **Button** | Boot | GPIO 0 | |

To change pins, edit `main/boards/xiaozhi-s3-oled/config.h`.

---

## 1. Prerequisites

- ESP-IDF 5.5 installed (`C:\Espressif\frameworks\esp-idf-v5.5.4`)
- Python 3.11+
- Git

---

## 2. Sync Web Flasher Pins (after changing config.h)

The web flasher (`index.html` / `app.js`) shows the pinout. When you change pins in `config.h`, sync them:

### Option A — Auto-generate (recommended)

```cmd
python scripts/gen_board_pins.py main/boards/xiaozhi-s3-oled board_pins.json
```

If `config.h` is not on local disk, pipe the content:

```cmd
type main\boards\xiaozhi-s3-oled\config.h | python scripts\gen_board_pins.py nayak-s3-oled - board_pins.json
```

### Option B — Manual edit

Edit `app.js` — find the `BOARD_PINOUTS['nayak-s3-oled']` entry and update the `pins` array.

---

## 3. Build Firmware

### Step 1 — Open ESP-IDF Environment

```cmd
C:\Espressif\frameworks\esp-idf-v5.5.4\export.bat
```

### Step 2 — Navigate to Project

```cmd
cd D:\Humanoid_New\xiaozhi_new\nayaks_ai_lab
```

### Step 3 — Set Target (first time only)

```cmd
idf.py set-target esp32s3
```

### Step 4 — Configure Board (optional)

```cmd
idf.py menuconfig
```

Navigate to **Board Options → Board Type** and select the correct board (e.g. `XiaoZhi S3 OLED`).

### Step 5 — Build

```cmd
idf.py build
```

Output files:
- `build/xiaozhi.bin` — main firmware
- `build/bootloader/bootloader.bin` — bootloader
- `build/partition_table/partition-table.bin` — partition table
- `build/ota_data_initial.bin` — OTA data
- `build/generated_assets.bin` — assets (wake words, fonts, sounds)

---

## 4. Flash Firmware

### Option A — Flash via USB (Recommended)

```cmd
idf.py -p COM_PORT flash
```

Replace `COM_PORT` with your device port, e.g. `COM3`.

### Option B — Flash via esptool directly

```cmd
python -m esptool --chip esp32s3 -b 460800 --before default_reset ^
  --after hard_reset write_flash --flash_mode dio --flash_size 16MB ^
  --flash_freq 80m 0x0 build/bootloader/bootloader.bin ^
  0x8000 build/partition_table/partition-table.bin ^
  0xd000 build/ota_data_initial.bin ^
  0x20000 build/xiaozhi.bin ^
  0x800000 build/generated_assets.bin
```

### Option C — Using flash args file

```cmd
cd build
python -m esptool --chip esp32s3 -b 460800 --before default_reset ^
  --after hard_reset write_flash "@flash_args"
```

---

## 5. Monitor Serial Output

```cmd
idf.py -p COM_PORT monitor
```

Press `Ctrl+]` to exit monitor.

---

## 6. Quick Rebuild (after code changes)

```cmd
idf.py build && idf.py -p COM_PORT flash monitor
```

---

## 7. Live Web Flasher (Testing)

After generating `board_pins.json`, serve locally:

```cmd
python -m http.server 8080
```

Open `http://localhost:8080` in Chrome/Edge. The page loads `board_pins.json` at startup and displays the live pinout.

---

## 8. Troubleshooting

| Issue | Fix |
|---|---|
| `A fatal error occurred: Failed to connect` | Hold BOOT, press RESET, release BOOT, retry flash |
| `idf.py not recognized` | Run `export.bat` first |
| Build errors after changing board | Run `idf.py fullclean` then `idf.py build` |
| `Flash size mismatch` | Verify `--flash_size` matches your board (16MB for N16R8) |
| Pinout shows old values | Regenerate `board_pins.json` (see step 2) |
