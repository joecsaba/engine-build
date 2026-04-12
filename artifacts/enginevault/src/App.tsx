import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import { ClerkProvider } from "@clerk/react";
import { BuildContextProvider } from "@/context/BuildContext";
import NotFound from "@/pages/not-found";
import SignInPage from "@/pages/sign-in";
import SignUpPage from "@/pages/sign-up";

import Home from "@/pages/home";

import SpecsIndex from "@/pages/specs/index";
import EngineFamily from "@/pages/specs/family";
import EngineDetail from "@/pages/specs/engine";

import CalculatorsIndex from "@/pages/calculators/index";
import DisplacementCalculator from "@/pages/calculators/displacement";
import CompressionRatioCalculator from "@/pages/calculators/compression-ratio";
import RingGapCalculator from "@/pages/calculators/ring-gap";
import CamDurationCalculator from "@/pages/calculators/cam-duration";
import RodRatioCalculator from "@/pages/calculators/rod-ratio";
import HpTorqueCalculator from "@/pages/calculators/hp-torque";
import BuildCostCalculator from "@/pages/calculators/build-cost";
import PistonSpeedCalculator from "@/pages/calculators/piston-speed";

import CamGuide from "@/pages/cam-guide";
import TorqueSpecs from "@/pages/torque-specs";

import BuildSheetsIndex from "@/pages/build-sheets/index";
import BuildPlanner from "@/pages/build-sheets/planner";
import BuildSheet from "@/pages/shop-tools/build-sheet";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

function ClerkProviderWithRouter({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey ?? ""}
      proxyUrl={clerkProxyUrl}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      {children}
    </ClerkProvider>
  );
}

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Home} />

        <Route path="/specs" component={SpecsIndex} />
        <Route path="/specs/:slug" component={EngineFamily} />
        <Route path="/specs/:slug/:id" component={EngineDetail} />

        <Route path="/calculators" component={CalculatorsIndex} />
        <Route path="/calculators/displacement" component={DisplacementCalculator} />
        <Route path="/calculators/compression-ratio" component={CompressionRatioCalculator} />
        <Route path="/calculators/ring-gap" component={RingGapCalculator} />
        <Route path="/calculators/cam-duration" component={CamDurationCalculator} />
        <Route path="/calculators/rod-ratio" component={RodRatioCalculator} />
        <Route path="/calculators/hp-torque" component={HpTorqueCalculator} />
        <Route path="/calculators/build-cost" component={BuildCostCalculator} />
        <Route path="/calculators/piston-speed" component={PistonSpeedCalculator} />

        <Route path="/cam-guide" component={CamGuide} />
        <Route path="/torque-specs" component={TorqueSpecs} />

        <Route path="/build-sheets" component={BuildSheetsIndex} />
        <Route path="/build-sheets/planner" component={BuildPlanner} />
        <Route path="/build-sheets/record" component={BuildSheet} />

        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />

        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={basePath}>
          <ClerkProviderWithRouter>
            <BuildContextProvider>
              <Router />
            </BuildContextProvider>
          </ClerkProviderWithRouter>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
