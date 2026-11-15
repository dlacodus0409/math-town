import * as THREE from 'three';
import type { NpcProfile } from '../types/game';
import { createNameplateTexture } from './textures';

export interface StudentCharacterRig {
  group: THREE.Group;
  bodyGroup: THREE.Group;
  headGroup: THREE.Group;
  leftArmPivot: THREE.Group;
  rightArmPivot: THREE.Group;
  leftLegPivot: THREE.Group;
  rightLegPivot: THREE.Group;
}

export interface NpcRig {
  profile: NpcProfile;
  group: THREE.Group;
  bodyGroup: THREE.Group;
  headGroup: THREE.Group;
  leftArmPivot: THREE.Group;
  rightArmPivot: THREE.Group;
  markerMesh: THREE.Mesh;
  markerRing: THREE.Mesh;
  nameplateSprite: THREE.Sprite;
  solved: boolean;
}

export interface CottageOptions {
  width: number;
  depth: number;
  wallHeight: number;
  wallColor: number;
  roofTexture: THREE.Texture;
  roofColor: number;
  trimColor: number;
  doorColor: number;
  hasAwning?: boolean;
  awningColor?: number;
}

function addContactShadow(parent: THREE.Group, shadowTex: THREE.Texture, radius: number): void {
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    depthWrite: false,
    opacity: 0.75,
  });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  parent.add(shadow);
}

export function createStudentCharacter(shadowTex: THREE.Texture): StudentCharacterRig {
  const group = new THREE.Group();
  addContactShadow(group, shadowTex, 0.72);

  // Materials with clear roughness contrast
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xf7cfa8, roughness: 0.75, metalness: 0.0 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.8, metalness: 0.0 });
  const collarMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.7, metalness: 0.0 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85, metalness: 0.0 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.55, metalness: 0.05 });
  const soleMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.65, metalness: 0.0 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.85, metalness: 0.05 });
  const capMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.6, metalness: 0.05 });
  const packMat = new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.75, metalness: 0.05 });
  const buckleMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.25, metalness: 0.85 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2, metalness: 0.1 });
  const cheekMat = new THREE.MeshStandardMaterial({ color: 0xfda4af, roughness: 0.85, metalness: 0.0 });

  // Body container (hips sit at y = 0.72)
  const bodyGroup = new THREE.Group();
  bodyGroup.position.y = 0.72;
  group.add(bodyGroup);

  // Pelvis / belt
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.3), pantsMat);
  pelvis.position.y = 0.06;
  pelvis.castShadow = true;
  bodyGroup.add(pelvis);

  // Torso jacket
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.54, 0.34), shirtMat);
  torso.position.y = 0.4;
  torso.castShadow = true;
  torso.receiveShadow = true;
  bodyGroup.add(torso);

  // Shirt collar
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.08, 12), collarMat);
  collar.position.y = 0.68;
  bodyGroup.add(collar);

  // Backpack (behind torso: -Z is forward, +Z is back)
  const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.44, 0.2), packMat);
  backpack.position.set(0, 0.42, 0.25);
  backpack.castShadow = true;
  bodyGroup.add(backpack);

  const packPocket = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.2, 0.06), capMat);
  packPocket.position.set(0, 0.34, 0.37);
  bodyGroup.add(packPocket);

  const packBuckle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.04), buckleMat);
  packBuckle.position.set(0, 0.48, 0.36);
  bodyGroup.add(packBuckle);

  // Head Group
  const headGroup = new THREE.Group();
  headGroup.position.y = 0.74;
  bodyGroup.add(headGroup);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.44, 0.44), skinMat);
  head.position.y = 0.24;
  head.castShadow = true;
  headGroup.add(head);

  // Hair back/sides
  const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.49, 0.26, 0.24), hairMat);
  hairBack.position.set(0, 0.3, 0.14);
  headGroup.add(hairBack);

  // Cap crown + visor facing -Z (forward)
  const capCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.28, 0.16, 16), capMat);
  capCrown.position.set(0, 0.48, 0.02);
  capCrown.castShadow = true;
  headGroup.add(capCrown);

  const capBrim = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.045, 0.26), capMat);
  capBrim.position.set(0, 0.42, -0.24);
  capBrim.castShadow = true;
  headGroup.add(capBrim);

  // Eyes & Cheeks on front face (-Z)
  const eyeGeo = new THREE.SphereGeometry(0.036, 10, 10);
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(-0.1, 0.25, -0.22);
  const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
  eyeR.position.set(0.1, 0.25, -0.22);
  headGroup.add(eyeL, eyeR);

  const cheekGeo = new THREE.SphereGeometry(0.04, 8, 8);
  const cheekL = new THREE.Mesh(cheekGeo, cheekMat);
  cheekL.scale.set(1.2, 0.7, 0.5);
  cheekL.position.set(-0.15, 0.17, -0.21);
  const cheekR = new THREE.Mesh(cheekGeo, cheekMat);
  cheekR.scale.set(1.2, 0.7, 0.5);
  cheekR.position.set(0.15, 0.17, -0.21);
  headGroup.add(cheekL, cheekR);

  // Arm Pivots at shoulder height
  const buildArm = (side: -1 | 1): THREE.Group => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.36, 0.6, 0);

    const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.32, 0.16), shirtMat);
    sleeve.position.y = -0.14;
    sleeve.castShadow = true;
    pivot.add(sleeve);

    const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 0.14), skinMat);
    forearm.position.y = -0.38;
    forearm.castShadow = true;
    pivot.add(forearm);

    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 10), skinMat);
    hand.position.y = -0.5;
    pivot.add(hand);

    return pivot;
  };

  const leftArmPivot = buildArm(-1);
  const rightArmPivot = buildArm(1);
  bodyGroup.add(leftArmPivot, rightArmPivot);

  // Leg Pivots at hip height (y = 0.72 relative to ground)
  const buildLeg = (side: -1 | 1): THREE.Group => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.14, 0.72, 0);

    const legMesh = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.56, 0.2), pantsMat);
    legMesh.position.y = -0.28;
    legMesh.castShadow = true;
    pivot.add(legMesh);

    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.13, 0.3), shoeMat);
    shoe.position.set(0, -0.61, -0.04);
    shoe.castShadow = true;
    pivot.add(shoe);

    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.04, 0.31), soleMat);
    sole.position.set(0, -0.695, -0.04);
    pivot.add(sole);

    return pivot;
  };

  const leftLegPivot = buildLeg(-1);
  const rightLegPivot = buildLeg(1);
  group.add(leftLegPivot, rightLegPivot);

  return {
    group,
    bodyGroup,
    headGroup,
    leftArmPivot,
    rightArmPivot,
    leftLegPivot,
    rightLegPivot,
  };
}

