import { KMSClient, GenerateDataKeyCommand, DecryptCommand } from '@aws-sdk/client-kms';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { KMSService } from './KMSService';

export class CryptoKMSService implements KMSService {
  private kmsClient: KMSClient;
  private keyId: string;

  constructor(keyId: string, endpoint?: string) {
    this.keyId = keyId;
    this.kmsClient = new KMSClient({
      region: 'us-east-1',
      ...(endpoint && { 
        endpoint,
        credentials: {
          accessKeyId: 'test',
          secretAccessKey: 'test'
        }
      })
    });
  }

  async generateDataKey(): Promise<{ plaintextKey: Buffer; encryptedDataKey: string }> {
    const dataKeyCommand = new GenerateDataKeyCommand({
      KeyId: this.keyId,
      KeySpec: 'AES_256'
    });

    const response = await this.kmsClient.send(dataKeyCommand);
    
    if (!response.Plaintext || !response.CiphertextBlob) {
      throw new Error('Failed to generate data key');
    }

    return {
      plaintextKey: Buffer.from(response.Plaintext),
      encryptedDataKey: Buffer.from(response.CiphertextBlob).toString('base64')
    };
  }

  async decryptDataKey(encryptedDataKey: string): Promise<Buffer> {
    const decryptCommand = new DecryptCommand({
      CiphertextBlob: Buffer.from(encryptedDataKey, 'base64')
    });

    const response = await this.kmsClient.send(decryptCommand);
    
    if (!response.Plaintext) {
      throw new Error('Failed to decrypt data key');
    }

    return Buffer.from(response.Plaintext);
  }

  /**
   * Encrypt data with AES-256-GCM
   */
  encrypt(plaintext: string, dataKey: Buffer): string {
    const iv = randomBytes(12); // 12 bytes recommended for GCM
    const cipher = createCipheriv('aes-256-gcm', dataKey, iv);

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final()
    ]);

    const authTag = cipher.getAuthTag();

    // Return as hex: IV + ciphertext + authTag separated by :
    return `${iv.toString('hex')}:${encrypted.toString('hex')}:${authTag.toString('hex')}`;
  }

  /**
   * Decrypt data with AES-256-GCM
   */
  decrypt(encryptedData: string, dataKey: Buffer): string {
    const [ivHex, encryptedHex, authTagHex] = encryptedData.split(':');

    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = createDecipheriv('aes-256-gcm', dataKey, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);

    return decrypted.toString('utf8');
  }
}
