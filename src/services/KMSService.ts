export type DataKeyProps = {
    plaintextKey: Buffer;
    encryptedDataKey: string;
}

export interface KMSService {
    encrypt(plaintext: string, dataKey: Buffer): string;
    decrypt(encrypted: string, dataKey: Buffer): string;
    generateDataKey(): Promise<DataKeyProps>;
    decryptDataKey(encryptedDataKey: string): Promise<Buffer>;
}