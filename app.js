import { ESPLoader, Transport } from "https://unpkg.com/esptool-js@0.6.0/bundle.js";

const connectBtn = document.getElementById('connect-btn');
const disconnectBtn = document.getElementById('disconnect-btn');
const flashBtn = document.getElementById('flash-btn');
const boardSelect = document.getElementById('board-select');
const statusDot = document.querySelector('.status-dot');
const statusText = document.querySelector('.status-text');
const terminal = document.getElementById('terminal');
const clearConsole = document.getElementById('clear-console');
const progressContainer = document.querySelector('.progress-container');
const progressBar = document.getElementById('progress-bar');
const progressPercentage = document.getElementById('progress-percentage');
const progressStatus = document.getElementById('progress-status');

const BOARD_PINOUTS = {
    'bread-compact-esp32': {
        name: 'Standard ESP32 (WROOM-32D)',
        target: 'ESP32',
        display: 'SSD1306 OLED 128x64 (I2C)',
        flash: '4MB DIO 40MHz',
        pins: [
            { func: 'OLED SDA', gpio: 'GPIO 20', notes: 'I2C data' },
            { func: 'OLED SCL', gpio: 'GPIO 21', notes: 'I2C clock' },
            { func: 'MIC WS', gpio: 'GPIO 18', notes: 'I2S word select' },
            { func: 'MIC SCK', gpio: 'GPIO 14', notes: 'I2S bit clock' },
            { func: 'MIC DIN', gpio: 'GPIO 34', notes: 'I2S data in' },
            { func: 'SPK DOUT', gpio: 'GPIO 25', notes: 'I2S data out' },
            { func: 'SPK BCLK', gpio: 'GPIO 27', notes: 'I2S bit clock' },
            { func: 'SPK LRCK', gpio: 'GPIO 26', notes: 'I2S left/right clock' },
            { func: 'ML307 RX', gpio: 'GPIO 16', notes: '4G module UART RX' },
            { func: 'ML307 TX', gpio: 'GPIO 17', notes: '4G module UART TX' },
            { func: 'BOOT Button', gpio: 'GPIO 0', notes: 'Hold for flash mode' },
            { func: 'TOUCH Button', gpio: 'GPIO 5', notes: 'Touch-to-talk' },
            { func: 'ASR Wake', gpio: 'GPIO 19', notes: 'Wake word trigger' },
            { func: 'Status LED', gpio: 'GPIO 2', notes: 'Active high' },
        ]
    },
    'esp32s3-korvo2-v3': {
        name: 'ESP32-S3 Korvo-2 V3',
        target: 'ESP32-S3',
        display: 'LCD 480x480 (SPI) + Camera',
        flash: '16MB QIO 80MHz',
        pins: [
            { func: 'I2S MCLK', gpio: 'GPIO 16', notes: 'Audio master clock' },
            { func: 'I2S WS', gpio: 'GPIO 45', notes: 'I2S word select' },
            { func: 'I2S BCLK', gpio: 'GPIO 9', notes: 'I2S bit clock' },
            { func: 'I2S DIN', gpio: 'GPIO 10', notes: 'I2S data in (ES7210)' },
            { func: 'I2S DOUT', gpio: 'GPIO 8', notes: 'I2S data out (ES8311)' },
            { func: 'CODEC SDA', gpio: 'GPIO 17', notes: 'ES8311/ES7210 I2C data' },
            { func: 'CODEC SCL', gpio: 'GPIO 18', notes: 'ES8311/ES7210 I2C clock' },
            { func: 'AMP PA', gpio: 'GPIO 48', notes: 'Audio power amplifier enable' },
            { func: 'BOOT Button', gpio: 'GPIO 5', notes: 'Hold for flash mode' },
            { func: 'CAM XCLK', gpio: 'GPIO 40', notes: 'Camera master clock' },
            { func: 'CAM PCLK', gpio: 'GPIO 11', notes: 'Camera pixel clock' },
            { func: 'CAM VSYNC', gpio: 'GPIO 21', notes: 'Camera vertical sync' },
            { func: 'CAM HREF', gpio: 'GPIO 38', notes: 'Camera horizontal ref' },
            { func: 'CAM D0-D7', gpio: 'GPIO 13,47,14,3,12,42,41,39', notes: 'Camera data bus' },
        ]
    },
    'nayak-s3-oled': {
        name: 'Nayak S3 OLED (DevKitC-1)',
        target: 'ESP32-S3',
        display: 'SSD1306 OLED 128x64 (I2C)',
        flash: '16MB QIO 80MHz',
        pins: [
            { func: 'OLED SDA', gpio: 'GPIO 8', notes: 'I2C data' },
            { func: 'OLED SCL', gpio: 'GPIO 9', notes: 'I2C clock' },
            { func: 'MIC SCK', gpio: 'GPIO 14', notes: 'I2S bit clock' },
            { func: 'MIC WS', gpio: 'GPIO 15', notes: 'I2S word select' },
            { func: 'MIC DIN', gpio: 'GPIO 16', notes: 'I2S data in' },
            { func: 'SPK BCLK', gpio: 'GPIO 17', notes: 'I2S bit clock' },
            { func: 'SPK LRCK', gpio: 'GPIO 18', notes: 'I2S left/right clock' },
            { func: 'SPK DOUT', gpio: 'GPIO 21', notes: 'I2S data out' },
            { func: 'BOOT Button', gpio: 'GPIO 0', notes: 'Hold for flash mode' },
            { func: 'Status LED', gpio: 'GPIO 2', notes: 'Active high (on = powered)' },
        ]
    }
};

