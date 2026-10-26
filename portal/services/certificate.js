/* Draws SwayForm certificates on a canvas (US Letter landscape, 300 dpi) so
 * they can be downloaded as PNG or PDF straight from the browser. */

export const CERTIFICATES = {
  foundation: {
    id: 'foundation',
    code: 'FL',
    program: 'SwayForm Foundation Labs',
    description: 'has successfully completed all twenty SwayForm Foundation Labs, hands-on robotics programming on a real humanoid robot, from a single finger curl to full gestures and behaviors.',
  },
};

const W = 3300;
const H = 2550;
const NAVY = '#0b1530';
const NAVY_2 = '#152a55';
const BLUE = '#0057ff';
const BLUE_LIGHT = '#4c8dff';
const INK = '#14181f';
const MUTED = '#5d6573';
const PAPER = '#f8f6f1';
const SERIF = '"Source Serif 4", Georgia, "Times New Roman", serif';
const SCRIPT = '"Caveat", "Segoe Script", cursive';
const SANS = 'Inter, "Helvetica Neue", Arial, sans-serif';
const PHOTO_URL = '/images/swayform_robot_1.png';
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

function roundRect(ctx, x, y, w, h, r){
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
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
export async function renderCertificate({ cert = CERTIFICATES.foundation, name, date = new Date(), certificateId, verifyHost = 'swayform.net', photoUrl = PHOTO_URL }){
  await loadFonts();
  const photo = await loadImage(photoUrl);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);

  /* left brand panel */
  const panelW = 980;
  const panel = ctx.createLinearGradient(0, 0, 0, H);
  panel.addColorStop(0, NAVY);
  panel.addColorStop(1, NAVY_2);
  ctx.fillStyle = panel;
  ctx.fillRect(0, 0, panelW, H);

  ctx.textBaseline = 'alphabetic';
  let markSize = 190;
  ctx.font = `700 ${markSize}px ${SERIF}`;
  while (ctx.measureText('SwayForm').width > panelW - 220 && markSize > 80){ markSize -= 4; ctx.font = `700 ${markSize}px ${SERIF}`; }
  const sWidth = ctx.measureText('S').width;
  const markWidth = ctx.measureText('SwayForm').width;
  const markX = (panelW - markWidth) / 2;
  ctx.textAlign = 'left';
  ctx.fillStyle = BLUE_LIGHT;
  ctx.fillText('S', markX, 380);
  ctx.fillStyle = '#ffffff';
  ctx.fillText('wayForm', markX + sWidth, 380);

  ctx.fillStyle = 'rgba(255,255,255,.7)';
  let tagSize = 36, tagSpacing = 6;
  ctx.font = `700 ${tagSize}px ${SANS}`;
  const tagline = 'PEOPLE  •  ROBOTICS  •  BRIGHTER FUTURES';
  const tagWidth = () => [...tagline].reduce((sum, ch) => sum + ctx.measureText(ch).width + tagSpacing, -tagSpacing);
  while (tagWidth() > panelW - 200 && tagSize > 22){ tagSize -= 1; ctx.font = `700 ${tagSize}px ${SANS}`; }
  spaced(ctx, tagline, panelW / 2, 470, tagSpacing, 'center');

  ctx.fillStyle = BLUE_LIGHT;
  ctx.fillRect(panelW / 2 - 90, 540, 180, 8);

  if (photo){
    const pw = panelW - 200, ph = Math.round(pw * photo.height / photo.width);
    const px = (panelW - pw) / 2, py = 660;
    ctx.save();
    roundRect(ctx, px, py, pw, ph, 36);
    ctx.clip();
    ctx.drawImage(photo, px, py, pw, ph);
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.28)';
    ctx.lineWidth = 6;
    roundRect(ctx, px, py, pw, ph, 36);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(255,255,255,.8)';
  ctx.font = `500 52px ${SANS}`;
  ctx.textAlign = 'center';
  const blurb = wrapLines(ctx, 'A programmable humanoid robot and guided learning portal that turns students into builders.', panelW - 260);
  blurb.forEach((line, i) => ctx.fillText(line, panelW / 2, 1690 + i * 78));
  ctx.fillStyle = 'rgba(255,255,255,.5)';
  ctx.font = `500 40px ${SANS}`;
  ctx.fillText(verifyHost, panelW / 2, H - 150);

  /* border on the paper side */
  const areaX = panelW + 110;
  const areaW = W - areaX - 130;
  const cx = areaX + areaW / 2;
  ctx.strokeStyle = NAVY;
  ctx.lineWidth = 8;
  ctx.strokeRect(panelW + 70, 70, W - panelW - 140, H - 140);
  ctx.strokeStyle = BLUE;
  ctx.lineWidth = 3;
  ctx.strokeRect(panelW + 100, 100, W - panelW - 200, H - 200);

  /* heading */
  ctx.fillStyle = BLUE;
  ctx.font = `700 62px ${SANS}`;
  spaced(ctx, 'CERTIFICATE OF COMPLETION', cx, 400, 14, 'center');

  ctx.fillStyle = MUTED;
  ctx.font = `500 58px ${SANS}`;
  ctx.textAlign = 'center';
  ctx.fillText('This certifies that', cx, 620);

  /* name, shrunk to fit */
  let size = 230;
  ctx.fillStyle = INK;
  ctx.font = `700 ${size}px ${SERIF}`;
  while (ctx.measureText(name).width > areaW - 100 && size > 90){ size -= 6; ctx.font = `700 ${size}px ${SERIF}`; }
  ctx.textAlign = 'center';
  ctx.fillText(name, cx, 880);
  ctx.strokeStyle = NAVY;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(areaX + 120, 940);
  ctx.lineTo(areaX + areaW - 120, 940);
  ctx.stroke();

  /* program + description */
  ctx.fillStyle = INK;
  ctx.font = `700 112px ${SERIF}`;
  ctx.fillText(cert.program, cx, 1230);

  ctx.fillStyle = MUTED;
  ctx.font = `500 62px ${SANS}`;
  const lines = wrapLines(ctx, cert.description, areaW - 220);
  lines.forEach((line, i) => ctx.fillText(line, cx, 1400 + i * 100));

  /* footer: date, signature, certificate ID */
  const footY = 2030;
  const colW = areaW / 3;
  const colX = [areaX + colW * 0.5, areaX + colW * 1.5, areaX + colW * 2.5];
  ctx.strokeStyle = NAVY;
  ctx.lineWidth = 3;
  colX.forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(x - 270, footY);
    ctx.lineTo(x + 270, footY);
    ctx.stroke();
  });

  ctx.fillStyle = INK;
  ctx.font = `600 70px ${SERIF}`;
  ctx.textAlign = 'center';
  ctx.fillText(formatCertificateDate(date), colX[0], footY - 26);
  ctx.font = `600 110px ${SCRIPT}`;
  ctx.fillText('Swayam Rathod', colX[1], footY - 22);
  ctx.font = `700 52px ${SANS}`;
  ctx.fillText(certificateId, colX[2], footY - 30);

  ctx.fillStyle = MUTED;
  ctx.font = `500 40px ${SANS}`;
  ctx.fillText('DATE ISSUED', colX[0], footY + 64);
  ctx.fillText('FOUNDER, SWAYFORM', colX[1], footY + 64);
  ctx.fillText('CERTIFICATE ID', colX[2], footY + 64);

  ctx.font = `500 38px ${SANS}`;
  ctx.fillText(`Verify this certificate at ${verifyHost}/verify`, cx, H - 170);

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
