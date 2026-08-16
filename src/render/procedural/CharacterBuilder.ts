import {
  BoxGeometry,
  CircleGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  TorusGeometry,
  type BufferGeometry,
  type Object3D,
} from "three";
import { toonMaterial } from "../toon.js";
import { addOutline } from "../outline.js";
import { clamp, lerp } from "../../core/math.js";

// Builds a caricature low-poly commuter from angular/tapered primitives (big
// head, chunky straight limbs — deliberately NOT plain cubes) with a code-driven
// hierarchy rig. One shared builder for the player and every NPC archetype; the
// pose() driver animates joints each frame (walk / idle / lean / stumble /
// startle). No skeletal assets, no Mixamo.

export type PropKind =
  | "bag"
  | "coffee"
  | "phone"
  | "newspaper"
  | "roller"
  | "bags2"
  | "bike";

export interface CharSpec {
  scale?: number;
  skin: number;
  hair?: number;
  torso: number; // clothing colour
  legs: number;
  accent?: number; // hi-vis beanie/bag
  build?: "slim" | "reg" | "wide";
  hat?: "beanie" | "hood" | "none";
  props?: PropKind[];
  headDown?: boolean; // phone-starers
  outline?: boolean; // hero (player) only, to keep NPC draw calls down
}

// ---- shared geometry (allocated once) ----
const G = {
  head: new IcosahedronGeometry(0.23, 1),
  torso: new CylinderGeometry(0.21, 0.18, 0.5, 6),
  arm: new CylinderGeometry(0.075, 0.06, 0.52, 6),
  leg: new CylinderGeometry(0.11, 0.085, 0.66, 6),
  foot: new BoxGeometry(0.15, 0.1, 0.28),
  eye: new CircleGeometry(0.04, 8),
  nose: new ConeGeometry(0.04, 0.1, 5),
  hair: new IcosahedronGeometry(0.25, 1),
  box: new BoxGeometry(1, 1, 1),
  wheel: new TorusGeometry(0.16, 0.03, 6, 10),
};

const HIP_Y = 0.66;
const WIDTH: Record<string, number> = { slim: 0.85, reg: 1, wide: 1.28 };

function mesh(geo: BufferGeometry, color: number): Mesh {
  return new Mesh(geo, toonMaterial({ color }));
}

// A limb that hangs from a pivot group so rotation.x swings it from the top.
function limb(geo: BufferGeometry, len: number, color: number): { pivot: Group; foot?: Mesh } {
  const pivot = new Group();
  const m = mesh(geo, color);
  m.position.y = -len / 2;
  pivot.add(m);
  return { pivot };
}

export class Character {
  readonly group = new Group();
  private spine = new Group();
  private body = new Group();
  private head = new Group();
  private armL = new Group();
  private armR = new Group();
  private legL = new Group();
  private legR = new Group();
  private bag?: Object3D;
  private phase = Math.random() * 6.28;
  private startleT = 0;
  private stumbleT = 0;
  private leanCur = 0;
  private headDown: number;

  constructor(private spec: CharSpec) {
    const w = WIDTH[spec.build ?? "reg"];
    this.headDown = spec.headDown ? 0.5 : 0;
    this.group.add(this.body);
    this.body.add(this.spine);
    this.spine.position.y = HIP_Y;

    // torso
    const torso = mesh(G.torso, spec.torso);
    torso.position.y = 0.25;
    torso.scale.x = w;
    this.spine.add(torso);

    // head + face
    this.head.position.y = 0.5 + 0.06;
    const headMesh = mesh(G.head, spec.skin);
    this.head.add(headMesh);
    if ((spec.hat ?? "none") !== "none") {
      const cap = mesh(G.hair, spec.hat === "beanie" ? spec.accent ?? 0x222222 : spec.hair ?? 0x2a2a2a);
      cap.position.y = 0.08;
      cap.scale.set(1.05, 0.7, 1.05);
      this.head.add(cap);
    } else if (spec.hair !== undefined) {
      const hair = mesh(G.hair, spec.hair);
      hair.position.y = 0.06;
      hair.scale.set(1.04, 0.8, 1.04);
      this.head.add(hair);
    }
    const eyeMat = new MeshBasicMaterial({ color: 0x141414 });
    for (const sx of [-1, 1]) {
      const eye = new Mesh(G.eye, eyeMat);
      eye.position.set(sx * 0.09, 0.02, 0.25);
      eye.userData.noOutline = true;
      this.head.add(eye);
    }
    const nose = mesh(G.nose, spec.skin);
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, -0.03, 0.26);
    nose.userData.noOutline = true;
    this.head.add(nose);
    this.spine.add(this.head);

    // arms
    const al = limb(G.arm, 0.5, spec.torso);
    const ar = limb(G.arm, 0.5, spec.torso);
    this.armL = al.pivot;
    this.armR = ar.pivot;
    this.armL.position.set(-0.21 * w, 0.47, 0);
    this.armR.position.set(0.21 * w, 0.47, 0);
    this.armL.rotation.z = 0.14;
    this.armR.rotation.z = -0.14;
    this.spine.add(this.armL, this.armR);

    // legs (+ feet)
    const ll = limb(G.leg, 0.66, spec.legs);
    const lr = limb(G.leg, 0.66, spec.legs);
    this.legL = ll.pivot;
    this.legR = lr.pivot;
    for (const [grp, sx] of [[this.legL, -1], [this.legR, 1]] as const) {
      grp.position.set(sx * 0.11, 0, 0);
      const foot = mesh(G.foot, 0x2b2b30);
      foot.position.set(0, -0.66, 0.06);
      grp.add(foot);
      this.body.add(grp);
    }

    this.addProps(w);

