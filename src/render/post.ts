import type { Camera, Scene, WebGLRenderer } from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { DitherShader } from "./shaders/dither.js";

// Minimal post chain: scene render -> ordered dither. Bloom is intentionally
// OFF (not a PS2 look). Kept to one extra pass to stay cheap on mobile.

export class Post {
  readonly composer: EffectComposer;
  private dither: ShaderPass;

  constructor(
    renderer: WebGLRenderer,
    scene: Scene,
    camera: Camera,
    enabled = true,
  ) {
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));
    this.dither = new ShaderPass(DitherShader as never);
    this.dither.enabled = enabled;
    this.composer.addPass(this.dither);
  }

  setEnabled(on: boolean): void {
    this.dither.enabled = on;
  }

  setSize(w: number, h: number, pixelRatio: number): void {
    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(w, h);
  }

  render(): void {
    this.composer.render();
  }
}
