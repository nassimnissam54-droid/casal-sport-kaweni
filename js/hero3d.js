/* ==========================================================================
   hero3d.js — scène Three.js du hero immersif.
   Chargé paresseusement par home.js UNIQUEMENT si WebGL est disponible
   et que l'utilisateur n'a pas demandé de réduire les animations.

   ► REMPLACER LES MODÈLES DE DÉMONSTRATION :
   Les trois "produits" (basket, ballon, haltère) sont modélisés en
   primitives Three.js pour que le site fonctionne sans téléchargement.
   Pour utiliser de vrais modèles 3D de vos produits (.glb/.gltf) :
     1. Placez vos fichiers dans /models (ex: models/basket.glb)
     2. Renseignez GLB_MODELS ci-dessous (un par chapitre, ou null)
   Les .glb sont chargés avec GLTFLoader + DRACO (compression).
   ========================================================================== */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { Reflector } from "three/addons/objects/Reflector.js";

/* Mettez ici les URL de vos vrais modèles produits (.glb), par chapitre. */
const GLB_MODELS = [null, null, null]; // ex: ["models/basket.glb", "models/ballon.glb", "models/haltere.glb"]

const ACCENT = 0xff4d2e;
const ACCENT2 = 0xff9a3c;

export async function initHero({ onChapter }) {
  const holder = document.getElementById("hero-canvas");
  const stage = document.getElementById("hero-stage");
  const isMobile = innerWidth < 768;

  /* ------------------------------------------------------------ Renderer */
  const renderer = new THREE.WebGLRenderer({ antialias: !isMobile, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.5 : 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  holder.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0a0a0c, 6, 16);

  const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.1, 40);
  camera.position.set(0, 1.15, 4.6);

  /* ------------------------------------------- Éclairage studio dramatique */
  scene.add(new THREE.AmbientLight(0xffffff, 0.25));

  const key = new THREE.SpotLight(ACCENT2, 90, 20, Math.PI / 5, 0.5, 1.6);
  key.position.set(3.5, 5.5, 3);
  scene.add(key);

  const rim = new THREE.SpotLight(ACCENT, 70, 20, Math.PI / 4, 0.6, 1.6);
  rim.position.set(-4, 3, -3);
  scene.add(rim);

  const fill = new THREE.PointLight(0xffffff, 6, 12);
  fill.position.set(0, 2.2, 4);
  scene.add(fill);

  /* -------------------------------------------------- Sol réfléchissant */
  if (!isMobile) {
    const mirror = new Reflector(new THREE.CircleGeometry(9, 48), {
      textureWidth: 1024,
      textureHeight: 1024,
      color: 0x151518,
    });
    mirror.rotation.x = -Math.PI / 2;
    scene.add(mirror);
    // Voile sombre par-dessus le miroir → reflet discret, ambiance showroom
    const veil = new THREE.Mesh(
      new THREE.CircleGeometry(9, 48),
      new THREE.MeshBasicMaterial({ color: 0x0a0a0c, transparent: true, opacity: 0.72 })
    );
    veil.rotation.x = -Math.PI / 2;
    veil.position.y = 0.001;
    scene.add(veil);
  } else {
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(9, 40),
      new THREE.MeshStandardMaterial({ color: 0x111114, metalness: 0.85, roughness: 0.35 })
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);
  }

  // Halo lumineux au sol sous le produit
  const halo = new THREE.Mesh(
    new THREE.CircleGeometry(1.7, 40),
    new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.12 })
  );
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = 0.002;
  scene.add(halo);

  /* ------------------------------------------------------ Les 3 produits */
  const groups = [buildSneaker(), buildFootball(), buildDumbbell()];
  groups.forEach((g) => {
    g.position.y = 1.05;
    g.visible = false;
    scene.add(g);
  });

  // Remplacement optionnel par de vrais modèles .glb
  await Promise.all(
    GLB_MODELS.map(async (url, i) => {
      if (!url) return;
      try {
        const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
        const { DRACOLoader } = await import("three/addons/loaders/DRACOLoader.js");
        const loader = new GLTFLoader();
        const draco = new DRACOLoader();
        draco.setDecoderPath("https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/");
        loader.setDRACOLoader(draco);
        const gltf = await loader.loadAsync(url);
        const old = groups[i];
        gltf.scene.position.copy(old.position);
        gltf.scene.visible = old.visible;
        scene.remove(old);
        scene.add(gltf.scene);
        groups[i] = gltf.scene;
      } catch (e) {
        console.warn("Modèle 3D non chargé, primitive conservée :", url, e);
      }
    })
  );

  /* ------------------------------------------------- Scroll cinématique */
  let progress = 0;
  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.create({
      trigger: "#hero-wrap",
      start: "top top",
      end: "bottom bottom",
      scrub: 0.6,
      onUpdate: (self) => { progress = self.progress; },
    });
  }

  const pointer = { x: 0, y: 0 };
  addEventListener("pointermove", (e) => {
    pointer.x = (e.clientX / innerWidth) * 2 - 1;
    pointer.y = (e.clientY / innerHeight) * 2 - 1;
  }, { passive: true });

  /* --------------------------------------- Boucle de rendu (économe) */
  let running = true;
  let rafId = 0;
  const clock = new THREE.Clock();

  const io = new IntersectionObserver(([entry]) => {
    setRunning(entry.isIntersecting);
  });
  io.observe(stage);
  document.addEventListener("visibilitychange", () => {
    setRunning(!document.hidden);
  });

  function setRunning(v) {
    if (v === running) return;
    running = v;
    if (running) { clock.getDelta(); tick(); }
    else cancelAnimationFrame(rafId);
  }

  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  const smooth = (t) => t * t * (3 - 2 * t);

  function tick() {
    if (!running) return;
    rafId = requestAnimationFrame(tick);
    const t = clock.getElapsedTime();
    const p3 = progress * 3;
    const chapter = Math.min(2, Math.floor(p3));
    onChapter(chapter);

    groups.forEach((g, i) => {
      // Poids de visibilité : 1 au centre de son chapitre, 0 en dehors
      const w = smooth(THREE.MathUtils.clamp(1 - Math.abs(p3 - (i + 0.5)) * 1.45, 0, 1));
      g.visible = w > 0.003;
      if (!g.visible) return;
      const s = 0.25 + 0.75 * w;
      g.scale.setScalar(s);
      g.position.y = 1.05 + Math.sin(t * 1.2 + i) * 0.07 + (1 - w) * 0.5;
      g.rotation.y = t * 0.45 + p3 * Math.PI * 0.9;
      g.rotation.z = Math.sin(t * 0.6 + i * 2) * 0.05;
      const mats = [];
      g.traverse((o) => o.material && mats.push(o.material));
      mats.forEach((m) => {
        m.transparent = true;
        m.opacity = Math.min(1, w * 1.6);
      });
    });

    halo.material.opacity = 0.09 + Math.sin(t * 1.4) * 0.03;

    // Caméra : zoom léger piloté par le scroll + parallaxe pointeur
    const local = p3 - Math.floor(p3);
    camera.position.z = 4.6 - Math.sin(local * Math.PI) * 0.5;
    camera.position.x += (pointer.x * 0.35 - camera.position.x) * 0.04;
    camera.position.y += (1.15 - pointer.y * 0.2 - camera.position.y) * 0.04;
    camera.lookAt(0, 0.95, 0);

    renderer.render(scene, camera);
  }
  tick();
}