export function createNpcCharacter(profile: NpcProfile, shadowTex: THREE.Texture): NpcRig {
  const group = new THREE.Group();
  group.position.set(profile.position[0], 0, profile.position[1]);
  group.rotation.y = profile.facingAngle;
  addContactShadow(group, shadowTex, 0.72);

  const skinMat = new THREE.MeshStandardMaterial({ color: profile.skinColor, roughness: 0.75 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: profile.shirtColor, roughness: 0.8 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: profile.pantsColor, roughness: 0.85 });
  const hairMat = new THREE.MeshStandardMaterial({ color: profile.hairColor, roughness: 0.85 });
  const accentMat = new THREE.MeshStandardMaterial({ color: profile.accentColor, roughness: 0.5, metalness: 0.1 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x3f2e21, roughness: 0.65 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2 });

  // Standing legs
  [-1, 1].forEach((side) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.62, 0.19), pantsMat);
    leg.position.set(side * 0.14, 0.39, 0);
    leg.castShadow = true;
    group.add(leg);

    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.12, 0.27), shoeMat);
    shoe.position.set(side * 0.14, 0.06, 0.03);
    shoe.castShadow = true;
    group.add(shoe);
  });

  const bodyGroup = new THREE.Group();
  bodyGroup.position.y = 0.7;
  group.add(bodyGroup);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.58, 0.34), shirtMat);
  torso.position.y = 0.3;
  torso.castShadow = true;
  torso.receiveShadow = true;
  bodyGroup.add(torso);

  // Apron or sash accent
  if (profile.accessory === 'apron' || profile.accessory === 'chef') {
    const apron = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.5, 0.04), accentMat);
    apron.position.set(0, 0.22, 0.18);
    bodyGroup.add(apron);
  } else if (profile.accessory === 'scarf') {
    const scarf = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.12, 12), accentMat);
    scarf.position.y = 0.6;
    bodyGroup.add(scarf);
  }

  // Arms (facing +Z for NPC local front)
  const buildNpcArm = (side: -1 | 1): THREE.Group => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.37, 0.52, 0);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.44, 0.15), shirtMat);
    arm.position.y = -0.22;
    arm.castShadow = true;
    pivot.add(arm);

    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 10), skinMat);
    hand.position.y = -0.47;
    pivot.add(hand);
    return pivot;
  };
  const leftArmPivot = buildNpcArm(-1);
  const rightArmPivot = buildNpcArm(1);
  bodyGroup.add(leftArmPivot, rightArmPivot);

  // Head
  const headGroup = new THREE.Group();
  headGroup.position.y = 0.65;
  bodyGroup.add(headGroup);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.44, 0.42), skinMat);
  head.position.y = 0.24;
  head.castShadow = true;
  headGroup.add(head);

  const hairTop = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.14, 0.44), hairMat);
  hairTop.position.y = 0.44;
  headGroup.add(hairTop);

  // Eyes facing +Z
  const eyeGeo = new THREE.SphereGeometry(0.034, 8, 8);
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(-0.1, 0.25, 0.21);
  const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
  eyeR.position.set(0.1, 0.25, 0.21);
  headGroup.add(eyeL, eyeR);

  // Role Accessories
  switch (profile.accessory) {
    case 'tophat': {
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.04, 16), pantsMat);
      brim.position.y = 0.5;
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.32, 16), pantsMat);
      crown.position.y = 0.66;
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.07, 16), accentMat);
      band.position.y = 0.55;
      headGroup.add(brim, crown, band);
      break;
    }
    case 'chef': {
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.14, 14), shirtMat);
      band.position.y = 0.54;
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), shirtMat);
      puff.position.y = 0.72;
      headGroup.add(band, puff);
      break;
    }
    case 'sunhat':
    case 'strawhat': {
      const strawMat = new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.85 });
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.44, 0.04, 18), strawMat);
      brim.position.y = 0.48;
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.26, 0.18, 16), strawMat);
      crown.position.y = 0.57;
      const ribbon = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.05, 16), accentMat);
      ribbon.position.y = 0.52;
      headGroup.add(brim, crown, ribbon);
      break;
    }
    case 'glasses': {
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.3, metalness: 0.7 });
      const ringGeo = new THREE.TorusGeometry(0.065, 0.012, 8, 16);
      const gL = new THREE.Mesh(ringGeo, frameMat);
      gL.position.set(-0.1, 0.25, 0.22);
      const gR = new THREE.Mesh(ringGeo, frameMat);
      gR.position.set(0.1, 0.25, 0.22);
      headGroup.add(gL, gR);
      break;
    }
    case 'cap': {
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.25, 0.14, 14), accentMat);
      cap.position.y = 0.5;
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.04, 0.22), accentMat);
      visor.position.set(0, 0.45, 0.22);
      headGroup.add(cap, visor);
      break;
    }
    case 'beret': {
      const beret = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.1, 14), accentMat);
      beret.position.set(0.04, 0.52, 0);
      beret.rotation.z = -0.18;
      headGroup.add(beret);
      break;
    }
    case 'wizard': {
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.04, 16), shirtMat);
      brim.position.y = 0.5;
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.48, 16), shirtMat);
      cone.position.y = 0.74;
      const starBand = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.06, 16), accentMat);
      starBand.position.y = 0.54;
      headGroup.add(brim, cone, starBand);
      break;
    }
    default:
      break;
  }

  // Floating status marker above NPC head
  const markerMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 0.45,
    roughness: 0.2,
    metalness: 0.4,
  });
  const markerMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), markerMat);
  markerMesh.position.y = 2.45;
  group.add(markerMesh);

  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xfbbf24,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
  });
  const markerRing = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.58, 24), ringMat);
  markerRing.rotation.x = -Math.PI / 2;
  markerRing.position.y = 0.04;
  group.add(markerRing);

  // Crisp NPC Nameplate Sprite
  const spriteMat = new THREE.SpriteMaterial({
    map: createNameplateTexture(profile.name, profile.role, false),
    transparent: true,
    depthWrite: false,
  });
  const nameplateSprite = new THREE.Sprite(spriteMat);
  nameplateSprite.position.y = 3.05;
  nameplateSprite.scale.set(2.3, 0.65, 1);
  group.add(nameplateSprite);

  return {
    profile,
    group,
    bodyGroup,
    headGroup,
    leftArmPivot,
    rightArmPivot,
    markerMesh,
    markerRing,
    nameplateSprite,
    solved: false,
  };
}

