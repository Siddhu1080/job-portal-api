
const mongoose = require('mongoose');
const dns = require('dns');

// Use Google's DNS resolver for MongoDB Atlas SRV lookups.
dns.setServers(['8.8.8.8', '8.8.4.4']);

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
    });

    console.log(`MongoDB connected: database "${conn.connection.name}"`);
  } catch (err) {
    console.error(`MongoDB connection failed: ${err.message}`);
    console.error(
      'Check your Atlas URI, database credentials, and Atlas Network Access settings.'
    );
    process.exit(1);
  }
};

module.exports = connectDB;
