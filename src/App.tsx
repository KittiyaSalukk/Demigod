/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { 
  Keyboard, 
  Gamepad2, 
  SlidersHorizontal, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Play, 
  Tv, 
  Flame, 
  Zap, 
  MousePointerClick, 
  MessageSquare,
  HelpCircle,
  X,
  Compass,
  ArrowRight,
  RefreshCw,
  Award,
  Heart,
  Skull,
  RotateCw,
  Trophy,
  Crown
} from 'lucide-react';
import { 
  playHoverSound, 
  playSelectSound, 
  playRebindStartSound, 
  playRebindSuccessSound, 
  playAttackSound, 
  playDashSound, 
  playInteractSound, 
  playErrorSound,
  playPowerExplosionSound,
  playDanceMusic,
  playBossSpawnSound,
  playFireballSound,
  setVolume,
  getVolume
} from './utils/audio';

// Key Bindings structure
interface KeyBinding {
  id: string;
  label: string;
  key: string;
}

const DEFAULT_BINDINGS: KeyBinding[] = [
  { id: 'move_forward', label: 'Move Forward', key: 'w' },
  { id: 'move_left', label: 'Move Left', key: 'a' },
  { id: 'move_backward', label: 'Move Backward', key: 's' },
  { id: 'move_right', label: 'Move Right', key: 'd' },
  { id: 'attack', label: 'Attack / Punch (P)', key: 'p' },
  { id: 'skill', label: 'Ultimate Ring (O)', key: 'o' },
  { id: 'dance', label: 'Dance (K)', key: 'k' },
];

const PRESETS = {
  wasd: [
    { id: 'move_forward', label: 'Move Forward', key: 'w' },
    { id: 'move_left', label: 'Move Left', key: 'a' },
    { id: 'move_backward', label: 'Move Backward', key: 's' },
    { id: 'move_right', label: 'Move Right', key: 'd' },
    { id: 'attack', label: 'Attack / Punch (P)', key: 'p' },
    { id: 'skill', label: 'Ultimate Ring (O)', key: 'o' },
    { id: 'dance', label: 'Dance (K)', key: 'k' },
  ],
  arrows: [
    { id: 'move_forward', label: 'Move Forward', key: 'ArrowUp' },
    { id: 'move_left', label: 'Move Left', key: 'ArrowLeft' },
    { id: 'move_backward', label: 'Move Backward', key: 'ArrowDown' },
    { id: 'move_right', label: 'Move Right', key: 'ArrowRight' },
    { id: 'attack', label: 'Attack / Punch (P)', key: 'p' },
    { id: 'skill', label: 'Ultimate Ring (O)', key: 'o' },
    { id: 'dance', label: 'Dance (K)', key: 'k' },
  ]
};

// Lore/Tips messages
const LORE_MESSAGES = [
  "โชคชะตาของเจ้าจะเปิดเผยเมื่อกวัดแกว่งพลังต่อสู้ (Thy fate unfolds as you swing the celestial punches!)",
  "วงแหวนอัคคีระเบิดพลัง (Skill O) จะผลักศัตรูทั้งหมดและสร้างความเสียหายรุนแรง! (The Golden Circle unleashes massive shockwaves!)",
  "เก็บขวดยาสีแดงเพื่อเติมพลังชีวิตที่หายไป (Gather red potions scattered across the arena to heal!)",
  "ศัตรูจะหันมาโจมตีคุณอย่างต่อเนื่อง หลบหลีกด้วยการเดิน 8 ทิศทาง! (Fierce enemies march to attack. Slip away using 8-way steps!)",
  "โจมตีศัตรูครั้งแรกจะกระเด็นถอยหลัง ครั้งสองจะลอยกระเด็นหายลับขอบฟ้า! (First strike knocks them back, second sends them to orbit!)",
  "เมื่อเจ้ากดปุ่มเต้นรำ [K] ตัวละครจะร่ายรำเพิ่มพูนพลังและโชคลาภ (When thou dancest, a celestial rhythm rises!)"
];

// Enemy interface
interface GameEnemy {
  id: number;
  mesh: THREE.Group;
  texture: THREE.Texture;
  x: number;
  z: number;
  hp: number; // Max 2
  speed: number;
  isFlipped: boolean;
  row: number; // 0: Stand, 1: Walk
  col: number; // frame 0-3
  frameTimer: number;
  knockbackX: number;
  knockbackZ: number;
  knockbackDuration: number;
  isAttacking: boolean;
  attackCooldown: number;
  damageFlashTimer: number;
  colorState: 'normal' | 'red' | 'white';
  isDead: boolean;
  deadVelocityX: number;
  deadVelocityY: number;
  deadVelocityZ: number;
}

// Potion interface
interface GamePotion {
  id: number;
  mesh: THREE.Mesh;
  x: number;
  z: number;
  floatOffset: number;
}

