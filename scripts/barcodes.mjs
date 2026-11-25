/**
 * Makes a printable page of serial (consecutive) Code 128 barcodes, one per order number.
 *
 *   npm run barcodes -- 10570 10590            barcodes for 10570, 10571 ... 10590
 *   npm run barcodes -- 1001 1040 --prefix=#   the barcode holds "#1001" instead of "1001"
 *   npm run barcodes -- 10570 10590 --png      also writes one PNG file per barcode
 *
 * The page is written to docs/test-barcodes/serial-<from>-<to>.html. Open it in a browser and print it.
 * Each barcode holds only the order number, which is what ShipProof's barcode scanning looks for.
 */
import bwipjs from "bwip-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const args = process.argv.slice(2);
const flags = args.filter((a) => a.startsWith("--"));
const [from, to] = args.filter((a) => !a.startsWith("--")).map(Number);
const prefix = flags.find((f) => f.startsWith("--prefix="))?.slice("--prefix=".length) ?? "";
const writePng = flags.includes("--png");
const MAX = 200;

if (!Number.isInteger(from) || !Number.isInteger(to) || to < from || from < 0) {
  console.error("Usage: npm run barcodes -- <first order number> <last order number> [--prefix=#] [--png]");
  process.exit(1);
}
if (to - from + 1 > MAX) {
  console.error(`That is ${to - from + 1} barcodes. Make at most ${MAX} at a time.`);
  process.exit(1);
}

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "docs", "test-barcodes");
fs.mkdirSync(out, { recursive: true });

const cards = [];
for (let n = from; n <= to; n++) {
  const text = `${prefix}${n}`;
  const png = await bwipjs.toBuffer({
    bcid: "code128", text, scale: 4, height: 18, includetext: true, textxalign: "center",
    textsize: 12, paddingwidth: 14, paddingheight: 8, backgroundcolor: "FFFFFF",
  });
  if (writePng) fs.writeFileSync(path.join(out, `order-${n}.png`), png);
  cards.push(`<figure><img src="data:image/png;base64,${png.toString("base64")}" alt="Barcode ${text}"><figcaption><b>#${n}</b></figcaption></figure>`);
}

const file = path.join(out, `serial-${from}-${to}.html`);
fs.writeFileSync(
  file,
  `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ShipProof serial barcodes ${from} to ${to}</title>
<style>
  body{font-family:system-ui,Segoe UI,Arial,sans-serif;margin:24px;color:#1a1d29;background:#fff}
  h1{font-size:20px;margin:0 0 4px} p{margin:0 0 18px;color:#555;font-size:14px;max-width:680px}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}
  figure{margin:0;border:1px solid #d9dce6;border-radius:10px;padding:12px;text-align:center;break-inside:avoid;background:#fff}
  img{width:100%;height:auto;image-rendering:pixelated}
  figcaption b{display:block;font-size:18px;margin-top:4px}
  @media print{body{margin:8mm} .grid{grid-template-columns:repeat(2,1fr)}}
</style></head><body>
<h1>ShipProof serial barcodes: ${from} to ${to}</h1>
<p>Standard Code 128 barcodes, one per order number${prefix ? ` (each holds "${prefix}" before the number)` : ""}. Scan one with a barcode scanner while the ShipProof dashboard is open and no text box is selected. Print on paper for the best result.</p>
<div class="grid">${cards.join("")}</div>
</body></html>`,
);
console.log(`Wrote ${cards.length} barcodes (${from} to ${to}) to ${path.relative(root, file)}`);
