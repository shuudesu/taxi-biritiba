import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Download } from 'lucide-react';
import Selecao from './pages/Selecao';
import Passageiro from './pages/Passageiro';
import Motorista from './pages/Motorista';
import LoginMotorista from './pages/LoginMotorista';
import LoginCliente from './pages/LoginCliente';
import { PwaProvider, usePwa } from './PwaContext';

function Layout() {
  const location = useLocation();
  const { deferredPrompt, handleInstall } = usePwa();

  return (
    <div className="min-h-screen bg-[#ffb703] p-4 md:p-8 flex justify-center font-sans text-black relative">
      <div className="w-full max-w-md bg-[#fff9ea] rounded-3xl border-4 border-black p-6 shadow-[8px_8px_0px_#000] relative overflow-hidden flex flex-col">
        
        {/* Lógica corrigida: Esconde na Home e em qualquer rota que tenha "login" */}
        {location.pathname !== '/' && !location.pathname.includes('login') && deferredPrompt && (
          <button 
            onClick={handleInstall}
            className="absolute bottom-24 right-6 bg-[#A1E636] border-4 border-black rounded-full p-4 shadow-[4px_4px_0px_#000] z-50 flex flex-col items-center justify-center active:translate-y-[4px] active:translate-x-[4px] active:shadow-none transition-all animate-bounce"
            title="Baixar App"
          >
            <Download size={24} strokeWidth={3} />
          </button>
        )}

        <Routes>
          <Route path="/" element={<Selecao />} />
          <Route path="/login-cliente" element={<LoginCliente />} />
          <Route path="/cliente" element={<Passageiro />} />
          <Route path="/login-motorista" element={<LoginMotorista />} />
          <Route path="/motorista" element={<Motorista />} />
        </Routes>

      </div>
    </div>
  );
}

export default function App() {
  return (
    <PwaProvider>
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    </PwaProvider>
  );
}