/* ============================================================ Modèles démo
   (stylisés, en primitives — voir l'en-tête pour brancher de vrais .glb) */

const rubber = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.1 });
const glossy = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.25, metalness: 0.4 });

function buildSneaker() {
  const g = new THREE.Group();
  // Semelle
  const sole = new THREE.Mesh(new RoundedBoxGeometry(2.3, 0.32, 0.95, 4, 0.14), rubber(0xe8e8e6));
  sole.position.y = -0.45;
  // Liseré accent de la semelle
  const stripe = new THREE.Mesh(new RoundedBoxGeometry(2.32, 0.1, 0.97, 3, 0.05), glossy(ACCENT));
  stripe.position.y = -0.3;
  // Corps de la chaussure
  const body = new THREE.Mesh(new RoundedBoxGeometry(1.85, 0.62, 0.85, 4, 0.28), rubber(0x1c1c22));
  body.position.set(-0.18, 0.05, 0);
  // Pointe
  const toe = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 18), rubber(0x26262e));
  toe.scale.set(1.25, 0.72, 1.0);
  toe.position.set(0.95, -0.14, 0);
  // Col / talon
  const heel = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.75, 0.8, 3, 0.2), rubber(0x1c1c22));
  heel.position.set(-1.0, 0.22, 0);
  const heelTab = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.5, 0.3, 2, 0.07), glossy(ACCENT2));
  heelTab.position.set(-1.25, 0.35, 0);
  g.add(sole, stripe, body, toe, heel, heelTab);
  // Lacets
  for (let i = 0; i < 4; i++) {
    const lace = new THREE.Mesh(new RoundedBoxGeometry(0.09, 0.06, 0.6, 2, 0.03), rubber(0xd8d8d4));
    lace.position.set(0.42 - i * 0.26, 0.38 - i * 0.05, 0);
    lace.rotation.z = -0.18;
    g.add(lace);
  }
  // Virgule accent sur le flanc
  const swoosh = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.05, 10, 24, Math.PI * 0.9), glossy(ACCENT));
  swoosh.position.set(-0.15, 0.02, 0.44);
  swoosh.rotation.z = Math.PI * 0.75;
  g.add(swoosh);
  g.rotation.z = 0.08;
  g.scale.setScalar(0.92);
  return g;
}

