import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, User, Lock, UserPlus, LogIn } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function LoginCliente() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true); 
  
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!telefone || !senha) return alert('Preencha o telefone e a senha!');
    if (!isLogin && !nome) return alert('Preencha o seu nome para criar a conta!');
    
    setLoading(true);

    if (isLogin) {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('telefone', telefone)
        .eq('senha', senha)
        .single();

      if (error || !data) {
        alert('Dados incorretos! Verifique o telefone e a senha.');
        setLoading(false);
        return;
      }

      localStorage.setItem('cliente_nome', data.nome);
      localStorage.setItem('cliente_telefone', data.telefone);
      navigate('/cliente');

    } else {
      const { data, error } = await supabase
        .from('clientes')
        .insert([{ nome, telefone, senha }])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { 
            alert('Este telefone já está cadastrado! Vá para a tela de Login.');
        } else {
            alert('Erro ao criar conta. Tente novamente.');
        }
        setLoading(false);
        return;
      }

      localStorage.setItem('cliente_nome', data.nome);
      localStorage.setItem('cliente_telefone', data.telefone);
      alert('Conta criada com sucesso!');
      navigate('/cliente');
    }
  }

  return (
    <div className="flex flex-col h-full flex-1 overflow-y-auto pb-6">
      <div className="flex items-center gap-4 mb-6 border-b-4 border-black pb-4 mt-2 shrink-0">
        <button onClick={() => navigate('/')} className="bg-white p-2 rounded-xl border-4 border-black shadow-[2px_2px_0px_#000] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all">
          <ArrowLeft size={24} strokeWidth={3} />
        </button>
        <h1 className="text-xl font-black uppercase tracking-tight">
          {isLogin ? 'Acesso Cliente' : 'Nova Conta'}
        </h1>
      </div>

      <div className="flex flex-col flex-1">
        <div className="w-20 h-20 bg-[#BFFCC6] border-4 border-black rounded-full flex justify-center items-center mb-6 shadow-[4px_4px_0px_#000] mx-auto transition-all shrink-0">
          {isLogin ? <LogIn size={36} strokeWidth={2.5} /> : <UserPlus size={36} strokeWidth={2.5} />}
        </div>
        
        <div className="flex bg-white border-4 border-black rounded-xl p-1 mb-6 shadow-[4px_4px_0px_#000] shrink-0">
          <button 
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 font-black uppercase text-xs rounded-lg transition-all ${isLogin ? 'bg-[#FFE600] border-2 border-black' : 'text-gray-500'}`}
          >
            Fazer Login
          </button>
          <button 
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2 font-black uppercase text-xs rounded-lg transition-all ${!isLogin ? 'bg-[#A1E636] border-2 border-black' : 'text-gray-500'}`}
          >
            Criar Conta
          </button>
        </div>

        {!isLogin && (
          <div className="mb-4 shrink-0">
            <label className="font-black uppercase text-xs mb-1 block">Como gostaria de ser chamado?</label>
            <div className="relative">
              <input 
                type="text" 
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Seu Nome"
                className="w-full bg-white border-4 border-black rounded-2xl py-4 px-4 pl-12 font-black text-lg outline-none focus:border-[#BFFCC6] transition-all"
              />
              <User size={20} strokeWidth={3} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </div>
        )}

        <div className="mb-4 shrink-0">
          <label className="font-black uppercase text-xs mb-1 block">Seu WhatsApp</label>
          <input 
            type="number" 
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="5511999999999"
            className="w-full bg-white border-4 border-black rounded-2xl py-4 px-4 font-black text-lg outline-none focus:border-[#BFFCC6] shadow-[4px_4px_0px_#000] transition-all"
          />
        </div>

        <div className="mb-4 shrink-0">
          <label className="font-black uppercase text-xs mb-1 block">Sua Senha</label>
          <div className="relative">
            <input 
              type="password" 
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-white border-4 border-black rounded-2xl py-4 px-4 pl-12 font-black text-xl outline-none focus:border-[#BFFCC6] shadow-[4px_4px_0px_#000] transition-all"
            />
            <Lock size={20} strokeWidth={3} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
        </div>

        <button 
          onClick={handleSubmit}
          disabled={loading}
          className="w-full mt-8 mb-6 bg-[#FFE600] border-4 border-black rounded-2xl py-5 font-black text-xl flex justify-center items-center gap-3 shadow-[4px_4px_0px_#000] active:translate-y-[4px] active:translate-x-[4px] active:shadow-none transition-all disabled:opacity-50 shrink-0"
        >
          {loading ? 'PROCESSANDO...' : (isLogin ? 'ENTRAR' : 'FINALIZAR CADASTRO')}
          {!loading && <ArrowRight size={24} strokeWidth={3} />}
        </button>
      </div>
    </div>
  );
}