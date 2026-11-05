// Rasterize our own SVG with Electron's bundled Chromium: no image service or API costs.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
async function generate() {
  const root = path.resolve(__dirname, '..');
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'simhub-icons-'));
  app.setPath('userData', temporary);
  await app.whenReady();
  const window = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false } });
  try {
    const svg = await fs.readFile(path.join(root, 'ui/brand.svg'), 'utf8');
    await window.loadURL('data:text/html,<title>Icon renderer</title>');
    const images = await window.webContents.executeJavaScript(`(async () => {
      const image = new Image(); image.src = ${JSON.stringify('data:image/svg+xml;base64,' )} + ${JSON.stringify(Buffer.from(svg).toString('base64'))}; await image.decode();
      const result = {};
      for (const size of [16,24,32,48,64,128,256,512,1024]) { const canvas = document.createElement('canvas'); canvas.width = canvas.height = size; const context = canvas.getContext('2d'); context.drawImage(image,0,0,size,size); result[size] = canvas.toDataURL('image/png').split(',')[1]; }
      return result;
    })()`);
    const pngs = Object.fromEntries(Object.entries(images).map(([size, bytes]) => [size, Buffer.from(bytes, 'base64')]));
    await fs.mkdir(path.join(root, 'resources/icons'), { recursive: true });
    await fs.writeFile(path.join(root, 'resources/icon.png'), pngs[1024]);
    for (const size of [16,32,48,64,128,256,512,1024]) await fs.writeFile(path.join(root, `resources/icons/${size}x${size}.png`), pngs[size]);
    const sizes = [16,24,32,48,64,128,256];
    const header = Buffer.alloc(6 + sizes.length * 16); header.writeUInt16LE(1,2); header.writeUInt16LE(sizes.length,4);
    let offset = header.length;
    sizes.forEach((size,index) => { const entry = 6 + index * 16; header[entry] = header[entry+1] = size === 256 ? 0 : size; header.writeUInt16LE(1,entry+4); header.writeUInt16LE(32,entry+6); header.writeUInt32LE(pngs[size].length,entry+8); header.writeUInt32LE(offset,entry+12); offset += pngs[size].length; });
    await fs.writeFile(path.join(root, 'resources/icon.ico'), Buffer.concat([header,...sizes.map(size => pngs[size])]));
    if (process.platform === 'darwin') {
      const iconset = path.join(temporary, 'calendar.iconset'); await fs.mkdir(iconset);
      for (const size of [16,32,128,256,512]) for (const scale of [1,2]) await fs.writeFile(path.join(iconset, `icon_${size}x${size}${scale === 2 ? '@2x' : ''}.png`), pngs[size * scale]);
      execFileSync('iconutil',['--convert','icns','--output',path.join(root,'resources/icon.icns'),iconset]);
    }
    console.log('Brand-SVG in PNG, Windows-ICO und (auf macOS) ICNS umgewandelt.');
  } finally { window.destroy(); await fs.rm(temporary,{recursive:true,force:true}); app.quit(); }
}
generate().catch(error => { console.error(error); app.exit(1); });