function buildFootball() {
  const g = new THREE.Group();
  const ball = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.85, 1),
    new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.45, flatShading: true })
  );
  // Coutures sombres entre les panneaux
  const seams = new THREE.LineSegments(
    new THREE.EdgesGeometry(ball.geometry),
    new THREE.LineBasicMaterial({ color: 0x16161a })
  );
  ball.add(seams);
  // Quelques panneaux "noirs" simulés par de petits disques posés sur la sphère
  const dir = new THREE.Vector3();
  for (let i = 0; i < 8; i++) {
    const patch = new THREE.Mesh(
      new THREE.CircleGeometry(0.2, 6),
      new THREE.MeshStandardMaterial({ color: 0x141418, roughness: 0.5, side: THREE.DoubleSide })
    );
    dir.setFromSphericalCoords(0.855, Math.acos(1 - (2 * (i + 0.5)) / 8), i * 2.39996);
    patch.position.copy(dir);
    patch.lookAt(dir.clone().multiplyScalar(2));
    ball.add(patch);
  }
  g.add(ball);
  return g;
}

function buildDumbbell() {
  const g = new THREE.Group();
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 1.5, 20),
    new THREE.MeshStandardMaterial({ color: 0xc9c9cf, roughness: 0.25, metalness: 0.9 })
  );
  handle.rotation.z = Math.PI / 2;
  g.add(handle);
  [-0.62, 0.62].forEach((x) => {
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.3, 6), rubber(0x1b1b21));
    plate.rotation.z = Math.PI / 2;
    plate.position.x = x;
    g.add(plate);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.34, 16), glossy(ACCENT));
    cap.rotation.z = Math.PI / 2;
    cap.position.x = x;
    g.add(cap);
  });
  g.rotation.z = -0.15;
  g.rotation.x = 0.2;
  return g;
}
