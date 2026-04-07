const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function uploadImage(fileBuffer, mimeType = 'image/png') {
  try {
    const base64 = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
    console.log('Attempting Cloudinary upload with config:', {
      cloud_name: cloudinary.config().cloud_name,
      api_key_set: !!cloudinary.config().api_key,
      api_secret_set: !!cloudinary.config().api_secret
    });
    const result = await cloudinary.uploader.upload(base64, {
      resource_type: 'image',
    });
    console.log('Cloudinary upload successful:', result.secure_url);
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
}

module.exports = { uploadImage };
