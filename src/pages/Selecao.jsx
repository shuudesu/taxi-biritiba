import { useNavigate } from 'react-router-dom';
import { Car, User, Navigation, Download } from 'lucide-react';
import { usePwa } from '../PwaContext'; 

export default function Selecao() {
  const navigate = useNavigate();
  const { deferredPrompt, showPopup, popupDismissed, handleInstall, dismissPopup } = usePwa();

  return (
    <div className="flex flex-col items-center justify-center h-full flex-1 py-10 relative">
      
      {showPopup && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 rounded-2xl backdrop-blur-sm px-4">
          <div className="bg-white border-4 border-black p-6 rounded-3xl shadow-[8px_8px_0px_#000] w-full flex flex-col items-center text-center animate-bounce-short">
            <div className="w-16 h-16 bg-[#A1E636] border-4 border-black rounded-full flex justify-center items-center mb-4 shadow-[4px_4px_0px_#000]">
              <Download size={32} strokeWidth={3} />
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tight mb-2">Instale o App!</h2>
            <p className="text-sm font-bold text-gray-700 mb-6">Para chamar o seu táxi mais rápido e sem precisar abrir o navegador, instale o Ponto Virtual no seu celular.</p>
            <button 
              onClick={dismissPopup}
              className="w-full bg-[#FFE600] border-4 border-black rounded-xl py-4 font-black text-lg shadow-[4px_4px_0px_#000] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all"
            >
              OK, ENTENDI
            </button>
          </div>
        </div>
      )}

      <div className="bg-[#FFE600] border-4 border-black p-5 rounded-3xl shadow-[4px_4px_0px_#000] mb-8">
        <Navigation size={56} strokeWidth={2.5} className="text-black" />
      </div>
      
      <h1 className="text-3xl font-black uppercase tracking-tight mb-2 text-center">Ponto Virtual</h1>
      <p className="text-sm font-bold text-gray-700 mb-12 text-center">Biritiba Mirim - Escolha o seu perfil</p>

      <div className="w-full flex flex-col gap-5">
        
        {popupDismissed && deferredPrompt && (
          <button 
            onClick={handleInstall}
            className="w-full bg-[#A1E636] border-4 border-black rounded-2xl py-5 font-black text-lg flex justify-center items-center gap-3 shadow-[4px_4px_0px_#000] active:translate-y-[4px] active:translate-x-[4px] active:shadow-none transition-all cursor-pointer animate-pulse"
          >
            <Download size={28} strokeWidth={3} />
            DOWNLOAD DO APP AQUI
          </button>
        )}

        <button 
          onClick={() => navigate('/login-cliente')}
          className="w-full bg-[#BFFCC6] border-4 border-black rounded-2xl py-5 font-black text-xl flex justify-center items-center gap-3 shadow-[4px_4px_0px_#000] active:translate-y-[4px] active:translate-x-[4px] active:shadow-none transition-all cursor-pointer"
        >
          <User size={28} strokeWidth={3} />
          SOU CLIENTE
        </button>

        <button 
          onClick={() => navigate('/login-motorista')}
          className="w-full bg-[#4DF0FF] border-4 border-black rounded-2xl py-5 font-black text-xl flex justify-center items-center gap-3 shadow-[4px_4px_0px_#000] active:translate-y-[4px] active:translate-x-[4px] active:shadow-none transition-all cursor-pointer"
        >
          <Car size={28} strokeWidth={3} />
          SOU TAXISTA
        </button>
      </div>
    </div>
  );
}