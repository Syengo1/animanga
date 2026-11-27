// C:\Projects\animanga-platform\apps\web\src\components\canvas\galleryTextureStore.ts
"use client";

import * as THREE from "three";
import { projectsData } from "@/lib/data";

const textureMap = new Map<string, THREE.Texture>();
let activeBatchPromise: Promise<void> | null = null;
let activeBatchMode: "mobile" | "desktop" | null = null;
let scratchCanvas: HTMLCanvasElement | null = null;

function getCacheKey(url: string, isMobile: boolean): string {
  return `${isMobile ? "m" : "d"}:${url}`;
}

export function getCachedGalleryTexture(
  url: string,
  isMobile: boolean,
): THREE.Texture | null {
  return (
    textureMap.get(getCacheKey(url, isMobile)) ??
    textureMap.get(getCacheKey(url, !isMobile)) ??
    null
  );
}

function getScratchCanvas(): HTMLCanvasElement {
  if (!scratchCanvas) {
    scratchCanvas = document.createElement("canvas");
  }
  return scratchCanvas;
}

function loadAndDecodeImage(
  url: string,
  timeoutMs: number,
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.crossOrigin = "anonymous";

    const timer = window.setTimeout(() => {
      img.onload = null;
      img.onerror = null;
      reject(new Error(`Timeout loading ${url}`));
    }, timeoutMs);

    img.onload = async () => {
      try {
        // Wait for full AVIF decode before drawing/uploading pixels
        if (typeof img.decode === "function") {
          await img.decode();
        }
        window.clearTimeout(timer);
        if ((img.naturalWidth || img.width) === 0) {
          reject(new Error(`Empty decoded image: ${url}`));
          return;
        }
        resolve(img);
      } catch (err) {
        window.clearTimeout(timer);
        reject(err);
      }
    };

    img.onerror = (err) => {
      window.clearTimeout(timer);
      reject(err);
    };

    img.src = url;
  });
}

async function decodeAndBuildTexture(
  url: string,
  isMobile: boolean,
): Promise<THREE.Texture> {
  let img: HTMLImageElement;
  try {
    img = await loadAndDecodeImage(url, 10_000);
  } catch {
    await new Promise((r) => window.setTimeout(r, 350));
    img = await loadAndDecodeImage(url, 10_000);
  }

  const naturalW = img.naturalWidth || img.width || 1;
  const naturalH = img.naturalHeight || img.height || 1;

  if (isMobile) {
    // Resize via ONE shared scratch canvas into a plain RGBA DataTexture.
    // Prevents iOS/Android 2D canvas memory-pool exhaustion and NPOT mipmap blackouts (~44 MB VRAM total).
    const maxDimension = 448;
    const scale = Math.min(1, maxDimension / Math.max(naturalW, naturalH));
    const targetW = Math.max(2, Math.round(naturalW * scale));
    const targetH = Math.max(2, Math.round(naturalH * scale));

    const canvas = getScratchCanvas();
    canvas.width = targetW;
    canvas.height = targetH;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      throw new Error("2D canvas context unavailable");
    }

    ctx.clearRect(0, 0, targetW, targetH);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, targetW, targetH);

    const imageData = ctx.getImageData(0, 0, targetW, targetH);
    const pixels = new Uint8Array(imageData.data);

    // Immediately release the scratch canvas backing store
    canvas.width = 1;
    canvas.height = 1;

    const texture = new THREE.DataTexture(
      pixels,
      targetW,
      targetH,
      THREE.RGBAFormat,
    );
    texture.flipY = true;
    texture.colorSpace = THREE.NoColorSpace;
    texture.anisotropy = 1;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;

    return texture;
  }

  // Desktop: upload the decoded HTMLImageElement directly at full crispness
  const texture = new THREE.Texture(img);
  texture.flipY = true;
  texture.colorSpace = THREE.NoColorSpace;
  texture.anisotropy = 8;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;

  return texture;
}

export function preloadAllGalleryTextures(
  isMobile: boolean,
  onProgress?: (percent: number) => void,
): Promise<void> {
  const mode = isMobile ? "mobile" : "desktop";
  const urls = Array.from(new Set(projectsData.map((p) => p.image.url)));
  const total = urls.length;

  const alreadyLoaded = urls.filter((url) =>
    textureMap.has(getCacheKey(url, isMobile)),
  ).length;

  if (alreadyLoaded === total) {
    onProgress?.(100);
    return Promise.resolve();
  }

  if (activeBatchPromise && activeBatchMode === mode) {
    return activeBatchPromise;
  }

  let completed = alreadyLoaded;
  let cursor = 0;
  // Keep mobile concurrency modest so AV1 decoders & scratch canvas stay smooth
  const concurrency = isMobile ? 4 : 10;

  const report = () => {
    const pct = Math.min(96, Math.round((completed / total) * 96));
    onProgress?.(pct);
  };
  report();

  const worker = async () => {
    while (cursor < total) {
      const idx = cursor++;
      const url = urls[idx];
      const key = getCacheKey(url, isMobile);

      if (textureMap.has(key)) continue;

      try {
        const tex = await decodeAndBuildTexture(url, isMobile);
        textureMap.set(key, tex);
      } catch {
        // Skip single failed asset so the experience never stalls
      } finally {
        completed += 1;
        report();
      }
    }
  };

  activeBatchMode = mode;
  activeBatchPromise = Promise.all(
    Array.from({ length: Math.min(concurrency, total) }, () => worker()),
  )
    .then(() => {
      onProgress?.(98);
    })
    .finally(() => {
      activeBatchPromise = null;
      activeBatchMode = null;
    });

  return activeBatchPromise;
}
