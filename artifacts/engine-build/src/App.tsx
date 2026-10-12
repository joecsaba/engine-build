import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { useEffect, lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthProvider } from "@/context/AuthContext";
import { BuildContextProvider } from "@/context/BuildContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import NotFound from "@/pages/not-found";
import SignInPage from "@/pages/sign-in";
import SignUpPage from "@/pages/sign-up";
import ComingSoon from "@/pages/coming-soon";

import Home from "@/pages/home";

// Engine spec database — /engines and everything under it. Lazy-loaded: these
// pages are the largest route group on the site and most visitors arrive on a
// calculator, so they should not sit in the initial bundle.
const EnginesIndex = lazy(() => import("@/pages/engines/index"));
const EngineFamily = lazy(() => import("@/pages/engines/family"));
const EnginePage = lazy(() => import("@/pages/engines/engine"));
const VehiclesIndex = lazy(() => import("@/pages/vehicles/index"));
const VehicleModel = lazy(() => import("@/pages/vehicles/model"));

// Camshaft spec database — /cams and below. Same lazy treatment as /engines.
const CamsIndex = lazy(() => import("@/pages/cams/index"));
const CamPage = lazy(() => import("@/pages/cams/cam"));

import BuildSheetsIndex from "@/pages/build-sheets/index";
import BuildPlanner from "@/pages/build-sheets/planner";
import NewBuildPage from "@/pages/build-sheets/new";
import BuildWizardPage from "@/pages/build-sheets/build";
import MyBuildsPage from "@/pages/build-sheets/my-builds";

// Calculators are lazy-loaded. All 56 were statically imported, so every visitor
// downloaded every calculator to use one — the bulk of the 821 KB payload. One
// chunk per route means a converter page no longer ships the diesel turbo
// sizing maths.
const CalculatorsIndex = lazy(() => import("@/pages/calculators/index"));
const DisplacementCalculator = lazy(() => import("@/pages/calculators/displacement"));
const CompressionRatioCalculator = lazy(() => import("@/pages/calculators/compression-ratio"));
import RingGapCalculator from "@/pages/calculators/ring-gap";  // formerly ring-gap-advanced; basic deleted 2026-05-28
const CamDurationCalculator = lazy(() => import("@/pages/calculators/cam-duration"));
const CamSelectorCalculator = lazy(() => import("@/pages/calculators/cam-selector"));
const RodRatioCalculator = lazy(() => import("@/pages/calculators/rod-ratio"));
const HpTorqueCalculator = lazy(() => import("@/pages/calculators/hp-torque"));
const PistonSpeedCalculator = lazy(() => import("@/pages/calculators/piston-speed"));
const HeaderSizingCalculator = lazy(() => import("@/pages/calculators/header-sizing"));
const AfrLambdaCalculator = lazy(() => import("@/pages/calculators/afr-lambda"));
const QuenchDeckHeightCalculator = lazy(() => import("@/pages/calculators/quench-deck-height"));
const PushrodLengthCalculator = lazy(() => import("@/pages/calculators/pushrod-length"));
const PistonToValveCalculator = lazy(() => import("@/pages/calculators/piston-to-valve"));
const CamDegreeingCalculator = lazy(() => import("@/pages/calculators/cam-degreeing"));
const ValveSpringCalculator = lazy(() => import("@/pages/calculators/valve-spring"));
const DynamicCompressionRatioV2 = lazy(() => import("@/pages/calculators/dynamic-compression-ratio-v2"));
const TorqueExtensionCalculator = lazy(() => import("@/pages/calculators/torque-extension"));
const HpEstimator = lazy(() => import("@/pages/calculators/hp-estimator"));
const ValvetrainBuilderCalculator = lazy(() => import("@/pages/calculators/valvetrain-builder"));
const TurboFinderCalculator = lazy(() => import("@/pages/calculators/turbo-finder"));
const DieselCompoundTurboCalculator = lazy(() => import("@/pages/calculators/diesel-compound-turbo"));
const DieselSingleTurboCalculator = lazy(() => import("@/pages/calculators/diesel-single-turbo"));
const CarbCfmSizingCalculator = lazy(() => import("@/pages/calculators/carb-cfm-sizing"));
const BearingClearanceCalculator = lazy(() => import("@/pages/calculators/bearing-clearance"));
const FuelInjectorSizingCalculator = lazy(() => import("@/pages/calculators/fuel-injector-sizing"));
const HeadFlowCalculator = lazy(() => import("@/pages/calculators/head-flow"));
const GearRatioCalculator = lazy(() => import("@/pages/calculators/gear-ratio"));
const DieselLiftPumpCalculator = lazy(() => import("@/pages/calculators/diesel-lift-pump"));
const DieselEgtDrivePressureCalculator = lazy(() => import("@/pages/calculators/diesel-egt-drive-pressure"));
const DieselInjectorNozzlePopPressureCalculator = lazy(() => import("@/pages/calculators/diesel-injector-nozzle-pop-pressure"));
const DieselSmokeLambdaCalculator = lazy(() => import("@/pages/calculators/diesel-smoke-lambda"));
const ValveShimCalculator = lazy(() => import("@/pages/calculators/valve-shim"));
const MmInchConverter = lazy(() => import("@/pages/calculators/mm-inch-converter"));
const WrenchSizeConverter = lazy(() => import("@/pages/calculators/wrench-size-converter"));
const DieselValveReliefCalculator = lazy(() => import("@/pages/calculators/diesel-valve-relief"));
const IntakeManifoldMillingCalculator = lazy(() => import("@/pages/calculators/intake-manifold-milling"));
const HeadMillingCalculator = lazy(() => import("@/pages/calculators/head-milling"));
const BoostCompressionCalculator = lazy(() => import("@/pages/calculators/boost-compression"));
const OctaneMixCalculator = lazy(() => import("@/pages/calculators/octane-mix"));
const DensityAltitudeCalculator = lazy(() => import("@/pages/calculators/density-altitude"));
const TorqueConverterStallCalculator = lazy(() => import("@/pages/calculators/torque-converter-stall"));
const IgnitionTimingCurveCalculator = lazy(() => import("@/pages/calculators/ignition-timing-curve"));
const BoltSpecLookup = lazy(() => import("@/pages/calculators/bolt-spec-lookup"));
const DecimalFractionInchConverter = lazy(() => import("@/pages/calculators/decimal-fraction-inch"));
const TapDrillLookup = lazy(() => import("@/pages/calculators/tap-drill-lookup"));
const ThreadPitchConverter = lazy(() => import("@/pages/calculators/thread-pitch-converter"));
const TorqueUnitsConverter = lazy(() => import("@/pages/calculators/torque-units-converter"));
const PressureConverter = lazy(() => import("@/pages/calculators/pressure-converter"));
const CcCiConverter = lazy(() => import("@/pages/calculators/cc-ci-converter"));
const TemperatureConverter = lazy(() => import("@/pages/calculators/temperature-converter"));
const AnFittingSize = lazy(() => import("@/pages/calculators/an-fitting-size"));