export function createVillageCottage(opts: CottageOptions): THREE.Group {
  const group = new THREE.Group();

  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.9, metalness: 0.05 });
  const wallMat = new THREE.MeshStandardMaterial({ color: opts.wallColor, roughness: 0.85, metalness: 0.0 });
  const trimMat = new THREE.MeshStandardMaterial({ color: opts.trimColor, roughness: 0.7, metalness: 0.05 });
  const roofMat = new THREE.MeshStandardMaterial({
    color: opts.roofColor,
    map: opts.roofTexture,
    roughness: 0.65,
    metalness: 0.05,
  });
  const doorMat = new THREE.MeshStandardMaterial({ color: opts.doorColor, roughness: 0.65 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xfde68a,
    emissiveIntensity: 0.35,
    roughness: 0.15,
    metalness: 0.1,
  });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.25, metalness: 0.9 });

  // Stone foundation plinth
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(opts.width + 0.3, 0.45, opts.depth + 0.3), stoneMat);
  plinth.position.y = 0.225;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  group.add(plinth);

  // Main plaster body
  const body = new THREE.Mesh(new THREE.BoxGeometry(opts.width, opts.wallHeight, opts.depth), wallMat);
  body.position.y = 0.45 + opts.wallHeight / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Corner timber beams
  const beamGeo = new THREE.BoxGeometry(0.22, opts.wallHeight, 0.22);
  [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ].forEach(([sx, sz]) => {
    const beam = new THREE.Mesh(beamGeo, trimMat);
    beam.position.set(sx * (opts.width / 2 - 0.05), 0.45 + opts.wallHeight / 2, sz * (opts.depth / 2 - 0.05));
    group.add(beam);
  });

  // Pitched prism roof built with ExtrudeGeometry
  const roofOverhang = 0.45;
  const roofHeight = opts.depth * 0.42;
  const halfD = opts.depth / 2 + roofOverhang;
  const roofShape = new THREE.Shape();
  roofShape.moveTo(-halfD, 0);
  roofShape.lineTo(0, roofHeight);
  roofShape.lineTo(halfD, 0);
  roofShape.closePath();

  const roofGeo = new THREE.ExtrudeGeometry(roofShape, {
    depth: opts.width + roofOverhang * 2,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.06,
    bevelSegments: 2,
  });
  roofGeo.rotateY(Math.PI / 2);
  roofGeo.center();

  const roofMesh = new THREE.Mesh(roofGeo, roofMat);
  roofMesh.position.y = 0.45 + opts.wallHeight + roofHeight / 2 - 0.04;
  roofMesh.castShadow = true;
  roofMesh.receiveShadow = true;
  group.add(roofMesh);

  // Chimney
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.5, 0.65), stoneMat);
  chimney.position.set(opts.width * 0.28, 0.45 + opts.wallHeight + roofHeight * 0.65, -opts.depth * 0.18);
  chimney.castShadow = true;
  group.add(chimney);

  // Front Door (+Z)
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.9, 0.14), doorMat);
  door.position.set(0, 0.45 + 0.95, opts.depth / 2 + 0.03);
  group.add(door);

  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), brassMat);
  knob.position.set(0.34, 0.45 + 0.9, opts.depth / 2 + 0.12);
  group.add(knob);

  const step = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.22, 0.65), stoneMat);
  step.position.set(0, 0.11, opts.depth / 2 + 0.35);
  group.add(step);

  // Mullioned Front Windows
  [-1, 1].forEach((side) => {
    if (opts.width >= 4.8) {
      const winFrame = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.95, 0.12), trimMat);
      winFrame.position.set(side * (opts.width * 0.3), 0.45 + opts.wallHeight * 0.54, opts.depth / 2 + 0.02);
      group.add(winFrame);

      const pane = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.75, 0.14), glassMat);
      pane.position.copy(winFrame.position);
      group.add(pane);

      // Flower box under window
      const planter = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.22, 0.26), trimMat);
      planter.position.set(winFrame.position.x, winFrame.position.y - 0.56, opts.depth / 2 + 0.14);
      group.add(planter);
    }
  });

  // Optional Shop Awning
  if (opts.hasAwning) {
    const awningMat = new THREE.MeshStandardMaterial({
      color: opts.awningColor ?? 0xef4444,
      roughness: 0.75,
    });
    const awning = new THREE.Mesh(new THREE.BoxGeometry(opts.width * 0.72, 0.14, 1.05), awningMat);
    awning.position.set(0, 0.45 + 2.25, opts.depth / 2 + 0.5);
    awning.rotation.x = 0.28;
    awning.castShadow = true;
    group.add(awning);
  }

  return group;
}

