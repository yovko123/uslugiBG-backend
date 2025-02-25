// src/middleware/upload.ts
import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { securityConfig } from '../config/security.config';

// Use types from security config where possible
type MimeType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/heic' | 'image/heif' | 'application/octet-stream';
type FileExtension = '.jpg' | '.jpeg' | '.png' | '.webp' | '.heic' | '.heif';

// Derive file limits from security configuration
export const FILE_LIMITS = {
  MAX_FILES: securityConfig.uploadSecurity.maxFilesPerRequest,
  MAX_FILE_SIZE: securityConfig.uploadSecurity.maxFileSize, // Use the configured size
  // Fix the readonly array issue - create a new array from the config values
  ALLOWED_MIME_TYPES: Array.from(securityConfig.uploadSecurity.allowedMimeTypes) as MimeType[],
  ALLOWED_EXTENSIONS: [
    '.jpg',
    '.jpeg',
    '.png',
    '.webp',
    '.heic',
    '.heif'
  ] as FileExtension[]
} as const;

const ERROR_MESSAGES = {
  FILE_SIZE: (maxSize: number) => 
    `File too large. Maximum size is ${maxSize / (1024 * 1024)}MB`,
  FILE_COUNT: (maxFiles: number) => 
    `Too many files. Maximum is ${maxFiles} images`,
  FILE_TYPE: (extensions: string[]) => 
    `Invalid file type. Allowed types are: ${extensions.join(', ')}`,
  FILE_EXTENSION: (extensions: string[]) => 
    `Invalid file extension. Allowed extensions are: ${extensions.join(', ')}`
} as const;

const storage = multer.memoryStorage();

// Enhanced file filter with logging and security checks
const fileFilter = (
  _req: Request, 
  file: Express.Multer.File, 
  callback: multer.FileFilterCallback
): void => {
  console.log(`Processing file: ${file.originalname}, type: ${file.mimetype}`);

  // Get file extension
  const fileExtension = file.originalname.toLowerCase().match(/\.[^.]*$/)?.[0] as FileExtension | undefined;
  
  // Special handling for iPhone images (HEIC/HEIF)
  if (fileExtension && ['.heic', '.heif'].includes(fileExtension)) {
    // Accept HEIC/HEIF files regardless of mime type
    console.log(`Accepted HEIC/HEIF file: ${file.originalname}`);
    callback(null, true);
    return;
  }

  // Create a string array of allowed mime types for comparison
  if (!securityConfig.uploadSecurity.allowedMimeTypes.includes(file.mimetype as any)) {
    console.warn(`Rejected file ${file.originalname} due to invalid mime type: ${file.mimetype}`);
    callback(new Error(ERROR_MESSAGES.FILE_TYPE(FILE_LIMITS.ALLOWED_EXTENSIONS)));
    return;
  }

  // Check file extension for non-HEIC files
  if (!fileExtension || !FILE_LIMITS.ALLOWED_EXTENSIONS.includes(fileExtension)) {
    console.warn(`Rejected file ${file.originalname} due to invalid extension`);
    callback(new Error(ERROR_MESSAGES.FILE_EXTENSION(FILE_LIMITS.ALLOWED_EXTENSIONS)));
    return;
  }

  // Sanitize filename if configured
  if (securityConfig.uploadSecurity.sanitizeFilenames) {
    const originalName = file.originalname;
    const sanitizedName = originalName
      .replace(/[^\w\s.-]/g, '_')
      .replace(/\s+/g, '_');
    
    if (sanitizedName !== originalName) {
      file.originalname = sanitizedName;
      console.log(`Sanitized filename from ${originalName} to ${sanitizedName}`);
    }
  }

  console.log(`Accepted file: ${file.originalname}`);
  callback(null, true);
};

// Configure multer with our settings
const uploadConfig = multer({
  storage,
  limits: {
    fileSize: FILE_LIMITS.MAX_FILE_SIZE,
    files: FILE_LIMITS.MAX_FILES
  },
  fileFilter
});

// Middleware that handles file uploads with proper error responses
export const uploadMiddleware = (
  req: Request, 
  res: Response, 
  next: NextFunction
): void => {
  // Log security event for file uploads
  const logUploadSecurity = () => {
    // Only log if monitoring is enabled
    if (securityConfig.monitoring.enabled) {
      const event = {
        type: 'file_operation' as const,
        ip: req.ip || 'unknown',
        path: req.path,
        timestamp: new Date().toISOString(),
        details: {
          method: req.method,
          fileCount: req.files ? 
            (Array.isArray(req.files) ? req.files.length : Object.keys(req.files).length) : 0
        }
      };
      console.warn('Security Event:', event);
    }
  };

  console.log('Starting file upload process');

  uploadConfig.array('images', FILE_LIMITS.MAX_FILES)(req, res, (error: any) => {
    if (error instanceof multer.MulterError) {
      console.error('Multer error:', error);
      
      switch (error.code) {
        case 'LIMIT_FILE_SIZE':
          res.status(400).json({
            success: false,
            message: ERROR_MESSAGES.FILE_SIZE(FILE_LIMITS.MAX_FILE_SIZE)
          });
          break;
        case 'LIMIT_FILE_COUNT':
          res.status(400).json({
            success: false,
            message: ERROR_MESSAGES.FILE_COUNT(FILE_LIMITS.MAX_FILES)
          });
          break;
        default:
          res.status(400).json({
            success: false,
            message: `Upload error: ${error.message}`
          });
      }
      return;
    } 
    
    if (error) {
      console.error('Generic upload error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
      return;
    }

    // Log successful upload for security monitoring
    logUploadSecurity();
    console.log(`Successfully processed ${req.files?.length || 0} files`);
    next();
  });
};

export default uploadConfig;