import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import socket from '../lib/socket';
import MetricCard from '../components/MetricCard';

export default function Dashboard() {
  const [metrics, setMetrics] = useState({ sessions: 0, pending: 0, paid: 0, expired: 0, revenue: 0 });
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddBot, setShowAddBot] = useState(false);
  const [newBot, setNewBot] = useState({ name: '', token: '', masterDriveLink: '' });

  const fetchBots = async () => {
    try {
      const { data } = await api.get('/admin/bots');
      setBots(data);
    } catch (err) {
      console.error('Failed to fetch bots:', err);
    }
  };

  const fetchMetrics = async () => {
    try {
      const [transactionsRes, sessionsRes] = await Promise.all([
        api.get('/admin/transactions', { params: { limit: 1000 } }),
        api.get('/admin/sessions'),
      ]);

      const txns = transactionsRes.data.transactions || [];
      const revenue = txns.filter((t) => t.status === 'PAID').reduce((s, t) => s + t.amount, 0);
      const paidCount = txns.filter((t) => t.status === 'PAID').length;
      const pendingCount = txns.filter((t) => t.status === 'PENDING').length;
      const expiredCount = txns.filter((t) => t.status === 'EXPIRED').length;

      setMetrics({
        sessions: sessionsRes.data.sessions?.length || 0,
        pending: pendingCount,
        paid: paidCount,
        expired: expiredCount,
        revenue,
      });
    } catch (err) {
      console.error('Failed to fetch metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBot = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/bots', newBot);
      setNewBot({ name: '', token: '', masterDriveLink: '' });
      setShowAddBot(false);
      fetchBots();
    } catch (err) {
      alert('Erro ao adicionar bot. Verifique o token.');
    }
  };

  const handleDeleteBot = async (botId) => {
    if (!confirm('Tem certeza que deseja remover este bot?')) return;
    try {
      await api.delete(`/admin/bots/${botId}`);
      fetchBots();
    } catch (err) {
      console.error('Failed to delete bot:', err);
    }
  };

  useEffect(() => {
    fetchMetrics();
    fetchBots();

    socket.on('payment_success', (data) => {
      setMetrics((prev) => ({
        ...prev,
        pending: Math.max(0, prev.pending - 1),
        paid: prev.paid + 1,
        revenue: prev.revenue + data.amount,
      }));
    });

    return () => socket.off('payment_success');
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <div className="space-x-3 text-sm">
            <Link to="/transactions" className="text-blue-400 hover:underline">Transações</Link>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-12">Carregando métricas...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-12">
              <MetricCard title="Sessões" value={metrics.sessions} color="blue" />
              <MetricCard title="Pendentes" value={metrics.pending} color="yellow" />
              <MetricCard title="Pagas" value={metrics.paid} color="green" />
              <MetricCard title="Expiradas" value={metrics.expired} color="red" />
              <MetricCard title="Receita" value={`R$ ${metrics.revenue.toFixed(2)}`} color="purple" />
            </div>

            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Meus Bots</h2>
              <button 
                onClick={() => setShowAddBot(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm transition"
              >
                + Novo Bot
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bots.map((bot) => (
                <div key={bot._id} className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-white font-bold">{bot.name}</h3>
                      <p className="text-xs text-gray-400 truncate max-w-[150px]">{bot.token}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold ${bot.active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {bot.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <div className="flex space-x-2 mt-4">
                    <Link 
                      to={`/config/${bot._id}`} 
                      className="flex-1 text-center bg-gray-700 hover:bg-gray-600 text-white py-2 rounded text-sm transition"
                    >
                      Configurar
                    </Link>
                    <button 
                      onClick={() => handleDeleteBot(bot._id)}
                      className="px-3 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded transition"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {showAddBot && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 border border-gray-700 w-full max-w-md p-6 rounded-xl shadow-2xl">
              <h2 className="text-xl font-bold text-white mb-6">Adicionar Novo Bot</h2>
              <form onSubmit={handleAddBot} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Nome do Bot</label>
                  <input 
                    required
                    type="text" 
                    value={newBot.name} 
                    onChange={(e) => setNewBot({...newBot, name: e.target.value})}
                    placeholder="Ex: Bot de Vendas 1"
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Token do Telegram</label>
                  <input 
                    required
                    type="text" 
                    value={newBot.token} 
                    onChange={(e) => setNewBot({...newBot, token: e.target.value})}
                    placeholder="123456789:ABCDEF..."
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Link de Entrega (Master Drive)</label>
                  <input 
                    type="text" 
                    value={newBot.masterDriveLink} 
                    onChange={(e) => setNewBot({...newBot, masterDriveLink: e.target.value})}
                    placeholder="https://drive.google.com/..."
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex space-x-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowAddBot(false)}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded transition"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded transition font-bold"
                  >
                    Criar Bot
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
