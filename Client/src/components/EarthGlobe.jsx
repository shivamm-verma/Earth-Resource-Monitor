import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export default function EarthGlobe() {
  const mountRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    let width = mount.clientWidth
    let height = mount.clientHeight

    // --- Renderer ---
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    renderer.shadowMap.enabled = true
    mount.appendChild(renderer.domElement)

    // --- Scene & Camera ---
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000)
    camera.position.z = 2.8

    // --- Texture Loader ---
    const loader = new THREE.TextureLoader()
    loader.crossOrigin = 'anonymous'

    // NASA Blue Marble textures (public domain)
    const earthDayMap     = loader.load('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
    const earthNightMap   = loader.load('https://unpkg.com/three-globe/example/img/earth-night.jpg')
    const earthCloudsMap  = loader.load('https://unpkg.com/three-globe/example/img/earth-clouds.png')
    const earthBumpMap    = loader.load('https://unpkg.com/three-globe/example/img/earth-topology.png')
    const earthWaterMap   = loader.load('https://unpkg.com/three-globe/example/img/earth-water.png')

    // --- Earth ---
    const earthGeo = new THREE.SphereGeometry(1, 128, 128)
    const earthMat = new THREE.MeshPhongMaterial({
      map:          earthDayMap,
      bumpMap:      earthBumpMap,
      bumpScale:    0.05,
      specularMap:  earthWaterMap,
      specular:     new THREE.Color(0x4488aa),
      shininess:    25,
    })
    const earth = new THREE.Mesh(earthGeo, earthMat)
    scene.add(earth)

    // --- Night lights layer ---
    const nightGeo = new THREE.SphereGeometry(1.001, 128, 128)
    const nightMat = new THREE.MeshLambertMaterial({
      map:         earthNightMap,
      transparent: true,
      blending:    THREE.AdditiveBlending,
      opacity:     0,               // controlled dynamically
      depthWrite:  false,
    })
    const nightEarth = new THREE.Mesh(nightGeo, nightMat)
    scene.add(nightEarth)

    // --- Clouds ---
    const cloudGeo = new THREE.SphereGeometry(1.012, 128, 128)
    const cloudMat = new THREE.MeshPhongMaterial({
      map:         earthCloudsMap,
      transparent: true,
      opacity:     0.38,
      depthWrite:  false,
      blending:    THREE.NormalBlending,
    })
    const clouds = new THREE.Mesh(cloudGeo, cloudMat)
    scene.add(clouds)

    // --- Atmosphere glow (fake scattering) ---
    const atmoGeo = new THREE.SphereGeometry(1.1, 64, 64)
    const atmoMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
          gl_FragColor = vec4(0.2, 0.55, 1.0, 1.0) * intensity;
        }
      `,
      blending:    THREE.AdditiveBlending,
      side:        THREE.BackSide,
      transparent: true,
      depthWrite:  false,
    })
    const atmosphere = new THREE.Mesh(atmoGeo, atmoMat)
    scene.add(atmosphere)

    // --- Stars ---
    const starGeo = new THREE.BufferGeometry()
    const starCount = 2000
    const positions = new Float32Array(starCount * 3)
    const sizes     = new Float32Array(starCount)
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi   = Math.acos(2 * Math.random() - 1)
      const r     = 8 + Math.random() * 4
      positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = r * Math.cos(phi)
      sizes[i] = Math.random() * 1.5 + 0.3
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    starGeo.setAttribute('size',     new THREE.BufferAttribute(sizes, 1))

    // Per-star color — whites, warm yellows, cool blues
    const starColors = new Float32Array(starCount * 3)
    const palette = [
      [1.0, 1.0, 1.0],   // pure white
      [1.0, 0.95, 0.8],  // warm white
      [0.8, 0.9, 1.0],   // cool blue-white
      [1.0, 0.85, 0.6],  // warm yellow
      [0.9, 0.95, 1.0],  // icy blue
    ]
    for (let i = 0; i < starCount; i++) {
      const c = palette[Math.floor(Math.random() * palette.length)]
      starColors[i * 3]     = c[0]
      starColors[i * 3 + 1] = c[1]
      starColors[i * 3 + 2] = c[2]
    }
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3))

    const starMat = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 }
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vSize;
        uniform float time;
        void main() {
          vColor = color;
          vSize  = size;
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          float twinkle = 0.75 + 0.25 * sin(time * 2.0 + position.x * 13.7 + position.y * 7.3);
          gl_PointSize = size * twinkle * (300.0 / -mvPos.z);
          gl_Position  = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vSize;
        void main() {
          vec2 uv = gl_PointCoord - vec2(0.5);
          float d = length(uv);
          if (d > 0.5) discard;

          // Soft glow core
          float core  = exp(-d * d * 18.0);
          // Wider halo
          float halo  = exp(-d * d * 5.0) * 0.35;
          // Cross-spike diffraction (big stars only)
          float spike = 0.0;
          if (vSize > 1.2) {
            spike += exp(-abs(uv.x) * 28.0) * exp(-abs(uv.y) * 5.0) * 0.5;
            spike += exp(-abs(uv.y) * 28.0) * exp(-abs(uv.x) * 5.0) * 0.5;
          }

          float alpha = clamp(core + halo + spike, 0.0, 1.0);
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      depthWrite:  false,
      blending:    THREE.AdditiveBlending,
      vertexColors: true,
    })

    const starPoints = new THREE.Points(starGeo, starMat)
    scene.add(starPoints)

    // --- Orbit ring ---
    const ringGeo = new THREE.TorusGeometry(1.42, 0.003, 2, 200)
    const ringMat = new THREE.MeshBasicMaterial({
      color:       0x3a9fff,
      transparent: true,
      opacity:     0.2,
    })
    const orbitRing = new THREE.Mesh(ringGeo, ringMat)
    orbitRing.rotation.x = Math.PI / 2.4
    orbitRing.rotation.z = Math.PI / 6
    scene.add(orbitRing)

    // --- Satellite ---
    const satGroup = new THREE.Group()
    const satBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.028, 0.014, 0.014),
      new THREE.MeshBasicMaterial({ color: 0xdddddd })
    )
    const panelL = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.002, 0.018),
      new THREE.MeshBasicMaterial({ color: 0x3a9fff, transparent: true, opacity: 0.85 })
    )
    const panelR = panelL.clone()
    panelL.position.x = -0.036
    panelR.position.x =  0.036
    satGroup.add(satBody, panelL, panelR)
    scene.add(satGroup)

    // --- Lights ---
    // Sun — main directional light
    const sunLight = new THREE.DirectionalLight(0xfff5e0, 2.8)
    sunLight.position.set(5, 2, 4)
    scene.add(sunLight)

    // Ambient — very low so night side stays dark
    const ambientLight = new THREE.AmbientLight(0x111133, 0.6)
    scene.add(ambientLight)

    // Soft fill from opposite side (dim blue)
    const fillLight = new THREE.DirectionalLight(0x2244aa, 0.15)
    fillLight.position.set(-5, -2, -4)
    scene.add(fillLight)

    // --- Mouse drag ---
    let isDragging = false
    let prevMouse  = { x: 0, y: 0 }
    let rotVel     = { x: 0, y: 0 }

    const onMouseDown = (e) => { isDragging = true; prevMouse = { x: e.clientX, y: e.clientY } }
    const onMouseMove = (e) => {
      if (!isDragging) return
      const dx = e.clientX - prevMouse.x
      const dy = e.clientY - prevMouse.y
      rotVel.y = dx * 0.005
      rotVel.x = dy * 0.005
      prevMouse = { x: e.clientX, y: e.clientY }
    }
    const onMouseUp = () => { isDragging = false }

    const onTouchStart = (e) => { isDragging = true; prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY } }
    const onTouchMove  = (e) => {
      if (!isDragging) return
      const dx = e.touches[0].clientX - prevMouse.x
      const dy = e.touches[0].clientY - prevMouse.y
      rotVel.y = dx * 0.005
      rotVel.x = dy * 0.005
      prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }

    mount.addEventListener('mousedown',  onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup',   onMouseUp)
    mount.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove,  { passive: true })
    window.addEventListener('touchend',  onMouseUp)

    // --- Resize ---
    const handleResize = () => {
      width  = mount.clientWidth
      height = mount.clientHeight
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }
    window.addEventListener('resize', handleResize)

    // --- Animate ---
    let satAngle = 0
    let animId

    const animate = () => {
      animId = requestAnimationFrame(animate)

      // Auto-rotate + dampen drag velocity
      if (!isDragging) {
        earth.rotation.y      += 0.0018 + rotVel.y * 0.3
        nightEarth.rotation.y += 0.0018 + rotVel.y * 0.3
        clouds.rotation.y     += 0.0022 + rotVel.y * 0.3
        earth.rotation.x      += rotVel.x * 0.3
        nightEarth.rotation.x += rotVel.x * 0.3
        clouds.rotation.x     += rotVel.x * 0.3
        rotVel.x *= 0.9
        rotVel.y *= 0.9
      } else {
        earth.rotation.y      += rotVel.y
        nightEarth.rotation.y += rotVel.y
        clouds.rotation.y     += rotVel.y
        earth.rotation.x      += rotVel.x
        nightEarth.rotation.x += rotVel.x
        clouds.rotation.x     += rotVel.x
      }

      // Night side opacity — dark on sun side, visible on back
      // Use dot product of sun direction with earth front face
      const sunDir   = new THREE.Vector3(5, 2, 4).normalize()
      const camDir   = new THREE.Vector3(0, 0, 1)
      const dot      = sunDir.dot(camDir)
      nightMat.opacity = Math.max(0, 0.9 - dot * 1.5)

      // Satellite orbit
      satAngle += 0.007
      const orbitR = 1.42
      const tilt   = Math.PI / 2.4
      satGroup.position.set(
        orbitR * Math.cos(satAngle),
        orbitR * Math.sin(satAngle) * Math.sin(tilt) * 0.6,
        orbitR * Math.sin(satAngle) * Math.cos(tilt) * 0.4
      )
      satGroup.rotation.y = -satAngle + Math.PI / 2
      starMat.uniforms.time.value += 0.008

      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(animId)
      mount.removeEventListener('mousedown',  onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup',   onMouseUp)
      mount.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend',  onMouseUp)
      window.removeEventListener('resize',    handleResize)
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
      renderer.dispose()
    }
  }, [])

  return (
    <div
      ref={mountRef}
      className="w-full h-full cursor-grab active:cursor-grabbing"
    />
  )
}