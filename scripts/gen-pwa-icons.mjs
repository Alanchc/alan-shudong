import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const src = "app/icon.png";
await mkdir("public/icons", { recursive: true });

await sharp(src).resize(192, 192).png().toFile("public/icons/icon-192.png");
await sharp(src).resize(512, 512).png().toFile("public/icons/icon-512.png");

const inner = await sharp(src).resize(320, 320).png().toBuffer();
await sharp({
  create: { width: 512, height: 512, channels: 4, background: "#6d4aff" },
})
  .composite([{ input: inner, gravity: "center" }])
  .png()
  .toFile("public/icons/maskable-512.png");

console.log("icons generated");
