"""
Generate board_pins.json from a board's config.h.

Usage:
    python scripts/gen_board_pins.py <board_dir> [output_path]
    cat config.h | python scripts/gen_board_pins.py <board_id> - [output_path]

Examples:
    python scripts/gen_board_pins.py main/boards/xiaozhi-s3-oled
    python scripts/gen_board_pins.py main/boards/xiaozhi-s3-oled board_pins.json

Piped usage (when config.h is not on local disk):
    # On Windows (PowerShell):
    Get-Content main/boards/xiaozhi-s3-oled/config.h | python scripts/gen_board_pins.py nayak-s3-oled - board_pins.json
"""

import json
import os
import re
import sys


def parse_config_lines(lines):
    defines = {}
    for line in lines:
        m = re.match(r'#define\s+(\w+)\s+GPIO_NUM_(\d+)', line)
        if m:
            defines[m.group(1)] = int(m.group(2))
    return defines


def parse_config_h(config_path):
    with open(config_path, 'r') as f:
        return parse_config_lines(f.readlines())


PIN_MAP = {
    'MIC': [
        ('AUDIO_I2S_MIC_GPIO_WS', 'MIC WS', 'I2S word select'),
        ('AUDIO_I2S_MIC_GPIO_SCK', 'MIC SCK', 'I2S bit clock'),
        ('AUDIO_I2S_MIC_GPIO_DIN', 'MIC DIN', 'I2S data in'),
    ],
    'SPK': [
        ('AUDIO_I2S_SPK_GPIO_DOUT', 'SPK DOUT', 'I2S data out'),
        ('AUDIO_I2S_SPK_GPIO_BCLK', 'SPK BCLK', 'I2S bit clock'),
        ('AUDIO_I2S_SPK_GPIO_LRCK', 'SPK LRCK', 'I2S left/right clock'),
    ],
    'I2S_GPIO': [
        ('AUDIO_I2S_GPIO_MCLK', 'I2S MCLK', 'Audio master clock'),
        ('AUDIO_I2S_GPIO_WS', 'I2S WS', 'I2S word select'),
        ('AUDIO_I2S_GPIO_BCLK', 'I2S BCLK', 'I2S bit clock'),
        ('AUDIO_I2S_GPIO_DIN', 'I2S DIN', 'I2S data in'),
        ('AUDIO_I2S_GPIO_DOUT', 'I2S DOUT', 'I2S data out'),
    ],
    'DISPLAY': [
        ('DISPLAY_SDA_PIN', 'OLED SDA', 'I2C data'),
        ('DISPLAY_SCL_PIN', 'OLED SCL', 'I2C clock'),
    ],
    'OTHER': [
        ('BUILTIN_LED_GPIO', 'Status LED', 'Built-in indicator'),
        ('BOOT_BUTTON_GPIO', 'BOOT Button', 'Hold for flash mode'),
    ],
}


def build_pins(defines):
    pins = []
    for group_name, entries in PIN_MAP.items():
        for key, func, notes in entries:
            if key in defines:
                pins.append({
                    'func': func,
                    'gpio': f'GPIO {defines[key]}',
                    'notes': notes,
                })
    return pins


def get_board_meta(board_dir):
    meta = {
        'name': os.path.basename(board_dir),
        'target': 'ESP32-S3',
        'display': 'SSD1306 OLED 128x64 (I2C)',
        'flash': '16MB QIO 80MHz',
    }
    board_name = meta['name'].lower()

    if 'c3' in board_name:
        meta['target'] = 'ESP32-C3'
        meta['flash'] = '4MB DIO 40MHz'
    elif 'esp32' in board_name and 's3' not in board_name:
        meta['target'] = 'ESP32'
        meta['flash'] = '4MB DIO 40MHz'

    if 'oled' in board_name:
        meta['display'] = 'SSD1306 OLED 128x64 (I2C)'
    elif 'tft' in board_name or 'lcd' in board_name:
        meta['display'] = 'TFT/LCD (SPI)'

    return meta


def main():
    if len(sys.argv) < 2:
        print(f'Usage: python {sys.argv[0]} <board_dir_or_id> [output_path]')
        print(f'   or: cat config.h | python {sys.argv[0]} <board_id> - [output_path]')
        sys.exit(1)

    board_arg = sys.argv[1]
    use_stdin = len(sys.argv) > 2 and sys.argv[2] == '-'
    output_path = sys.argv[3] if len(sys.argv) > 3 and use_stdin else (
        sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] != '-' else 'board_pins.json'
    )

    if use_stdin or not os.path.isdir(board_arg):
        if use_stdin:
            board_id = board_arg
        else:
            board_id = os.path.basename(board_arg)

        if use_stdin or not os.path.isfile(os.path.join(board_arg, 'config.h')):
            lines = sys.stdin.readlines() if use_stdin else []
            if not lines:
                if not os.path.isfile(board_arg):
                    print(f'Error: {board_arg} is not a valid path')
                    sys.exit(1)
                with open(board_arg, 'r') as f:
                    lines = f.readlines()
            defines = parse_config_lines(lines)
        else:
            defines = parse_config_h(os.path.join(board_arg, 'config.h'))
    else:
        board_dir = board_arg
        config_path = os.path.join(board_dir, 'config.h')
        if not os.path.isfile(config_path):
            print(f'Error: config.h not found at {config_path}')
            sys.exit(1)
        board_id = os.path.basename(board_dir)
        defines = parse_config_h(config_path)
    pins = build_pins(defines)
    meta = get_board_meta(board_dir)

    out = {
        board_id: {
            'name': meta['name'],
            'target': meta['target'],
            'display': meta['display'],
            'flash': meta['flash'],
            'pins': pins,
        }
    }

    output_path = sys.argv[2] if len(sys.argv) > 2 else 'web_flasher/board_pins.json'

    os.makedirs(os.path.dirname(output_path) if os.path.dirname(output_path) else '.', exist_ok=True)
    with open(output_path, 'w') as f:
        json.dump(out, f, indent=2)

    print(f'Generated {output_path}')
    print(f'  Board: {meta["name"]}')
    print(f'  Target: {meta["target"]}')
    print(f'  Pins: {len(pins)} entries')
    for p in pins:
        print(f'    {p["func"]:15s} {p["gpio"]:8s}  {p["notes"]}')


if __name__ == '__main__':
    main()
