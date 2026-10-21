export default function Table({ className = '', containerClassName = '', children }) {
  return (
    <div className={`overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.36)] ${containerClassName}`}>
      <table className={`w-full text-left text-sm text-slate-200 ${className}`}>
        {children}
      </table>
    </div>
  )
}

