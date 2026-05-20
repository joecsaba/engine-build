import { Link } from "wouter";
import { Wrench } from "lucide-react";

export function Footer() {
  const sections = [
    {
      title: "Calculators",
      links: [
        { href: "/calculators/compression-ratio", label: "Compression Ratio" },
        { href: "/calculators/displacement", label: "Displacement" },
        { href: "/calculators/ring-gap", label: "Piston Ring Gap" },
        { href: "/calculators/cam-duration", label: "Cam Duration" },
        { href: "/calculators/rod-ratio", label: "Rod Ratio" },
        { href: "/calculators/hp-torque", label: "HP / Torque" },
        { href: "/calculators/cam-degreeing", label: "Cam Degreeing" },
      ],
    },
    {
      title: "Reference",
      links: [
        { href: "/engine-data", label: "Engine Data" },
        { href: "/cam-guide", label: "Cam Guide" },
        { href: "/build-advisor", label: "Build Advisor" },
        { href: "/contact", label: "Contact Us" },
      ],
    },
  ];

  return (
    <footer className="bg-[#111111] text-gray-400 border-t border-[#222]">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight text-white hover:text-white/90">
              <Wrench className="w-6 h-6 text-[#E85D04]" />
              <span>Engine-<span className="text-[#E85D04]">build</span>.com</span>
            </Link>
            <p className="text-sm max-w-sm">
              The reference tool for serious engine builders. Displacement, compression, cam specs, ring gap, rod ratio — everything you need to build it right.
            </p>
          </div>
          
          {sections.map((section) => (
            <div key={section.title}>
              <h3 className="text-white font-semibold mb-4">{section.title}</h3>
              <ul className="space-y-2 text-sm">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="hover:text-[#E85D04] transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        <div className="mt-12 pt-8 border-t border-[#222] text-xs text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-4">
          <p>&copy; {new Date().getFullYear()} Engine-build.com. All rights reserved.</p>
          <div className="max-w-xl text-gray-500">
            <p><strong>Disclaimer:</strong> All specifications and calculated values are for reference only. Always verify against factory service manuals before assembly. Engine-build.com is not responsible for engine damage resulting from use of this tool.</p>
          </div>
        </div>

        <div className="mt-4 text-xs text-center text-gray-500 flex justify-center gap-4">
          <Link href="/privacy" className="hover:text-[#E85D04] transition-colors">
            Privacy Policy
          </Link>
          <span className="text-gray-600">|</span>
          <Link href="/terms" className="hover:text-[#E85D04] transition-colors">
            Terms of Service
          </Link>
          <span className="text-gray-600">|</span>
          <Link href="/contact" className="hover:text-[#E85D04] transition-colors">
            Contact
          </Link>
        </div>
      </div>
    </footer>
  );
}
