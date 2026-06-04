import { motion } from "framer-motion";
import { Users, Shield, TrendingUp, Monitor, Edit3, DollarSign } from "lucide-react";
import servicesImg from "@/assets/services.png";

const services = [
  {
    icon: Users,
    title: "Talent Management",
    desc: "A dedicated talent manager who acts as your agent, advocate, and shield."
  },
  {
    icon: Shield,
    title: "Brand Partnerships",
    desc: "We secure premium sponsorships that align with your audience and values."
  },
  {
    icon: TrendingUp,
    title: "Growth Strategy",
    desc: "Data-driven insights to optimize your content across all platforms."
  },
  {
    icon: Monitor,
    title: "Technical Setup",
    desc: "Broadcast engineers to level up your audio, video, and stream quality."
  },
  {
    icon: Edit3,
    title: "Content Editing",
    desc: "In-house editors turning your VODs into high-performing TikToks and Shorts."
  },
  {
    icon: DollarSign,
    title: "Merch & Monetization",
    desc: "Launch your own product lines with our end-to-end merchandising solutions."
  }
];

export default function Services() {
  return (
    <div className="flex flex-col min-h-screen">
      <section className="py-24 relative overflow-hidden">
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl"
          >
            <h1 className="text-5xl md:text-7xl font-extrabold uppercase tracking-tight mb-6">
              Our <span className="text-primary">Services</span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Full-spectrum support for digital creators. We provide the infrastructure of a major entertainment studio, tailored for the streaming era.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-card border border-border p-8 rounded-xl hover:border-primary/50 transition-colors group"
              >
                <div className="w-14 h-14 rounded bg-secondary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <s.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-xl font-bold uppercase tracking-wider mb-3">{s.title}</h3>
                <p className="text-muted-foreground">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="container mx-auto px-4 md:px-6">
          <img src={servicesImg} alt="Gear" className="w-full h-96 object-cover rounded-xl border border-border shadow-2xl" />
        </div>
      </section>
    </div>
  );
}
