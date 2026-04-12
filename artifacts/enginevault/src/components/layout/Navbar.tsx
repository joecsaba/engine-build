import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu, Wrench, LogIn, LogOut, User } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useUser, useClerk } from "@clerk/react";

function AuthButtons({ mobile = false }: { mobile?: boolean }) {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();

  if (!isLoaded) return null;

  if (user) {
    return (
      <div className={`flex items-center gap-3 ${mobile ? "flex-col items-start" : ""}`}>
        <div className="flex items-center gap-2 text-sm text-gray-300">
          <User className="w-4 h-4 text-[#E85D04]" />
          <span className="truncate max-w-[160px]">
            {user.firstName ?? user.primaryEmailAddress?.emailAddress?.split("@")[0]}
          </span>
        </div>
        <button
          onClick={() => signOut()}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${mobile ? "flex-col items-start" : ""}`}>
      <Link href="/sign-in">
        <button className="flex items-center gap-1 text-sm text-gray-300 hover:text-white transition-colors">
          <LogIn className="w-4 h-4" />
          <span>Sign In</span>
        </button>
      </Link>
      <Link href="/sign-up">
        <Button size="sm" className="bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs">
          Create Account
        </Button>
      </Link>
    </div>
  );
}

export function Navbar() {
  const links = [
    { href: "/specs", label: "Specs" },
    { href: "/calculators", label: "Calculators" },
    { href: "/cam-guide", label: "Cam Guide" },
    { href: "/build-sheets", label: "Build Sheets" },
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
          <Link href="/build-sheets/planner">
            <Button className="bg-primary hover:bg-primary/90 text-white font-semibold">
              Build Planner
            </Button>
          </Link>
          <div className="border-l border-[#2a2a2a] pl-4">
            <AuthButtons />
          </div>
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
                  <Link href="/build-sheets/planner" className="block w-full mb-4">
                    <Button className="w-full bg-primary hover:bg-primary/90 text-white">
                      Build Planner
                    </Button>
                  </Link>
                  <AuthButtons mobile />
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
