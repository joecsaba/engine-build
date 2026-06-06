import { Link } from "wouter";
import { ClipboardList, ChevronRight, Wrench, PlusCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { SEOHead } from "@/components/SEOHead";
import { useAuth } from "@/context/AuthContext";

const tools = [
  {
    icon: Wrench,
    title: "My Engine Builds",
    href: "/build-sheets/my-builds",
    desc: "Your guided engine builds — fill in your specs step by step, and the calculators will pull your data automatically. Sign in to save your builds.",
    tags: ["Guided Wizard", "Auto-Populates Calculators", "Save & Resume"],
    isNew: true,
    highlight: true,
  },
  {
    icon: ClipboardList,
    title: "Engine Record Sheet",
    href: "/build-sheets/record",
    desc: "Interactive build documentation form. Records all critical clearances, component specs, and machine shop measurements for a professional build file.",
    tags: ["Printable", "PDF-Ready", "All Platforms"],
    isNew: false,
    highlight: false,
  },
];

export default function BuildSheetsIndex() {
  const { isSignedIn } = useAuth();

  return (
    <div>
      <SEOHead
        title="Build Sheets"
        description="Plan and document your engine build."
        canonical="/build-sheets"
        noindex
      />
      <PageHeader
        eyebrow="Build Sheets"
        title="Plan & Document Your Build"
        subtitle="From parts selection with pricing to final assembly documentation — the tools serious builders use."
      />

      <div className="container mx-auto max-w-4xl px-4 py-10">
        {/* Quick action: Start New Build */}
        <div className="mb-8">
          <Link href={isSignedIn ? "/build-sheets/new" : "/sign-in"}>
            <div className="group flex items-center gap-4 p-5 rounded-lg border-2 border-dashed border-[#E85D04]/40 hover:border-[#E85D04] bg-[#E85D04]/5 hover:bg-[#E85D04]/10 transition-all cursor-pointer">
              <PlusCircle className="w-8 h-8 text-[#E85D04]" />
              <div>
                <h2 className="text-lg font-bold text-[#E85D04]">Start a New Engine Build</h2>
                <p className="text-sm text-gray-500">
                  {isSignedIn
                    ? "Pick your engine and start filling in your build specs"
                    : "Sign in to create and save your engine builds"}
                </p>
              </div>
            </div>
          </Link>
        </div>

        <div className="space-y-4">
          {tools.map(({ icon: Icon, title, href, desc, tags, isNew, highlight }) => (
            <Link key={href} href={href}>
              <div className={`group flex items-start gap-5 p-6 rounded-lg border bg-white hover:border-[#E85D04] hover:shadow-md transition-all cursor-pointer ${
                highlight ? "border-[#E85D04]/30" : "border-gray-200"
              }`}>
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

      </div>
    </div>
  );
}
