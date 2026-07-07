import { useEffect, useState } from 'react'
import {
  ArrowRight, Award, CalendarCheck, Check, CheckCircle2, ChevronDown, CircleDot,
  Clock3, Facebook, Gem, HeartHandshake, Instagram, Linkedin, Mail, MapPin,
  MessageCircle, Microscope, Phone, ScanLine, ShieldCheck, Sparkles, Star, Sun,
  UserRoundCheck, WandSparkles
} from 'lucide-react'
import Header from './components/Header'
import Chatbot from './components/Chatbot'
import { Button, Reveal, SectionTitle } from './components/ui'
import { ScheduleProvider } from './context/ScheduleContext'
import { clinic, faqs, images, navLinks, pricing, testimonials, treatments, whatsappUrl } from './data/clinic'
import BookingPage from './pages/BookingPage'
import BookingConfirmationPage from './pages/BookingConfirmationPage'
import BookingStatusPage from './pages/BookingStatusPage'
import EmployeeAdminPage from './pages/EmployeeAdminPage'
import RoleDashboardPage from './pages/RoleDashboardPage'

const treatmentIcons = { Sparkles, Sun, CircleDot, Gem, ShieldCheck, ScanLine }

function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add('revealed')),
      { threshold: 0.12 },
    )
    document.querySelectorAll('.reveal').forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [])
}

