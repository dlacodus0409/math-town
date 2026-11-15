import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { VILLAGE_NPCS } from '../data/questions';
import type { GamePhase, ProximityInfo } from '../types/game';
import { soundEngine } from '../utils/audio';
import {
  createBench,
  createFlowerBed,
  createFountain,
  createNpcCharacter,
  createStreetLamp,
  createStudentCharacter,
  createTownHall,
  createVillageCottage,
  createWindmill,
  type NpcRig,
} from './models';
import {
  createClockDialTexture,
  createCobblestoneTexture,
  createContactShadowTexture,
  createGrassTexture,
  createNameplateTexture,
  createRoofTileTexture,
  createWoodPlankTexture,
} from './textures';

interface VillageSceneProps {
  gamePhase: GamePhase;
  paused?: boolean;
  solvedNpcIds: string[];
  resetSignal: number;
  virtualMoveRef: React.MutableRefObject<{ x: number; z: number }>;
  onProximityChange: (info: ProximityInfo | null) => void;
  onTalkTrigger: (npcId: string) => void;
  onWebglError?: () => void;
}

interface CircleCollider {
  x: number;
  z: number;
  r: number;
}

interface BoxCollider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

// Pre-allocated math helpers outside render loop (zero GC)
const _moveVec = new THREE.Vector3();
const _camDesired = new THREE.Vector3();
const _camLookTarget = new THREE.Vector3();
const _dummyObj = new THREE.Object3D();
const _tintColor = new THREE.Color();

