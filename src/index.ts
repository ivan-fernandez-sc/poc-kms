import { Database, dbConfig } from './database/Database';
import { LibsodiumKMSService as KMSService } from './services/LibsodiumKMSService';
import { User } from './models/User';
import { setupLocalKMS, localStackConfig } from './config/localstack-setup';

/**
 * POC Demo: AWS KMS Envelope Encryption for GDPR Compliance
 */
async function main() {
  console.log('🔐 KMS Envelope Encryption POC Starting...\n');

  let db: Database | null = null;
  let keyId: string | null = null;

  try {
    // 1. Setup LocalStack KMS
    console.log('1️⃣ Setting up LocalStack KMS...');
    keyId = await setupLocalKMS();
    console.log('');

    // 2. Initialize database
    console.log('2️⃣ Connecting to PostgreSQL...');
    db = new Database(dbConfig);
    await db.initializeSchema();
    console.log('✅ Database connected and schema initialized\n');

    // 3. Initialize KMS Service
    console.log('3️⃣ Initializing KMS Service...');
    const kmsService = new KMSService(keyId, localStackConfig.kmsEndpoint);
    console.log('✅ KMS Service initialized\n');

    // 4. Create a user with sensitive data
    console.log('4️⃣ Creating user with encrypted sensitive data...');
    const user = new User(db, kmsService, {
      username: 'john_doe',
      email: 'john.doe@example.com',
      phone: '+1-555-123-4567'
    });

    await user.save();
    console.log(`✅ User created with ID: ${user.id}`);
    console.log('   🔑 Single DEK generated for user');
    console.log('   📧 Email encrypted with user DEK');
    console.log('   📱 Phone encrypted with user DEK\n');

    // 5. Retrieve and decrypt user data
    console.log('5️⃣ Retrieving user from database...');
    const retrievedUser = await User.findByUsername(db, kmsService, 'john_doe');
    
    if (retrievedUser) {
      console.log('✅ User found in database');
      
      // Show encrypted data is stored (not readable)
      console.log('\n📊 Database Storage (encrypted):');
      const result = await db.query('SELECT email_encrypted, phone_encrypted, dek_encrypted FROM users WHERE username = $1', ['john_doe']);
      console.log('   Email (encrypted):', result.rows[0].email_encrypted.substring(0, 50) + '...');
      console.log('   Phone (encrypted):', result.rows[0].phone_encrypted.substring(0, 50) + '...');
      console.log('   DEK (encrypted):', result.rows[0].dek_encrypted.substring(0, 50) + '...');

      // Show decrypted data (authorized access)
      console.log('\n🔓 Decrypted Data (authorized access):');
      const userData = retrievedUser.getData();
      console.log('   Username:', userData.username);
      console.log('   Email:', userData.email);
      console.log('   Phone:', userData.phone);
      console.log('');
    }

    // 6. Demonstrate GDPR Right to be Forgotten
    console.log('6️⃣ Demonstrating GDPR Right to be Forgotten...');
    if (retrievedUser) {
      await retrievedUser.forget();
      console.log('✅ User data securely deleted (GDPR compliant)\n');
      
      // Verify user is deleted
      const deletedUser = await User.findByUsername(db, kmsService, 'john_doe');
      console.log('   Verification - User exists:', deletedUser ? 'Yes' : 'No');
    }

    console.log('🎉 POC Demo completed successfully!');
    console.log('\n📋 Key Features Demonstrated:');
    console.log('   ✓ Envelope encryption with AWS KMS');
    console.log('   ✓ Single DEK per user (efficient key management)');
    console.log('   ✓ Sensitive data protection (email, phone)');
    console.log('   ✓ GDPR Right to be Forgotten compliance');
    console.log('   ✓ Secure key management');
    console.log('   ✓ Database encryption at rest');

  } catch (error) {
    console.error('❌ Demo failed:', error instanceof Error ? error.message : 'Unknown error');
  } finally {
    // Cleanup
    if (db) {
      await db.close();
      console.log('\n🧹 Database connection closed');
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});

// Run the demo
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
