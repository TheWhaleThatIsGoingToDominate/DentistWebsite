import { useEffect, useState } from 'react'
import { Menu, Phone, X } from 'lucide-react'
import { clinic, navLinks } from '../data/clinic'
import { Button } from './ui'

function Logo() {
  return (
    <a href="/" className="flex items-center gap-3" aria-label={`${clinic.name} home`}>
      <span className="grid h-10 w-10 place-items-center rounded-full bg-ink text-white">
        <span className="font-display text-xl">A</span>
      </span>
      <span>
        <span className="block text-[15px] font-extrabold uppercase leading-none tracking-[0.14em] text-ink">Aurora</span>
        <span className="mt-1 block text-[9px] font-bold uppercase leading-none tracking-[0.34em] text-teal-600">Dental Clinic</span>
      </span>
    </a>
  )
}

export default function Header() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 shadow-sm backdrop-blur-xl' : 'bg-white/75 backdrop-blur-md'}`}>
      <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 lg:px-8">
        <Logo />

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Main navigation">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="text-sm font-semibold text-slate-600 transition hover:text-teal-700">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-4 lg:flex">
          <a href={`tel:${clinic.phone.replace(/\s/g, '')}`} className="flex items-center gap-2 text-sm font-bold text-ink">
            <Phone className="h-4 w-4 text-teal-600" />
            {clinic.phone}
          </a>
          <Button href="/booking">Book Appointment</Button>
        </div>

        <button
          type="button"
          className="grid h-11 w-11 place-items-center rounded-full border border-slate-200 text-ink lg:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <div className={`fixed inset-x-0 top-[76px] h-[calc(100vh-76px)] bg-white px-5 transition duration-300 lg:hidden ${open ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-4 opacity-0'}`}>
        <nav className="flex flex-col border-t border-slate-100 pt-7" aria-label="Mobile navigation">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} onClick={() => setOpen(false)} className="border-b border-slate-100 py-5 font-display text-3xl text-ink">
              {link.label}
            </a>
          ))}
          <Button href="/booking" className="mt-8 w-full">Book Appointment</Button>
        </nav>
      </div>
    </header>
  )
}
