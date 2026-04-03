
import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  Zap, 
  Video, 
  Fingerprint, 
  FileText, 
  Bell, 
  Globe, 
  ArrowRight, 
  Play, 
  CheckCircle2, 
  AlertTriangle,
  Lock,
  Search,
  Check,
  ChevronRight,
  Menu,
  X,
  Instagram,
  Twitter,
  Linkedin,
  Github
} from 'lucide-react';
import { cn } from '../utils';

const ParticleBackground = () => {
  return (
    <div className="particles-container">
      <div className="absolute inset-0 grid-background opacity-20" />
      {[...Array(30)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-white/20 rounded-full"
          initial={{ 
            x: Math.random() * 100 + "%", 
            y: Math.random() * 100 + "%",
            opacity: Math.random() * 0.5 + 0.1
          }}
          animate={{
            y: [null, "-100%"],
            transition: {
              duration: Math.random() * 20 + 10,
              repeat: Infinity,
              ease: "linear"
            }
          }}
        />
      ))}
    </div>
  );
};

const Navbar = ({ scrolled, onLoginClick, onDashboardClick, onHomeClick }: any) => {
  return (
    <nav className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-6 py-4",
      scrolled ? "glass border-b border-white/5 py-3" : "bg-transparent"
    )}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer group" onClick={onHomeClick}>
          <Shield className="text-purple-500 w-8 h-8 group-hover:scale-110 transition-transform" />
          <span className="text-xl font-bold tracking-tight">
            Empower<span className="text-purple-500">Net</span>
          </span>
        </div>
        
        <div className="hidden md:flex items-center gap-8">
          {["Features", "How It Works", "Pricing", "Demo"].map((item) => (
            <a 
              key={item} 
              href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
              className="text-sm font-medium text-muted-foreground hover:text-white transition-colors nav-link-hover"
            >
              {item}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={onLoginClick}
            className="text-sm font-medium text-muted-foreground hover:text-white transition-colors"
          >
            Sign In
          </button>
          <button 
            onClick={onLoginClick}
            className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl px-5 py-2 text-sm font-medium hover:scale-105 transition-all glow-primary"
          >
            Start Free Scan
          </button>
        </div>
      </div>
    </nav>
  );
};

const Hero = ({ onDashboardClick }: any) => {
  return (
    <section className="relative pt-32 pb-20 px-6 overflow-hidden">
      <ParticleBackground />
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-8"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-purple-400">
            <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" />
            AI-Powered • Real-Time • 99.8% Accuracy
            <ChevronRight size={14} />
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1]">
            Detect Scams. <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400">
              Expose Deepfakes.
            </span> <br />
            Protect Reality.
          </h1>
          
          <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
            Real-time AI protection against digital fraud, fake content, and voice cloning attacks. Stay safe across every digital interaction.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button 
              onClick={onDashboardClick}
              className="w-full sm:w-auto px-8 py-4 bg-purple-600 hover:bg-purple-500 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all group"
            >
              Start Free Scan <ArrowRight className="group-hover:translate-x-1 transition-all" />
            </button>
            <a href="#demo" className="w-full sm:w-auto px-8 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-white/10 transition-all">
              <Play size={20} className="fill-white" /> Watch Demo
            </a>
          </div>

          <div className="flex items-center gap-6 pt-4 text-xs font-medium text-muted-foreground uppercase tracking-widest">
            <div className="flex items-center gap-1.5"><Check className="text-green-500" size={14} /> SOC 2 Certified</div>
            <div className="flex items-center gap-1.5"><Check className="text-green-500" size={14} /> Encrypted</div>
            <div className="flex items-center gap-1.5"><Check className="text-green-500" size={14} /> 99.8% Accuracy</div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="relative hidden lg:block"
        >
          {/* Dashboard Preview Card */}
          <div className="relative z-10 glass border border-white/10 rounded-[2.5rem] p-8 animate-float shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-600/20 rounded-xl flex items-center justify-center border border-purple-500/30">
                  <ShieldAlert className="text-purple-400" size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold">EmpowerNet Shield</h4>
                  <p className="text-[10px] text-muted-foreground">Neural analysis active</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-green-400 font-bold uppercase tracking-wider">+18 Blocked</span>
                <p className="text-[10px] text-muted-foreground">Last hour</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span>Deepfake Detected</span>
                  <span className="text-purple-400">99%</span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: "99%" }}
                    transition={{ duration: 1.5, delay: 1 }}
                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-500" 
                  />
                </div>
              </div>

              <div className="glass bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="text-yellow-500" size={18} />
                  <div>
                    <h5 className="text-[11px] font-bold uppercase tracking-wider">Scam Text Intercepted</h5>
                    <p className="text-[10px] text-muted-foreground">Phishing • High confidence</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-black text-[8px] uppercase tracking-widest border border-red-500/20">Blocked</span>
              </div>

              <div className="pt-2">
                <div className="flex items-center justify-between text-[11px] font-bold mb-4">
                  <div className="flex items-center gap-2"><Zap className="text-purple-400" size={14} /> Threat Feed</div>
                  <span className="text-green-400">↓ 12% today</span>
                </div>
                <svg className="w-full h-12 overflow-visible">
                  <motion.path
                    d="M0,20 Q50,0 100,20 T200,15 T300,30 T400,10"
                    fill="none"
                    stroke="url(#gradient)"
                    strokeWidth="2"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#D946EF" />
                      <stop offset="100%" stopColor="#0EA5E9" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
          </div>
          
          {/* Decorative Orbs */}
          <div className="absolute top-[-20px] right-[-20px] w-4 h-4 rounded-full bg-purple-500 blur-sm animate-pulse" />
          <div className="absolute top-1/2 left-[-40px] w-64 h-64 bg-purple-600/10 rounded-full blur-[100px] -z-10" />
        </motion.div>
      </div>
    </section>
  );
};

