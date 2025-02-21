// src/middleware/upload.ts
import multer from 'multer';
import { Request, Response, NextFunction } from 'express';

type MimeType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/heic' | 'image/heif' | 'application/octet-stream';
type FileExtension = '.jpg' | '.jpeg' | '.png' | '.webp' | '.heic' | '.heif';

export const FILE_LIMITS = {
  MAX_FILES: 5,
  MAX_FILE_SIZE: 3 * 1024 * 1024, // 3MB
  ALLOWED_MIME_TYPES: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'application/octet-stream' // Add this for HEIC files
  ] as MimeType[],
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

const fileFilter = (
  _req: Request, 
  file: Express.Multer.File, 
  callback: multer.FileFilterCallback
): void => {
  console.log(`Processing file: ${file.originalname}, type: ${file.mimetype}`);

  // Get file extension
  const fileExtension = file.originalname.toLowerCase().match(/\.[^.]*$/)?.[0] as FileExtension | undefined;
  
  // First check if it's a HEIC/HEIF file
  if (fileExtension && ['.heic', '.heif'].includes(fileExtension)) {
    // Accept HEIC/HEIF files regardless of mime type
    console.log(`Accepted HEIC/HEIF file: ${file.originalname}`);
    callback(null, true);
    return;
  }

  // For non-HEIC files, check mime type
  if (!FILE_LIMITS.ALLOWED_MIME_TYPES.includes(file.mimetype as MimeType)) {
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

  console.log(`Accepted file: ${file.originalname}`);
  callback(null, true);
};

const uploadConfig = multer({
  storage,
  limits: {
    fileSize: FILE_LIMITS.MAX_FILE_SIZE,
    files: FILE_LIMITS.MAX_FILES
  },
  fileFilter
});

export const uploadMiddleware = (
  req: Request, 
  res: Response, 
  next: NextFunction
): void => {
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

    console.log(`Successfully processed ${req.files?.length || 0} files`);
    next();
  });
};

export default uploadConfig;