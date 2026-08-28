"use client";

import { memo, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
// Imports nombrados en vez de `import * as THREE` — permite que el
// tree-shaking del bundler descarte cualquier símbolo de three.js que no
// se use aquí, en lugar de retener el módulo completo como un solo objeto.
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  type Group,
  IcosahedronGeometry,
  Line,
  LineBasicMaterial,
  MathUtils,
  type Mesh,
  MeshBasicMaterial,
  NormalBlending,
  PointsMaterial,
  ShaderMaterial,
  SphereGeometry,
  type Sprite,
  SpriteMaterial,
  type Texture,
  Vector3,
} from "three";
import { cn } from "@/lib/utils";

export type VeraCoreState = "idle" | "listening" | "thinking" | "speaking";

interface VeraCoreProps {
  state: VeraCoreState;
  /** Nivel del micrófono ("listening") o de la voz de V.E.R.A ("speaking"
   *  con `realAmplitudeSpeaking`), de 0 a 1. */
  amplitude?: number;
  /** Cuando el estado es "speaking", indica si `amplitude` proviene de
   *  audio real (voz neuronal) en lugar del pulso sintético por defecto. */
  realAmplitudeSpeaking?: boolean;
  className?: string;
}

// ---------------------------------------------------------------------------
// Tuning
// ---------------------------------------------------------------------------
const NODE_COUNT = 130;
const NEIGHBORS_PER_NODE = 3;
const SPHERE_RADIUS = 1.3;
const PULSE_COUNT = 26;
const ARC_POOL_SIZE = 5;
const ARC_SEGMENTS = 5;

const WARM_A = new Color("#ff6a00");
const WARM_B = new Color("#ffaa00");
const COOL_A = new Color("#00f0ff");
const COOL_B = new Color("#0066ff");
const WHITE = new Color("#ffffff");

// Configuración de Canvas hoisteada a constantes de módulo: si viviera como
// objeto literal inline en el JSX, VeraCore crearía una instancia nueva de
// `camera`/`gl` en cada re-render (cada tick de amplitud mientras escucha o
// habla), lo que no aporta nada — la cámara y el renderer solo se
// configuran una vez al montar el Canvas.
const CAMERA_CONFIG = { position: [0, 0, 4.2] as [number, number, number], fov: 40 };
// antialias:false — el resplandor aditivo y las texturas de sprite ya
// suavizan los bordes de nodos/pulsos, y las líneas/el shell no tienen
// siluetas duras que dependan de MSAA; desactivarlo ahorra el coste del
// multisampling en cada frame sin pérdida visible.
const GL_CONFIG = { antialias: false, alpha: true, powerPreference: "high-performance" as const };

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

/** Distribuye puntos uniformemente sobre una esfera (espiral de Fibonacci). */
function fibonacciSphere(count: number, radius: number): Vector3[] {
  const points: Vector3[] = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = goldenAngle * i;
    points.push(new Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r).multiplyScalar(radius));
  }
  return points;
}

/** Conecta cada nodo con sus K vecinos más cercanos (deduplicado). */
function buildEdges(points: Vector3[], k: number): [number, number][] {
  const seen = new Set<string>();
  const edges: [number, number][] = [];
  for (let i = 0; i < points.length; i++) {
    const distances: { j: number; d: number }[] = [];
    for (let j = 0; j < points.length; j++) {
      if (i === j) continue;
      distances.push({ j, d: points[i].distanceToSquared(points[j]) });
    }
    distances.sort((a, b) => a.d - b.d);
    for (let n = 0; n < k && n < distances.length; n++) {
      const j = distances[n].j;
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (!seen.has(key)) {
        seen.add(key);
        edges.push(i < j ? [i, j] : [j, i]);
      }
    }
  }
  return edges;
}

/** Color bicolor "plasma": naranja cálido en un hemisferio, cian eléctrico
 *  en el opuesto, con una transición suave (no un corte plano) y algo de
 *  variación interna en cada lado para que no se vea como un degradado liso. */
