import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Calculator, BookOpen, Database, Wrench } from "lucide-react";
import { useState } from "react";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");

  const quickLinks = [
    { name: "LS Series", slug: "ls-series" },
    { name: "SBC", slug: "gm-sbc" },
    { name: "Ford 302/351W", slug: "ford-sb" },
    { name: "BBC", slug: "gm-bbc" },
    { name: "Coyote 5.0", slug: "ford-modular" },
    { name: "2JZ", slug: "toyota-jz" },
  ];

  const features = [
    { title: "Engine Specs", desc: "Detailed clearance & torque specs for popular platforms", icon: Database, href: "/specs" },
    { title: "Calculators", desc: "Displacement, compression ratio, rod ratio & more", icon: Calculator, href: "/calculators" },
    { title: "Build Guides", desc: "Professional procedures for blueprinting & assembly", icon: BookOpen, href: "/guides" },
    { title: "Shop Tools", desc: "Pricing benchmarks, build sheets & shop directory", icon: Wrench, href: "/shop-tools" },
  ];

  const calculators = [
    { title: "Compression Ratio", href: "/calculators/compression-ratio", desc: "Static and dynamic compression" },
    { title: "Displacement", href: "/calculators/displacement", desc: "Bore, stroke, cylinder math" },
    { title: "Piston Ring Gap", href: "/calculators/ring-gap", desc: "Application specific gap specs" },
    { title: "Cam Duration", href: "/calculators/cam-duration", desc: "Advertised to .050\" conversion" },
    { title: "Rod Ratio", href: "/calculators/rod-ratio", desc: "Stroke to rod length math" },
    { title: "HP/Torque", href: "/calculators/hp-torque", desc: "Power to torque conversion" },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Typically would push to search route
      console.log("Searching for:", searchQuery);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="bg-[#1a1a1a] text-white py-20 px-4 relative overflow-hidden">
        {/* Abstract engine-like background pattern */}
        <div className="absolute inset-0 opacity-5 pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        
        <div className="container mx-auto max-w-5xl relative z-10">
          <div className="text-center space-y-6">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Everything an engine builder needs. <span className="text-primary">One place.</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto">
              The professional reference for engine specifications, calculators, and blueprinting procedures.
            </p>
            
            <form onSubmit={handleSearch} className="max-w-2xl mx-auto mt-8 relative">
              <div className="relative flex items-center">
                <Search className="absolute left-4 text-gray-400 w-5 h-5" />
                <Input 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search engines, torque specs, articles..." 
                  className="w-full pl-12 pr-4 py-6 text-lg rounded-full bg-white/10 border-white/20 text-white placeholder:text-gray-500 focus-visible:ring-primary"
                />
                <Button type="submit" className="absolute right-2 rounded-full bg-primary hover:bg-primary/90 text-white px-6">
                  Search
                </Button>
              </div>
            </form>

            <div className="pt-8 flex flex-wrap justify-center items-center gap-3 text-sm text-gray-400">
              <span>Most searched:</span>
              {quickLinks.map(link => (
                <Link key={link.slug} href={`/specs/${link.slug}`} className="hover:text-primary transition-colors bg-white/5 px-3 py-1 rounded-full border border-white/10">
                  {link.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Main Features Grid */}
      <section className="py-16 px-4 bg-gray-50 dark:bg-[#111]">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <Link key={feature.title} href={feature.href}>
                <Card className="h-full hover:shadow-md transition-shadow cursor-pointer border-border/50 group">
                  <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <feature.icon className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-lg">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm">{feature.desc}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Calculators */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Essential Calculators</h2>
              <p className="text-muted-foreground mt-2">Math for the machine shop.</p>
            </div>
            <Link href="/calculators">
              <Button variant="outline" className="hidden sm:flex">View All Calculators</Button>
            </Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {calculators.map(calc => (
              <Link key={calc.title} href={calc.href} className="block group">
                <div className="p-5 rounded-lg border bg-card hover:border-primary/50 transition-colors h-full flex flex-col">
                  <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">{calc.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{calc.desc}</p>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-6 sm:hidden">
            <Link href="/calculators" className="block w-full">
              <Button variant="outline" className="w-full">View All Calculators</Button>
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
