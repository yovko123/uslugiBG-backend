// src/config/storage.config.ts
import path from 'path';
import fs from 'fs';

export interface StorageService {
  saveFile(buffer: Buffer, filename: string): Promise<string>;
  deleteFile(fileUrl: string): Promise<void>;
}

class LocalStorageService implements StorageService {
  private uploadDir: string;

  constructor() {
    this.uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async saveFile(buffer: Buffer, originalname: string): Promise<string> {
    const filename = `${Date.now()}-${originalname}`;
    const filepath = path.join(this.uploadDir, filename);
    await fs.promises.writeFile(filepath, buffer);
    return `/uploads/${filename}`; // This should match your static assets route
  }

  async deleteFile(fileUrl: string): Promise<void> {
    const filename = path.basename(fileUrl);
    const filepath = path.join(this.uploadDir, filename);
    
    if (fs.existsSync(filepath)) {
      await fs.promises.unlink(filepath);
    }
  }
}

// Export a singleton instance
export const storage = new LocalStorageService();