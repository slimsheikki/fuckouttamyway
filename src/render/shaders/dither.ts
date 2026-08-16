// Ordered (Bayer 4x4) dithering + colour-depth quantization. Emulates the
// banded, dithered look of PS2-era framebuffers. Runs as a full-screen pass.

export const DitherShader = {
  uniforms: {
    tDiffuse: { value: null as unknown },
    levels: { value: 16.0 }, // colour steps per channel
    strength: { value: 0.6 }, // 0 = off, 1 = full dither
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float levels;
    uniform float strength;
    varying vec2 vUv;

    // 4x4 Bayer threshold matrix, normalised to -0.5..0.5.
    float bayer(vec2 p) {
      int x = int(mod(p.x, 4.0));
      int y = int(mod(p.y, 4.0));
      int i = y * 4 + x;
      float m[16];
      m[0]=0.0;  m[1]=8.0;  m[2]=2.0;  m[3]=10.0;
      m[4]=12.0; m[5]=4.0;  m[6]=14.0; m[7]=6.0;
      m[8]=3.0;  m[9]=11.0; m[10]=1.0; m[11]=9.0;
      m[12]=15.0;m[13]=7.0; m[14]=13.0;m[15]=5.0;
      float v = 0.0;
      for (int k = 0; k < 16; k++) if (k == i) v = m[k];
      return v / 16.0 - 0.5;
    }

    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      float d = bayer(gl_FragCoord.xy) * strength / levels;
      vec3 q = floor((c.rgb + d) * levels + 0.5) / levels;
      gl_FragColor = vec4(q, c.a);
    }
  `,
};
