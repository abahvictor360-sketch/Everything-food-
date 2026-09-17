/* =============================================================================
   Hero embers — a WebGL spark field for the menu masthead and the home hero.
   Loaded on demand by main.js, and only when the device and the visitor's
   settings can afford it. Everything here is decorative: if the import fails,
   the page is unchanged.
   ========================================================================== */
const THREE = await import('/assets/vendor/three.module.min.js');

const COUNT = 300;
const SPREAD = 26;
const HEIGHT = 16;

/** A soft round sprite, drawn locally so there is no texture request. */
function sparkTexture() {
  const size = 64;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0.0, 'rgba(255, 236, 190, 1)');
  g.addColorStop(0.35, 'rgba(255, 150, 60, 0.75)');
  g.addColorStop(1.0, 'rgba(255, 90, 40, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createEmbers(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 100);
  camera.position.z = 18;

  // Per-particle drift constants live in attributes so the whole field is one
  // draw call and nothing is recomputed on the CPU each frame.
  const positions = new Float32Array(COUNT * 3);
  const seeds = new Float32Array(COUNT);
  const speeds = new Float32Array(COUNT);
  const scales = new Float32Array(COUNT);

  for (let i = 0; i < COUNT; i++) {
    positions[i * 3] = (Math.random() - 0.5) * SPREAD;
    positions[i * 3 + 1] = (Math.random() - 0.5) * HEIGHT;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 12;
    seeds[i] = Math.random() * Math.PI * 2;
    speeds[i] = 0.35 + Math.random() * 0.9;
    scales[i] = 6 + Math.random() * 22;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  geometry.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
  geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uMap: { value: sparkTexture() },
      uHeight: { value: HEIGHT },
      uPointer: { value: new THREE.Vector2(0, 0) },
    },
    vertexShader: `
      attribute float aSeed;
      attribute float aSpeed;
      attribute float aScale;
      uniform float uTime;
      uniform float uHeight;
      uniform vec2 uPointer;
      varying float vFade;

      void main() {
        vec3 p = position;

        // Rise, wrapping back to the bottom so the field never empties.
        float rise = mod(p.y + uTime * aSpeed + aSeed, uHeight) - uHeight * 0.5;
        p.y = rise;

        // Lateral sway, plus a gentle lean away from the pointer.
        p.x += sin(uTime * 0.5 * aSpeed + aSeed) * 1.1 + uPointer.x * 1.6;
        p.z += cos(uTime * 0.35 * aSpeed + aSeed) * 0.8;
        p.y += uPointer.y * 0.6;

        // Fade in off the bottom edge and out at the top.
        float t = (rise + uHeight * 0.5) / uHeight;
        vFade = smoothstep(0.0, 0.18, t) * (1.0 - smoothstep(0.62, 1.0, t));

        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = aScale * (10.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      varying float vFade;

      void main() {
        vec4 tex = texture2D(uMap, gl_PointCoord);
        gl_FragColor = vec4(tex.rgb, tex.a * vFade * 0.55);
        if (gl_FragColor.a < 0.01) discard;
      }
    `,
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);

  const clock = new THREE.Clock();
  const pointer = new THREE.Vector2(0, 0);
  const target = new THREE.Vector2(0, 0);
  let frame = 0;
  let running = false;

  function resize() {
    const w = canvas.clientWidth || canvas.parentElement.clientWidth;
    const h = canvas.clientHeight || canvas.parentElement.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function render() {
    frame = requestAnimationFrame(render);
    material.uniforms.uTime.value = clock.getElapsedTime();
    // Ease the pointer so a flick of the mouse does not snap the field.
    pointer.lerp(target, 0.05);
    material.uniforms.uPointer.value.copy(pointer);
    renderer.render(scene, camera);
  }

  function start() {
    if (running) return;
    running = true;
    clock.start();
    render();
  }

  function stop() {
    if (!running) return;
    running = false;
    cancelAnimationFrame(frame);
  }

  function onPointerMove(e) {
    target.set((e.clientX / window.innerWidth - 0.5) * 2, -(e.clientY / window.innerHeight - 0.5) * 2);
  }

  const ro = new ResizeObserver(resize);
  ro.observe(canvas.parentElement || canvas);
  resize();

  // Only run while the canvas is on screen and the tab is in front.
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => (entry.isIntersecting && !document.hidden ? start() : stop()));
  }, { threshold: 0.01 });
  io.observe(canvas);

  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    window.addEventListener('pointermove', onPointerMove, { passive: true });
  }

  return {
    destroy() {
      stop();
      io.disconnect();
      ro.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      geometry.dispose();
      material.uniforms.uMap.value.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}
