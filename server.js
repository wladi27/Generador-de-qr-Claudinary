const express = require('express');
const cloudinary = require('cloudinary').v2;
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
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.json({ limit: '50mb' }));
app.set('view engine', 'ejs');

// Middleware para mobile detection
app.use((req, res, next) => {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(req.headers['user-agent']);
  res.locals.isMobile = isMobile;
  next();
});

// Función para convertir Data URI a Buffer
function dataUriToBuffer(dataUri) {
  try {
    if (!dataUri.startsWith('data:')) {
      throw new Error('Invalid data URI');
    }
    
    const base64Data = dataUri.split(',')[1];
    
    if (!base64Data) {
      throw new Error('Invalid data URI format');
    }
    
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

// Subir archivo directamente a Cloudinary desde base64
app.post('/upload', express.json({ limit: '50mb' }), async (req, res) => {
  try {
    const { fileData, fileName, fileType } = req.body;

    console.log('Recibiendo archivo:', fileName, 'Tipo:', fileType);

    if (!fileData || !fileName) {
      return res.status(400).json({
        success: false,
        error: 'Datos de archivo incompletos'
      });
    }

    // Determinar resource type para Cloudinary
    let resourceType = 'auto';
    if (fileType && fileType.startsWith('image/')) {
      resourceType = 'image';
    } else if (fileType && fileType.startsWith('video/')) {
      resourceType = 'video';
    } else {
      resourceType = 'raw';
    }

    console.log('Subiendo a Cloudinary con resource_type:', resourceType);

    // Validar que fileData sea un data URL válido
    if (!fileData.startsWith('data:')) {
      return res.status(400).json({
        success: false,
        error: 'Formato de datos inválido. Se esperaba data URL.'
      });
    }

    // Extraer el contenido base64 del data URL
    const base64Data = fileData.split(',')[1];
    if (!base64Data) {
      return res.status(400).json({
        success: false,
        error: 'Data URL mal formado'
      });
    }

    // Subir directamente a Cloudinary usando upload_stream para mejor control
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: resourceType,
          public_id: `qr-generator/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9]/g, '_')}`,
          overwrite: false,
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            reject(error);
          } else {
            resolve(result);
          }
        }
      );

      // Convertir base64 a buffer y enviar a Cloudinary
      const buffer = Buffer.from(base64Data, 'base64');
      uploadStream.end(buffer);
    });

    console.log('Archivo subido exitosamente:', uploadResult.secure_url);

    res.json({
      success: true,
      cloudinaryUrl: uploadResult.secure_url,
      uploadedFile: {
        name: fileName,
        type: resourceType,
        publicId: uploadResult.public_id,
        format: uploadResult.format,
        size: uploadResult.bytes ? (uploadResult.bytes / 1024).toFixed(2) + ' KB' : 'N/A'
      }
    });

  } catch (error) {
    console.error('Error en upload:', error);
    
    // Manejar errores específicos de Cloudinary
    let errorMessage = 'Error al subir archivo';
    if (error.message.includes('File size too large')) {
      errorMessage = 'El archivo es demasiado grande';
    } else if (error.message.includes('Invalid image file')) {
      errorMessage = 'Archivo de imagen inválido';
    } else if (error.message.includes('format')) {
      errorMessage = 'Formato de archivo no soportado';
    } else {
      errorMessage = `Error: ${error.message}`;
    }

    res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
});

// Generar código QR desde cualquier URL
app.post('/generate-qr', async (req, res) => {
  try {
    const { cloudinaryUrl, customUrl } = req.body;
    const urlToEncode = cloudinaryUrl || customUrl;

    if (!urlToEncode) {
      return res.status(400).json({ 
        success: false,
        error: 'No hay URL disponible' 
      });
    }

    // Validar URL
    try {
      new URL(urlToEncode);
    } catch (e) {
      return res.status(400).json({ 
        success: false,
        error: 'URL no válida' 
      });
    }

    // Generar QR
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
    res.status(500).json({ 
      success: false,
      error: 'Error al generar código QR' 
    });
  }
});

// Nueva ruta para generar QR desde URL personalizada
app.post('/generate-custom-qr', async (req, res) => {
  try {
    const { customUrl } = req.body;

    if (!customUrl) {
      return res.status(400).json({ 
        success: false,
        error: 'Por favor ingresa una URL' 
      });
    }

    // Validar y formatear URL
    let formattedUrl = customUrl.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = 'https://' + formattedUrl;
    }

    try {
      new URL(formattedUrl);
    } catch (e) {
      return res.status(400).json({ 
        success: false,
        error: 'URL no válida' 
      });
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
    res.status(500).json({ 
      success: false,
      error: 'Error al generar código QR' 
    });
  }
});

// Descargar QR
app.get('/download-qr', (req, res) => {
  try {
    const { dataUri, filename = 'qrcode.png' } = req.query;

    if (!dataUri) {
      return res.status(400).send('No hay código QR para descargar');
    }

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
  res.json({ 
    status: 'OK', 
    message: 'Servidor funcionando correctamente',
    cloudinary: {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? 'Configurado' : 'No configurado'
    }
  });
});

// Ruta de prueba de upload
app.get('/test-upload', (req, res) => {
  res.json({
    message: 'Endpoint de upload funcionando',
    timestamp: new Date().toISOString()
  });
});

// Manejo de errores global
app.use((error, req, res, next) => {
  console.error('Error global:', error);
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor'
  });
});

// Export para Vercel
module.exports = app;

// Solo iniciar servidor si no estamos en Vercel
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`☁️  Cloudinary configurado: ${process.env.CLOUDINARY_CLOUD_NAME ? 'Sí' : 'No'}`);
  });
}