// Load board_pins.json at startup to override hardcoded pinouts
(async function loadBoardPins() {
    try {
        const resp = await fetch('./board_pins.json');
        if (resp.ok) {
            const remote = await resp.json();
            let merged = 0;
            for (const [id, data] of Object.entries(remote)) {
                if (BOARD_PINOUTS[id]) {
                    Object.assign(BOARD_PINOUTS[id], data);
                    merged++;
                } else {
                    BOARD_PINOUTS[id] = data;
                    merged++;
                }
            }
            if (merged > 0) {
                console.log(`[pins] Loaded ${merged} board(s) from board_pins.json`);
                renderPinout(boardSelect.value);
            }
        }
    } catch (e) {
        console.log('[pins] No board_pins.json found, using defaults');
    }
})();

function generatePinoutMarkdown(boardId) {
    const data = BOARD_PINOUTS[boardId];
    if (!data) return '';
    let md = `# ${data.name} — Pinout Reference\n\n`;
    md += `**Target:** ${data.target}  \n`;
    md += `**Display:** ${data.display}  \n`;
    md += `**Flash:** ${data.flash}  \n\n`;
    md += `## Pin Map\n\n`;
    md += `| Function | GPIO | Notes |\n`;
    md += `|----------|------|-------|\n`;
    for (const p of data.pins) {
        md += `| ${p.func} | ${p.gpio} | ${p.notes} |\n`;
    }
    return md;
}

