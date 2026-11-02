import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Milestone, Task, TaskStatus } from '../types/project';
import { CriticalPathAnalysis } from '../utils/projectEngine';
import {
  ChevronDown,
  ChevronUp,
  Layers,
  Maximize2,
  Minimize2,
  RotateCcw,
  Sliders,
  Sparkles,
} from 'lucide-react';

export type MaterialFinishPreset = 'platinum' | 'obsidian' | 'studio_ceramic';
export type CameraPresetId = 'isometric' | 'top_matrix' | 'critical_focus' | 'milestone_orbit';

interface TopologyScene3DProps {
  tasks: Task[];
  milestones: Milestone[];
  criticalPath: CriticalPathAnalysis;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onSelectTask?: (taskId: string) => void;
  onUpdateTaskStatus?: (taskId: string, nextStatus: TaskStatus) => void;
}

const _scratchPos = new THREE.Vector3();
const _scratchQuat = new THREE.Quaternion();
const _scratchScale = new THREE.Vector3();
const _scratchMat4 = new THREE.Matrix4();
const _scratchColor = new THREE.Color();

function createProceduralGridTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#09090b';
  ctx.fillRect(0, 0, 512, 512);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
  ctx.lineWidth = 1;
  const step = 64;
  for (let i = 0; i <= 512; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, 512, 512);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(16, 16);
  texture.anisotropy = maxAnisotropy;
  return texture;
}

function createProceduralBumpTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 256, 256);

  for (let y = 0; y < 256; y += 2) {
    const shade = 115 + ((y * 7) % 28);
    ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
    ctx.fillRect(0, y, 256, 1);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 60);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.78)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.32)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function getMonochromeStatusHex(status: TaskStatus): number {
  switch (status) {
    case 'Completed':
      return 0xffffff; // Crisp white
    case 'In Progress':
      return 0xd4d4d8; // Platinum zinc-300
    case 'In Review':
      return 0xa1a1aa; // Silver zinc-400
    case 'Blocked':
      return 0x52525b; // Dark graphite zinc-600
    case 'Backlog':
    default:
      return 0x3f3f46; // Muted zinc-700
  }
}

