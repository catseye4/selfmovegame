const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const targetDir = path.join(__dirname, '..', 'assets', 'sprites', 'parts', 'robot');

if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
}

function createRawPNG(width, height, drawPixelFn) {
    const rowBytes = width * 4 + 1;
    const rawData = Buffer.alloc(rowBytes * height);

    for (let y = 0; y < height; y++) {
        const rowStart = y * rowBytes;
        rawData[rowStart] = 0;

        for (let x = 0; x < width; x++) {
            const pxOffset = rowStart + 1 + x * 4;
            const [r, g, b, a] = drawPixelFn(x, y, width, height);
            rawData[pxOffset] = r;
            rawData[pxOffset + 1] = g;
            rawData[pxOffset + 2] = b;
            rawData[pxOffset + 3] = a;
        }
    }

    const compressed = zlib.deflateSync(rawData);
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8;
    ihdr[9] = 6;
    ihdr[10] = 0;
    ihdr[11] = 0;
    ihdr[12] = 0;

    const ihdrChunk = makeChunk('IHDR', ihdr);
    const idatChunk = makeChunk('IDAT', compressed);
    const iendChunk = makeChunk('IEND', Buffer.alloc(0));

    return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(4 + 4 + len + 4);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4);
    data.copy(buf, 8);
    const crcVal = crc32(buf.slice(4, 8 + len));
    buf.writeUInt32BE(crcVal, 8 + len);
    return buf;
}

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
        if (c & 1) c = 0xedb88320 ^ (c >>> 1);
        else c = c >>> 1;
    }
    crcTable[n] = c;
}

function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
        crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
}

// 레드 메카 로봇의 원본 실사 스펙에 100% 부합하는 어깨 장갑 + 유압 팔 + 주먹 손 PNG (48 x 96 px)
const armPng = createRawPNG(48, 96, (x, y, w, h) => {
    const cx = 24;
    const cy = 20;

    // 1. 어깨 둥근 구형 메탈 장갑 (상단)
    const dx = x - cx;
    const dy = y - cy;
    const r2 = dx * dx + dy * dy;

    if (r2 <= 18 * 18) {
        // 검은 외곽 테두리
        if (r2 >= 16 * 16) return [25, 20, 25, 255];

        // 보라/Cyan 네온 렌즈 코어 (어깨 중앙)
        const coreR2 = (x - 22) * (x - 22) + (y - 18) * (y - 18);
        if (coreR2 <= 5 * 5) {
            if (coreR2 <= 2 * 2) return [0, 255, 255, 255]; // Cyan 코어 센터
            return [180, 0, 220, 255]; // 보라 발광 링
        }

        // 어깨 버건디 메탈 그라데이션 하이라이트
        const shade = Math.floor(160 - dx * 3 - dy * 2);
        const rVal = Math.max(80, Math.min(190, shade));
        const gVal = Math.max(15, Math.min(45, Math.floor(shade * 0.2)));
        const bVal = Math.max(25, Math.min(65, Math.floor(shade * 0.3)));
        return [rVal, gVal, bVal, 255];
    }

    // 2. 상완 기계 유압 프레임 (중단)
    if (x >= 15 && x <= 33 && y >= 32 && y <= 50) {
        if (x === 15 || x === 33) return [20, 20, 30, 255];
        if (x >= 21 && x <= 27) return [90, 95, 110, 255]; // 중앙 은색 실린더
        return [45, 50, 60, 255];
    }

    // 3. 전완 중장갑 실드 패널 (하단)
    if (x >= 10 && x <= 38 && y >= 48 && y <= 82) {
        // 검은 윤곽선
        if (x === 10 || x === 38 || y === 48 || y === 82) return [20, 20, 25, 255];

        // 하완 전면 붉은 장갑 플레이트
        if (x >= 14 && x <= 34 && y >= 52 && y <= 78) {
            // 발광 노드
            if (x >= 21 && x <= 27 && y >= 62 && y <= 68) return [0, 255, 255, 255];
            const rVal = Math.floor(140 + (x - 10) * 1.5);
            return [Math.min(180, rVal), 30, 50, 255];
        }

        return [55, 60, 70, 255];
    }

    // 4. 기계 주먹 손 (최하단)
    if (x >= 12 && x <= 36 && y >= 80 && y <= 92) {
        if (x === 12 || x === 36 || y === 92) return [15, 15, 20, 255];
        return [40, 45, 55, 255];
    }

    return [0, 0, 0, 0];
});

fs.writeFileSync(path.join(targetDir, 'red_arm.png'), armPng);
console.log('🎉 Generated refined red_arm.png successfully!');
