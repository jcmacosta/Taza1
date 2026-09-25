"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import * as THREE from "three"

// Medidas físicas reales de la taza
const DIAMETRO_CM = 8
const ALTO_CM = 9
// Escala a unidades de escena (1 unidad = 1 cm / 4 para encuadre cómodo)
const UNIT = 0.25
const RADIUS = (DIAMETRO_CM / 2) * UNIT // radio del cuerpo
const HEIGHT = ALTO_CM * UNIT // alto del cuerpo

function MugModel({
  texture,
  autoSpin,
  spinRef,
}: {
  texture: THREE.Texture | null
  autoSpin: boolean
  spinRef: React.MutableRefObject<number>
}) {
  const groupRef = useRef<THREE.Group>(null)

  // Material del cuerpo exterior: usa la textura envolvente o cerámica blanca
  const bodyMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      map: texture ?? null,
      color: texture ? 0xffffff : 0xf3f4f6,
      roughness: 0.28,
      metalness: 0.04,
      envMapIntensity: 0.9,
    })
  }, [texture])

  // Cerámica interior / bordes
  const ceramicMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0xf1f2f4,
        roughness: 0.35,
        metalness: 0.03,
        side: THREE.DoubleSide,
        envMapIntensity: 0.8,
      }),
    [],
  )

  const innerMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0xd9dbdf,
        roughness: 0.5,
        metalness: 0.02,
        side: THREE.BackSide,
      }),
    [],
  )

  useFrame(() => {
    const g = groupRef.current
    if (!g) return
    if (autoSpin) {
      spinRef.current += 0.006
    }
    g.rotation.y = spinRef.current
  })

  // Curva del asa (torus parcial) situada al costado del cuerpo
  const handleGeometry = useMemo(() => {
    const tube = RADIUS * 0.16
    const handleR = HEIGHT * 0.3
    const geo = new THREE.TorusGeometry(handleR, tube, 20, 60, Math.PI * 1.15)
    return geo
  }, [])

  return (
    <group ref={groupRef}>
      {/* Cuerpo exterior con el diseño envuelto (cilindro sin tapas) */}
      <mesh material={bodyMaterial}>
        <cylinderGeometry args={[RADIUS, RADIUS * 0.97, HEIGHT, 96, 1, true]} />
      </mesh>

      {/* Pared interior */}
      <mesh material={innerMaterial}>
        <cylinderGeometry args={[RADIUS * 0.93, RADIUS * 0.9, HEIGHT, 96, 1, true]} />
      </mesh>

      {/* Fondo interior */}
      <mesh position={[0, -HEIGHT / 2 + HEIGHT * 0.08, 0]} material={ceramicMaterial}>
        <cylinderGeometry args={[RADIUS * 0.9, RADIUS * 0.9, HEIGHT * 0.02, 96]} />
      </mesh>

      {/* Base sólida exterior */}
      <mesh position={[0, -HEIGHT / 2, 0]} material={ceramicMaterial}>
        <cylinderGeometry args={[RADIUS * 0.97, RADIUS * 0.9, HEIGHT * 0.04, 96]} />
      </mesh>

      {/* Labio superior redondeado */}
      <mesh position={[0, HEIGHT / 2, 0]} rotation={[Math.PI / 2, 0, 0]} material={ceramicMaterial}>
        <torusGeometry args={[RADIUS * 0.965, RADIUS * 0.05, 16, 96]} />
      </mesh>

      {/* Asa */}
      <mesh
        geometry={handleGeometry}
        material={ceramicMaterial}
        position={[RADIUS * 0.98, 0, 0]}
        rotation={[0, 0, -Math.PI / 2 - 0.58]}
      />
    </group>
  )
}

