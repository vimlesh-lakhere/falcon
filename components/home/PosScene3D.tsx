"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

const FONT = '"Inter", "Segoe UI", system-ui, sans-serif';

const ITEMS = [
  { name: "Basmati Rice 5kg", qty: "1 x ₹560", amt: 560 },
  { name: "Amul Butter 500g", qty: "2 x ₹285", amt: 570 },
  { name: "Tata Salt 1kg", qty: "3 x ₹28", amt: 84 },
  { name: "Surf Excel 1kg", qty: "1 x ₹210", amt: 210 },
];
const TOTAL = ITEMS.reduce((s, i) => s + i.amt, 0);
const CYCLE = 10;

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function makeCanvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function rupee(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}

/** Billing screen: step 0 = idle, 1-4 = items scanned, 5 = ready to pay, 6 = paid. */
function drawScreen(canvas: HTMLCanvasElement, step: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#0A0F24");
  bg.addColorStop(1, "#141C42");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // top bar
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  ctx.fillRect(0, 0, W, 70);
  ctx.fillStyle = "#2DD4BF";
  ctx.beginPath();
  ctx.arc(44, 35, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = `700 28px ${FONT}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText("FALCON POS", 66, 36);
  ctx.fillStyle = "#94A3B8";
  ctx.font = `500 22px ${FONT}`;
  ctx.textAlign = "right";
  ctx.fillText("Counter 01  ·  Online", W - 36, 36);

  // items
  const shown = Math.min(step, 4);
  ctx.textAlign = "left";
  if (shown === 0) {
    ctx.fillStyle = "rgba(148,163,184,0.9)";
    ctx.font = `600 30px ${FONT}`;
    ctx.fillText("Scan a barcode to start billing", 48, 170);
    ctx.strokeStyle = "rgba(99,102,241,0.55)";
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 10]);
    roundRect(ctx, 36, 120, 596, 120, 20);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  for (let i = 0; i < shown; i++) {
    const y = 96 + i * 96;
    const latest = i === shown - 1 && step <= 4;
    ctx.fillStyle = latest ? "rgba(99,102,241,0.28)" : "rgba(255,255,255,0.05)";
    roundRect(ctx, 32, y, 604, 84, 18);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = `700 29px ${FONT}`;
    ctx.fillText(ITEMS[i].name, 56, y + 30);
    ctx.fillStyle = "#94A3B8";
    ctx.font = `500 22px ${FONT}`;
    ctx.fillText(ITEMS[i].qty, 56, y + 62);
    ctx.fillStyle = "#fff";
    ctx.font = `700 32px ${FONT}`;
    ctx.textAlign = "right";
    ctx.fillText(rupee(ITEMS[i].amt), 612, y + 44);
    ctx.textAlign = "left";
  }

  // summary card
  const sum = ITEMS.slice(0, shown).reduce((s, i) => s + i.amt, 0);
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  roundRect(ctx, 668, 96, 324, 496, 24);
  ctx.fill();
  ctx.fillStyle = "#94A3B8";
  ctx.font = `600 21px ${FONT}`;
  ctx.fillText("SUBTOTAL", 696, 140);
  ctx.fillText("GST (5%) incl.", 696, 232);
  ctx.fillStyle = "#fff";
  ctx.font = `700 30px ${FONT}`;
  ctx.textAlign = "right";
  ctx.fillText(rupee(sum), 964, 140);
  ctx.fillStyle = "#CBD5E1";
  ctx.font = `600 26px ${FONT}`;
  ctx.fillText(rupee(Math.round((sum * 5) / 105)), 964, 232);
  ctx.textAlign = "left";

  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(696, 272);
  ctx.lineTo(964, 272);
  ctx.stroke();

  ctx.fillStyle = "#94A3B8";
  ctx.font = `600 21px ${FONT}`;
  ctx.fillText("TOTAL", 696, 318);
  const totalGrad = ctx.createLinearGradient(696, 0, 964, 0);
  totalGrad.addColorStop(0, "#5EEAD4");
  totalGrad.addColorStop(1, "#A5B4FC");
  ctx.fillStyle = totalGrad;
  ctx.font = `800 64px ${FONT}`;
  ctx.fillText(rupee(step >= 5 ? TOTAL : sum), 696, 388);

  // payment chips
  const chips = ["UPI", "Cash", "Card"];
  chips.forEach((c, i) => {
    const x = 696 + i * 92;
    const active = step >= 5 && i === 0;
    ctx.fillStyle = active ? "rgba(99,102,241,0.9)" : "rgba(255,255,255,0.08)";
    roundRect(ctx, x, 430, 82, 44, 12);
    ctx.fill();
    ctx.fillStyle = active ? "#fff" : "#CBD5E1";
    ctx.font = `700 20px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(c, x + 41, 453);
  });
  ctx.textAlign = "left";

  // pay button
  const paid = step >= 6;
  const btn = ctx.createLinearGradient(696, 0, 964, 0);
  if (paid) {
    btn.addColorStop(0, "#10B981");
    btn.addColorStop(1, "#34D399");
  } else {
    btn.addColorStop(0, "#6366F1");
    btn.addColorStop(1, "#14B8A6");
  }
  ctx.globalAlpha = step >= 5 ? 1 : 0.45;
  ctx.fillStyle = btn;
  roundRect(ctx, 696, 500, 268, 68, 18);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#fff";
  ctx.font = `800 28px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText(paid ? "✓  PAID via UPI" : `Pay ${rupee(step >= 5 ? TOTAL : sum)}`, 830, 536);
  ctx.textAlign = "left";
}

function drawCard(canvas: HTMLCanvasElement, label: string, value: string, sub: string, accent: string) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "rgba(11,16,38,0.86)";
  roundRect(ctx, 6, 6, W - 12, H - 12, 34);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(50, 54, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillStyle = "#94A3B8";
  ctx.font = `700 24px ${FONT}`;
  ctx.fillText(label, 74, 55);
  ctx.fillStyle = "#fff";
  ctx.font = `800 62px ${FONT}`;
  ctx.fillText(value, 40, 128);
  ctx.fillStyle = accent;
  ctx.font = `700 26px ${FONT}`;
  ctx.fillText(sub, 42, 184);
}

function drawReceipt(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  ctx.fillStyle = "#FBFBF8";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#111827";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `800 30px ${FONT}`;
  ctx.fillText("FALCON 360", W / 2, 46);
  ctx.font = `500 17px ${FONT}`;
  ctx.fillStyle = "#6B7280";
  ctx.fillText("GST INVOICE  #INV-2041", W / 2, 76);
  ctx.setLineDash([6, 6]);
  ctx.strokeStyle = "#9CA3AF";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(24, 98);
  ctx.lineTo(W - 24, 98);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.textAlign = "left";
  ITEMS.forEach((it, i) => {
    const y = 132 + i * 46;
    ctx.fillStyle = "#111827";
    ctx.font = `600 19px ${FONT}`;
    ctx.fillText(it.name, 24, y);
    ctx.fillStyle = "#6B7280";
    ctx.font = `500 16px ${FONT}`;
    ctx.fillText(it.qty, 24, y + 20);
    ctx.fillStyle = "#111827";
    ctx.font = `700 19px ${FONT}`;
    ctx.textAlign = "right";
    ctx.fillText(rupee(it.amt), W - 24, y + 8);
    ctx.textAlign = "left";
  });
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(24, 326);
  ctx.lineTo(W - 24, 326);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#111827";
  ctx.font = `800 26px ${FONT}`;
  ctx.fillText("TOTAL", 24, 362);
  ctx.textAlign = "right";
  ctx.fillText(rupee(TOTAL), W - 24, 362);
  ctx.textAlign = "center";
  ctx.fillStyle = "#059669";
  ctx.font = `700 20px ${FONT}`;
  ctx.fillText("PAID  ·  THANK YOU", W / 2, 410);
  // fake barcode
  ctx.fillStyle = "#111827";
  let x = 40;
  let seed = 7;
  while (x < W - 40) {
    seed = (seed * 9301 + 49297) % 233280;
    const w = 2 + (seed % 4);
    ctx.fillRect(x, 440, w, 64);
    x += w + 3;
  }
}

function drawBarcodeBox(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  ctx.fillStyle = "#F59E0B";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#fff";
  roundRect(ctx, 26, 92, W - 52, H - 130, 14);
  ctx.fill();
  ctx.fillStyle = "#111827";
  let x = 48;
  let seed = 3;
  while (x < W - 60) {
    seed = (seed * 9301 + 49297) % 233280;
    const w = 3 + (seed % 5);
    ctx.fillRect(x, 112, w, H - 190);
    x += w + 4;
  }
  ctx.fillStyle = "#7C2D12";
  ctx.font = `800 26px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("DAILY NEEDS", W / 2, 46);
}

