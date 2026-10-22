'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const GREEN = new THREE.Color('#15C45A');
const GLOW = new THREE.Color('#4ADE80');

/** Textura redonda e suave para os pontos brilharem (gerada em código, sem arquivo). */
function makeGlowTexture() {
  const size = 64;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(180,255,210,0.8)');
  grad.addColorStop(1, 'rgba(21,196,90,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}

/**
 * Rede de pontos e linhas finas flutuando em um cubo de profundidade.
 * Pontos próximos ao cursor são atraídos; linhas surgem entre pontos vizinhos.
 */
function Network({ count, linkDist }: { count: number; linkDist: number }) {
  const BOX = useMemo(() => new THREE.Vector3(17, 10, 9), []);
  const maxSeg = count * 5;

  const data = useMemo(() => {
    const base = new Float32Array(count * 3);
    const phase = new Float32Array(count * 3);
    const speed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      base[i * 3] = (Math.random() - 0.5) * BOX.x;
      base[i * 3 + 1] = (Math.random() - 0.5) * BOX.y;
      base[i * 3 + 2] = (Math.random() - 0.5) * BOX.z - 1;
      phase[i * 3] = Math.random() * Math.PI * 2;
      phase[i * 3 + 1] = Math.random() * Math.PI * 2;
      phase[i * 3 + 2] = Math.random() * Math.PI * 2;
      speed[i] = 0.15 + Math.random() * 0.25;
    }
    return { base, phase, speed, pos: new Float32Array(base) };
  }, [count, BOX]);

  const texture = useMemo(() => makeGlowTexture(), []);
  const pointsRef = useRef<THREE.Points>(null);
  const linesRef = useRef<THREE.LineSegments>(null);
  const linePos = useMemo(() => new Float32Array(maxSeg * 6), [maxSeg]);
  const lineCol = useMemo(() => new Float32Array(maxSeg * 6), [maxSeg]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const { base, phase, speed, pos } = data;
    // posição do mouse no plano z=0 (em unidades da cena)
    const mx = (state.pointer.x * state.viewport.width) / 2;
    const my = (state.pointer.y * state.viewport.height) / 2;
    const R = 3.4;

    for (let i = 0; i < count; i++) {
      const s = speed[i];
      let x = base[i * 3] + Math.sin(t * s + phase[i * 3]) * 0.6;
      let y = base[i * 3 + 1] + Math.cos(t * s * 0.9 + phase[i * 3 + 1]) * 0.6;
      const z = base[i * 3 + 2] + Math.sin(t * s * 0.7 + phase[i * 3 + 2]) * 0.5;
      // atração ao cursor
      const dx = mx - x;
      const dy = my - y;
      const d = Math.hypot(dx, dy);
      if (d < R) {
        const pull = Math.pow(1 - d / R, 2) * 0.75;
        x += dx * pull;
        y += dy * pull;
      }
      // suaviza para os pontos "escorregarem" até o alvo
      pos[i * 3] += (x - pos[i * 3]) * 0.12;
      pos[i * 3 + 1] += (y - pos[i * 3 + 1]) * 0.12;
      pos[i * 3 + 2] += (z - pos[i * 3 + 2]) * 0.12;
    }

    // linhas entre vizinhos
    let seg = 0;
    const lim2 = linkDist * linkDist;
    for (let i = 0; i < count && seg < maxSeg; i++) {
      for (let j = i + 1; j < count && seg < maxSeg; j++) {
        const dx = pos[i * 3] - pos[j * 3];
        const dy = pos[i * 3 + 1] - pos[j * 3 + 1];
        const dz = pos[i * 3 + 2] - pos[j * 3 + 2];
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < lim2) {
          const a = 1 - Math.sqrt(d2) / linkDist;
          const o = seg * 6;
          linePos[o] = pos[i * 3];
          linePos[o + 1] = pos[i * 3 + 1];
          linePos[o + 2] = pos[i * 3 + 2];
          linePos[o + 3] = pos[j * 3];
          linePos[o + 4] = pos[j * 3 + 1];
          linePos[o + 5] = pos[j * 3 + 2];
          const k = a * 0.9;
          lineCol[o] = lineCol[o + 3] = GREEN.r * k;
          lineCol[o + 1] = lineCol[o + 4] = GREEN.g * k;
          lineCol[o + 2] = lineCol[o + 5] = GREEN.b * k;
          seg++;
        }
      }
    }

    const pGeo = pointsRef.current!.geometry;
    pGeo.attributes.position.needsUpdate = true;
    const lGeo = linesRef.current!.geometry;
    lGeo.attributes.position.needsUpdate = true;
    lGeo.attributes.color.needsUpdate = true;
    lGeo.setDrawRange(0, seg * 2);
  });

  return (
    <group>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[data.pos, 3]} />
        </bufferGeometry>
        <pointsMaterial
          map={texture}
          size={0.32}
          sizeAttenuation
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          color={GLOW}
        />
      </points>
      <lineSegments ref={linesRef} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[linePos, 3]} />
          <bufferAttribute attach="attributes-color" args={[lineCol, 3]} />
        </bufferGeometry>
        <lineBasicMaterial vertexColors transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </lineSegments>
    </group>
  );
}