function shortestAngleDiff(from: number, to: number): number {
  let diff = ((to - from + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

export function VillageScene({
  gamePhase,
  paused = false,
  solvedNpcIds,
  resetSignal,
  virtualMoveRef,
  onProximityChange,
  onTalkTrigger,
  onWebglError,
}: VillageSceneProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Refs for bridging React state into the single persistent Three.js animation loop
  const gamePhaseRef = useRef<GamePhase>(gamePhase);
  const pausedRef = useRef<boolean>(paused);
  const solvedSetRef = useRef<Set<string>>(new Set(solvedNpcIds));
  const onProximityChangeRef = useRef(onProximityChange);
  const onTalkTriggerRef = useRef(onTalkTrigger);
  const onWebglErrorRef = useRef(onWebglError);
  const npcRigsRef = useRef<NpcRig[]>([]);
  const resetPlayerFnRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    gamePhaseRef.current = gamePhase;
  }, [gamePhase]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    onProximityChangeRef.current = onProximityChange;
  }, [onProximityChange]);

  useEffect(() => {
    onTalkTriggerRef.current = onTalkTrigger;
  }, [onTalkTrigger]);

  useEffect(() => {
    onWebglErrorRef.current = onWebglError;
  }, [onWebglError]);

  // Sync solved NPC visual badges & floating gem markers
  useEffect(() => {
    const nextSet = new Set(solvedNpcIds);
    solvedSetRef.current = nextSet;

    npcRigsRef.current.forEach((rig) => {
      const isNowSolved = nextSet.has(rig.profile.id);
      if (rig.solved !== isNowSolved) {
        rig.solved = isNowSolved;

        const markerMat = rig.markerMesh.material as THREE.MeshStandardMaterial;
        const ringMat = rig.markerRing.material as THREE.MeshBasicMaterial;
        if (isNowSolved) {
          markerMat.color.setHex(0x10b981);
          markerMat.emissive.setHex(0x059669);
          markerMat.emissiveIntensity = 0.35;
          ringMat.color.setHex(0x34d399);
          ringMat.opacity = 0.28;
        } else {
          markerMat.color.setHex(0xf59e0b);
          markerMat.emissive.setHex(0xd97706);
          markerMat.emissiveIntensity = 0.45;
          ringMat.color.setHex(0xfbbf24);
          ringMat.opacity = 0.55;
        }

        const spriteMat = rig.nameplateSprite.material;
        const oldTex = spriteMat.map;
        spriteMat.map = createNameplateTexture(rig.profile.name, rig.profile.role, isNowSolved);
        spriteMat.needsUpdate = true;
        oldTex?.dispose();
      }
    });
  }, [solvedNpcIds]);

  // Reset student position when starting a new game
  useEffect(() => {
    if (resetSignal > 0 && resetPlayerFnRef.current) {
      resetPlayerFnRef.current();
    }
  }, [resetSignal]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Detect software WebGL once before renderer creation
    const isSoftwareGl = (() => {
      try {
        const probeCanvas = document.createElement('canvas');
        const gl = probeCanvas.getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      onWebglErrorRef.current?.();
      return;
    }

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);

    const scene = new THREE.Scene();
    const skyColor = new THREE.Color(0xcce8fa);
    scene.background = skyColor;
    scene.fog = new THREE.FogExp2(0xcce8fa, 0.0115);

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 180);
    camera.position.set(0, 7.5, 16);

    // Studio RoomEnvironment IBL
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmremGenerator.dispose();

    // Warm/cool 3-point outdoor lighting rig
    const hemiLight = new THREE.HemisphereLight(0x9bd0ff, 0x5c7a3e, 0.72);
    hemiLight.position.set(0, 40, 0);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff1d6, 1.85);
    sunLight.position.set(22, 34, 20);
    sunLight.castShadow = !isSoftwareGl;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 2;
    sunLight.shadow.camera.far = 95;
    sunLight.shadow.camera.left = -34;
    sunLight.shadow.camera.right = 34;
    sunLight.shadow.camera.top = 34;
    sunLight.shadow.camera.bottom = -34;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.02;
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0xbbe0ff, 0.48);
    rimLight.position.set(-20, 14, -24);
    scene.add(rimLight);

    // Procedural Textures
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const grassTex = createGrassTexture(maxAniso);
    const cobbleTex = createCobblestoneTexture(maxAniso);
    const redRoofTex = createRoofTileTexture('#c2410c', '#9a3412', maxAniso);
    const blueRoofTex = createRoofTileTexture('#1d4ed8', '#1e40af', maxAniso);
    const tealRoofTex = createRoofTileTexture('#0f766e', '#115e59', maxAniso);
    const woodTex = createWoodPlankTexture(maxAniso);
    const clockTex = createClockDialTexture(maxAniso);
    const shadowTex = createContactShadowTexture();

    // Extended Sunlit Meadow Terrain
    const groundMat = new THREE.MeshStandardMaterial({
      map: grassTex,
      roughness: 0.92,
      metalness: 0.0,
    });
    const ground = new THREE.Mesh(new THREE.CircleGeometry(110, 48), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Rolling peripheral hills outside playable perimeter
    const hillMat = new THREE.MeshStandardMaterial({ color: 0x629944, roughness: 0.95 });
    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 2 + 0.2;
      const dist = 46 + (i % 3) * 11;
      const radius = 12 + (i % 4) * 4;
      const hill = new THREE.Mesh(new THREE.SphereGeometry(radius, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), hillMat);
      hill.scale.set(1.4, 0.35 + (i % 3) * 0.12, 1.2);
      hill.position.set(Math.cos(angle) * dist, -0.3, Math.sin(angle) * dist);
      hill.receiveShadow = true;
      scene.add(hill);
    }

    // Cobblestone Plaza & Radial Footpaths (offset Y >= 0.02 + polygonOffset to avoid Z-fighting)
    const cobbleMat = new THREE.MeshStandardMaterial({
      map: cobbleTex,
      roughness: 0.84,
      metalness: 0.04,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const plaza = new THREE.Mesh(new THREE.CircleGeometry(9.2, 36), cobbleMat);
    plaza.rotation.x = -Math.PI / 2;
    plaza.position.y = 0.025;
    plaza.receiveShadow = true;
    scene.add(plaza);

    const createPathStrip = (x: number, z: number, w: number, len: number, rotY: number) => {
      const stripTex = cobbleTex.clone();
      stripTex.repeat.set(Math.max(1, w / 2.5), Math.max(1, len / 2.5));
      stripTex.needsUpdate = true;
      const mat = new THREE.MeshStandardMaterial({
        map: stripTex,
        roughness: 0.85,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, len), mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.rotation.z = rotY;
      mesh.position.set(x, 0.02, z);
      mesh.receiveShadow = true;
      scene.add(mesh);
    };

    createPathStrip(0, 0, 3.2, 42, 0); // North-South Main Avenue
    createPathStrip(0, 0, 34, 3.2, 0); // East-West Avenue
    createPathStrip(-11, -11, 2.4, 16, Math.PI / 4); // Windmill Path
    createPathStrip(11, -11, 2.4, 16, -Math.PI / 4); // Observatory Path

    // Collision Lists
    const circleColliders: CircleCollider[] = [];
    const boxColliders: BoxCollider[] = [];

    // Central Fountain
    const { group: fountainGroup, waterMesh } = createFountain();
    fountainGroup.position.set(0, 0, 0);
    scene.add(fountainGroup);
    circleColliders.push({ x: 0, z: 0, r: 2.65 });

    // Town Hall (North Plaza)
    const townHall = createTownHall(blueRoofTex, clockTex);
    townHall.position.set(0, 0, -18.5);
    scene.add(townHall);
    boxColliders.push({ minX: -4.4, maxX: 4.4, minZ: -21.8, maxZ: -15.2 });

    // Bakery (Northwest)
    const bakery = createVillageCottage({
      width: 6.2,
      depth: 4.8,
      wallHeight: 3.1,
      wallColor: 0xfff7ed,
      roofTexture: redRoofTex,
      roofColor: 0xea580c,
      trimColor: 0x78350f,
      doorColor: 0x92400e,
      hasAwning: true,
      awningColor: 0xef4444,
    });
    bakery.position.set(-16.5, 0, -9);
    bakery.rotation.y = Math.PI / 3;
    scene.add(bakery);
    circleColliders.push({ x: -16.5, z: -9, r: 3.8 });

    // Flower Shop (Northeast)
    const flowerShop = createVillageCottage({
      width: 6.0,
      depth: 4.6,
      wallHeight: 3.0,
      wallColor: 0xfdf2f8,
      roofTexture: tealRoofTex,
      roofColor: 0x0d9488,
      trimColor: 0x78350f,
      doorColor: 0x0f766e,
      hasAwning: true,
      awningColor: 0xec4899,
    });
    flowerShop.position.set(16.5, 0, -9);
    flowerShop.rotation.y = -Math.PI / 3;
    scene.add(flowerShop);
    circleColliders.push({ x: 16.5, z: -9, r: 3.7 });

    // Library (Southwest)
    const library = createVillageCottage({
      width: 6.6,
      depth: 5.0,
      wallHeight: 3.3,
      wallColor: 0xf0fdfa,
      roofTexture: blueRoofTex,
      roofColor: 0x2563eb,
      trimColor: 0x451a03,
      doorColor: 0x1e3a8a,
      hasAwning: false,
    });
    library.position.set(-17, 0, 9.2);
    library.rotation.y = Math.PI / 2.2;
    scene.add(library);
    circleColliders.push({ x: -17, z: 9.2, r: 3.9 });

    // Carpenter Workshop (Southeast)
    const workshop = createVillageCottage({
      width: 6.4,
      depth: 4.8,
      wallHeight: 3.1,
      wallColor: 0xfefce8,
      roofTexture: redRoofTex,
      roofColor: 0xb45309,
      trimColor: 0x451a03,
      doorColor: 0x78350f,
      hasAwning: true,
      awningColor: 0xd97706,
    });
    workshop.position.set(17, 0, 9.2);
    workshop.rotation.y = -Math.PI / 2.2;
    scene.add(workshop);
    circleColliders.push({ x: 17, z: 9.2, r: 3.9 });

    // Windmill (Far Northwest Hill)
    const { group: windmillGroup, sailRotor } = createWindmill(redRoofTex);
    windmillGroup.position.set(-20.5, 0, -21);
    windmillGroup.rotation.y = Math.PI / 4;
    scene.add(windmillGroup);
    circleColliders.push({ x: -20.5, z: -21, r: 2.9 });

    // Observatory Pavilion (Far Northeast)
    const observatory = createVillageCottage({
      width: 5.2,
      depth: 4.6,
      wallHeight: 3.2,
      wallColor: 0xeef2ff,
      roofTexture: blueRoofTex,
      roofColor: 0x4338ca,
      trimColor: 0x1e1b4b,
      doorColor: 0x312e81,
    });
    observatory.position.set(19.5, 0, -20.5);
    observatory.rotation.y = -Math.PI / 4;
    scene.add(observatory);
    circleColliders.push({ x: 19.5, z: -20.5, r: 3.5 });

    // Street Lamps, Benches, Flower Beds
    const lampPositions: [number, number][] = [
      [-6.5, -5.5],
      [6.5, -5.5],
      [-6.5, 6.2],
      [6.5, 6.2],
      [-3.2, 14.5],
      [3.2, 14.5],
      [-3.5, -13.5],
      [3.5, -13.5],
    ];
    lampPositions.forEach(([lx, lz]) => {
      const lamp = createStreetLamp();
      lamp.position.set(lx, 0, lz);
      scene.add(lamp);
      circleColliders.push({ x: lx, z: lz, r: 0.4 });
    });

    const benchCoords: [number, number, number][] = [
      [0, -6.5, 0],
      [6.5, 0, -Math.PI / 2],
      [-6.5, 0, Math.PI / 2],
    ];
    benchCoords.forEach(([bx, bz, rot]) => {
      const bench = createBench(woodTex);
      bench.position.set(bx, 0, bz);
      bench.rotation.y = rot;
      scene.add(bench);
      circleColliders.push({ x: bx, z: bz, r: 0.9 });
    });

    const flowerBeds: [number, number, number, number][] = [
      [-8.5, -2.5, 0, 0xf43f5e],
      [8.5, -2.5, 0, 0xfbbf24],
      [-8.5, 2.5, 0, 0xa855f7],
      [8.5, 2.5, 0, 0xf97316],
      [-4.2, 18.2, 0, 0xec4899],
      [4.2, 18.2, 0, 0x38bdf8],
    ];
    flowerBeds.forEach(([fx, fz, rot, col]) => {
      const bed = createFlowerBed(col);
      bed.position.set(fx, 0, fz);
      bed.rotation.y = rot;
      scene.add(bed);
    });

    // Instanced Trees around village perimeter & outer meadow
    const treeCount = 72;
    const trunkGeo = new THREE.CylinderGeometry(0.24, 0.36, 1.8, 8);
    trunkGeo.translate(0, 0.9, 0);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7c4a25, roughness: 0.9 });
    const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
    trunkInst.castShadow = !isSoftwareGl;
    trunkInst.receiveShadow = true;

    const crownLowerGeo = new THREE.ConeGeometry(1.55, 2.6, 8);
    crownLowerGeo.translate(0, 2.7, 0);
    const crownUpperGeo = new THREE.ConeGeometry(1.15, 2.2, 8);
    crownUpperGeo.translate(0, 4.1, 0);
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 });
    const crownLowerInst = new THREE.InstancedMesh(crownLowerGeo, foliageMat, treeCount);
    const crownUpperInst = new THREE.InstancedMesh(crownUpperGeo, foliageMat, treeCount);
    crownLowerInst.castShadow = !isSoftwareGl;
    crownUpperInst.castShadow = !isSoftwareGl;

    const greenPalette = [0x2e7d32, 0x388e3c, 0x43a047, 0x2b6cb0, 0x3b7a57];
    for (let i = 0; i < treeCount; i++) {
      const ring = i < 34 ? 0 : 1;
      const ringIdx = ring === 0 ? i : i - 34;
      const ringTotal = ring === 0 ? 34 : treeCount - 34;
      const angle = (ringIdx / ringTotal) * Math.PI * 2 + (ring * 0.14);
      const radius = ring === 0 ? 29.5 + (i % 3) * 1.4 : 38 + (i % 5) * 4.2;

      const tx = Math.cos(angle) * radius;
      const tz = Math.sin(angle) * radius;
      const scale = 0.85 + ((i * 37) % 30) / 100; // ±15% variation

      _dummyObj.position.set(tx, 0, tz);
      _dummyObj.rotation.set(0, (i * 1.1) % (Math.PI * 2), 0);
      _dummyObj.scale.set(scale, scale, scale);
      _dummyObj.updateMatrix();

      trunkInst.setMatrixAt(i, _dummyObj.matrix);
      crownLowerInst.setMatrixAt(i, _dummyObj.matrix);
      crownUpperInst.setMatrixAt(i, _dummyObj.matrix);

      _tintColor.setHex(greenPalette[i % greenPalette.length]);
      crownLowerInst.setColorAt(i, _tintColor);
      _tintColor.offsetHSL(0, 0, 0.05);
      crownUpperInst.setColorAt(i, _tintColor);
    }
    trunkInst.instanceMatrix.needsUpdate = true;
    crownLowerInst.instanceMatrix.needsUpdate = true;
    crownUpperInst.instanceMatrix.needsUpdate = true;
    if (crownLowerInst.instanceColor) crownLowerInst.instanceColor.needsUpdate = true;
    if (crownUpperInst.instanceColor) crownUpperInst.instanceColor.needsUpdate = true;
    trunkInst.computeBoundingSphere();
    crownLowerInst.computeBoundingSphere();
    crownUpperInst.computeBoundingSphere();
    scene.add(trunkInst, crownLowerInst, crownUpperInst);

    // Instanced Wooden Perimeter Fence Posts (radius 27.8m, open south gate)
    const fencePostCount = 48;
    const postGeo = new THREE.BoxGeometry(0.24, 1.05, 0.24);
    postGeo.translate(0, 0.525, 0);
    const postMat = new THREE.MeshStandardMaterial({ color: 0xa16207, roughness: 0.8 });
    const fenceInst = new THREE.InstancedMesh(postGeo, postMat, fencePostCount);
    fenceInst.castShadow = !isSoftwareGl;
    for (let i = 0; i < fencePostCount; i++) {
      const ang = (i / fencePostCount) * Math.PI * 2;
      _dummyObj.position.set(Math.cos(ang) * 27.8, 0, Math.sin(ang) * 27.8);
      _dummyObj.rotation.set(0, -ang, 0);
      _dummyObj.scale.set(1, 1, 1);
      _dummyObj.updateMatrix();
      fenceInst.setMatrixAt(i, _dummyObj.matrix);
    }
    fenceInst.instanceMatrix.needsUpdate = true;
    fenceInst.computeBoundingSphere();
    scene.add(fenceInst);

    // Ambient floating sunlit petals (subtle 3D life)
    const petalCount = 45;
    const petalGeo = new THREE.PlaneGeometry(0.14, 0.14);
    const petalMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
    });
    const petalInst = new THREE.InstancedMesh(petalGeo, petalMat, petalCount);
    petalInst.frustumCulled = false;
    const petalSeeds = Array.from({ length: petalCount }, (_, idx) => ({
      x: Math.sin(idx * 9.3) * 22,
      y: 1.5 + (idx % 6) * 0.9,
      z: Math.cos(idx * 4.7) * 22,
      speed: 0.4 + (idx % 5) * 0.12,
      phase: idx * 0.7,
    }));
    scene.add(petalInst);

    // Build 10 NPCs
    const npcRigs: NpcRig[] = VILLAGE_NPCS.map((profile) => {
      const rig = createNpcCharacter(profile, shadowTex);
      scene.add(rig.group);
      circleColliders.push({ x: profile.position[0], z: profile.position[1], r: 0.75 });
      return rig;
    });
    npcRigsRef.current = npcRigs;

    // Build Student Character
    const student = createStudentCharacter(shadowTex);
    const playerState = {
      x: 0,
      z: 7.2,
      yaw: 0, // 0 means facing -Z (North toward fountain)
      walkCycle: 0,
      moveBlend: 0,
      lastStepHalfCycle: 0,
    };
    student.group.position.set(playerState.x, 0, playerState.z);
    scene.add(student.group);

    resetPlayerFnRef.current = () => {
      playerState.x = 0;
      playerState.z = 7.2;
      playerState.yaw = 0;
      playerState.walkCycle = 0;
      playerState.moveBlend = 0;
      student.group.position.set(playerState.x, 0, playerState.z);
      student.group.rotation.y = playerState.yaw;
    };

    // Camera Orbit Controls State (mouse drag yaw)
    let camYaw = 0;
    let camPitch = 0.42;
    let isDragging = false;
    let lastPointerX = 0;
    let lastPointerY = 0;

    const handlePointerDown = (e: PointerEvent) => {
      if (gamePhaseRef.current !== 'playing') return;
      isDragging = true;
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
    };
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - lastPointerX;
      const dy = e.clientY - lastPointerY;
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
      camYaw -= dx * 0.006;
      camPitch = THREE.MathUtils.clamp(camPitch + dy * 0.004, 0.22, 0.85);
    };
    const handlePointerUp = () => {
      isDragging = false;
    };

    const domElem = renderer.domElement;
    domElem.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    // Keyboard Input State
    const keysPressed = new Set<string>();
    let currentNearestNpcId: string | null = null;
    let lastReportedKey = '';

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      if (e.code === 'Space' && gamePhaseRef.current === 'playing' && !pausedRef.current && currentNearestNpcId) {
        e.preventDefault();
        onTalkTriggerRef.current(currentNearestNpcId);
        return;
      }

      keysPressed.add(e.code);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.delete(e.code);
    };

    const handleBlur = () => {
      keysPressed.clear();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Pre-warm shaders on GPU
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Main Game Loop with Software WebGL pacing
    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;

    const resolveCollisions = (nx: number, nz: number): [number, number] => {
      let x = nx;
      let z = nz;
      const playerRadius = 0.45;

      // Perimeter fence clamp
      const maxR = 26.2;
      const distSq = x * x + z * z;
      if (distSq > maxR * maxR) {
        const dist = Math.sqrt(distSq);
        x = (x / dist) * maxR;
        z = (z / dist) * maxR;
      }

      // Circle colliders (fountain, round cottages, lamps, benches, NPCs)
      for (let i = 0; i < circleColliders.length; i++) {
        const c = circleColliders[i];
        const dx = x - c.x;
        const dz = z - c.z;
        const minDist = c.r + playerRadius;
        const d2 = dx * dx + dz * dz;
        if (d2 < minDist * minDist) {
          const d = Math.sqrt(d2) || 0.001;
          x = c.x + (dx / d) * minDist;
          z = c.z + (dz / d) * minDist;
        }
      }

      // AABB colliders (Town Hall)
      for (let i = 0; i < boxColliders.length; i++) {
        const b = boxColliders[i];
        const closestX = THREE.MathUtils.clamp(x, b.minX, b.maxX);
        const closestZ = THREE.MathUtils.clamp(z, b.minZ, b.maxZ);
        const dx = x - closestX;
        const dz = z - closestZ;
        const d2 = dx * dx + dz * dz;
        if (d2 < playerRadius * playerRadius) {
          const d = Math.sqrt(d2) || 0.001;
          x = closestX + (dx / d) * playerRadius;
          z = closestZ + (dz / d) * playerRadius;
        }
      }

      return [x, z];
    };

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    };

    const tick = () => {
      if (disposed) return;

      const delta = Math.min(clock.getDelta(), 0.08);
      const elapsed = clock.getElapsedTime();
      const phase = gamePhaseRef.current;

      // Ambient world animations (windmill sails, fountain shimmer, petals)
      sailRotor.rotation.z = -elapsed * 0.55;
      waterMesh.position.y = 0.61 + Math.sin(elapsed * 2.4) * 0.015;

      for (let i = 0; i < petalCount; i++) {
        const p = petalSeeds[i];
        const py = ((p.y - elapsed * p.speed) % 4.5 + 4.5) % 4.5 + 0.4;
        const px = p.x + Math.sin(elapsed * 0.8 + p.phase) * 0.9;
        const pz = p.z + Math.cos(elapsed * 0.7 + p.phase) * 0.9;
        _dummyObj.position.set(px, py, pz);
        _dummyObj.rotation.set(elapsed + p.phase, elapsed * 0.6, p.phase);
        _dummyObj.scale.set(1, 1, 1);
        _dummyObj.updateMatrix();
        petalInst.setMatrixAt(i, _dummyObj.matrix);
      }
      petalInst.instanceMatrix.needsUpdate = true;

      // Player Movement & Limb Kinematics
      let isMoving = false;
      if (phase === 'playing' && !pausedRef.current) {
        let inputX = virtualMoveRef.current.x;
        let inputZ = virtualMoveRef.current.z;

        if (keysPressed.has('KeyW') || keysPressed.has('ArrowUp')) inputZ -= 1;
        if (keysPressed.has('KeyS') || keysPressed.has('ArrowDown')) inputZ += 1;
        if (keysPressed.has('KeyA') || keysPressed.has('ArrowLeft')) inputX -= 1;
        if (keysPressed.has('KeyD') || keysPressed.has('ArrowRight')) inputX += 1;

        if (inputX !== 0 || inputZ !== 0) {
          isMoving = true;
          const len = Math.hypot(inputX, inputZ);
          const nx = inputX / len;
          const nz = inputZ / len;

          // Rotate input relative to camera yaw
          const cosY = Math.cos(camYaw);
          const sinY = Math.sin(camYaw);
          _moveVec.set(nx * cosY + nz * sinY, 0, -nx * sinY + nz * cosY);

          const moveSpeed = 6.2;
          const nextX = playerState.x + _moveVec.x * moveSpeed * delta;
          const nextZ = playerState.z + _moveVec.z * moveSpeed * delta;
          const [resolvedX, resolvedZ] = resolveCollisions(nextX, nextZ);

          playerState.x = resolvedX;
          playerState.z = resolvedZ;

          // Student faces movement direction (character local front is -Z)
          const targetYaw = Math.atan2(-_moveVec.x, -_moveVec.z);
          const diff = shortestAngleDiff(playerState.yaw, targetYaw);
          playerState.yaw += diff * (1 - Math.exp(-14 * delta));
        }
      }

      // Smoothly blend walking stride vs idle stance
      playerState.moveBlend = THREE.MathUtils.damp(playerState.moveBlend, isMoving ? 1 : 0, 12, delta);
      if (isMoving) {
        playerState.walkCycle += delta * 9.5;
        const halfCycle = Math.floor(playerState.walkCycle / Math.PI);
        if (halfCycle !== playerState.lastStepHalfCycle) {
          playerState.lastStepHalfCycle = halfCycle;
          soundEngine.playStep();
        }
      }

      const swing = Math.sin(playerState.walkCycle) * playerState.moveBlend;
      const bounce = Math.abs(Math.sin(playerState.walkCycle)) * playerState.moveBlend;

      student.group.position.set(playerState.x, 0, playerState.z);
      student.group.rotation.y = playerState.yaw;

      // Natural arm and leg opposite-phase swinging
      student.leftLegPivot.rotation.x = swing * 0.7;
      student.rightLegPivot.rotation.x = -swing * 0.7;
      student.leftArmPivot.rotation.x = -swing * 0.6;
      student.rightArmPivot.rotation.x = swing * 0.6;
      student.leftArmPivot.rotation.z = 0.08;
      student.rightArmPivot.rotation.z = -0.08;

      student.bodyGroup.position.y = 0.72 + bounce * 0.055;
      student.bodyGroup.rotation.x = -playerState.moveBlend * 0.08;
      student.headGroup.rotation.y = Math.sin(elapsed * 1.1) * 0.04 * (1 - playerState.moveBlend);

      // Update NPCs idle motion, turn toward nearby player, and check proximity
      let nearestRig: NpcRig | null = null;
      let nearestDist = Infinity;

      for (let i = 0; i < npcRigs.length; i++) {
        const rig = npcRigs[i];
        const dx = playerState.x - rig.profile.position[0];
        const dz = playerState.z - rig.profile.position[1];
        const dist = Math.hypot(dx, dz);

        // Floating gem bob & spin
        rig.markerMesh.position.y = 2.45 + Math.sin(elapsed * 2.5 + i) * 0.1;
        rig.markerMesh.rotation.y = elapsed * 1.6 + i;

        // Subtle idle breathing
        rig.bodyGroup.position.y = 0.7 + Math.sin(elapsed * 2 + i * 1.3) * 0.02;
        rig.leftArmPivot.rotation.x = Math.sin(elapsed * 1.4 + i) * 0.06;
        rig.rightArmPivot.rotation.x = -Math.sin(elapsed * 1.4 + i) * 0.06;

        // Turn NPC smoothly toward student when nearby (NPC local front is +Z)
        const targetNpcYaw =
          dist < 5.0 ? Math.atan2(dx, dz) : rig.profile.facingAngle;
        rig.group.rotation.y += shortestAngleDiff(rig.group.rotation.y, targetNpcYaw) * (1 - Math.exp(-6 * delta));

        if (dist < 3.25 && dist < nearestDist) {
          nearestDist = dist;
          nearestRig = rig;
        }
      }

      if (phase === 'playing' && nearestRig) {
        currentNearestNpcId = nearestRig.profile.id;
        const solved = solvedSetRef.current.has(nearestRig.profile.id);
        const key = `${nearestRig.profile.id}:${solved}`;
        if (key !== lastReportedKey) {
          lastReportedKey = key;
          onProximityChangeRef.current({
            npcId: nearestRig.profile.id,
            npcName: nearestRig.profile.name,
            npcRole: nearestRig.profile.role,
            solved,
            distance: nearestDist,
          });
        }
      } else {
        currentNearestNpcId = null;
        if (lastReportedKey !== '') {
          lastReportedKey = '';
          onProximityChangeRef.current(null);
        }
      }

      // Camera Choreography
      if (phase === 'start') {
        const orbitAngle = elapsed * 0.14;
        _camDesired.set(Math.sin(orbitAngle) * 19, 10.5, Math.cos(orbitAngle) * 19);
        camera.position.lerp(_camDesired, 1 - Math.exp(-3 * delta));
        _camLookTarget.set(0, 1.8, -2);
        camera.lookAt(_camLookTarget);
      } else {
        const camDist = 9.2;
        const horizDist = camDist * Math.cos(camPitch);
        const vertHeight = camDist * Math.sin(camPitch) + 1.4;
        _camDesired.set(
          playerState.x + Math.sin(camYaw) * horizDist,
          vertHeight,
          playerState.z + Math.cos(camYaw) * horizDist
        );

        camera.position.x = THREE.MathUtils.damp(camera.position.x, _camDesired.x, 8, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _camDesired.y, 8, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _camDesired.z, 8, delta);

        _camLookTarget.set(playerState.x, 1.45, playerState.z);
        camera.lookAt(_camLookTarget);
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);

      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      domElem.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('resize', handleResize);

      envTex.dispose();
      grassTex.dispose();
      cobbleTex.dispose();
      redRoofTex.dispose();
      blueRoofTex.dispose();
      tealRoofTex.dispose();
      woodTex.dispose();
      clockTex.dispose();
      shadowTex.dispose();

      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.InstancedMesh) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material?.dispose();
          }
        } else if (obj instanceof THREE.Sprite) {
          obj.material.map?.dispose();
          obj.material.dispose();
        }
      });

      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [virtualMoveRef]);

  return <div ref={mountRef} className="fixed inset-0 w-full h-full cursor-grab active:cursor-grabbing" />;
}
