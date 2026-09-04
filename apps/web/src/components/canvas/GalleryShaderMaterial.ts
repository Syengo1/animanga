import { shaderMaterial } from "@react-three/drei";
import { extend } from "@react-three/fiber";
import * as THREE from "three";

export const GalleryShaderMaterial = shaderMaterial(
  {
    uTexture: new THREE.Texture(),
    uCurveAmountX: 0,
    uCurveAmountY: 0,
    // FIX 1: Initialized to 1 to prevent division-by-zero (NaN) errors
    // in the fraction of a millisecond before React passes the actual dimensions
    uImageWidth: 1,
    uImageHeight: 1,
    uSizeFactorX: 0,
    uSizeFactorY: 0,
    uTiltAngle: 0,
    uOpacity: 1,
    // FIX 2: Removed unused `uWarpProgress`, `fogColor`, `fogNear`, and `fogFar`
  },
  // Vertex Shader (Deforms flat planes into curved spherical shapes)
  `
    uniform float uCurveAmountX;
    uniform float uCurveAmountY;
    uniform float uImageWidth;
    uniform float uImageHeight;
    uniform float uSizeFactorX;
    uniform float uSizeFactorY;
    uniform float uTiltAngle;

    varying vec2 vUv;

    void main() {
      vUv = uv;
      vec3 pos = position;

      // PRESERVED ORIGINAL MATH: Keeping the specific curve logic intact 
      // so the SphereGallery layout remains perfectly intact.
      float percentageX = (abs(pos.x) / (uImageWidth * 0.5)) * 1000.0;
      float percentageY = (abs(pos.y) / (uImageHeight * 0.5)) * 1000.0;

      pos.z += uCurveAmountX * pow(percentageX, 2.0) * 0.003 * uSizeFactorX;
      pos.z += uCurveAmountY * pow(percentageY, 2.0) * 0.003 * uSizeFactorY;

      // Z-axis Tilt
     // pos.z += pos.y * tan(uTiltAngle);

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      
      // FIX 3: Removed dead 'fogDepth' calculation since scene <fog> handles it natively
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  // Fragment Shader (Handles opacity and texture rendering)
  `
    uniform sampler2D uTexture;
    uniform float uOpacity;

    varying vec2 vUv;

    void main() {
      // FIX 4: Removed dead uWarpProgress logic. Since uWarpProgress was always 0,
      // it was running useless math on every pixel. This drastically optimizes the GPU load.
      vec4 texColor = texture2D(uTexture, vUv);
      texColor.a *= uOpacity;
      
      gl_FragColor = texColor;
    }
  `,
);

// Register the material with React Three Fiber
extend({ GalleryShaderMaterial });
