import { motion } from "framer-motion";
import aboutImg from "@/assets/about.png";

export default function About() {
  return (
    <div className="flex flex-col min-h-screen">
      <section className="py-24 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl"
          >
            <h1 className="text-5xl md:text-7xl font-extrabold uppercase tracking-tight mb-6">
              The <span className="text-primary">Agency</span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              We are architects of digital influence. Eclipse Angels Agency was founded on a singular principle: top-tier talent deserves top-tier representation.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <img src={aboutImg} alt="Team" className="rounded-xl border border-border shadow-2xl" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <h2 className="text-3xl font-bold uppercase tracking-wider">Our Mission</h2>
              <p className="text-muted-foreground text-lg">
                To bridge the gap between creative passion and commercial success. We believe that streaming is the future of entertainment, and our creators are the stars of tomorrow.
              </p>
              <p className="text-muted-foreground text-lg">
                We handle the negotiations, the growth strategies, and the technical hurdles so our talent can focus entirely on what they do best: entertaining their audience.
              </p>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
