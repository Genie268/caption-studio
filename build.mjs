import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
const V = Date.now().toString(36), out = 'dist';
const FONTS = [['Montserrat',900,1],['Poppins',800,1],['Inter',900,1],['Figtree',900,1],['Anton',400,0],['Bebas Neue',400,0],['Archivo Black',400,0],['Bricolage Grotesque',800,0],['Kanit',900,1],['Barlow Condensed',900,1],['Oswald',700,0],['Lilita One',400,0],['Luckiest Guy',400,0],['Bangers',400,0],['Permanent Marker',400,0],['Instrument Serif',400,1],['Playfair Display',900,1],['DM Serif Display',400,1],['Fraunces',900,1],['Figtree',400,0],['Figtree',500,0],['Figtree',600,0],['Figtree',700,0]];
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out + '/fonts', { recursive: true }); fs.mkdirSync(out + '/icons', { recursive: true });
let css = ''; const files = [];
for (const [name, w, it] of FONTS) {
  const pkg = name.toLowerCase().replace(/ /g, '-');
  for (const style of it ? ['normal', 'italic'] : ['normal']) {
    const f = `node_modules/@fontsource/${pkg}/files/${pkg}-latin-${w}-${style}.woff2`;
    if (!fs.existsSync(f)) { console.warn('missing', f); continue; }
    const dst = `fonts/${path.basename(f)}`;
    if (!files.includes(dst)) { fs.copyFileSync(f, `${out}/${dst}`); files.push(dst); }
    css += `@font-face{font-family:"${name}";font-style:${style};font-weight:${w};font-display:swap;src:url(${dst}) format("woff2")}\n`;
  }
}
fs.writeFileSync(`${out}/fonts.css`, css);
fs.mkdirSync(`${out}/vendor`, { recursive: true }); fs.mkdirSync(`${out}/models`, { recursive: true });
fs.copyFileSync('node_modules/@vladmandic/face-api/dist/face-api.esm.js', `${out}/vendor/face-api.esm.js`);
for (const f of ['ssd_mobilenetv1_model-weights_manifest.json', 'ssd_mobilenetv1_model.bin']) fs.copyFileSync(`node_modules/@vladmandic/face-api/model/${f}`, `${out}/models/${f}`);
await esbuild.build({ entryPoints: ['app.src.js'], bundle: true, minify: true, format: 'iife', target: 'chrome110', outfile: `${out}/app.js` });
fs.copyFileSync('app.css', `${out}/app.css`);
fs.writeFileSync(`${out}/index.html`, fs.readFileSync('index.html', 'utf8').replaceAll('__V__', V));
const svg = fs.readFileSync('icon.svg');
await sharp(svg).resize(192, 192).png().toFile(`${out}/icons/icon-192.png`);
await sharp(svg).resize(512, 512).png().toFile(`${out}/icons/icon-512.png`);
await sharp({ create: { width: 512, height: 512, channels: 4, background: '#0b0b0d' } }).composite([{ input: await sharp(svg).resize(400, 400).png().toBuffer(), top: 56, left: 56 }]).png().toFile(`${out}/icons/icon-maskable.png`);
fs.writeFileSync(`${out}/manifest.webmanifest`, JSON.stringify({
  name: 'GenieCut', short_name: 'GenieCut', start_url: './', scope: './', display: 'standalone',
  background_color: '#0b0b0d', theme_color: '#0b0b0d', description: 'Edit talking videos by their words, style captions, export up to 4K.',
  icons: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }, { src: 'icons/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }],
}));
const pre = ['./', 'index.html', `app.js?v=${V}`, `app.css?v=${V}`, `fonts.css?v=${V}`, 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable.png', ...files, 'vendor/face-api.esm.js', 'models/ssd_mobilenetv1_model-weights_manifest.json', 'models/ssd_mobilenetv1_model.bin'];
fs.writeFileSync(`${out}/sw.js`, `const C='cs-${V}',P=${JSON.stringify(pre)};
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(P)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin)return;
if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).then(r=>{const cp=r.clone();caches.open(C).then(c=>c.put('index.html',cp));return r}).catch(()=>caches.match('index.html')));return}
e.respondWith(caches.match(e.request).then(m=>m||fetch(e.request).then(r=>{if(r.ok){const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp))}return r})))});`);
console.log('built', V);
