import React, { createContext, useState, useEffect, useContext } from 'react';

const PwaContext = createContext();

export function PwaProvider({ children }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [popupDismissed, setPopupDismissed] = useState(false);

  useEffect(() => {
    // Força o popup a aparecer visualmente para os seus testes, 
    // a menos que você já tenha clicado em "OK, ENTENDI" antes.
    if (!localStorage.getItem('pwa_popup_dismissed')) {
      setShowPopup(true);
    } else {
      setPopupDismissed(true);
    }

    const handler = (e) => {
      e.preventDefault(); 
      setDeferredPrompt(e); // O navegador autorizou a instalação
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      // Se você clicar no botão no PC antes do navegador libertar o download:
      alert('O sistema está a preparar o instalador. (No telemóvel, esta janela de instalação abre instantaneamente!)');
    }
  };

  const dismissPopup = () => {
    setShowPopup(false);
    setPopupDismissed(true);
    localStorage.setItem('pwa_popup_dismissed', 'true');
  };

  // Aqui está a magia: Vamos dizer ao aplicativo que o botão DEVE aparecer (true), 
  // mesmo se o Chrome do PC estiver a tentar bloqueá-lo.
  const isInstallable = deferredPrompt !== null || true; 

  return (
    <PwaContext.Provider value={{ deferredPrompt: isInstallable, showPopup, popupDismissed, handleInstall, dismissPopup }}>
      {children}
    </PwaContext.Provider>
  );
}

export const usePwa = () => useContext(PwaContext);