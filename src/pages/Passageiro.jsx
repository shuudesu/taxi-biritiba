import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, MessageCircle, Navigation, User, Home, Clock, X, LogOut, Zap, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Passageiro() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('home');
  const [taxistas, setTaxistas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [endereco, setEndereco] = useState('');
  const [corridaAtual, setCorridaAtual] = useState(null);
  const [historico, setHistorico] = useState([]);

  const [mensagens, setMensagens] = useState([]);
  const [novaMsg, setNovaMsg] = useState('');
  const chatEndRef = useRef(null);

  const clienteNome = localStorage.getItem('cliente_nome');
  const clienteTelefone = localStorage.getItem('cliente_telefone');

  // INICIALIZAÇÃO E CHECK-UP
  useEffect(() => {
    if (!clienteNome || !clienteTelefone) {
      navigate('/login-cliente');
      return;
    }
    fetchTaxistas();
    fetchHistorico();
    checkCorridaAtiva(); // <-- O CHECK-UP AO ABRIR O APP

    const taxistasSub = supabase.channel('taxistas_channel').on('postgres_changes', { event: '*', schema: 'public', table: 'taxistas' }, () => fetchTaxistas()).subscribe();
    return () => supabase.removeChannel(taxistasSub);
  }, []);

  // O BATIMENTO CARDÍACO (HEARTBEAT)
  useEffect(() => {
    let interval;
    if (corridaAtual && corridaAtual.status === 'pendente') {
      // Envia um sinal de vida a cada 30 segundos
      interval = setInterval(async () => {
        await supabase.from('corridas').update({ ultima_atualizacao: new Date().toISOString() }).eq('id', corridaAtual.id);
      }, 30000); 
    }
    return () => clearInterval(interval);
  }, [corridaAtual]);

  // ESCUTA DA CORRIDA E REALTIME
  useEffect(() => {
    if (!corridaAtual?.id) return;
    
    const corridaSub = supabase.channel('minha_corrida').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'corridas', filter: `id=eq.${corridaAtual.id}` }, async (payload) => {
        if (payload.new.status === 'aceita' && payload.new.taxista_id) {
          const { data: taxistaData } = await supabase.from('taxistas').select('nome, veiculo, placa').eq('id', payload.new.taxista_id).single();
          setCorridaAtual({ ...payload.new, taxistas: taxistaData });
        } 
        else {
          setCorridaAtual(payload.new);
        }

        if (payload.new.status === 'cancelada') {
          // O Ceifador ou o Motorista cancelou
          alert('Sua solicitação foi cancelada ou expirou.');
          setCorridaAtual(null);
        } else if (payload.new.status === 'em_corrida') {
           setMensagens([]); 
        } else if (payload.new.status === 'concluida') {
          alert('Chegou ao seu destino. Obrigado por usar o Ponto Virtual!');
          setCorridaAtual(null);
          fetchHistorico(); 
        }
      }).subscribe();

    return () => supabase.removeChannel(corridaSub);
  }, [corridaAtual?.id]); 

  // ESCUTA DO CHAT
  useEffect(() => {
    if (!corridaAtual?.id) {
      setMensagens([]); 
      return;
    }

    fetchMensagens(corridaAtual.id);

    const chatSub = supabase.channel(`chat_passageiro_${corridaAtual.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens', filter: `corrida_id=eq.${corridaAtual.id}` }, (payload) => {
        setMensagens((prev) => [...prev, payload.new]);
      }).subscribe();
      
    return () => supabase.removeChannel(chatSub);
  }, [corridaAtual?.id]); 

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  // FUNÇÃO DE CHECK-UP AO ABRIR O APP
  async function checkCorridaAtiva() {
    const { data } = await supabase.from('corridas')
      .select('*')
      .eq('passageiro_id', clienteTelefone)
      .in('status', ['pendente', 'aceita', 'buscando', 'em_corrida'])
      .order('criado_em', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      if (data.status === 'pendente') {
        const lastUpdate = new Date(data.ultima_atualizacao).getTime();
        const now = new Date().getTime();
        // Se a corrida está pendente sem sinal de vida há mais de 2 minutos, cancela localmente
        if (now - lastUpdate > 120000) { 
          await supabase.from('corridas').update({ status: 'cancelada' }).eq('id', data.id);
          alert('Seu pedido anterior expirou por inatividade.');
        } else {
          setCorridaAtual(data); // Recupera a corrida ativa
        }
      } else {
        setCorridaAtual(data); // Se já foi aceita, apenas recupera
      }
    }
  }

  async function fetchMensagens(corridaId) {
    const { data } = await supabase.from('mensagens').select('*').eq('corrida_id', corridaId).order('criado_em', { ascending: true });
    if (data) setMensagens(data);
  }

  async function enviarMensagem() {
    if (!novaMsg.trim()) return;
    const textoSalvo = novaMsg;
    setNovaMsg(''); 
    await supabase.from('mensagens').insert({ corrida_id: corridaAtual.id, remetente: 'cliente', texto: textoSalvo });
  }

  async function fetchTaxistas() {
    setLoading(true);
    const { data } = await supabase.from('taxistas').select('*').neq('status', 'offline').order('status', { ascending: false });
    if (data) setTaxistas(data);
    setLoading(false);
  }

  async function fetchHistorico() {
    const { data } = await supabase.from('corridas').select(`*, taxistas (nome)`).eq('passageiro_id', clienteTelefone).order('criado_em', { ascending: false });
    if (data) setHistorico(data);
  }

  async function chamarTodos() {
    if (!endereco.trim()) return alert('Digite o seu endereço de partida!');
    const novaCorrida = { passageiro_id: clienteTelefone, taxista_id: null, origem_endereco: endereco, status: 'pendente', ultima_atualizacao: new Date().toISOString() };
    const { data, error } = await supabase.from('corridas').insert(novaCorrida).select().single();
    if (!error && data) setCorridaAtual(data);
  }

  async function chamarTaxi(taxistaId) {
    if (!endereco.trim()) return alert('Digite o seu endereço de partida!');
    const novaCorrida = { passageiro_id: clienteTelefone, taxista_id: taxistaId, origem_endereco: endereco, status: 'pendente', ultima_atualizacao: new Date().toISOString() };
    const { data, error } = await supabase.from('corridas').insert(novaCorrida).select().single();
    if (!error && data) setCorridaAtual(data);
  }

  async function cancelarPedido() {
    await supabase.from('corridas').update({ status: 'cancelada' }).eq('id', corridaAtual.id);
    setCorridaAtual(null);
  }

  function handleLogout() {
    localStorage.removeItem('cliente_nome');
    localStorage.removeItem('cliente_telefone');
    navigate('/');
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-24 pr-1 relative">
      <div className="flex justify-between items-center mb-6 border-b-4 border-black pb-4 shrink-0 mt-2">
        <div className="flex items-center gap-2">
          <div className="bg-[#4DF0FF] p-2 rounded-full border-2 border-black shadow-[2px_2px_0px_#000]">
            <MapPin size={20} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight leading-none">Ponto Virtual</h1>
            <p className="text-[10px] font-bold text-gray-700 uppercase">Olá, {clienteNome}</p>
          </div>
        </div>
      </div>

      {activeTab === 'home' && (
        <>
          {corridaAtual ? (
            <div className="flex flex-col flex-1 items-center justify-center mt-2">
              
              {corridaAtual.status === 'pendente' && (
                <>
                  <div className="w-24 h-24 border-4 border-black rounded-full flex items-center justify-center mb-4 shadow-[4px_4px_0px_#000] bg-[#FFE600] animate-pulse">
                    <Navigation size={48} strokeWidth={2.5} />
                  </div>
                  <h2 className="text-2xl font-black uppercase tracking-tight text-center mb-6">Aguardando Táxi...</h2>
                </>
              )}

              {corridaAtual.status === 'em_corrida' && (
                <div className="w-full bg-[#A1E636] border-4 border-black rounded-2xl p-8 mb-6 shadow-[4px_4px_0px_#000] flex flex-col items-center">
                  <h2 className="text-3xl font-black uppercase tracking-tight mb-2 text-center">Em Viagem</h2>
                  <p className="font-bold">Aproveite a sua corrida!</p>
                </div>
              )}

              {(corridaAtual.status === 'aceita' || corridaAtual.status === 'buscando') && (
                <div className="w-full flex flex-col flex-1 bg-white border-4 border-black rounded-2xl mb-4 shadow-[4px_4px_0px_#000] overflow-hidden">
                  <div className="bg-[#A1E636] border-b-4 border-black p-3 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-black uppercase leading-none mb-1">Taxista a Caminho</p>
                      <p className="font-black text-lg leading-none">{corridaAtual.taxistas?.nome || 'Motorista'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold">{corridaAtual.taxistas?.veiculo}</p>
                      <p className="text-[10px] font-black bg-white inline-block px-1 rounded border border-black mt-1">{corridaAtual.taxistas?.placa}</p>
                    </div>
                  </div>

                  <div className="flex-1 bg-gray-50 p-3 overflow-y-auto flex flex-col gap-2 min-h-[150px] max-h-[250px]">
                    {mensagens.length === 0 && (
                      <div className="text-center my-auto text-xs font-bold text-gray-400">Combine o valor da busca no chat abaixo. Mensagens não serão salvas.</div>
                    )}
                    {mensagens.map(msg => (
                      <div key={msg.id} className={`max-w-[85%] p-2 rounded-xl border-2 border-black text-sm font-bold shadow-[2px_2px_0px_#000] ${msg.remetente === 'cliente' ? 'bg-[#4DF0FF] self-end rounded-tr-none' : 'bg-white self-start rounded-tl-none'}`}>
                        {msg.texto}
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>

                  <div className="p-2 border-t-4 border-black flex gap-2 bg-white">
                    <input 
                      type="text" 
                      value={novaMsg} 
                      onChange={(e) => setNovaMsg(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && enviarMensagem()}
                      placeholder="Combine o valor aqui..." 
                      className="flex-1 bg-gray-100 border-2 border-black rounded-xl px-3 font-bold text-sm outline-none focus:border-[#4DF0FF]"
                    />
                    <button onClick={enviarMensagem} className="bg-[#FFE600] border-2 border-black p-3 rounded-xl shadow-[2px_2px_0px_#000] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all flex items-center justify-center">
                      <Send size={18} strokeWidth={3} />
                    </button>
                  </div>
                </div>
              )}

              <div className="bg-white border-4 border-black rounded-2xl p-4 w-full shadow-[4px_4px_0px_#000]">
                <p className="text-[10px] font-black uppercase text-gray-500 mb-1">Ponto de Encontro</p>
                <p className="font-bold">{corridaAtual.origem_endereco}</p>
              </div>

              {(corridaAtual.status === 'pendente' || corridaAtual.status === 'aceita' || corridaAtual.status === 'buscando') && (
                <button onClick={cancelarPedido} className="w-full mt-4 bg-[#FF6B6B] border-4 border-black rounded-2xl py-4 font-black flex justify-center items-center gap-2 shadow-[4px_4px_0px_#000] active:translate-y-[4px] active:translate-x-[4px] active:shadow-none transition-all">
                  <X size={24} strokeWidth={3} /> CANCELAR PEDIDO
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="mb-6">
                <label className="font-black uppercase text-xs mb-1 block">Onde você está?</label>
                <div className="relative">
                  <input type="text" value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Ex: Rua do Comércio, 123" className="w-full bg-white border-4 border-black rounded-2xl py-4 px-4 pl-12 font-bold text-lg outline-none focus:border-[#4DF0FF] shadow-[4px_4px_0px_#000] transition-all" />
                  <MapPin size={20} strokeWidth={3} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>

              <button onClick={chamarTodos} className="w-full bg-[#FFE600] border-4 border-black rounded-2xl py-5 mb-8 font-black text-lg flex justify-center items-center gap-2 shadow-[4px_4px_0px_#000] active:translate-y-[4px] active:translate-x-[4px] active:shadow-none transition-all animate-pulse">
                <Zap size={24} strokeWidth={3} /> CHAMAR TODOS OS TÁXIS
              </button>

              <h2 className="text-lg font-black mb-4 uppercase tracking-tight shrink-0">Ou escolha no ponto:</h2>
              
              {loading ? (
                <div className="text-center font-bold text-gray-600 mt-10 animate-pulse">Buscando taxistas...</div>
              ) : taxistas.length === 0 ? (
                <div className="text-center font-bold text-gray-600 mt-10">Nenhum taxista online.</div>
              ) : (
                <div className="flex flex-col gap-5">
                  {taxistas.map((taxista) => (
                    <div key={taxista.id} className={`bg-white border-4 border-black rounded-2xl p-4 transition-all ${taxista.status === 'em_corrida' ? 'opacity-80 bg-gray-50' : 'shadow-[4px_4px_0px_#000]'}`}>
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-14 bg-gray-200 border-2 border-black rounded-full flex justify-center items-center text-3xl shadow-[2px_2px_0px_#000]">🚕</div>
                          <div>
                            <h3 className="font-black text-lg leading-none mb-1">{taxista.nome}</h3>
                            <p className="text-sm font-bold text-gray-600">{taxista.veiculo}</p>
                          </div>
                        </div>
                        {taxista.status === 'livre' ? <span className="text-xs font-black bg-[#A1E636] border-2 border-black px-2 py-1 rounded-full shadow-[2px_2px_0px_#000]">LIVRE</span> : <span className="text-xs font-black bg-gray-300 border-2 border-black px-2 py-1 rounded-full shadow-[2px_2px_0px_#000]">OCUPADO</span>}
                      </div>
                      {taxista.status === 'livre' ? (
                        <button onClick={() => chamarTaxi(taxista.id)} className="w-full bg-[#4DF0FF] border-2 border-black rounded-xl py-3 font-black text-sm shadow-[4px_4px_0px_#000] active:translate-y-[4px] active:translate-x-[4px] active:shadow-none transition-all">CHAMAR ESTE TÁXI</button>
                      ) : (
                        <a href={`https://wa.me/${taxista.telefone}`} target="_blank" rel="noreferrer" className="w-full bg-white border-2 border-black rounded-xl py-3 font-black text-sm flex justify-center items-center gap-2 shadow-[4px_4px_0px_#000] active:translate-y-[4px] active:translate-x-[4px] active:shadow-none transition-all"><MessageCircle size={18} strokeWidth={2.5} /> FALAR NO WHATSAPP</a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {activeTab === 'historico' && (
        <div className="flex flex-col h-full flex-1">
          <h2 className="text-2xl font-black mb-6 uppercase tracking-tight">Suas Corridas</h2>
          {historico.length === 0 ? (
            <div className="text-center font-bold text-gray-600 mt-10">Você ainda não fez nenhuma viagem.</div>
          ) : (
            <div className="flex flex-col gap-4">
              {historico.map(corrida => (
                <div key={corrida.id} className="bg-white border-4 border-black rounded-xl p-4 shadow-[4px_4px_0px_#000]">
                  <div className="flex justify-between mb-2">
                    <span className="font-black uppercase text-sm">Táxi: {corrida.taxistas?.nome || 'Geral'}</span>
                    <span className="font-bold text-green-600">{corrida.status === 'concluida' ? (corrida.valor ? `R$ ${corrida.valor}` : 'Concluída') : corrida.status}</span>
                  </div>
                  <p className="text-xs font-bold text-gray-600">{corrida.origem_endereco}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {activeTab === 'perfil' && (
        <div className="flex flex-col h-full items-center justify-center flex-1">
          <div className="w-24 h-24 bg-[#BFFCC6] border-4 border-black rounded-full flex justify-center items-center mb-6 shadow-[4px_4px_0px_#000]">
            <User size={48} strokeWidth={2.5} />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight">{clienteNome}</h2>
          <p className="text-lg font-bold text-gray-600 mb-10">{clienteTelefone}</p>
          
          <button onClick={handleLogout} className="w-full bg-[#FF6B6B] border-4 border-black rounded-2xl py-4 font-black flex justify-center items-center gap-2 shadow-[4px_4px_0px_#000] active:translate-y-[4px] active:translate-x-[4px] active:shadow-none transition-all">
            <LogOut size={24} strokeWidth={3} /> SAIR DA CONTA
          </button>
        </div>
      )}

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-[380px] bg-white border-4 border-black rounded-2xl flex justify-between px-6 py-3 shadow-[4px_4px_0px_#000] z-40">
        <button onClick={() => setActiveTab('home')} className="flex flex-col items-center gap-1 relative group w-16">
          {activeTab === 'home' && <div className="absolute -inset-1 bg-[#FFE600] rounded-xl -z-10 border-2 border-black"></div>}
          <Home size={24} strokeWidth={2} />
          <span className="text-[10px] font-black uppercase">Início</span>
        </button>
        <button onClick={() => setActiveTab('historico')} className="flex flex-col items-center gap-1 relative group w-16">
          {activeTab === 'historico' && <div className="absolute -inset-1 bg-[#FFE600] rounded-xl -z-10 border-2 border-black"></div>}
          <Clock size={24} strokeWidth={2} />
          <span className="text-[10px] font-black uppercase">Histórico</span>
        </button>
        <button onClick={() => setActiveTab('perfil')} className="flex flex-col items-center gap-1 relative group w-16">
          {activeTab === 'perfil' && <div className="absolute -inset-1 bg-[#FFE600] rounded-xl -z-10 border-2 border-black"></div>}
          <User size={24} strokeWidth={2} />
          <span className="text-[10px] font-black uppercase">Perfil</span>
        </button>
      </div>
    </div>
  );
}