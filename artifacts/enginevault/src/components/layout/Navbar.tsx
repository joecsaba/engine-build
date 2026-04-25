import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu, Wrench } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function Navbar() {
  const links = [
    { href: "/engine-data", label: "Engine Data" },
    { href: "/calculators", label: "Calculators" },
    { href: "/cam-guide", label: "Cam Guide" },
    { href: "/build-sheets", label: "Build Sheets" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-[#1a1a1a] text-white border-b border-[#2a2a2a]">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight text-white hover:text-white/90">
          <Wrench className="w-6 h-6 text-[#E85D04]" />
          <span>Engine-<span className="text-[#E85D04]">build</span>.com</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Mobile Nav */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-gray-300 hover:text-white hover:bg-white/10">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
              <nav className="flex flex-col gap-4 mt-8">
                {links.map((link) => (
                  <Link key={link.href} href={link.href} className="text-lg font-medium text-gray-300 hover:text-white">
                    {link.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
