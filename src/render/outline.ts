import {
  BackSide,
  Color,
  Mesh,
  ShaderMaterial,
  type BufferGeometry,
  type Object3D,
} from "three";
import { CONFIG, COLORS } from "../config.js";

// Inverted-hull outlines: draw the mesh a second time, back faces only, pushed
// outward along its normals in near-black. Authentic PS2/toon outline — cheap
// and per-object. A ShaderMaterial declares its own `normal` attribute, which
// MeshBasicMaterial does not, so we use one directly.
//
// NOTE (M2): skinned Mixamo meshes need the skinning chunks too — swap this for
// a MeshToon/Standard material + onBeforeCompile normal-push when art lands.

const outlineFog = new Color(COLORS.fog);

function outlineMaterial(thickness: number): ShaderMaterial {
  return new ShaderMaterial({
    side: BackSide,
    uniforms: {
      thickness: { value: thickness },
      outlineColor: { value: new Color(0x0a0a0a) },
      fogColor: { value: outlineFog },
      fogNear: { value: CONFIG.fogNear },
      fogFar: { value: CONFIG.fogFar },
    },
    vertexShader: /* glsl */ `
      uniform float thickness;
      varying float vFogDepth;
      void main() {
        vec3 p = position + normalize(normal) * thickness;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vFogDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 outlineColor;
      uniform vec3 fogColor;
      uniform float fogNear;
      uniform float fogFar;
      varying float vFogDepth;
      void main() {
        float f = smoothstep(fogNear, fogFar, vFogDepth);
        gl_FragColor = vec4(mix(outlineColor, fogColor, f), 1.0);
      }
    `,
  });
}

/**
 * Attach a black inverted-hull outline to a mesh (or every mesh under a group).
 * The outline is parented to each source mesh so it inherits transforms.
 */
export function addOutline(root: Object3D, thickness = 0.02): void {
  const meshes: Mesh[] = [];
  root.traverse((o) => {
    const m = o as Mesh;
    if (m.isMesh && !m.userData.isOutline) meshes.push(m);
  });
  for (const mesh of meshes) {
    const shell = new Mesh(
      mesh.geometry as BufferGeometry,
      outlineMaterial(thickness),
    );
    shell.userData.isOutline = true;
    shell.renderOrder = -1; // hull first, real mesh overdraws the interior
    mesh.add(shell);
  }
}