function glowTexture() {
  const c = makeCanvas(256, 256);
  const ctx = c.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, "rgba(99,102,241,0.55)");
    g.addColorStop(0.45, "rgba(45,212,191,0.14)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function gridTexture() {
  const c = makeCanvas(512, 340);
  const ctx = c.getContext("2d");
  if (ctx) {
    ctx.strokeStyle = "rgba(129,140,248,0.28)";
    ctx.lineWidth = 2;
    for (let x = 0; x <= 512; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 340);
      ctx.stroke();
    }
    for (let y = 0; y <= 340; y += 34) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function stepAt(p: number) {
  if (p < 0.9) return 0;
  if (p < 2.3) return 1;
  if (p < 3.7) return 2;
  if (p < 5.1) return 3;
  if (p < 6.5) return 4;
  if (p < 7.6) return 5;
  return 6;
}

function easeOut(x: number) {
  const c = Math.min(1, Math.max(0, x));
  return 1 - Math.pow(1 - c, 3);
}

function Fallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0B1026] p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between text-xs font-semibold text-slate-400">
          <span className="text-white">FALCON POS</span>
          <span>Counter 01 &middot; Online</span>
        </div>
        {ITEMS.map((i) => (
          <div key={i.name} className="mb-2 flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-white">{i.name}</p>
              <p className="text-xs text-slate-400">{i.qty}</p>
            </div>
            <span className="text-sm font-bold text-white">{rupee(i.amt)}</span>
          </div>
        ))}
        <div className="mt-4 flex items-center justify-between rounded-xl bg-gradient-to-r from-indigo-500 to-teal-500 px-4 py-3 text-white">
          <span className="text-sm font-semibold">Total</span>
          <span className="text-lg font-extrabold">{rupee(TOTAL)}</span>
        </div>
      </div>
    </div>
  );
}

