# KMS Envelope Encryption POC

A Node.js TypeScript proof of concept demonstrating envelope encryption with AWS KMS for GDPR compliance.

## 🎯 Overview

This POC demonstrates:
- **Envelope Encryption** with AWS KMS for sensitive data
- **GDPR Compliance** with Right to be Forgotten
- **PostgreSQL** integration with encrypted storage
- **LocalStack** for local KMS testing

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Application   │───▶│   KMS Service   │───▶│   AWS KMS       │
│                 │    │                 │    │  (LocalStack)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │
         ▼
┌─────────────────┐    ┌─────────────────┐
│ Encrypted Value │───▶│   PostgreSQL    │
│                 │    │   Database      │
└─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start LocalStack and PostgreSQL:**
   ```bash
   npm run localstack
   ```

3. **Run the demo:**
   ```bash
   npm run dev
   ```

## 🔧 Components

### KMS Service (`src/services/KMSService.ts`)
- Envelope encryption/decryption
- Data key generation
- Secure key management

### User Model (`src/models/User.ts`)
- Demonstrates encrypted fields in practice
- Database persistence with encryption
- GDPR compliant data deletion

## 🔐 How Envelope Encryption Works

1. **Encryption (Single DEK per User):**
   - Generate one data key from KMS per user
   - Encrypt all user fields with the same data key
   - Store encrypted data + single encrypted data key

2. **Decryption:**
   - Decrypt user's data key using KMS
   - Decrypt all user fields with the same decrypted data key
   - Clear data key from memory

## 📊 Database Schema

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  email_encrypted TEXT,
  phone_encrypted TEXT,
  dek_encrypted TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🛡️ GDPR Compliance

- **Data Minimization**: Only encrypt necessary sensitive fields
- **Right to be Forgotten**: Secure deletion of encrypted data
- **Data Protection**: Encryption at rest and in transit
- **Access Control**: Controlled decryption through KMS

## 🧪 Testing with LocalStack

The POC uses LocalStack to simulate AWS KMS locally:
- No AWS credentials needed
- Fast local development
- Cost-effective testing

## 📝 Scripts

- `npm run dev` - Run development server
- `npm run build` - Build TypeScript
- `npm run start` - Run built application
- `npm run localstack` - Start LocalStack services
- `npm run localstack:stop` - Stop LocalStack services

## 🔑 Key Benefits

1. **Security**: Sensitive data never stored in plaintext
2. **Efficiency**: Single DEK per user (not per field)
3. **Compliance**: GDPR Right to be Forgotten support
4. **Scalability**: KMS handles key rotation automatically
5. **Auditability**: KMS provides detailed access logs
6. **Separation**: Data keys separate from master keys

## ⚠️ Production Considerations

- Use real AWS KMS in production
- Implement proper IAM policies
- Set up key rotation policies
- Monitor KMS usage and costs
- Implement caching for performance
