const mongoose = require('mongoose');
const BotConfig = require('./src/models/BotConfig');
const connectDB = require('./src/config/db');

// Connect to MongoDB using the same method as the app
connectDB();

async function migrateWelcomeImage() {
  try {
    console.log('Starting migration of welcomeImageUrl to welcomeImageUrls...');

    // Find all BotConfig documents
    const configs = await BotConfig.find({});
    console.log(`Found ${configs.length} BotConfig documents`);

    let updatedCount = 0;

    for (const config of configs) {
      // Check if it has the old welcomeImageUrl field and not the new welcomeImageUrls array
      if (config.welcomeImageUrl && (!config.welcomeImageUrls || config.welcomeImageUrls.length === 0)) {
        console.log(`Updating config ${config._id}: converting "${config.welcomeImageUrl}" to array`);

        // Set welcomeImageUrls to an array containing the old welcomeImageUrl
        config.welcomeImageUrls = [config.welcomeImageUrl];

        // Save the updated document
        await config.save();
        updatedCount++;
      } else if (!config.welcomeImageUrl && (!config.welcomeImageUrls || config.welcomeImageUrls.length === 0)) {
        // Neither field has data, initialize empty array
        console.log(`Initializing empty welcomeImageUrls for config ${config._id}`);
        config.welcomeImageUrls = [];
        await config.save();
        updatedCount++;
      } else {
        console.log(`Config ${config._id} already has welcomeImageUrls:`, config.welcomeImageUrls);
      }
    }

    console.log(`Migration completed. Updated ${updatedCount} documents.`);

  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

migrateWelcomeImage();