const CategoryShortBlock = lazy(() => import("@/pages/calculators/category-short-block"));
const CategoryCamValvetrain = lazy(() => import("@/pages/calculators/category-cam-valvetrain"));
const CategoryPowerFuel = lazy(() => import("@/pages/calculators/category-power-fuel"));
const CategoryDrivetrainShop = lazy(() => import("@/pages/calculators/category-drivetrain-shop"));
const CategoryDiesel = lazy(() => import("@/pages/calculators/category-diesel"));

import CamGuide from "@/pages/cam-guide";
import BuildAdvisor from "@/pages/build-advisor";
import TorqueSpecs from "@/pages/torque-specs";
import Privacy from "@/pages/privacy";
import Terms from "@/pages/terms";
import Contact from "@/pages/contact";
import ShopDirectory from "@/pages/shop-tools/directory";
import AdminModeration from "@/pages/admin/moderation";
import SettingsPage from "@/pages/settings";
import MyDashboard from "@/pages/me";
import FaqPage from "@/pages/faq";
import GuidesIndex from "@/pages/guides/index";
import GuideBearingClearance from "@/pages/guides/bearing-clearance";
import GuideRingGap from "@/pages/guides/ring-gap";
import GuideBreakIn from "@/pages/guides/break-in";
import GuideDegreeCam from "@/pages/guides/degree-cam";
import GuideMachineShopQuality from "@/pages/guides/machine-shop-quality";
import GuideBlueprinting from "@/pages/guides/blueprinting";

import { setBaseUrl } from "@workspace/api-client-react";
import { AuthBridge } from "@/components/AuthBridge";
import { RecentTracker } from "@/components/calculators/RecentTracker";

