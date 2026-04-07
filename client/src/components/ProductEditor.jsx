export default function ProductEditor({ products, onChange }) {
  const updateProduct = (index, field, value) => {
    const updated = products.map((p, i) => i === index ? { ...p, [field]: value } : p);
    onChange(updated);
  };

  const addProduct = () => {
    onChange([...products, { label: '', price: 0, driveLink: '' }]);
  };

  const removeProduct = (index) => {
    onChange(products.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold text-gray-200">Produtos</h3>
        <button onClick={addProduct} className="text-sm bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-white font-medium">
          + Adicionar
        </button>
      </div>
      {products.map((product, i) => (
        <div key={i} className="bg-gray-700/50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-gray-400">Produto #{i + 1}</span>
            {products.length > 1 && (
              <button onClick={() => removeProduct(i)} className="text-red-400 hover:text-red-300 text-sm">Remover</button>
            )}
          </div>
          <div>
            <label className="text-xs text-gray-400">Nome</label>
            <input type="text" value={product.label} onChange={(e) => updateProduct(i, 'label', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 text-sm focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs text-gray-400">Preço</label>
            <input type="number" step="0.01" value={product.price} onChange={(e) => updateProduct(i, 'price', parseFloat(e.target.value))}
              className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 text-sm focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs text-gray-400">Link Google Drive</label>
            <input type="text" value={product.driveLink} onChange={(e) => updateProduct(i, 'driveLink', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 text-sm focus:ring-1 focus:ring-blue-500" />
          </div>
        </div>
      ))}
    </div>
  );
}
