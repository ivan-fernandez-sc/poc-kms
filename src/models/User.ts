import { Database } from '../database/Database';
import { KMSService } from '../services/KMSService';

export interface UserData {
  id?: number;
  username: string;
  email: string;
  phone: string;
}

/**
 * User model with encrypted sensitive fields
 * Demonstrates GDPR-compliant data handling
 */
export class User {
  public id?: number;
  public username: string;
  public email: string;
  public phone: string;

  constructor(
    private db: Database,
    private kmsService: KMSService,
    data: UserData
  ) {
    this.id = data.id;
    this.username = data.username;
    this.email = data.email;
    this.phone = data.phone;
  }

  /**
   * Save user to database with encrypted fields using single DEK
   */
  async save(): Promise<void> {
    if (this.id) {
      // Update existing user - get existing DEK
      const result = await this.db.query('SELECT dek_encrypted FROM users WHERE id = $1', [this.id]);
      const encryptedDataKey = result.rows[0].dek_encrypted;
      const dataKey = await this.kmsService.decryptDataKey(encryptedDataKey);
      
      try {
        const emailEncrypted = this.kmsService.encrypt(this.email, dataKey);
        const phoneEncrypted = this.kmsService.encrypt(this.phone, dataKey);

        await this.db.query(`
          UPDATE users SET 
            username = $1,
            email_encrypted = $2,
            phone_encrypted = $3,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $4
        `, [this.username, emailEncrypted, phoneEncrypted, this.id]);
      } finally {
        // Clear data key from memory
        dataKey.fill(0);
      }
    } else {
      // Create new user - generate new DEK
      const { plaintextKey, encryptedDataKey } = await this.kmsService.generateDataKey();
      
      try {
        const emailEncrypted = this.kmsService.encrypt(this.email, plaintextKey);
        const phoneEncrypted = this.kmsService.encrypt(this.phone, plaintextKey);

        const result = await this.db.query(`
          INSERT INTO users (username, email_encrypted, phone_encrypted, dek_encrypted)
          VALUES ($1, $2, $3, $4) 
          RETURNING id
        `, [this.username, emailEncrypted, phoneEncrypted, encryptedDataKey]);
        
        this.id = result.rows[0].id;
      } finally {
        // Clear data key from memory
        plaintextKey.fill(0);
      }
    }
  }

  /**
   * Find user by username
   */
  static async findByUsername(
    db: Database, 
    kmsService: KMSService, 
    username: string
  ): Promise<User | null> {
    const result = await db.query(
      'SELECT * FROM users WHERE username = $1', 
      [username]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    
    // Decrypt user's data key
    const dataKey = await kmsService.decryptDataKey(row.dek_encrypted);
    
    try {
      // Decrypt fields using the same DEK
      const emailDecrypted = kmsService.decrypt(row.email_encrypted, dataKey);
      const phoneDecrypted = kmsService.decrypt(row.phone_encrypted, dataKey);

      // Create user with decrypted data
      return new User(db, kmsService, {
        id: row.id,
        username: row.username,
        email: emailDecrypted,
        phone: phoneDecrypted
      });
    } finally {
      // Clear data key from memory
      dataKey.fill(0);
    }
  }

  /**
   * GDPR Right to be Forgotten - securely delete user data
   */
  async forget(): Promise<void> {
    if (!this.id) {
      throw new Error('Cannot forget user without ID');
    }

    // Clear sensitive data from memory
    this.email = '';
    this.phone = '';

    // Delete from database
    await this.db.query('DELETE FROM users WHERE id = $1', [this.id]);
    
    console.log(`User ${this.username} has been forgotten (GDPR compliance)`);
  }

  /**
   * Get user data (already decrypted)
   */
  getData(): UserData {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      phone: this.phone
    };
  }
}