export const TopologyScene3D: React.FC<TopologyScene3DProps> = ({
  tasks,
  milestones,
  criticalPath,
  isFullscreen,
  onToggleFullscreen,
  onSelectTask,
  onUpdateTaskStatus,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);

  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [explodedElevation, setExplodedElevation] = useState(0.35);
  const [finishPreset, setFinishPreset] = useState<MaterialFinishPreset>('platinum');
  const [cameraPreset, setCameraPreset] = useState<CameraPresetId>('isometric');
  const [isolateCriticalOnly, setIsolateCriticalOnly] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string>(tasks[0]?.id ?? '');

  const controlsStateRef = useRef({
    explodedElevation: 0.35,
    finishPreset: 'platinum' as MaterialFinishPreset,
    cameraPreset: 'isometric' as CameraPresetId,
    isolateCriticalOnly: false,
    selectedTaskId: tasks[0]?.id ?? '',
    cameraTransitionActive: false,
    desiredCamPos: new THREE.Vector3(0, 18, 25),
    desiredCamTarget: new THREE.Vector3(0, 1.5, 0),
  });

  const requestRenderRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    controlsStateRef.current.explodedElevation = explodedElevation;
    controlsStateRef.current.finishPreset = finishPreset;
    controlsStateRef.current.isolateCriticalOnly = isolateCriticalOnly;
    controlsStateRef.current.selectedTaskId = selectedTaskId;
    requestRenderRef.current?.();
  }, [explodedElevation, finishPreset, isolateCriticalOnly, selectedTaskId]);

  const handleCameraPresetChange = (preset: CameraPresetId) => {
    setCameraPreset(preset);
    const st = controlsStateRef.current;
    st.cameraPreset = preset;
    st.cameraTransitionActive = true;

    if (preset === 'isometric') {
      st.desiredCamPos.set(0, 18, 25);
      st.desiredCamTarget.set(0, 1.5, 0);
    } else if (preset === 'top_matrix') {
      st.desiredCamPos.set(0, 31, 3);
      st.desiredCamTarget.set(0, 0, 0);
    } else if (preset === 'critical_focus') {
      st.desiredCamPos.set(-5, 11, 16);
      st.desiredCamTarget.set(-2, 2.2, 1);
    } else if (preset === 'milestone_orbit') {
      st.desiredCamPos.set(17, 12, 17);
      st.desiredCamTarget.set(2, 2.0, 0);
    }
    requestRenderRef.current?.();
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.key.toLowerCase() === 'h') {
        setDockCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const mountEl = canvasMountRef.current;
    if (!mountEl) return;

    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = mountEl.clientWidth || window.innerWidth;
    const height = mountEl.clientHeight || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    mountEl.innerHTML = '';
    mountEl.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const horizonColor = new THREE.Color(0x09090b);
    scene.background = horizonColor;
    scene.fog = new THREE.FogExp2(0x09090b, 0.016);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 180);
    camera.position.set(0, 18, 25);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.5, 0);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.minDistance = 6;
    controls.maxDistance = 52;

    controls.addEventListener('start', () => {
      controlsStateRef.current.cameraTransitionActive = false;
    });

    const hemiFill = new THREE.HemisphereLight(0xe4e4e7, 0x18181b, 0.95);
    hemiFill.position.set(0, 30, 0);
    scene.add(hemiFill);

    const keyLight = new THREE.DirectionalLight(0xfffbeb, 2.2);
    keyLight.position.set(16, 26, 18);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 2;
    keyLight.shadow.camera.far = 65;
    const d = 22;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xd4d4d8, 1.15);
    rimLight.position.set(-18, 14, -16);
    scene.add(rimLight);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const gridTexture = createProceduralGridTexture(maxAniso);
    const bumpTexture = createProceduralBumpTexture(maxAniso);
    const contactShadowTex = createContactShadowTexture();

    const groundGeo = new THREE.PlaneGeometry(90, 90);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: gridTexture,
      roughness: 0.78,
      metalness: 0.18,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = 0;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    const platformRingGeo = new THREE.RingGeometry(15.2, 15.6, 64);
    const platformRingMat = new THREE.MeshStandardMaterial({
      color: 0xe4e4e7,
      emissive: 0x71717a,
      emissiveIntensity: 0.25,
      roughness: 0.3,
      metalness: 0.8,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const platformRing = new THREE.Mesh(platformRingGeo, platformRingMat);
    platformRing.rotation.x = -Math.PI / 2;
    platformRing.position.y = 0.025;
    scene.add(platformRing);

    const primaryMetalMat = new THREE.MeshPhysicalMaterial({
      color: 0xd4d4d8,
      metalness: 0.88,
      roughness: 0.18,
      bumpMap: bumpTexture,
      bumpScale: 0.015,
      clearcoat: 0.4,
    });

    const secondaryMatteMat = new THREE.MeshStandardMaterial({
      color: 0x27272a,
      metalness: 0.32,
      roughness: 0.68,
    });

    const accentTrimMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xa1a1aa,
      emissiveIntensity: 0.35,
      metalness: 0.92,
      roughness: 0.15,
    });

    const contactShadowGeo = new THREE.CircleGeometry(2.1, 24);
    const contactShadowMat = new THREE.MeshBasicMaterial({
      map: contactShadowTex,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    });

    // Build 5 Six Sigma DMAIC Architectural Monuments (Define, Measure, Analyze, Improve, Control)
    const octShape = new THREE.Shape();
    const octRadius = 1.45;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const x = Math.cos(angle) * octRadius;
      const y = Math.sin(angle) * octRadius;
      if (i === 0) octShape.moveTo(x, y);
      else octShape.lineTo(x, y);
    }
    octShape.closePath();

    const plinthGeo = new THREE.ExtrudeGeometry(octShape, {
      depth: 0.42,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.08,
      bevelThickness: 0.08,
    });
    plinthGeo.rotateX(-Math.PI / 2);

    const collarGeo = new THREE.CylinderGeometry(1.12, 1.28, 0.38, 16);
    const lathePoints = [
      new THREE.Vector2(0.55, 0),
      new THREE.Vector2(0.82, 0.4),
      new THREE.Vector2(0.62, 1.4),
      new THREE.Vector2(0.88, 2.3),
      new THREE.Vector2(0.52, 2.9),
    ];
    const columnLatheGeo = new THREE.LatheGeometry(lathePoints, 12);
    const deckGeo = new THREE.CylinderGeometry(1.35, 1.05, 0.26, 8);
    const finGeo = new THREE.BoxGeometry(0.14, 1.8, 0.48);
    const spireGeo = new THREE.OctahedronGeometry(0.52, 0);
    const haloGeo = new THREE.TorusGeometry(1.18, 0.045, 12, 36);

    const dmaicPositions: [number, number][] = [
      [-10, -6],
      [-5, 6],
      [0, -7.5],
      [5, 6],
      [10, -6],
    ];

    dmaicPositions.forEach(([px, pz]) => {
      const msGroup = new THREE.Group();
      msGroup.position.set(px, 0, pz);

      const shadowDisc = new THREE.Mesh(contactShadowGeo, contactShadowMat);
      shadowDisc.rotation.x = -Math.PI / 2;
      shadowDisc.position.y = 0.015;
      msGroup.add(shadowDisc);

      const plinth = new THREE.Mesh(plinthGeo, primaryMetalMat);
      plinth.position.y = 0.08;
      plinth.castShadow = true;
      plinth.receiveShadow = true;
      msGroup.add(plinth);

      const collar = new THREE.Mesh(collarGeo, secondaryMatteMat);
      collar.position.y = 0.65;
      collar.castShadow = true;
      msGroup.add(collar);

      const column = new THREE.Mesh(columnLatheGeo, primaryMetalMat);
      column.position.y = 0.82;
      column.castShadow = true;
      msGroup.add(column);

      for (let f = 0; f < 4; f++) {
        const fin = new THREE.Mesh(finGeo, secondaryMatteMat);
        const angle = (f / 4) * Math.PI * 2;
        fin.position.set(Math.cos(angle) * 0.78, 1.85, Math.sin(angle) * 0.78);
        fin.rotation.y = -angle;
        fin.castShadow = true;
        msGroup.add(fin);
      }

      const deck = new THREE.Mesh(deckGeo, primaryMetalMat);
      deck.position.y = 3.65;
      deck.castShadow = true;
      msGroup.add(deck);

      const spireMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        emissive: 0xd4d4d8,
        emissiveIntensity: 0.45,
        roughness: 0.12,
        metalness: 0.25,
        clearcoat: 1.0,
      });
      const spire = new THREE.Mesh(spireGeo, spireMat);
      spire.position.y = 4.45;
      spire.castShadow = true;
      msGroup.add(spire);

      const halo = new THREE.Mesh(haloGeo, accentTrimMat);
      halo.position.y = 4.45;
      halo.rotation.x = Math.PI / 2.3;
      msGroup.add(halo);

      scene.add(msGroup);
    });

    // Build Composite 5-Part Task Compute Pods for each user task
    const hexShape = new THREE.Shape();
    const hexR = 0.78;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const x = Math.cos(a) * hexR;
      const y = Math.sin(a) * hexR;
      if (i === 0) hexShape.moveTo(x, y);
      else hexShape.lineTo(x, y);
    }
    hexShape.closePath();

    const podChassisGeo = new THREE.ExtrudeGeometry(hexShape, {
      depth: 0.45,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.06,
      bevelThickness: 0.06,
    });
    podChassisGeo.rotateX(-Math.PI / 2);

    const podShroudGeo = new THREE.CylinderGeometry(0.56, 0.66, 0.34, 12);
    const podBeaconGeo = new THREE.SphereGeometry(0.34, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const podCollarGeo = new THREE.TorusGeometry(0.58, 0.04, 10, 24);
    const podCollarRingGeo = new THREE.RingGeometry(0.88, 1.02, 24);

    interface TaskNodeEntry {
      taskId: string;
      group: THREE.Group;
      depthLevel: number;
      selectionRing: THREE.Mesh;
    }

    const taskNodes: TaskNodeEntry[] = [];
    const interactables: THREE.Object3D[] = [];
    const taskPositionMap = new Map<string, THREE.Vector3>();

    const orderedTasks = [...tasks].sort((a, b) => a.priorityIndex - b.priorityIndex);

    orderedTasks.forEach((task, idx) => {
      const angle = (idx / Math.max(1, orderedTasks.length)) * Math.PI * 2 - Math.PI / 3;
      const depth = criticalPath.taskDepthMap[task.id] ?? 0;
      const radius = 4.2 + (idx % 3) * 2.4;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      const podGroup = new THREE.Group();
      podGroup.position.set(x, 0, z);

      const podShadow = new THREE.Mesh(contactShadowGeo, contactShadowMat);
      podShadow.scale.setScalar(0.55);
      podShadow.rotation.x = -Math.PI / 2;
      podShadow.position.y = 0.015;
      podGroup.add(podShadow);

      const chassis = new THREE.Mesh(podChassisGeo, primaryMetalMat);
      chassis.position.y = 0.06;
      chassis.castShadow = true;
      chassis.receiveShadow = true;
      podGroup.add(chassis);

      const shroud = new THREE.Mesh(podShroudGeo, secondaryMatteMat);
      shroud.position.y = 0.68;
      shroud.castShadow = true;
      podGroup.add(shroud);

      const statusHex = getMonochromeStatusHex(task.status);
      const beaconMat = new THREE.MeshStandardMaterial({
        color: statusHex,
        emissive: statusHex,
        emissiveIntensity: 0.45,
        roughness: 0.16,
        metalness: 0.2,
      });
      const beacon = new THREE.Mesh(podBeaconGeo, beaconMat);
      beacon.position.y = 0.84;
      podGroup.add(beacon);

      const collar = new THREE.Mesh(podCollarGeo, accentTrimMat);
      collar.rotation.x = Math.PI / 2;
      collar.position.y = 0.56;
      podGroup.add(collar);

      const selMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
      });
      const selectionRing = new THREE.Mesh(podCollarRingGeo, selMat);
      selectionRing.rotation.x = -Math.PI / 2;
      selectionRing.position.y = 0.03;
      selectionRing.visible = task.id === controlsStateRef.current.selectedTaskId;
      podGroup.add(selectionRing);

      const hitProxy = new THREE.Mesh(
        new THREE.CylinderGeometry(0.95, 0.95, 1.5, 8),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      hitProxy.position.y = 0.75;
      hitProxy.userData = { taskId: task.id };
      podGroup.add(hitProxy);
      interactables.push(hitProxy);

      scene.add(podGroup);

      const worldPos = new THREE.Vector3(x, 0.65, z);
      taskPositionMap.set(task.id, worldPos);
      taskNodes.push({
        taskId: task.id,
        group: podGroup,
        depthLevel: depth + 1,
        selectionRing,
      });
    });

    const conduitCurves: { isCritical: boolean; mesh: THREE.Mesh }[] = [];
    orderedTasks.forEach((task) => {
      const targetPos = taskPositionMap.get(task.id);
      if (!targetPos) return;

      task.dependencies.forEach((depId) => {
        const startPos = taskPositionMap.get(depId);
        if (!startPos) return;

        const isCrit =
          criticalPath.criticalTaskIds.includes(task.id) &&
          criticalPath.criticalTaskIds.includes(depId);

        const midPoint = new THREE.Vector3()
          .addVectors(startPos, targetPos)
          .multiplyScalar(0.5);
        midPoint.y = isCrit ? 2.4 : 1.45;

        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(startPos.x, 0.6, startPos.z),
          midPoint,
          new THREE.Vector3(targetPos.x, 0.6, targetPos.z),
        ]);

        const tubeGeo = new THREE.TubeGeometry(curve, 20, isCrit ? 0.065 : 0.038, 8, false);
        const tubeMat = new THREE.MeshStandardMaterial({
          color: isCrit ? 0xffffff : 0x71717a,
          emissive: isCrit ? 0xd4d4d8 : 0x3f3f46,
          emissiveIntensity: isCrit ? 0.55 : 0.25,
          roughness: 0.25,
          metalness: 0.75,
        });
        const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
        scene.add(tubeMesh);
        conduitCurves.push({ isCritical: isCrit, mesh: tubeMesh });
      });
    });

    // InstancedMesh for 36 Perimeter Telemetry Pylons
    const pylonCount = 36;
    const pylonGeo = new THREE.CylinderGeometry(0.08, 0.14, 0.9, 8);
    const pylonMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.35,
      metalness: 0.75,
    });
    const pylonInstanced = new THREE.InstancedMesh(pylonGeo, pylonMat, pylonCount);
    for (let i = 0; i < pylonCount; i++) {
      const a = (i / pylonCount) * Math.PI * 2;
      const r = 15.4;
      const scaleVar = 0.85 + ((i * 13) % 30) / 100;
      _scratchPos.set(Math.cos(a) * r, 0.45 * scaleVar, Math.sin(a) * r);
      _scratchQuat.identity();
      _scratchScale.set(1, scaleVar, 1);
      _scratchMat4.compose(_scratchPos, _scratchQuat, _scratchScale);
      pylonInstanced.setMatrixAt(i, _scratchMat4);

      _scratchColor.setHex(i % 3 === 0 ? 0xf4f4f5 : 0x52525b);
      pylonInstanced.setColorAt(i, _scratchColor);
    }
    pylonInstanced.instanceMatrix.needsUpdate = true;
    if (pylonInstanced.instanceColor) pylonInstanced.instanceColor.needsUpdate = true;
    pylonInstanced.computeBoundingSphere();
    scene.add(pylonInstanced);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const handlePointerDown = (ev: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(interactables, false);
      if (hits.length > 0) {
        const hitTaskId = hits[0].object.userData?.taskId;
        if (hitTaskId) {
          setSelectedTaskId(hitTaskId);
          onSelectTask?.(hitTaskId);
        }
      }
    };
    renderer.domElement.addEventListener('pointerdown', handlePointerDown);

    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let lastTime = performance.now();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      gl.flush();
      const poll = () => {
        if (!sync) {
          frameId = window.setTimeout(cb, 80);
          return;
        }
        const state = gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function requestRender() {
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame((now) => {
        renderDirty = false;
        const dt = Math.min((now - lastTime) / 1000, 0.1);
        lastTime = now;

        const st = controlsStateRef.current;

        if (st.finishPreset === 'platinum') {
          primaryMetalMat.color.setHex(0xd4d4d8);
          primaryMetalMat.metalness = 0.88;
          primaryMetalMat.roughness = 0.18;
        } else if (st.finishPreset === 'obsidian') {
          primaryMetalMat.color.setHex(0x27272a);
          primaryMetalMat.metalness = 0.94;
          primaryMetalMat.roughness = 0.16;
        } else {
          primaryMetalMat.color.setHex(0xfafafa);
          primaryMetalMat.metalness = 0.15;
          primaryMetalMat.roughness = 0.25;
        }

        let stillAnimating = false;
        taskNodes.forEach((node) => {
          const targetY = node.depthLevel * st.explodedElevation * 1.35;
          const nextY = THREE.MathUtils.damp(node.group.position.y, targetY, 8, dt);
          if (Math.abs(nextY - targetY) > 0.005) stillAnimating = true;
          node.group.position.y = nextY;

          const isCrit = criticalPath.criticalTaskIds.includes(node.taskId);
          node.group.visible = !st.isolateCriticalOnly || isCrit;
          node.selectionRing.visible = node.taskId === st.selectedTaskId;
        });

        conduitCurves.forEach((c) => {
          c.mesh.visible = !st.isolateCriticalOnly || c.isCritical;
        });

        if (st.cameraTransitionActive) {
          const k = 1 - Math.exp(-6.5 * dt);
          camera.position.lerp(st.desiredCamPos, k);
          controls.target.lerp(st.desiredCamTarget, k);
          if (
            camera.position.distanceToSquared(st.desiredCamPos) < 0.02 &&
            controls.target.distanceToSquared(st.desiredCamTarget) < 0.02
          ) {
            st.cameraTransitionActive = false;
          } else {
            stillAnimating = true;
          }
        }

        controls.update();
        renderer.render(scene, camera);

        const done = () => {
          renderBusy = false;
          if (renderDirty || stillAnimating) {
            requestRender();
          }
        };

        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    }

    requestRenderRef.current = requestRender;
    controls.addEventListener('change', requestRender);

    const handleResize = () => {
      if (!mountEl) return;
      const w = mountEl.clientWidth || window.innerWidth;
      const h = mountEl.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    };
    window.addEventListener('resize', handleResize);

    requestRender();

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      controls.dispose();
      renderer.dispose();
    };
  }, [tasks.length, milestones.length]);

  const inspectedTask =
    tasks.find((t) => t.id === selectedTaskId) ?? tasks[0];

  return (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 w-screen h-screen bg-zinc-950 overflow-hidden'
          : 'relative w-full h-[calc(100vh-8.5rem)] min-h-[600px] bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden'
      }
      data-testid="threejs-topology-studio"
    >
      <div
        ref={canvasMountRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        aria-label="3D Spatial Project Dependency Topology Canvas"
      />

      {/* Minimal Top-Left Specification Header */}
      <div
        className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-4 px-4 py-2.5 rounded-lg border border-zinc-800 text-zinc-100 pointer-events-auto"
        style={{ backgroundColor: 'rgba(9, 9, 11, 0.94)' }}
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-zinc-400">
              Six Sigma DMAIC 3D Topology
            </span>
            <span className="text-zinc-600">·</span>
            <span className="text-xs tabular-nums text-zinc-300">
              5 DMAIC Pillars / {tasks.length} Work Package Pods
            </span>
          </div>
          <h2 className="text-sm font-semibold text-white">
            3D Critical Path & DMAIC Architecture
          </h2>
        </div>

        <div className="h-6 w-px bg-zinc-800 hidden sm:block" />

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleFullscreen}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-100 transition-colors whitespace-nowrap shrink-0"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                Exit Full Canvas
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                Full 100vw × 100vh Canvas
              </>
            )}
          </button>
        </div>
      </div>

      {/* Unified Collapsible Bottom Control Dock */}
      <div
        className="absolute inset-x-0 bottom-4 z-10 flex flex-col items-center px-3 transition-transform duration-200 pointer-events-none"
        style={{
          transform: dockCollapsed
            ? 'translateY(calc(100% - 34px))'
            : 'translateY(0)',
        }}
      >
        <div className="flex justify-center mb-1.5 pointer-events-auto">
          <button
            type="button"
            onClick={() => setDockCollapsed((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1 text-xs font-medium text-zinc-200 rounded-full border border-zinc-700 hover:border-white transition-colors whitespace-nowrap shrink-0"
            style={{ backgroundColor: 'rgba(9, 9, 11, 0.96)' }}
          >
            {dockCollapsed ? (
              <>
                <ChevronUp className="w-3.5 h-3.5 text-white" />
                Show 3D Studio Controls (H)
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5 text-white" />
                Hide Controls · Zen Mode (H)
              </>
            )}
          </button>
        </div>

        <div
          className="w-full max-w-[940px] rounded-xl border border-zinc-800 px-4 py-3 text-zinc-200 shadow-2xl pointer-events-auto"
          style={{ backgroundColor: 'rgba(9, 9, 11, 0.96)' }}
        >
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            <div className="md:col-span-4 flex flex-col gap-1 border-b md:border-b-0 md:border-r border-zinc-800 pb-2 md:pb-0 md:pr-3">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="topology-node-select"
                  className="text-[11px] font-medium text-zinc-400"
                >
                  Inspect Task Pod
                </label>
                <span className="text-[11px] tabular-nums text-zinc-300">
                  {tasks.length} Active Nodes
                </span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  id="topology-node-select"
                  value={selectedTaskId}
                  onChange={(e) => {
                    setSelectedTaskId(e.target.value);
                    onSelectTask?.(e.target.value);
                  }}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-white"
                >
                  {tasks.length === 0 ? (
                    <option value="">No tasks created yet</option>
                  ) : (
                    tasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        #{t.priorityIndex + 1} · {t.code} · {t.title.slice(0, 24)}
                      </option>
                    ))
                  )}
                </select>
                {inspectedTask && onUpdateTaskStatus && (
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateTaskStatus(
                        inspectedTask.id,
                        inspectedTask.status === 'Completed' ? 'In Progress' : 'Completed'
                      )
                    }
                    className="px-2.5 py-1.5 text-xs font-medium rounded-md bg-white hover:bg-zinc-200 text-black transition-colors whitespace-nowrap shrink-0"
                  >
                    {inspectedTask.status === 'Completed' ? 'Reopen' : 'Complete'}
                  </button>
                )}
              </div>
            </div>

            <div className="md:col-span-3 flex flex-col gap-1 border-b md:border-b-0 md:border-r border-zinc-800 pb-2 md:pb-0 md:pr-3">
              <div className="flex items-center justify-between text-xs">
                <label
                  htmlFor="exploded-elevation-slider"
                  className="text-[11px] font-medium text-zinc-400 flex items-center gap-1"
                >
                  <Sliders className="w-3 h-3 text-white" />
                  Dependency Tier Elevation
                </label>
                <span className="text-[11px] tabular-nums text-zinc-300">
                  {Math.round(explodedElevation * 100)}%
                </span>
              </div>
              <input
                id="exploded-elevation-slider"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={explodedElevation}
                onChange={(e) => setExplodedElevation(parseFloat(e.target.value))}
                className="w-full accent-white cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
              />
            </div>

            <div className="md:col-span-5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                {(
                  [
                    { id: 'isometric', label: 'Iso View' },
                    { id: 'top_matrix', label: 'Top DAG' },
                    { id: 'critical_focus', label: 'Critical' },
                    { id: 'milestone_orbit', label: 'DMAIC Pillars' },
                  ] as const
                ).map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleCameraPresetChange(preset.id)}
                    className={`px-2 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                      cameraPreset === preset.id
                        ? 'bg-white text-black'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setFinishPreset((prev) =>
                      prev === 'platinum'
                        ? 'obsidian'
                        : prev === 'obsidian'
                        ? 'studio_ceramic'
                        : 'platinum'
                    )
                  }
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium rounded-lg border border-zinc-700 bg-zinc-900 hover:border-zinc-500 text-zinc-200 transition-colors whitespace-nowrap shrink-0"
                  title="Cycle PBR Surface Finish"
                >
                  <Sparkles className="w-3 h-3 text-white" />
                  {finishPreset === 'platinum'
                    ? 'Platinum'
                    : finishPreset === 'obsidian'
                    ? 'Obsidian'
                    : 'Ceramic'}
                </button>

                <button
                  type="button"
                  onClick={() => setIsolateCriticalOnly((prev) => !prev)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                    isolateCriticalOnly
                      ? 'bg-white text-black border-white'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-zinc-500'
                  }`}
                >
                  <Layers className="w-3 h-3" />
                  {isolateCriticalOnly ? 'Critical Only' : 'All Chains'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setExplodedElevation(0.35);
                    setIsolateCriticalOnly(false);
                    handleCameraPresetChange('isometric');
                  }}
                  aria-label="Reset 3D View"
                  className="p-1.5 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
