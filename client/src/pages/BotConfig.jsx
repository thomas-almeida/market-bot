import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import ImageUploader from '../components/ImageUploader';
import ProductEditor from '../components/ProductEditor';
import socket from '../lib/socket';

export default function BotConfig() {
  const [config, setConfig] = useState(null);
  const [products, setProducts] = useState([]);
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [welcomeImageUrls, setWelcomeImageUrls] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    socket.emit('join_admin');
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const { data } = await api.get('/admin/config');
      setConfig(data);
      setWelcomeMessage(data.welcomeMessage || '');
      setWelcomeImageUrls(Array.isArray(data.welcomeImageUrls) ? data.welcomeImageUrls : (data.welcomeImageUrl ? [data.welcomeImageUrl] : []));
      setProducts(data.products || []);
    } catch (err) {
      console.error('Failed to load config:', err);
    }
  };

  console.log(welcomeImageUrls);

  const handleUpload = (urls) => setWelcomeImageUrls(prev => [...prev, ...urls]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await api.put('/admin/config', {
        welcomeMessage,
        welcomeImageUrls,
        products,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!config) return <div className="min-h-screen bg-gray-900 p-6"><p className="text-center text-gray-400 py-12">Carregando...</p></div>;

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-white">Configuração do Bot</h1>
          <Link to="/" className="text-blue-400 text-sm hover:underline">Dashboard</Link>
        </div>

        {saved && (
          <div className="mb-4 bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 px-4 py-2 rounded text-sm">
            Configuração salva com sucesso!
          </div>
        )}

        <div className="bg-gray-800/50 rounded-lg p-6 space-y-6">
          {/* Welcome Message */}
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">Mensagem de boas-vindas</label>
            <textarea value={welcomeMessage} onChange={(e) => setWelcomeMessage(e.target.value)} rows={4}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Images */}
          <ImageUploader currentUrls={config.welcomeImageUrls} onUpload={handleUpload} />

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
