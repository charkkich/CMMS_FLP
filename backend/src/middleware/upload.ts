import multer from 'multer';
import path from 'path';
import fs from 'fs';

const UPLOAD_DIR = path.join(__dirname, '../../uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const subDir = file.fieldname === 'photos' ? 'photos' : 'attachments';
    const dir = path.join(UPLOAD_DIR, subDir);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedImages = /jpeg|jpg|png|gif|webp/;
  const allowedDocs = /pdf|doc|docx|xls|xlsx/;
  const ext = path.extname(file.originalname).toLowerCase().slice(1);
  if (file.fieldname === 'photos' && allowedImages.test(ext)) {
    cb(null, true);
  } else if (file.fieldname === 'attachments' && (allowedImages.test(ext) || allowedDocs.test(ext))) {
    cb(null, true);
  } else {
    cb(new Error(`File type .${ext} not allowed for field ${file.fieldname}`));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

export const uploadPhotos = upload.array('photos', 10);
export const uploadAttachments = upload.array('attachments', 10);
export const uploadMixed = upload.fields([
  { name: 'photos', maxCount: 10 },
  { name: 'attachments', maxCount: 10 },
]);
