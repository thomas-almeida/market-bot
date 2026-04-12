import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import socket from '../lib/socket';
import TransactionTable from '../components/TransactionTable';

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const loadTransactions = async () => {
    try {
      const params = { limit: 100 };
      if (filter) params.status = filter;
      const { data } = await api.get('/admin/transactions', { params });
      setTransactions(data.transactions || []);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();

    socket.emit('join_admin');
    socket.on('payment_success', () => {
      loadTransactions();
    });

    return () => {
      socket.off('payment_success');
    };
  }, [filter]);

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-white">Transações</h1>
          <div className="space-x-3 text-sm">
            <Link to="/" className="text-blue-400 hover:underline">Dashboard</Link>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setFilter('')} className={`text-sm px-4 py-1.5 rounded transition ${!filter ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:opacity-80'}`}>
            Todos
          </button>
          <button onClick={() => setFilter('PENDING')} className={`text-sm px-4 py-1.5 rounded transition ${filter === 'PENDING' ? 'bg-amber-600 text-white' : 'bg-gray-800 text-gray-400 hover:opacity-80'}`}>
            Pendentes
          </button>
          <button onClick={() => setFilter('PAID')} className={`text-sm px-4 py-1.5 rounded transition ${filter === 'PAID' ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:opacity-80'}`}>
            Pagas
          </button>
          <button onClick={() => setFilter('EXPIRED')} className={`text-sm px-4 py-1.5 rounded transition ${filter === 'EXPIRED' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:opacity-80'}`}>
            Expiradas
          </button>
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-12">Carregando transações...</div>
        ) : (
          <div className="bg-gray-800/50 rounded-lg overflow-hidden">
            <TransactionTable transactions={transactions} />
          </div>
        )}
      </div>
    </div>
  );
}
