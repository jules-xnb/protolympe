import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

const ComponentsPage = lazy(() => import("./pages/ComponentsPage"));
const WrappersPage = lazy(() => import("./pages/WrappersPage"));

const App = () => (
  <TooltipProvider>
    <Toaster />
    <BrowserRouter>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<Navigate to="/design-system/composants" replace />} />
          <Route path="/design-system/composants" element={<ComponentsPage />} />
          <Route path="/design-system/wrappers" element={<WrappersPage />} />
          <Route path="*" element={<Navigate to="/design-system/composants" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </TooltipProvider>
);

export default App;
