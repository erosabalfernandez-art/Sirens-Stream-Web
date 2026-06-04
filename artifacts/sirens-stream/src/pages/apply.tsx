import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

const formSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email"),
  platform: z.string().min(1, "Primary platform is required"),
  channelUrl: z.string().url("Must be a valid URL"),
  followerCount: z.string().min(1, "Required"),
  monthlyHours: z.string().min(1, "Required"),
  about: z.string()
});

export default function Apply() {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", email: "", platform: "", channelUrl: "", followerCount: "", monthlyHours: "", about: "" }
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    toast({ title: "Application Submitted", description: "Our talent team will review your profile shortly." });
    form.reset();
  }

  return (
    <div className="flex flex-col min-h-screen">
      <section className="py-24 relative">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-2xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
              <h1 className="text-5xl font-extrabold uppercase tracking-tight mb-4">Join The <span className="text-primary">Roster</span></h1>
              <p className="text-muted-foreground text-lg">We review every application. If you have the drive and the talent, we want to hear from you.</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card border border-border p-8 rounded-xl">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem><FormLabel>Full Name / Alias</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem><FormLabel>Email Address</FormLabel><FormControl><Input placeholder="john@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="platform" render={({ field }) => (
                      <FormItem><FormLabel>Primary Platform</FormLabel><FormControl><Input placeholder="Twitch, YouTube, TikTok..." {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="channelUrl" render={({ field }) => (
                      <FormItem><FormLabel>Channel URL</FormLabel><FormControl><Input placeholder="https://twitch.tv/..." {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="followerCount" render={({ field }) => (
                      <FormItem><FormLabel>Total Followers</FormLabel><FormControl><Input placeholder="e.g. 50,000" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="monthlyHours" render={({ field }) => (
                      <FormItem><FormLabel>Avg. Monthly Stream Hours</FormLabel><FormControl><Input placeholder="e.g. 120" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>

                  <FormField control={form.control} name="about" render={({ field }) => (
                    <FormItem><FormLabel>Tell us about your content & goals</FormLabel><FormControl><Textarea rows={5} placeholder="I focus on competitive FPS..." {...field} /></FormControl><FormMessage /></FormItem>
                  )} />

                  <button type="submit" className="w-full bg-primary text-primary-foreground py-4 rounded font-bold uppercase tracking-wider hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(168,85,247,0.4)]">
                    Submit Application
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