function renderPinout(boardId) {
    const container = document.getElementById('pinout-panel');
    const data = BOARD_PINOUTS[boardId];
    if (!data) { container.style.display = 'none'; return; }

    document.getElementById('pinout-board-name').textContent = data.name;
    document.getElementById('pinout-target').textContent = data.target;
    document.getElementById('pinout-display').textContent = data.display;
    document.getElementById('pinout-flash').textContent = data.flash;

    const tbody = document.getElementById('pinout-table-body');
    tbody.innerHTML = '';
    for (const p of data.pins) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${p.func}</td><td><span class="gpio-badge">${p.gpio}</span></td><td>${p.notes}</td>`;
        tbody.appendChild(tr);
    }
    container.style.display = 'block';
}

boardSelect.addEventListener('change', () => {
    renderPinout(boardSelect.value);
});

document.getElementById('download-pinout-btn').addEventListener('click', () => {
    const boardId = boardSelect.value;
    const data = BOARD_PINOUTS[boardId];
    if (!data) return;
    const md = generatePinoutMarkdown(boardId);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${boardId}-pinout.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    logToTerminal(`Downloaded pinout: ${boardId}-pinout.md`, 'success');
});

let device = null;
let transport = null;
let esploader = null;
let connected = false;

const logToTerminal = (msg, type = 'normal') => {
    const p = document.createElement('p');
    p.textContent = msg;
    if (type !== 'normal') p.classList.add(type);
    terminal.appendChild(p);
    terminal.scrollTop = terminal.scrollHeight;
};

clearConsole.addEventListener('click', () => {
    terminal.innerHTML = '';
});

const setConnectionStatus = (isConnected) => {
    connected = isConnected;
    if (isConnected) {
        statusDot.classList.add('connected');
        statusText.textContent = 'Connected to ESP32';
        connectBtn.style.display = 'none';
        disconnectBtn.style.display = 'inline-flex';
        flashBtn.disabled = false;
        logToTerminal('Device connected.', 'success');
    } else {
        statusDot.classList.remove('connected');
        statusText.textContent = 'Disconnected';
        connectBtn.style.display = 'inline-flex';
        disconnectBtn.style.display = 'none';
        flashBtn.disabled = true;

        if (transport) {
            transport.disconnect();
            transport = null;
        }
        esploader = null;
        logToTerminal('Device disconnected.');
    }
};

const errorModal = document.getElementById('error-modal');
const errorTitle = document.getElementById('error-title');
const errorSubtitle = document.getElementById('error-subtitle');
const errorTips = document.getElementById('error-tips');

function showErrorHelp(errorMsg) {
    const msg = errorMsg.toLowerCase();
    errorTips.innerHTML = '';
    const tips = [];

    if (msg.includes('open serial port') || msg.includes('failed to open')) {
        errorTitle.textContent = 'Port in Use';
        errorSubtitle.textContent = 'Another program is using this COM port.';
        tips.push(
            { icon: 'fa-solid fa-xmark', text: 'Close any other program using the COM port (Arduino IDE, Serial Monitor, Putty, etc.)' },
            { icon: 'fa-solid fa-arrow-rotate-left', text: 'Unplug the USB cable, wait 5 seconds, then plug it back in' },
            { icon: 'fa-solid fa-rotate', text: 'Refresh this page and try again' }
        );
    } else if (msg.includes('requestport') || msg.includes('cancelled')) {
        errorTitle.textContent = 'Selection Cancelled';
        errorSubtitle.textContent = 'You closed the port selection dialog.';
        tips.push(
            { icon: 'fa-solid fa-plug', text: 'Make sure the ESP32 is plugged in via USB' },
            { icon: 'fa-solid fa-repeat', text: 'Click "Connect" and select the correct COM port when prompted' }
        );
    } else if (msg.includes('network') || msg.includes('fetch') || msg.includes('failed to load')) {
        errorTitle.textContent = 'Download Failed';
        errorSubtitle.textContent = 'Could not download firmware files.';
        tips.push(
            { icon: 'fa-solid fa-wifi', text: 'Check your internet connection' },
            { icon: 'fa-solid fa-rotate', text: 'Refresh the page and try again' }
        );
    } else {
        errorTitle.textContent = 'Something Went Wrong';
        errorSubtitle.textContent = errorMsg;
        tips.push(
            { icon: 'fa-solid fa-arrow-rotate-left', text: 'Unplug the USB cable, wait 5 seconds, then plug it back in' },
            { icon: 'fa-solid fa-rotate', text: 'Refresh this page and try again' },
            { icon: 'fa-solid fa-circle-question', text: 'Make sure you are using Chrome or Edge on a desktop computer' }
        );
    }

    for (const tip of tips) {
        const div = document.createElement('div');
        div.className = 'tip-item';
        div.innerHTML = `<i class="${tip.icon}"></i><span>${tip.text}</span>`;
        errorTips.appendChild(div);
    }

    errorModal.style.display = 'flex';
}

document.getElementById('error-close-btn').addEventListener('click', () => {
    errorModal.style.display = 'none';
});
document.getElementById('error-retry-btn').addEventListener('click', () => {
    errorModal.style.display = 'none';
    connectBtn.click();
});

connectBtn.addEventListener('click', async () => {
    if (!navigator.serial) {
        logToTerminal('Error: Web Serial API not supported. Use Chrome or Edge.', 'error');
        showErrorHelp('Web Serial API requires Google Chrome or Microsoft Edge on desktop.');
        return;
    }

    try {
        logToTerminal('Requesting port...', 'info');
        device = await navigator.serial.requestPort();
        transport = new Transport(device);

        const flashOptions = {
            transport,
            baudrate: 921600,
            terminal: {
                clean: () => {},
                writeLine: (data) => logToTerminal(data),
                write: (data) => logToTerminal(data)
            }
        };

        esploader = new ESPLoader(flashOptions);

        logToTerminal('Connecting to ESP32...', 'info');
        await esploader.main();

        setConnectionStatus(true);
    } catch (e) {
        logToTerminal(`Connection Error: ${e.message}`, 'error');
        setConnectionStatus(false);
        showErrorHelp(e.message);
    }
});

disconnectBtn.addEventListener('click', async () => {
    setConnectionStatus(false);
});

async function fetchBinary(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load ${url}`);
    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
}

