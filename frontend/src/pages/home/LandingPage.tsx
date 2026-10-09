import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Bell,
  BookOpen,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  Menu,
  ShieldCheck,
  Sparkles,
  UserRoundCog,
  UsersRound,
  X,
} from 'lucide-react'
import heroVisual from '../../assets/hero.png'

const navLinks = [
  { label: 'Home', href: '#home' },
  { label: 'Features', href: '#features' },
  { label: 'About', href: '#about' },
  { label: 'Contact', href: '#contact' },
]

const features = [
  { icon: BookOpen, title: 'Courses', description: 'Keep course information, departments, and academic terms organised.' },
  { icon: ClipboardCheck, title: 'Attendance', description: 'Track daily attendance and give students clear personal summaries.' },
  { icon: CheckCircle2, title: 'Assignments', description: 'Create coursework, collect submissions, and keep deadlines visible.' },
  { icon: GraduationCap, title: 'Results & Marks', description: 'Record marks, calculate grades, and follow academic performance.' },
  { icon: Bell, title: 'Notifications', description: 'Share targeted notices and assignment updates with the right people.' },
  { icon: Bot, title: 'AI Academic Assistant', description: 'Use the integrated Gemini assistant for learning support and planning.' },
]

const roles = [
  { icon: GraduationCap, title: 'Student', description: 'Follow attendance, assignments, results, fees, reports, and study support in one place.' },
  { icon: UsersRound, title: 'Teacher', description: 'Manage assigned coursework, take attendance, and stay connected with your classes.' },
  { icon: UserRoundCog, title: 'Administrator', description: 'Oversee people, departments, courses, academic records, notices, and fees.' },
]

