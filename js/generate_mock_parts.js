const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '..', 'assets', 'sprites', 'parts');

if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
}

// 24비트 RGB BMP 포맷 바이너리를 생성하는 헬퍼 함수
function createSolidBMP(r, g, b, width = 64, height = 64) {
    const fileHeaderSize = 14;
    const infoHeaderSize = 40;
    const pixelDataSize = width * height * 3;
    const fileSize = fileHeaderSize + infoHeaderSize + pixelDataSize;

    const buffer = Buffer.alloc(fileSize);

    // Bitmap File Header
    buffer.write('BM', 0); // Signature
    buffer.writeUInt32LE(fileSize, 2); // File size
    buffer.writeUInt32LE(0, 6); // Reserved
    buffer.writeUInt32LE(fileHeaderSize + infoHeaderSize, 10); // Pixel data offset

    // DIB Header
    buffer.writeUInt32LE(infoHeaderSize, 14); // Header size
    buffer.writeInt32LE(width, 18); // Width
    buffer.writeInt32LE(height, 22); // Height
    buffer.writeUInt16LE(1, 26); // Planes
    buffer.writeUInt16LE(24, 28); // Bits per pixel (24-bit RGB)
    buffer.writeUInt32LE(0, 30); // Compression (0 = BI_RGB)
    buffer.writeUInt32LE(pixelDataSize, 34); // Image size
    buffer.writeInt32LE(2835, 38); // X pixels/meter
    buffer.writeInt32LE(2835, 42); // Y pixels/meter
    buffer.writeUInt32LE(0, 46); // Total colors
    buffer.writeUInt32LE(0, 50); // Important colors

    // Pixel Data (BGR format, bottom-to-top)
    let offset = 54;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            buffer[offset] = b;     // Blue
            buffer[offset + 1] = g; // Green
            buffer[offset + 2] = r; // Red
            offset += 3;
        }
    }

    return buffer;
}

// 스프라이트 시트 궤도용 줄무늬 패턴 BMP 생성
function createTrackBMP(width = 128, height = 32) {
    const fileHeaderSize = 14;
    const infoHeaderSize = 40;
    const pixelDataSize = width * height * 3;
    const fileSize = fileHeaderSize + infoHeaderSize + pixelDataSize;

    const buffer = Buffer.alloc(fileSize);

    // Bitmap File Header
    buffer.write('BM', 0);
    buffer.writeUInt32LE(fileSize, 2);
    buffer.writeUInt32LE(0, 6);
    buffer.writeUInt32LE(fileHeaderSize + infoHeaderSize, 10);

    // DIB Header
    buffer.writeUInt32LE(infoHeaderSize, 14);
    buffer.writeInt32LE(width, 18);
    buffer.writeInt32LE(height, 22);
    buffer.writeUInt16LE(1, 26);
    buffer.writeUInt16LE(24, 28);
    buffer.writeUInt32LE(0, 30);
    buffer.writeUInt32LE(pixelDataSize, 34);
    buffer.writeInt32LE(2835, 38);
    buffer.writeInt32LE(2835, 42);
    buffer.writeUInt32LE(0, 46);
    buffer.writeUInt32LE(0, 50);

    // 4프레임(각 32px 폭)마다 색상이 바뀌는 무한궤도 패턴
    let offset = 54;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const frameIdx = Math.floor(x / 32);
            // 프레임 인덱스에 따라 노란색/주황색 번갈아 배치하여 스크롤 롤링 시각화
            if (frameIdx % 2 === 0) {
                buffer[offset] = 0;       // B
                buffer[offset + 1] = 204; // G
                buffer[offset + 2] = 255; // R (Yellow)
            } else {
                buffer[offset] = 0;       // B
                buffer[offset + 1] = 100; // G
                buffer[offset + 2] = 200; // R (Dark Orange)
            }
            offset += 3;
        }
    }

    return buffer;
}

// 각 부위별 네온 컬러 매칭 바이너리 저장
fs.writeFileSync(path.join(targetDir, 'head_mock.png'), createSolidBMP(0, 255, 255, 40, 40));      // Cyan
fs.writeFileSync(path.join(targetDir, 'body_mock.png'), createSolidBMP(255, 0, 85, 60, 70));       // Magenta
fs.writeFileSync(path.join(targetDir, 'arm_mock.png'), createSolidBMP(255, 170, 0, 15, 60));       // Orange
fs.writeFileSync(path.join(targetDir, 'leg_mock.png'), createSolidBMP(0, 255, 102, 50, 30));       // Green
fs.writeFileSync(path.join(targetDir, 'leg_track_mock.png'), createTrackBMP(128, 32));             // Yellow/Orange stripes

console.log('🎉 Highly visible solid colored mock parts generated successfully!');
