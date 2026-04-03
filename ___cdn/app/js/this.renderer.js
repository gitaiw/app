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
(() => {

class Aplikasi {
  constructor() {
    const shadow = document.getElementById("webgl___Shadow");
    if (!shadow) return;

    this.scrollSekarang = 0;
    this.scrollTarget = 0;
    this.scrollSebelumnya = 0;
    this.autoSpeed = 0.5; 

    this.scene = new THREE.Scene();
    this.kamera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    this.kamera.position.z = 5;

    this.updatePixelToUnit();

    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    shadow.appendChild(this.renderer.domElement);

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
    window.addEventListener("touchstart", (e) => { 
      this.touchStart = e.touches[0].clientY; 
    });

    window.addEventListener("touchmove", (e) => {
      if (this.isAnyFullscreen() || document.getElementById("sidebar")?.classList.contains("active")) return;
      const delta = this.touchStart - e.touches[0].clientY;
      this.scrollTarget += delta * 2.5;
      if (Math.abs(delta) > 0.1) this.autoSpeed = delta > 0 ? 0.5 : -0.5;
      this.touchStart = e.touches[0].clientY;
    });

    window.addEventListener("click", (e) => {
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      this.raycaster.setFromCamera(this.mouse, this.kamera);
      const intersects = this.raycaster.intersectObjects(this.scene.children);
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
    const fov = (this.kamera.fov * Math.PI) / 180;
    const height = 2 * Math.tan(fov / 2) * this.kamera.position.z;
    this.pixelToUnit = height / window.innerHeight;
  }

  ubahUkuran() {
    if (!this.renderer) return;
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.kamera.aspect = window.innerWidth / window.innerHeight;
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
    
    this.daftarItem.forEach(item => {
      item.perbarui(this.scrollSekarang, this.scrollSebelumnya);
    });
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

    this.link = elemen.getAttribute('data-img-click');
    this.onResize();

    const img = elemen.querySelector('img');
    if (!img) return;

    this.tekstur = new THREE.TextureLoader().load(img.src);
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
          vec2 uv = vUv;
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
    this.aplikasi.scene.add(this.mesh);
  }

  onClick() {
    if (this.link && this.link !== "nolink") {
      if (this.isClicked) return;

      this.isClicked = true;
      this.isFullscreen = true;
      this.freezeScroll = this.aplikasi.scrollSekarang;

      setTimeout(() => {
        window.location.href = this.link;
      }, 1500);

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

        setTimeout(() => {
          this.isClicked = false;
        }, 800);
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
    let nX = (this.left + this.width / 2 - window.innerWidth / 2) * p2u;
    let nY = (-yDinamis - this.height / 2 + window.innerHeight / 2) * p2u;

    let imgRatio = this.width / this.height;
    let screenRatio = window.innerWidth / window.innerHeight;

    let fW, fH;
    const margin = 0.85;
    if (screenRatio > imgRatio) {
      fH = window.innerHeight * p2u * margin;
      fW = fH * imgRatio;
    } else {
      fW = window.innerWidth * p2u * margin;
      fH = fW / imgRatio;
    }

    let t = this.progress;
    this.mesh.scale.set(nW + (fW - nW) * t, nH + (fH - nH) * t, 1);
    this.mesh.position.set(nX + (0 - nX) * t, nY + (0 - nY) * t, t * 2);
  }
}

new Aplikasi();

})();