function Hero() {
  const stats = [
    ['4.9/5', 'Patient rating'],
    ['15+', 'Years experience'],
    ['8,000+', 'Happy patients'],
  ]

  return (
    <section id="home" className="relative overflow-hidden bg-[#f5faf9] pt-[76px]">
      <div className="hero-grid absolute inset-0 opacity-40" />
      <div className="absolute -left-32 top-28 h-72 w-72 rounded-full bg-teal-200/40 blur-3xl" />
      <div className="relative mx-auto grid min-h-[780px] max-w-7xl items-center gap-12 px-5 py-16 lg:grid-cols-[1.02fr_.98fr] lg:px-8 lg:py-20">
        <div className="max-w-2xl">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-teal-200 bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-teal-700 shadow-sm">
            <Sparkles className="h-4 w-4 text-gold-400" />
            Private dental care, beautifully considered
          </div>
          <h1 className="font-display text-[3.35rem] leading-[0.98] tracking-[-0.02em] text-ink sm:text-7xl lg:text-[5.25rem]">
            Premium Dental Care for a <span className="relative italic text-teal-600">Confident Smile</span>
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-slate-600">
            Advanced dental care, gentle treatment, and modern technology, brought together in a calm private clinic designed around you.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button href="/booking" className="sm:min-w-48">Book Appointment</Button>
            <Button href="/booking-status" variant="secondary" className="sm:min-w-48">Track Booking</Button>
            <Button href="#treatments" variant="secondary" className="sm:min-w-48">View Treatments</Button>
          </div>
          <div className="mt-11 grid grid-cols-3 gap-3 border-t border-teal-200/80 pt-7">
            {stats.map(([value, label]) => (
              <div key={label}>
                <p className="font-display text-2xl text-ink sm:text-3xl">{value}</p>
                <p className="mt-1 text-[11px] font-semibold leading-4 text-slate-500 sm:text-xs">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[580px] lg:mr-0">
          <div className="absolute -right-8 -top-8 h-44 w-44 rounded-full border border-gold-300/50" />
          <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-gold-200/50 blur-2xl" />
          <div className="relative overflow-hidden rounded-[2rem] bg-white p-2 shadow-soft">
            <img src={images.hero} alt="Dentist discussing treatment with a patient" className="h-[500px] w-full rounded-[1.6rem] object-cover sm:h-[610px]" />
            <div className="absolute inset-x-6 bottom-6 rounded-2xl border border-white/60 bg-white/90 p-4 shadow-xl backdrop-blur-md sm:inset-x-auto sm:left-6 sm:max-w-[280px]">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-teal-100 text-teal-700"><CalendarCheck className="h-5 w-5" /></span>
                <div>
                  <p className="font-bold text-ink">Your comfort comes first</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Unhurried appointments and gentle care, every step of the way.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute -right-3 top-20 hidden rounded-2xl border border-white bg-white/90 p-4 shadow-card backdrop-blur sm:block">
            <div className="flex text-gold-400">{[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}</div>
            <p className="mt-2 text-xs font-bold text-ink">Trusted by 8,000+ patients</p>
          </div>
        </div>
      </div>
    </section>
  )
}

function TrustBar() {
  const items = [
    [Award, 'Experienced dentists'],
    [Microscope, 'Modern equipment'],
    [HeartHandshake, 'Pain-free care'],
    [Clock3, 'Flexible appointments'],
  ]
  return (
    <section className="border-y border-slate-100 bg-white">
      <div className="mx-auto grid max-w-7xl grid-cols-2 px-5 py-7 lg:grid-cols-4 lg:px-8">
        {items.map(([Icon, label], index) => (
          <div key={label as string} className={`flex items-center gap-3 py-3 lg:justify-center ${index % 2 === 1 ? 'pl-4' : ''}`}>
            <Icon className="h-5 w-5 shrink-0 text-teal-600" />
            <span className="text-sm font-bold text-ink">{label as string}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function About() {
  const highlights = [
    [UserRoundCheck, 'Care around you', 'Every plan starts with your goals, comfort, and long-term health.'],
    [ShieldCheck, 'Clinical excellence', 'Rigorous hygiene standards and meticulous attention to every detail.'],
    [WandSparkles, 'Naturally beautiful', 'Cosmetic results designed to look refined, balanced, and authentically yours.'],
  ]
  return (
    <section id="about" className="section-pad bg-white">
      <div className="mx-auto grid max-w-7xl gap-14 px-5 lg:grid-cols-2 lg:items-center lg:px-8">
        <Reveal className="relative">
          <div className="overflow-hidden rounded-[2rem]">
            <img src={images.clinic} alt="Modern dental treatment room" className="h-[520px] w-full object-cover" />
          </div>
          <div className="absolute -bottom-6 -right-2 max-w-[245px] rounded-2xl bg-ink p-5 text-white shadow-xl sm:right-6">
            <p className="font-display text-3xl">Care you can feel</p>
            <p className="mt-2 text-sm leading-6 text-white/65">A calm, private setting where clinical precision meets genuine warmth.</p>
          </div>
        </Reveal>
        <Reveal>
          <SectionTitle
            eyebrow="A different kind of dentistry"
            title="Thoughtful care. Exceptional standards."
            text="Aurora Dental is a private clinic built around a simple idea: outstanding dentistry should feel as reassuring as it is precise. We combine patient-centred care, exceptional hygiene, modern technology, and an eye for natural cosmetic results."
          />
          <div className="mt-9 space-y-4">
            {highlights.map(([Icon, title, text]) => (
              <div key={title as string} className="group flex gap-4 rounded-2xl border border-slate-100 p-4 transition hover:border-teal-200 hover:bg-teal-50/50">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-teal-100 text-teal-700 transition group-hover:bg-teal-600 group-hover:text-white">
                  <Icon className="h-5 w-5" />
                </span>
                <div><h3 className="font-bold text-ink">{title as string}</h3><p className="mt-1 text-sm leading-6 text-slate-500">{text as string}</p></div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function Treatments() {
  return (
    <section id="treatments" className="section-pad bg-[#f5faf9]">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <SectionTitle eyebrow="Treatments" title="Dentistry shaped around your smile" text="From everyday care to advanced restorative and cosmetic treatment, every plan is considered, clear, and completely personal." />
          <Button href={whatsappUrl('Hello Aurora Dental, I would like help choosing a treatment.')} variant="secondary">Discuss your smile</Button>
        </div>
        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {treatments.map((treatment, index) => {
            const Icon = treatmentIcons[treatment.icon as keyof typeof treatmentIcons]
            return (
              <Reveal key={treatment.title} className="h-full" >
                <article className="treatment-card group flex h-full flex-col rounded-[1.5rem] border border-teal-100 bg-white p-7 shadow-card transition duration-300 hover:-translate-y-1 hover:border-teal-300">
                  <div className="flex items-start justify-between">
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-teal-50 text-teal-700 transition group-hover:bg-ink group-hover:text-white"><Icon className="h-6 w-6" /></span>
                    <span className="font-display text-3xl text-teal-100">0{index + 1}</span>
                  </div>
                  <h3 className="mt-8 font-display text-2xl text-ink">{treatment.title}</h3>
                  <p className="mt-3 flex-1 text-sm leading-6 text-slate-500">{treatment.description}</p>
                  <a href={whatsappUrl(`Hello Aurora Dental, I would like to learn more about ${treatment.title}.`)} className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-teal-700">
                    Learn more <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </a>
                </article>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function WhyUs() {
  const reasons = [
    ['Digital smile design', 'Preview and plan your smile with greater clarity and precision.'],
    ['Strict sterilisation', 'Hospital-grade protocols for complete confidence at every visit.'],
    ['Gentle approach', 'Calm communication and comfort-focused techniques throughout.'],
    ['Transparent pricing', 'Clear recommendations and costs before treatment begins.'],
    ['Same-day emergencies', 'Reserved appointments when you need urgent dental care.'],
    ['Personalised plans', 'Treatment designed around your health, lifestyle, and goals.'],
  ]
  return (
    <section className="section-pad relative overflow-hidden bg-ink text-white">
      <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-teal-600/20 blur-3xl" />
      <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
        <SectionTitle eyebrow="Why Aurora Dental" title="The details make the difference" text="Modern dentistry is not only about technology. It is about how carefully that technology is used, how well you are heard, and how confident you feel." light />
        <div className="mt-14 grid gap-x-12 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
          {reasons.map(([title, text], index) => (
            <Reveal key={title}>
              <div className="border-t border-white/15 pt-6">
                <div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-gold-400 text-xs font-extrabold text-ink">0{index + 1}</span><h3 className="font-display text-xl">{title}</h3></div>
                <p className="mt-4 text-sm leading-6 text-white/60">{text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function Dentist() {
  return (
    <section id="dentist" className="section-pad bg-white">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="overflow-hidden rounded-[2rem] bg-[#eef7f5]">
          <div className="grid lg:grid-cols-[.85fr_1.15fr]">
            <Reveal className="relative min-h-[500px]">
              <img src={images.doctor} alt="Dr. Adam Karim, Consultant Dentist" className="absolute inset-0 h-full w-full object-cover object-center" />
              <div className="absolute bottom-5 left-5 rounded-xl bg-white/90 px-4 py-3 text-xs font-bold text-ink shadow-lg backdrop-blur">
                15+ years of clinical experience
              </div>
            </Reveal>
            <Reveal className="flex items-center p-8 sm:p-12 lg:p-16">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-teal-600">Meet your dentist</p>
                <h2 className="mt-4 font-display text-4xl text-ink sm:text-5xl">Dr. Adam Karim</h2>
                <p className="mt-3 font-bold text-teal-700">Consultant Dentist and Cosmetic Dental Specialist</p>
                <p className="mt-7 leading-7 text-slate-600">
                  Dr. Karim combines advanced restorative training with an understated approach to cosmetic dentistry. Known for his calm manner and meticulous eye, he believes the best results protect your health, suit your features, and never look overdone.
                </p>
                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  {['BDS, MSc Cosmetic Dentistry', 'Member, AACD (Placeholder)', 'Advanced Implant Training', 'English & Arabic speaking'].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-sm font-semibold text-ink"><CheckCircle2 className="h-4 w-4 shrink-0 text-teal-600" />{item}</div>
                  ))}
                </div>
                <Button href={whatsappUrl('Hello Aurora Dental, I would like to book a consultation with Dr. Adam Karim.')} className="mt-9">Book a consultation</Button>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  )
}

function Gallery() {
  const gallery = [
    [images.smileOne, 'Natural whitening result', 'Whitening'],
    [images.smileTwo, 'Balanced smile refinement', 'Veneers'],
    [images.smileThree, 'Confident smile restoration', 'Smile design'],
  ]
  return (
    <section id="gallery" className="section-pad bg-[#f8f6f0]">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <SectionTitle eyebrow="Smile gallery" title="Subtle changes. Remarkable confidence." text="Our approach is always individual: enhancing what is already yours with careful planning and beautifully natural detail." align="center" />
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {gallery.map(([image, title, tag], index) => (
            <Reveal key={title}>
              <article className={`${index === 1 ? 'md:mt-8' : ''} overflow-hidden rounded-[1.5rem] bg-white p-2 shadow-card`}>
                <div className="group relative overflow-hidden rounded-[1.15rem]">
                  <img src={image} alt={title} className="h-80 w-full object-cover transition duration-700 group-hover:scale-105" />
                  <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-ink backdrop-blur">{tag}</span>
                  <div className="absolute inset-x-3 bottom-3 rounded-xl bg-ink/85 p-4 text-white backdrop-blur">
                    <p className="font-display text-lg">{title}</p>
                    <p className="mt-1 text-[11px] text-white/60">Before & after presentation</p>
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
        <p className="mt-8 text-center text-xs text-slate-500">Images are for demonstration only.</p>
      </div>
    </section>
  )
}

function Testimonials() {
  return (
    <section className="section-pad bg-white">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <SectionTitle eyebrow="Patient stories" title="Kind words from our patients" align="center" />
        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {testimonials.map((item) => (
            <Reveal key={item.name}>
              <figure className="flex h-full flex-col rounded-[1.5rem] border border-slate-100 bg-white p-7 shadow-card">
                <div className="flex text-gold-400">{[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}</div>
                <blockquote className="mt-6 flex-1 font-display text-xl leading-8 text-ink">“{item.quote}”</blockquote>
                <figcaption className="mt-7 border-t border-slate-100 pt-5">
                  <p className="font-bold text-ink">{item.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.treatment}</p>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function Pricing() {
  return (
    <section className="section-pad bg-[#f5faf9]">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <SectionTitle eyebrow="Fees & offers" title="Clear starting points" text="High-quality care with transparent guidance from the start. We will always confirm your personal treatment fee before proceeding." align="center" />
        <div className="mt-14 grid items-stretch gap-5 lg:grid-cols-3">
          {pricing.map((item) => (
            <Reveal key={item.name}>
              <article className={`relative flex h-full flex-col rounded-[1.5rem] p-7 ${item.featured ? 'bg-ink text-white shadow-xl lg:-translate-y-4' : 'border border-teal-100 bg-white text-ink shadow-card'}`}>
                {item.featured && <span className="absolute right-5 top-5 rounded-full bg-gold-400 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-ink">Most popular</span>}
                <h3 className="font-display text-2xl">{item.name}</h3>
                <p className={`mt-3 text-sm leading-6 ${item.featured ? 'text-white/60' : 'text-slate-500'}`}>{item.description}</p>
                <p className={`mt-7 text-xs font-bold uppercase tracking-wider ${item.featured ? 'text-gold-300' : 'text-teal-600'}`}>From</p>
                <p className="mt-1 font-display text-4xl">{item.price}</p>
                <div className={`my-7 border-t ${item.featured ? 'border-white/15' : 'border-slate-100'}`} />
                <ul className="flex-1 space-y-3">
                  {item.features.map((feature) => <li key={feature} className="flex gap-3 text-sm"><Check className={`h-4 w-4 shrink-0 ${item.featured ? 'text-gold-300' : 'text-teal-600'}`} />{feature}</li>)}
                </ul>
                <Button href={whatsappUrl(`Hello Aurora Dental, I would like to ask about the ${item.name} offer.`)} variant={item.featured ? 'light' : 'primary'} className="mt-8 w-full">Enquire now</Button>
              </article>
            </Reveal>
          ))}
        </div>
        <p className="mt-5 text-center text-xs text-slate-500">Final pricing depends on clinical assessment and individual treatment needs.</p>
      </div>
    </section>
  )
}

function FAQ() {
  const [active, setActive] = useState(0)
  return (
    <section className="section-pad bg-white">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-[.75fr_1.25fr] lg:px-8">
        <div>
          <SectionTitle eyebrow="Frequently asked" title="A few things you may be wondering" text="Still have a question? Our reception team will be happy to help." />
          <Button href={whatsappUrl('Hello Aurora Dental, I have a question about treatment.')} variant="secondary" className="mt-8">Ask us on WhatsApp</Button>
        </div>
        <div className="divide-y divide-slate-200 border-y border-slate-200">
          {faqs.map((faq, index) => {
            const isOpen = active === index
            return (
              <div key={faq.question}>
                <button type="button" onClick={() => setActive(isOpen ? -1 : index)} className="flex w-full items-center justify-between gap-5 py-6 text-left" aria-expanded={isOpen}>
                  <span className="font-bold text-ink">{faq.question}</span>
                  <ChevronDown className={`h-5 w-5 shrink-0 text-teal-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                <div className={`grid transition-all duration-300 ${isOpen ? 'grid-rows-[1fr] pb-6' : 'grid-rows-[0fr]'}`}>
                  <div className="overflow-hidden"><p className="max-w-2xl text-sm leading-7 text-slate-600">{faq.answer}</p></div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function Contact() {
  const details = [
    [MapPin, 'Visit us', clinic.address],
    [Phone, 'Call us', clinic.phone],
    [Mail, 'Email us', clinic.email],
  ]
  return (
    <section id="contact" className="section-pad bg-ink text-white">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-[.9fr_1.1fr] lg:px-8">
        <div>
          <SectionTitle eyebrow="Contact us" title="Your new smile starts with a conversation" text="Tell us how we can help. Our friendly reception team will arrange a convenient appointment and answer any initial questions." light />
          <div className="mt-9 space-y-5">
            {details.map(([Icon, label, value]) => (
              <div key={label as string} className="flex gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/10 text-gold-300"><Icon className="h-5 w-5" /></span>
                <div><p className="text-xs font-bold uppercase tracking-wider text-white/40">{label as string}</p><p className="mt-1 text-sm text-white/85">{value as string}</p></div>
              </div>
            ))}
          </div>
          <div className="mt-9 rounded-2xl border border-white/10 p-5">
            <p className="font-bold">Opening hours</p>
            <div className="mt-3 space-y-2">{clinic.hours.map((line) => <p key={line} className="text-sm text-white/60">{line}</p>)}</div>
          </div>
        </div>
        <div className="flex rounded-[1.5rem] bg-white p-6 text-ink shadow-2xl sm:p-9">
          <div className="flex w-full flex-col justify-center">
          <div className="flex items-center justify-between gap-4">
            <div><p className="font-display text-3xl">Ready to book?</p><p className="mt-2 text-sm leading-6 text-slate-500">Choose your service, date, and available appointment time on our dedicated booking page.</p></div>
            <CalendarCheck className="hidden h-8 w-8 text-teal-600 sm:block" />
          </div>
          <div className="mt-8 grid gap-3 border-y border-slate-100 py-6 sm:grid-cols-3">
            {['Select a service', 'Pick a date', 'Choose a time'].map((step) => (
              <div key={step} className="rounded-2xl bg-[#f5faf9] px-4 py-4 text-sm font-bold text-ink">
                {step}
              </div>
            ))}
          </div>
          <Button href="/booking" className="mt-8 w-full">Book Appointment</Button>
          <p className="mt-4 text-center text-xs leading-5 text-slate-400">Booking now happens on the dedicated booking page.</p>
          </div>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#102d2f] text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div>
          <p className="font-display text-3xl">{clinic.name}</p>
          <p className="mt-4 max-w-xs text-sm leading-6 text-white/50">{clinic.tagline} Premium private dental care in a calm, modern setting.</p>
          <div className="mt-6 flex gap-2">{[Instagram, Facebook, Linkedin].map((Icon, i) => <a key={i} href="#" aria-label="Social media" className="grid h-9 w-9 place-items-center rounded-full border border-white/15 text-white/70 transition hover:border-gold-300 hover:text-gold-300"><Icon className="h-4 w-4" /></a>)}</div>
        </div>
        <div><p className="footer-title">Quick links</p><div className="footer-links">{navLinks.map((link) => <a key={link.href} href={link.href}>{link.label}</a>)}</div></div>
        <div><p className="footer-title">Treatments</p><div className="footer-links">{treatments.slice(0, 5).map((item) => <a key={item.title} href="#treatments">{item.title}</a>)}</div></div>
        <div><p className="footer-title">Contact</p><div className="footer-links"><a href={`tel:${clinic.phone.replace(/\s/g, '')}`}>{clinic.phone}</a><a href={`mailto:${clinic.email}`}>{clinic.email}</a><p>{clinic.address}</p></div></div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-5 text-xs text-white/35 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <p>© {new Date().getFullYear()} {clinic.name}. All rights reserved.</p><p>Privacy · Terms · Accessibility</p>
        </div>
      </div>
    </footer>
  )
}

export default function App() {
  useScrollReveal()
  const route = window.location.pathname

  if (route === '/booking') {
    return (
      <ScheduleProvider>
        <BookingPage />
        <Chatbot />
      </ScheduleProvider>
    )
  }

  if (route === '/booking-status') {
    return (
      <ScheduleProvider>
        <BookingStatusPage />
        <Chatbot />
      </ScheduleProvider>
    )
  }

  if (route === '/booking-confirmation') {
    return (
      <ScheduleProvider>
        <BookingConfirmationPage />
      </ScheduleProvider>
    )
  }

  if (route === '/employee-admin') {
    return (
      <ScheduleProvider>
        <EmployeeAdminPage />
      </ScheduleProvider>
    )
  }

  if (route === '/role-dashboard') {
    return (
      <ScheduleProvider>
        <RoleDashboardPage />
      </ScheduleProvider>
    )
  }

  return (
    <ScheduleProvider>
      <Header />
      <main>
        {/* Main landing page sections */}
        <Hero /><TrustBar /><About /><Treatments /><WhyUs /><Dentist /><Gallery /><Testimonials /><Pricing /><FAQ /><Contact />
      </main>
      <Footer />
      <a href={whatsappUrl()} aria-label="Book on WhatsApp" className="fixed bottom-24 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-xl transition hover:scale-105 hover:bg-[#20bd5a]">
        <MessageCircle className="h-7 w-7 fill-current" />
      </a>
      <Chatbot />
    </ScheduleProvider>
  )
}
