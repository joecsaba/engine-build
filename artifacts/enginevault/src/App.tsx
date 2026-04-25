import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import { ClerkProvider } from "@clerk/react";
import { BuildContextProvider } from "@/context/BuildContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import NotFound from "@/pages/not-found";
import SignInPage from "@/pages/sign-in";
import SignUpPage from "@/pages/sign-up";
import ComingSoon from "@/pages/coming-soon";

import Home from "@/pages/home";

import CalculatorsIndex from "@/pages/calculators/index";
import DisplacementCalculator from "@/pages/calculators/displacement";
import CompressionRatioCalculator from "@/pages/calculators/compression-ratio";
import RingGapCalculator from "@/pages/calculators/ring-gap";
import CamDurationCalculator from "@/pages/calculators/cam-duration";
import RodRatioCalculator from "@/pages/calculators/rod-ratio";
import HpTorqueCalculator from "@/pages/calculators/hp-torque";
import PistonSpeedCalculator from "@/pages/calculators/piston-speed";
import AfrLambdaCalculator from "@/pages/calculators/afr-lambda";
import QuenchDeckHeightCalculator from "@/pages/calculators/quench-deck-height";
import PushrodLengthCalculator from "@/pages/calculators/pushrod-length";
import PistonToValveCalculator from "@/pages/calculators/piston-to-valve";
import CamDegreeingCalculator from "@/pages/calculators/cam-degreeing";
import ValveSpringCalculator from "@/pages/calculators/valve-spring";
import RingGapAdvancedCalculator from "@/pages/calculators/ring-gap-advanced";

import CamGuide from "@/pages/cam-guide";
import TorqueSpecs from "@/pages/torque-specs";
import Privacy from "@/pages/privacy";
import Terms from "@/pages/terms";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL as string | undefined;

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

function ClerkProviderWithRouter({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey!}
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

        {/* Coming Soon sections (v2) */}
        <Route path="/engine-data" component={TorqueSpecs} />
        <Route path="/torque-specs" component={TorqueSpecs} />
        <Route path="/specs" component={TorqueSpecs} />
        <Route path="/specs/:rest*" component={TorqueSpecs} />
        <Route path="/build-sheets" component={ComingSoon} />
        <Route path="/build-sheets/:rest*" component={ComingSoon} />
        <Route path="/articles" component={ComingSoon} />
        <Route path="/articles/:rest*" component={ComingSoon} />
        <Route path="/sign-in/*?" component={ComingSoon} />
        <Route path="/sign-up/*?" component={ComingSoon} />

        {/* Live calculators */}
        <Route path="/calculators" component={CalculatorsIndex} />
        <Route path="/calculators/displacement" component={DisplacementCalculator} />
        <Route path="/calculators/compression-ratio" component={CompressionRatioCalculator} />
        <Route path="/calculators/ring-gap" component={RingGapAdvancedCalculator} />
        <Route path="/calculators/ring-gap-advanced" component={RingGapAdvancedCalculator} />
        <Route path="/calculators/cam-duration" component={CamDurationCalculator} />
        <Route path="/calculators/rod-ratio" component={RodRatioCalculator} />
        <Route path="/calculators/hp-torque" component={HpTorqueCalculator} />
        <Route path="/calculators/piston-speed" component={PistonSpeedCalculator} />
        <Route path="/calculators/afr-lambda" component={AfrLambdaCalculator} />
        <Route path="/calculators/quench-deck-height" component={QuenchDeckHeightCalculator} />
        <Route path="/calculators/pushrod-length" component={PushrodLengthCalculator} />
        <Route path="/calculators/piston-to-valve" component={PistonToValveCalculator} />
        <Route path="/calculators/cam-degreeing" component={CamDegreeingCalculator} />
        <Route path="/calculators/valve-spring" component={ValveSpringCalculator} />

        <Route path="/cam-guide" component={CamGuide} />

        {/* Legal */}
        <Route path="/privacy" component={Privacy} />
        <Route path="/terms" component={Terms} />

        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function AppInner() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={basePath}>
          {clerkPubKey ? (
            <ClerkProviderWithRouter>
              <BuildContextProvider>
                <Router />
              </BuildContextProvider>
            </ClerkProviderWithRouter>
          ) : (
            <BuildContextProvider>
              <Router />
            </BuildContextProvider>
          )}
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}

export default App;