export const LandingPage: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false)

  const closeMenu = () => setMenuOpen(false)

  return (
    <div className="min-h-screen overflow-hidden bg-[#080d20] text-slate-100 selection:bg-violet-400/30">
      <header className="absolute inset-x-0 top-0 z-30">
        <nav aria-label="Main navigation" className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
          <a href="#home" className="group inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300" onClick={closeMenu}>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400 to-indigo-500 shadow-lg shadow-violet-900/50">
              <GraduationCap className="h-5 w-5 text-white" aria-hidden="true" />
            </span>
            <span className="text-sm font-bold tracking-tight text-white sm:text-base">Smart<span className="text-violet-300">SMS</span></span>
          </a>

          <div className="hidden items-center gap-7 md:flex">
            {navLinks.map((link) => <a key={link.label} href={link.href} className="text-sm font-medium text-slate-300 transition-colors hover:text-white focus-visible:outline-none focus-visible:text-white">{link.label}</a>)}
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <Link to="/login" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-200 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">Login</Link>
            <Link to="/register" className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#11152c] shadow-lg shadow-black/15 transition hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">Sign Up</Link>
          </div>

          <button type="button" className="inline-flex rounded-lg p-2 text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 md:hidden" aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>
        {menuOpen && (
          <div className="mx-5 rounded-2xl border border-white/10 bg-[#111735]/95 p-4 shadow-2xl shadow-black/30 backdrop-blur md:hidden">
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => <a key={link.label} href={link.href} onClick={closeMenu} className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/5">{link.label}</a>)}
              <div className="mt-2 grid grid-cols-2 gap-2 border-t border-white/10 pt-3">
                <Link to="/login" onClick={closeMenu} className="rounded-lg px-3 py-2 text-center text-sm font-semibold text-slate-100 hover:bg-white/5">Login</Link>
                <Link to="/register" onClick={closeMenu} className="rounded-lg bg-white px-3 py-2 text-center text-sm font-semibold text-[#11152c]">Sign Up</Link>
              </div>
            </div>
          </div>
        )}
      </header>

      <main>
        <section id="home" className="relative isolate flex min-h-[760px] items-center border-b border-white/[0.07] pt-24 sm:min-h-[780px]">
          <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
            <div className="absolute -left-40 top-8 h-[480px] w-[480px] rounded-full bg-violet-600/20 blur-[120px]" />
            <div className="absolute -right-40 bottom-0 h-[420px] w-[520px] rounded-full bg-indigo-500/15 blur-[120px]" />
            <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-violet-700/10 to-transparent" />
            <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(196,181,253,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(196,181,253,0.16)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:linear-gradient(to_bottom,black,transparent_78%)]" />
          </div>
          <div className="mx-auto grid w-full max-w-7xl items-center gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[1fr_0.9fr] lg:gap-16 lg:px-10">
            <div className="max-w-2xl">
              <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-300/15 bg-violet-300/[0.07] px-3.5 py-1.5 text-[11px] font-bold tracking-[0.15em] text-violet-200"><Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> BUILT FOR MODERN EDUCATION</p>
              <h1 className="font-['Plus_Jakarta_Sans'] text-5xl font-extrabold leading-[0.98] tracking-[-0.055em] text-white sm:text-6xl lg:text-7xl">Smart Student<br /><span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-indigo-300 bg-clip-text text-transparent">Management</span></h1>
              <p className="mt-7 text-xl font-medium leading-relaxed text-slate-200 sm:text-2xl">Manage your academic life.<br />Smarter. Simpler. Better.</p>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-400">One intelligent platform connecting students, teachers and administrators.</p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link to="/register" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 px-5 text-sm font-bold text-white shadow-[0_18px_35px_-14px_rgba(139,92,246,0.8)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080d20]">Get Started <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
                <a href="#features" className="inline-flex h-12 items-center justify-center rounded-xl border border-white/15 bg-white/[0.035] px-5 text-sm font-bold text-white transition hover:bg-white/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200">Explore Features</a>
              </div>
            </div>
            <div className="relative mx-auto w-full max-w-[470px] lg:max-w-none">
              <div className="absolute inset-[12%] rounded-full bg-violet-500/25 blur-3xl" aria-hidden="true" />
              <div className="relative rounded-[2rem] border border-white/10 bg-white/[0.035] p-4 shadow-[0_32px_80px_-28px_rgba(0,0,0,0.85)] backdrop-blur-sm sm:p-6">
                <img src={heroVisual} alt="Abstract purple three-dimensional illustration" className="mx-auto w-full max-w-[390px] drop-shadow-[0_20px_35px_rgba(76,29,149,0.45)] motion-safe:animate-[pulse_7s_ease-in-out_infinite]" />
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="bg-[#0b1027] px-5 py-24 sm:px-8 lg:px-10">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-xl"><p className="text-sm font-bold uppercase tracking-[0.16em] text-violet-300">One connected platform</p><h2 className="mt-3 font-['Plus_Jakarta_Sans'] text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Everything You Need</h2><p className="mt-4 text-base leading-7 text-slate-400">Core features to simplify academic management.</p></div>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map(({ icon: Icon, title, description }) => <article key={title} className="group rounded-2xl border border-white/[0.08] bg-white/[0.025] p-6 transition duration-300 hover:-translate-y-1 hover:border-violet-300/25 hover:bg-white/[0.045]">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-400/10 text-violet-200 ring-1 ring-violet-300/15"><Icon className="h-5 w-5" aria-hidden="true" /></span><h3 className="mt-5 text-base font-bold text-white">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
              </article>)}
            </div>
          </div>
        </section>

        <section id="about" className="border-y border-white/[0.07] bg-[#080d20] px-5 py-24 sm:px-8 lg:px-10">
          <div className="mx-auto max-w-7xl"><div className="max-w-xl"><p className="text-sm font-bold uppercase tracking-[0.16em] text-violet-300">Made for every academic role</p><h2 className="mt-3 font-['Plus_Jakarta_Sans'] text-3xl font-extrabold tracking-tight text-white sm:text-4xl">One system, clear perspectives.</h2></div>
            <div className="mt-12 grid gap-5 md:grid-cols-3">{roles.map(({ icon: Icon, title, description }) => <article key={title} className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.045] to-transparent p-7"><Icon className="h-6 w-6 text-violet-300" aria-hidden="true" /><h3 className="mt-5 text-lg font-bold text-white">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-400">{description}</p></article>)}</div>
          </div>
        </section>

        <section className="bg-[#0b1027] px-5 py-24 sm:px-8 lg:px-10">
          <div className="mx-auto grid max-w-7xl items-center gap-10 rounded-3xl border border-violet-300/15 bg-gradient-to-br from-violet-500/15 via-indigo-500/[0.08] to-transparent p-8 sm:p-12 lg:grid-cols-[1fr_auto]">
            <div><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-400/15 text-violet-200 ring-1 ring-violet-300/20"><Bot className="h-6 w-6" aria-hidden="true" /></span><h2 className="mt-6 font-['Plus_Jakarta_Sans'] text-3xl font-extrabold tracking-tight text-white sm:text-4xl">A more helpful academic assistant.</h2><p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">Smart Student Management integrates Google Gemini to support academic questions, study plans, practice questions, summaries, and learning roadmaps.</p></div>
            <Link to="/ai-assistant" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-violet-200/25 bg-white/[0.07] px-5 text-sm font-bold text-white transition hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200">Explore AI Assistant <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          </div>
        </section>

        <section id="contact" className="relative overflow-hidden bg-[#080d20] px-5 py-24 text-center sm:px-8 lg:px-10"><div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/15 blur-[100px]" aria-hidden="true" /><div className="relative mx-auto max-w-2xl"><ShieldCheck className="mx-auto h-7 w-7 text-violet-300" aria-hidden="true" /><h2 className="mt-5 font-['Plus_Jakarta_Sans'] text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Ready to simplify your academic journey?</h2><p className="mt-4 text-base leading-7 text-slate-400">Manage your academic life from one intelligent platform.</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Link to="/register" className="inline-flex h-12 items-center justify-center rounded-xl bg-white px-6 text-sm font-bold text-[#10142b] transition hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200">Get Started</Link><Link to="/login" className="inline-flex h-12 items-center justify-center rounded-xl border border-white/15 px-6 text-sm font-bold text-white transition hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200">Login</Link></div></div></section>
      </main>

      <footer className="border-t border-white/[0.07] bg-[#070b1a] px-5 py-8 sm:px-8 lg:px-10"><div className="mx-auto flex max-w-7xl flex-col gap-6 text-sm sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2 text-slate-300"><GraduationCap className="h-4 w-4 text-violet-300" aria-hidden="true" /><span className="font-semibold">Smart Student Management</span></div><div className="flex flex-wrap gap-x-5 gap-y-2">{navLinks.map((link) => <a key={link.label} href={link.href} className="text-slate-400 hover:text-white">{link.label}</a>)}<Link to="/login" className="text-slate-400 hover:text-white">Login</Link><Link to="/register" className="text-slate-400 hover:text-white">Sign Up</Link></div><p className="text-slate-500">© {new Date().getFullYear()} Smart Student Management</p></div></footer>
    </div>
  )
}
