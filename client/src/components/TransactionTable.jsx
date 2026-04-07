const statusColors = {
  PENDING: 'bg-amber-600/20 text-amber-400 border border-amber-500/30',
  PAID: 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30',
  EXPIRED: 'bg-red-600/20 text-red-400 border border-red-500/30',
};

export default function TransactionTable({ transactions }) {
  if (!transactions.length) {
    return <p className="text-gray-400 text-center py-8">Nenhuma transação.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left text-gray-300">
        <thead className="text-xs text-gray-400 border-b border-gray-700">
          <tr>
            <th className="px-4 py-3">ID</th>
            <th className="px-4 py-3">Usuário</th>
            <th className="px-4 py-3">Produto</th>
            <th className="px-4 py-3">Valor</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Data</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => (
            <tr key={t._id} className="border-b border-gray-700/50 hover:bg-gray-800/30">
              <td className="px-4 py-3 font-mono text-xs">{t._id.slice(-6)}</td>
              <td className="px-4 py-3">{t.telegramUserId}</td>
              <td className="px-4 py-3">{t.productLabel}</td>
              <td className="px-4 py-3">R$ {t.amount.toFixed(2)}</td>
              <td className="px-4 py-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[t.status]}`}>
                  {t.status}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-gray-400">{new Date(t.createdAt).toLocaleString('pt-BR')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
