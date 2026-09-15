import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Moon } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="glass-card gold-border p-8 text-center max-w-md w-full shadow-2xl">
        <div className="flex justify-center mb-4">
          <Moon className="w-12 h-12 text-gold animate-pulse-gold" />
        </div>
        <h1 className="text-5xl font-display font-bold text-gold mb-2">404</h1>
        <h2 className="text-xl font-display text-cream mb-2">Aradığınız Sayfa Bulunamadı</h2>
        <p className="text-sm text-cream-muted mb-6">
          Ulaşmaya çalıştığınız sayfa kaldırılmış veya adresi değişmiş olabilir.
        </p>
        <Link
          to="/"
          className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl glass-card gold-border text-sm font-medium text-gold hover:bg-gold/10 transition-colors"
        >
          Ana Sayfaya Dön
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
