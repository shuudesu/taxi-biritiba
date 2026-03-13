import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Power, Car, LogOut, Check, X, MapPin, Flag, Home, DollarSign, User } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Motorista() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('home');
  const [motorista, setMotorista] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Usamos Refs para que o Realtime consiga ler o estado atual sem bugs de atraso
  const [driverState, setDriverState] = useState('offline');
  const driverStateRef = useRef('offline');
  
  const [corridaAtual, setCorridaAtual] = useState(null);
  const corridaAtualRef = useRef(null);
  
  const [valorCorrida, setValorCorrida] = useState(''); 
  const [historico, setHistorico] = useState([]);

  // Função segura para atualizar estados
  function setDriverStateSafe(state) {
    setDriverState(state);
    driverStateRef.current = state;
  }
  function setCorridaAtualSafe(corrida) {
    setCorridaAtual(corrida);
    corridaAtualRef.current = corrida;
  }

  useEffect(() => {
    const driverId = localStorage.getItem('driver_id');
    if (!driverId) {
      navigate('/login-motorista');
      return;
    }
    fetchDriverData(driverId);
    fetchCorridaAtiva(driverId);
    fetchHistorico(driverId);
    
    const canal = setupRealtimeSubscription(driverId);
    return () => { if (canal) supabase.removeChannel(canal); };
  }, []);

  async function fetchDriverData(id) {
    const { data } = await supabase.from('taxistas').select('*').eq('id', id).single();
    if (data) {
      setMotorista(data);
      if (!corridaAtualRef.current && data.status === 'livre') setDriverStateSafe('online');
    }
    setLoading(false);
  }

  async function fetchHistorico(driverId) {
    const { data } = await supabase.from('corridas').select('*').eq('taxista_id', driverId).eq('status', 'concluida').order('criado_em', { ascending: false });
    if (data) setHistorico(data);
  }

  async function fetchCorridaAtiva(driverId) {
    const { data } = await supabase.from('corridas').select('*').eq('taxista_id', driverId).in('status', ['pendente', 'aceita', 'em_corrida']).maybeSingle();
    if (data) {
      setCorridaAtualSafe(data);
      if (data.status === 'pendente') setDriverStateSafe('tocando');
      if (data.status === 'aceita') setDriverStateSafe('buscando');
      if (data.status === 'em_corrida') setDriverStateSafe('em_corrida');
    }
  }

  function setupRealtimeSubscription(driverId) {
    // Removemos o filtro de ID específico para ouvirmos TODAS as corridas
    return supabase.channel(`canal_motorista_${driverId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'corridas' }, (payload) => {
        
        // 1. UMA CORRIDA NOVA FOI PEDIDA (Geral ou Direta)
        if (payload.eventType === 'INSERT' && payload.new.status === 'pendente') {
          const isParaMim = payload.new.taxista_id === driverId;
          const isGeral = payload.new.taxista_id === null;
          const isEstouOnline = driverStateRef.current === 'online';

          // Se for para mim ou geral, E se eu estiver online, a tela pisca amarelo!
          if ((isParaMim || isGeral) && isEstouOnline) {
            setCorridaAtualSafe(payload.new);
            setDriverStateSafe('tocando');
          }
        }
        
        // 2. A CORRIDA ATUAL FOI ATUALIZADA (Alguém aceitou ou o cliente cancelou)
        if (payload.eventType === 'UPDATE' && corridaAtualRef.current && payload.new.id === corridaAtualRef.current.id) {
          
          if (payload.new.status === 'cancelada') {
            alert("O cliente cancelou o pedido.");
            setCorridaAtualSafe(null);
            updateStatus('livre', 'online');
          } 
          // Se for uma chamada geral e outro motorista pegou primeiro
          else if (payload.new.status === 'aceita' && payload.new.taxista_id !== driverId) {
            alert("Esta corrida foi aceita por outro colega. Boa sorte na próxima!");
            setCorridaAtualSafe(null);
            updateStatus('livre', 'online');
          }
        }
      }).subscribe();
  }

  async function updateStatus(newDbStatus, newUiState) {
    if (!motorista) return;
    await supabase.from('taxistas').update({ status: newDbStatus }).eq('id', motorista.id);
    setDriverStateSafe(newUiState);
    setMotorista({ ...motorista, status: newDbStatus });
  }

  function handleLogout() {
    localStorage.removeItem('driver_id');
    navigate('/');
  }

  // LÓGICA ANTI-CLONAGEM DE CORRIDA
  async function aceitarCorrida() {
    // Só atualizamos SE a corrida ainda estiver 'pendente' no banco
    const { data, error } = await supabase
      .from('corridas')
      .update({ status: 'aceita', taxista_id: motorista.id })
      .eq('id', corridaAtualRef.current.id)
      .eq('status', 'pendente')
      .select()
      .single();

    if (error || !data) {
       alert("Ops! Esta corrida já foi pega por outro motorista ou cancelada.");
       setCorridaAtualSafe(null);
       updateStatus('livre', 'online');
       return;
    }

    // Se passou, você venceu a corrida!
    setCorridaAtualSafe(data);
    updateStatus('em_corrida', 'buscando');
  }

  async function recusarCorrida() {
    // Se era uma chamada só pra mim, cancela. Se era geral, só ignora localmente.
    if (corridaAtualRef.current.taxista_id === motorista.id) {
      await supabase.from('corridas').update({ status: 'cancelada' }).eq('id', corridaAtualRef.current.id);
    }
    setCorridaAtualSafe(null);
    updateStatus('livre', 'online');
  }

  async function finalizarCorridaReal() {
    if (!valorCorrida) return alert("Digite o valor da corrida!");
    await supabase.from('corridas').update({ status: 'concluida', valor: parseFloat(valorCorrida) }).eq('id', corridaAtualRef.current.id);
    setCorridaAtualSafe(null);
    setValorCorrida(''); 
    updateStatus('livre', 'online');
    fetchHistorico(motorista.id); 
  }

  // --- MAPAS ---
  function abrirWaze() {
    if (!corridaAtualRef.current?.origem_endereco) return;
    const enderecoFormatado = encodeURIComponent(`${corridaAtualRef.current.origem_endereco}, Biritiba Mirim`);
    window.open(`https://waze.com/ul?q=${enderecoFormatado}`, '_blank');
  }

  function abrirGoogleMaps() {
    if (!corridaAtualRef.current?.origem_endereco) return;
    const enderecoFormatado = encodeURIComponent(`${corridaAtualRef.current.origem_endereco}, Biritiba Mirim`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${enderecoFormatado}`, '_blank');
  }

  const ganhosHoje = historico.reduce((acc, curr) => acc + Number(curr.valor || 0), 0).toFixed(2);

  if (loading) return <div className="p-10 text-center font-bold">Carregando painel...</div>;
  if (!motorista) return null;

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-24 pr-1 relative">
      <div className="flex justify-between items-center mb-6 border-b-4 border-black pb-4 mt-2 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#FF90E8] border-2 border-black rounded-full flex justify-center items-center text-2xl shadow-[2px_2px_0px_#000]">👨🏽‍🦲</div>
          <div>
            <h1 className="text-lg font-black tracking-tight leading-none">{motorista.nome}</h1>
            <p className="text-[10px] font-bold text-gray-600 mt-1 uppercase">Táxi Oficial</p>
          </div>
        </div>
      </div>

      {activeTab === 'home' && (
        <>
          {driverState === 'offline' && (
            <div className="flex flex-col items-center justify-center flex-1 py-8">
              <div className="w-24 h-24 bg-gray-200 border-4 border-black rounded-full flex items-center justify-center mb-6 shadow-[4px_4px_0px_#000]">
                <Power size={48} strokeWidth={3} className="text-gray-500" />
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tight text-center mb-2">Offline</h2>
              <button onClick={() => updateStatus('livre', 'online')} className="w-full mt-8 bg-[#A1E636] border-4 border-black rounded-2xl py-5 font-black text-xl flex justify-center items-center shadow-[4px_4px_0px_#000] active:translate-y-[4px] active:translate-x-[4px] active:shadow-none transition-all">
                FICAR ONLINE
              </button>
            </div>
          )}

          {driverState === 'online' && (
            <div className="flex flex-col flex-1">
              <button onClick={() => updateStatus('offline', 'offline')} className="self-end bg-white border-2 border-black rounded-xl px-4 py-2 font-black text-xs uppercase shadow-[2px_2px_0px_#000] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all mb-4">
                Ficar Offline
              </button>
              <div className="bg-[#4DF0FF] border-4 border-black rounded-3xl p-6 flex flex-col items-center justify-center flex-1 shadow-[4px_4px_0px_#000] relative overflow-hidden">
                <Car size={64} strokeWidth={2} className="mb-4 z-10" />
                <h2 className="text-2xl font-black uppercase tracking-tight text-center z-10">Você está Online!</h2>
                <p className="text-sm font-bold text-gray-800 text-center mt-2 z-10">Aguardando passageiros...</p>
              </div>
            </div>
          )}

          {driverState === 'tocando' && (
            <div className="flex flex-col items-center justify-center flex-1">
              <div className="w-full bg-[#FFE600] border-4 border-black rounded-3xl p-6 shadow-[8px_8px_0px_#000] animate-bounce">
                <div className="bg-black text-yellow-300 text-xs font-black uppercase px-3 py-1 inline-block rounded-full mb-4">
                  {corridaAtualRef.current?.taxista_id === null ? 'CHAMADA GERAL!' : 'NOVA CORRIDA!'}
                </div>
                <h2 className="text-2xl font-black uppercase tracking-tight mb-2">Ponto de Origem:</h2>
                <p className="text-lg font-bold mb-6">{corridaAtualRef.current?.origem_endereco}</p>
                <div className="flex gap-3">
                  <button onClick={recusarCorrida} className="flex-1 bg-[#FF6B6B] border-4 border-black rounded-2xl py-4 flex justify-center items-center shadow-[4px_4px_0px_#000] active:translate-y-[4px] active:translate-x-[4px] active:shadow-none transition-all"><X size={32} strokeWidth={3} /></button>
                  <button onClick={aceitarCorrida} className="flex-[2] bg-[#A1E636] border-4 border-black rounded-2xl py-4 flex justify-center items-center gap-2 font-black text-xl shadow-[4px_4px_0px_#000] active:translate-y-[4px] active:translate-x-[4px] active:shadow-none transition-all"><Check size={28} strokeWidth={3} /> ACEITAR</button>
                </div>
              </div>
            </div>
          )}

          {driverState === 'buscando' && (
            <div className="flex flex-col flex-1">
              <div className="bg-white border-4 border-black rounded-3xl p-5 shadow-[4px_4px_0px_#000] mb-6">
                <h3 className="text-[10px] font-black uppercase text-gray-500 mb-4">A Caminho do Passageiro</h3>
                <div className="flex items-start gap-3 bg-gray-100 p-3 rounded-xl border-2 border-black mb-6">
                  <MapPin size={20} strokeWidth={2.5} className="mt-0.5 shrink-0" />
                  <p className="text-sm font-bold">{corridaAtualRef.current?.origem_endereco}</p>
                </div>
                
                {/* BOTÕES DE GPS LADO A LADO */}
                <div className="flex gap-3">
                  <button onClick={abrirWaze} className="flex-1 bg-[#4DF0FF] border-2 border-black rounded-xl py-3 font-black text-xs shadow-[2px_2px_0px_#000] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all">WAZE</button>
                  <button onClick={abrirGoogleMaps} className="flex-1 bg-[#A1E636] border-2 border-black rounded-xl py-3 font-black text-xs shadow-[2px_2px_0px_#000] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all">MAPS</button>
                </div>
              </div>
              <button onClick={() => setDriverStateSafe('em_corrida')} className="w-full mt-auto bg-[#FFE600] border-4 border-black rounded-2xl py-5 font-black text-lg shadow-[4px_4px_0px_#000] active:translate-y-[4px] active:translate-x-[4px] active:shadow-none transition-all">PASSAGEIRO EMBARCADO</button>
            </div>
          )}

          {driverState === 'em_corrida' && (
            <div className="flex flex-col flex-1 justify-center">
              <div className="bg-[#BFFCC6] border-4 border-black rounded-3xl p-8 flex flex-col items-center text-center shadow-[4px_4px_0px_#000] mb-8">
                <Flag size={40} strokeWidth={2.5} className="mb-4" />
                <h2 className="text-3xl font-black uppercase tracking-tight mb-2">Em Corrida</h2>
                <p className="text-sm font-bold text-gray-800">Siga o trajeto e utilize o seu taxímetro.</p>
              </div>
              <button onClick={() => setDriverStateSafe('finalizando')} className="w-full bg-black text-white border-4 border-black rounded-2xl py-5 font-black text-lg shadow-[4px_4px_0px_#000] active:translate-y-[4px] active:translate-x-[4px] active:shadow-none transition-all">DESTINO CONCLUÍDO</button>
            </div>
          )}

          {driverState === 'finalizando' && (
            <div className="flex flex-col flex-1 justify-center">
              <div className="bg-white border-4 border-black rounded-3xl p-6 shadow-[8px_8px_0px_#000] mb-6 animate-pulse">
                <h2 className="text-2xl font-black uppercase tracking-tight mb-2">Valor Final</h2>
                <p className="text-sm font-bold text-gray-600 mb-4">Insira o valor que o taxímetro marcou:</p>
                <div className="relative mb-6">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-xl">R$</span>
                  <input type="number" value={valorCorrida} onChange={(e) => setValorCorrida(e.target.value)} placeholder="0.00" className="w-full bg-gray-100 border-4 border-black rounded-2xl py-4 px-4 pl-12 font-black text-2xl outline-none focus:border-[#A1E636] transition-all" />
                </div>
                <button onClick={finalizarCorridaReal} className="w-full bg-[#A1E636] border-4 border-black rounded-2xl py-4 font-black text-lg flex justify-center items-center shadow-[4px_4px_0px_#000] active:translate-y-[4px] active:translate-x-[4px] active:shadow-none transition-all">CONFIRMAR E FINALIZAR</button>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'historico' && (
        <div className="flex flex-col h-full flex-1">
          <div className="bg-[#A1E636] border-4 border-black rounded-2xl p-6 shadow-[4px_4px_0px_#000] mb-8">
            <h3 className="text-xs font-black uppercase mb-1">Total de Ganhos</h3>
            <p className="text-4xl font-black">R$ {ganhosHoje}</p>
            <p className="text-[10px] font-bold mt-2 bg-white inline-block px-2 py-1 rounded border-2 border-black">{historico.length} Corridas Concluídas</p>
          </div>
          <h2 className="text-xl font-black mb-4 uppercase tracking-tight">Histórico de Viagens</h2>
          {historico.length === 0 ? (
            <div className="text-center font-bold text-gray-600 mt-5">Nenhum ganho registado.</div>
          ) : (
            <div className="flex flex-col gap-4">
              {historico.map(corrida => (
                <div key={corrida.id} className="bg-white border-4 border-black rounded-xl p-4 shadow-[4px_4px_0px_#000] flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold text-gray-600 mb-1">{corrida.origem_endereco}</p>
                    <span className="text-[10px] font-black uppercase bg-gray-200 px-2 py-0.5 rounded border border-black">Concluída</span>
                  </div>
                  <span className="font-black text-lg">R$ {corrida.valor || '0'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'perfil' && (
        <div className="flex flex-col h-full items-center justify-center flex-1">
          <div className="w-24 h-24 bg-[#FF90E8] border-4 border-black rounded-full flex justify-center items-center mb-6 shadow-[4px_4px_0px_#000]">
            <User size={48} strokeWidth={2.5} />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight">{motorista.nome}</h2>
          <p className="text-lg font-bold text-gray-600 mb-2">{motorista.veiculo}</p>
          <p className="text-sm font-black bg-gray-200 px-3 py-1 rounded-md border-2 border-black mb-10">{motorista.placa}</p>
          
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
          <DollarSign size={24} strokeWidth={2} />
          <span className="text-[10px] font-black uppercase">Ganhos</span>
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