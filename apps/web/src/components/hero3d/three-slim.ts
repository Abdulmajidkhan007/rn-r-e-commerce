/**
 * Slim `three` entry for the web bundle (see vite.config.ts `resolve.alias`).
 *
 * React Three Fiber v9 calls `extend(THREE)` with the whole namespace, which
 * defeats tree-shaking and ships all of three.js (~245 KB gzip with R3F). The
 * app aliases bare `three` imports here so only the classes below are bundled.
 *
 * Keep this list = what R3F + drei `Float` reference, plus every JSX element and
 * class the hero scene uses. A missing name fails the build loudly
 * ("… is not exported"), never silently at runtime.
 */
export {
  // Required by @react-three/fiber and @react-three/drei/core/Float
  ACESFilmicToneMapping,
  BasicShadowMap,
  Clock,
  Color,
  ColorManagement,
  Layers,
  LinearSRGBColorSpace,
  MathUtils,
  NoToneMapping,
  Object3D,
  OrthographicCamera,
  PCFShadowMap,
  PCFSoftShadowMap,
  PerspectiveCamera,
  RGBAFormat,
  Raycaster,
  SRGBColorSpace,
  Scene,
  ShaderMaterial,
  UnsignedByteType,
  VSMShadowMap,
  Vector2,
  Vector3,
  WebGLRenderer,
  // Used by the hero scene (JSX intrinsic elements + geometry.ts)
  AmbientLight,
  BoxGeometry,
  BufferGeometry,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  Float32BufferAttribute,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
} from 'three/src/Three.js';