function colorForPosition(p: Vector3): Color {
  const t = p.x / SPHERE_RADIUS;
  const mix = MathUtils.smoothstep(t, -0.3, 0.3);
  const warm = WARM_A.clone().lerp(WARM_B, (p.y / SPHERE_RADIUS + 1) / 2);
  const cool = COOL_A.clone().lerp(COOL_B, (p.z / SPHERE_RADIUS + 1) / 2);
  return warm.lerp(cool, mix);
}

/** Escribe un punto aleatorio sobre la esfera en `out` (sin allocar). */
function randomPointOnSphere(radius: number, out: Vector3): Vector3 {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  return out.set(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.sin(phi) * Math.sin(theta),
    radius * Math.cos(phi)
  );
}

/** Genera un camino en zigzag entre dos puntos casi antipodales, simulando
 *  un rayo de plasma que cruza el interior de la esfera. Recibe vectores
 *  "scratch" reutilizables (`a`, `b`, `jitter`) para no allocar nada nuevo
 *  cada vez que se dispara un rayo. */
function generateLightningPath(target: Float32Array, a: Vector3, b: Vector3, jitter: Vector3): void {
  randomPointOnSphere(SPHERE_RADIUS, a);
  randomPointOnSphere(SPHERE_RADIUS * 0.25, b);
  b.add(a.clone().multiplyScalar(-1));
  for (let s = 0; s <= ARC_SEGMENTS; s++) {
    const t = s / ARC_SEGMENTS;
    const px = a.x + (b.x - a.x) * t;
    const py = a.y + (b.y - a.y) * t;
    const pz = a.z + (b.z - a.z) * t;
    if (s === 0 || s === ARC_SEGMENTS) {
      target[s * 3] = px;
      target[s * 3 + 1] = py;
      target[s * 3 + 2] = pz;
    } else {
      jitter
        .set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
        .multiplyScalar(SPHERE_RADIUS * 0.22);
      target[s * 3] = px + jitter.x;
      target[s * 3 + 1] = py + jitter.y;
      target[s * 3 + 2] = pz + jitter.z;
    }
  }
}

/** Textura de resplandor suave (gradiente radial) para los sprites de
 *  puntos, compartida entre instancias — nunca se libera, es minúscula y
 *  vive lo que dure la pestaña. */
let sharedGlowTexture: Texture | null = null;
function getGlowTexture(): Texture {
  if (sharedGlowTexture) return sharedGlowTexture;
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.35, "rgba(255,255,255,0.65)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }
  const texture = new CanvasTexture(canvas);
  texture.needsUpdate = true;
  sharedGlowTexture = texture;
  return texture;
}

// ---------------------------------------------------------------------------
// Escena
// ---------------------------------------------------------------------------

interface Pulse {
  edge: number;
  t: number;
  speed: number;
}

interface Arc {
  geometry: BufferGeometry;
  material: LineBasicMaterial;
  /** El objeto Line se renderiza vía <primitive> — la JSX intrínseca
   *  <line> de r3f colisiona con el <line> SVG de React DOM. */
  lineObject: Line;
  positions: Float32Array;
  life: number;
  maxLife: number;
  cooldown: number;
}

/** Parámetros de animación derivados del estado, reutilizados frame a
 *  frame: `computeTargetParams` escribe sobre este objeto en vez de que
 *  cada llamada devuelva uno nuevo (evita una allocación de objeto en
 *  cada tick de useFrame, 60 veces por segundo). */
interface TargetParams {
  rotationSpeed: number;
  scale: number;
  pulseSpeed: number;
  brightness: number;
  lineOpacity: number;
  arcChance: number;
  vibration: number;
}

