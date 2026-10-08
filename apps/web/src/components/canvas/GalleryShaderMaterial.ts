import { shaderMaterial } from "@react-three/drei";
import { extend } from "@react-three/fiber";
import * as THREE from "three";

export const GalleryShaderMaterial = shaderMaterial(
  {
    uTexture: new THREE.Texture(),
    uCurveAmountX: 0,
    uCurveAmountY: 0,
    uImageWidth: 1,
    uImageHeight: 1,
    uSizeFactorX: 0,
    uSizeFactorY: 0,
    uTiltAngle: 0,
    uOpacity: 1,
    uBgColor: new THREE.Color("#000000"), // NEW: Background color uniform
  },
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
      float percentageX = (abs(pos.x) / (uImageWidth * 0.5)) * 1000.0;
      float percentageY = (abs(pos.y) / (uImageHeight * 0.5)) * 1000.0;
      pos.z += uCurveAmountX * pow(percentageX, 2.0) * 0.003 * uSizeFactorX;
      pos.z += uCurveAmountY * pow(percentageY, 2.0) * 0.003 * uSizeFactorY;
      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  `
    uniform sampler2D uTexture;
    uniform float uOpacity;
    uniform vec3 uBgColor;
    varying vec2 vUv;
    void main() {
      vec4 texColor = texture2D(uTexture, vUv);
      
      // CRITICAL FIX: Simulating Opacity.
      // We mix the image with the theme's background color (White or Black).
      // A card with 0.3 opacity becomes 70% background color and 30% image.
      vec3 finalColor = mix(uBgColor, texColor.rgb, uOpacity);
      
      // Force alpha to 1.0. This makes the geometry solid, 
      // completely blocking the HTML sparkles/stars behind the cards.
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `,
);

extend({ GalleryShaderMaterial });
