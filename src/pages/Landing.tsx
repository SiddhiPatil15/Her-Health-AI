import { motion } from "framer-motion";
import { ArrowRight, Heart, Brain, LineChart, MessageCircle, Shield, Activity, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import heroIllustration from "../assets/hero-illustration.png";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
  }),
};

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 md:px-8 py-4 max-w-[1280px] mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 md:w-9 md:h-9 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-body">H</div>
          <span className="text-h3 text-foreground font-semibold">HerHealth</span>
        </div>
        <div className="hidden lg:flex items-center gap-8">
          <span onClick={() => document.getElementById('features')?.scrollIntoView({behavior:'smooth'})} className="cursor-pointer text-body text-muted-foreground hover:text-foreground transition-colors">Features</span>
          <span onClick={() => document.getElementById('how')?.scrollIntoView({behavior:'smooth'})} className="cursor-pointer text-body text-muted-foreground hover:text-foreground transition-colors">How It Works</span>
          <Link to="/login" className="text-body text-muted-foreground hover:text-foreground transition-colors">Sign In</Link>
        </div>
        <div>
          <Link to="/signup" className="px-4 md:px-5 py-2 md:py-2.5 gradient-primary text-primary-foreground rounded-xl text-[14px] md:text-body font-medium hover-lift">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-[1280px] mx-auto px-6 md:px-8 pt-10 md:pt-16 pb-16 md:pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-16 items-center text-center lg:text-left">
          <motion.div initial="hidden" animate="visible" className="space-y-6">
            <motion.h1 variants={fadeUp} custom={1} className="text-[32px] md:text-[42px] leading-[1.15] font-bold text-foreground">
              AI-Powered Personalized Health Companion for <span className="text-primary">Women</span>
            </motion.h1>
            <motion.p variants={fadeUp} custom={2} className="text-body text-muted-foreground max-w-md leading-relaxed text-[15px] md:text-[16px] mx-auto lg:mx-0">
              Helping women manage metabolic health during pregnancy and menopause with personalized AI insights and monthly progress reports.
            </motion.p>
            <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row gap-4 pt-2 justify-center lg:justify-start">
              <Link to="/signup" className="px-7 py-3 gradient-primary text-primary-foreground rounded-xl text-body font-medium hover-lift flex items-center justify-center gap-2">
                Start Health Journey <ArrowRight className="w-4 h-4" />
              </Link>
              <span onClick={() => document.getElementById('features')?.scrollIntoView({behavior:'smooth'})} className="px-7 py-3 bg-card border border-border text-foreground rounded-xl text-body font-medium hover-lift flex justify-center cursor-pointer">
                Learn More
              </span>
            </motion.div>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}>
            <img src={heroIllustration} alt="Woman doing yoga" className="w-full max-w-sm md:max-w-md mx-auto" />
          </motion.div>
        </div>
      </section>

      {/* Problem / About */}
      <section id="about" className="bg-card py-16 md:py-20">
        <div className="max-w-[1280px] mx-auto px-6 md:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-10 md:mb-12">
            <motion.h2 variants={fadeUp} custom={0} className="text-[28px] md:text-h1 text-foreground mb-3">Why This Matters</motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-body text-muted-foreground max-w-lg mx-auto">
              Metabolic health issues affect millions of women during critical life stages.
            </motion.p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { stat: "14%", desc: "of pregnancies develop gestational diabetes", icon: Activity },
              { stat: "50%", desc: "risk of developing Type 2 Diabetes later in life", icon: Shield },
              { stat: "80%", desc: "of menopausal women experience metabolic changes", icon: Zap },
            ].map(({ stat, desc, icon: Icon }, i) => (
              <motion.div
                key={i}
                initial="hidden" whileInView="visible" viewport={{ once: true }}
                variants={fadeUp} custom={i}
                className="bg-background rounded-2xl p-8 text-center hover-lift card-shadow"
              >
                <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <p className="text-[36px] font-bold text-primary mb-2">{stat}</p>
                <p className="text-body text-muted-foreground">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution / Features */}
      <section id="features" className="py-16 md:py-20 max-w-[1280px] mx-auto px-6 md:px-8">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-10 md:mb-12">
          <motion.h2 variants={fadeUp} custom={0} className="text-[28px] md:text-h1 text-foreground mb-3">How HerHealth Helps</motion.h2>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: Brain, title: "AI Risk Prediction", desc: "Predictive analytics for metabolic risk assessment", gradient: "gradient-primary" },
            { icon: LineChart, title: "Personalized Guidance", desc: "Custom lifestyle plans based on your health data", gradient: "gradient-purple" },
            { icon: Heart, title: "Monthly Health Wrap", desc: "Spotify Wrapped-style health progress reports", gradient: "gradient-peach" },
            { icon: MessageCircle, title: "AI Health Companion", desc: "24/7 conversational AI for health questions", gradient: "gradient-success" },
          ].map(({ icon: Icon, title, desc, gradient }, i) => (
            <motion.div
              key={i}
              initial="hidden" whileInView="visible" viewport={{ once: true }}
              variants={fadeUp} custom={i}
              className="bg-card rounded-2xl p-6 hover-lift card-shadow border border-border text-center md:text-left"
            >
              <div className={`w-12 h-12 rounded-xl ${gradient} flex items-center justify-center mb-4 mx-auto md:mx-0`}>
                <Icon className="w-5 h-5 text-primary-foreground" />
              </div>
              <h3 className="text-h3 text-foreground mb-2">{title}</h3>
              <p className="text-body text-muted-foreground">{desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how" className="bg-card py-16 md:py-20">
        <div className="max-w-[1280px] mx-auto px-6 md:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-10 md:mb-12">
            <motion.h2 variants={fadeUp} custom={0} className="text-[28px] md:text-h1 text-foreground mb-3">How It Works</motion.h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Enter Your Health Data", desc: "Share your health metrics, history, and current stage — pregnancy or menopause." },
              { step: "02", title: "AI Analyzes Patterns", desc: "Our AI engine processes your data to identify metabolic patterns and risks." },
              { step: "03", title: "Receive Personalized Guidance", desc: "Get tailored lifestyle recommendations, insights, and monthly progress reports." },
            ].map(({ step, title, desc }, i) => (
              <motion.div
                key={i}
                initial="hidden" whileInView="visible" viewport={{ once: true }}
                variants={fadeUp} custom={i}
                className="text-center"
              >
                <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-h2 mx-auto mb-4">
                  {step}
                </div>
                <h3 className="text-h3 text-foreground mb-2">{title}</h3>
                <p className="text-body text-muted-foreground">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA / Contact */}
      <section id="contact" className="py-16 md:py-20 max-w-[1280px] mx-auto px-6 md:px-8">
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }}
          className="gradient-primary rounded-3xl p-10 md:p-16 text-center"
        >
          <motion.h2 variants={fadeUp} custom={0} className="text-[28px] md:text-[32px] font-bold text-primary-foreground mb-4">
            Start Your Health Journey Today
          </motion.h2>
          <motion.p variants={fadeUp} custom={1} className="text-body text-primary-foreground/80 mb-8 max-w-md mx-auto">
            Join thousands of women taking control of their metabolic health with AI-powered insights.
          </motion.p>
          <motion.div variants={fadeUp} custom={2}>
            <Link to="/signup" className="px-8 py-3.5 bg-card text-foreground rounded-xl text-body font-medium hover-lift inline-flex items-center gap-2">
              Get Started Free <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Team */}
      <section id="team" className="bg-card py-16 md:py-20">
        <div className="max-w-[1280px] mx-auto px-6 md:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-10 md:mb-12">
            <motion.h2 variants={fadeUp} custom={0} className="text-[28px] md:text-h1 text-foreground mb-3">Meet the Team</motion.h2>
          </motion.div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {[
              "Siddhi Patil",
              "Riddhi Patil",
              "Priyanka Sharma",
              "Shamitha Palai"
            ].map((name, i) => (
              <motion.div
                key={i}
                initial="hidden" whileInView="visible" viewport={{ once: true }}
                variants={fadeUp} custom={i}
                className="bg-background rounded-2xl p-4 md:p-6 text-center hover-lift card-shadow"
              >
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full gradient-primary flex items-center justify-center mx-auto mb-4 text-primary-foreground font-bold text-[24px] md:text-h2">
                  {name.charAt(0)}
                </div>
                <h3 className="text-[16px] md:text-h3 text-foreground mb-1">{name}</h3>
                <p className="text-[12px] md:text-body text-muted-foreground">Co-Creator</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-12">
        <div className="max-w-[1280px] mx-auto px-6 md:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-caption">H</div>
            <span className="text-body font-semibold text-foreground">HerHealth</span>
          </div>
          <div className="flex flex-wrap justify-center gap-6 md:gap-8">
            {["About", "Privacy", "Contact", "Team"].map(link => (
              <span 
                key={link} 
                onClick={() => {
                  const id = link.toLowerCase();
                  const el = document.getElementById(id);
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                  else window.scrollTo({ top: 0, behavior: 'smooth' });
                }} 
                className="cursor-pointer text-body text-muted-foreground hover:text-foreground transition-colors"
              >
                {link}
              </span>
            ))}
          </div>
          <p className="text-caption text-muted-foreground text-center">© 2026 HerHealth. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
