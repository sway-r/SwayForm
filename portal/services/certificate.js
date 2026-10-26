/* Draws SwayForm certificates on a canvas (US Letter landscape, 300 dpi) so
 * they can be downloaded as PNG or PDF straight from the browser. */

export const CERTIFICATES = {
  foundation: {
    id: 'foundation',
    code: 'FL',
    program: 'Foundations of Humanoid Robotics',
    subtitle: 'SwayForm Foundation Labs',
    description: 'for completing all twenty SwayForm Foundation Labs, programming a real humanoid robot from a single finger curl to full gestures and behaviors, and passing the Foundations Assessment.',
  },
};

const W = 3300;
const H = 2550;
const SERIF = '"Source Serif 4", Georgia, "Times New Roman", serif';
const SCRIPT = '"Caveat", "Segoe Script", cursive';
const SANS = 'Inter, "Helvetica Neue", Arial, sans-serif';
const LOGO_URL = '/favicon-192.png';
const FONT_CSS = 'https://fonts.googleapis.com/css2?family=Caveat:wght@600&family=Inter:wght@500;700&family=Source+Serif+4:wght@600;700&display=swap';

let fontsPromise = null;
function loadFonts(){
  if (!fontsPromise){
    fontsPromise = new Promise((resolve) => {
      if (!document.querySelector('link[data-cert-fonts]')){
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = FONT_CSS;
        link.dataset.certFonts = '1';
        document.head.appendChild(link);
        link.onload = () => resolve();
        link.onerror = () => resolve();
        setTimeout(resolve, 4000);
      } else resolve();
    }).then(() => Promise.all([
      document.fonts.load(`700 100px ${SERIF}`),
      document.fonts.load(`600 100px ${SCRIPT}`),
      document.fonts.load(`700 40px ${SANS}`),
    ]).catch(() => {}));
  }
  return fontsPromise;
}

function loadImage(url){
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/** Text with extra letter spacing, left/center aligned at (x, y). */
function spaced(ctx, text, x, y, spacing, align = 'left'){
  const widths = [...text].map((ch) => ctx.measureText(ch).width + spacing);
  const total = widths.reduce((a, b) => a + b, 0) - spacing;
  let cursor = align === 'center' ? x - total / 2 : x;
  ctx.textAlign = 'left';
  [...text].forEach((ch, i) => { ctx.fillText(ch, cursor, y); cursor += widths[i]; });
}

function wrapLines(ctx, text, maxWidth){
  const words = text.split(' ');
  const lines = [];
  let line = '';
  words.forEach((word) => {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line){ lines.push(line); line = word; }
    else line = test;
  });
  if (line) lines.push(line);
  return lines;
}

