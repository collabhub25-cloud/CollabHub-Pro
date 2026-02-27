const mongoose = require('mongoose');

async function testIndex() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/collabhub');
    const db = mongoose.connection.db;
    
    const collections = await db.listCollections().toArray();
    console.log("Collections:", collections.map(c => c.name));
    
    const users = db.collection('users');
    const indexes = await users.indexes();
    console.log("Indexes on users table:");
    console.dir(indexes, { depth: null });
    
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

testIndex();
