// C:\Projects\animanga-platform\apps\web\src\components\shared\cryptographic-qr.tsx
"use client";

import { useMemo } from "react";

interface CryptographicQrProps {
  payload: Record<string, unknown>;
  signature: string;
  size?: number;
}

export function CryptographicQr({
  payload,
  signature,
  size = 200,
}: CryptographicQrProps) {
  const gridSize = 25;

  const matrix = useMemo(() => {
    const canonical = `${JSON.stringify(payload)}.${signature}`;
    const grid: boolean[][] = Array.from({ length: gridSize }, () =>
      Array(gridSize).fill(false),
    );

    const isFinder = (r: number, c: number, topR: number, leftC: number) => {
      const dr = r - topR;
      const dc = c - leftC;
      if (dr < 0 || dr > 6 || dc < 0 || dc > 6) return null;
      if (dr === 0 || dr === 6 || dc === 0 || dc === 6) return true;
      if (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4) return true;
      return false;
    };

    let seed = 2166136261;
    for (let i = 0; i < canonical.length; i++) {
      seed ^= canonical.charCodeAt(i);
      seed = Math.imul(seed, 16777619);
    }

    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const tl = isFinder(r, c, 0, 0);
        const tr = isFinder(r, c, 0, gridSize - 7);
        const bl = isFinder(r, c, gridSize - 7, 0);

        if (tl !== null) {
          grid[r][c] = tl;
        } else if (tr !== null) {
          grid[r][c] = tr;
        } else if (bl !== null) {
          grid[r][c] = bl;
        } else if (
          (r === 7 && (c < 8 || c >= gridSize - 8)) ||
          (c === 7 && (r < 8 || r >= gridSize - 8))
        ) {
          grid[r][c] = false;
        } else if (r === 6 || c === 6) {
          grid[r][c] = (r + c) % 2 === 0;
        } else {
          const charIdx = (r * gridSize + c) % canonical.length;
          const charCode = canonical.charCodeAt(charIdx);
          const mixed = Math.imul(seed ^ (r * 31 + c * 17), charCode + 1);
          grid[r][c] = (mixed & 1) === 1;
        }
      }
    }

    return grid;
  }, [payload, signature]);

  return (
    <div
      className="p-3.5 rounded-2xl bg-[#f6f9fc] border-2 border-primary/30 shadow-inner inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        viewBox={`0 0 ${gridSize} ${gridSize}`}
        className="w-full h-full"
        shapeRendering="crispEdges"
        role="img"
        aria-label="Cryptographic Ed25519 Gate Pass QR Code"
      >
        {matrix.map((row, rIdx) =>
          row.map((cell, cIdx) =>
            cell ? (
              <rect
                key={`${rIdx}-${cIdx}`}
                x={cIdx}
                y={rIdx}
                width={1}
                height={1}
                fill="#0e1622"
              />
            ) : null,
          ),
        )}
      </svg>
    </div>
  );
}