export function createTownHall(roofTex: THREE.Texture, clockTex: THREE.Texture): THREE.Group {
  const group = createVillageCottage({
    width: 8.2,
    depth: 5.8,
    wallHeight: 3.8,
    wallColor: 0xfef3c7,
    roofTexture: roofTex,
    roofColor: 0x1e40af,
    trimColor: 0x78350f,
    doorColor: 0x451a03,
    hasAwning: false,
  });

  // Clock tower centered on roof
  const towerMat = new THREE.MeshStandardMaterial({ color: 0xfef9c3, roughness: 0.8 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.55 });
  const spireMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.25, metalness: 0.85 });

  const tower = new THREE.Mesh(new THREE.BoxGeometry(2.3, 3.2, 2.3), towerMat);
  tower.position.set(0, 6.4, 0);
  tower.castShadow = true;
  group.add(tower);

  const spire = new THREE.Mesh(new THREE.ConeGeometry(1.85, 2.2, 4), roofMat);
  spire.rotation.y = Math.PI / 4;
  spire.position.set(0, 9.0, 0);
  spire.castShadow = true;
  group.add(spire);

  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), spireMat);
  finial.position.set(0, 10.2, 0);
  group.add(finial);

  const dialMat = new THREE.MeshStandardMaterial({ map: clockTex, roughness: 0.4 });
  const dial = new THREE.Mesh(new THREE.CircleGeometry(0.72, 24), dialMat);
  dial.position.set(0, 6.8, 1.17);
  group.add(dial);

  return group;
}

