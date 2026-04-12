import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../lib/api';
import ImageUploader from '../components/ImageUploader';
import ProductEditor from '../components/ProductEditor';
import socket from '../lib/socket';

export default function BotConfig() {
  const { botId } = useParams();
  const [config, setConfig] = useState(null);
  const [products, setProducts] = useState([]);
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [welcomeImageUrls, setWelcomeImageUrls] = useState([]);
  const [botName, setBotName] = useState('');
  const [botToken, setBotToken] = useState('');
  const [masterDriveLink, setMasterDriveLink] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    socket.emit('join_admin');
    loadConfig();
  }, [botId]);

  const loadConfig = async () => {
    try {
      const { data } = await api.get(`/admin/config/${botId}`);
      setConfig(data);
      setBotName(data.name || '');
      setBotToken(data.token || '');
      setMasterDriveLink(data.masterDriveLink || '');
      setIsActive(data.active !== false);
      setWelcomeMessage(data.welcomeMessage || '');
      setWelcomeImageUrls(Array.isArray(data.welcomeImageUrls) ? data.welcomeImageUrls : (data.welcomeImageUrl ? [data.welcomeImageUrl] : []));
      setProducts(data.products || []);
    } catch (err) {
      console.error('Failed to load config:', err);
    }
  };

  const handleUpload = (urls) => setWelcomeImageUrls(prev => [...prev, ...urls]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await api.put(`/admin/config/${botId}`, {
        name: botName,
        token: botToken,
        masterDriveLink,
        active: isActive,
        welcomeMessage,
        welcomeImageUrls,
        products,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Save failed:', err);
      alert('Erro ao salvar configurações. Verifique os dados.');
    } finally {
      setSaving(false);
    }
  };

  if (!config) return <div className="min-h-screen bg-gray-900 p-6"><p className="text-center text-gray-400 py-12">Carregando...</p></div>;

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Configuração do Bot</h1>
            <p className="text-gray-400 text-sm">{botName}</p>
          </div>
          <Link to="/" className="text-blue-400 text-sm hover:underline">Voltar ao Dashboard</Link>
        </div>

        {saved && (
          <div className="mb-4 bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 px-4 py-2 rounded text-sm">
            Configuração salva com sucesso!
          </div>
        )}

        <div className="bg-gray-800/50 rounded-lg p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">Nome do Bot</label>
              <input type="text" value={botName} onChange={(e) => setBotName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">Status</label>
              <select value={isActive} onChange={(e) => setIsActive(e.target.value === 'true')}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:ring-2 focus:ring-blue-500">
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">Token do Telegram</label>
            <input type="text" value={botToken} onChange={(e) => setBotToken(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">Link de Entrega (Master Drive)</label>
            <input type="text" value={masterDriveLink} onChange={(e) => setMasterDriveLink(e.target.value)}
              placeholder="https://drive.google.com/..."
              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Welcome Message */}
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">Mensagem de boas-vindas</label>
            <textarea value={welcomeMessage} onChange={(e) => setWelcomeMessage(e.target.value)} rows={4}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Images */}
          <ImageUploader currentUrls={welcomeImageUrls} onUpload={handleUpload} />

          {/* Products */}
          <ProductEditor products={products} onChange={setProducts} />

          {/* Save */}
          <button onClick={handleSave} disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 rounded font-medium transition">
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </div>
    </div>
  );
}
