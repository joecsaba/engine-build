import { Link } from "wouter";
import { DollarSign, FileText, MapPin, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";

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
    <div>
      <PageHeader
        eyebrow="Professional Resources"
        title="Shop Tools"
        subtitle="Professional resources for machine shops and serious engine builders."
      />

      <div className="container mx-auto max-w-4xl px-4 py-10">
        <div className="space-y-4">
          {tools.map(({ icon: Icon, title, href, desc, tags }) => (
            <Link key={href} href={href}>
              <div className="group flex items-start gap-5 p-6 rounded-lg border border-gray-200 bg-white hover:border-[#E85D04] hover:shadow-md transition-all cursor-pointer">
                <div className="w-12 h-12 rounded-xl bg-[#E85D04]/10 text-[#E85D04] flex items-center justify-center shrink-0 group-hover:bg-[#E85D04] group-hover:text-white transition-all">
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold mb-1 group-hover:text-[#E85D04] transition-colors">{title}</h2>
                  <p className="text-gray-500 text-sm mb-3">{desc}</p>
                  <div className="flex flex-wrap gap-2">
                    {tags.map(tag => <span key={tag} className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-500 font-medium">{tag}</span>)}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#E85D04] transition-colors shrink-0 mt-1" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