function computeTargetParams(state: VeraCoreState, level: number, time: number, out: TargetParams): void {
  switch (state) {
    case "listening":
      out.rotationSpeed = 0.07;
      out.scale = 1 + level * 0.06;
      out.pulseSpeed = 0.5 + level * 0.7;
      out.brightness = 1 + level * 0.6;
      out.lineOpacity = 0.5 + level * 0.25;
      out.arcChance = 0.15 + level * 0.35;
      out.vibration = level;
      return;
    case "thinking":
      out.rotationSpeed = 0.9;
      out.scale = 0.88;
      out.pulseSpeed = 2.3;
      out.brightness = 1.9;
      out.lineOpacity = 0.7;
      out.arcChance = 0.6;
      out.vibration = 0;
      return;
    case "speaking": {
      const synthLevel = 0.5 + 0.5 * Math.abs(Math.sin(time * 6.2));
      const l = level > 0 ? level : synthLevel;
      out.rotationSpeed = 0.16;
      out.scale = 1 + l * 0.1;
      out.pulseSpeed = 1.3 + l * 1.3;
      out.brightness = 1.35 + l * 0.85;
      out.lineOpacity = 0.6 + l * 0.25;
      out.arcChance = 0.35 + l * 0.35;
      out.vibration = 0;
      return;
    }
    default:
      out.rotationSpeed = 0.045;
      out.scale = 1;
      out.pulseSpeed = 0.35;
      out.brightness = 1;
      out.lineOpacity = 0.42;
      out.arcChance = 0.12;
      out.vibration = 0;
  }
}

