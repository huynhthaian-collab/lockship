import { useEffect } from 'react'
import Navbar from '../components/landing/Navbar.jsx'
import Hero from '../components/landing/Hero.jsx'
import Stats from '../components/landing/Stats.jsx'
import Features from '../components/landing/Features.jsx'
import HowItWorks from '../components/landing/HowItWorks.jsx'
import SmartLockSection from '../components/landing/SmartLockSection.jsx'
import SecuritySection from '../components/landing/SecuritySection.jsx'
import RolesSection from '../components/landing/RolesSection.jsx'
import FeedbackSection from '../components/feedback/FeedbackSection.jsx'
import FloatingFeedbackButton from '../components/feedback/FloatingFeedbackButton.jsx'
import CTA from '../components/landing/CTA.jsx'
import Footer from '../components/landing/Footer.jsx'

export default function Home() {
  useEffect(() => {
    const elements = document.querySelectorAll('.landing-reveal')
    if (!('IntersectionObserver' in window)) {
      elements.forEach((element) => element.classList.add('is-visible'))
      return undefined
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('is-visible')
        observer.unobserve(entry.target)
      })
    }, { threshold: 0.12, rootMargin: '0px 0px -32px 0px' })

    elements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [])

  return (
    <div className="relative min-h-svh overflow-clip bg-[#06080d] text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Ambient Spatial Glowing Mesh Orbs */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="glow-orb-blue -left-48 top-0" />
        <div className="glow-orb-emerald -right-48 top-1/3" />
        <div className="glow-orb-purple -left-48 bottom-10" />
        <div className="spatial-grid-bg absolute inset-0 opacity-20" />
      </div>

      <div className="relative z-10">
        <Navbar />
        <main>
          <Hero />
          <Stats />
          <Features />
          <HowItWorks />
          <SmartLockSection />
          <SecuritySection />
          <RolesSection />
          <FeedbackSection />
          <CTA />
        </main>
        <Footer />
        <FloatingFeedbackButton />
      </div>
    </div>
  )
}

