import { Link } from "wouter";
import { BookOpen, ChevronRight } from "lucide-react";

const guides = [
  {
    level: "Beginner",
    color: "bg-green-50 border-green-200 text-green-700",
    badge: "bg-green-100 text-green-700",
    items: [
      { title: "How to Check Bearing Clearance", href: "/guides/bearing-clearance", desc: "Using Plastigage to measure main and rod bearing clearances. Step-by-step with spec table.", time: "15 min" },
      { title: "How to Set Piston Ring End Gap", href: "/guides/ring-gap", desc: "Proper filing technique, stagger positioning, and oil ring installation.", time: "12 min" },
      { title: "Engine Break-In Procedure", href: "/guides/break-in", desc: "Complete flat-tappet AND roller cam break-in. The critical ZDDP requirements explained.", time: "18 min" },
    ],
  },
  {
    level: "Intermediate",
    color: "bg-yellow-50 border-yellow-200 text-yellow-700",
    badge: "bg-yellow-100 text-yellow-700",
    items: [
      { title: "How to Degree a Camshaft", href: "/guides/degree-cam", desc: "Finding TDC, degree wheel setup, intake centerline, and lobe separation verification.", time: "20 min" },
      { title: "How to Evaluate Machine Shop Work", href: "/guides/machine-shop-quality", desc: "What to inspect when you get your block back. Red flags, measuring guide, questions to ask.", time: "14 min" },
    ],
  },
  {
    level: "Advanced",
    color: "bg-orange-50 border-orange-200 text-orange-700",
    badge: "bg-orange-100 text-orange-700",
    items: [
      { title: "Blueprinting an Engine", href: "/guides/blueprinting", desc: "What blueprinting actually means, what gets blueprinted, and whether it's worth the cost for your build.", time: "22 min" },
    ],
  },
];

export default function GuidesIndex() {
  return (
    <div className="container mx-auto max-w-4xl py-10 px-4">
      <div className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight mb-3">Build Guides</h1>
        <p className="text-muted-foreground text-lg">Step-by-step procedures written for real engine builders — not watered-down tutorials.</p>
      </div>

      <div className="space-y-10">
        {guides.map(({ level, color, badge, items }) => (
          <section key={level}>
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold mb-4 ${badge}`}>
              {level}
            </div>
            <div className="space-y-3">
              {items.map(item => (
                <Link key={item.href} href={item.href}>
                  <div className="group flex items-start justify-between gap-4 p-5 rounded-lg border bg-card hover:border-primary/60 hover:shadow-sm transition-all cursor-pointer">
                    <div className="flex gap-4 items-start flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-all">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="font-bold text-lg group-hover:text-primary transition-colors">{item.title}</h2>
                        <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
                        <p className="text-xs text-muted-foreground mt-1">{item.time} read</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
