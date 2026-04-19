import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { createMapDots, getClickedDot, getHoveredDot } from "./utils/dots";
import { createCompass } from "./utils/compass";
import { createContourLines } from "./utils/contourLines";
import { DISPLACEMENT_SCALE_TOPOLOGY, DISPLACEMENT_SCALE_CAMPUS } from '../../constants';
import { fetchBuildingsFromSheet } from "./utils/fetchBuildings";
import type { Dot } from "../../data/DotType";

const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/u/1/d/e/2PACX-1vS7CpL6NQ_T7B_ILk7lKjWNlO3pvD0Fzuw2q8Sa2GefZUzNzD7mYfJoOL7GRorTvdb5PLuaU19IhLap/pub?gid=503141692&single=true&output=csv"

const Map = ({ onDotClick }: { onDotClick: Function }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x222222);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 50, 50);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // ---- CSS 2D RENDERER SETUP ----
    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0px';
    labelRenderer.domElement.style.pointerEvents = 'none';
    container.appendChild(labelRenderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    scene.add(new THREE.AmbientLight(0xffffff, 1.2));
    const sun = new THREE.DirectionalLight(0xffffff, 2);
    sun.position.set(1, 2, 1);
    scene.add(sun);

    // ---- COMPASS SETUP ----
    const compass = createCompass();


    let hoveredDot: THREE.Mesh | null = null;

    const onMouseMove = (event: MouseEvent) => {
      if (!dotsGroup) return;

      const newHovered = getHoveredDot(event, camera, dotsGroup);

      // Hide previous
      if (hoveredDot && hoveredDot !== newHovered) {
        const prevLabel = hoveredDot.children.find(c => c.name === "dot-label") as CSS2DObject | undefined;
        if (prevLabel) (prevLabel.element as HTMLElement).style.visibility = 'hidden';
        hoveredDot = null;
      }

      // Show new
      if (newHovered && newHovered !== hoveredDot) {
        const label = newHovered.children.find(c => c.name === "dot-label") as CSS2DObject | undefined;
        if (label) (label.element as HTMLElement).style.visibility = 'visible';
        hoveredDot = newHovered;
      }
    };
    window.addEventListener("mousemove", onMouseMove);

    let dotsGroup: THREE.Group | null = null;

    const onMouseClick = (event: MouseEvent) => {
      if (!dotsGroup) return;
      const clicked = getClickedDot(event, camera, dotsGroup);
      if (clicked) {
        onDotClick(clicked.userData as Dot);
      }
    };

    const loader = new THREE.TextureLoader();
    loader.load("/campus.png", (campusTex) => {
      campusTex.colorSpace = THREE.SRGBColorSpace;
      const campusImg = campusTex.image as HTMLImageElement;

      loader.load("/bpm_displacement.png", (topologyDisp) => {
        const width = 100;
        const height = width / (campusImg.width / campusImg.height);
        const setup = async () => {
          const locations = await fetchBuildingsFromSheet(SHEET_CSV_URL);
          console.log(locations);

          dotsGroup = createMapDots({
            campusImage: campusImg,
            topologyDispImage: topologyDisp.image as HTMLImageElement,
            campusScale: DISPLACEMENT_SCALE_CAMPUS,
            topologyScale: DISPLACEMENT_SCALE_TOPOLOGY,
            planeWidth: width,
            planeHeight: height,
            dots: locations,
          });
          scene.add(dotsGroup);
        }
        setup();

        // ---- CONTOUR LINES ----
        const contourGroup = createContourLines({
          topologyDispImage: topologyDisp.image as HTMLImageElement,
          topologyScale: DISPLACEMENT_SCALE_TOPOLOGY,
          planeWidth: width,
          planeHeight: height,
          levels: 25,      // number of isolines
          color: 0xffffff,
          opacity: 0.35,
          resolution: 256, // marching-squares grid density
          zBias: 0.5,     // lift above surface to avoid z-fighting
        });
        scene.add(contourGroup);

        // Plane Mesh Setup
        const geometry = new THREE.PlaneGeometry(width, height, 512, 512);
        const material = new THREE.ShaderMaterial({
          uniforms: {
            campusDisp: { value: campusTex },
            topologyDisp: { value: topologyDisp },
            campusScale: { value: DISPLACEMENT_SCALE_CAMPUS },
            topologyScale: { value: DISPLACEMENT_SCALE_TOPOLOGY },
            mapTexture: { value: campusTex },
            lift: { value: 0.1 },
            gamma: { value: 0.8 },
          },
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
            uniform float lift;
            uniform float gamma;
            void main() {
              vec4 color = texture2D(mapTexture, vUv);
              vec3 lifted = color.rgb + lift;
              vec3 corrected = pow(lifted, vec3(gamma));
              gl_FragColor = vec4(corrected, color.a);
            }
          `,
          side: THREE.DoubleSide,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2;
        scene.add(mesh);

        window.addEventListener("click", onMouseClick);
      });
    });

    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      labelRenderer.setSize(w, h);
    };

    window.addEventListener("resize", onResize);

    let frameId: number;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
      compass.update(camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("click", onMouseClick);
      window.removeEventListener("mousemove", onMouseMove);
      controls.dispose();
      compass.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
      container.removeChild(labelRenderer.domElement);
    };
  }, []);

  return <div ref={containerRef} style={{ position: "fixed", inset: 0, overflow: "hidden" }} />;
};

export default Map;