// Point the api-client-react at the API Gateway
setBaseUrl("https://uzgrsju1d1.execute-api.us-east-1.amazonaws.com");

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);
  return null;
}

function Router() {
  return (
    <AppLayout>
      <ScrollToTop />
      <RecentTracker />
      <Suspense fallback={<div className="container mx-auto py-16 px-4 text-center text-muted-foreground">Loading…</div>}>
      <Switch>
        <Route path="/" component={Home} />

        {/* Coming Soon sections (v2) */}
        <Route path="/engine-data" component={TorqueSpecs} />

        {/* Engine spec database. Ordered most-specific-first: wouter matches in
            order, so /engines/:mfr would otherwise swallow the deeper routes. */}
        <Route path="/engines/:mfr/:family/:engine" component={EnginePage} />
        <Route path="/engines/:mfr/:family" component={EngineFamily} />
        <Route path="/engines/:mfr" component={EnginesIndex} />
        <Route path="/engines" component={EnginesIndex} />
        <Route path="/vehicles/:make/:model" component={VehicleModel} />
        <Route path="/vehicles/:make" component={VehiclesIndex} />
        <Route path="/vehicles" component={VehiclesIndex} />

        {/* Camshaft database. Most specific first, same as /engines. */}
        <Route path="/cams/:mfr/:part" component={CamPage} />
        <Route path="/cams/:mfr" component={CamsIndex} />
        <Route path="/cams" component={CamsIndex} />
        {/* /torque-specs, /specs, /specs/* redirected to /engine-data by CloudFront Function */}
        {/* Build Sheets — guided engine build wizard */}
        <Route path="/build-sheets" component={BuildSheetsIndex} />
        <Route path="/build-sheets/new" component={NewBuildPage} />
        <Route path="/build-sheets/build/:buildId" component={BuildWizardPage} />
        <Route path="/build-sheets/my-builds" component={MyBuildsPage} />
        <Route path="/build-sheets/planner" component={BuildPlanner} />
        <Route path="/build-sheets/record" component={ComingSoon} />
        <Route path="/articles" component={ComingSoon} />
        <Route path="/articles/:rest*" component={ComingSoon} />
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />

        {/* Live calculators */}
        <Route path="/calculators" component={CalculatorsIndex} />
        <Route path="/calculators/short-block" component={CategoryShortBlock} />
        <Route path="/calculators/cam-valvetrain" component={CategoryCamValvetrain} />
        <Route path="/calculators/power-fuel" component={CategoryPowerFuel} />
        <Route path="/calculators/drivetrain-shop" component={CategoryDrivetrainShop} />
        <Route path="/calculators/diesel" component={CategoryDiesel} />
        <Route path="/calculators/displacement" component={DisplacementCalculator} />
        <Route path="/calculators/compression-ratio" component={DynamicCompressionRatioV2} />
        <Route path="/calculators/ring-gap" component={RingGapCalculator} />
        {/* /calculators/ring-gap-advanced -> /calculators/ring-gap, 301 in cf-function-redirect.js */}
        <Route path="/calculators/cam-duration" component={CamDurationCalculator} />
        <Route path="/calculators/cam-selector" component={CamSelectorCalculator} />
        <Route path="/calculators/rod-ratio" component={RodRatioCalculator} />
        <Route path="/calculators/hp-torque" component={HpTorqueCalculator} />
        <Route path="/calculators/piston-speed" component={PistonSpeedCalculator} />
        <Route path="/calculators/header-sizing" component={HeaderSizingCalculator} />
        <Route path="/calculators/afr-lambda" component={AfrLambdaCalculator} />
        <Route path="/calculators/quench-deck-height" component={QuenchDeckHeightCalculator} />
        <Route path="/calculators/pushrod-length" component={PushrodLengthCalculator} />
        <Route path="/calculators/piston-to-valve" component={PistonToValveCalculator} />
        <Route path="/calculators/cam-degreeing" component={CamDegreeingCalculator} />
        <Route path="/calculators/valve-spring" component={ValveSpringCalculator} />
        {/* /calculators/dynamic-compression-ratio-v2 redirected to /calculators/compression-ratio by CloudFront Function */}
        <Route path="/calculators/torque-extension" component={TorqueExtensionCalculator} />
        <Route path="/calculators/hp-estimator" component={HpEstimator} />
        <Route path="/calculators/valvetrain-builder" component={ValvetrainBuilderCalculator} />
        <Route path="/calculators/turbo-finder" component={TurboFinderCalculator} />
        <Route path="/calculators/diesel-compound-turbo" component={DieselCompoundTurboCalculator} />
        <Route path="/calculators/diesel-single-turbo" component={DieselSingleTurboCalculator} />
        <Route path="/calculators/carb-cfm-sizing" component={CarbCfmSizingCalculator} />
        <Route path="/calculators/bearing-clearance" component={BearingClearanceCalculator} />
        <Route path="/calculators/fuel-injector-sizing" component={FuelInjectorSizingCalculator} />
        <Route path="/calculators/head-flow" component={HeadFlowCalculator} />
        <Route path="/calculators/gear-ratio" component={GearRatioCalculator} />
        <Route path="/calculators/diesel-lift-pump" component={DieselLiftPumpCalculator} />
        <Route path="/calculators/diesel-egt-drive-pressure" component={DieselEgtDrivePressureCalculator} />
        <Route path="/calculators/diesel-injector-nozzle-pop-pressure" component={DieselInjectorNozzlePopPressureCalculator} />
        <Route path="/calculators/diesel-smoke-lambda" component={DieselSmokeLambdaCalculator} />
        <Route path="/calculators/valve-shim" component={ValveShimCalculator} />
        <Route path="/calculators/mm-inch-converter" component={MmInchConverter} />
        <Route path="/calculators/wrench-size-converter" component={WrenchSizeConverter} />
        <Route path="/calculators/diesel-valve-relief" component={DieselValveReliefCalculator} />
        <Route path="/calculators/intake-manifold-milling" component={IntakeManifoldMillingCalculator} />
        <Route path="/calculators/head-milling" component={HeadMillingCalculator} />
        <Route path="/calculators/ignition-timing-curve" component={IgnitionTimingCurveCalculator} />
        <Route path="/calculators/bolt-spec-lookup" component={BoltSpecLookup} />
        <Route path="/calculators/boost-compression" component={BoostCompressionCalculator} />
        <Route path="/calculators/octane-mix" component={OctaneMixCalculator} />
        <Route path="/calculators/density-altitude" component={DensityAltitudeCalculator} />
        <Route path="/calculators/torque-converter-stall" component={TorqueConverterStallCalculator} />
        <Route path="/calculators/decimal-fraction-inch" component={DecimalFractionInchConverter} />
        <Route path="/calculators/tap-drill-lookup" component={TapDrillLookup} />
        <Route path="/calculators/thread-pitch-converter" component={ThreadPitchConverter} />
        <Route path="/calculators/torque-units-converter" component={TorqueUnitsConverter} />
        <Route path="/calculators/pressure-converter" component={PressureConverter} />
        <Route path="/calculators/cc-ci-converter" component={CcCiConverter} />
        <Route path="/calculators/temperature-converter" component={TemperatureConverter} />
        <Route path="/calculators/an-fitting-size" component={AnFittingSize} />

        <Route path="/cam-guide" component={CamGuide} />
        <Route path="/build-advisor" component={BuildAdvisor} />

        {/* Legal & Info */}
        <Route path="/privacy" component={Privacy} />
        <Route path="/terms" component={Terms} />
        <Route path="/contact" component={Contact} />
        <Route path="/shop-directory" component={ShopDirectory} />
        <Route path="/shop-tools/directory" component={ShopDirectory} />
        <Route path="/admin/moderation" component={AdminModeration} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/me" component={MyDashboard} />

        <Route path="/guides" component={GuidesIndex} />
        <Route path="/guides/bearing-clearance" component={GuideBearingClearance} />
        <Route path="/guides/ring-gap" component={GuideRingGap} />
        <Route path="/guides/break-in" component={GuideBreakIn} />
        <Route path="/guides/degree-cam" component={GuideDegreeCam} />
        <Route path="/guides/machine-shop-quality" component={GuideMachineShopQuality} />
        <Route path="/guides/blueprinting" component={GuideBlueprinting} />
        <Route path="/faq" component={FaqPage} />

        <Route component={NotFound} />
      </Switch>
      </Suspense>
    </AppLayout>
  );
}

function AppInner() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={basePath}>
          <AuthProvider>
            <AuthBridge />
            <BuildContextProvider>
              <Router />
            </BuildContextProvider>
          </AuthProvider>
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
