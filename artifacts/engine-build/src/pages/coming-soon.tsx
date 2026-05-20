import { Link } from "wouter";
import { Clock, Calculator, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ComingSoon() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="text-center max-w-lg">
        <div className="w-16 h-16 rounded-2xl bg-[#E85D04]/10 flex items-center justify-center mx-auto mb-6">
          <Clock className="w-8 h-8 text-[#E85D04]" />
        </div>
        <h1 className="text-4xl font-bold mb-3">Coming Soon</h1>
        <p className="text-gray-500 text-lg mb-8">
          We're working on this section. In the meantime, our calculators are fully live and ready to use.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/calculators">
            <Button className="bg-[#E85D04] hover:bg-[#d04f00] text-white gap-2">
              <Calculator className="w-4 h-4" />
              Go to Calculators
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