export function formatCertificateDate(date){
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

/** Resolves to a canvas. `cert` is an entry of CERTIFICATES. */
export async function renderCertificate({ cert = CERTIFICATES.foundation, name, date = new Date(), certificateId, verifyHost = 'swayform.net', logoUrl = LOGO_URL }){
  await loadFonts();
  const logo = await loadImage(logoUrl);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const cx = W / 2;

  const goldAcross = (x0, x1) => {
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    [[0, '#8c6a28'], [0.22, '#e9d089'], [0.5, '#c79f45'], [0.78, '#f5e6b0'], [1, '#9a772f']].forEach(([stop, color]) => g.addColorStop(stop, color));
    return g;
  };
  const goldDown = (y0, y1) => {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    [[0, '#f0dc9c'], [0.5, '#c79f45'], [1, '#e2c776']].forEach(([stop, color]) => g.addColorStop(stop, color));
    return g;
  };

  /* background */
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#07090d');
  bg.addColorStop(1, '#0e1218');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(cx, 520, 100, cx, 520, 1500);
  glow.addColorStop(0, 'rgba(201,161,74,.20)');
  glow.addColorStop(1, 'rgba(201,161,74,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  /* spirograph rosette behind the medallion */
  ctx.save();
  ctx.beginPath();
  ctx.rect(136, 136, W - 272, H - 272);
  ctx.clip();
  ctx.translate(cx, 440);
  ctx.strokeStyle = 'rgba(214,178,94,.13)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 90; i++){
    ctx.save();
    ctx.rotate((i * Math.PI) / 90);
    ctx.beginPath();
    ctx.ellipse(0, 0, 560, 190, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();

  /* double gold frame with corner ornaments */
  ctx.strokeStyle = goldAcross(0, W);
  ctx.lineWidth = 14;
  ctx.strokeRect(90, 90, W - 180, H - 180);
  ctx.lineWidth = 4;
  ctx.strokeRect(132, 132, W - 264, H - 264);
  ctx.fillStyle = goldAcross(0, W);
  [[132, 132], [W - 132, 132], [132, H - 132], [W - 132, H - 132]].forEach(([x, y]) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-26, -26, 52, 52);
    ctx.restore();
    ctx.fillStyle = '#0a0d12';
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-14, -14, 28, 28);
    ctx.restore();
    ctx.fillStyle = goldAcross(0, W);
  });

  /* medallion with the SwayForm mark */
  const my = 440;
  ctx.fillStyle = goldDown(my - 230, my + 230);
  ctx.beginPath(); ctx.arc(cx, my, 230, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#0a0d12';
  ctx.beginPath(); ctx.arc(cx, my, 212, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = goldDown(my - 200, my + 200);
  ctx.beginPath(); ctx.arc(cx, my, 198, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(cx, my, 186, 0, Math.PI * 2); ctx.fill();
  if (logo){
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, my, 186, 0, Math.PI * 2); ctx.clip();
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(logo, cx - 165, my - 165, 330, 330);
    ctx.restore();
  }

  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = goldAcross(cx - 400, cx + 400);
  ctx.font = `700 54px ${SANS}`;
  spaced(ctx, 'SWAYFORM', cx, 790, 22, 'center');

  /* heading */
  ctx.fillStyle = '#f4ecd6';
  ctx.font = `700 96px ${SERIF}`;
  spaced(ctx, 'CERTIFICATE OF ACHIEVEMENT', cx, 940, 10, 'center');

  ctx.fillStyle = '#9aa2b1';
  ctx.font = `500 56px ${SANS}`;
  ctx.textAlign = 'center';
  ctx.fillText('is proudly presented to', cx, 1050);

  /* name, shrunk to fit */
  let size = 250;
  ctx.font = `700 ${size}px ${SERIF}`;
  while (ctx.measureText(name).width > W - 700 && size > 100){ size -= 6; ctx.font = `700 ${size}px ${SERIF}`; }
  ctx.fillStyle = goldAcross(cx - 900, cx + 900);
  ctx.textAlign = 'center';
  ctx.fillText(name, cx, 1290);
  ctx.strokeStyle = goldAcross(cx - 900, cx + 900);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cx - 900, 1360);
  ctx.lineTo(cx + 900, 1360);
  ctx.stroke();

  /* what it is for */
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 118px ${SERIF}`;
  ctx.fillText(cert.program, cx, 1560);
  ctx.fillStyle = goldAcross(cx - 500, cx + 500);
  ctx.font = `700 46px ${SANS}`;
  spaced(ctx, cert.subtitle.toUpperCase(), cx, 1650, 10, 'center');

  ctx.fillStyle = '#c6ccd8';
  ctx.font = `500 58px ${SANS}`;
  ctx.textAlign = 'center';
  wrapLines(ctx, cert.description, W - 900).forEach((line, i) => ctx.fillText(line, cx, 1780 + i * 90));

  /* footer: date, signature, certificate ID */
  const footY = 2180;
  const colX = [cx - 900, cx, cx + 900];
  ctx.strokeStyle = goldAcross(0, W);
  ctx.lineWidth = 3;
  colX.forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(x - 330, footY);
    ctx.lineTo(x + 330, footY);
    ctx.stroke();
  });

  ctx.fillStyle = '#f4ecd6';
  ctx.font = `600 66px ${SERIF}`;
  ctx.textAlign = 'center';
  ctx.fillText(formatCertificateDate(date), colX[0], footY - 26);
  ctx.fillStyle = goldAcross(cx - 330, cx + 330);
  ctx.font = `600 120px ${SCRIPT}`;
  ctx.fillText('Swayam Rathod', colX[1], footY - 20);
  ctx.fillStyle = '#f4ecd6';
  ctx.font = `700 52px ${SANS}`;
  ctx.fillText(certificateId, colX[2], footY - 30);

  ctx.fillStyle = '#8b93a3';
  ctx.font = `500 38px ${SANS}`;
  spaced(ctx, 'DATE ISSUED', colX[0], footY + 66, 6, 'center');
  spaced(ctx, 'FOUNDER, SWAYFORM', colX[1], footY + 66, 6, 'center');
  spaced(ctx, 'CERTIFICATE ID', colX[2], footY + 66, 6, 'center');

  ctx.font = `500 38px ${SANS}`;
  ctx.textAlign = 'center';
  ctx.fillText(`Verify at ${verifyHost}/verify`, cx, H - 205);

  return canvas;
}

export function canvasToPngBlob(canvas){
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

/** One-page US Letter landscape PDF holding the canvas as a JPEG. */
export async function canvasToPdfBlob(canvas){
  const jpeg = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.93));
  const data = new Uint8Array(await jpeg.arrayBuffer());
  const enc = new TextEncoder();
  const parts = [];
  const offsets = [];
  let length = 0;
  const push = (chunk) => { const bytes = typeof chunk === 'string' ? enc.encode(chunk) : chunk; parts.push(bytes); length += bytes.length; };
  const begin = (n) => { offsets[n] = length; push(`${n} 0 obj\n`); };

  push('%PDF-1.4\n');
  begin(1); push('<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  begin(2); push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
  begin(3); push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 792 612] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n');
  begin(4);
  push(`<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${data.length} >>\nstream\n`);
  push(data);
  push('\nendstream\nendobj\n');
  const content = 'q 792 0 0 612 0 0 cm /Im0 Do Q';
  begin(5); push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`);
  const xref = length;
  push('xref\n0 6\n0000000000 65535 f \n');
  for (let n = 1; n <= 5; n++) push(`${String(offsets[n]).padStart(10, '0')} 00000 n \n`);
  push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(parts, { type: 'application/pdf' });
}
