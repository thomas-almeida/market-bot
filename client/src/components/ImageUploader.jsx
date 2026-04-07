import { useState } from 'react';
import api from '../lib/api';

export default function ImageUploader({ currentUrls = [], onUpload }) {
  const [previews, setPreviews] = useState(Array.isArray(currentUrls) ? currentUrls : []);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(null); // Track which image is being deleted

  const handleFile = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);

    try {
      // Upload each file
      const uploadPromises = files.map(async (file) => {
        const previewUrl = URL.createObjectURL(file);
        // Update preview optimistically
        setPreviews(prev => [...prev, previewUrl]);

        const formData = new FormData();
        formData.append('image', file);

        const { data } = await api.post('/admin/upload-image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        return data.url;
      });

      const urls = await Promise.all(uploadPromises);
      onUpload(urls);
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
      // Clear input
      e.target.value = '';
    }
  };

  const handleDelete = async (index) => {
    const imageToDelete = previews[index];
    if (!imageToDelete) return;

    setDeleting(index);
    try {
      await api.delete('/admin/delete-image', {
        data: { imageUrl: imageToDelete }
      });

      // Remove from previews
      setPreviews(prev => prev.filter((_, i) => i !== index));

      // Notify parent to update state
      onUpload([...previews.filter((_, i) => i !== index)]);
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="text-sm text-gray-400">Imagens de boas-vindas</div>
      {previews.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {previews.map((preview, index) => (
            <div key={index} className="relative">
              <img
                src={preview}
                alt="Preview"
                className="max-w-xs max-h-xs rounded border border-gray-600 object-cover"
              />
              {deleting === index && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <span className="animate-spin rounded-full border-2 border-white border-t-transparent h-4 w-4"></span>
                </div>
              )}
              {deleting !== index && (
                <button
                  onClick={() => handleDelete(index)}
                  className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:scale-110 transition-transform"
                  aria-label="Remove image"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={handleFile}
        className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-600 file:text-white file:text-sm file:font-medium hover:file:bg-blue-700 cursor-pointer"
      />
      {uploading && <p className="text-sm text-gray-400">Enviando...</p>}
    </div>
  );
}
