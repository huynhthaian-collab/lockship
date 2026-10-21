import { useState } from 'react'
import { Lock, Unlock, Wifi, Shield, Sparkles, Radio } from 'lucide-react'

export default function IsometricLocker({
  lockStatus = 'locked',
  isOnline = true,
  deviceId = 'LOCK-ESP32',
  battery = 98,
  className = '',
}) {
  const [hovered, setHovered] = useState(false)
  const isUnlocked = lockStatus === 'unlocked'

  return (
    <div
      className={`relative flex flex-col items-center justify-center p-6 select-none ${className}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* 3D Ambient Holographic Glow */}
      <div
        className={`pointer-events-none absolute size-52 rounded-full blur-3xl transition-all duration-700 ${
          isUnlocked
            ? 'bg-emerald-500/25 scale-110'
            : isOnline
            ? 'bg-blue-600/20 scale-100'
            : 'bg-red-500/15 scale-90'
        }`}
      />

      {/* Hologram Rings on Floor */}
      <div className="relative mb-8 grid place-items-center">
        {/* Floor Ring 1 */}
        <div
          className={`absolute size-44 rounded-full border border-dashed transition-all duration-700 ${
            isUnlocked
              ? 'border-emerald-400/40 animate-hologram-spin'
              : 'border-blue-400/30 animate-hologram-spin'
          }`}
          style={{ transform: 'rotateX(70deg)' }}
        />
        {/* Floor Ring 2 */}
        <div
          className={`absolute size-56 rounded-full border transition-all duration-700 ${
            isUnlocked
              ? 'border-emerald-500/30 animate-pulse-ring'
              : 'border-blue-500/20 animate-pulse-ring'
          }`}
          style={{ transform: 'rotateX(70deg)' }}
        />

        {/* 3D Isometric Container Box */}
        <div className="isometric-container py-6">
          <div
            className={`isometric-cube ${
              hovered ? '!rotate-x-[52deg] !rotate-z-[-38deg] -translate-y-3' : ''
            }`}
          >
            {/* Top Face */}
            <div
              className={`cube-face cube-top flex flex-col items-center justify-center p-3 transition-colors duration-500 ${
                isUnlocked
                  ? '!bg-gradient-to-br !from-emerald-400/40 !to-teal-500/20 !border-emerald-300/50 !shadow-[inset_0_0_24px_rgba(16,185,129,0.5)]'
                  : '!bg-gradient-to-br !from-blue-600/30 !to-slate-900/60 !border-blue-400/30 !shadow-[inset_0_0_20px_rgba(59,130,246,0.4)]'
              }`}
            >
              <div
                className={`grid size-11 place-items-center rounded-xl border backdrop-blur-md shadow-lg transition-all duration-300 ${
                  isUnlocked
                    ? 'border-emerald-400/60 bg-emerald-500/30 text-emerald-300 scale-110'
                    : 'border-blue-400/40 bg-blue-600/30 text-blue-200'
                }`}
              >
                {isUnlocked ? (
                  <Unlock size={22} className="animate-bounce" />
                ) : (
                  <Lock size={22} />
                )}
              </div>
              <span className="mt-1 font-mono text-[9px] font-bold tracking-widest uppercase text-white/80">
                {isUnlocked ? 'UNLOCKED' : 'SECURED'}
              </span>
            </div>

            {/* Front Face */}
            <div
              className={`cube-face cube-front flex flex-col justify-between p-3.5 transition-colors duration-500 ${
                isUnlocked
                  ? '!border-emerald-500/40 !bg-gradient-to-b !from-slate-900/90 !to-emerald-950/80'
                  : '!border-blue-500/20 !bg-gradient-to-b !from-slate-900/90 !to-slate-950/95'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[9px] font-semibold text-slate-400">
                  {deviceId}
                </span>
                <span className="flex size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>

              {/* Electronic Bolt Indicator Bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[8px] text-slate-400 font-mono">
                  <span>BOLT STATUS</span>
                  <span className={isUnlocked ? 'text-emerald-400 font-bold' : 'text-blue-400'}>
                    {isUnlocked ? 'RETRACTED' : 'ENGAGED'}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isUnlocked
                        ? 'w-full bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_8px_#10b981]'
                        : 'w-2/3 bg-gradient-to-r from-blue-600 to-cyan-400 shadow-[0_0_8px_#3b82f6]'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Right Face */}
            <div className="cube-face cube-right flex flex-col justify-between p-3.5 bg-gradient-to-b from-slate-900/95 to-slate-950 border-r border-white/10">
              <div className="flex items-center gap-1 text-[8px] text-slate-400 font-mono">
                <Radio size={10} className="text-cyan-400" />
                <span>AES-256 GCM</span>
              </div>
              <div className="text-[9px] font-mono text-slate-400">
                BAT: <span className="text-slate-200 font-bold">{battery}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hologram Telemetry Badge */}
      <div className="relative z-10 flex flex-wrap items-center justify-center gap-2">
        <div
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur-md transition-all duration-300 ${
            isUnlocked
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 shadow-[0_0_16px_rgba(16,185,129,0.25)]'
              : 'border-blue-500/30 bg-blue-500/10 text-blue-300 shadow-[0_0_16px_rgba(59,130,246,0.2)]'
          }`}
        >
          <span
            className={`size-2 rounded-full ${
              isUnlocked ? 'bg-emerald-400 animate-ping' : 'bg-blue-400'
            }`}
          />
          <span>{isUnlocked ? 'Chốt Khóa: Đã Mở' : 'Chốt Khóa: Đang Khóa'}</span>
        </div>

        <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300 backdrop-blur-md">
          <Wifi size={12} className={isOnline ? 'text-emerald-400' : 'text-slate-500'} />
          <span>{isOnline ? 'Trực tuyến' : 'Ngoại tuyến'}</span>
        </div>
      </div>
    </div>
  )
}
