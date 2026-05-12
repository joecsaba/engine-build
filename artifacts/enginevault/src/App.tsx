import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { useEffect } from "react";
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

import BuildSheetsIndex from "@/pages/build-sheets/index";
import BuildPlanner from "@/pages/build-sheets/planner";
import NewBuildPage from "@/pages/build-sheets/new";
import BuildWizardPage from "@/pages/build-sheets/build";
import MyBuildsPage from "@/pages/build-sheets/my-builds";

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
import DynamicCompressionRatioV2 from "@/pages/calculators/dynamic-compression-ratio-v2";
import TorqueExtensionCalculator from "@/pages/calculators/torque-extension";
import HpEstimator from "@/pages/calculators/hp-estimator";
import ValvetrainBuilderCalculator from "@/pages/calculators/valvetrain-builder";
import TurboFinderCalculator from "@/pages/calculators/turbo-finder";
import DieselCompoundTurboCalculator from "@/pages/calculators/diesel-compound-turbo";
import DieselSingleTurboCalculator from "@/pages/calculators/diesel-single-turbo";
import CarbCfmSizingCalculator from "@/pages/calculators/carb-cfm-sizing";
import BearingClearanceCalculator from "@/pages/calculators/bearing-clearance";
import FuelInjectorSizingCalculator from "@/pages/calculators/fuel-injector-sizing";
import HeadFlowCalculator from "@/pages/calculators/head-flow";
import GearRatioCalculator from "@/pages/calculators/gear-ratio";
import DieselLiftPumpCalculator from "@/pages/calculators/diesel-lift-pump";
import DieselEgtDrivePressureCalculator from "@/pages/calculators/diesel-egt-drive-pressure";
import DieselInjectorNozzlePopPressureCalculator from "@/pages/calculators/diesel-injector-nozzle-pop-pressure";
import DieselSmokeLambdaCalculator from "@/pages/calculators/diesel-smoke-lambda";
import ValveShimCalculator from "@/pages/calculators/valve-shim";
import MmInchConverter from "@/pages/calculators/mm-inch-converter";
import DieselValveReliefCalculator from "@/pages/calculators/diesel-valve-relief";
import BoostCompressionCalculator from "@/pages/calculators/boost-compression";
import OctaneMixCalculator from "@/pages/calculators/octane-mix";
import DensityAltitudeCalculator from "@/pages/calculators/density-altitude";
import HeaderSizingCalculator from "@/pages/calculators/header-sizing";
import TorqueConverterStallCalculator from "@/pages/calculators/torque-converter-stall";
import HeadMillingCalculator from "@/pages/calculators/head-milling";

import CategoryShortBlock from "@/pages/calculators/category-short-block";
import CategoryCamValvetrain from "@/pages/calculators/category-cam-valvetrain";
import CategoryPowerFuel from "@/pages/calculators/category-power-fuel";
import CategoryDrivetrainShop from "@/pages/calculators/category-drivetrain-shop";
import CategoryDiesel from "@/pages/calculators/category-diesel";

import CamGuide from "@/pages/cam-guide";
import BuildAdvisor from "@/pages/build-advisor";
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
      <Switch>
        <Route path="/" component={Home} />

        {/* Coming Soon sections (v2) */}
        <Route path="/engine-data" component={TorqueSpecs} />
        <Route path="/torque-specs">{() => { window.location.replace("/engine-data"); return null; }}</Route>
        <Route path="/specs">{() => { window.location.replace("/engine-data"); return null; }}</Route>
        <Route path="/specs/:rest*">{() => { window.location.replace("/engine-data"); return null; }}</Route>
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
        <Route path="/calculators/dynamic-compression-ratio-v2" component={DynamicCompressionRatioV2} />
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
        <Route path="/calculators/diesel-valve-relief" component={DieselValveReliefCalculator} />
        <Route path="/calculators/boost-compression" component={BoostCompressionCalculator} />
        <Route path="/calculators/octane-mix" component={OctaneMixCalculator} />
        <Route path="/calculators/density-altitude" component={DensityAltitudeCalculator} />
        <Route path="/calculators/header-sizing" component={HeaderSizingCalculator} />
        <Route path="/calculators/torque-converter-stall" component={TorqueConverterStallCalculator} />
        <Route path="/calculators/head-milling" component={HeadMillingCalculator} />

        <Route path="/cam-guide" component={CamGuide} />
        <Route path="/build-advisor" component={BuildAdvisor} />

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
          <AuthProvider>
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
