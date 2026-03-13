import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Car, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function LoginMotorista() {
  const navigate = useNavigate();
  const [telefone, setTelefone] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!telefone || !pin) return alert('Preencha o telefone e o PIN!');
    setLoading(true);

    // Query de Autenticação
    const { data, error } = await supabase
      .from('taxistas')
      .select('id, nome, status')
      .eq('telefone', telefone)
      .eq('pin', pin)
      .single();

    if (error || !data) {
      alert('Credenciais inválidas. Verifique o telefone e o PIN.');
      setLoading(false);
      return;
    }

    // Salva a sessão localmente (Em apps maiores, usaríamos Supabase Auth/JWT)
    localStorage.setItem('driver_id', data.id);
    navigate('/motorista');
  }

  return (
    <div className="flex flex-col h-full flex-1">
      <div className="flex items-center gap-4 mb-8 border-b-4 border-black pb-4 mt-2">
        <button onClick={() => navigate('/')} className="bg-white p-2 rounded-xl border-4 border-black shadow-[2px_2px_0px_#000] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all">
          <ArrowLeft size={24} strokeWidth={3} />
        </button>
        <h1 className="text-xl font-black uppercase tracking-tight">Acesso Taxista</h1>
      </div>

      <div className="flex flex-col flex-1">
        <div className="w-20 h-20 bg-[#4DF0FF] border-4 border-black rounded-full flex justify-center items-center mb-6 shadow-[4px_4px_0px_#000] mx-auto">
          <Car size={40} strokeWidth={2.5} />
        </div>
        
        <div className="mb-4">
          <label className="font-black uppercase text-xs mb-1 block">Seu Telefone</label>
          <input 
            type="number" 
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="5511999999999"
            className="w-full bg-white border-4 border-black rounded-2xl py-4 px-4 font-black text-lg outline-none focus:border-[#4DF0FF] shadow-[4px_4px_0px_#000] transition-all"
          />
        </div>

        <div className="mb-8">
          <label className="font-black uppercase text-xs mb-1 block">PIN de Acesso</label>
          <div className="relative">
            <input 
              type="password" 
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              maxLength={6}
              className="w-full bg-white border-4 border-black rounded-2xl py-4 px-4 pl-12 font-black text-xl outline-none focus:border-[#4DF0FF] shadow-[4px_4px_0px_#000] transition-all tracking-widest"
            />
            <Lock size={20} strokeWidth={3} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
        </div>

        <button 
          onClick={handleLogin}
          disabled={loading}
          className="w-full mt-auto mb-6 bg-[#FFE600] border-4 border-black rounded-2xl py-5 font-black text-xl flex justify-center items-center gap-3 shadow-[4px_4px_0px_#000] active:translate-y-[4px] active:translate-x-[4px] active:shadow-none transition-all disabled:opacity-50"
        >
          {loading ? 'AUTENTICANDO...' : 'ENTRAR NO PAINEL'}
          {!loading && <ArrowRight size={24} strokeWidth={3} />}
        </button>
      </div>
    </div>
  );
}