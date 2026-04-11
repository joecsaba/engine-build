import { Link } from "wouter";
import { DollarSign, FileText, MapPin, ChevronRight } from "lucide-react";

const tools = [
  {
    icon: DollarSign,
    title: "Machine Shop Pricing Guide",
    href: "/shop-tools/pricing",
    desc: "Regional pricing benchmarks for common machine shop services. Low / Average / High ranges with community-submitted data.",
    tags: ["Bore & Hone", "Deck", "Valve Job", "Balance"],
  },
  {
    icon: FileText,
    title: "Engine Build Record Sheet",
    href: "/shop-tools/build-sheet",
    desc: "Printable engine documentation form for professional builds. Records all critical measurements, clearances, and component data.",
    tags: ["Printable", "PDF-Ready", "All Platforms"],
  },
  {
    icon: MapPin,
    title: "Machine Shop Directory",
    href: "/shop-tools/directory",
    desc: "Find engine machine shops by location and specialty. Community ratings and reviews. Submit your own shop for listing.",
    tags: ["Searchable", "Ratings", "Submit Shop"],
  },
];

export default function ShopToolsIndex() {
  return (
    <div className="container mx-auto max-w-4xl py-10 px-4">
      <div className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight mb-3">Shop Tools</h1>
        <p className="text-muted-foreground text-lg">Professional resources for machine shops and serious engine builders.</p>
      </div>

      <div className="space-y-4">
        {tools.map(({ icon: Icon, title, href, desc, tags }) => (
          <Link key={href} href={href}>
            <div className="group flex items-start gap-5 p-6 rounded-lg border bg-card hover:border-primary/60 hover:shadow-md transition-all cursor-pointer">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-all">
                <Icon className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold mb-1 group-hover:text-primary transition-colors">{title}</h2>
                <p className="text-muted-foreground text-sm mb-3">{desc}</p>
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => <span key={tag} className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{tag}</span>)}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