    // Blob shadow (faked, PS2-style) — grounds the character, doesn't bob.
    const blob = new Mesh(G.eye, new MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.26 }));
    blob.scale.setScalar(6 * w);
    blob.rotation.x = -Math.PI / 2;
    blob.position.y = 0.02;
    blob.userData.noOutline = true;
    this.group.add(blob);

    if (spec.outline) addOutline(this.group, 0.02);
    this.group.scale.setScalar(spec.scale ?? 1);
  }

  private prop(color: number, sx: number, sy: number, sz: number): Mesh {
    const m = mesh(G.box, color);
    m.scale.set(sx, sy, sz);
    return m;
  }

  private addProps(w: number): void {
    for (const p of this.spec.props ?? []) {
      if (p === "bag") {
        const bag = this.prop(0x3a3f4a, 0.28, 0.32, 0.14);
        bag.position.set(0.26 * w, 0.2, 0.02);
        const strap = this.prop(this.spec.accent ?? 0x222, 0.05, 0.5, 0.05);
        strap.position.set(0.0, 0.32, 0.08);
        strap.rotation.z = 0.5;
        this.spine.add(bag, strap);
        this.bag = bag;
      } else if (p === "coffee") {
        const cup = this.prop(0xe8e2d2, 0.09, 0.13, 0.09);
        cup.position.set(0, -0.5, 0.12);
        this.armR.add(cup);
      } else if (p === "phone") {
        const ph = this.prop(0x111318, 0.1, 0.16, 0.02);
        ph.position.set(0, -0.44, 0.14);
        this.armR.add(ph);
        this.armR.rotation.x = -0.9; // holding it up to stare at
      } else if (p === "newspaper") {
        const paper = this.prop(0xd9d2c0, 0.44, 0.36, 0.02);
        paper.position.set(0, 0.5, 0.34);
        this.spine.add(paper);
        this.armL.rotation.x = this.armR.rotation.x = -1.2; // arms forward
      } else if (p === "roller") {
        const bagBody = this.prop(0x394b8c, 0.34, 0.5, 0.22);
        bagBody.position.set(0.5 * w, 0.28, 0);
        const handle = this.prop(0x22252c, 0.04, 0.5, 0.04);
        handle.position.set(0.5 * w, 0.75, 0);
        this.body.add(bagBody, handle);
      } else if (p === "bags2") {
        for (const sx of [-1, 1]) {
          const b = this.prop(0xb04a3a, 0.22, 0.28, 0.16);
          b.position.set(sx * 0.34 * w, 0.5, 0.02);
          this.body.add(b);
        }
        this.armL.rotation.x = this.armR.rotation.x = -0.2;
      } else if (p === "bike") {
        const frame = new Group();
        for (const dz of [-0.34, 0.34]) {
          const wheel = mesh(G.wheel, 0x1c1c1f);
          wheel.position.set(0, 0.16, dz);
          frame.add(wheel);
        }
        const bar = this.prop(0x8a1f2a, 0.05, 0.05, 0.7);
        bar.position.set(0, 0.4, 0);
        frame.add(bar);
        frame.position.set(0.55 * w, 0, 0);
        this.body.add(frame);
      }
    }
  }

  startle(): void {
    this.startleT = 1;
  }
  stumble(): void {
    this.stumbleT = 1;
  }

  /** Drive the rig. lean in [-1,1]; speed01 scales stride intensity. */
  update(dt: number, o: { moving: boolean; speed01?: number; lean?: number }): void {
    const speed01 = clamp(o.speed01 ?? 0, 0, 1);
    const rate = o.moving ? 6 + speed01 * 8 : 2.2;
    this.phase += dt * rate;
    const swing = o.moving ? 0.5 + speed01 * 0.5 : 0.05;
    const s = Math.sin(this.phase);

    this.legL.rotation.x = s * swing;
    this.legR.rotation.x = -s * swing;
    this.armL.rotation.x = -s * swing * 0.9;
    this.armR.rotation.x = s * swing * 0.9;

    // bob / breathe
    this.body.position.y = o.moving
      ? Math.abs(Math.sin(this.phase)) * 0.05 * (0.6 + speed01)
      : Math.sin(this.phase) * 0.012;

    // lean strafe + forward run lean + head-down for phone-starers
    this.leanCur = lerp(this.leanCur, o.lean ?? 0, Math.min(1, dt * 12));
    const fwd = o.moving ? 0.05 + speed01 * 0.18 : 0;
    this.spine.rotation.z = this.leanCur * 0.22;
    this.spine.rotation.x = fwd;
    this.head.rotation.z = -this.leanCur * 0.1;
    this.head.rotation.x = this.headDown;
    this.head.rotation.y = 0;

    // startle: head whips around/up toward the passing player, arms flinch
    if (this.startleT > 0) {
      this.startleT = Math.max(0, this.startleT - dt * 2.2);
      const k = this.startleT;
      this.head.rotation.x = this.headDown - k * 0.5;
      this.head.rotation.y = k * 2.2 * (this.leanCur >= 0 ? 1 : -1);
      this.spine.rotation.x = fwd - k * 0.18;
      this.armL.rotation.x -= k * 1.3;
      this.armR.rotation.x -= k * 1.3;
    }
    // stumble: windmill + torso jerk
    if (this.stumbleT > 0) {
      this.stumbleT = Math.max(0, this.stumbleT - dt * 1.8);
      const k = this.stumbleT;
      const w = Math.sin(this.phase * 6);
      this.body.rotation.z = w * 0.18 * k;
      this.armL.rotation.x += w * 1.6 * k;
      this.armR.rotation.x -= w * 1.6 * k;
    } else {
      this.body.rotation.z = 0;
    }
    if (this.bag) this.bag.rotation.z = Math.sin(this.phase) * 0.15;
  }
}
