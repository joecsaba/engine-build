import { Link } from "wouter";
import { Wrench } from "lucide-react";

export function Footer() {
  const sections = [
    {
      title: "Data & Tools",
      links: [
        { href: "/specs", label: "Engine Specs Database" },
        { href: "/calculators", label: "Calculators" },
        { href: "/torque-specs", label: "Torque Specs" },
        { href: "/shop-tools", label: "Shop Tools" },
      ],
    },
    {
      title: "Guides & Articles",
      links: [
        { href: "/guides", label: "Build Guides" },
        { href: "/cam-guide", label: "Camshaft Selection" },
        { href: "/articles", label: "Articles" },
      ],
    },
  ];

  return (
    <footer className="bg-[#111111] text-gray-400 border-t border-[#222]">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight text-white hover:text-white/90">
              <Wrench className="w-6 h-6 text-primary" />
              <span>Engine<span className="text-primary">Vault</span></span>
            </Link>
            <p className="text-sm max-w-sm">
              The online authority for engine builders. Precision data, professional tools, and complete guides for hobbyists and performance shops alike.
            </p>
          </div>
          
          {sections.map((section) => (
            <div key={section.title}>
              <h3 className="text-white font-semibold mb-4">{section.title}</h3>
              <ul className="space-y-2 text-sm">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="hover:text-primary transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        <div className="mt-12 pt-8 border-t border-[#222] text-xs text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-4">
          <p>&copy; {new Date().getFullYear()} EngineVault. All rights reserved.</p>
          <div className="max-w-xl text-gray-500">
            <p><strong>Disclaimer:</strong> All specifications and torque values provided are for reference only. Always verify against factory service manuals before assembly. EngineVault is not responsible for engine damage.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