function buildScene() {
  const basePoints = fibonacciSphere(NODE_COUNT, SPHERE_RADIUS);
  const edgePairs = buildEdges(basePoints, NEIGHBORS_PER_NODE);
  const nodeColors = basePoints.map(colorForPosition);

  // --- nodos (puntos sinápticos) ---
  const nodesPositionArray = new Float32Array(NODE_COUNT * 3);
  const nodesBasePositions = new Float32Array(NODE_COUNT * 3);
  const nodesColorArray = new Float32Array(NODE_COUNT * 3);
  const nodesNoisePhases = new Float32Array(NODE_COUNT);
  basePoints.forEach((p, i) => {
    nodesPositionArray.set([p.x, p.y, p.z], i * 3);
    nodesBasePositions.set([p.x, p.y, p.z], i * 3);
    const c = nodeColors[i];
    nodesColorArray.set([c.r, c.g, c.b], i * 3);
    nodesNoisePhases[i] = Math.random() * Math.PI * 2;
  });

  const nodesGeometry = new BufferGeometry();
  nodesGeometry.setAttribute("position", new BufferAttribute(nodesPositionArray, 3));
  nodesGeometry.setAttribute("color", new BufferAttribute(nodesColorArray, 3));

  const nodesMaterial = new PointsMaterial({
    size: 0.045,
    map: getGlowTexture(),
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    sizeAttenuation: true,
    blending: AdditiveBlending,
  });

  // --- filamentos (conexiones sinápticas) ---
  const linesPositionArray = new Float32Array(edgePairs.length * 6);
  const linesColorArray = new Float32Array(edgePairs.length * 6);
  edgePairs.forEach(([a, b], idx) => {
    const pa = basePoints[a];
    const pb = basePoints[b];
    linesPositionArray.set([pa.x, pa.y, pa.z, pb.x, pb.y, pb.z], idx * 6);
    const ca = nodeColors[a];
    const cb = nodeColors[b];
    linesColorArray.set([ca.r, ca.g, ca.b, cb.r, cb.g, cb.b], idx * 6);
  });

  const linesGeometry = new BufferGeometry();
  linesGeometry.setAttribute("position", new BufferAttribute(linesPositionArray, 3));
  linesGeometry.setAttribute("color", new BufferAttribute(linesColorArray, 3));

  const linesMaterial = new LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.45,
    blending: AdditiveBlending,
    depthWrite: false,
  });

  // --- pulsos de energía viajando por los filamentos ---
  const pulsesPositionArray = new Float32Array(PULSE_COUNT * 3);
  const pulsesColorArray = new Float32Array(PULSE_COUNT * 3);
  const pulses: Pulse[] = [];
  const scratchColor = new Color();
  for (let i = 0; i < PULSE_COUNT; i++) {
    const edge = Math.floor(Math.random() * edgePairs.length);
    pulses.push({ edge, t: Math.random(), speed: 0.35 + Math.random() * 0.3 });
    const [a, b] = edgePairs[edge];
    scratchColor.copy(nodeColors[a]).lerp(nodeColors[b], 0.5).lerp(WHITE, 0.35);
    pulsesColorArray.set([scratchColor.r, scratchColor.g, scratchColor.b], i * 3);
  }

  const pulsesGeometry = new BufferGeometry();
  pulsesGeometry.setAttribute("position", new BufferAttribute(pulsesPositionArray, 3));
  pulsesGeometry.setAttribute("color", new BufferAttribute(pulsesColorArray, 3));

  const pulsesMaterial = new PointsMaterial({
    size: 0.07,
    map: getGlowTexture(),
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    sizeAttenuation: true,
    blending: AdditiveBlending,
  });

  // --- rayos ocasionales que cruzan la esfera ---
  const arcs: Arc[] = Array.from({ length: ARC_POOL_SIZE }, () => {
    const positions = new Float32Array((ARC_SEGMENTS + 1) * 3);
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(positions, 3));
    const material = new LineBasicMaterial({
      color: "#ffffff",
      transparent: true,
      opacity: 0,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    const lineObject = new Line(geometry, material);
    return { geometry, material, lineObject, positions, life: 0, maxLife: 0, cooldown: Math.random() * 1.5 };
  });

  // --- cúpula de contención (Fresnel, efecto cristal/campo de fuerza) ---
  const shellGeometry = new SphereGeometry(SPHERE_RADIUS * 1.34, 48, 32);
  const shellMaterial = new ShaderMaterial({
    uniforms: {
      uColorA: { value: new Color("#00f0ff") },
      uColorB: { value: new Color("#ffffff") },
      uIntensity: { value: 0.6 },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewDir = normalize(-mvPosition.xyz);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      varying vec3 vViewDir;
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      uniform float uIntensity;
      void main() {
        // Con DoubleSide, la cara trasera de la esfera siempre mira "hacia
        // fuera" respecto a la cámara: sin invertir su normal, el fresnel
        // sale al máximo en todo el hemisferio lejano y empaña el centro
        // entero en vez de marcar solo el borde de silueta.
        vec3 normal = gl_FrontFacing ? normalize(vNormal) : -normalize(vNormal);
        float fresnel = pow(1.0 - max(dot(normal, normalize(vViewDir)), 0.0), 2.2);
        vec3 col = mix(uColorA, uColorB, fresnel * 0.6);
        gl_FragColor = vec4(col, fresnel * uIntensity);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    // Normal (no aditivo): es una cúpula de cristal que tiñe el borde, no
    // una fuente de luz — en aditivo, al cubrir toda la silueta de la
    // esfera, sobreexponía el resto de la escena y tapaba el bicolor.
    blending: NormalBlending,
  });

  // --- estructura exterior (wireframe, "estructura de contención") ---
  const wireGeometry = new IcosahedronGeometry(SPHERE_RADIUS * 1.55, 1);
  const wireMaterial = new MeshBasicMaterial({
    color: "#8fe9ff",
    wireframe: true,
    transparent: true,
    opacity: 0.09,
  });

  // --- núcleo de energía central ---
  const glowSpriteMaterial = new SpriteMaterial({
    map: getGlowTexture(),
    color: "#ffffff",
    transparent: true,
    depthWrite: false,
    opacity: 0.55,
    blending: AdditiveBlending,
  });

  return {
    edgePairs,
    nodeColors,
    nodesGeometry,
    nodesMaterial,
    nodesPositionArray,
    nodesBasePositions,
    nodesNoisePhases,
    linesGeometry,
    linesMaterial,
    pulses,
    pulsesGeometry,
    pulsesMaterial,
    pulsesPositionArray,
    pulsesColorArray,
    arcs,
    shellGeometry,
    shellMaterial,
    wireGeometry,
    wireMaterial,
    glowSpriteMaterial,
    // Objetos "scratch" reutilizados dentro de useFrame para no allocar
    // Vector3/Color nuevos en cada tick del bucle de render.
    scratchColor,
    scratchVectorA: new Vector3(),
    scratchVectorB: new Vector3(),
    scratchVectorJitter: new Vector3(),
    targetParams: {
      rotationSpeed: 0.045,
      scale: 1,
      pulseSpeed: 0.35,
      brightness: 1,
      lineOpacity: 0.42,
      arcChance: 0.12,
      vibration: 0,
    } as TargetParams,
  };
}

type SceneObjects = ReturnType<typeof buildScene>;

function disposeScene(scene: SceneObjects) {
  scene.nodesGeometry.dispose();
  scene.nodesMaterial.dispose();
  scene.linesGeometry.dispose();
  scene.linesMaterial.dispose();
  scene.pulsesGeometry.dispose();
  scene.pulsesMaterial.dispose();
  scene.arcs.forEach((arc) => {
    arc.geometry.dispose();
    arc.material.dispose();
  });
  scene.shellGeometry.dispose();
  scene.shellMaterial.dispose();
  scene.wireGeometry.dispose();
  scene.wireMaterial.dispose();
  scene.glowSpriteMaterial.dispose();
  // La textura de resplandor es compartida entre instancias — no se libera aquí.
}

const NeuralCore = memo(function NeuralCore({
  stateRef,
  amplitudeRef,
  realAmplitudeSpeakingRef,
}: {
  stateRef: RefObject<VeraCoreState>;
  amplitudeRef: RefObject<number>;
  realAmplitudeSpeakingRef: RefObject<boolean>;
}) {
  const scene = useMemo(() => buildScene(), []);
  const groupRef = useRef<Group>(null);
  const wireRef = useRef<Mesh>(null);
  const glowSpriteRef = useRef<Sprite>(null);
  const timeRef = useRef(0);
  const currentRef = useRef({ rotationSpeed: 0.045, scale: 1, pulseSpeed: 0.35, brightness: 1, lineOpacity: 0.42 });
  const nodesDisplacedRef = useRef(false);

  useEffect(() => {
    return () => disposeScene(scene);
  }, [scene]);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 1 / 30);
    timeRef.current += delta;
    const t = timeRef.current;

    const state = stateRef.current ?? "idle";
    const level = Math.min(Math.max(amplitudeRef.current ?? 0, 0), 1);
    // Se escribe sobre el mismo objeto en cada frame — sin allocar.
    const target = scene.targetParams;
    computeTargetParams(state, level, t, target);
    const damp = Math.min(delta * 5, 1);
    const c = currentRef.current;
    c.rotationSpeed += (target.rotationSpeed - c.rotationSpeed) * damp;
    c.scale += (target.scale - c.scale) * damp;
    c.pulseSpeed += (target.pulseSpeed - c.pulseSpeed) * damp;
    c.brightness += (target.brightness - c.brightness) * damp;
    c.lineOpacity += (target.lineOpacity - c.lineOpacity) * damp;

    // Rotación orgánica: giro continuo + leve bamboleo.
    if (groupRef.current) {
      groupRef.current.rotation.y += c.rotationSpeed * delta;
      groupRef.current.rotation.x = Math.sin(t * 0.35) * 0.06;
      groupRef.current.scale.setScalar(c.scale);
    }
    if (wireRef.current) {
      wireRef.current.rotation.y -= delta * 0.025;
      wireRef.current.rotation.x += delta * 0.012;
    }

    // Brillo general: al ser vertexColors, el color del material actúa
    // como multiplicador — subirlo por encima de blanco (1,1,1) sobre-
    // ilumina la geometría, dando el efecto de intensidad de plasma.
    scene.nodesMaterial.color.setScalar(c.brightness);
    scene.linesMaterial.color.setScalar(c.brightness);
    scene.linesMaterial.opacity = c.lineOpacity;
    scene.pulsesMaterial.color.setScalar(c.brightness * (state === "thinking" ? 1.3 : 1));

    // Vibración de los nodos mientras escucha, proporcional al volumen real.
    if (state === "listening" && target.vibration > 0.02) {
      const arr = scene.nodesPositionArray;
      const base = scene.nodesBasePositions;
      for (let i = 0; i < NODE_COUNT; i++) {
        const phase = scene.nodesNoisePhases[i];
        const disp = 1 + Math.sin(t * 9 + phase) * target.vibration * 0.07;
        arr[i * 3] = base[i * 3] * disp;
        arr[i * 3 + 1] = base[i * 3 + 1] * disp;
        arr[i * 3 + 2] = base[i * 3 + 2] * disp;
      }
      scene.nodesGeometry.attributes.position.needsUpdate = true;
      nodesDisplacedRef.current = true;
    } else if (nodesDisplacedRef.current) {
      scene.nodesPositionArray.set(scene.nodesBasePositions);
      scene.nodesGeometry.attributes.position.needsUpdate = true;
      nodesDisplacedRef.current = false;
    }

    // Pulsos de energía viajando por las conexiones sinápticas.
    const edgeCount = scene.edgePairs.length;
    scene.pulses.forEach((pulse, i) => {
      pulse.t += delta * pulse.speed * c.pulseSpeed;
      if (pulse.t >= 1) {
        pulse.t = 0;
        pulse.edge = Math.floor(Math.random() * edgeCount);
        pulse.speed = 0.35 + Math.random() * 0.3;
        const [a, b] = scene.edgePairs[pulse.edge];
        scene.scratchColor.copy(scene.nodeColors[a]).lerp(scene.nodeColors[b], 0.5).lerp(WHITE, 0.35);
        scene.pulsesColorArray.set([scene.scratchColor.r, scene.scratchColor.g, scene.scratchColor.b], i * 3);
        scene.pulsesGeometry.attributes.color.needsUpdate = true;
      }
      const [a, b] = scene.edgePairs[pulse.edge];
      const base = scene.nodesBasePositions;
      const ax = base[a * 3];
      const ay = base[a * 3 + 1];
      const az = base[a * 3 + 2];
      const bx = base[b * 3];
      const by = base[b * 3 + 1];
      const bz = base[b * 3 + 2];
      scene.pulsesPositionArray[i * 3] = ax + (bx - ax) * pulse.t;
      scene.pulsesPositionArray[i * 3 + 1] = ay + (by - ay) * pulse.t;
      scene.pulsesPositionArray[i * 3 + 2] = az + (bz - az) * pulse.t;
    });
    scene.pulsesGeometry.attributes.position.needsUpdate = true;

    // Rayos de plasma ocasionales cruzando el interior de la esfera.
    scene.arcs.forEach((arc) => {
      if (arc.life > 0) {
        arc.life -= delta;
        const progress = 1 - Math.max(arc.life, 0) / arc.maxLife;
        const flash = progress < 0.15 ? progress / 0.15 : 1 - (progress - 0.15) / 0.85;
        arc.material.opacity = Math.max(flash, 0) * 0.9;
        if (arc.life <= 0) {
          arc.material.opacity = 0;
          arc.cooldown = 0.2 + Math.random() * 0.6;
        }
      } else {
        arc.cooldown -= delta;
        if (arc.cooldown <= 0 && Math.random() < target.arcChance * delta * 6) {
          generateLightningPath(arc.positions, scene.scratchVectorA, scene.scratchVectorB, scene.scratchVectorJitter);
          arc.geometry.attributes.position.needsUpdate = true;
          arc.maxLife = 0.18 + Math.random() * 0.14;
          arc.life = arc.maxLife;
        }
      }
    });

    // Núcleo de energía central: respira en reposo, estalla en blanco al pensar.
    if (glowSpriteRef.current) {
      const pulse =
        state === "thinking"
          ? 0.55 + 0.35 * Math.abs(Math.sin(t * 5))
          : state === "speaking"
            ? 0.4 + 0.25 * (realAmplitudeSpeakingRef.current ? level : 0.5 + 0.5 * Math.sin(t * 6.2))
            : 0.32 + 0.06 * Math.sin(t * 1.4);
      // Un núcleo puntual, no un halo que inunde media esfera.
      const s = SPHERE_RADIUS * (0.16 + pulse * 0.22);
      glowSpriteRef.current.scale.setScalar(s);
    }
  });

  return (
    <group ref={groupRef}>
      <points geometry={scene.nodesGeometry} material={scene.nodesMaterial} />
      <lineSegments geometry={scene.linesGeometry} material={scene.linesMaterial} />
      <points geometry={scene.pulsesGeometry} material={scene.pulsesMaterial} />
      {scene.arcs.map((arc, i) => (
        <primitive key={i} object={arc.lineObject} />
      ))}
      <mesh geometry={scene.shellGeometry} material={scene.shellMaterial} />
      <mesh ref={wireRef} geometry={scene.wireGeometry} material={scene.wireMaterial} />
      <sprite ref={glowSpriteRef} material={scene.glowSpriteMaterial} />
    </group>
  );
});

