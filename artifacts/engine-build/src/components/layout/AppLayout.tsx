import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { AdBanner } from "@/components/ads/AdBanner";
import { QuickToolsSidebar } from "@/components/sidebar/QuickToolsSidebar";
import { CookieConsent } from "@/components/CookieConsent";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex flex-col w-full bg-background font-sans print:bg-white">
      <div className="print:hidden">
        <Navbar />
      </div>
      <main className="flex-1 flex flex-col w-full">
        {children}
      </main>
      <div className="print:hidden">
        <div className="bg-white border-t border-gray-100 py-4 px-4">
          <div className="container mx-auto max-w-6xl">
            <AdBanner slot="1111111111" format="horizontal" />
          </div>
        </div>
        <Footer />
      </div>
      <div className="print:hidden">
        <QuickToolsSidebar />
        <CookieConsent />
      </div>
    </div>
  );
}
