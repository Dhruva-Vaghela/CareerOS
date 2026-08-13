#!/usr/bin/env node
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || 'mongodb://localhost:27017/careeros';

console.log('🔍 Testing MongoDB connection...');
console.log(`📍 Connection URL: ${DATABASE_URL.replace(/:[^:]*@/, ':****@')}`);

mongoose.connect(DATABASE_URL, {
  serverSelectionTimeoutMS: 10000,
})
.then(() => {
  console.log('✅ MongoDB connection successful!');
  console.log('📊 Database:', mongoose.connection.db.databaseName);
  console.log('🏠 Host:', mongoose.connection.host);
  process.exit(0);
})
.catch((err) => {
  console.error('❌ MongoDB connection failed!');
  console.error('Error:', err.message);
  console.error('Code:', err.code);
  
  if (err.code === 'ECONNREFUSED') {
    console.log('\n💡 Suggestions:');
    console.log('1. Check if MongoDB Atlas network access allows your IP');
    console.log('2. Visit: https://cloud.mongodb.com → Security → Network Access');
    console.log('3. Add your IP address or use 0.0.0.0/0 for development');
  }
  
  process.exit(1);
});
