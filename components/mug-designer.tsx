"use client"

import type React from "react"
import { useRef, useState } from "react"
import dynamic from "next/dynamic"

const Mug3D = dynamic(() => import("./mug-3d"), {
  ssr: false,
  loading: () => (
    <div className="flex aspect-[4/3] w-full items-center justify-center rounded-xl border border-border bg-muted/30 text-sm text-muted-foreground">
      Cargando mockup 3D…
    </div>
  ),
})

const PRECIO_TOTAL = 15000 // Precio base en pesos
const NUMERO_WHATSAPP = "5491121694030" // País (54) + 9 (móvil) + área/número

// Medidas físicas de la taza
const DIAMETRO_CM = 8 // diámetro del contorno imprimible
const ALTO_CM = 9 // alto de la taza
const DPI = 300
const PX_POR_CM = DPI / 2.54 // 300 DPI => 118.11 px/cm
const CIRCUNFERENCIA_CM = Math.PI * DIAMETRO_CM // ~25.13 cm
// Lienzo de exportación a alta resolución (toda la vuelta de la taza)
const EXPORT_W = Math.round(CIRCUNFERENCIA_CM * PX_POR_CM) // ~2969 px
const EXPORT_H = Math.round(ALTO_CM * PX_POR_CM) // ~1063 px

type PaymentType = "total" | "senia"

function formatARS(value: number) {
  return value.toLocaleString("es-AR")
}

export default function MugDesigner() {
  const [name, setName] = useState("")
  const [payment, setPayment] = useState<PaymentType>("total")
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const amount = payment === "total" ? PRECIO_TOTAL : PRECIO_TOTAL / 2

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const src = event.target?.result as string
      setImageSrc(src)

      // Procesar la imagen a la vuelta completa (8 cm diámetro x 9 cm alto) a 300 DPI
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        const ratio = Math.max(canvas.width / img.width, canvas.height / img.height)
        const shiftX = (canvas.width - img.width * ratio) / 2
        const shiftY = (canvas.height - img.height * ratio) / 2
        ctx.drawImage(img, 0, 0, img.width, img.height, shiftX, shiftY, img.width * ratio, img.height * ratio)
      }
      img.src = src
    }
    reader.readAsDataURL(file)
  }

  function sendToWhatsApp() {
    if (!name.trim()) {
      alert("Por favor, ingresa tu nombre.")
      return
    }
    if (!imageSrc) {
      alert("Por favor, sube una imagen para la taza.")
      return
    }

    const modalidad =
      payment === "total"
        ? `$${formatARS(PRECIO_TOTAL)} (Pago Total)`
        : `$${formatARS(PRECIO_TOTAL / 2)} (Seña 50%)`

    const mensaje =
      `Hola! Soy *${name}*. Ya aprobé el diseño de mi taza en la app.\n\n` +
      `• *Modalidad:* ${modalidad}\n` +
      `• *Alias utilizado:* Mipago.app\n\n` +
      `Realicé la transferencia. Te envío el comprobante por acá y la imagen ya quedó procesada en las medidas exactas ` +
      `(${DIAMETRO_CM} cm de diámetro × ${ALTO_CM} cm de alto, vuelta completa a ${DPI} DPI) lista para sublimar.`

    const url = `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(mensaje)}`
    window.open(url, "_blank")
  }

  return (
    <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl ring-1 ring-black/5">
      <h2 className="text-center text-2xl font-bold tracking-tight text-foreground">Personaliza tu Taza</h2>
      <p className="mt-1 text-center text-sm text-muted-foreground">Sube tu foto y gírala 360° para ver toda la vuelta</p>

      {/* Nombre */}
      <div className="mt-6">
        <label htmlFor="clientName" className="mb-1.5 block text-sm font-semibold text-foreground">
          Tu Nombre
        </label>
        <input
          id="clientName"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: María Gómez"
          className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none ring-offset-background transition focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Subir imagen */}
      <div className="mt-4">
        <label htmlFor="uploadImage" className="mb-1.5 block text-sm font-semibold text-foreground">
          Sube tu Foto o Imagen
        </label>
        <input
          id="uploadImage"
          type="file"
          accept="image/*"
          onChange={handleUpload}
          className="w-full cursor-pointer rounded-lg border border-input bg-background text-sm file:mr-3 file:cursor-pointer file:border-0 file:bg-muted file:px-3 file:py-2.5 file:text-sm file:font-medium file:text-foreground"
        />
      </div>

      {/* Mockup */}
      <div className="mt-5">
        <span className="mb-1.5 block text-sm font-semibold text-foreground">Vista Previa (Mockup 360°)</span>
        <Mug3D imageSrc={imageSrc} />
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Arrastra para girar la taza completa · Contorno {DIAMETRO_CM} cm de diámetro × {ALTO_CM} cm de alto · {DPI} DPI
        </p>
      </div>

      {/* Modalidad de pago */}
      <div className="mt-5">
        <label htmlFor="paymentType" className="mb-1.5 block text-sm font-semibold text-foreground">
          Modalidad de Pago
        </label>
        <select
          id="paymentType"
          value={payment}
          onChange={(e) => setPayment(e.target.value as PaymentType)}
          className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none ring-offset-background transition focus:ring-2 focus:ring-ring"
        >
          <option value="total">Pagar Producto Completo</option>
          <option value="senia">Pagar Seña (50% anticipo)</option>
        </select>
      </div>

      {/* Precio */}
      <div className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950">
        Total a transferir: <span className="font-bold text-sky-700">${formatARS(amount)}</span>
        <br />
        <span className="text-xs text-sky-800/80">
          Alias Mercado Pago: <b>Mipago.app</b>
        </span>
      </div>

      {/* CTA */}
      <button
        type="button"
        onClick={sendToWhatsApp}
        className="mt-4 w-full rounded-lg bg-[#25d366] px-4 py-3 text-base font-bold text-white transition hover:bg-[#1ebe5d] active:scale-[0.99]"
      >
        Aprobar Diseño y Enviar Pedido
      </button>

      {/* Canvas oculto para exportar a alta resolución (vuelta completa) */}
      <canvas ref={canvasRef} width={EXPORT_W} height={EXPORT_H} className="hidden" />
    </div>
  )
}
