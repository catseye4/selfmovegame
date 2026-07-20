const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '..', 'assets', 'sprites', 'parts');

if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
}

// 32x32 크기의 투명한 배경에 간단한 네온 색상 도형이 그려진 유효한 PNG 바이너리 데이터
const mockParts = {
    'head_mock.png': 'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAS0lEQVRYR+3U0Q0AIQhD0dypG7gT47gdW9CJX6r3m5A25CkvgD2eABe/3n0M2I0o4CSa4M0TTA4TMCF6yD54b4IJzY/Uf1T/Uf1HhXwP8AGuW5sBTgO8HwAAAABJRU5ErkJggg==',
    'body_mock.png': 'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAS0lEQVRYR+3U0Q0AIQhD0depG7gT47gdW9CJT6L3m5A25CkvgM2bABe/3n0M2I0o4CSa4M0TTA4TMCF6yD54b4IJzY/Uf1T/Uf1HhTwP8AFW65sBvU1gfwAAAABJRU5ErkJggg==',
    'arm_mock.png': 'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAS0lEQVRYR+3U0Q0AIQhD0deZG7gT47gdW9CJj6L3m5A25CkvgM2bABe/3n0M2I0o4CSa4M0TTA4TMCF6yD54b4IJzY/Uf1T/Uf1HhTwP8AHhG5sBgPtgfwAAAABJRU5ErkJggg==',
    'leg_mock.png': 'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAS0lEQVRYR+3U0Q0AIQhD0depG7gT47gdW9CJT6L3m5A25CkvgM2bABe/3n0M2I0o4CSa4M0TTA4TMCF6yD54b4IJzY/Uf1T/Uf1HhTwP8AFW65sBvU1gfwAAAABJRU5ErkJggg==',
    'leg_track_mock.png': 'iVBORw0KGgoAAAANSUhEUgAAAIAAAAAgCAYAAADc6nNqAAAAUElEQVR4Xu3VMQ0AMAzEsHicvJMruEM/tqATE/gR996EsiFPdQFmXgGYhXl7ADEJ80UvxCTMF70QkzBf9EJMwnzRCzEJ80UvxCTMF70QkzBf9EJMwnzRCzEJ80UvxCTMF70QkzBfda4B4+P6ATY/QZIAAAAASUVORK5CYII='
};

for (const [filename, base64Data] of Object.entries(mockParts)) {
    const filePath = path.join(targetDir, filename);
    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
    console.log(`Saved mock part image: ${filePath}`);
}

console.log('🎉 Mock parts generation completed successfully!');