const Ticker = () => {
  const logos = ["FORBES", "TECHCRUNCH", "NYT", "WIRED", "WSJ", "BLOOMBERG"];
  return (
    <div className="py-12 border-y border-white/5 bg-black/50 overflow-hidden relative">
      <div className="animate-scroll whitespace-nowrap flex items-center">
        {[...logos, ...logos, ...logos].map((logo, i) => (
          <span 
            key={i} 
            className="text-2xl font-black text-white/20 mx-12 tracking-tighter"
          >
            {logo}
          </span>
        ))}
      </div>
    </div>
  );
};

const Stats = () => {
  const stats = [
    { value: "50,000+", label: "Users Protected", icon: ShieldCheck },
    { value: "2.4M+", label: "Scams Blocked", icon: Zap },
    { value: "99.9%", label: "Detection Rate", icon: Search },
    { value: "< 2s", label: "Analysis Speed", icon: Zap },
  ];

  return (
    <section id="impact" className="py-24 px-6 max-w-7xl mx-auto">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
        {stats.map((stat, i) => (
          <motion.div 
            key={i}
            whileInView={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: 20 }}
            viewport={{ once: true }}
            className="glass p-8 rounded-3xl space-y-4"
          >
            <stat.icon className="text-purple-500" size={24} />
            <div className="space-y-1">
              <h3 className="text-3xl md:text-4xl font-bold tracking-tight">{stat.value}</h3>
              <p className="text-sm text-muted-foreground uppercase tracking-wider font-medium">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

const Features = () => {
  const features = [
    { title: "Deepfake Detection", desc: "Instant analysis of media using neural networks to detect facial forgeries.", icon: Fingerprint, detail: "99% Accuracy" },
    { title: "Meeting Guard", desc: "Real-time protection for Google Meet and Zoom, flagging Al-cloned voices.", icon: Video, detail: "< 2s Latency" },
    { title: "Scam Analyst", desc: "Deep scanning of messages and emails for phishing patterns.", icon: ShieldAlert, detail: "ML Trained" },
    { title: "Child Safety", desc: "Zero-tolerance filtering of grooming and toxic content.", icon: Lock, detail: "COPPA Ready" },
    { title: "Evidence Ledger", desc: "Immutable storage of threats for court submission.", icon: FileText, detail: "Blockchain" },
    { title: "Instant Reporting", desc: "Auto-generated forensic reports for legal action.", icon: Bell, detail: "Instant" }
  ];

  return (
    <section id="features" className="py-32 px-6 max-w-7xl mx-auto">
      <div className="text-center space-y-4 mb-20">
        <h2 className="text-4xl md:text-6xl font-bold tracking-tight">Every Layer of Protection</h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Shielding you from every digital threat with a unified forensic suite.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {features.map((f, i) => (
          <motion.div
            key={i}
            whileHover={{ y: -5 }}
            className="glass p-8 rounded-3xl border border-white/5 hover:border-purple-500/50 transition-all relative group"
          >
            <div className="absolute top-6 right-8 text-[10px] font-bold text-purple-400 uppercase tracking-widest">{f.detail}</div>
            <div className="w-12 h-12 rounded-2xl bg-purple-600/10 flex items-center justify-center mb-6 group-hover:bg-purple-600/20 transition-all">
              <f.icon className="text-purple-400" size={24} />
            </div>
            <h3 className="text-xl font-bold mb-3">{f.title}</h3>
            <p className="text-muted-foreground leading-relaxed text-sm font-medium">{f.desc}</p>
            <div className="mt-6 w-full h-1 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-purple-500/30 w-1/3 group-hover:w-full transition-all duration-700" />
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

const Pricing = () => {
  const plans = [
    {
      name: "Free",
      price: "0",
      desc: "Perfect for getting started.",
      features: ["10 scans / day", "Deepfake detection", "Scam text analysis", "Basic reports", "Chrome extension"],
      cta: "Get Started Free",
      popular: false
    },
    {
      name: "Plus",
      price: "19",
      desc: "For individuals & small teams.",
      features: ["500 scans / day", "Deepfake detection", "Scam text analysis", "Voice clone detection", "Real-time alerts"],
      cta: "Start Free Trial",
      popular: true
    },
    {
      name: "Pro",
      price: "79",
      desc: "For enterprises & security teams.",
      features: ["Unlimited scans", "All Plus features", "Full API access", "25-seat team mgmt", "Custom AI training"],
      cta: "Contact Sales",
      popular: false
    }
  ];

  return (
    <section id="pricing" className="py-32 px-6 max-w-7xl mx-auto">
      <div className="text-center space-y-6 mb-20">
        <div className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-purple-400">Simple, Transparent Pricing</div>
        <h2 className="text-5xl md:text-7xl font-bold tracking-tight">Choose Your <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400">Protection</span></h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Start free. Upgrade when you’re ready. Cancel anytime.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((p, i) => (
          <motion.div 
            key={i}
            whileHover={{ y: -10 }}
            className={cn(
              "glass p-10 rounded-[2.5rem] flex flex-col items-center text-center relative border border-white/5",
              p.popular && "border-purple-500/50 shadow-[0_0_50px_-12px_rgba(168,85,247,0.3)] bg-purple-500/5"
            )}
          >
            {p.popular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-500 to-indigo-500 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                ✨ Most Popular
              </div>
            )}
            <div className="space-y-4 mb-8">
              <h3 className="text-2xl font-bold">{p.name}</h3>
              <p className="text-sm text-muted-foreground font-medium">{p.desc}</p>
            </div>
            
            <div className="flex items-baseline gap-1 mb-10">
              <span className="text-5xl font-black tracking-tighter">${p.price}</span>
              <span className="text-muted-foreground font-medium">/month</span>
            </div>

            <button className={cn(
              "w-full py-4 rounded-2xl font-bold transition-all mb-10 flex items-center justify-center gap-2",
              p.popular 
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:scale-105" 
                : "bg-white/5 hover:bg-white/10"
            )}>
              {p.cta} <ArrowRight size={18} />
            </button>

            <ul className="space-y-4 text-left w-full">
              {p.features.map((f, j) => (
                <li key={j} className="flex items-center gap-3 text-sm font-medium">
                  <Check className="text-green-500" size={18} />
                  {f}
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

const Demo = () => {
  const [inputText, setInputText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);

  const samples = [
    "URGENT: Your bank account is suspended. Click to verify: bit.ly/xf-login",
    "Congratulations! You won $50,000 lottery. Reply with SSN to claim.",
    "Hey! Are you coming to the party tonight? Let me know!"
  ];

  const handleAnalyze = () => {
    if (!inputText) return;
    setIsAnalyzing(true);
    setResult(null);
    setTimeout(() => {
      setIsAnalyzing(false);
      const isScam = inputText.toLowerCase().includes("urgent") || inputText.toLowerCase().includes("win") || inputText.toLowerCase().includes("bit.ly");
      setResult({
        verdict: isScam ? "SCAM DETECTED" : "SAFE CONTENT",
        score: isScam ? 98 : 2,
        features: isScam ? ["Phishing URL", "Urgent Language", "Social Engineering"] : ["No threats found"]
      });
    }, 2000);
  };

  return (
    <section id="demo" className="py-32 px-6 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
        <div className="space-y-8">
          <div className="inline-block px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-[10px] font-black uppercase tracking-[0.2em] text-purple-400">Live Demo — Try Now Free</div>
          <h2 className="text-5xl md:text-7xl font-bold tracking-tight">Live <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-400">Scanner</span></h2>
          <p className="text-muted-foreground text-lg leading-relaxed">Paste any suspicious text or URL. Watch EmpowerNet's AI analyze it in real-time with forensic precision.</p>
          
          <div className="space-y-4">
            <p className="text-xs font-black uppercase tracking-widest text-white/30">Quick Samples</p>
            <div className="flex flex-wrap gap-3">
              {samples.map((s, i) => (
                <button 
                  key={i}
                  onClick={() => setInputText(s)}
                  className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-medium hover:bg-white/10 transition-all text-left max-w-xs truncate"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="glass rounded-[2.5rem] border border-white/10 p-1 overflow-hidden">
          <div className="bg-[#0D0D0F] rounded-[2.2rem] p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
              </div>
              <div className="text-[10px] font-mono text-white/20">{">_ ~ empowernet scan --realtime"}</div>
            </div>

            <div className="relative">
              <textarea 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Paste suspicious text, URL, or message here..."
                className="w-full bg-transparent border-none outline-none resize-none font-medium text-lg min-h-[150px] placeholder:text-white/10"
              />
              <AnimatePresence>
                {isAnalyzing && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center gap-4"
                  >
                    <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                    <p className="text-sm font-black uppercase tracking-widest text-purple-400">Neural Analysis Active...</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Model: Toxic-BERT + FinBERT</span>
              </div>
              <button 
                onClick={handleAnalyze}
                disabled={!inputText || isAnalyzing}
                className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 shadow-lg shadow-purple-500/20"
              >
                <Zap size={16} /> Analyze with AI
              </button>
            </div>

            <AnimatePresence>
              {result && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "mt-4 p-6 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-6",
                    result.score > 50 ? "bg-red-500/5 border-red-500/20" : "bg-green-500/5 border-green-500/20"
                  )}
                >
                  <div className="space-y-1">
                    <h4 className={cn("text-lg font-black tracking-tight", result.score > 50 ? "text-red-400" : "text-green-400")}>{result.verdict}</h4>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Forensic Score: {result.score}% Confidence</p>
                  </div>
                  <div className="flex gap-2">
                    {result.features.map((f: string, i: number) => (
                      <span key={i} className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[8px] font-bold uppercase tracking-widest">{f}</span>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
};

const HowItWorks = () => {
  const steps = [
    { num: "01", title: "Connect", desc: "Link your socials, browsers, and devices to the engine." },
    { num: "02", title: "Scan", desc: "EmpowerNet performs real-time neural analysis on every feed." },
    { num: "03", title: "Protect", desc: "Instantly block fraudulent content and receive alerts." }
  ];

  return (
    <section id="how-it-works" className="py-32 px-6 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
        <div className="space-y-8">
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">Instant Protection <br /> In Three Simple Steps</h2>
          <div className="space-y-12 pt-8">
            {steps.map((s, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="flex gap-6"
              >
                <div className="text-5xl font-black text-white/10">{s.num}</div>
                <div className="space-y-2">
                  <h4 className="text-xl font-bold">{s.title}</h4>
                  <p className="text-muted-foreground leading-relaxed font-medium">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
        <div className="relative">
          <div className="glass rounded-[3rem] p-4 relative overflow-hidden aspect-video flex items-center justify-center">
            <div className="absolute inset-0 grid-background opacity-20" />
            <Search className="text-purple-500 animate-pulse" size={64} />
            <div className="absolute bottom-8 left-8 right-8 glass p-6 rounded-2xl flex items-center justify-between border-white/20">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="text-green-500" size={24} />
                <span className="font-bold">System Secure</span>
              </div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Active Scan</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const Footer = () => {
  return (
    <footer className="py-24 px-6 border-t border-white/5 bg-black/50">
      <div className="max-w-7xl mx-auto space-y-20">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="md:col-span-2 space-y-6">
            <div className="flex items-center gap-2">
              <Shield className="text-purple-500 w-8 h-8" />
              <span className="text-xl font-bold tracking-tight">Empower<span className="text-purple-500">Net</span></span>
            </div>
            <p className="text-muted-foreground max-w-sm leading-relaxed font-medium">Providing real-time forensic protection for India's digital future. Secure your identity, protect your family.</p>
            <div className="flex items-center gap-4">
              <a href="#" className="p-3 glass rounded-xl hover:text-purple-400 transition-colors"><Twitter size={18} /></a>
              <a href="#" className="p-3 glass rounded-xl hover:text-purple-400 transition-colors"><Linkedin size={18} /></a>
              <a href="#" className="p-3 glass rounded-xl hover:text-purple-400 transition-colors"><Github size={18} /></a>
              <a href="#" className="p-3 glass rounded-xl hover:text-purple-400 transition-colors"><Instagram size={18} /></a>
            </div>
          </div>
          
          <div className="space-y-6">
            <h5 className="text-sm font-black uppercase tracking-widest text-white/50">Product</h5>
            <ul className="space-y-4 text-sm font-medium text-muted-foreground">
              <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Forensic SDK</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Browser Extension</a></li>
              <li><a href="#" className="hover:text-white transition-colors">API Reference</a></li>
            </ul>
          </div>
          
          <div className="space-y-6">
            <h5 className="text-sm font-black uppercase tracking-widest text-white/50">Company</h5>
            <ul className="space-y-4 text-sm font-medium text-muted-foreground">
              <li><a href="#" className="hover:text-white transition-colors">About</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-12 border-t border-white/5 flex flex-col md:row items-center justify-between gap-6">
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-[0.2em]">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            All Systems Operational
          </div>
          <p className="text-xs text-muted-foreground font-medium">© 2026 EmpowerNet AI. Built for Digital Safety.</p>
        </div>
      </div>
    </footer>
  );
};

const LandingPage: React.FC<{ 
  onLoginClick: () => void; 
  onDashboardClick: () => void;
  onExtensionClick: () => void;
}> = ({ onLoginClick, onDashboardClick, onExtensionClick }) => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white font-sans selection:bg-purple-500/30">
      <Navbar 
        scrolled={scrolled} 
        onLoginClick={onLoginClick} 
        onDashboardClick={onDashboardClick} 
        onHomeClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      />
      <main>
        <Hero onDashboardClick={onDashboardClick} />
        <Ticker />
        <Stats />
        <Features />
        <Demo />
        <HowItWorks />
        <Pricing />
      </main>
      <Footer />
    </div>
  );
};

export default LandingPage;