export default function Mug3D({ imageSrc }: { imageSrc: string | null }) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null)
  const [autoSpin, setAutoSpin] = useState(true)
  const spinRef = useRef(0)
  const draggingRef = useRef(false)
  const lastXRef = useRef(0)

  // Cargar la textura envolvente desde la imagen del usuario.
  // Se compone sobre un canvas que representa TODA la circunferencia,
  // dejando una franja cerámica sin imprimir (~2 cm) en la zona del asa,
  // donde es imposible sublimar.
  useEffect(() => {
    if (!imageSrc) {
      setTexture(null)
      return
    }
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      const CIRC_CM = Math.PI * DIAMETRO_CM // circunferencia real ≈ 25.13 cm
      const GAP_CM = 2 // franja no imprimible en el asa
      const coverage = (CIRC_CM - GAP_CM) / CIRC_CM
      const PX_PER_CM = 118.11 // 300 DPI
      const W = Math.round(CIRC_CM * PX_PER_CM)
      const H = Math.round(ALTO_CM * PX_PER_CM)

      const canvas = document.createElement("canvas")
      canvas.width = W
      canvas.height = H
      const ctx = canvas.getContext("2d")!

      // Fondo cerámico (zona del asa que queda sin diseño)
      ctx.fillStyle = "#f1f2f4"
      ctx.fillRect(0, 0, W, H)

      // Área imprimible centrada; los márgenes (mitad de la franja a cada
      // lado) se juntan en la costura y forman el hueco completo en el asa.
      const printW = Math.round(coverage * W)
      const xStart = Math.round((W - printW) / 2)

      // Ajuste "cover" de la foto dentro del área imprimible (respeta proporción)
      const ratio = Math.max(printW / img.width, H / img.height)
      const dw = img.width * ratio
      const dh = img.height * ratio
      const dx = xStart + (printW - dw) / 2
      const dy = (H - dh) / 2

      ctx.save()
      ctx.beginPath()
      ctx.rect(xStart, 0, printW, H)
      ctx.clip()
      ctx.drawImage(img, dx, dy, dw, dh)
      ctx.restore()

      const tex = new THREE.CanvasTexture(canvas)
      tex.colorSpace = THREE.SRGBColorSpace
      tex.wrapS = THREE.RepeatWrapping
      tex.wrapT = THREE.ClampToEdgeWrapping
      tex.center.set(0.5, 0.5)
      // La costura (centro del hueco) queda alineada con el asa (+X → u=0.25)
      tex.offset.x = 0.25
      tex.anisotropy = 8
      tex.needsUpdate = true
      setTexture(tex)
    }
    img.src = imageSrc
  }, [imageSrc])

  function onPointerDown(e: React.PointerEvent) {
    draggingRef.current = true
    setAutoSpin(false)
    lastXRef.current = e.clientX
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!draggingRef.current) return
    const dx = e.clientX - lastXRef.current
    lastXRef.current = e.clientX
    spinRef.current += dx * 0.01
  }
  function onPointerUp(e: React.PointerEvent) {
    draggingRef.current = false
    try {
      ;(e.target as Element).releasePointerCapture?.(e.pointerId)
    } catch {
      // ignore
    }
  }

  return (
    <div
      className="relative aspect-[4/3] w-full cursor-grab touch-none overflow-hidden rounded-xl border border-border bg-gradient-to-b from-muted/50 to-background active:cursor-grabbing"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <Canvas camera={{ position: [0, 0, 5.6], fov: 38 }} dpr={[1, 2]}>
        <color attach="background" args={["#eef1f4"]} />
        <hemisphereLight args={[0xffffff, 0x9aa0a6, 0.7]} />
        <ambientLight intensity={0.35} />
        {/* Luz principal (key) desde la izquierda superior */}
        <directionalLight position={[-4, 5, 4]} intensity={1.15} />
        {/* Relleno frontal suave */}
        <directionalLight position={[2, 1, 5]} intensity={0.45} />
        {/* Contraluz para separar el borde y dar volumen cerámico */}
        <directionalLight position={[3, 2, -4]} intensity={0.8} />
        <MugModel texture={texture} autoSpin={autoSpin} spinRef={spinRef} />
      </Canvas>

      {!imageSrc ? (
        <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-4">
          <span className="rounded-full bg-background/80 px-3 py-1 text-xs text-muted-foreground shadow-sm">
            Sube tu foto para ver el mockup 360°
          </span>
        </div>
      ) : null}
    </div>
  )
}
