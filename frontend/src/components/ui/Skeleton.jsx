export default function Skeleton({ className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={`block animate-pulse rounded-lg bg-white/[0.08] ${className}`}
    />
  )
}

