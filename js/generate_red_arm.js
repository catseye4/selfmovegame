const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '..', 'assets', 'sprites', 'parts', 'robot');

if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
}

// 32비트 RGBA PNG 파일을 생성하는 간단한 헬퍼 (zlib / CRC32 지원)
// 32비트 RGBA PNG 바이너리 생성기
const zlib = require('zlib');

function createRawPNG(width, height, drawPixelFn) {
    // RGBA scanlines
    const rowBytes = width * 4 + 1; // 1 byte filter type per row
    const rawData = Buffer.alloc(rowBytes * height);

    for (let y = 0; y < height; y++) {
        const rowStart = y * rowBytes;
        rawData[rowStart] = 0; // Filter type 0 (None)

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

    // Build PNG Chunks
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

    // IHDR Chunk
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8; // Bit depth
    ihdr[9] = 6; // Color type (6 = Truecolor with alpha)
    ihdr[10] = 0; // Compression
    ihdr[11] = 0; // Filter
    ihdr[12] = 0; // Interlace

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

// Table for fast CRC32 computation
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

// 붉은색 기계 메카 팔 (어깨 장갑 + 팔관절 + 발광 센서) 픽셀 생성기
const armPng = createRawPNG(40, 80, (x, y, w, h) => {
    // 투명 배경
    const cx = w / 2;
    const cy = h / 2;

    // 어깨 둥근 장갑 (상단)
    if (y >= 5 && y <= 25) {
        const dx = x - cx;
        const dy = y - 15;
        if (dx*dx + dy*dy <= 14*14) {
            // 어깨 구형 장갑 (붉은색/버건디 메탈 톤)
            if (dx*dx + dy*dy <= 4*4) return [0, 255, 255, 255]; // Cyan 센서 렌즈
            if (dx > 0) return [180, 30, 50, 255];
            return [120, 20, 35, 255];
        }
    }

    // 팔 관절 & 하완 실드 (중단 ~ 하단)
    if (x >= 8 && x <= 32 && y >= 22 && y <= 68) {
        // 외곽선
        if (x === 8 || x === 32 || y === 22 || y === 68) return [20, 20, 30, 255];

        // 붉은 장갑 실드
        if (x >= 12 && x <= 28 && y >= 35 && y <= 58) {
            if (x >= 18 && x <= 22 && y >= 42 && y <= 46) return [0, 255, 255, 255]; // 발광 노드
            return [150, 25, 45, 255];
        }

        // 흑색 기계 프레임
        return [50, 55, 65, 255];
    }

    // 주먹 (최하단)
    if (x >= 10 && x <= 30 && y >= 65 && y <= 75) {
        return [40, 40, 50, 255];
    }

    return [0, 0, 0, 0]; // 투명
});

fs.writeFileSync(path.join(targetDir, 'red_arm.png'), armPng);
console.log('🎉 Generated red_arm.png successfully!');
