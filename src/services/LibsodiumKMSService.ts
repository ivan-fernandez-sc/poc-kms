import { KMSClient, GenerateDataKeyCommand, DecryptCommand } from '@aws-sdk/client-kms';
import sodium from 'libsodium-wrappers';
import { KMSService } from './KMSService';


export class LibsodiumKMSService implements KMSService {
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
    const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
    const ciphertext = sodium.crypto_secretbox_easy(plaintext, nonce, dataKey);

    return `${sodium.to_hex(nonce)}:${sodium.to_hex(ciphertext)}`;
  }

  /**
   * Decrypt data with AES-256-GCM
   */
  decrypt(encryptedData: string, dataKey: Buffer): string {
    const [nonceHex, ciphertextHex] = encryptedData.split(':');

    const nonce = sodium.from_hex(nonceHex);
    const ciphertext = sodium.from_hex(ciphertextHex);

    const decrypted = sodium.crypto_secretbox_open_easy(ciphertext, nonce, dataKey);

    return new TextDecoder().decode(decrypted);
  }
}
