import { KMSClient, CreateKeyCommand, CreateAliasCommand, ListKeysCommand } from '@aws-sdk/client-kms';

/**
 * Setup LocalStack KMS for local development
 */
export async function setupLocalKMS(): Promise<string> {
  const kmsClient = new KMSClient({
    region: 'us-east-1',
    endpoint: 'http://localhost:4566',
    credentials: {
      accessKeyId: 'test',
      secretAccessKey: 'test'
    }
  });

  try {
    // Check if we already have keys
    const listKeysCommand = new ListKeysCommand({});
    const listResponse = await kmsClient.send(listKeysCommand);
    
    if (listResponse.Keys && listResponse.Keys.length > 0) {
      // Use existing key
      const keyId = listResponse.Keys[0].KeyId!;
      console.log(`✅ Using existing LocalStack KMS key!`);
      console.log(`   Key ID: ${keyId}`);
      return keyId;
    }

    // Create a new KMS key for our POC
    const createKeyCommand = new CreateKeyCommand({
      Description: 'POC KMS Key for Envelope Encryption'
    });

    const keyResponse = await kmsClient.send(createKeyCommand);
    const keyId = keyResponse.KeyMetadata?.KeyId;

    if (!keyId) {
      throw new Error('Failed to create KMS key');
    }

    console.log(`✅ LocalStack KMS setup complete!`);
    console.log(`   Key ID: ${keyId}`);

    return keyId;
  } catch (error) {
    console.error('Failed to setup LocalStack KMS:', error);
    throw error;
  }
}

export const localStackConfig = {
  kmsEndpoint: 'http://localhost:4566',
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'test',
    secretAccessKey: 'test'
  }
};
