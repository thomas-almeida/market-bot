import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import socket from '../lib/socket';
import MetricCard from '../components/MetricCard';

export default function Dashboard() {
  const [metrics, setMetrics] = useState({ sessions: 0, pending: 0, paid: 0, expired: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    fetchMetrics();

    socket.on('payment_success', (data) => {
      setMetrics((prev) => ({
        ...prev,
        pending: Math.max(0, prev.paid - 1),
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
            <Link to="/config" className="text-blue-400 hover:underline">Configuração</Link>
            <Link to="/transactions" className="text-blue-400 hover:underline">Transações</Link>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-12">Carregando métricas...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <MetricCard title="Sessões" value={metrics.sessions} color="blue" />
            <MetricCard title="Pendentes" value={metrics.pending} color="yellow" />
            <MetricCard title="Pagas" value={metrics.paid} color="green" />
            <MetricCard title="Expiradas" value={metrics.expired} color="red" />
            <MetricCard title="Receita" value={`R$ ${metrics.revenue.toFixed(2)}`} color="purple" />
          </div>
        )}
      </div>
    </div>
  );
}
