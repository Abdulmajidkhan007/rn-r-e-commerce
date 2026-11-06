import { useMemo, useRef, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import { MathUtils, type Group } from 'three';
import { palette } from '@kidswear/theme';
import type { ColorScheme } from '@kidswear/theme';
import { createStarGeometry } from './geometry';

/** Cap the pixel ratio: retina phones would otherwise render 3× the pixels. */
const DPR: [number, number] = [1, 1.5];
const POINTER_TILT = 0.22;
const POINTER_DAMPING = 3;
const COLLAR = palette.secondary[300];

interface SceneColors {
  cloud: string;
  coral: string;
  teal: string;
  sun: string;
  tee: string;
}

const COLORS: Record<ColorScheme, SceneColors> = {
  light: {
    cloud: '#ffffff',
    coral: palette.primary[200],
    teal: palette.secondary[200],
    sun: palette.warning[200],
    tee: palette.primary[50],
  },
  dark: {
    cloud: palette.neutral[200],
    coral: palette.primary[300],
    teal: palette.secondary[300],
    sun: palette.warning[300],
    tee: palette.primary[100],
  },
};

/** Normalized placement: x/y in [-1, 1] of the visible viewport. */
interface Placement {
  x: number;
  y: number;
  scale: number;
  speed: number;
}

function usePlacement({ x, y }: Placement): [number, number, number] {
  const { width, height } = useThree((state) => state.viewport);
  return [(x * width) / 2, (y * height) / 2, 0];
}

function useUnit(): number {
  const { width, height } = useThree((state) => state.viewport);
  return Math.min(width, height) / 6;
}

function Cloud({ color, ...placement }: Placement & { color: string }): React.ReactElement {
  const position = usePlacement(placement);
  const unit = useUnit() * placement.scale;
  return (
    <Float speed={placement.speed} floatIntensity={0.6} rotationIntensity={0.2}>
      <group position={position} scale={unit}>
        {(
          [
            [-0.7, -0.1, 0.55],
            [0, 0.2, 0.75],
            [0.7, -0.05, 0.6],
            [0.2, -0.3, 0.55],
          ] as const
        ).map(([px, py, r]) => (
          <mesh key={`${px}${py}`} position={[px, py, 0]} scale={r}>
            <icosahedronGeometry args={[1, 1]} />
            <meshLambertMaterial color={color} flatShading />
          </mesh>
        ))}
      </group>
    </Float>
  );
}

function Balloon({ color, ...placement }: Placement & { color: string }): React.ReactElement {
  const position = usePlacement(placement);
  const unit = useUnit() * placement.scale;
  return (
    <Float speed={placement.speed} floatIntensity={1.2} rotationIntensity={0.4}>
      <group position={position} scale={unit}>
        <mesh scale={[0.8, 1, 0.8]}>
          <icosahedronGeometry args={[1, 1]} />
          <meshLambertMaterial color={color} flatShading />
        </mesh>
        <mesh position={[0, -1.05, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.14, 0.2, 5]} />
          <meshLambertMaterial color={color} flatShading />
        </mesh>
        <mesh position={[0, -1.75, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 1.3, 3]} />
          <meshBasicMaterial color={color} />
        </mesh>
      </group>
    </Float>
  );
}

function Star({ color, ...placement }: Placement & { color: string }): React.ReactElement {
  const position = usePlacement(placement);
  const unit = useUnit() * placement.scale;
  const geometry = useMemo(() => createStarGeometry(), []);
  return (
    <Float speed={placement.speed} floatIntensity={0.8} rotationIntensity={0.9}>
      <mesh position={position} scale={unit} geometry={geometry} rotation={[0.2, -0.3, 0.1]}>
        <meshLambertMaterial color={color} flatShading />
      </mesh>
    </Float>
  );
}

/** Toy-like kids' T-shirt: a body block and two tilted sleeve blocks. */
function Tee({ color, ...placement }: Placement & { color: string }): React.ReactElement {
  const position = usePlacement(placement);
  const unit = useUnit() * placement.scale;
  return (
    <Float speed={placement.speed} floatIntensity={0.8} rotationIntensity={0.7}>
      <group position={position} scale={unit} rotation={[0.15, -0.35, 0.08]}>
        <mesh>
          <boxGeometry args={[1.1, 1.5, 0.3]} />
          <meshLambertMaterial color={color} flatShading />
        </mesh>
        {([-1, 1] as const).map((side) => (
          <mesh key={side} position={[side * 0.72, 0.5, 0]} rotation={[0, 0, side * -0.65]}>
            <boxGeometry args={[0.36, 0.6, 0.28]} />
            <meshLambertMaterial color={color} flatShading />
          </mesh>
        ))}
        <mesh position={[0, 0.76, 0.1]}>
          <boxGeometry args={[0.4, 0.06, 0.16]} />
          <meshLambertMaterial color={COLLAR} flatShading />
        </mesh>
      </group>
    </Float>
  );
}

/** Tilts the whole decor towards the pointer, damped so it feels soft. */
function PointerRig({ children }: { children: React.ReactNode }): React.ReactElement {
  const group = useRef<Group>(null);
  useFrame((state, delta) => {
    const node = group.current;
    if (!node) return;
    const px = MathUtils.clamp(state.pointer.x, -1, 1);
    const py = MathUtils.clamp(state.pointer.y, -1, 1);
    node.rotation.y = MathUtils.damp(node.rotation.y, px * POINTER_TILT, POINTER_DAMPING, delta);
    node.rotation.x = MathUtils.damp(node.rotation.x, -py * POINTER_TILT, POINTER_DAMPING, delta);
  });
  return <group ref={group}>{children}</group>;
}

export interface HeroSceneProps {
  /** False while the hero is off-screen or the tab is hidden: rendering stops. */
  active: boolean;
  scheme: ColorScheme;
  /** Element whose pointer movement drives the tilt (the whole hero). */
  eventSource: RefObject<HTMLElement | null>;
}

export default function HeroScene({
  active,
  scheme,
  eventSource,
}: HeroSceneProps): React.ReactElement {
  const c = COLORS[scheme];
  return (
    <Canvas
      dpr={DPR}
      frameloop={active ? 'always' : 'never'}
      eventSource={eventSource}
      eventPrefix="client"
      camera={{ position: [0, 0, 8], fov: 35 }}
      gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
    >
      <ambientLight intensity={scheme === 'dark' ? 1.1 : 1.6} />
      <directionalLight position={[3, 5, 6]} intensity={scheme === 'dark' ? 1.6 : 2.2} />
      <PointerRig>
        <Cloud color={c.cloud} x={-0.5} y={0.55} scale={0.9} speed={1.2} />
        <Cloud color={c.cloud} x={0.55} y={-0.62} scale={0.7} speed={1} />
        <Balloon color={c.coral} x={0.2} y={0.3} scale={0.9} speed={1.6} />
        <Balloon color={c.teal} x={0.72} y={0.12} scale={0.75} speed={1.4} />
        <Star color={c.sun} x={-0.35} y={-0.42} scale={0.7} speed={2} />
        <Star color={c.sun} x={0.62} y={0.72} scale={0.4} speed={2.4} />
        <Tee color={c.tee} x={-0.05} y={-0.05} scale={0.9} speed={1.3} />
      </PointerRig>
    </Canvas>
  );
}
