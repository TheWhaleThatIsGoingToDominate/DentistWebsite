import { ArrowUpRight } from 'lucide-react'
import type { ReactNode } from 'react'

type ButtonProps = {
  href: string
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'light'
  className?: string
}

export function Button({ href, children, variant = 'primary', className = '' }: ButtonProps) {
  const styles = {
    primary: 'bg-ink text-white hover:bg-teal-700 shadow-lg shadow-teal-900/10',
    secondary: 'border border-teal-200 bg-white text-ink hover:border-teal-400 hover:bg-teal-50',
    light: 'bg-white text-ink hover:bg-teal-50',
  }

  return (
    <a
      href={href}
      className={`group inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold transition duration-300 ${styles[variant]} ${className}`}
    >
      {children}
      <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
    </a>
  )
}

type SectionTitleProps = {
  eyebrow: string
  title: string
  text?: string
  align?: 'left' | 'center'
  light?: boolean
}

export function SectionTitle({ eyebrow, title, text, align = 'left', light = false }: SectionTitleProps) {
  return (
    <div className={align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      <p className={`mb-4 text-xs font-extrabold uppercase tracking-[0.24em] ${light ? 'text-gold-300' : 'text-teal-600'}`}>
        {eyebrow}
      </p>
      <h2 className={`font-display text-4xl leading-[1.08] sm:text-5xl ${light ? 'text-white' : 'text-ink'}`}>
        {title}
      </h2>
      {text && <p className={`mt-5 leading-7 ${light ? 'text-white/70' : 'text-slate-600'}`}>{text}</p>}
    </div>
  )
}

export function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`reveal ${className}`}>{children}</div>
}
