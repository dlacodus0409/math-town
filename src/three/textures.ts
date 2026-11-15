import * as THREE from 'three';

function makeCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not acquire 2D canvas context');
  }
  return [canvas, ctx];
}

function finalizeColorTexture(
  canvas: HTMLCanvasElement,
  repeatX: number,
  repeatY: number,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createGrassTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(512);
  ctx.fillStyle = '#73ab53';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle organic patches
  for (let i = 0; i < 420; i++) {
    const x = (Math.sin(i * 12.9898) * 43758.5453) % 1;
    const y = (Math.sin(i * 78.233) * 23421.631) % 1;
    const px = Math.abs(x) * 512;
    const py = Math.abs(y) * 512;
    const r = 8 + (i % 18);
    ctx.fillStyle = i % 2 === 0 ? 'rgba(134, 186, 87, 0.25)' : 'rgba(91, 143, 62, 0.22)';
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Fine grass blade strokes
  for (let i = 0; i < 1100; i++) {
    const px = ((i * 73) % 512);
    const py = ((i * 137) % 512);
    ctx.strokeStyle = i % 3 === 0 ? 'rgba(162, 210, 108, 0.35)' : 'rgba(72, 118, 46, 0.3)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + ((i % 5) - 2), py - 5 - (i % 4));
    ctx.stroke();
  }

  return finalizeColorTexture(canvas, 28, 28, maxAnisotropy);
}

export function createCobblestoneTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(512);
  ctx.fillStyle = '#a89f91';
  ctx.fillRect(0, 0, 512, 512);

  const rows = 8;
  const cols = 8;
  const cellW = 512 / cols;
  const cellH = 512 / rows;
  const stoneColors = ['#d6cfc2', '#ccc3b4', '#dfd8cb', '#c4baa9', '#d2c9b8'];

  for (let r = 0; r < rows; r++) {
    const offset = r % 2 === 0 ? 0 : cellW * 0.5;
    for (let c = -1; c <= cols; c++) {
      const x = c * cellW + offset + 3;
      const y = r * cellH + 3;
      const w = cellW - 6;
      const h = cellH - 6;
      const idx = Math.abs(r * 7 + c * 13) % stoneColors.length;

      ctx.fillStyle = stoneColors[idx];
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 8);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255,255,255,0.28)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 6, y + 3);
      ctx.lineTo(x + w - 6, y + 3);
      ctx.stroke();
    }
  }

  return finalizeColorTexture(canvas, 6, 6, maxAnisotropy);
}

export function createRoofTileTexture(
  baseHex: string,
  shadeHex: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256);
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 256, 256);

  const rows = 8;
  const cols = 8;
  const w = 256 / cols;
  const h = 256 / rows;

  for (let r = 0; r < rows; r++) {
    const offset = r % 2 === 0 ? 0 : w * 0.5;
    for (let c = -1; c <= cols; c++) {
      const x = c * w + offset;
      const y = r * h;
      ctx.fillStyle = (r + c) % 3 === 0 ? shadeHex : baseHex;
      ctx.beginPath();
      ctx.roundRect(x + 1, y + 1, w - 2, h - 2, 4);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(x, y + h - 3, w, 3);
    }
  }

  return finalizeColorTexture(canvas, 3, 3, maxAnisotropy);
}

export function createWoodPlankTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256);
  ctx.fillStyle = '#9c6b3b';
  ctx.fillRect(0, 0, 256, 256);

  const planks = 6;
  const ph = 256 / planks;
  for (let p = 0; p < planks; p++) {
    const y = p * ph;
    ctx.fillStyle = p % 2 === 0 ? '#a87443' : '#946335';
    ctx.fillRect(0, y + 1, 256, ph - 2);
    ctx.fillStyle = '#6b4423';
    ctx.fillRect(0, y + ph - 2, 256, 2);

    ctx.strokeStyle = 'rgba(92, 56, 24, 0.25)';
    ctx.lineWidth = 1;
    for (let g = 0; g < 5; g++) {
      ctx.beginPath();
      ctx.moveTo(0, y + 6 + g * 7);
      ctx.bezierCurveTo(85, y + 4 + g * 7, 170, y + 9 + g * 7, 256, y + 6 + g * 7);
      ctx.stroke();
    }
  }

  return finalizeColorTexture(canvas, 2, 2, maxAnisotropy);
}

export function createClockDialTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256);
  ctx.fillStyle = '#fefce8';
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = '#92400e';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(128, 128, 114, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#1e293b';
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * Math.PI * 2;
    ctx.lineWidth = i % 3 === 0 ? 5 : 2.5;
    ctx.beginPath();
    ctx.moveTo(128 + Math.cos(ang) * 84, 128 + Math.sin(ang) * 84);
    ctx.lineTo(128 + Math.cos(ang) * 100, 128 + Math.sin(ang) * 100);
    ctx.stroke();
  }

  // Hour and minute hands (10:10)
  ctx.lineCap = 'round';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(128, 128);
  ctx.lineTo(128 - 44, 128 - 32);
  ctx.stroke();

  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(128, 128);
  ctx.lineTo(128 + 64, 128 - 42);
  ctx.stroke();

  ctx.fillStyle = '#d97706';
  ctx.beginPath();
  ctx.arc(128, 128, 9, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(128);
  const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 60);
  grad.addColorStop(0, 'rgba(15, 23, 42, 0.45)');
  grad.addColorStop(0.55, 'rgba(15, 23, 42, 0.2)');
  grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createNameplateTexture(name: string, role: string, solved: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 144;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not create nameplate context');
  }

  ctx.clearRect(0, 0, 512, 144);

  // Clean card background
  ctx.fillStyle = solved ? 'rgba(236, 253, 245, 0.94)' : 'rgba(255, 255, 255, 0.95)';
  ctx.beginPath();
  ctx.roundRect(16, 16, 480, 112, 24);
  ctx.fill();

  ctx.strokeStyle = solved ? '#10b981' : '#f59e0b';
  ctx.lineWidth = 6;
  ctx.stroke();

  // Role line
  ctx.fillStyle = solved ? '#047857' : '#b45309';
  ctx.font = '600 26px "IBM Plex Sans KR", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(solved ? `${role} · 완료` : role, 256, 56);

  // Name line
  ctx.fillStyle = '#0f172a';
  ctx.font = '700 40px "IBM Plex Sans KR", sans-serif';
  ctx.fillText(name, 256, 106);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}
