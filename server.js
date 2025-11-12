const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const path = require('path');
const fs = require('fs');
const qr = require('qr-image');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Middleware
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set('view engine', 'ejs');

// Configurar Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'public/uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const originalName = file.originalname.replace(/[^a-zA-Z0-9.\-]/g, '_');
    cb(null, Date.now() + '-' + originalName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/mov', 'video/avi', 'video/webm',
      'application/pdf', 
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no soportado: ' + file.mimetype), false);
    }
  }
});

// Middleware para mobile detection
app.use((req, res, next) => {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(req.headers['user-agent']);
  res.locals.isMobile = isMobile;
  next();
});

// Función para convertir Data URI a Buffer (reemplaza data-uri-to-buffer)
function dataUriToBuffer(dataUri) {
  try {
    // Verificar que es un data URI válido
    if (!dataUri.startsWith('data:')) {
      throw new Error('Invalid data URI');
    }
    
    // Extraer la parte base64 del data URI
    const base64Data = dataUri.split(',')[1];
    
    if (!base64Data) {
      throw new Error('Invalid data URI format');
    }
    
    // Convertir base64 a buffer
    const buffer = Buffer.from(base64Data, 'base64');
    return buffer;
  } catch (error) {
    throw new Error(`Error converting data URI to buffer: ${error.message}`);
  }
}

// Rutas
app.get('/', (req, res) => {
  res.render('index', { 
    title: 'Cloudinary QR Generator',
    qrCode: null,
    cloudinaryUrl: null,
    uploadedFile: null,
    customUrl: null,
    error: null,
    isMobile: res.locals.isMobile
  });
});

// Subir archivo a Cloudinary
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.render('index', {
        title: 'Cloudinary QR Generator',
        qrCode: null,
        cloudinaryUrl: null,
        uploadedFile: null,
        customUrl: null,
        error: 'Por favor selecciona un archivo',
        isMobile: res.locals.isMobile
      });
    }

    let resourceType = 'auto';
    const mimeType = req.file.mimetype;

    if (mimeType.startsWith('image/')) {
      resourceType = 'image';
    } else if (mimeType.startsWith('video/')) {
      resourceType = 'video';
    } else {
      resourceType = 'raw';
    }

    const result = await cloudinary.uploader.upload(req.file.path, {
      resource_type: resourceType,
      use_filename: true,
      unique_filename: true,
      folder: 'qr-generator'
    });

    fs.unlinkSync(req.file.path);

    res.render('index', {
      title: 'Cloudinary QR Generator',
      qrCode: null,
      cloudinaryUrl: result.secure_url,
      uploadedFile: {
        name: req.file.originalname,
        type: resourceType,
        size: (req.file.size / (1024 * 1024)).toFixed(2) + ' MB',
        publicId: result.public_id
      },
      customUrl: null,
      error: null,
      isMobile: res.locals.isMobile
    });

  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.render('index', {
      title: 'Cloudinary QR Generator',
      qrCode: null,
      cloudinaryUrl: null,
      uploadedFile: null,
      customUrl: null,
      error: `Error al subir archivo: ${error.message}`,
      isMobile: res.locals.isMobile
    });
  }
});

// Generar código QR desde cualquier URL
app.post('/generate-qr', async (req, res) => {
  try {
    const { cloudinaryUrl, customUrl } = req.body;
    const urlToEncode = cloudinaryUrl || customUrl;

    if (!urlToEncode) {
      return res.status(400).json({ error: 'No hay URL disponible' });
    }

    // Validar URL
    try {
      new URL(urlToEncode);
    } catch (e) {
      return res.status(400).json({ error: 'URL no válida' });
    }

    // Generar QR con mejor calidad para mobile
    const qr_png = qr.imageSync(urlToEncode, { 
      type: 'png',
      size: 10,
      margin: 2
    });
    const qrBase64 = qr_png.toString('base64');
    const qrDataUri = `data:image/png;base64,${qrBase64}`;

    res.json({
      success: true,
      qrCode: qrDataUri,
      message: 'Código QR generado correctamente',
      source: cloudinaryUrl ? 'cloudinary' : 'custom'
    });

  } catch (error) {
    console.error('Error generating QR:', error);
    res.status(500).json({ error: 'Error al generar código QR' });
  }
});

// Nueva ruta para generar QR desde URL personalizada
app.post('/generate-custom-qr', async (req, res) => {
  try {
    const { customUrl } = req.body;

    if (!customUrl) {
      return res.status(400).json({ error: 'Por favor ingresa una URL' });
    }

    // Validar y formatear URL
    let formattedUrl = customUrl.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = 'https://' + formattedUrl;
    }

    try {
      new URL(formattedUrl);
    } catch (e) {
      return res.status(400).json({ error: 'URL no válida' });
    }

    const qr_png = qr.imageSync(formattedUrl, { 
      type: 'png',
      size: 10,
      margin: 2
    });
    const qrBase64 = qr_png.toString('base64');
    const qrDataUri = `data:image/png;base64,${qrBase64}`;

    res.json({
      success: true,
      qrCode: qrDataUri,
      message: 'Código QR generado correctamente',
      source: 'custom',
      formattedUrl: formattedUrl
    });

  } catch (error) {
    console.error('Error generating custom QR:', error);
    res.status(500).json({ error: 'Error al generar código QR' });
  }
});

// Descargar QR - CORREGIDO
app.get('/download-qr', (req, res) => {
  try {
    const { dataUri, filename = 'qrcode.png' } = req.query;

    if (!dataUri) {
      return res.status(400).send('No hay código QR para descargar');
    }

    // Usar nuestra función personalizada
    const buffer = dataUriToBuffer(dataUri);
    
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);

  } catch (error) {
    console.error('Error downloading QR:', error);
    res.status(500).send('Error al descargar código QR: ' + error.message);
  }
});

// Listar archivos subidos
app.get('/files', async (req, res) => {
  try {
    const result = await cloudinary.api.resources({
      type: 'upload',
      max_results: 50,
      sort_by: 'created_at',
      direction: 'desc'
    });

    const files = result.resources.map(resource => ({
      publicId: resource.public_id,
      url: resource.secure_url,
      type: resource.resource_type,
      format: resource.format,
      size: (resource.bytes / 1024).toFixed(2) + ' KB',
      createdAt: resource.created_at,
      thumbnail: resource.resource_type === 'image' ? 
        cloudinary.url(resource.public_id, { width: 100, height: 100, crop: 'fill' }) : null
    }));

    res.render('files', { 
      title: 'Archivos Subidos',
      files,
      error: null,
      isMobile: res.locals.isMobile
    });

  } catch (error) {
    console.error('Error fetching files:', error);
    res.render('files', {
      title: 'Archivos Subidos',
      files: [],
      error: 'Error al cargar los archivos',
      isMobile: res.locals.isMobile
    });
  }
});

// Ruta de salud
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Servidor funcionando correctamente' });
});

// Manejo de errores global
app.use((error, req, res, next) => {
  console.error('Error global:', error);
  res.status(500).render('index', {
    title: 'Cloudinary QR Generator',
    qrCode: null,
    cloudinaryUrl: null,
    uploadedFile: null,
    customUrl: null,
    error: 'Error interno del servidor',
    isMobile: res.locals.isMobile
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📱 Modo mobile optimizado`);
});