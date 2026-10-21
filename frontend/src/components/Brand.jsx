import { Link } from 'react-router-dom'

export default function Brand({
  to = '/login',
  className = '',
  markClassName = 'size-8',
  textClassName = 'text-base font-bold tracking-wider',
}) {
  return (
    <Link
      aria-label="Trang chủ LOCKSHIP"
      to={to}
      className={`group inline-flex shrink-0 items-center gap-2.5 no-underline transition-opacity hover:opacity-95 ${className}`}
    >
      <img
        aria-hidden="true"
        className={`object-contain drop-shadow-sm transition-transform duration-200 group-hover:scale-105 ${markClassName}`}
        src="/lockship-mark.png"
      />
      <div className="flex items-center gap-1.5">
        <span className={textClassName}>LOCKSHIP</span>
      </div>
    </Link>
  )
}