export function createFountain(): { group: THREE.Group; waterMesh: THREE.Mesh } {
  const group = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.78, metalness: 0.05 });
  const darkStoneMat = new THREE.MeshStandardMaterial({ color: 0xa8a29e, roughness: 0.82 });

  // Outer carved stone basin via LatheGeometry
  const basinPoints = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(2.35, 0),
    new THREE.Vector2(2.45, 0.25),
    new THREE.Vector2(2.35, 0.72),
    new THREE.Vector2(2.1, 0.75),
    new THREE.Vector2(2.05, 0.28),
    new THREE.Vector2(0, 0.28),
  ];
  const basinGeo = new THREE.LatheGeometry(basinPoints, 28);
  const basin = new THREE.Mesh(basinGeo, stoneMat);
  basin.castShadow = true;
  basin.receiveShadow = true;
  group.add(basin);

  // Central sculpted column
  const colPoints = [
    new THREE.Vector2(0, 0.25),
    new THREE.Vector2(0.55, 0.25),
    new THREE.Vector2(0.38, 1.0),
    new THREE.Vector2(1.05, 1.45),
    new THREE.Vector2(1.08, 1.65),
    new THREE.Vector2(0.3, 1.55),
    new THREE.Vector2(0.22, 2.35),
    new THREE.Vector2(0.45, 2.48),
    new THREE.Vector2(0.0, 2.68),
  ];
  const colMesh = new THREE.Mesh(new THREE.LatheGeometry(colPoints, 24), darkStoneMat);
  colMesh.castShadow = true;
  group.add(colMesh);

  // Shimmering water disc
  const waterMat = new THREE.MeshPhysicalMaterial({
    color: 0x38bdf8,
    roughness: 0.12,
    metalness: 0.1,
    clearcoat: 1.0,
    transparent: true,
    opacity: 0.85,
  });
  const waterMesh = new THREE.Mesh(new THREE.CircleGeometry(2.08, 28), waterMat);
  waterMesh.rotation.x = -Math.PI / 2;
  waterMesh.position.y = 0.62;
  group.add(waterMesh);

  return { group, waterMesh };
}

