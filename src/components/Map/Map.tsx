import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createMapDots } from "./utils";
import { DISPLACEMENT_SCALE_TOPOLOGY, DISPLACEMENT_SCALE_CAMPUS } from '../../constants';

const DOTS = [[0.4, 0.2], [0.2, 0.4]];

const Map = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);

    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 50, 50);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.enableDamping = true;

    // ---- LIGHTING ----
    const ambient = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 0.8);
    sun.position.set(1, 2, 1);
    scene.add(sun);

    const loader = new THREE.TextureLoader();

    // Load campus texture for displacement and base color
    loader.load("/campus.png", (campusTex) => {
      campusTex.colorSpace = THREE.SRGBColorSpace;
      const campusImage = campusTex.image as HTMLImageElement;
      const w = campusImage.width;
      const h = campusImage.height;

      // Load topology displacement map
      loader.load("/displacement_map.png", (topologyDisp) => {
        topologyDisp.minFilter = THREE.LinearFilter;
        topologyDisp.magFilter = THREE.LinearFilter;

        const width = 100;
        const height = width / (w / h);

        const dotsGroup = createMapDots({
          dots: DOTS,
          campusImage: campusImage,
          topologyDispImage: topologyDisp.image as HTMLImageElement,
          campusScale: DISPLACEMENT_SCALE_CAMPUS,
          topologyScale: DISPLACEMENT_SCALE_TOPOLOGY,
          planeWidth: width,
          planeHeight: height
        });

        scene.add(dotsGroup);

        const segments = 512;
        const geometry = new THREE.PlaneGeometry(width, height, segments, segments);

        const uniforms = {
          campusDisp: { value: campusTex },
          topologyDisp: { value: topologyDisp },
          campusScale: { value: DISPLACEMENT_SCALE_CAMPUS },
          topologyScale: { value: DISPLACEMENT_SCALE_TOPOLOGY },
          // Using campusTex directly as the map instead of a canvas with topo lines
          mapTexture: { value: campusTex },
        };

        const material = new THREE.ShaderMaterial({
          uniforms,
          vertexShader: `
            varying vec2 vUv;
            uniform sampler2D campusDisp;
            uniform sampler2D topologyDisp;
            uniform float campusScale;
            uniform float topologyScale;

            void main() {
              vUv = uv;
              float h1 = texture2D(campusDisp, uv).r;
              float h2 = texture2D(topologyDisp, uv).r;
              vec3 displaced = position;
              displaced.z += h1 * campusScale + h2 * topologyScale;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
            }
          `,
          fragmentShader: `
            varying vec2 vUv;
            uniform sampler2D mapTexture;
            void main() {
              gl_FragColor = texture2D(mapTexture, vUv);
            }
          `,
          side: THREE.DoubleSide,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2;
        scene.add(mesh);
      });
    });

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    let frameId: number;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ position: "fixed", inset: 0, overflow: "hidden" }}
    />
  );
};

export default Map;