flashBtn.addEventListener('click', async () => {
    if (!connected || !esploader) {
        logToTerminal('Not connected to a device.', 'error');
        return;
    }

    const board = boardSelect.value;
    logToTerminal(`Preparing to flash firmware: ${board}`, 'info');

    flashBtn.disabled = true;
    progressContainer.style.display = 'block';

    try {
        const baseUrl = `./firmwares/${board}/`;
        logToTerminal(`Downloading binaries from ${baseUrl}...`, 'info');

        progressStatus.textContent = "Downloading binaries...";

        let bootloaderOffset = 0x0;
        let flashSize = '4MB';
        let flashMode = 'dio';
        let flashFreq = '40m';
        if (board === 'bread-compact-esp32') {
            bootloaderOffset = 0x1000;
        } else if (board === 'esp32s3-korvo2-v3' || board === 'nayak-s3-oled') {
            flashSize = '16MB';
            flashMode = 'qio';
            flashFreq = '80m';
        }

        const appAddr = (board === 'esp32s3-korvo2-v3' || board === 'nayak-s3-oled') ? 0x20000 : 0x10000;
        const assetsAddr = (board === 'esp32s3-korvo2-v3' || board === 'nayak-s3-oled') ? 0x800000 : 0x300000;

        const firmwareDefs = [
            { url: 'bootloader.bin', address: bootloaderOffset },
            { url: 'partition-table.bin', address: 0x8000 },
            { url: 'ota_data_initial.bin', address: 0xd000 },
            { url: 'xiaozhi.bin', address: appAddr },
            { url: 'generated_assets.bin', address: assetsAddr, optional: true }
        ];
        const files = [];
        for (const def of firmwareDefs) {
            try {
                const data = await fetchBinary(`${baseUrl}${def.url}`);
                if (data.length > 0) {
                    files.push({ data, address: def.address });
                } else if (!def.optional) {
                    throw new Error(`${def.url} is empty`);
                }
            } catch (e) {
                if (!def.optional) throw e;
            }
        }

        logToTerminal('Download complete. Erasing flash...', 'info');
        progressStatus.textContent = "Erasing flash...";

        const totalSize = files.reduce((acc, curr) => acc + curr.data.length, 0);

        await esploader.writeFlash({
            fileArray: files.map(f => ({
                data: f.data,
                address: f.address
            })),
            flashSize: flashSize,
            flashMode: flashMode,
            flashFreq: flashFreq,
            eraseAll: true,
            compress: true,
            reportProgress: (fileIndex, bytesSent, totalBytes) => {
                const currentWritten = files.slice(0, fileIndex).reduce((acc, curr) => acc + curr.data.length, 0) + bytesSent;
                const percent = Math.round((currentWritten / totalSize) * 100);
                progressBar.style.width = `${percent}%`;
                progressPercentage.textContent = `${percent}%`;
                progressStatus.textContent = `Writing file ${fileIndex + 1} of ${files.length}...`;
            }
        });

        logToTerminal('Flashing complete!', 'success');
        progressStatus.textContent = "Complete!";
        progressPercentage.textContent = "100%";
        progressBar.style.background = "var(--success-color)";

        logToTerminal('Rebooting device...', 'info');
        progressStatus.textContent = "Rebooting...";

        await transport.setDTR(false);
        await new Promise((r) => setTimeout(r, 100));
        await transport.setDTR(true);

        await new Promise((r) => setTimeout(r, 2000));

    } catch (e) {
        logToTerminal(`Flashing Error: ${e.message}`, 'error');
        progressStatus.textContent = "Failed!";
        progressBar.style.background = "var(--danger-color)";
        showErrorHelp(e.message);
    } finally {
        flashBtn.disabled = false;
        if (progressPercentage.textContent === "100%") {
            await startSerialMonitor();
        }
    }
});

