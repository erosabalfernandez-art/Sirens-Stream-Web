import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Mail, MapPin } from "lucide-react";
import contactImg from "@/assets/contact.png";

const formSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email"),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(10, "Message too short")
});

export default function Contact() {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", email: "", subject: "", message: "" }
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    toast({ title: "Message Sent", description: "We will get back to you shortly." });
    form.reset();
  }

  return (
    <div className="flex flex-col min-h-screen">
      <section className="py-24 relative overflow-hidden">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid md:grid-cols-2 gap-16 items-start">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <h1 className="text-5xl font-extrabold uppercase tracking-tight mb-6">Get In <span className="text-primary">Touch</span></h1>
              <p className="text-xl text-muted-foreground mb-12">For business inquiries, press, or general questions, reach out to our team.</p>
              
              <div className="space-y-8 mb-12">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded bg-secondary flex items-center justify-center"><Mail className="w-5 h-5 text-primary" /></div>
                  <div><p className="font-bold uppercase tracking-wider">Email</p><p className="text-muted-foreground">eclipse_angels@outlook.com</p></div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded bg-secondary flex items-center justify-center"><MapPin className="w-5 h-5 text-primary" /></div>
                  <div><p className="font-bold uppercase tracking-wider">HQ</p><p className="text-muted-foreground">Los Angeles, CA</p></div>
                </div>
              </div>
              <img src={contactImg} alt="Office" className="rounded-xl border border-border shadow-xl" />
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-card border border-border p-8 rounded-xl">
              <h2 className="text-2xl font-bold uppercase tracking-wider mb-6">Send a Message</h2>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Name</FormLabel><FormControl><Input placeholder="Your name" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>Email</FormLabel><FormControl><Input placeholder="your@email.com" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="subject" render={({ field }) => (
                    <FormItem><FormLabel>Subject</FormLabel><FormControl><Input placeholder="Inquiry..." {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="message" render={({ field }) => (
                    <FormItem><FormLabel>Message</FormLabel><FormControl><Textarea rows={6} placeholder="How can we help?" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <button type="submit" className="w-full bg-primary text-primary-foreground py-4 rounded font-bold uppercase tracking-wider hover:bg-primary/90 transition-all">
                    Send Message
                  </button>
                </form>
              </Form>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