export function createWindmill(roofTex: THREE.Texture): { group: THREE.Group; sailRotor: THREE.Group } {
  const group = new THREE.Group();
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.9 });
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xfef2f2, roughness: 0.82 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, map: roofTex, roughness: 0.65 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.75 });
  const sailMat = new THREE.MeshStandardMaterial({ color: 0xfefce8, roughness: 0.8, side: THREE.DoubleSide });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.5, 1.4, 8), baseMat);
  base.position.y = 0.7;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 2.1, 4.6, 8), wallMat);
  tower.position.y = 3.7;
  tower.castShadow = true;
  group.add(tower);

  const cap = new THREE.Mesh(new THREE.ConeGeometry(1.9, 1.9, 8), roofMat);
  cap.position.y = 6.9;
  cap.castShadow = true;
  group.add(cap);

  const sailRotor = new THREE.Group();
  sailRotor.position.set(0, 5.2, 1.8);
  group.add(sailRotor);

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.6, 12), woodMat);
  hub.rotation.x = Math.PI / 2;
  sailRotor.add(hub);

  for (let i = 0; i < 4; i++) {
    const armGroup = new THREE.Group();
    armGroup.rotation.z = (i * Math.PI) / 2;

    const spar = new THREE.Mesh(new THREE.BoxGeometry(0.16, 3.3, 0.14), woodMat);
    spar.position.y = 1.65;
    spar.castShadow = true;
    armGroup.add(spar);

    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 2.45), sailMat);
    cloth.position.set(0.46, 1.95, 0.04);
    cloth.castShadow = true;
    armGroup.add(cloth);

    sailRotor.add(armGroup);
  }

  return { group, sailRotor };
}

export function createStreetLamp(): THREE.Group {
  const group = new THREE.Group();
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.75 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xfbbf24,
    emissiveIntensity: 0.9,
    roughness: 0.2,
  });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 0.45, 8), ironMat);
  base.position.y = 0.225;
  base.castShadow = true;
  group.add(base);

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 2.8, 8), ironMat);
  pole.position.y = 1.85;
  pole.castShadow = true;
  group.add(pole);

  const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.15, 0.42, 6), glassMat);
  lantern.position.y = 3.45;
  group.add(lantern);

  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.22, 6), ironMat);
  cap.position.y = 3.76;
  group.add(cap);

  return group;
}

export function createBench(woodTex: THREE.Texture): THREE.Group {
  const group = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.75 });
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.7 });

  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.1, 0.55), woodMat);
  seat.position.y = 0.48;
  seat.castShadow = true;
  group.add(seat);

  const back = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.44, 0.09), woodMat);
  back.position.set(0, 0.76, -0.24);
  back.rotation.x = -0.15;
  back.castShadow = true;
  group.add(back);

  [-0.7, 0.7].forEach((x) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.48, 0.5), ironMat);
    leg.position.set(x, 0.24, 0);
    leg.castShadow = true;
    group.add(leg);
  });

  return group;
}

export function createFlowerBed(flowerColor: number): THREE.Group {
  const group = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 });
  const soilMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.95 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.8 });
  const petalMat = new THREE.MeshStandardMaterial({ color: flowerColor, roughness: 0.6 });

  const box = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.28, 0.85), woodMat);
  box.position.y = 0.14;
  box.castShadow = true;
  box.receiveShadow = true;
  group.add(box);

  const soil = new THREE.Mesh(new THREE.BoxGeometry(1.64, 0.08, 0.7), soilMat);
  soil.position.y = 0.27;
  group.add(soil);

  for (let i = -2; i <= 2; i++) {
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.25, 6), leafMat);
    stem.position.set(i * 0.3, 0.4, (i % 2) * 0.14 - 0.05);
    group.add(stem);

    const bloom = new THREE.Mesh(new THREE.DodecahedronGeometry(0.11, 0), petalMat);
    bloom.position.set(stem.position.x, 0.54, stem.position.z);
    group.add(bloom);
  }

  return group;
}