let serialReader = null;
let serialKeepReading = false;
let detectedSsid = null;
let portalPollTimer = null;
let bootTimer = null;

function getEl(id) { return document.getElementById(id); }

function showSetupStep() {
    getEl('step-setup').style.display = 'block';
    getEl('step-setup').scrollIntoView({ behavior: 'smooth' });
}

function showHotspotModal() {
    getEl('hotspot-modal').style.display = 'flex';
}

function hideHotspotModal() {
    getEl('hotspot-modal').style.display = 'none';
}

getEl('modal-close-btn').addEventListener('click', hideHotspotModal);

async function startSerialMonitor() {
    showSetupStep();

    try {
        logToTerminal('Opening serial port at 115200 baud...', 'info');
        progressStatus.textContent = "Opening serial...";

        if (transport) {
            await transport.disconnect();
            transport = null;
            await new Promise((r) => setTimeout(r, 500));
        }

        await device.open({ baudRate: 115200 });

        getEl('setup-phase-1').style.display = 'block';
        logToTerminal('Listening for ESP32 logs...', 'success');

        const decoder = new TextDecoderStream();
        device.readable.pipeTo(decoder.writable).catch(() => {});
        const inputStream = decoder.readable;
        serialReader = inputStream.getReader();
        serialKeepReading = true;

        let buffer = '';
        const vcodeBox = document.getElementById('vcode-display');
        const vcodeContainer = document.querySelector('.verification-box');
        let bootDetected = false;

        const failTimeout = setTimeout(() => {
            if (!bootDetected) {
                logToTerminal('[SETUP] No boot output. Try a manual power cycle.', 'info');
                vcodeBox.textContent = 'No boot output detected';
                vcodeBox.classList.remove('blink');
                advanceToPhase2();
            }
        }, 20000);

        while (serialKeepReading) {
            const { value, done } = await serialReader.read();
            if (done) {
                serialReader.releaseLock();
                break;
            }
            if (value) {
                buffer += value;
                const lines = buffer.split('\n');
                buffer = lines.pop();

                for (let line of lines) {
                    line = line.trim();
                    if (!line) continue;
                    logToTerminal(line);

                    if (!bootDetected) {
                        bootDetected = true;
                        clearTimeout(failTimeout);
                        vcodeBox.textContent = 'Device booted — listening...';
                        vcodeBox.classList.remove('blink');
                        bootTimer = setTimeout(() => {
                            advanceToPhase2();
                            showHotspotModal();
                            startPortalPolling();
                        }, 8000);
                    }

                    const ssidMatch = line.match(/(?:AP SSID|SSID|Hotspot):\s*(Nayak[-\w]+)/i);
                    if (ssidMatch && ssidMatch[1]) {
                        detectedSsid = ssidMatch[1];
                        const name = detectedSsid.replace('Nayak-', '') || detectedSsid;
                        getEl('ssid-suffix').textContent = name;
                        getEl('modal-ssid-suffix').textContent = name;
                        logToTerminal(`[SETUP] Detected hotspot: ${detectedSsid}`, 'success');
                        clearTimeout(bootTimer);
                        advanceToPhase2();
                        showHotspotModal();
                        startPortalPolling();
                    }

                    const codeMatch = line.match(/VERIFICATION CODE:\s*(\w+)/i);
                    if (codeMatch && codeMatch[1]) {
                        const code = codeMatch[1];
                        vcodeBox.textContent = code;
                        vcodeBox.classList.remove('blink');
                        vcodeContainer.classList.add('active');
                        logToTerminal(`[SETUP] Verification Code: ${code}`, 'success');
                    }
                }
            }
        }
    } catch (e) {
        logToTerminal(`[SETUP] Serial error: ${e.message}`, 'error');
        logToTerminal('[SETUP] Try a manual power cycle (unplug/replug USB).', 'info');
        advanceToPhase2();
    }
}

