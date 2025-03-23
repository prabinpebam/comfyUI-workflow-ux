import multer from 'multer';
import path from 'path';
import fs from 'fs';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Store files in the docs/workflow/[workflow-name] directory
    const workflowName = req.body.title?.replace(/\s+/g, '-') || 'temp';
    const uploadPath = path.join(process.cwd(), 'docs', 'workflow', workflowName);
    
    // Create the directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const workflowName = req.body.title?.replace(/\s+/g, '-') || 'temp';
    const ext = path.extname(file.originalname);
    let baseName: string;

    switch (file.fieldname) {
      case 'workflow':
        baseName = `${workflowName}.json`;
        break;
      case 'parameters':
        baseName = `${workflowName}-user-editable-parameters.json`;
        break;
      case 'preview':
        baseName = `${workflowName}${ext}`;
        break;
      default:
        baseName = file.originalname;
    }

    cb(null, baseName);
  }
});

export const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'preview') {
      // Allow only image files for preview
      const allowedTypes = /jpeg|jpg|png|gif/;
      const ext = path.extname(file.originalname).toLowerCase();
      if (allowedTypes.test(ext)) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed for preview!'));
      }
    } else {
      // For workflow and parameters, allow only JSON
      const ext = path.extname(file.originalname).toLowerCase();
      if (ext === '.json') {
        cb(null, true);
      } else {
        cb(new Error('Only JSON files are allowed for workflow and parameters!'));
      }
    }
  }
});