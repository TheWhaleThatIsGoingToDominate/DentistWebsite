export const clinic = {
  name: 'Aurora Dental',
  tagline: 'Advanced dentistry. Thoughtful care.',
  phone: '+971 50 123 4567',
  whatsappNumber: '971501234567',
  email: 'hello@auroradental.example',
  address: 'Suite 1204, The Wellness Centre, Downtown Dubai',
  hours: ['Mon - Fri: 8:00 AM - 8:00 PM', 'Saturday: 9:00 AM - 5:00 PM', 'Sunday: By appointment'],
}

export const navLinks = [
  { label: 'About', href: '/#about' },
  { label: 'Treatments', href: '/#treatments' },
  { label: 'Our Dentist', href: '/#dentist' },
  { label: 'Results', href: '/#gallery' },
  { label: 'Contact', href: '/#contact' },
]

export const treatments = [
  {
    title: 'General Dentistry',
    description: 'Comprehensive check-ups, hygiene care, fillings, and preventive plans for lifelong oral health.',
    icon: 'Sparkles',
  },
  {
    title: 'Teeth Whitening',
    description: 'Clinically supervised whitening designed to brighten your smile safely and comfortably.',
    icon: 'Sun',
  },
  {
    title: 'Dental Implants',
    description: 'Natural-looking, long-lasting tooth replacement planned with precise digital technology.',
    icon: 'CircleDot',
  },
  {
    title: 'Veneers',
    description: 'Bespoke porcelain veneers crafted to refine shape, colour, balance, and confidence.',
    icon: 'Gem',
  },
  {
    title: 'Root Canal Treatment',
    description: 'Gentle, modern treatment to relieve discomfort and preserve your natural tooth.',
    icon: 'ShieldCheck',
  },
  {
    title: 'Orthodontics',
    description: 'Discreet clear aligner and orthodontic options for a healthier, beautifully aligned smile.',
    icon: 'ScanLine',
  },
]

export const testimonials = [
  {
    quote: 'From the first consultation, I felt completely at ease. Every detail was explained clearly and the result is beautifully natural.',
    name: 'Layla M.',
    treatment: 'Veneers patient',
  },
  {
    quote: 'The clinic feels calm, spotless, and exceptionally professional. My implant treatment was far more comfortable than I expected.',
    name: 'Omar R.',
    treatment: 'Dental implant patient',
  },
  {
    quote: 'A genuinely thoughtful team. They listened to what I wanted and gave me a smile that still feels completely like me.',
    name: 'Sarah H.',
    treatment: 'Smile makeover patient',
  },
]

export const pricing = [
  {
    name: 'Dental Check-up',
    price: 'AED 250',
    description: 'Complete oral assessment and personalised care advice.',
    features: ['Clinical examination', 'Digital X-rays if required', 'Treatment recommendations'],
  },
  {
    name: 'Teeth Whitening',
    price: 'AED 1,200',
    description: 'Professional whitening for a noticeably brighter smile.',
    features: ['Smile assessment', 'In-clinic whitening', 'Aftercare guidance'],
    featured: true,
  },
  {
    name: 'Implant Consultation',
    price: 'AED 350',
    description: 'A detailed evaluation for confident implant planning.',
    features: ['Specialist consultation', 'Digital scan review', 'Personalised treatment plan'],
  },
]

export const faqs = [
  {
    question: 'Is teeth whitening safe?',
    answer: 'Yes. When professionally supervised, teeth whitening is a safe and effective treatment. We assess your teeth and gums first, then tailor the strength and method to you.',
  },
  {
    question: 'Do dental implants hurt?',
    answer: 'Implant placement is carried out with local anaesthetic, so most patients feel pressure rather than pain. We also provide clear aftercare and comfort support throughout recovery.',
  },
  {
    question: 'How often should I visit the dentist?',
    answer: 'Most patients benefit from a check-up every six months. Your dentist may recommend a different schedule based on your oral health, medical history, and treatment needs.',
  },
  {
    question: 'Do you offer emergency appointments?',
    answer: 'Yes. We reserve a limited number of same-day appointments for dental emergencies. Call or message us on WhatsApp as early as possible.',
  },
  {
    question: 'Can I book through WhatsApp?',
    answer: 'Absolutely. Tap any WhatsApp booking button, tell us your preferred day and treatment, and our reception team will help arrange your appointment.',
  },
]

export const images = {
  hero: 'https://images.unsplash.com/photo-1606811971618-4486d14f3f99?auto=format&fit=crop&w=1400&q=85',
  clinic: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1200&q=85',
  doctor: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=1000&q=85',
  smileOne: 'https://images.unsplash.com/photo-1609840114035-3c981b782dfe?auto=format&fit=crop&w=900&q=85',
  smileTwo: 'https://images.unsplash.com/photo-1606811971618-4486d14f3f99?auto=format&fit=crop&w=900&q=85',
  smileThree: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=900&q=85',
}

export const whatsappUrl = (message = 'Hello Aurora Dental, I would like to book an appointment.') =>
  `https://wa.me/${clinic.whatsappNumber}?text=${encodeURIComponent(message)}`