function advanceToPhase2() {
    if (getEl('setup-phase-2').style.display !== 'none') return;
    logToTerminal('---------------------------------------------------', 'info');
    logToTerminal('SETUP: Connect to the Nayak Wi-Fi hotspot to continue.', 'info');
    logToTerminal('---------------------------------------------------', 'info');
    getEl('setup-phase-1').style.display = 'none';
    getEl('setup-phase-2').style.display = 'block';
}

function advanceToPhase3() {
    if (getEl('setup-phase-3').style.display !== 'none') return;
    logToTerminal('---------------------------------------------------', 'info');
    logToTerminal('SETUP: Connected to device hotspot!', 'success');
    logToTerminal('---------------------------------------------------', 'info');
    getEl('setup-phase-2').style.display = 'none';
    getEl('setup-phase-3').style.display = 'block';
    hideHotspotModal();
}

function startPortalPolling() {
    if (portalPollTimer) return;
    const modalStatusDot = document.querySelector('#modal-status .status-dot');
    const modalStatusText = document.querySelector('#modal-status .status-text');
    const pageStatusDot = document.querySelector('#hotspot-status .status-dot');
    const pageStatusText = document.querySelector('#hotspot-status .status-text');
    let pollCount = 0;

    const updateStatus = (msg, connected) => {
        modalStatusText.textContent = msg;
        modalStatusDot.classList.toggle('connected', connected);
        pageStatusText.textContent = msg;
        pageStatusDot.classList.toggle('connected', connected);
    };

    updateStatus('Connect to Nayak hotspot in your Wi-Fi settings...', false);

    portalPollTimer = setInterval(async () => {
        pollCount++;
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 3000);
            await fetch('http://192.168.4.1/', { mode: 'no-cors', signal: controller.signal });
            clearTimeout(timeout);
            updateStatus('Hotspot detected! Opening portal...', true);
            clearInterval(portalPollTimer);
            portalPollTimer = null;
            getEl('open-portal-btn').style.display = 'inline-flex';
            getEl('modal-retry-btn').style.display = 'inline-flex';
            openPortalPage();
        } catch (e) {
            if (pollCount % 10 === 0) {
                const msg = `Still waiting... (connect to Nayak-${getEl('ssid-suffix').textContent})`;
                updateStatus(msg, false);
            }
        }
    }, 2000);
}

function openPortalPage() {
    window.open('http://192.168.4.1/', '_blank');
    advanceToPhase3();
}

getEl('open-portal-btn').addEventListener('click', openPortalPage);
getEl('reopen-portal-btn').addEventListener('click', openPortalPage);
getEl('modal-retry-btn').addEventListener('click', openPortalPage);

renderPinout(boardSelect.value);

// ─── Particle Animation ───
const canvas = document.getElementById('particles-canvas');
const ctx = canvas.getContext('2d');
let particles = [];

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

class Particle {
    constructor() { this.reset(); }
    reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 0.5;
        this.speedX = (Math.random() - 0.5) * 0.4;
        this.speedY = (Math.random() - 0.5) * 0.4;
        this.opacity = Math.random() * 0.5 + 0.1;
    }
    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
            this.reset();
        }
    }
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(99, 102, 241, ${this.opacity})`;
        ctx.fill();
    }
}

for (let i = 0; i < 80; i++) particles.push(new Particle());

let mouse = { x: null, y: null };
window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const p of particles) {
        p.update();
        p.draw();

        if (mouse.x !== null && mouse.y !== null) {
            const dx = mouse.x - p.x;
            const dy = mouse.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 150) {
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(mouse.x, mouse.y);
                ctx.strokeStyle = `rgba(99, 102, 241, ${0.08 * (1 - dist / 150)})`;
                ctx.lineWidth = 0.5;
                ctx.stroke();
            }
        }
    }

    requestAnimationFrame(animateParticles);
}

animateParticles();
