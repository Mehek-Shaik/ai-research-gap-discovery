import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  UploadCloud,
  Compass,
  GitCompare,
  Lightbulb,
  FileEdit,
  Layers,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Database,
  ShieldCheck,
  Search,
  BookOpen,
  Sparkles,
  Sun,
  Moon,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

export const HomePage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('rg_theme') === 'dark';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('rg_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('rg_theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };


  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const modules = [
    {
      title: 'Upload Papers',
      icon: UploadCloud,
      desc: 'Batch ingestion of multi-page PDF documents up to 20MB with OCR detection, page deconstruction, and file deduplication.',
      link: '/upload',
      color: 'text-indigo-600 dark:text-indigo-400'
    },
    {
      title: 'Research Library',
      icon: BookOpen,
      desc: 'Indexed repository of all uploaded papers with search, filtering, PDF binary downloads, and deep metadata inspection.',
      link: '/library',
      color: 'text-blue-600 dark:text-blue-400'
    },
    {
      title: 'Deep Paper Analysis',
      icon: Search,
      desc: 'Evidence-grounded deconstruction of objectives, methodologies, algorithms, benchmarks, datasets, and author-stated limitations.',
      link: '/analyze',
      color: 'text-purple-600 dark:text-purple-400'
    },
    {
      title: 'Research Gap Discovery',
      icon: Compass,
      desc: 'Multi-paper cross-gap synthesis identifying contradictory constraints, unaddressed datasets, and candidate novel directions.',
      link: '/gaps',
      color: 'text-emerald-600 dark:text-emerald-400'
    },
    {
      title: 'Paper Comparison',
      icon: GitCompare,
      desc: 'Pairwise and group semantic comparison matrices analyzing methodological overlap, dataset variance, and constraint intersections.',
      link: '/compare',
      color: 'text-amber-600 dark:text-amber-400'
    },
    {
      title: 'Future Recommendations',
      icon: Lightbulb,
      desc: 'Actionable research trajectories and methodology roadmaps prioritized by academic feasibility, impact, and dataset readiness.',
      link: '/recommendations',
      color: 'text-orange-600 dark:text-orange-400'
    },
    {
      title: 'Proposal Workspace',
      icon: FileEdit,
      desc: 'Draft, synthesize, and export complete grant-ready research proposals from verified gaps with objectives, hypotheses, and timeline.',
      link: '/proposals',
      color: 'text-teal-600 dark:text-teal-400'
    },
    {
      title: 'Research Topic Landscape',
      icon: Layers,
      desc: 'Interactive 2D knowledge graph mapping domain clusters, algorithm connections, and open limitation boundaries across papers.',
      link: '/landscape',
      color: 'text-cyan-600 dark:text-cyan-400'
    },
    {
      title: 'Academic Reports & Exports',
      icon: FileText,
      desc: 'Comprehensive synthesis reports formatted in JSON, Markdown, or print-ready HTML with grounded bibliographic references.',
      link: '/reports',
      color: 'text-pink-600 dark:text-pink-400'
    }
  ];

  const features = [
    {
      title: 'Universal PDF Parsing',
      desc: 'Parses single-column and multi-column academic layouts, extracts formal section hierarchies, and detects scanned/image-only documents requiring OCR without fabricating content.'
    },
    {
      title: 'Evidence-Grounded AI Analysis',
      desc: 'Leverages Gemini structured schema outputs constrained to author-stated facts. Automatically maps claims to exact excerpts and page numbers, strictly separating limitations from speculative opportunities.'
    },
    {
      title: 'Candidate Research Gap Synthesis',
      desc: 'Cross-analyzes multiple user-selected papers to detect unaddressed boundary conditions, dataset generalization voids, and hardware-efficiency trade-offs.'
    },
    {
      title: 'Semantic Literature Verification',
      desc: 'Integrated with scholarly literature lookup to check whether identified candidate research gaps have prior publications or represent genuine uncharted opportunities.'
    },
    {
      title: 'Multi-Paper Heatmaps & Matrix',
      desc: 'Computes multi-dimensional cosine similarity and algorithmic clustering to contrast methodologies, evaluation metrics, and threats to validity side by side.'
    },
    {
      title: 'ACID Database & Strict Data Isolation',
      desc: 'Runs on a transactional SQLite persistence engine guaranteeing multi-paper isolation, verified foreign keys, and zero data cross-contamination across concurrent uploads.'
    }
  ];

  const steps = [
    {
      num: '01',
      title: 'Upload Research Papers',
      desc: 'Submit PDF papers from any scientific discipline. The platform sanitizes file streams, calculates hashes, and deconstructs text with page-level boundary preservation.'
    },
    {
      num: '02',
      title: 'Extract & Analyze Content',
      desc: 'Structured models extract titles, authors, methodologies, datasets, algorithms, and explicit author limitations without generic placeholders or hallucinated citations.'
    },
    {
      num: '03',
      title: 'Discover Evidenced Gaps',
      desc: 'Select two or more papers to generate candidate research gaps supported by verbatim quotes, page numbers, severity ratings, and literature verification tags.'
    },
    {
      num: '04',
      title: 'Generate Proposals & Reports',
      desc: 'Convert candidate gaps into structured grant proposals, experimental protocols, and comprehensive academic synthesis reports ready for publication or review.'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-indigo-100 selection:text-indigo-900 dark:bg-slate-950 dark:text-slate-100 font-sans transition-colors duration-200">
      {/* 1. Header Navigation */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/85">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo & Platform Name */}
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-sm shadow-xs">
              RG
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                ResearchGap AI
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Academic Intelligence Platform
              </span>
            </div>
          </Link>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-slate-600 dark:text-slate-300">
            <button
              onClick={() => scrollToSection('hero')}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              Home
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection('features')}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('modules')}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              Modules
            </button>
            <button
              onClick={() => scrollToSection('about')}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              About Project
            </button>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={toggleDarkMode}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors"
                >
                  <span>Go to Dashboard</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="rounded-lg px-3 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors"
                >
                  <span>Get Started</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section id="hero" className="relative overflow-hidden pt-16 pb-16 sm:pt-24 sm:pb-20 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            {/* Meta Kicker */}
            <div className="inline-flex items-center text-xs text-indigo-600 dark:text-indigo-400 font-medium mb-4">
              <span>Final-Year Research Engineering Project</span>
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-slate-900 dark:text-white leading-tight">
              AI-Powered Research Gap Discovery Platform
            </h1>

            <p className="mt-5 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
              Automated scientific literature analysis engine that parses research papers,
              identifies unaddressed methodological and experimental research gaps,
              compares multi-paper findings, and synthesizes grant-ready future research proposals.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
              <Link
                to={isAuthenticated ? '/dashboard' : '/register'}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
              >
                <span>{isAuthenticated ? 'Enter Research Workspace' : 'Get Started Free'}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                onClick={() => scrollToSection('features')}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                <span>Explore Features</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. How It Works Section */}
      <section id="how-it-works" className="py-20 sm:py-24 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-semibold tracking-wider text-indigo-600 dark:text-indigo-400 uppercase">
              Scientific Pipeline
            </span>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl text-slate-900 dark:text-white">
              How the Discovery Pipeline Works
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              From raw academic PDF uploads to structured research gap synthesis and verifiable proposals.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((st) => (
              <div
                key={st.num}
                className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-md">
                      STEP {st.num}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                    {st.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {st.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Features Section */}
      <section id="features" className="py-20 sm:py-24 border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-100/50 dark:bg-slate-900/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-semibold tracking-wider text-indigo-600 dark:text-indigo-400 uppercase">
              Core Capabilities
            </span>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl text-slate-900 dark:text-white">
              Engineered for Rigorous Literature Review
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Built to address the cognitive bottlenecks of scientific paper synthesis without fabricating findings or hallucinations.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {f.title}
                  </h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Modules Section */}
      <section id="modules" className="py-20 sm:py-24 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-semibold tracking-wider text-indigo-600 dark:text-indigo-400 uppercase">
              System Architecture
            </span>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl text-slate-900 dark:text-white">
              Specialized Research Modules
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Each dedicated module solves a specific phase of the research discovery workflow.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {modules.map((m, i) => {
              const Icon = m.icon;
              return (
                <div
                  key={i}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-700 transition-colors flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                        <Icon className={`h-4 w-4 ${m.color}`} />
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {m.title}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                      {m.desc}
                    </p>
                  </div>
                  <Link
                    to={m.link}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                  >
                    <span>Open Module</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. About the Project Section */}
      <section id="about" className="py-20 sm:py-24 border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-100/50 dark:bg-slate-900/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <span className="text-xs font-semibold tracking-wider text-indigo-600 dark:text-indigo-400 uppercase">
              Project Specification
            </span>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl text-slate-900 dark:text-white">
              About the Final-Year Engineering Project
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Comprehensive overview of problem formulation, engineering objectives, and evaluation outcomes.
            </p>

            <div className="mt-10 space-y-8">
              {/* Problem Statement */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 text-xs">!</span>
                  <span>1. The Academic Problem</span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Graduate students, faculty, and industry researchers face an exponential proliferation of scientific publications (over 3 million papers published annually). Identifying meaningful research gaps currently demands weeks of manual cross-reading. Limitations are frequently buried in obscure paragraphs or split across discussion sections, leading to duplicative investigations or research on already solved issues.
                </p>
              </div>

              {/* Engineering Objectives */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 text-xs">🎯</span>
                  <span>2. Core System Objectives</span>
                </h3>
                <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-2 list-disc list-inside leading-relaxed">
                  <li><strong>Universal Ingestion:</strong> Accept any valid text-based research PDF under 20MB without paper-specific hardcoding or synthetic assumptions.</li>
                  <li><strong>Evidence Grounding:</strong> Ensure 100% of extracted claims, constraints, and limitations map directly to verbatim passages and page numbers.</li>
                  <li><strong>Cross-Paper Synthesis:</strong> Automatically discover candidate research gaps that only emerge at the intersection of two or more distinct studies.</li>
                  <li><strong>Zero Hallucination:</strong> Report missing fields as &quot;Not found in the document&quot; and mark novel claims as candidates requiring verification.</li>
                </ul>
              </div>

              {/* Proposed Solution & Tech Stack */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 text-xs">✓</span>
                  <span>3. Proposed Technical Architecture</span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                  A full-stack, modular architecture combining React, Tailwind CSS, Vite, Express, and SQLite with ACID transactional storage.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <span className="font-semibold block text-slate-800 dark:text-slate-200">Frontend</span>
                    <span className="text-[11px] text-slate-500">React 19, Tailwind CSS, Recharts</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <span className="font-semibold block text-slate-800 dark:text-slate-200">Backend</span>
                    <span className="text-[11px] text-slate-500">Node.js, Express, TSX</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <span className="font-semibold block text-slate-800 dark:text-slate-200">Persistence</span>
                    <span className="text-[11px] text-slate-500">SQLite (sql.js WASM + Disk)</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <span className="font-semibold block text-slate-800 dark:text-slate-200">AI Engine</span>
                    <span className="text-[11px] text-slate-500">Gemini 2.5 Flash / 3.8 Flash</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <span className="font-semibold block text-slate-800 dark:text-slate-200">Security</span>
                    <span className="text-[11px] text-slate-500">Bcrypt password hashing, JWT</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <span className="font-semibold block text-slate-800 dark:text-slate-200">Parsing</span>
                    <span className="text-[11px] text-slate-500">pdf-parse v2 with OCR check</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Footer */}
      <footer className="border-t border-slate-200 bg-white py-12 dark:border-slate-800 dark:bg-slate-900 text-xs text-slate-500 dark:text-slate-400">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-xs shadow-xs">
                  RG
                </div>
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  ResearchGap AI
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-4 leading-relaxed">
                An academic intelligence platform developed for final-year engineering review.
                Analyzes research literature, detects constraints, and synthesizes verifiable candidate gaps.
              </p>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1">
                  <Database className="h-3 w-3 text-emerald-500" />
                  <span>SQLite ACID</span>
                </span>
                <span aria-hidden="true">·</span>
                <span className="flex items-center gap-1">
                  <Cpu className="h-3 w-3 text-indigo-500" />
                  <span>Gemini Intelligence</span>
                </span>
                <span aria-hidden="true">·</span>
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-teal-500" />
                  <span>Bcrypt / JWT Auth</span>
                </span>
              </div>
            </div>

            <div>
              <span className="font-semibold text-slate-900 dark:text-white block mb-3 uppercase tracking-wider text-[11px]">
                Modules
              </span>
              <ul className="space-y-2">
                <li><Link to="/upload" className="hover:text-indigo-600 dark:hover:text-indigo-400">Upload Papers</Link></li>
                <li><Link to="/library" className="hover:text-indigo-600 dark:hover:text-indigo-400">Research Library</Link></li>
                <li><Link to="/analyze" className="hover:text-indigo-600 dark:hover:text-indigo-400">Analyze Papers</Link></li>
                <li><Link to="/gaps" className="hover:text-indigo-600 dark:hover:text-indigo-400">Research Gaps</Link></li>
                <li><Link to="/compare" className="hover:text-indigo-600 dark:hover:text-indigo-400">Paper Comparison</Link></li>
              </ul>
            </div>

            <div>
              <span className="font-semibold text-slate-900 dark:text-white block mb-3 uppercase tracking-wider text-[11px]">
                Access & Review
              </span>
              <ul className="space-y-2">
                <li><Link to="/login" className="hover:text-indigo-600 dark:hover:text-indigo-400">Sign In to Workspace</Link></li>
                <li><Link to="/register" className="hover:text-indigo-600 dark:hover:text-indigo-400">Register Account</Link></li>
                <li><Link to="/settings" className="hover:text-indigo-600 dark:hover:text-indigo-400">Viva Guide & Diagnostics</Link></li>
                <li><Link to="/reports" className="hover:text-indigo-600 dark:hover:text-indigo-400">Academic Reports</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
            <span>
              Final-Year Research Engineering Project · All Rights Reserved
            </span>
            <div className="flex items-center gap-4">
              <span>Status: System Operational</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
