import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu, Wrench, LogIn, User, ChevronDown } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/context/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function Navbar() {
  const { isSignedIn, user, signOut } = useAuth();

  const [mobileOpen, setMobileOpen] = useState(false);
  const displayName = user?.name || user?.email || "User";
  const initial = displayName[0]?.toUpperCase();

  const engineDataLinks = [
    { href: "/engine-data", label: "VIN Decoder & Specs" },
    { href: "/calculators/bolt-spec-lookup", label: "Hardware & Bolt Specs" },
  ];

  const links = [
    { href: "/calculators", label: "Calculators" },
    { href: "/shop-directory", label: "Shop Directory" },
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
          {/* Engine Data dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1 text-sm font-medium text-gray-300 hover:text-white transition-colors focus:outline-none">
                Engine Data
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              {engineDataLinks.map((link) => (
                <DropdownMenuItem key={link.href} asChild>
                  <Link href={link.href} className="cursor-pointer">
                    {link.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {links.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
              {link.label}
            </Link>
          ))}

          {isSignedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-[#E85D04] focus:ring-offset-2 focus:ring-offset-[#1a1a1a]">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-[#E85D04] text-white text-xs">
                      {initial ?? <User className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href="/build-sheets/my-builds" className="cursor-pointer">
                    My Builds
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer text-red-500 focus:text-red-500"
                  onClick={() => signOut()}
                >
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/sign-in">
              <Button size="sm" className="bg-[#E85D04] hover:bg-[#E85D04]/90 text-white">
                <LogIn className="w-4 h-4 mr-2" />
                Sign In
              </Button>
            </Link>
          )}
        </nav>

        {/* Mobile Nav */}
        <div className="md:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-gray-300 hover:text-white hover:bg-white/10">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
              <nav className="flex flex-col gap-4 mt-8">
                {/* Engine Data section */}
                <div className="text-lg font-medium text-white">Engine Data</div>
                {engineDataLinks.map((link) => (
                  <Link key={link.href} href={link.href} className="text-base font-medium text-gray-400 hover:text-white pl-4" onClick={() => setMobileOpen(false)}>
                    {link.label}
                  </Link>
                ))}
                <div className="border-t border-[#2a2a2a]" />
                {links.map((link) => (
                  <Link key={link.href} href={link.href} className="text-lg font-medium text-gray-300 hover:text-white" onClick={() => setMobileOpen(false)}>
                    {link.label}
                  </Link>
                ))}

                <div className="border-t border-[#2a2a2a] pt-4 mt-2">
                  {isSignedIn ? (
                    <>
                      <div className="flex items-center gap-3 mb-4">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-[#E85D04] text-white text-xs">
                            {initial ?? <User className="h-4 w-4" />}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-gray-300">{displayName}</span>
                      </div>
                      <Link href="/build-sheets/my-builds" className="text-lg font-medium text-gray-300 hover:text-white block mb-4" onClick={() => setMobileOpen(false)}>
                        My Builds
                      </Link>
                      <button
                        onClick={() => { signOut(); setMobileOpen(false); }}
                        className="text-lg font-medium text-red-400 hover:text-red-300"
                      >
                        Sign Out
                      </button>
                    </>
                  ) : (
                    <Link href="/sign-in" className="text-lg font-medium text-[#E85D04] hover:text-[#E85D04]/80" onClick={() => setMobileOpen(false)}>
                      Sign In
                    </Link>
                  )}
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