export function PosScene3D({ className = "" }: { className?: string }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      setFallback(true);
      return;
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    const baseCam = new THREE.Vector3(0, 4.6, 12.4);
    const lookAt = new THREE.Vector3(0, 0.95, 0);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    scene.environmentIntensity = 0.6;

    const key = new THREE.PointLight(0x2dd4bf, 38, 0, 2);
    key.position.set(-5, 4.5, 4);
    scene.add(key);
    const rim = new THREE.PointLight(0x818cf8, 46, 0, 2);
    rim.position.set(6, 3.5, -4);
    scene.add(rim);

    const rig = new THREE.Group();
    scene.add(rig);

    const disposables: { dispose: () => void }[] = [];
    const track = <T extends { dispose: () => void }>(o: T): T => {
      disposables.push(o);
      return o;
    };

    const darkMetal = track(new THREE.MeshStandardMaterial({ color: 0x0c1128, metalness: 0.75, roughness: 0.28 }));
    const platformMat = track(new THREE.MeshStandardMaterial({ color: 0x151d3f, metalness: 0.55, roughness: 0.4 }));

    // Platform
    const platform = new THREE.Mesh(track(new RoundedBoxGeometry(8.8, 0.36, 5.8, 6, 0.14)), platformMat);
    platform.position.y = -0.18;
    rig.add(platform);
    const rimGlow = new THREE.Mesh(
      track(new RoundedBoxGeometry(9.1, 0.07, 6.1, 4, 0.03)),
      track(new THREE.MeshBasicMaterial({ color: 0x5b5bf0 }))
    );
    rimGlow.position.y = -0.4;
    rig.add(rimGlow);

    const gridTex = track(gridTexture());
    const grid = new THREE.Mesh(
      track(new THREE.PlaneGeometry(8.4, 5.4)),
      track(new THREE.MeshBasicMaterial({ map: gridTex, transparent: true, depthWrite: false, toneMapped: false }))
    );
    grid.rotation.x = -Math.PI / 2;
    grid.position.y = 0.004;
    rig.add(grid);

    const poolTex = track(glowTexture());
    const pool = new THREE.Mesh(
      track(new THREE.PlaneGeometry(15, 11)),
      track(
        new THREE.MeshBasicMaterial({
          map: poolTex,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          toneMapped: false,
        })
      )
    );
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = -0.5;
    rig.add(pool);

    // Monitor
    const monitor = new THREE.Group();
    monitor.position.set(-0.7, 0, -0.5);
    rig.add(monitor);
    const standBase = new THREE.Mesh(track(new RoundedBoxGeometry(2.0, 0.14, 1.4, 4, 0.06)), darkMetal);
    standBase.position.y = 0.07;
    monitor.add(standBase);
    const neck = new THREE.Mesh(track(new THREE.CylinderGeometry(0.13, 0.17, 1.15, 24)), darkMetal);
    neck.position.y = 0.72;
    monitor.add(neck);
    const head = new THREE.Group();
    head.position.set(0, 1.95, 0);
    head.rotation.x = -0.1;
    monitor.add(head);
    const body = new THREE.Mesh(track(new RoundedBoxGeometry(4.2, 2.65, 0.22, 5, 0.1)), darkMetal);
    head.add(body);

    const screenCanvas = makeCanvas(1024, 640);
    const screenTex = track(new THREE.CanvasTexture(screenCanvas));
    screenTex.colorSpace = THREE.SRGBColorSpace;
    screenTex.anisotropy = 8;
    const screen = new THREE.Mesh(
      track(new THREE.PlaneGeometry(3.96, 2.4)),
      track(new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false }))
    );
    screen.position.z = 0.115;
    head.add(screen);

    // Printer with paper
    const printer = new THREE.Group();
    printer.position.set(3.1, 0, -0.7);
    rig.add(printer);
    const printerBody = new THREE.Mesh(track(new RoundedBoxGeometry(1.8, 0.85, 1.4, 5, 0.12)), darkMetal);
    printerBody.position.y = 0.425;
    printer.add(printerBody);
    const slot = new THREE.Mesh(
      track(new RoundedBoxGeometry(1.25, 0.05, 0.16, 2, 0.02)),
      track(new THREE.MeshBasicMaterial({ color: 0x020617 }))
    );
    slot.position.set(0, 0.86, -0.15);
    printer.add(slot);
    const led = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.05, 12, 12)),
      track(new THREE.MeshBasicMaterial({ color: 0x34d399, toneMapped: false }))
    );
    led.position.set(0.7, 0.72, 0.71);
    printer.add(led);

    const receiptCanvas = makeCanvas(320, 540);
    drawReceipt(receiptCanvas);
    const receiptTex = track(new THREE.CanvasTexture(receiptCanvas));
    receiptTex.colorSpace = THREE.SRGBColorSpace;
    receiptTex.anisotropy = 4;
    const paperGeo = track(new THREE.PlaneGeometry(1.15, 1.95));
    paperGeo.translate(0, 0.975, 0);
    const paper = new THREE.Mesh(
      paperGeo,
      track(new THREE.MeshStandardMaterial({ map: receiptTex, side: THREE.DoubleSide, roughness: 0.95, metalness: 0 }))
    );
    paper.position.set(0, 0.86, -0.15);
    paper.rotation.x = -0.22;
    printer.add(paper);
    const PAPER_HIDDEN = -2.05;
    paper.position.y = 0.86 + PAPER_HIDDEN;

    // Product box + scanner
    const boxCanvas = makeCanvas(256, 256);
    drawBarcodeBox(boxCanvas);
    const boxTex = track(new THREE.CanvasTexture(boxCanvas));
    boxTex.colorSpace = THREE.SRGBColorSpace;
    const productBox = new THREE.Mesh(
      track(new RoundedBoxGeometry(1.15, 0.85, 0.8, 4, 0.06)),
      track(new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.55, metalness: 0.05 }))
    );
    productBox.position.set(1.6, 0.425, 1.55);
    productBox.rotation.y = -0.35;
    rig.add(productBox);
    const boxFace = new THREE.Mesh(
      track(new THREE.PlaneGeometry(1.0, 0.72)),
      track(new THREE.MeshBasicMaterial({ map: boxTex, toneMapped: false }))
    );
    boxFace.position.z = 0.405;
    productBox.add(boxFace);

    const laserBar = new THREE.Mesh(
      track(new THREE.PlaneGeometry(0.98, 0.035)),
      track(
        new THREE.MeshBasicMaterial({
          color: 0xff2d55,
          transparent: true,
          opacity: 0.95,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        })
      )
    );
    laserBar.position.z = 0.412;
    productBox.add(laserBar);

    const scanner = new THREE.Group();
    scanner.position.set(3.05, 1.25, 2.15);
    scanner.rotation.order = "YXZ";
    scanner.rotation.y = -1.96;
    scanner.rotation.x = 0.42;
    rig.add(scanner);
    const scanHead = new THREE.Mesh(track(new RoundedBoxGeometry(0.5, 0.42, 1.05, 4, 0.1)), darkMetal);
    scanner.add(scanHead);
    const handle = new THREE.Mesh(track(new THREE.CylinderGeometry(0.15, 0.18, 0.95, 20)), platformMat);
    handle.position.set(0, -0.62, 0.22);
    handle.rotation.x = 0.28;
    scanner.add(handle);
    const nozzle = new THREE.Mesh(
      track(new THREE.PlaneGeometry(0.36, 0.22)),
      track(new THREE.MeshBasicMaterial({ color: 0xff2d55, toneMapped: false }))
    );
    nozzle.position.set(0, 0.02, 0.53);
    scanner.add(nozzle);

    const nozzleWorld = new THREE.Vector3();
    const targetWorld = new THREE.Vector3();
    rig.updateMatrixWorld(true);
    nozzle.getWorldPosition(nozzleWorld);
    productBox.getWorldPosition(targetWorld);
    targetWorld.y += 0.08;
    const beamLen = nozzleWorld.distanceTo(targetWorld);
    const beamGeo = track(new THREE.ConeGeometry(0.46, beamLen, 28, 1, true));
    beamGeo.translate(0, -beamLen / 2, 0);
    beamGeo.rotateX(-Math.PI / 2);
    const beam = new THREE.Mesh(
      beamGeo,
      track(
        new THREE.MeshBasicMaterial({
          color: 0xff2d55,
          transparent: true,
          opacity: 0.16,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
          toneMapped: false,
        })
      )
    );
    rig.add(beam);
    beam.position.copy(rig.worldToLocal(nozzleWorld.clone()));
    beam.lookAt(rig.localToWorld(rig.worldToLocal(targetWorld.clone())));

    // Floating info cards
    const cardDefs = [
      { label: "TODAY'S SALES", value: "₹84,250", sub: "▲ 18.2% vs yesterday", accent: "#2DD4BF", pos: [-3.9, 3.9, 0.9], ph: 0 },
      { label: "GST INVOICE", value: "#INV-2041", sub: "✓ Generated & sent", accent: "#A5B4FC", pos: [3.9, 3.7, -0.4], ph: 1.4 },
      { label: "LOW STOCK", value: "12 items", sub: "Reorder list ready", accent: "#FBBF24", pos: [-4.0, 1.2, 2.3], ph: 2.6 },
      { label: "ONLINE ORDER", value: "#1042", sub: "✓ Paid via UPI", accent: "#34D399", pos: [4.3, 1.5, 1.8], ph: 3.8 },
    ];
    const cards = cardDefs.map((d) => {
      const c = makeCanvas(512, 224);
      drawCard(c, d.label, d.value, d.sub, d.accent);
      const tex = track(new THREE.CanvasTexture(c));
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      const mesh = new THREE.Mesh(
        track(new THREE.PlaneGeometry(2.05, 0.9)),
        track(new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }))
      );
      mesh.position.set(d.pos[0], d.pos[1], d.pos[2]);
      rig.add(mesh);
      return { mesh, base: new THREE.Vector3(d.pos[0], d.pos[1], d.pos[2]), homeX: d.pos[0], ph: d.ph };
    });

    // Drifting particles
    const N = 110;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 12;
      pos[i * 3 + 1] = Math.random() * 6.5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }
    const pGeo = track(new THREE.BufferGeometry());
    pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const particles = new THREE.Points(
      pGeo,
      track(
        new THREE.PointsMaterial({
          color: 0x93c5fd,
          size: 0.045,
          transparent: true,
          opacity: 0.7,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      )
    );
    rig.add(particles);

    // Sizing: pick the camera distance so the whole scene fits both the width and height of the box.
    const camDir = baseCam.clone().sub(lookAt).normalize();
    const fit = () => {
      const w = Math.max(host.clientWidth, 1);
      const h = Math.max(host.clientHeight, 1);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      const narrow = camera.aspect < 1.05;
      cards.forEach((c, i) => {
        c.mesh.visible = !narrow || i < 2;
        c.base.x = c.homeX * (narrow ? 0.78 : 1);
      });
      const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const needW = narrow ? 10.9 : 13.2;
      const needH = 8.2;
      const dist = Math.max(needW / (2 * tanH * camera.aspect), needH / (2 * tanH), 9);
      camera.position.copy(camDir).multiplyScalar(dist).add(lookAt);
      camera.lookAt(lookAt);
      camera.updateProjectionMatrix();
    };
    fit();
    const ro = new ResizeObserver(() => {
      fit();
      if (reduced) renderer.render(scene, camera);
    });
    ro.observe(host);

    // Pointer parallax
    const target = { x: 0, y: 0 };
    const cur = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      target.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
      target.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
    };
    const onLeave = () => {
      target.x = 0;
      target.y = 0;
    };
    if (!reduced) {
      host.addEventListener("pointermove", onMove);
      host.addEventListener("pointerleave", onLeave);
    }

    let lastStep = -1;
    const applyStep = (s: number) => {
      if (s === lastStep) return;
      lastStep = s;
      drawScreen(screenCanvas, s);
      screenTex.needsUpdate = true;
    };

    const clock = new THREE.Clock();
    let raf = 0;
    let visible = true;

    const frame = () => {
      raf = 0;
      const t = reduced ? 0 : clock.getElapsedTime();
      const p = reduced ? 8.6 : t % CYCLE;
      const step = stepAt(p);
      applyStep(step);

      cur.x += (target.x - cur.x) * 0.06;
      cur.y += (target.y - cur.y) * 0.06;
      rig.rotation.y = -0.5 + cur.x * 0.3;
      rig.rotation.x = cur.y * 0.07;
      rig.position.y = Math.sin(t * 0.8) * 0.06;

      cards.forEach((c, i) => {
        c.mesh.position.y = c.base.y + Math.sin(t * 0.9 + c.ph) * 0.14;
        c.mesh.position.x = c.base.x + cur.x * (0.25 + i * 0.05);
        // keep the cards readable: face the camera plane, tiny sway
        c.mesh.rotation.y = -rig.rotation.y + Math.sin(t * 0.6 + c.ph) * 0.05;
      });

      // laser sweeps on each scan, dims otherwise
      const inScan = step >= 0 && step <= 4;
      const stepStart = [0, 0.9, 2.3, 3.7, 5.1][Math.min(step, 4)];
      const sinceScan = p - stepStart;
      const pulse = inScan ? Math.max(0, 1 - sinceScan / 0.7) : 0;
      laserBar.position.y = Math.sin(t * 9) * 0.3;
      (laserBar.material as THREE.MeshBasicMaterial).opacity = 0.25 + pulse * 0.75;
      (beam.material as THREE.MeshBasicMaterial).opacity = 0.05 + pulse * 0.2;
      productBox.position.y = 0.425 + pulse * Math.sin(sinceScan * 12) * 0.03;

      // paper feeds out once paid, retracts before the loop restarts
      let feed = 0;
      if (step === 6) feed = easeOut((p - 7.7) / 1.3);
      if (p > 9.5) feed *= Math.max(0, 1 - (p - 9.5) / 0.5);
      paper.position.y = 0.86 + PAPER_HIDDEN * (1 - feed);
      (led.material as THREE.MeshBasicMaterial).color.set(step === 6 ? 0x34d399 : 0xfbbf24);

      particles.rotation.y = t * 0.03;
      particles.position.y = Math.sin(t * 0.3) * 0.15;

      renderer.render(scene, camera);
      if (!reduced && visible) raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (reduced) {
        frame();
        return;
      }
      if (!raf && visible) raf = requestAnimationFrame(frame);
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting && !document.hidden;
        if (visible) start();
      },
      { threshold: 0.02 }
    );
    io.observe(host);
    const onVisibility = () => {
      visible = !document.hidden;
      if (visible) start();
    };
    document.addEventListener("visibilitychange", onVisibility);
    start();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      disposables.forEach((d) => d.dispose());
      envTex.dispose();
      pmrem.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={hostRef}
      role="img"
      aria-label="3D illustration of a Falcon 360 billing counter with a POS screen, barcode scanner and receipt printer"
      className={className}
    >
      {fallback && <Fallback />}
    </div>
  );
}