export default function App() {
  // Game state controllers
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover' | 'ending'>('menu');
  const [bossHP, setBossHP] = useState<number>(10);
  const [bossActive, setBossActive] = useState<boolean>(false);
  const [activeMenuPanel, setActiveMenuPanel] = useState<'controls' | 'settings' | 'help'>('controls');

  // Custom Controls config
  const [keyBindings, setKeyBindings] = useState<KeyBinding[]>(() => {
    try {
      const saved = localStorage.getItem('game_key_bindings_3d_v2');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_BINDINGS;
  });
  const [activeBindingId, setActiveBindingId] = useState<string | null>(null);
  const [controlPreset, setControlPreset] = useState<'wasd' | 'arrows' | 'custom'>('wasd');

  // Audio and Graphics Options
  const [soundVolume, setSoundVolume] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('game_volume_3d_v2');
      if (saved !== null) {
        const v = parseFloat(saved);
        setVolume(v);
        return v;
      }
    } catch {}
    return 0.5;
  });
  const [enableFog, setEnableFog] = useState<boolean>(true);
  const [enableScanlines, setEnableScanlines] = useState<boolean>(true);
  const [enableCrtFlicker, setEnableCrtFlicker] = useState<boolean>(false);
  const [enableGrid, setEnableGrid] = useState<boolean>(true);

  // Gameplay HUD variables
  const [playerHP, setPlayerHP] = useState<number>(5);
  const [kills, setKills] = useState<number>(0);
  const [potionCollected, setPotionCollected] = useState<number>(0);
  const [skillCooldown, setSkillCooldown] = useState<number>(0); // 0 to 100
  const [activeMessage, setActiveMessage] = useState<string>(LORE_MESSAGES[0]);

  // Canvas and game loop refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const keysPressedRef = useRef<Set<string>>(new Set());

  // Ground plane constants
  const ARENA_SIZE = 50;

  // Game elements reference for update loop (to avoid closure lags on frame updates)
  const gameRef = useRef<{
    player: {
      x: number;
      z: number;
      vx: number;
      vz: number;
      speed: number;
      row: number; // 0: Idle, 1: Walk, 2: Attack, 3: Dance
      col: number; // 0-3
      frameTimer: number;
      isFlipped: boolean;
      hp: number;
      attackTimer: number; // triggers attack frame rate
      skillTimer: number; // expanding ultimate ring
      danceTimer: number; // lock movement when dancing
      invulnFrames: number; // blink on damage
    };
    enemies: GameEnemy[];
    potions: GamePotion[];
    scene: THREE.Scene | null;
    camera: THREE.PerspectiveCamera | null;
    renderer: THREE.WebGLRenderer | null;
    playerMesh: THREE.Group | null;
    playerTexture: THREE.Texture | null;
    playerMaterial: THREE.MeshBasicMaterial | null;
    ultimateRingMesh: THREE.Mesh | null;
    hitboxVisualMesh: THREE.Mesh | null;
    particles: {
      mesh: THREE.Mesh;
      vx: number;
      vy: number;
      vz: number;
      life: number;
      maxLife: number;
    }[];
    screenShake: number;
    potionTexture: THREE.Texture | null;
    enemyTextureSource: string;
    potionTextureSource: string;
    boss: {
      active: boolean;
      mesh: THREE.Group | null;
      texture: THREE.Texture | null;
      x: number;
      z: number;
      hp: number;
      maxHp: number;
      speed: number;
      state: 'idle' | 'dash' | 'warning' | 'shoot' | 'dead';
      stateTimer: number;
      row: number; // 0: Stand/Idle, 1: Walk/Dash/Attack
      col: number; // 0-3
      frameTimer: number;
      isFlipped: boolean;
      damageFlashTimer: number;
      colorState: 'normal' | 'red' | 'white';
      dashTargetX: number;
      dashTargetZ: number;
      pulseTimer: number;
    } | null;
    fireballs: {
      mesh: THREE.Mesh;
      targetX: number;
      targetZ: number;
      currentX: number;
      currentY: number;
      currentZ: number;
      vy: number;
      indicatorMesh: THREE.Mesh;
      life: number;
      maxLife: number;
    }[];
    warpDoor: {
      active: boolean;
      mesh: THREE.Group | null;
      x: number;
      z: number;
      pulseTimer: number;
    };
    enemySpawnTimer: number;
  }>({
    player: {
      x: 0,
      z: 0,
      vx: 0,
      vz: 0,
      speed: 0.15,
      row: 0,
      col: 0,
      frameTimer: 0,
      isFlipped: false,
      hp: 5,
      attackTimer: 0,
      skillTimer: 0,
      danceTimer: 0,
      invulnFrames: 0,
    },
    enemies: [],
    potions: [],
    scene: null,
    camera: null,
    renderer: null,
    playerMesh: null,
    playerTexture: null,
    playerMaterial: null,
    ultimateRingMesh: null,
    hitboxVisualMesh: null,
    particles: [],
    screenShake: 0,
    potionTexture: null,
    enemyTextureSource: "https://raw.githubusercontent.com/banyapon/banyapon.github.io/refs/heads/main/studio/images/enemy.png",
    potionTextureSource: "https://raw.githubusercontent.com/banyapon/banyapon.github.io/refs/heads/main/studio/images/potion.png",
    boss: null,
    fireballs: [],
    warpDoor: {
      active: false,
      mesh: null,
      x: 0,
      z: 0,
      pulseTimer: 0
    },
    enemySpawnTimer: 1.5,
  });

  // Background floating embers
  const [bgEmbers, setBgEmbers] = useState<{ id: number; left: number; size: number; delay: number; duration: number }[]>([]);

  useEffect(() => {
    // Background dust embers for modern dark styling
    const embers = Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: Math.random() * 3 + 2,
      delay: Math.random() * 4,
      duration: Math.random() * 8 + 6,
    }));
    setBgEmbers(embers);

    // Swap lore tips every 8 seconds
    const interval = setInterval(() => {
      const idx = Math.floor(Math.random() * LORE_MESSAGES.length);
      setActiveMessage(LORE_MESSAGES[idx]);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Format visual key binds nicely
  const formatKeyLabel = (key: string): string => {
    if (key === ' ') return 'SPACE';
    if (key === 'ArrowUp') return '▲ UP';
    if (key === 'ArrowDown') return '▼ DOWN';
    if (key === 'ArrowLeft') return '◀ LEFT';
    if (key === 'ArrowRight') return '▶ RIGHT';
    if (key === 'Shift') return 'SHIFT';
    return key.toUpperCase();
  };

  // Keyboard interceptors
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Rebinding interceptor
      if (activeBindingId) {
        e.preventDefault();
        if (e.key === 'Escape') {
          setActiveBindingId(null);
          playErrorSound();
          return;
        }

        const updated = keyBindings.map(b => {
          if (b.id === activeBindingId) return { ...b, key: e.key };
          return b;
        });
        setKeyBindings(updated);
        localStorage.setItem('game_key_bindings_3d_v2', JSON.stringify(updated));
        setActiveBindingId(null);
        setControlPreset('custom');
        playRebindSuccessSound();
        return;
      }

      keysPressedRef.current.add(e.key.toLowerCase());
      keysPressedRef.current.add(e.key); // keep original for uppercase keys like ArrowUp
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressedRef.current.delete(e.key.toLowerCase());
      keysPressedRef.current.delete(e.key);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [activeBindingId, keyBindings]);

  // Options Handlers
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setSoundVolume(vol);
    setVolume(vol);
    localStorage.setItem('game_volume_3d_v2', vol.toString());
    playHoverSound();
  };

  const handlePresetSelect = (presetKey: 'wasd' | 'arrows') => {
    const preset = PRESETS[presetKey];
    setKeyBindings(preset);
    localStorage.setItem('game_key_bindings_3d_v2', JSON.stringify(preset));
    setControlPreset(presetKey);
    playSelectSound();
  };

  const handleResetDefaults = () => {
    setKeyBindings(DEFAULT_BINDINGS);
    localStorage.setItem('game_key_bindings_3d_v2', JSON.stringify(DEFAULT_BINDINGS));
    setControlPreset('wasd');
    playSelectSound();
  };

  // Trigger main gameplay mode
  const startGame = () => {
    playSelectSound();
    setGameState('playing');
    setPlayerHP(5);
    setKills(0);
    setPotionCollected(0);
    setSkillCooldown(0);
    setBossHP(10);
    setBossActive(false);

    // Reset runtime game parameters
    const state = gameRef.current;
    state.player.hp = 5;
    state.player.x = 0;
    state.player.z = 0;
    state.player.vx = 0;
    state.player.vz = 0;
    state.player.row = 0;
    state.player.col = 0;
    state.player.frameTimer = 0;
    state.player.attackTimer = 0;
    state.player.skillTimer = 0;
    state.player.danceTimer = 0;
    state.player.invulnFrames = 0;
    state.enemies = [];
    state.potions = [];
    state.particles = [];
    state.boss = null;
    state.fireballs = [];
    state.warpDoor = {
      active: false,
      mesh: null,
      x: 0,
      z: 0,
      pulseTimer: 0
    };
    state.enemySpawnTimer = 1.5;
  };

  // Trigger return to menu
  const returnToMenu = () => {
    playSelectSound();
    setGameState('menu');
  };

  // Main ThreeJS engine builder and update frame loop
  useEffect(() => {
    if (gameState !== 'playing' || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const state = gameRef.current;

    // --- 1. SETUP THREE.JS SCENE & CAMERA ---
    const scene = new THREE.Scene();
    state.scene = scene;

    if (enableFog) {
      scene.background = new THREE.Color('#050508');
      scene.fog = new THREE.FogExp2('#050508', 0.04);
    } else {
      scene.background = new THREE.Color('#030305');
    }

    const camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    state.camera = camera;
    
    // Position camera overlooking scene beautifully
    camera.position.set(0, 8, 12);
    camera.lookAt(0, 0, 0);

    // --- 2. WEBGR_RENDERER CREATION ---
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    state.renderer = renderer;

    // --- 3. DYNAMIC LIGHTING & SHADOWCAST ---
    const ambientLight = new THREE.AmbientLight('#d4af37', 0.45);
    scene.add(ambientLight);

    // Secondary soft cool fill light from behind
    const hemiLight = new THREE.HemisphereLight('#3b82f6', '#050508', 0.25);
    scene.add(hemiLight);

    // Direct sun-like golden light casting shadows
    const dirLight = new THREE.DirectionalLight('#ffffff', 1.25);
    dirLight.position.set(12, 18, 12);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 50;
    const d = 15;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    scene.add(dirLight);

    // --- 4. GROUND CREATION WITH TEXTURE TILING ---
    const textureLoader = new THREE.TextureLoader();
    
    // Loaded Ground texture
    const groundTexture = textureLoader.load(
      'https://res.cloudinary.com/dsucg33fv/image/upload/v1782439980/ground_d1kjrx.png',
      (tex) => {
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        // Tile the ground plane nicely (repeat size 20 x 20)
        tex.repeat.set(20, 20);
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
      }
    );

    const groundGeo = new THREE.PlaneGeometry(ARENA_SIZE, ARENA_SIZE);
    const groundMat = new THREE.MeshStandardMaterial({
      map: groundTexture,
      roughness: 0.8,
      metalness: 0.2,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Arena boundary walls (visual dark pillars or gold lines)
    if (enableGrid) {
      const gridHelper = new THREE.GridHelper(ARENA_SIZE, ARENA_SIZE, '#d4af37', '#1a1a2e');
      gridHelper.position.y = 0.01;
      scene.add(gridHelper);
    }

    // --- 5. IMMERSIVE ENVIRONMENT PROPS (ANCIENT OBELISKS) ---
    // Beautiful monolith standing in the center
    const obeliskGroup = new THREE.Group();
    obeliskGroup.position.set(0, 0, -4);
    
    // Pedestal
    const baseGeo = new THREE.BoxGeometry(2, 0.4, 2);
    const darkRockMat = new THREE.MeshStandardMaterial({ color: '#16161f', roughness: 0.9 });
    const baseMesh = new THREE.Mesh(baseGeo, darkRockMat);
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    obeliskGroup.add(baseMesh);

    // Monolith Pillar tapered
    const pillarGeo = new THREE.CylinderGeometry(0.5, 0.8, 3.5, 4);
    const pillarMesh = new THREE.Mesh(pillarGeo, darkRockMat);
    pillarMesh.position.y = 1.95;
    pillarMesh.rotation.y = Math.PI / 4;
    pillarMesh.castShadow = true;
    pillarMesh.receiveShadow = true;
    obeliskGroup.add(pillarMesh);

    // Glowing golden crystal core atop obelisk
    const crystalGeo = new THREE.OctahedronGeometry(0.4, 0);
    const crystalMat = new THREE.MeshStandardMaterial({
      color: '#d4af37',
      emissive: '#d4af37',
      emissiveIntensity: 1.5,
      roughness: 0.1
    });
    const crystalMesh = new THREE.Mesh(crystalGeo, crystalMat);
    crystalMesh.position.y = 4.1;
    obeliskGroup.add(crystalMesh);

    scene.add(obeliskGroup);

    // --- 6. PLAYER CHARACTER BILLBOARD GENERATION ---
    const playerTex = textureLoader.load(
      'https://raw.githubusercontent.com/banyapon/banyapon.github.io/refs/heads/main/studio/images/player.png',
      (tex) => {
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        // 4 Columns, 4 Rows -> Each frame is 1/4 of texture width/height
        tex.repeat.set(0.25, 0.25);
        tex.minFilter = THREE.NearestFilter;
        tex.magFilter = THREE.NearestFilter;
      }
    );
    state.playerTexture = playerTex;

    // We represent the 2D billboard using a Plane geometry inside a Group to raise anchor point
    const playerGroup = new THREE.Group();
    playerGroup.position.set(0, 0, 0);

    const playerMat = new THREE.MeshBasicMaterial({
      map: playerTex,
      transparent: true,
      alphaTest: 0.5, // Crisp solid borders for 2D retro sprite look
      side: THREE.DoubleSide,
    });
    state.playerMaterial = playerMat;

    // Height offset so anchor point is at feet
    const playerPlaneGeo = new THREE.PlaneGeometry(2.5, 2.5);
    const pMesh = new THREE.Mesh(playerPlaneGeo, playerMat);
    pMesh.position.y = 1.25; // center is at half of height
    pMesh.castShadow = true;
    playerGroup.add(pMesh);
    scene.add(playerGroup);
    state.playerMesh = playerGroup;

    // Shadow catcher helper disk underneath player feet
    const shadowGeo = new THREE.RingGeometry(0.01, 0.7, 16);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: '#000000',
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide
    });
    const footShadow = new THREE.Mesh(shadowGeo, shadowMat);
    footShadow.rotation.x = -Math.PI / 2;
    footShadow.position.y = 0.02;
    playerGroup.add(footShadow);

    // --- 7. ULTIMATE SKILL SHOCKWAVE VISUAL MESH ---
    // Create an golden expanding circle ring on the floor
    const ringGeo = new THREE.RingGeometry(0.1, 1, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: '#d4af37',
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    const ultRing = new THREE.Mesh(ringGeo, ringMat);
    ultRing.rotation.x = -Math.PI / 2;
    ultRing.position.y = 0.04;
    scene.add(ultRing);
    state.ultimateRingMesh = ultRing;

    // --- 8. ATTACK PUNCH HITBOX VISUAL SLICE MESH ---
    // Semicircular slash blade that slices when punching
    const hitboxGeo = new THREE.RingGeometry(0.8, 1.8, 32, 1, 0, Math.PI);
    const hitboxMat = new THREE.MeshBasicMaterial({
      color: '#fbf5b7',
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    const punchSlash = new THREE.Mesh(hitboxGeo, hitboxMat);
    punchSlash.rotation.x = -Math.PI / 2;
    punchSlash.position.y = 0.3;
    scene.add(punchSlash);
    state.hitboxVisualMesh = punchSlash;

    // Preload Potion Texture to reuse
    const potTex = textureLoader.load(
      state.potionTextureSource,
      (tex) => {
        tex.minFilter = THREE.NearestFilter;
        tex.magFilter = THREE.NearestFilter;
      }
    );
    state.potionTexture = potTex;

    // --- Active Kills tracking variables to prevent React closure lag ---
    let activeKills = 0;
    let bossSpawned = false;

    // --- Spawn initial potions and enemies ---
    for (let i = 0; i < 3; i++) {
      spawnPotionAtRandom();
    }
    for (let i = 0; i < 2; i++) {
      spawnEnemyAtRandom();
    }

    // --- Helper to Spawn Potions ---
    function spawnPotionAtRandom() {
      if (!scene || !state.potionTexture) return;

      const pId = Math.floor(Math.random() * 1000000);
      const px = (Math.random() - 0.5) * (ARENA_SIZE - 10);
      const pz = (Math.random() - 0.5) * (ARENA_SIZE - 10);

      const pGeo = new THREE.PlaneGeometry(1.2, 1.2);
      const pMat = new THREE.MeshBasicMaterial({
        map: state.potionTexture,
        transparent: true,
        alphaTest: 0.4,
        side: THREE.DoubleSide
      });
      const mesh = new THREE.Mesh(pGeo, pMat);
      mesh.position.set(px, 0.6, pz);
      scene.add(mesh);

      // Simple circular shadow ring under potion
      const pShadowGeo = new THREE.RingGeometry(0.01, 0.35, 8);
      const pShadowMat = new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.3 });
      const pShadow = new THREE.Mesh(pShadowGeo, pShadowMat);
      pShadow.rotation.x = -Math.PI / 2;
      pShadow.position.y = -0.58; // relative to parent mesh
      mesh.add(pShadow);

      state.potions.push({
        id: pId,
        mesh,
        x: px,
        z: pz,
        floatOffset: Math.random() * 10
      });
    }

    // --- Helper to Spawn Enemies ---
    function spawnEnemyAtRandom() {
      if (!scene) return;

      // Spawn at a perimeter distance away from player
      const angle = Math.random() * Math.PI * 2;
      const radius = 12 + Math.random() * 8;
      const ex = state.player.x + Math.cos(angle) * radius;
      const ez = state.player.z + Math.sin(angle) * radius;

      // Restrict within arena boundaries
      const clampedX = Math.max(-ARENA_SIZE/2 + 3, Math.min(ARENA_SIZE/2 - 3, ex));
      const clampedZ = Math.max(-ARENA_SIZE/2 + 3, Math.min(ARENA_SIZE/2 - 3, ez));

      const enemyTex = textureLoader.load(
        state.enemyTextureSource,
        (tex) => {
          tex.wrapS = THREE.ClampToEdgeWrapping;
          tex.wrapT = THREE.ClampToEdgeWrapping;
          tex.repeat.set(0.25, 0.5); // 2 rows (Stand, Walk) and 4 columns
          tex.minFilter = THREE.NearestFilter;
          tex.magFilter = THREE.NearestFilter;
        }
      );

      const enemyMat = new THREE.MeshBasicMaterial({
        map: enemyTex,
        transparent: true,
        alphaTest: 0.5,
        side: THREE.DoubleSide
      });

      const enemyGroup = new THREE.Group();
      enemyGroup.position.set(clampedX, 0, clampedZ);

      const eMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.3), enemyMat);
      eMesh.position.y = 1.15; // Raised so feet touch floor
      eMesh.castShadow = true;
      enemyGroup.add(eMesh);

      // Shadow catching ring under enemy
      const eShadow = new THREE.Mesh(
        new THREE.RingGeometry(0.01, 0.65, 12),
        new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.4 })
      );
      eShadow.rotation.x = -Math.PI / 2;
      eShadow.position.y = 0.02;
      enemyGroup.add(eShadow);

      scene.add(enemyGroup);

      state.enemies.push({
        id: Math.floor(Math.random() * 1000000),
        mesh: enemyGroup,
        texture: enemyTex,
        x: clampedX,
        z: clampedZ,
        hp: 2, // 2 hits to defeat!
        speed: 0.04 + Math.random() * 0.02,
        isFlipped: false,
        row: 1, // Start walking towards player
        col: 0,
        frameTimer: 0,
        knockbackX: 0,
        knockbackZ: 0,
        knockbackDuration: 0,
        isAttacking: false,
        attackCooldown: 0,
        damageFlashTimer: 0,
        colorState: 'normal',
        isDead: false,
        deadVelocityX: 0,
        deadVelocityY: 0,
        deadVelocityZ: 0
      });
    }

    // --- Helper to Spawn Boss ---
    function spawnBoss() {
      if (!scene || state.boss) return;

      playBossSpawnSound();
      state.screenShake = 6.0;
      setBossActive(true);
      setBossHP(10);

      // Spawn at a perimeter distance
      const bx = state.player.x + 12;
      const bz = state.player.z - 12;
      const clampedX = Math.max(-ARENA_SIZE/2 + 5, Math.min(ARENA_SIZE/2 - 5, bx));
      const clampedZ = Math.max(-ARENA_SIZE/2 + 5, Math.min(ARENA_SIZE/2 - 5, bz));

      const bossTex = textureLoader.load(
        'https://res.cloudinary.com/dsucg33fv/image/upload/v1782709455/boss_e8jti1.png',
        (tex) => {
          tex.wrapS = THREE.ClampToEdgeWrapping;
          tex.wrapT = THREE.ClampToEdgeWrapping;
          tex.repeat.set(0.25, 0.5); // 4 columns, 2 rows
          tex.minFilter = THREE.NearestFilter;
          tex.magFilter = THREE.NearestFilter;
        }
      );

      const bossMat = new THREE.MeshBasicMaterial({
        map: bossTex,
        transparent: true,
        alphaTest: 0.5,
        side: THREE.DoubleSide
      });

      const bossGroup = new THREE.Group();
      bossGroup.position.set(clampedX, 0, clampedZ);

      const bMesh = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.2), bossMat);
      bMesh.position.y = 2.1; // Float 2.1 above ground
      bMesh.castShadow = true;
      bossGroup.add(bMesh);

      // Shadow catcher ring under boss
      const bShadow = new THREE.Mesh(
        new THREE.RingGeometry(0.01, 1.2, 16),
        new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.5 })
      );
      bShadow.rotation.x = -Math.PI / 2;
      bShadow.position.y = 0.02;
      bossGroup.add(bShadow);

      scene.add(bossGroup);

      state.boss = {
        active: true,
        mesh: bossGroup,
        texture: bossTex,
        x: clampedX,
        z: clampedZ,
        hp: 10,
        maxHp: 10,
        speed: 0.08,
        state: 'idle',
        stateTimer: 1.5,
        row: 0,
        col: 0,
        frameTimer: 0,
        isFlipped: false,
        damageFlashTimer: 0,
        colorState: 'normal',
        dashTargetX: 0,
        dashTargetZ: 0,
        pulseTimer: 0
      };

      // Spawn fire sparkles
      spawnParticles(clampedX, 1.5, clampedZ, '#ff6600', 30, 2);
    }

    // --- Helper to Spawn Warp Door ---
    function spawnWarpDoor(wx: number, wz: number) {
      if (!scene || state.warpDoor.active) return;

      const doorGroup = new THREE.Group();
      doorGroup.position.set(wx, 0.05, wz);

      // Outer golden portal ring on ground
      const ringGeo = new THREE.RingGeometry(1.2, 1.4, 32);
      const ringMat = new THREE.MeshBasicMaterial({ color: '#d4af37', side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = -Math.PI / 2;
      doorGroup.add(ringMesh);

      // Vertical spinning core
      const coreGeo = new THREE.TorusGeometry(1.0, 0.15, 8, 32);
      const coreMat = new THREE.MeshBasicMaterial({ color: '#ffaa00', transparent: true, opacity: 0.9 });
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      coreMesh.position.y = 1.2;
      doorGroup.add(coreMesh);

      scene.add(doorGroup);

      state.warpDoor = {
        active: true,
        mesh: doorGroup,
        x: wx,
        z: wz,
        pulseTimer: 0
      };

      // Sparkles around warp door
      spawnParticles(wx, 1.0, wz, '#d4af37', 25, 1.5);
    }

    // --- Helper to Spawn Particle Sprites ---
    function spawnParticles(px: number, py: number, pz: number, colorHex: string, count = 10, customVel = 1) {
      if (!scene) return;
      
      const pGeo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
      const pMat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 1.0 });

      for (let i = 0; i < count; i++) {
        const pMesh = new THREE.Mesh(pGeo, pMat.clone());
        pMesh.position.set(
          px + (Math.random() - 0.5) * 0.5,
          py + (Math.random() - 0.5) * 0.5,
          pz + (Math.random() - 0.5) * 0.5
        );
        scene.add(pMesh);

        state.particles.push({
          mesh: pMesh,
          vx: (Math.random() - 0.5) * 0.15 * customVel,
          vy: (Math.random() * 0.2 + 0.1) * customVel,
          vz: (Math.random() - 0.5) * 0.15 * customVel,
          life: 25 + Math.floor(Math.random() * 15),
          maxLife: 40
        });
      }
    }

    // Key bindings mapper checker
    const checkKeyPressed = (actionId: string) => {
      const bound = keyBindings.find(b => b.id === actionId);
      if (!bound) return false;
      return keysPressedRef.current.has(bound.key) || 
             keysPressedRef.current.has(bound.key.toLowerCase()) ||
             keysPressedRef.current.has(bound.key.toUpperCase());
    };

    // --- 9. FRAME TICK LOOP RENDER ---
    let frameId: number;
    let clock = new THREE.Clock();

    const tick = () => {
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      const p = state.player;

      // Handle Skill Cooldown ticker in UI
      setSkillCooldown(prev => {
        if (prev > 0) return Math.max(0, prev - delta * 20); // ticks down slowly
        return 0;
      });

      // --- SCREEN SHAKE SHIFT ---
      if (state.screenShake > 0) {
        state.screenShake -= 0.1;
        if (state.screenShake < 0) state.screenShake = 0;
        const shakePower = state.screenShake * 0.25;
        camera.position.x += (Math.random() - 0.5) * shakePower;
        camera.position.y += (Math.random() - 0.5) * shakePower;
      }

      // --- 1. MOVEMENT INPUTS ---
      let dx = 0;
      let dz = 0;

      // Block normal inputs if attacking or dancing
      const isInputLocked = p.attackTimer > 0 || p.danceTimer > 0;

      if (!isInputLocked) {
        if (checkKeyPressed('move_forward')) dz -= 1;
        if (checkKeyPressed('move_backward')) dz += 1;
        if (checkKeyPressed('move_left')) dx -= 1;
        if (checkKeyPressed('move_right')) dx += 1;
      }

      // Normalize diagonal vectors
      if (dx !== 0 && dz !== 0) {
        dx *= 0.7071;
        dz *= 0.7071;
      }

      // Apply speeds
      p.vx = dx * p.speed;
      p.vz = dz * p.speed;

      p.x += p.vx;
      p.z += p.vz;

      // Bound clamp check within Arena Plane 50
      const limit = ARENA_SIZE / 2 - 1.5;
      p.x = Math.max(-limit, Math.min(limit, p.x));
      p.z = Math.max(-limit, Math.min(limit, p.z));

      // Push updated player mesh position
      if (state.playerMesh) {
        state.playerMesh.position.set(p.x, 0, p.z);
        // Force billboard sprites to always perfectly face the active camera
        state.playerMesh.rotation.y = camera.rotation.y;
      }

      // Handle Player Blink damage vulnerability frame counting
      if (p.invulnFrames > 0) {
        p.invulnFrames--;
        if (state.playerMaterial) {
          // Toggle blinking transparency
          state.playerMaterial.opacity = (Math.floor(p.invulnFrames / 3) % 2 === 0) ? 0.3 : 1.0;
        }
      } else {
        if (state.playerMaterial) state.playerMaterial.opacity = 1.0;
      }

      // --- 2. ACTION TRIGGER KEYS: PUNCH (P) & ULTIMATE (O) & DANCE (K) ---
      
      // A. ATTACK / PUNCH (P KEY)
      if (checkKeyPressed('attack') && p.attackTimer <= 0 && p.danceTimer <= 0) {
        p.attackTimer = 18; // Lock inputs during strike frames
        p.row = 2; // Row 3 (index 2): Attack Animation
        p.col = 0;
        p.frameTimer = 0;
        playAttackSound();
        state.screenShake = 1.5;

        // Position hitbox visual slice in front of player direction
        if (state.hitboxVisualMesh && state.playerMesh) {
          state.hitboxVisualMesh.position.set(
            p.x + (p.isFlipped ? -1.8 : 1.8),
            0.6,
            p.z
          );
          state.hitboxVisualMesh.rotation.z = p.isFlipped ? Math.PI : 0;
          state.hitboxVisualMesh.scale.set(0.1, 0.1, 0.1);
        }

        // --- ATTACK RANGE CHECK (HIT ENEMIES) ---
        // Hitbox range of the punch: 3.2 units in front
        state.enemies.forEach(enemy => {
          if (enemy.isDead) return;
          const distToEnemy = Math.hypot(p.x - enemy.x, p.z - enemy.z);
          
          // Check if enemy is in proximity and correct horizontal quadrant
          const isPlayerFacingLeft = p.isFlipped;
          const isEnemyToLeft = enemy.x < p.x;
          const isFacingCorrectly = (isPlayerFacingLeft && isEnemyToLeft) || (!isPlayerFacingLeft && !isEnemyToLeft);

          if (distToEnemy < 3.2 && (isFacingCorrectly || distToEnemy < 1.4)) {
            // DMG Triggered!
            enemy.hp--;
            playRebindSuccessSound();
            spawnParticles(enemy.x, 1.0, enemy.z, '#ff4444', 12);

            if (enemy.hp === 1) {
              // FIRST HIT: Knockback enemy backwards
              const knockDirX = isPlayerFacingLeft ? -1 : 1;
              enemy.knockbackX = knockDirX * 0.45;
              enemy.knockbackZ = (Math.random() - 0.5) * 0.2;
              enemy.knockbackDuration = 12; // active knockback frames
              enemy.damageFlashTimer = 15;
              enemy.colorState = 'red';
              state.screenShake = 2.0;
            } else if (enemy.hp <= 0) {
              // SECOND HIT: Defeated! Rocket launch out of the screen
              enemy.isDead = true;
              enemy.deadVelocityX = (p.isFlipped ? -0.4 : 0.4);
              enemy.deadVelocityY = 0.55; // fly upwards in air!
              enemy.deadVelocityZ = (Math.random() - 0.5) * 0.3;
              enemy.damageFlashTimer = 30; // Flash white rapidly
              enemy.colorState = 'white';
              state.screenShake = 4.0;
              
              activeKills++;
              setKills(activeKills);
              if (activeKills >= 10 && !bossSpawned) {
                bossSpawned = true;
                spawnBoss();
              }
            }
          }
        });

        // Hit check on Boss
        if (state.boss && state.boss.state !== 'dead') {
          const boss = state.boss;
          const distToBoss = Math.hypot(p.x - boss.x, p.z - boss.z);
          const isPlayerFacingLeft = p.isFlipped;
          const isBossToLeft = boss.x < p.x;
          const isFacingCorrectly = (isPlayerFacingLeft && isBossToLeft) || (!isPlayerFacingLeft && !isBossToLeft);

          if (distToBoss < 3.8 && (isFacingCorrectly || distToBoss < 1.8)) {
            // DMG Triggered on Boss!
            boss.hp--;
            setBossHP(boss.hp);
            playRebindSuccessSound();
            spawnParticles(boss.x, 2.0, boss.z, '#ff3333', 18, 1.5);
            boss.damageFlashTimer = 15;
            boss.colorState = 'red';
            state.screenShake = 3.0;

            if (boss.hp <= 0) {
              boss.state = 'dead';
              boss.colorState = 'white';
              boss.damageFlashTimer = 60;
              playPowerExplosionSound();
              state.screenShake = 7.0;
              // Spawn some grand explosion particles
              spawnParticles(boss.x, 2.1, boss.z, '#ff6600', 50, 2.5);
              spawnParticles(boss.x, 2.1, boss.z, '#d4af37', 50, 2.0);
              
              // Spawn Warp Door right where the boss dies!
              spawnWarpDoor(boss.x, boss.z);
            }
          }
        }
      }

      // B. ULTIMATE EXPANDING SHOCKWAVE (O KEY)
      if (checkKeyPressed('skill') && p.skillTimer <= 0 && p.danceTimer <= 0) {
        // Run only if cooldown is zero
        const isCooldownActive = document.getElementById('skill-cooldown-badge');
        // Let's set cool down trigger
        setSkillCooldown(100); // Reset progress gauge
        p.skillTimer = 35; // Expands for 35 frames
        playPowerExplosionSound();
        state.screenShake = 3.5;

        // Position shockwave ring under player feet
        if (state.ultimateRingMesh) {
          state.ultimateRingMesh.position.set(p.x, 0.05, p.z);
          state.ultimateRingMesh.scale.set(0.1, 0.1, 0.1);
        }

        // Damage all nearby enemies
        state.enemies.forEach(enemy => {
          if (enemy.isDead) return;
          const distToEnemy = Math.hypot(p.x - enemy.x, p.z - enemy.z);
          if (distToEnemy < 7.5) {
            enemy.hp -= 2; // Massive damage instant defeat
            playRebindSuccessSound();
            spawnParticles(enemy.x, 1.2, enemy.z, '#d4af37', 20, 2);

            // Fly outwards in explosion direction
            enemy.isDead = true;
            const angle = Math.atan2(enemy.z - p.z, enemy.x - p.x);
            enemy.deadVelocityX = Math.cos(angle) * 0.5;
            enemy.deadVelocityY = 0.6;
            enemy.deadVelocityZ = Math.sin(angle) * 0.5;
            enemy.damageFlashTimer = 35;
            enemy.colorState = 'white';
            activeKills++;
            setKills(activeKills);
            if (activeKills >= 10 && !bossSpawned) {
              bossSpawned = true;
              spawnBoss();
            }
          }
        });

        // Hit check on Boss with Ultimate Ring
        if (state.boss && state.boss.state !== 'dead') {
          const boss = state.boss;
          const distToBoss = Math.hypot(p.x - boss.x, p.z - boss.z);
          if (distToBoss < 8.0) {
            boss.hp -= 3; // Huge damage
            setBossHP(Math.max(0, boss.hp));
            playRebindSuccessSound();
            spawnParticles(boss.x, 2.0, boss.z, '#d4af37', 30, 2);
            boss.damageFlashTimer = 20;
            boss.colorState = 'red';
            state.screenShake = 5.0;

            if (boss.hp <= 0) {
              boss.state = 'dead';
              boss.colorState = 'white';
              boss.damageFlashTimer = 60;
              playPowerExplosionSound();
              state.screenShake = 7.0;
              spawnParticles(boss.x, 2.1, boss.z, '#ff6600', 50, 2.5);
              spawnParticles(boss.x, 2.1, boss.z, '#d4af37', 50, 2.0);
              
              spawnWarpDoor(boss.x, boss.z);
            }
          }
        }

        // Spawn gold visual sparks around player
        for (let j = 0; j < 25; j++) {
          const sparkAngle = (j / 25) * Math.PI * 2;
          spawnParticles(
            p.x + Math.cos(sparkAngle) * 1.5,
            0.3,
            p.z + Math.sin(sparkAngle) * 1.5,
            '#d4af37',
            2,
            1.8
          );
        }
      }

      // C. DANCE CHIP TUNES (K KEY)
      if (checkKeyPressed('dance') && p.danceTimer <= 0 && p.attackTimer <= 0) {
        p.danceTimer = 60; // 1 second loop
        p.row = 3; // Row 4 (index 3): Dance Animation
        p.col = 0;
        p.frameTimer = 0;
        playDanceMusic();

        // Spawn colorful note/star sparkles
        for (let i = 0; i < 8; i++) {
          spawnParticles(p.x, 1.8, p.z, i % 2 === 0 ? '#ff55ee' : '#55ffff', 2, 0.5);
        }
      }

      // --- 3. ANIMATION STATE MACHINE & TIMERS ---
      
      // Attacking animation cycle
      if (p.attackTimer > 0) {
        p.attackTimer--;
        
        // Speed up animation rate during attack
        p.frameTimer += delta * 18; 
        if (p.frameTimer >= 1.0) {
          p.frameTimer = 0;
          p.col = (p.col + 1) % 4;
        }

        // Scale Punch Hitbox slash blade out
        if (state.hitboxVisualMesh) {
          const progress = (18 - p.attackTimer) / 18;
          const scaleVal = progress * 2.2;
          state.hitboxVisualMesh.scale.set(scaleVal, scaleVal, 1);
          const hitboxMat = state.hitboxVisualMesh.material as THREE.MeshBasicMaterial;
          hitboxMat.opacity = (1.0 - progress) * 0.8;
        }

        if (p.attackTimer === 0) {
          p.row = 0; // return to idle
          if (state.hitboxVisualMesh) {
            const hitboxMat = state.hitboxVisualMesh.material as THREE.MeshBasicMaterial;
            hitboxMat.opacity = 0;
          }
        }
      }
      
      // Dancing animation cycle
      else if (p.danceTimer > 0) {
        p.danceTimer--;
        p.frameTimer += delta * 10;
        if (p.frameTimer >= 1.0) {
          p.frameTimer = 0;
          p.col = (p.col + 1) % 4;
        }

        // Float slightly during dance
        if (state.playerMesh) {
          const floatOffset = Math.sin(time * 12) * 0.35;
          state.playerMesh.children[0].position.y = 1.25 + floatOffset;
        }

        if (p.danceTimer === 0) {
          p.row = 0; // Back to stand
          if (state.playerMesh) {
            state.playerMesh.children[0].position.y = 1.25; // snap feet to floor
          }
        }
      }

      // Standard Move / Idle walk animation cycle
      else {
        // Update horizontal flipping scale
        if (dx < 0) p.isFlipped = true;
        if (dx > 0) p.isFlipped = false;

        if (state.playerMesh) {
          // Horizontal flip billboard based on facing direction
          state.playerMesh.children[0].scale.x = p.isFlipped ? -1 : 1;
        }

        const isMoving = dx !== 0 || dz !== 0;
        if (isMoving) {
          p.row = 1; // Row 2 (index 1): Walk Animation
          p.frameTimer += delta * 9; // speed
        } else {
          p.row = 0; // Row 1 (index 0): Idle Animation
          p.frameTimer += delta * 4; // idle breathing
        }

        if (p.frameTimer >= 1.0) {
          p.frameTimer = 0;
          p.col = (p.col + 1) % 4;
        }
      }

      // Update texture coordinate mapping
      if (state.playerTexture) {
        // Rows starts from bottom 0 to top 3.
        // Index 0: Idle (Top row, row y-offset 3)
        // Index 1: Walk (Row y-offset 2)
        // Index 2: Attack (Row y-offset 1)
        // Index 3: Dance (Bottom row, row y-offset 0)
        const rowOffset = (3 - p.row) * 0.25;
        const colOffset = p.col * 0.25;
        state.playerTexture.offset.set(colOffset, rowOffset);
      }

      // Update Power ultimate ring expansion visual
      if (p.skillTimer > 0) {
        p.skillTimer--;
        if (state.ultimateRingMesh) {
          const progress = (35 - p.skillTimer) / 35;
          const scaleVal = progress * 7.5; // Expands outwards
          state.ultimateRingMesh.scale.set(scaleVal, scaleVal, 1);
          const ringMat = state.ultimateRingMesh.material as THREE.MeshBasicMaterial;
          ringMat.opacity = (1.0 - progress) * 0.9;
        }
        if (p.skillTimer === 0) {
          if (state.ultimateRingMesh) {
            const ringMat = state.ultimateRingMesh.material as THREE.MeshBasicMaterial;
            ringMat.opacity = 0;
          }
        }
      }

      // --- 4. ITEM POTIONS FLOATING & COLLISION ---
      state.potions.forEach(potion => {
        // Wave floating animation
        potion.mesh.position.y = 0.55 + Math.sin(time * 3 + potion.floatOffset) * 0.15;
        // Face active camera
        potion.mesh.rotation.y = camera.rotation.y;

        // Check proximity with player
        const distToPlayer = Math.hypot(p.x - potion.x, p.z - potion.z);
        if (distToPlayer < 1.35) {
          // Collected red potion!
          playInteractSound();
          
          // Heal player
          const newHP = Math.min(5, p.hp + 1);
          p.hp = newHP;
          setPlayerHP(newHP);

          // Spawn sparkling particles
          spawnParticles(potion.x, 0.8, potion.z, '#22c55e', 14);

          // Remove item mesh from scene
          scene.remove(potion.mesh);
          state.potions = state.potions.filter(pt => pt.id !== potion.id);

          setPotionCollected(prev => prev + 1);

          // Spawn replacement potion elsewhere in arena
          setTimeout(() => {
            spawnPotionAtRandom();
          }, 4000);
        }
      });

      // --- 5. ENEMY SYSTEM TICK (CHASE, DAMAGE, KNOCKBACK, ORBIT FLY) ---
      state.enemies.forEach(enemy => {
        // Billboard rotation
        enemy.mesh.rotation.y = camera.rotation.y;

        // Flash/Blink frame counters
        if (enemy.damageFlashTimer > 0) {
          enemy.damageFlashTimer--;
          
          const eMesh = enemy.mesh.children[0] as THREE.Mesh;
          const eMat = eMesh.material as THREE.MeshBasicMaterial;

          if (enemy.isDead) {
            // White fast rapid flash
            const isFlashOn = Math.floor(enemy.damageFlashTimer / 2) % 2 === 0;
            eMat.color.setHex(isFlashOn ? 0xffffff : 0x444444);
          } else {
            // Flashing RED
            eMat.color.setHex(0xff3333);
          }
          
          if (enemy.damageFlashTimer === 0) {
            eMat.color.setHex(0xffffff); // restore default
            enemy.colorState = 'normal';
          }
        }

        // A. DEAD ENEMIES (ORBIT ROCKET FLY OUT OF SCREEN)
        if (enemy.isDead) {
          enemy.x += enemy.deadVelocityX;
          enemy.mesh.position.y += enemy.deadVelocityY;
          enemy.z += enemy.deadVelocityZ;
          
          // Apply gravity down to fly path
          enemy.deadVelocityY -= 0.02;

          enemy.mesh.position.set(enemy.x, enemy.mesh.position.y, enemy.z);

          // Rotate dead sprite head over heels!
          enemy.mesh.children[0].rotation.z += 0.15;

          // Remove when fallen too low or flown too high
          if (enemy.mesh.position.y < -10 || enemy.mesh.position.y > 20) {
            scene.remove(enemy.mesh);
            state.enemies = state.enemies.filter(e => e.id !== enemy.id);
            
            // Spawn replacements with a very conservative limit when boss is not active
            if (state.enemies.length < 2 && !bossSpawned) {
              spawnEnemyAtRandom();
            }
          }
          return;
        }

        // B. ACTIVE ENEMY AI CHASE
        const eDist = Math.hypot(p.x - enemy.x, p.z - enemy.z);

        // Update Walk vs Stand state texture offsets
        enemy.frameTimer += delta * 10;
        if (enemy.frameTimer >= 1.0) {
          enemy.frameTimer = 0;
          enemy.col = (enemy.col + 1) % 4;
        }

        if (enemy.texture) {
          // Row 0: Stand (index offset 0.5), Row 1: Walk (index offset 0.0)
          const rowOffset = (1 - enemy.row) * 0.5;
          const colOffset = enemy.col * 0.25;
          enemy.texture.offset.set(colOffset, rowOffset);
        }

        // Handle Active Knockback state
        if (enemy.knockbackDuration > 0) {
          enemy.knockbackDuration--;
          
          // Slide backwards
          enemy.x += enemy.knockbackX;
          enemy.z += enemy.knockbackZ;
          
          enemy.knockbackX *= 0.9;
          enemy.knockbackZ *= 0.9;
          
          enemy.mesh.position.set(enemy.x, 0, enemy.z);
          return;
        }

        // Flip enemy horizontally based on chase direction
        if (p.x < enemy.x) {
          enemy.isFlipped = true;
          enemy.mesh.children[0].scale.x = -1; // Face Left
        } else {
          enemy.isFlipped = false;
          enemy.mesh.children[0].scale.x = 1; // Face Right
        }

        // Attack or Chase
        if (eDist < 1.4) {
          // Within Attack range! Stop and swing
          enemy.row = 0; // Stand to strike
          
          if (enemy.attackCooldown > 0) {
            enemy.attackCooldown--;
          } else {
            // Trigger attack on player!
            enemy.attackCooldown = 50; // Delay next strike
            enemy.damageFlashTimer = 18; // Flash red while striking
            playErrorSound();

            // Player takes damage (if not invulnerable)
            if (p.invulnFrames <= 0) {
              p.hp--;
              setPlayerHP(p.hp);
              p.invulnFrames = 45; // ~0.75s invulnerability blink
              state.screenShake = 3.0;

              // Blood splatter sparks
              spawnParticles(p.x, 1.0, p.z, '#ff3333', 15);

              // Check Game Over
              if (p.hp <= 0) {
                playErrorSound();
                setGameState('gameover');
              }
            }
          }
        } else {
          // Chase player
          enemy.row = 1; // Walk animation
          
          const dirX = (p.x - enemy.x) / eDist;
          const dirZ = (p.z - enemy.z) / eDist;

          enemy.x += dirX * enemy.speed;
          enemy.z += dirZ * enemy.speed;

          enemy.mesh.position.set(enemy.x, 0, enemy.z);
        }
      });

      // --- 5B. BOSS ENCOUNTER SYSTEM TICK ---
      if (state.boss) {
        const boss = state.boss;

        // Force billboard rotation
        if (boss.mesh) {
          boss.mesh.rotation.y = camera.rotation.y;
        }

        // Handle Boss Damage Flash
        if (boss.damageFlashTimer > 0) {
          boss.damageFlashTimer--;
          if (boss.mesh) {
            const bMesh = boss.mesh.children[0] as THREE.Mesh;
            const bMat = bMesh.material as THREE.MeshBasicMaterial;
            if (boss.state === 'dead') {
              const isFlashOn = Math.floor(boss.damageFlashTimer / 2) % 2 === 0;
              bMat.color.setHex(isFlashOn ? 0xffffff : 0x555555);
            } else {
              bMat.color.setHex(0xff3333);
            }

            if (boss.damageFlashTimer === 0) {
              bMat.color.setHex(0xffffff);
              boss.colorState = 'normal';
            }
          }
        }

        // If dead, boss flies upwards rapidly and spins out
        if (boss.state === 'dead') {
          if (boss.mesh) {
            boss.mesh.position.y += 0.12;
            boss.mesh.rotation.z += 0.12;
            // Scale down
            const progress = boss.damageFlashTimer / 60;
            boss.mesh.scale.set(progress, progress, progress);

            if (boss.damageFlashTimer <= 0) {
              scene.remove(boss.mesh);
              state.boss = null;
              setBossActive(false);
            }
          }
        } else {
          // BOSS ALIVE: State Machine (Idle, Dash, Warning, Shoot)
          boss.frameTimer += delta * 8;
          if (boss.frameTimer >= 1.0) {
            boss.frameTimer = 0;
            boss.col = (boss.col + 1) % 4;
          }

          // Update texture offsets
          if (boss.texture) {
            // Row 0: Stand/Idle, Row 1: Walk/Dash/Attack
            const rowOffset = (1 - boss.row) * 0.5;
            const colOffset = boss.col * 0.25;
            boss.texture.offset.set(colOffset, rowOffset);
          }

          // Face the player
          if (p.x < boss.x) {
            boss.isFlipped = true;
            if (boss.mesh) boss.mesh.children[0].scale.x = -1;
          } else {
            boss.isFlipped = false;
            if (boss.mesh) boss.mesh.children[0].scale.x = 1;
          }

          // State Handler
          boss.stateTimer -= delta;

          if (boss.state === 'idle') {
            boss.row = 0; // Stand frame
            if (boss.mesh) {
              boss.mesh.position.y = 2.1 + Math.sin(time * 4) * 0.25;
            }

            if (boss.stateTimer <= 0) {
              boss.state = 'dash';
              boss.row = 1; // Walk frame
              boss.stateTimer = 1.0; // 1s dash duration

              // Select near player or far from player target
              const isFar = Math.random() > 0.5;
              const angle = Math.random() * Math.PI * 2;
              const dist = isFar ? 14 + Math.random() * 4 : 4 + Math.random() * 3;
              boss.dashTargetX = Math.max(-ARENA_SIZE/2 + 5, Math.min(ARENA_SIZE/2 - 5, p.x + Math.cos(angle) * dist));
              boss.dashTargetZ = Math.max(-ARENA_SIZE/2 + 5, Math.min(ARENA_SIZE/2 - 5, p.z + Math.sin(angle) * dist));
            }
          } 
          else if (boss.state === 'dash') {
            boss.row = 1; // Walk frame
            // Lerp towards dash target position
            boss.x += (boss.dashTargetX - boss.x) * 0.1;
            boss.z += (boss.dashTargetZ - boss.z) * 0.1;
            if (boss.mesh) {
              boss.mesh.position.set(boss.x, 2.1 + Math.sin(time * 6) * 0.1, boss.z);
            }

            if (boss.stateTimer <= 0) {
              boss.state = 'warning';
              boss.row = 0;
              boss.stateTimer = 1.5; // 1.5 seconds warn pulse
              boss.pulseTimer = 0;
            }
          } 
          else if (boss.state === 'warning') {
            boss.row = 0;
            boss.pulseTimer += delta * 15;
            // Pulsing scale factor between 0.85 and 1.35
            const scaleFactor = 1.0 + Math.sin(boss.pulseTimer) * 0.25;
            if (boss.mesh) {
              boss.mesh.children[0].scale.set(
                boss.isFlipped ? -scaleFactor : scaleFactor,
                scaleFactor,
                scaleFactor
              );
            }

            if (boss.stateTimer <= 0) {
              if (boss.mesh) {
                boss.mesh.children[0].scale.set(boss.isFlipped ? -1 : 1, 1, 1);
              }
              boss.state = 'shoot';
              boss.stateTimer = 0.5; // Quick delay
              
              playFireballSound();
              state.screenShake = 2.0;

              // Spawn 3 fireball indicators around the player's vicinity
              for (let i = 0; i < 3; i++) {
                const fx = p.x + (Math.random() - 0.5) * 8.0;
                const fz = p.z + (Math.random() - 0.5) * 8.0;

                // Visual red warning indicator mesh on floor (shrinking circle)
                const indGeo = new THREE.RingGeometry(0.01, 1.5, 32);
                const indMat = new THREE.MeshBasicMaterial({ color: '#ff2200', side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
                const indMesh = new THREE.Mesh(indGeo, indMat);
                indMesh.rotation.x = -Math.PI / 2;
                indMesh.position.set(fx, 0.03, fz);
                scene.add(indMesh);

                // Falling fireball mesh
                const ballGeo = new THREE.SphereGeometry(0.5, 16, 16);
                const ballMat = new THREE.MeshBasicMaterial({ color: '#ff5500', blending: THREE.AdditiveBlending });
                const ballMesh = new THREE.Mesh(ballGeo, ballMat);
                ballMesh.position.set(fx, 15, fz);
                scene.add(ballMesh);

                state.fireballs.push({
                  mesh: ballMesh,
                  targetX: fx,
                  targetZ: fz,
                  currentX: fx,
                  currentY: 15,
                  currentZ: fz,
                  vy: -0.15 - Math.random() * 0.05,
                  indicatorMesh: indMesh,
                  life: 75 + i * 15,
                  maxLife: 75 + i * 15
                });
              }
            }
          } 
          else if (boss.state === 'shoot') {
            if (boss.stateTimer <= 0) {
              boss.state = 'idle';
              boss.stateTimer = 1.5 + Math.random() * 1.0;
            }
          }
        }
      }

      // --- 5C. FIREBALLS FALLING LOGIC ---
      state.fireballs.forEach(ball => {
        ball.currentY += ball.vy;
        ball.mesh.position.y = ball.currentY;

        // Shrink warning indicator
        const progress = ball.life / ball.maxLife;
        const scaleVal = Math.max(0.01, progress);
        ball.indicatorMesh.scale.set(scaleVal, scaleVal, 1);

        if (Math.random() > 0.4) {
          spawnParticles(ball.currentX, ball.currentY, ball.currentZ, '#ffaa00', 1, 0.5);
        }

        ball.life--;

        if (ball.life <= 0 || ball.currentY <= 0.25) {
          playFireballSound();
          state.screenShake = 4.0;

          spawnParticles(ball.targetX, 0.5, ball.targetZ, '#ff3300', 15, 1.5);
          spawnParticles(ball.targetX, 0.5, ball.targetZ, '#ffaa00', 15, 1.0);

          scene.remove(ball.mesh);
          scene.remove(ball.indicatorMesh);

          // Damage check on player
          const distToPlayer = Math.hypot(p.x - ball.targetX, p.z - ball.targetZ);
          if (distToPlayer < 1.8) {
            if (p.invulnFrames <= 0) {
              p.hp--;
              setPlayerHP(p.hp);
              p.invulnFrames = 45;
              state.screenShake = 5.0;
              spawnParticles(p.x, 1.0, p.z, '#ff0000', 20, 1.5);

              if (p.hp <= 0) {
                playErrorSound();
                setGameState('gameover');
              }
            }
          }
        }
      });
      state.fireballs = state.fireballs.filter(ball => ball.life > 0 && ball.currentY > 0.25);

      // --- 5D. WARP DOOR AND VICTORY COLLISION ---
      if (state.warpDoor.active && state.warpDoor.mesh) {
        state.warpDoor.pulseTimer += delta;
        
        const coreMesh = state.warpDoor.mesh.children[1] as THREE.Mesh;
        if (coreMesh) {
          coreMesh.rotation.y += delta * 1.5;
          coreMesh.rotation.z += delta * 0.8;
          const bScale = 1.0 + Math.sin(state.warpDoor.pulseTimer * 4) * 0.1;
          coreMesh.scale.set(bScale, bScale, bScale);
        }

        if (Math.random() > 0.6) {
          spawnParticles(state.warpDoor.x, 0.5, state.warpDoor.z, '#d4af37', 2, 0.5);
        }

        const distToPlayer = Math.hypot(p.x - state.warpDoor.x, p.z - state.warpDoor.z);
        if (distToPlayer < 1.25) {
          playInteractSound();
          playDanceMusic();
          setGameState('ending');
        }
      }

      // --- 5E. RANDOM ENEMY SPAWN TIMER ---
      state.enemySpawnTimer -= delta;
      if (state.enemySpawnTimer <= 0) {
        const isBossDefeated = state.boss === null && bossSpawned;
        // Limit active enemies to 4 max and prevent spawning during/after Boss fight
        if (state.enemies.length < 4 && !bossSpawned && !isBossDefeated) {
          spawnEnemyAtRandom();
        }
        state.enemySpawnTimer = 4.0 + Math.random() * 4.0; // 4-8 seconds
      }

      // --- 6. FLOATING PARTICLES ENGINE ---
      state.particles.forEach(pt => {
        pt.mesh.position.x += pt.vx;
        pt.mesh.position.y += pt.vy;
        pt.mesh.position.z += pt.vz;

        // Apply slight gravity downward
        pt.vy -= 0.005;

        pt.life--;
        const ratio = pt.life / pt.maxLife;
        pt.mesh.scale.set(ratio, ratio, ratio);

        // Slow fade opacity
        const pMat = pt.mesh.material as THREE.MeshBasicMaterial;
        pMat.opacity = ratio;

        if (pt.life <= 0) {
          scene.remove(pt.mesh);
        }
      });
      state.particles = state.particles.filter(pt => pt.life > 0);

      // --- 7. CAMERA INTERPOLATION FOLLOW (SMOOTH LERP) ---
      // We position camera dynamically to hover above the player
      const targetCamX = p.x;
      const targetCamZ = p.z + 10;
      const targetCamY = 7.5;

      camera.position.x += (targetCamX - camera.position.x) * 0.08;
      camera.position.z += (targetCamZ - camera.position.z) * 0.08;
      camera.position.y += (targetCamY - camera.position.y) * 0.08;

      // Always perfectly aim camera focus slightly above player feet
      camera.lookAt(p.x, 0.8, p.z);

      // Draw active frame
      renderer.render(scene, camera);

      frameId = requestAnimationFrame(tick);
    };

    tick();

    // Clean up canvas and render frames on disposal
    return () => {
      cancelAnimationFrame(frameId);
      
      // Memory cleanup for materials & geometries
      state.potions.forEach(p => scene.remove(p.mesh));
      state.enemies.forEach(e => scene.remove(e.mesh));
      state.particles.forEach(pt => scene.remove(pt.mesh));
      state.fireballs.forEach(fb => {
        scene.remove(fb.mesh);
        scene.remove(fb.indicatorMesh);
      });
      if (state.boss && state.boss.mesh) {
        scene.remove(state.boss.mesh);
      }
      if (state.warpDoor && state.warpDoor.mesh) {
        scene.remove(state.warpDoor.mesh);
      }

      if (state.playerMesh) scene.remove(state.playerMesh);
      if (state.ultimateRingMesh) scene.remove(state.ultimateRingMesh);
      if (state.hitboxVisualMesh) scene.remove(state.hitboxVisualMesh);

      groundGeo.dispose();
      groundMat.dispose();
      baseGeo.dispose();
      pillarGeo.dispose();
      crystalGeo.dispose();
      crystalMat.dispose();
      darkRockMat.dispose();
      playerPlaneGeo.dispose();
      playerMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      hitboxGeo.dispose();
      hitboxMat.dispose();
      shadowGeo.dispose();
      shadowMat.dispose();

      renderer.dispose();
    };
  }, [gameState, enableFog, enableGrid]);

  return (
    <div className="relative w-screen h-screen bg-[#020204] overflow-hidden text-white flex flex-col font-sans select-none" id="main-view-wrapper">
      
      {/* Golden Grid Ambient BG decoration */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_50%,#161833_0%,#030305_100%)] pointer-events-none" />

      {/* Retro Scanline Filters */}
      {enableScanlines && <div className="scanlines z-50 pointer-events-none" />}
      {enableScanlines && <div className="scan-scroller pointer-events-none" />}
      {enableCrtFlicker && <div className="absolute inset-0 crt-flicker-effect bg-black/5 pointer-events-none z-50" />}

      {/* Floating Amber Embers Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-1">
        {bgEmbers.map((ember) => (
          <div
            key={ember.id}
            className="ember"
            style={{
              left: `${ember.left}%`,
              width: `${ember.size}px`,
              height: `${ember.size}px`,
              animationDelay: `${ember.delay}s`,
              animationDuration: `${ember.duration}s`,
              animationName: 'float-up',
              animationIterationCount: 'infinite',
              animationTimingFunction: 'linear',
            }}
          />
        ))}
      </div>

      {/* Screen Edge Vignette */}
      <div className="vignette" />

      {/* ======================================================== */}
      {/* 1. SCREEN: WELCOME MENU SCREEN */}
      {/* ======================================================== */}
      {gameState === 'menu' && (
        <div className="relative z-10 flex-1 flex flex-col md:flex-row w-full h-full max-w-7xl mx-auto overflow-hidden">
          
          {/* Menu Left Pane: Logo and presets */}
          <div className="w-full md:w-[500px] lg:w-[550px] h-1/2 md:h-full flex flex-col justify-center px-6 md:px-16 py-8 md:py-0 border-b md:border-b-0 border-white/10 z-10">
            
            {/* Centered Logo block */}
            <div className="mb-6 md:mb-12 flex justify-start items-center relative group">
              <div className="absolute -inset-4 bg-amber-500/5 rounded-2xl filter blur-xl group-hover:bg-amber-500/10 transition-all duration-700" />
              <img 
                id="main-logo-image"
                src="https://res.cloudinary.com/dsucg33fv/image/upload/v1782709347/logo_i8827v.png" 
                className="w-48 md:w-72 h-auto filter drop-shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:scale-105 transition-transform duration-500"
                alt="Sacred Chronicles 3D"
              />
            </div>

            {/* Menu Buttons selection */}
            <div className="flex flex-col gap-2.5 md:gap-5">
              
              {/* Play Game Button */}
              <button
                id="btn-play-chronicle"
                onClick={startGame}
                onMouseEnter={playHoverSound}
                className="group flex items-center text-left font-serif text-xl md:text-2xl lg:text-3xl italic tracking-wider text-[#d4af37] hover:translate-x-3 transition-all duration-300 outline-none cursor-pointer"
              >
                <span className="w-6 md:w-10 h-[1px] bg-[#d4af37] mr-3" />
                <span className="flex items-center gap-2">
                  <Play className="w-5 h-5 text-[#d4af37] fill-[#d4af37]/20" />
                  ENTER CHRONICLE 3D
                </span>
              </button>

              {/* Set custom Controls Panel */}
              <button
                onClick={() => {
                  setActiveMenuPanel('controls');
                  playSelectSound();
                }}
                onMouseEnter={playHoverSound}
                className={`group flex items-center text-left font-serif text-lg md:text-xl tracking-wider hover:translate-x-3 transition-all duration-300 outline-none ${
                  activeMenuPanel === 'controls' ? 'text-white' : 'text-white/40'
                }`}
              >
                {activeMenuPanel === 'controls' && <span className="w-4 h-[1px] bg-white mr-3" />}
                <span className="flex items-center gap-2">
                  <Keyboard className="w-4.5 h-4.5" />
                  KEY CONTROLS ({controlPreset.toUpperCase()})
                </span>
              </button>

              {/* Set Graphics / Audio Panel */}
              <button
                onClick={() => {
                  setActiveMenuPanel('settings');
                  playSelectSound();
                }}
                onMouseEnter={playHoverSound}
                className={`group flex items-center text-left font-serif text-lg md:text-xl tracking-wider hover:translate-x-3 transition-all duration-300 outline-none ${
                  activeMenuPanel === 'settings' ? 'text-white' : 'text-white/40'
                }`}
              >
                {activeMenuPanel === 'settings' && <span className="w-4 h-[1px] bg-white mr-3" />}
                <span className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4.5 h-4.5" />
                  DISPLAY & SOUND
                </span>
              </button>

              {/* Help & Lore instructions */}
              <button
                onClick={() => {
                  setActiveMenuPanel('help');
                  playSelectSound();
                }}
                onMouseEnter={playHoverSound}
                className={`group flex items-center text-left font-serif text-lg md:text-xl tracking-wider hover:translate-x-3 transition-all duration-300 outline-none ${
                  activeMenuPanel === 'help' ? 'text-white' : 'text-white/40'
                }`}
              >
                {activeMenuPanel === 'help' && <span className="w-4 h-[1px] bg-white mr-3" />}
                <span className="flex items-center gap-2">
                  <HelpCircle className="w-4.5 h-4.5" />
                  GAMEPLAY GUIDELINES
                </span>
              </button>

            </div>

            {/* Version credits */}
            <div className="absolute bottom-6 md:bottom-12 left-6 md:left-16 pointer-events-none">
              <div className="text-[10px] tracking-[3px] text-white/30 flex items-center gap-1.5 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                THREEJS RETRO BILLBOARD ENGINE
              </div>
              <div className="text-[8px] tracking-[1px] text-white/15 mt-0.5 font-mono">
                GROUND PLANE: 50 | HEIGHTMAPS: ACTIVE
              </div>
            </div>

          </div>

          {/* Menu Right Pane: Panel Details display */}
          <div className="flex-1 h-1/2 md:h-full bg-white/[0.01] backdrop-blur-md border-t md:border-t-0 md:border-l border-white/10 flex flex-col justify-center p-6 md:p-14 overflow-y-auto">
            
            {/* A. CONFIG CONTROLS PANEL */}
            {activeMenuPanel === 'controls' && (
              <div className="animate-fade-in" id="menu-controls-panel">
                <h3 className="font-serif text-[13px] tracking-[4px] uppercase text-[#d4af37] mb-3 border-b border-amber-500/20 pb-2">
                  Input Configurations
                </h3>
                <p className="text-xs text-white/50 leading-relaxed mb-6">
                  คลิกที่กล่องด้านขวาเพื่อกำหนดปุ่มของคุณเอง หรือเลือกเลย์เอาต์ด่วนด้านล่างนี้:
                </p>

                {/* Preset Row */}
                <div className="grid grid-cols-2 gap-3 mb-6 bg-white/[0.02] border border-white/5 p-3 rounded-lg">
                  <button
                    onClick={() => handlePresetSelect('wasd')}
                    className={`py-2 px-3 text-xs font-mono rounded border transition-all ${
                      controlPreset === 'wasd' 
                        ? 'border-[#d4af37] bg-amber-500/10 text-[#d4af37] font-bold' 
                        : 'border-white/10 text-white/60 hover:border-white/20'
                    }`}
                  >
                    Classic WASD Controls
                  </button>
                  <button
                    onClick={() => handlePresetSelect('arrows')}
                    className={`py-2 px-3 text-xs font-mono rounded border transition-all ${
                      controlPreset === 'arrows' 
                        ? 'border-[#d4af37] bg-amber-500/10 text-[#d4af37] font-bold' 
                        : 'border-white/10 text-white/60 hover:border-white/20'
                    }`}
                  >
                    Arrow Keys Controls
                  </button>
                </div>

                {/* Key rebind fields list */}
                <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
                  {keyBindings.map((bind) => {
                    const isBinding = activeBindingId === bind.id;
                    return (
                      <div 
                        key={bind.id}
                        className={`flex justify-between items-center py-2 px-3.5 border rounded-lg transition-all ${
                          isBinding ? 'border-[#d4af37] bg-amber-500/5 shadow-[0_0_15px_rgba(212,175,55,0.15)]' : 'border-white/5 hover:border-white/10'
                        }`}
                      >
                        <span className="text-xs text-white/70 font-mono tracking-wider">{bind.label}</span>
                        
                        <button
                          onClick={() => {
                            setActiveBindingId(bind.id);
                            playRebindStartSound();
                          }}
                          className={`min-w-[80px] h-8 px-3 rounded font-mono text-xs font-bold transition-all border ${
                            isBinding 
                              ? 'bg-[#d4af37] text-black border-[#d4af37] animate-pulse' 
                              : 'bg-white/5 border-white/10 hover:border-[#d4af37] text-[#d4af37] hover:bg-amber-500/10'
                          }`}
                        >
                          {isBinding ? 'WAIT...' : formatKeyLabel(bind.key)}
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 flex justify-between items-center text-[10px] text-white/30 font-mono">
                  <span>* Click to assign new keys instantly</span>
                  <button onClick={handleResetDefaults} className="text-red-400/50 hover:text-red-400 flex items-center gap-1.5 transition-colors">
                    <RotateCcw className="w-3 h-3" /> Restore Default Keys
                  </button>
                </div>

              </div>
            )}

            {/* B. GRAPHICS & SOUND SETTINGS PANEL */}
            {activeMenuPanel === 'settings' && (
              <div className="animate-fade-in" id="menu-settings-panel">
                <h3 className="font-serif text-[13px] tracking-[4px] uppercase text-[#d4af37] mb-3 border-b border-amber-500/20 pb-2">
                  System Settings
                </h3>
                <p className="text-xs text-white/50 leading-relaxed mb-6">
                  ปรับระดับเสียงสังเคราะห์ดนตรีและแผ่นกรองจำลองเรโทรได้ตามสะดวก:
                </p>

                {/* Volume bar */}
                <div className="mb-6 bg-white/[0.02] border border-white/5 p-4 rounded-xl">
                  <div className="flex justify-between items-center mb-2.5">
                    <span className="text-xs text-white/70 font-mono flex items-center gap-1.5">
                      {soundVolume > 0 ? <Volume2 className="w-4 h-4 text-[#d4af37]" /> : <VolumeX className="w-4 h-4 text-white/30" />}
                      Synthesized Audio Output Volume
                    </span>
                    <span className="text-xs font-bold font-mono text-[#d4af37]">{Math.round(soundVolume * 100)}%</span>
                  </div>
                  <input 
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={soundVolume}
                    onChange={handleVolumeChange}
                    className="w-full accent-[#d4af37] bg-white/15 h-1 rounded appearance-none cursor-pointer"
                  />
                </div>

                {/* Toggles */}
                <div className="flex flex-col gap-3">
                  {/* Toggle Fog */}
                  <div className="flex justify-between items-center py-2.5 px-4 border border-white/5 rounded-lg">
                    <div>
                      <span className="text-xs text-white/80 font-mono flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5 text-blue-400" /> Ground Fog Density
                      </span>
                    </div>
                    <button
                      onClick={() => { setEnableFog(!enableFog); playSelectSound(); }}
                      className={`w-11 h-6 rounded-full transition-colors relative ${enableFog ? 'bg-[#d4af37]' : 'bg-white/10'}`}
                    >
                      <span className={`absolute top-1 left-1 bg-black w-4 h-4 rounded-full transition-transform ${enableFog ? 'translate-x-5' : ''}`} />
                    </button>
                  </div>

                  {/* Toggle Grid */}
                  <div className="flex justify-between items-center py-2.5 px-4 border border-white/5 rounded-lg">
                    <div>
                      <span className="text-xs text-white/80 font-mono flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-[#d4af37]" /> Grid Floor Guidelines
                      </span>
                    </div>
                    <button
                      onClick={() => { setEnableGrid(!enableGrid); playSelectSound(); }}
                      className={`w-11 h-6 rounded-full transition-colors relative ${enableGrid ? 'bg-[#d4af37]' : 'bg-white/10'}`}
                    >
                      <span className={`absolute top-1 left-1 bg-black w-4 h-4 rounded-full transition-transform ${enableGrid ? 'translate-x-5' : ''}`} />
                    </button>
                  </div>

                  {/* Toggle Scanlines */}
                  <div className="flex justify-between items-center py-2.5 px-4 border border-white/5 rounded-lg">
                    <div>
                      <span className="text-xs text-white/80 font-mono flex items-center gap-1.5">
                        <Tv className="w-3.5 h-3.5 text-red-400" /> Retro TV CRT Scanlines
                      </span>
                    </div>
                    <button
                      onClick={() => { setEnableScanlines(!enableScanlines); playSelectSound(); }}
                      className={`w-11 h-6 rounded-full transition-colors relative ${enableScanlines ? 'bg-[#d4af37]' : 'bg-white/10'}`}
                    >
                      <span className={`absolute top-1 left-1 bg-black w-4 h-4 rounded-full transition-transform ${enableScanlines ? 'translate-x-5' : ''}`} />
                    </button>
                  </div>

                  {/* Toggle CRT Flicker */}
                  <div className="flex justify-between items-center py-2.5 px-4 border border-white/5 rounded-lg">
                    <div>
                      <span className="text-xs text-white/80 font-mono flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-purple-400" /> CRT Screen Flicker
                      </span>
                    </div>
                    <button
                      onClick={() => { setEnableCrtFlicker(!enableCrtFlicker); playSelectSound(); }}
                      className={`w-11 h-6 rounded-full transition-colors relative ${enableCrtFlicker ? 'bg-[#d4af37]' : 'bg-white/10'}`}
                    >
                      <span className={`absolute top-1 left-1 bg-black w-4 h-4 rounded-full transition-transform ${enableCrtFlicker ? 'translate-x-5' : ''}`} />
                    </button>
                  </div>
                </div>

              </div>
            )}

            {/* C. LORE & HELP GUIDELINES */}
            {activeMenuPanel === 'help' && (
              <div className="animate-fade-in pr-2" id="menu-help-panel">
                <h3 className="font-serif text-[13px] tracking-[4px] uppercase text-[#d4af37] mb-3 border-b border-amber-500/20 pb-2">
                  Gameplay Guidelines
                </h3>
                
                <div className="flex flex-col gap-4 text-xs text-white/70 leading-relaxed">
                  <div>
                    <span className="text-[#d4af37] font-bold">1. เดินเคลื่อนไหว 8 ทิศทาง (8-Way Steps)</span>
                    <p className="pl-4 mt-1 text-[11px] text-white/50">
                      ใช้ปุ่ม WASD หรือปุ่มลูกศร (ตามที่คุณเลือกติดตั้งไว้) บังคับตัวละคร 2D ของคุณเดินร่อนไปทั่วสนาม Ground Plane ขนาด 50 มิติ
                    </p>
                  </div>

                  <div>
                    <span className="text-[#d4af37] font-bold">2. ระบบโจมตี 2 จังหวะ (2-Hit Combo Knockout)</span>
                    <p className="pl-4 mt-1 text-[11px] text-white/50">
                      กดปุ่ม <kbd className="bg-white/10 px-1 rounded text-[#d4af37]">P</kbd> เพื่อสับโจมตี! โจมตีศัตรูครั้งแรกจะกระเด็นถอยหลังเพื่อเว้นระยะห่าง และโจมตีซ้ำครั้งที่สองจะกระเด็นออกจากจอมิติไปสู่ชั้นบรรยากาศอย่างทรงพลัง!
                    </p>
                  </div>

                  <div>
                    <span className="text-[#d4af37] font-bold">3. การระเบิดพลังกวาดล้าง (Ultimate Ring O)</span>
                    <p className="pl-4 mt-1 text-[11px] text-white/50">
                      เมื่อถูกรุมล้อม กดปุ่ม <kbd className="bg-white/10 px-1 rounded text-[#d4af37]">O</kbd> เพื่อสลักกระแสอัคคีแผ่ขยายกวาดล้างศัตรูรอบกายทั้งหมดในพริบตา (เมื่อใช้แล้วต้องรอ Cooldown แถบวงกลมฟื้นตัว)
                    </p>
                  </div>

                  <div>
                    <span className="text-[#d4af37] font-bold">4. ขวดเติมยาเติมเลือด (Red Potions)</span>
                    <p className="pl-4 mt-1 text-[11px] text-white/50">
                      เก็บขวดน้ำยาสีแดงที่ตกสุ่มทั่วด่าน เพื่อฟื้นคืนพลังชีวิต 1 ดวง (สูงสุด 5 ดวง) หากพลังชีวิตหมดลงจะเกิดความพ่ายแพ้ทันที!
                    </p>
                  </div>

                  <div>
                    <span className="text-[#d4af37] font-bold">5. กด K เพื่อเต้นรำรื่นเริง (K to Dance)</span>
                    <p className="pl-4 mt-1 text-[11px] text-white/50">
                      กดปุ่ม <kbd className="bg-white/10 px-1 rounded text-[#d4af37]">K</kbd> เพื่อผ่อนคลายและสร้างละอองเวทมนตร์หลากสีรอบตัวละครของคุณ
                    </p>
                  </div>
                </div>

              </div>
            )}

            {/* Live Transmission Marquee footer */}
            <div className="mt-8 bg-white/[0.03] border border-white/5 p-3.5 rounded-xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-full border border-[#d4af37]/30 flex items-center justify-center bg-amber-500/5 shrink-0">
                <MessageSquare className="w-4 h-4 text-[#d4af37] animate-pulse" />
              </div>
              <div className="overflow-hidden">
                <div className="text-[9px] uppercase tracking-widest text-[#d4af37] font-mono">Monolith Broadcast</div>
                <div className="text-[11px] text-white/70 italic truncate font-mono">{activeMessage}</div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* 2. SCREEN: PLAYING 3D INTERACTIVE CANVAS AND HUD */}
      {/* ======================================================== */}
      {gameState === 'playing' && (
        <div className="w-full h-full relative" id="playing-arena-screen">
          
          {/* Main 3D WebGL Canvas */}
          <canvas 
            ref={canvasRef} 
            className="w-full h-full block cursor-crosshair bg-black"
            id="threejs-canvas"
          />

          {/* ================= HUD TOP OVERLAY ================= */}
          <div className="absolute top-4 inset-x-4 flex justify-between items-start pointer-events-none z-30">
            
            {/* Top Left: HP and Stats */}
            <div className="flex flex-col gap-2">
              
              {/* HP Bar */}
              <div className="bg-black/75 backdrop-blur-md border border-white/10 p-3 rounded-xl flex items-center gap-3 box-shadow-gold">
                <div className="flex items-center gap-1.5 shrink-0">
                  <Heart className="w-5 h-5 text-red-500 fill-red-500/20 animate-pulse" />
                  <span className="text-[10px] text-white/50 tracking-wider uppercase font-mono mr-1">VITALITY</span>
                </div>
                
                {/* 5 Heart Container slots */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div 
                      key={i} 
                      className={`w-6 h-4.5 rounded transition-all duration-300 ${
                        i < playerHP 
                          ? 'bg-gradient-to-r from-red-600 to-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] border border-red-400' 
                          : 'bg-white/5 border border-white/10'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Spawn collect potion indicator */}
              <div className="bg-black/60 backdrop-blur-md border border-white/5 px-3 py-1.5 rounded-lg text-[10px] font-mono text-white/60 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                POTIONS SECURED: <span className="text-[#d4af37] font-bold">{potionCollected}</span>
              </div>

            </div>

            {/* Top Center: Score Banner */}
            <div className="flex flex-col items-center">
              <div className="bg-black/85 backdrop-blur-md border border-amber-500/20 px-6 py-2.5 rounded-2xl flex flex-col items-center box-shadow-gold">
                <div className="text-[9px] uppercase tracking-[3px] text-white/40 font-mono">CHRONICLES KILLED</div>
                <div className="text-2xl font-serif font-bold text-[#d4af37] tracking-wider text-shadow-gold">{kills}</div>
              </div>
            </div>

            {/* Top Right: Cooldown and Settings */}
            <div className="flex items-start gap-3 pointer-events-auto">
              
              {/* Ultimate visual indicator */}
              <div 
                id="skill-cooldown-badge"
                className={`bg-black/75 backdrop-blur-md border px-4 py-2.5 rounded-xl flex items-center gap-2.5 transition-all box-shadow-gold ${
                  skillCooldown > 0 ? 'border-white/10 opacity-70' : 'border-[#d4af37]'
                }`}
              >
                <Zap className={`w-4 h-4 ${skillCooldown > 0 ? 'text-white/30' : 'text-[#d4af37] animate-bounce'}`} />
                <div className="flex flex-col font-mono text-[9px] tracking-wide">
                  <span className="text-white/40">ULTIMATE RING [O]</span>
                  <span className={`font-bold ${skillCooldown > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {skillCooldown > 0 ? `COOLDOWN: ${Math.ceil(skillCooldown)}%` : 'POWER READY'}
                  </span>
                </div>
              </div>

              {/* Sound/Options side trigger */}
              <button
                onClick={returnToMenu}
                className="w-10 h-10 bg-black/75 border border-white/10 rounded-xl flex items-center justify-center hover:border-red-400/50 hover:bg-red-500/5 text-white/70 hover:text-red-400 transition-all shadow-md outline-none"
                title="Exit to main menu"
              >
                <X className="w-5 h-5" />
              </button>

            </div>

          </div>

          {/* ================= HUD BOTTOM OVERLAY ================= */}
          <div className="absolute bottom-4 inset-x-4 flex justify-between items-end pointer-events-none z-30">
            
            {/* Bottom Left: Controls feedback */}
            <div className="bg-black/75 backdrop-blur-md border border-white/10 p-3 rounded-xl flex flex-col gap-2 box-shadow-gold min-w-[200px]">
              <div className="text-[9px] uppercase tracking-wider text-white/40 font-mono flex items-center gap-1 border-b border-white/5 pb-1">
                <Keyboard className="w-3.5 h-3.5 text-[#d4af37]" /> Active Bindings Feedback
              </div>
              
              <div className="grid grid-cols-2 gap-1.5 text-[9px] font-mono text-white/50">
                <div className="flex items-center justify-between bg-white/[0.02] p-1 rounded px-1.5">
                  <span>Attack:</span>
                  <span className="text-[#d4af37] font-bold">P</span>
                </div>
                <div className="flex items-center justify-between bg-white/[0.02] p-1 rounded px-1.5">
                  <span>Ultimate:</span>
                  <span className="text-[#d4af37] font-bold">O</span>
                </div>
                <div className="flex items-center justify-between bg-white/[0.02] p-1 rounded px-1.5">
                  <span>Dance:</span>
                  <span className="text-[#d4af37] font-bold">K</span>
                </div>
                <div className="flex items-center justify-between bg-white/[0.02] p-1 rounded px-1.5">
                  <span>Layout:</span>
                  <span className="text-[#d4af37] font-bold">{controlPreset.toUpperCase()}</span>
                </div>
              </div>
            </div>

            {/* Bottom Center: Interactive Lore Monument banner */}
            <div className="max-w-md bg-black/80 backdrop-blur-md border border-white/10 p-3 rounded-xl flex items-center gap-3 box-shadow-gold">
              <div className="w-7 h-7 rounded-full border border-[#d4af37]/30 flex items-center justify-center shrink-0">
                <MessageSquare className="w-3.5 h-3.5 text-[#d4af37] animate-pulse" />
              </div>
              <p className="text-[10px] font-mono text-white/80 leading-normal italic">
                {activeMessage}
              </p>
            </div>

            {/* Bottom Right: Miniature Radar Map indicator */}
            <div className="bg-black/75 backdrop-blur-md border border-white/10 p-3.5 rounded-xl flex flex-col items-center gap-1.5 box-shadow-gold">
              <div className="text-[9px] tracking-wider text-white/30 font-mono">ARENA RADAR</div>
              <div className="relative w-20 h-20 border border-white/10 rounded-full overflow-hidden bg-black/60 flex items-center justify-center">
                
                {/* Center dot represents player */}
                <span className="absolute w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_6px_#d4af37]" />
                
                {/* Pulse radar wave */}
                <span className="absolute inset-0.5 rounded-full border border-amber-500/15 animate-ping pointer-events-none" />

                {/* Simulated direction compass ticks */}
                <div className="absolute top-1 text-[7px] text-white/20 font-mono">N</div>
                <div className="absolute bottom-1 text-[7px] text-white/20 font-mono">S</div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* 3. SCREEN: GAME OVER DIALOG MODAL POPUP */}
      {/* ======================================================== */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-lg animate-fade-in" id="gameover-popup-wrapper">
          <div className="bg-[#0b0c16]/90 border border-red-500/30 p-8 md:p-12 rounded-2xl w-full max-w-lg text-center shadow-[0_0_50px_rgba(239,68,68,0.15)] mx-4">
            
            {/* Skull outline banner */}
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <Skull className="w-8 h-8 text-red-500" />
            </div>

            <h2 className="font-serif text-3xl md:text-4xl italic text-red-500 tracking-wider mb-2">
              CHRONICLE DEFEATED
            </h2>
            <p className="text-xs text-white/50 leading-relaxed max-w-sm mx-auto mb-8">
              ดวงจิตดับสูญจากการรุมเร้าของมอนสเตอร์โบราณในสนาม แต่พลังของคุณจะคงอยู่ชั่วกาลนาน!
            </p>

            {/* Score box */}
            <div className="grid grid-cols-2 gap-4 mb-8 bg-white/[0.02] border border-white/5 p-4 rounded-xl max-w-md mx-auto">
              <div>
                <span className="text-[10px] font-mono text-white/40 uppercase block mb-1">Total Kills</span>
                <span className="text-2xl font-bold font-serif text-[#d4af37]">{kills}</span>
              </div>
              <div>
                <span className="text-[10px] font-mono text-white/40 uppercase block mb-1">Potions Secured</span>
                <span className="text-2xl font-bold font-serif text-green-400">{potionCollected}</span>
              </div>
            </div>

            {/* Actions button group */}
            <div className="flex flex-col gap-3 max-w-xs mx-auto">
              <button
                onClick={startGame}
                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-serif font-bold text-sm tracking-widest rounded-xl hover:shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-all cursor-pointer flex items-center justify-center gap-2 outline-none"
              >
                <RotateCw className="w-4.5 h-4.5" /> RESURRECT CHRONICLE
              </button>

              <button
                onClick={returnToMenu}
                className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-xl border border-white/10 transition-colors cursor-pointer text-xs font-mono"
              >
                RETURN TO CASTLE MENU
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. SCREEN: VICTORY ENDING GAME OVERLAY SCREEN */}
      {/* ======================================================== */}
      {gameState === 'ending' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl animate-fade-in" id="victory-ending-overlay">
          <div className="bg-[#0b0c16]/95 border border-[#d4af37]/40 p-8 md:p-12 rounded-2xl w-full max-w-xl text-center shadow-[0_0_60px_rgba(212,175,55,0.2)] mx-4 relative overflow-hidden">
            
            {/* Ambient gold glow in bg */}
            <div className="absolute -top-12 -left-12 w-40 h-40 bg-amber-500/10 rounded-full filter blur-3xl" />
            <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-yellow-500/10 rounded-full filter blur-3xl" />

            {/* Glowing gold medal/crown/star emblem */}
            <div className="w-20 h-20 bg-amber-500/10 border border-[#d4af37]/50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_rgba(212,175,55,0.2)] animate-bounce">
              <Award className="w-10 h-10 text-[#d4af37] filter drop-shadow-[0_0_8px_rgba(212,175,55,0.6)]" />
            </div>

            <h2 className="font-serif text-3xl md:text-5xl italic text-[#d4af37] tracking-widest mb-3 text-shadow-gold">
              CHRONICLE ASCENDED
            </h2>
            <div className="text-[10px] tracking-[4px] uppercase text-amber-400/70 font-mono mb-4">VICTORY OVER THE ABYSS</div>
            
            <p className="text-xs text-white/70 leading-relaxed max-w-md mx-auto mb-8 font-mono">
              ท่านได้พิชิตราชามอนสเตอร์โบราณและทะลวงผ่าน <span className="text-[#d4af37] font-bold">Warp Gate</span> สำเร็จเสร็จสิ้นภารกิจ! ชะตากรรมของดินแดนได้รับการปลดปล่อยจากเงามืด และชื่อของท่านจะถูกจารึกลงในหอเกียรติยศแห่ง Sacred Chronicles ตราบนานเท่านาน!
            </p>

            {/* Final performance stats card */}
            <div className="grid grid-cols-3 gap-3 mb-8 bg-white/[0.03] border border-white/5 p-4 rounded-xl max-w-md mx-auto">
              <div className="border-r border-white/5">
                <span className="text-[9px] font-mono text-white/40 uppercase block mb-1">Total Kills</span>
                <span className="text-xl font-bold font-serif text-[#d4af37]">{kills}</span>
              </div>
              <div className="border-r border-white/5">
                <span className="text-[9px] font-mono text-white/40 uppercase block mb-1">Potions Taken</span>
                <span className="text-xl font-bold font-serif text-green-400">{potionCollected}</span>
              </div>
              <div>
                <span className="text-[9px] font-mono text-white/40 uppercase block mb-1">Chronicle Class</span>
                <span className="text-xs font-bold font-mono text-amber-300">LEGENDARY</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-3 max-w-xs mx-auto relative z-10">
              <button
                onClick={startGame}
                className="w-full py-3 bg-[#d4af37] hover:bg-amber-400 text-black font-serif font-bold text-sm tracking-widest rounded-xl shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:scale-[1.02] transition-all cursor-pointer flex items-center justify-center gap-2 outline-none"
              >
                <RotateCw className="w-4.5 h-4.5" /> RE-ENTER CHRONICLE
              </button>

              <button
                onClick={returnToMenu}
                className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-xl border border-white/10 transition-colors cursor-pointer text-xs font-mono"
              >
                RETURN TO CASTLE MENU
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
