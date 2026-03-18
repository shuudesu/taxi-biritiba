import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Selecao from './pages/Selecao';
import Passageiro from './pages/Passageiro';
import Motorista from './pages/Motorista';
import LoginMotorista from './pages/LoginMotorista';
import LoginCliente from './pages/LoginCliente';
import { PwaProvider } from './PwaContext';

function Layout() {
  return (
    <div className="min-h-screen bg-[#ffb703] p-4 md:p-8 flex justify-center font-sans text-black relative">
      <div className="w-full max-w-md bg-[#fff9ea] rounded-3xl border-4 border-black p-6 shadow-[8px_8px_0px_#000] relative overflow-hidden flex flex-col">
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