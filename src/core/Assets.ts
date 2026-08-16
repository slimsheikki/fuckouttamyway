import { Group } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { toonify } from "../render/toon.js";
import { addOutline } from "../render/outline.js";

// Asset registry. In M1 the game runs fully on greybox primitives, so this
// preloads nothing and reports `greybox = true`. When .glb models land (M2),
// add entries to MANIFEST; loaded scenes are auto-toonified + outlined here so
// gameplay code never touches raw materials, and the entity factories switch
// off `greybox`.

interface ModelEntry {
  key: string;
  url: string;
}

const MANIFEST: ModelEntry[] = [
  // { key: "player", url: `${import.meta.env.BASE_URL}assets/models/player.glb` },
];

export class Assets {
  greybox = true;
  private models = new Map<string, GLTF>();
  private loader = new GLTFLoader();

  async preload(onProgress?: (frac: number) => void): Promise<void> {
    if (MANIFEST.length === 0) {
      onProgress?.(1);
      return;
    }
    let done = 0;
    await Promise.all(
      MANIFEST.map(async ({ key, url }) => {
        const gltf = await this.loader.loadAsync(url);
        toonify(gltf.scene);
        addOutline(gltf.scene);
        this.models.set(key, gltf);
        onProgress?.(++done / MANIFEST.length);
      }),
    );
    this.greybox = false;
  }

  /** Fresh instance of a loaded model, or an empty Group in greybox mode. */
  instance(key: string): Group {
    const gltf = this.models.get(key);
    if (!gltf) return new Group();
    return gltf.scene.clone(true) as Group;
  }
}
