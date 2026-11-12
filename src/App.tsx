import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import InstallPrompt from "./components/InstallPrompt";

const Widget = lazy(() => import("./pages/Widget"));

const App = () => (
  <>
    <InstallPrompt />
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/widget" element={<Suspense fallback={null}><Widget /></Suspense>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </>
);

export default App;