/** Cubo vazado feito de 12 vigas finas e luminosas. */
function HollowCube({ size = 2 }: { size?: number }) {
  const t = 0.045;
  const h = size / 2;
  const beams = useMemo(() => {
    const out: { pos: [number, number, number]; scale: [number, number, number] }[] = [];
    for (const y of [-h, h]) for (const z of [-h, h]) out.push({ pos: [0, y, z], scale: [size + t, t, t] });
    for (const x of [-h, h]) for (const z of [-h, h]) out.push({ pos: [x, 0, z], scale: [t, size + t, t] });
    for (const x of [-h, h]) for (const y of [-h, h]) out.push({ pos: [x, y, 0], scale: [t, t, size + t] });
    return out;
  }, [size, h]);
  return (
    <group>
      {beams.map((b, i) => (
        <mesh key={i} position={b.pos} scale={b.scale}>
          <boxGeometry />
          <meshBasicMaterial color={GLOW} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/** Formas geométricas luminosas que giram devagar e seguem o mouse com paralaxe. */
function Shapes() {
  // as formas ficam no lado direito e encolhem em telas mais estreitas, para não cobrir o texto
  const { viewport } = useThree();
  const baseX = viewport.width * 0.27;
  const scale = Math.min(1, Math.max(0.55, viewport.width / 15));
  const group = useRef<THREE.Group>(null);
  const cube = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const sphere = useRef<THREE.Group>(null);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    if (cube.current) {
      cube.current.rotation.x = t * 0.18;
      cube.current.rotation.y = t * 0.24;
      cube.current.position.y = 1.2 + Math.sin(t * 0.6) * 0.15;
    }
    if (ring.current) {
      ring.current.rotation.x = Math.PI / 2.4 + Math.sin(t * 0.3) * 0.2;
      ring.current.rotation.z = t * 0.2;
    }
    if (sphere.current) {
      sphere.current.rotation.y = -t * 0.15;
      sphere.current.rotation.x = t * 0.1;
      sphere.current.position.y = -1.6 + Math.cos(t * 0.5) * 0.2;
    }
    if (group.current) {
      // paralaxe: o conjunto inclina de leve acompanhando o mouse
      group.current.rotation.y += (state.pointer.x * 0.35 - group.current.rotation.y) * Math.min(1, dt * 2.5);
      group.current.rotation.x += (-state.pointer.y * 0.2 - group.current.rotation.x) * Math.min(1, dt * 2.5);
      group.current.position.x += (baseX + state.pointer.x * 0.4 - group.current.position.x) * Math.min(1, dt * 2.5);
    }
  });

  return (
    <group ref={group} position={[baseX, 0, 0]} scale={scale}>
      <group ref={cube} position={[0.2, 1.2, 0]}>
        <HollowCube size={2.1} />
        <group scale={0.45}>
          <HollowCube size={2.1} />
        </group>
      </group>
      <mesh ref={ring} position={[-0.8, -0.2, 1]}>
        <torusGeometry args={[1.7, 0.028, 16, 140]} />
        <meshBasicMaterial color={GLOW} toneMapped={false} />
      </mesh>
      <group ref={sphere} position={[1.7, -1.6, -0.5]}>
        <mesh>
          <icosahedronGeometry args={[0.95, 1]} />
          <meshStandardMaterial color="#0f2a1a" emissive={GREEN} emissiveIntensity={0.35} flatShading roughness={0.4} metalness={0.5} />
        </mesh>
        <mesh scale={1.02}>
          <icosahedronGeometry args={[0.95, 1]} />
          <meshBasicMaterial color={GLOW} wireframe toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

function Scene({ mobile }: { mobile: boolean }) {
  return (
    <>
      <fog attach="fog" args={['#0A0C0B', 7, 20]} />
      <ambientLight intensity={0.4} />
      <pointLight position={[4, 3, 4]} intensity={30} color="#4ADE80" />
      <Network count={mobile ? 38 : 130} linkDist={mobile ? 3.6 : 2.9} />
      {!mobile && <Shapes />}
    </>
  );
}

/** Cena 3D da abertura. Só desenha enquanto está visível, para poupar bateria e processador. */
export default function HeroScene({ mobile }: { mobile: boolean }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(true);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    let inView = true;
    const update = () => setActive(inView && !document.hidden);
    const io = new IntersectionObserver(([e]) => {
      inView = e.isIntersecting;
      update();
    });
    io.observe(el);
    document.addEventListener('visibilitychange', update);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  return (
    <div ref={wrap} className="absolute inset-0" aria-hidden>
      <Canvas
        dpr={[1, mobile ? 1.25 : 1.6]}
        camera={{ position: [0, 0, 9], fov: 50 }}
        gl={{ antialias: !mobile, alpha: true, powerPreference: 'high-performance' }}
        frameloop={active ? 'always' : 'never'}
        onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      >
        <Scene mobile={mobile} />
      </Canvas>
    </div>
  );
}
