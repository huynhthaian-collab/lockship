import { useRef, useState } from 'react'

export default function SpatialTiltCard({
  children,
  className = '',
  maxTilt = 7,
  glare = true,
  scale = 1.01,
  perspective = 1000,
  ...props
}) {
  const cardRef = useRef(null)
  const [style, setStyle] = useState({
    transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
    transition: 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1)',
  })
  const [spotlightPos, setSpotlightPos] = useState({ x: 50, y: 50, opacity: 0 })

  function handleMouseMove(e) {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const width = rect.width
    const height = rect.height
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    // Tính toán góc nghiêng 3D
    const rotateX = ((mouseY - height / 2) / (height / 2)) * -maxTilt
    const rotateY = ((mouseX - width / 2) / (width / 2)) * maxTilt

    setStyle({
      transform: `perspective(${perspective}px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(${scale}, ${scale}, ${scale})`,
      transition: 'transform 100ms ease-out',
    })

    if (glare) {
      setSpotlightPos({
        x: (mouseX / width) * 100,
        y: (mouseY / height) * 100,
        opacity: 0.18,
      })
    }
  }

  function handleMouseLeave() {
    setStyle({
      transform: `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`,
      transition: 'transform 450ms cubic-bezier(0.16, 1, 0.3, 1)',
    })
    setSpotlightPos((prev) => ({ ...prev, opacity: 0 }))
  }

  return (
    <div
      ref={cardRef}
      className={`preserve-3d relative overflow-hidden transform-gpu will-change-transform ${className}`}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      style={style}
      {...props}
    >
      {/* 3D Spotlight Glare effect */}
      {glare && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-30 transition-opacity duration-300"
          style={{
            opacity: spotlightPos.opacity,
            background: `radial-gradient(circle 280px at ${spotlightPos.x}% ${spotlightPos.y}%, rgba(96, 165, 250, 0.35), transparent 70%)`,
          }}
        />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  )
}
