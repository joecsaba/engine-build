import { Link } from "wouter";
import { ClipboardList, ShoppingCart, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";

const tools = [
  {
    icon: ShoppingCart,
    title: "Build Planner",
    href: "/build-sheets/planner",
    desc: "Select your engine platform, pick components category by category, and get a complete shopping list with parts pricing from Summit Racing and Jegs.",
    tags: ["Parts Catalog", "Running Total", "Shopping List", "5 Platforms"],
    isNew: true,
  },
  {
    icon: ClipboardList,
    title: "Engine Record Sheet",
    href: "/build-sheets/record",
    desc: "Interactive build documentation form. Records all critical clearances, component specs, and machine shop measurements for a professional build file.",
    tags: ["Printable", "PDF-Ready", "All Platforms"],
    isNew: false,
  },
];

export default function BuildSheetsIndex() {
  return (
    <div>
      <PageHeader
        eyebrow="Build Sheets"
        title="Plan & Document Your Build"
        subtitle="From parts selection with pricing to final assembly documentation — the tools serious builders use."
      />

      <div className="container mx-auto max-w-4xl px-4 py-10">
        <div className="space-y-4">
          {tools.map(({ icon: Icon, title, href, desc, tags, isNew }) => (
            <Link key={href} href={href}>
              <div className="group flex items-start gap-5 p-6 rounded-lg border border-gray-200 bg-white hover:border-[#E85D04] hover:shadow-md transition-all cursor-pointer">
                <div className="w-12 h-12 rounded-xl bg-[#E85D04]/10 text-[#E85D04] flex items-center justify-center shrink-0 group-hover:bg-[#E85D04] group-hover:text-white transition-all">
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-bold group-hover:text-[#E85D04] transition-colors">{title}</h2>
                    {isNew && (
                      <span className="text-xs bg-[#E85D04] text-white px-2 py-0.5 rounded-full font-semibold">New</span>
                    )}
                  </div>
                  <p className="text-gray-500 text-sm mb-3">{desc}</p>
                  <div className="flex flex-wrap gap-2">
                    {tags.map(tag => (
                      <span key={tag} className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-500 font-medium">{tag}</span>
                    ))}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#E85D04] transition-colors shrink-0 mt-1" />
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-10 p-6 rounded-lg bg-gray-50 border border-gray-200">
          <h3 className="font-semibold text-lg mb-2">About Part Pricing</h3>
          <p className="text-sm text-gray-600">
            Part prices shown in the Build Planner are reference values sourced from Summit Racing and Jegs catalogs. Prices fluctuate — always verify current pricing before ordering. Part numbers are listed so you can search directly. EngineVault is not affiliated with any retailer.
          </p>
        </div>
      </div>
    </div>
  );
}
