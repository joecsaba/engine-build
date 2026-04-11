import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu, Wrench } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function Navbar() {
  const links = [
    { href: "/specs", label: "Specs" },
    { href: "/calculators", label: "Calculators" },
    { href: "/cam-guide", label: "Cam Guide" },
    { href: "/guides", label: "Guides" },
    { href: "/shop-tools", label: "Shop Tools" },
    { href: "/articles", label: "Articles" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-[#1a1a1a] text-white border-b border-[#2a2a2a]">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight text-white hover:text-white/90">
          <Wrench className="w-6 h-6 text-primary" />
          <span>Engine<span className="text-primary">Vault</span></span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
              {link.label}
            </Link>
          ))}
          <Link href="/calculators">
            <Button className="bg-primary hover:bg-primary/90 text-white font-semibold">
              Calculators
            </Button>
          </Link>
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
                <div className="pt-4 mt-4 border-t border-[#2a2a2a]">
                  <Link href="/calculators" className="block w-full">
                    <Button className="w-full bg-primary hover:bg-primary/90 text-white">
                      Calculators
                    </Button>
                  </Link>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