function detectWebglSupport(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * Esfera Neuronal Holográfica de V.E.R.A. — núcleo 3D con nodos sinápticos
 * interconectados, energía bicolor (naranja/cian) según hemisferio, pulsos
 * de luz viajando por las conexiones, rayos de plasma ocasionales y una
 * cúpula de contención con efecto Fresnel. Renderizado en WebGL vía
 * @react-three/fiber; toda la animación por frame muta objetos Three.js
 * directamente (nada de estado de React en el loop) para mantener 60fps.
 *
 * `NeuralCore` está envuelto en `memo`: sus props son objetos ref
 * (identidad estable) que nunca cambian, así que aunque este componente
 * exterior se re-renderice en cada tick de `amplitude` (mientras escucha
 * o habla), React no vuelve a ejecutar ni reconciliar el árbol de la
 * escena 3D — solo se actualizan las refs, que el bucle useFrame ya lee
 * directamente.
 */
export function VeraCore({ state, amplitude = 0, realAmplitudeSpeaking = false, className }: VeraCoreProps) {
  const stateRef = useRef(state);
  const amplitudeRef = useRef(amplitude);
  const realAmplitudeSpeakingRef = useRef(realAmplitudeSpeaking);
  stateRef.current = state;
  amplitudeRef.current = amplitude;
  realAmplitudeSpeakingRef.current = realAmplitudeSpeaking;

  const [webglSupported] = useState(detectWebglSupport);

  if (!webglSupported) {
    return (
      <div
        className={cn("relative aspect-square overflow-hidden rounded-full", className)}
        style={{
          background: "radial-gradient(circle, rgba(0,240,255,0.35) 0%, rgba(0,112,243,0.18) 45%, transparent 72%)",
        }}
        aria-hidden="true"
      />
    );
  }

  return (
    <div className={cn("relative flex flex-col items-center", className)} aria-hidden="true">
      {/* Recortada en círculo: el canvas WebGL es cuadrado por defecto, y
          sin esto se veían las esquinas del frustum de la cámara. */}
      <div className="relative aspect-square w-full overflow-hidden rounded-full">
        <Canvas
          camera={CAMERA_CONFIG}
          // [1,2]: React Three Fiber aplica internamente
          // gl.setPixelRatio(clamp(devicePixelRatio, 1, 2)) — así se evita
          // renderizar a 3x/4x en pantallas Retina/4K sin código manual.
          dpr={[1, 2]}
          gl={GL_CONFIG}
          style={{ background: "transparent" }}
        >
          <NeuralCore
            stateRef={stateRef}
            amplitudeRef={amplitudeRef}
            realAmplitudeSpeakingRef={realAmplitudeSpeakingRef}
          />
        </Canvas>
      </div>
      <span className="pointer-events-none mt-2 shrink-0 text-center font-mono text-[0.5rem] uppercase tracking-[0.35em] text-hud-cyan/60">
        V.E.R.A System Core
      </span>
    </div>
  );
}
