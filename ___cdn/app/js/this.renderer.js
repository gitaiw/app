/*
====================
 * @2026
 * webgl function
 * published: aiw.boo collaboration with ai
====================
 */
/*
====================
 * 
 * INFINITE LIST IMAGE
 * 
====================
 */

(function(){

class Aplikasi {
  constructor() {
    const shadow = document.getElementById("webgl___Shadow");
    if (!shadow) return;

    this.scrollSekarang = 0;
    this.scrollTarget = 0;
    this.scrollSebelumnya = 0;
    this.autoSpeed = 0.5; 

    this.scene = new THREE.Scene();
    
    const width = document.documentElement.clientWidth;
    const height = document.documentElement.clientHeight;

    this.kamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.kamera.position.z = 5;

    this.updatePixelToUnit();

    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.autoClear = false;

    const body = document.body;
    let bgRaw = getComputedStyle(body).getPropertyValue('--this-data-background-theme').trim();
    if (!bgRaw) bgRaw = '#000000';
    const bgColor = new THREE.Color(bgRaw);

    this.renderer.setClearColor(bgColor, 1);

    shadow.appendChild(this.renderer.domElement);

    const overlayGeom = new THREE.PlaneBufferGeometry(100, 100); 
    this.overlayMaterial = new THREE.MeshBasicMaterial({
      color: bgColor,
      transparent: true,
      opacity: 0.001,
      depthWrite: false,
      depthTest: false
    });

    this.sceneOverlay = new THREE.Mesh(overlayGeom, this.overlayMaterial);
    this.sceneOverlay.position.z = 1; 
    this.scene.add(this.sceneOverlay);

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.daftarItem = [];
    this.totalTinggiKonten = 0;

    this.init();

    window.addEventListener("wheel", (e) => {
      if (this.isAnyFullscreen() || document.getElementById("sidebar")?.classList.contains("active")) return;
      this.scrollTarget += e.deltaY;
      this.autoSpeed = e.deltaY > 0 ? 0.5 : -0.5;
    }, { passive: true });

    this.touchStart = 0;
    window.addEventListener("touchstart", (e) => { this.touchStart = e.touches[0].clientY; });
    window.addEventListener("touchmove", (e) => {
      if (this.isAnyFullscreen() || document.getElementById("sidebar")?.classList.contains("active")) return;
      const delta = this.touchStart - e.touches[0].clientY;
      this.scrollTarget += delta * 2.5;
      if (Math.abs(delta) > 0.1) this.autoSpeed = delta > 0 ? 0.5 : -0.5;
      this.touchStart = e.touches[0].clientY;
    });

    window.addEventListener("click", (e) => {
      const w = document.documentElement.clientWidth;
      const h = document.documentElement.clientHeight;
      this.mouse.x = (e.clientX / w) * 2 - 1;
      this.mouse.y = -(e.clientY / h) * 2 + 1;
      this.raycaster.setFromCamera(this.mouse, this.kamera);
      
      const objectsToIntersect = this.scene.children.filter(obj => obj !== this.sceneOverlay);
      const intersects = this.raycaster.intersectObjects(objectsToIntersect);
      
      if (intersects.length > 0) {
        const obj = intersects[0].object;
        if (obj.userData.parent) obj.userData.parent.onClick();
      }
    });

    window.addEventListener("resize", () => this.ubahUkuran());
    this.animasi();
  }

  isAnyFullscreen() {
    return this.daftarItem.some(item => item.isFullscreen);
  }

  init() {
    const elemenSemua = document.querySelectorAll(".elemen");
    if (elemenSemua.length === 0) return;
    elemenSemua.forEach((elemen) => {
      const item = new ItemMesh(this, elemen);
      if (item.mesh) {
        this.daftarItem.push(item);
        elemen.style.opacity = 0; 
      }
    });
    this.hitungUlangLayout();
  }

  hitungUlangLayout() {
    const elemenSemua = document.querySelectorAll(".elemen");
    if (elemenSemua.length === 0) return;
    const rectPertama = elemenSemua[0].getBoundingClientRect();
    const rectTerakhir = elemenSemua[elemenSemua.length - 1].getBoundingClientRect();
    const margin = parseInt(getComputedStyle(elemenSemua[0]).marginBottom || 0);
    this.totalTinggiKonten = (rectTerakhir.top + rectTerakhir.height) - rectPertama.top + margin;
    this.daftarItem.forEach(item => item.onResize());
  }

  updatePixelToUnit() {
    const h = document.documentElement.clientHeight;
    const fov = (this.kamera.fov * Math.PI) / 180;
    const heightUnit = 2 * Math.tan(fov / 2) * this.kamera.position.z;
    this.pixelToUnit = heightUnit / h;
  }

  ubahUkuran() {
    if (!this.renderer) return;
    const w = document.documentElement.clientWidth;
    const h = document.documentElement.clientHeight;
    this.renderer.setSize(w, h);
    this.kamera.aspect = w / h;
    this.kamera.updateProjectionMatrix();
    this.updatePixelToUnit();
    this.hitungUlangLayout();
  }

  animasi() {
    requestAnimationFrame(() => this.animasi());
    if (this.daftarItem.length === 0) return;

    if (this.isAnyFullscreen()) {
      this.scrollTarget = this.scrollSekarang; 
    } else {
      this.scrollTarget += this.autoSpeed;
    }

    this.scrollSekarang += (this.scrollTarget - this.scrollSekarang) * 0.1;
    
    const itemFull = this.daftarItem.find(item => item.isFullscreen);
    const p = itemFull ? itemFull.progress : 0;

    this.overlayMaterial.opacity = Math.max(p, 0.001);

    this.daftarItem.forEach(item => {
      item.perbarui(this.scrollSekarang, this.scrollSebelumnya);
    });

    this.renderer.clear();
    this.renderer.render(this.scene, this.kamera);

    this.scrollSebelumnya = this.scrollSekarang;
  }
}

class ItemMesh {
  constructor(aplikasi, elemen) {
    this.aplikasi = aplikasi;
    this.elemen = elemen;
    this.scrollSmooth = 0;
    this.isClicked = false;
    this.isFullscreen = false;
    this.progress = 0;
    this.freezeScroll = 0;
    this.naturalRatio = 1; 

    this.link = elemen.getAttribute('data-img-click');
    const img = elemen.querySelector('img');
    if (!img) return;

    if (img.complete) {
      this.naturalRatio = img.naturalWidth / img.naturalHeight;
    } else {
      img.onload = () => { this.naturalRatio = img.naturalWidth / img.naturalHeight; };
    }

    this.onResize();

    this.tekstur = new THREE.TextureLoader().load(img.src);
    this.tekstur.wrapS = this.tekstur.wrapT = THREE.ClampToEdgeWrapping;
    this.tekstur.minFilter = THREE.LinearFilter;
    this.tekstur.generateMipmaps = false;

    this.geometri = new THREE.PlaneBufferGeometry(1, 1, 64, 64);
    this.material = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: {
        uTekstur: { value: this.tekstur },
        uScroll: { value: 0 },
        uProgress: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        uniform float uScroll;
        uniform float uProgress;
        void main() {
          vUv = uv;
          vec3 pos = position;
          float wave = sin(uv.x * 3.1415) * uScroll * 0.003;
          pos.y += wave * (1.0 - uProgress);
          float dist = distance(uv, vec2(0.5));
          float strength = sin(uProgress * 3.1415);
          float ripple = sin(dist * 12.0 - uProgress * 10.0) * strength * 0.2;
          pos.z += ripple;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform sampler2D uTekstur;
        uniform float uProgress;
        void main(){
          vec2 uv = clamp(vUv, 0.0001, 0.9999);
          float shift = sin(uProgress * 3.1415) * 0.015;
          float r = texture2D(uTekstur, uv + shift).r;
          float g = texture2D(uTekstur, uv).g;
          float b = texture2D(uTekstur, uv - shift).b;
          gl_FragColor = vec4(r, g, b, 1.0);
        }
      `,
    });

    this.mesh = new THREE.Mesh(this.geometri, this.material);
    this.mesh.userData.parent = this;
    this.mesh.position.z = 0; 
    this.aplikasi.scene.add(this.mesh);
  }

  onClick() {
    if (this.link && this.link !== "nolink") {
      if (this.isClicked) return;
      this.isClicked = true;
      this.isFullscreen = true;
      this.freezeScroll = this.aplikasi.scrollSekarang;
      setTimeout(() => { window.location.href = this.link; }, 1500);
    } else {
      if (!this.isFullscreen) {
        this.isFullscreen = true;
        this.isClicked = true;
        this.freezeScroll = this.aplikasi.scrollSekarang;
      } else {
        this.isFullscreen = false;
        this.aplikasi.scrollTarget = this.freezeScroll;
        this.aplikasi.scrollSekarang = this.freezeScroll;
        this.aplikasi.scrollSebelumnya = this.freezeScroll;
        this.scrollSmooth = 0;
        setTimeout(() => { this.isClicked = false; }, 800);
      }
    }
  }

  onResize() {
    if (!this.elemen) return;
    const rect = this.elemen.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.initialTop = rect.top + this.aplikasi.scrollSekarang;
    this.left = rect.left;
  }

  perbarui(scrollSekarang, scrollSebelumnya) {
  if (!this.mesh) return;

  const p2u = this.aplikasi.pixelToUnit;
  const total = this.aplikasi.totalTinggiKonten;
  const ww = document.documentElement.clientWidth;
  const wh = document.documentElement.clientHeight;

  if (this.isFullscreen) scrollSekarang = this.freezeScroll;

  let yDinamis = (this.initialTop - scrollSekarang) % total;
  if (yDinamis < -this.height) yDinamis += total;
  if (yDinamis > total - this.height) yDinamis -= total;

  let target = this.isFullscreen ? 1.0 : 0.0;
  this.progress += (target - this.progress) * 0.08;
  this.material.uniforms.uProgress.value = this.progress;

  let delta = this.isFullscreen ? 0 : (scrollSekarang - scrollSebelumnya);
  this.scrollSmooth += (delta - this.scrollSmooth) * 0.1;
  this.material.uniforms.uScroll.value = this.scrollSmooth;

  let nW = this.width * p2u;
  let nH = this.height * p2u;
  let nX = (this.left + this.width / 2 - ww / 2) * p2u;
  let nY = (-yDinamis - this.height / 2 + wh / 2) * p2u;

  const screenRatio = ww / wh;
  let fW, fH;

  if (screenRatio > this.naturalRatio) {
    fH = wh * p2u;
    fW = fH * this.naturalRatio;
  } else {
    fW = ww * p2u;
    fH = fW / this.naturalRatio;
  }

  const maxScale = 1.0;
  fW = Math.min(fW, nW * maxScale);
  fH = Math.min(fH, nH * maxScale);

  let t = this.progress;
  let finalW = nW + (fW - nW) * t;
  let finalH = nH + (fH - nH) * t;
  let finalX = nX + (0 - nX) * t;
  let finalY = nY + (0 - nY) * t;
  let finalZ = t * 2;

  this.mesh.scale.set(finalW, finalH, 1);
  this.mesh.position.set(finalX, finalY, finalZ);
}
}

window.AplikasiClass = Aplikasi;

})();
