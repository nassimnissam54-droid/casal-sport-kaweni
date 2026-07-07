/* ==========================================================================
   home.js — page d'accueil : décide 3D ou repli, anime les textes,
   charge les produits phares, gère le son.
   ========================================================================== */
import { loadProducts, productCard } from "./store.js";

const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/* Découpe les titres en lettres pour l'animation lettre par lettre */
function splitText() {
  document.querySelectorAll(".split-text").forEach((el) => {
    el.querySelectorAll(":scope > *, :scope").forEach(() => {});
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          for (const ch of child.textContent) {
            const s = document.createElement("span");
            s.className = "ch";
            s.style.display = "inline-block";
            s.textContent = ch === " " ? " " : ch;
            frag.appendChild(s);
          }
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          walk(child);
        }
      });
    };
    walk(el);
  });
}

function animateChapter(chapter) {
  if (!window.gsap) return;
  const letters = chapter.querySelectorAll(".ch");
  const rest = chapter.querySelectorAll("p, .badge");
  gsap.fromTo(letters, { yPercent: 110, opacity: 0 }, {
    yPercent: 0, opacity: 1, duration: 0.6, stagger: 0.028, ease: "power3.out",
  });
  gsap.fromTo(rest, { y: 24, opacity: 0 }, {
    y: 0, opacity: 1, duration: 0.6, stagger: 0.12, delay: 0.2, ease: "power2.out",
  });
}

/* ------------------------------------------------ Mode 3D ou repli */
const use3D = webglAvailable() && !reducedMotion;
document.body.classList.add(use3D ? "has-3d" : "no-3d");

const chapters = [...document.querySelectorAll(".hero-chapter")];

if (use3D) {
  // Chargement paresseux du module 3D (Three.js n'est téléchargé qu'ici)
  import("./hero3d.js")
    .then((m) => m.initHero({ onChapter: showChapter }))
    .catch((e) => {
      console.warn("3D indisponible, repli statique :", e);
      document.body.classList.remove("has-3d");
      document.body.classList.add("no-3d");
      staticFallback();
    });
} else {
  staticFallback();
}

let current = -1;
function showChapter(i) {
  if (i === current) return;
  current = i;
  chapters.forEach((c, k) => c.classList.toggle("active", k === i));
  if (!reducedMotion) animateChapter(chapters[i]);
  const hint = document.getElementById("scroll-hint");
  if (hint) hint.style.opacity = i >= chapters.length - 1 ? "0" : "1";
}

function staticFallback() {
  // Sans 3D : un seul écran hero, premier chapitre visible.
  document.getElementById("hero-canvas")?.remove();
  chapters[0].classList.add("active");
  chapters[0].style.position = "relative";
  chapters[0].style.minHeight = "88vh";
  chapters.slice(1).forEach((c) => c.remove());
  document.getElementById("scroll-hint")?.remove();
}

whenGsapReady(() => {
  splitText();
  if (!use3D) animateChapter(chapters[0]);
});

function whenGsapReady(fn) {
  if (window.gsap) return fn();
  window.addEventListener("load", () => window.gsap && fn());
}

/* ------------------------------------------------ Son d'ambiance (opt-in) */
const soundBtn = document.getElementById("sound-toggle");
if (soundBtn && use3D && "AudioContext" in window) {
  soundBtn.hidden = false;
  let ctx = null, gain = null;
  soundBtn.addEventListener("click", () => {
    const on = soundBtn.getAttribute("aria-pressed") !== "true";
    soundBtn.setAttribute("aria-pressed", String(on));
    soundBtn.textContent = on ? "♪ Couper le son" : "♪ Activer le son";
    if (on && !ctx) {
      // Nappe ambiante synthétisée : aucun fichier audio à télécharger.
      ctx = new AudioContext();
      gain = ctx.createGain();
      gain.gain.value = 0;
      gain.connect(ctx.destination);
      [55, 110, 165.2].forEach((f, i) => {
        const o = ctx.createOscillator();
        o.type = i === 0 ? "sine" : "triangle";
        o.frequency.value = f;
        const g = ctx.createGain();
        g.gain.value = i === 0 ? 0.5 : 0.12;
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.07 + i * 0.05;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 0.05;
        lfo.connect(lfoGain).connect(g.gain);
        o.connect(g).connect(gain);
        o.start(); lfo.start();
      });
    }
    if (ctx) {
      ctx.resume();
      gain.gain.linearRampToValueAtTime(on ? 0.08 : 0, ctx.currentTime + 0.8);
    }
  });
}

/* ------------------------------------------------ Produits phares */
loadProducts().then((products) => {
  const grid = document.getElementById("featured-grid");
  if (!grid) return;
  grid.innerHTML = products.filter((p) => p.featured).slice(0, 4).map(productCard).join("");
});
