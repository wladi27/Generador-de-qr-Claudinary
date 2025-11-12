// Manejo de la interfaz de usuario
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    const fileInput = document.getElementById('fileInput');
    const fileInfo = document.getElementById('fileInfo');
    const uploadBtn = document.getElementById('uploadBtn');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');

    // Verificar si hay URL de Cloudinary para mostrar resultados
    const urlInput = document.getElementById('urlInput');
    if (urlInput && urlInput.value) {
        document.getElementById('resultsSection').classList.remove('hidden');
    }

    fileInput.addEventListener('change', function(e) {
        handleFileSelection(e);
    });

    // Inicializar formulario de URL personalizada
    initializeCustomURL();
    
    // Inicializar drag and drop
    initializeDragAndDrop();
}

function initializeCustomURL() {
    const customUrlForm = document.getElementById('customUrlForm');
    if (customUrlForm) {
        customUrlForm.addEventListener('submit', function(e) {
            e.preventDefault();
            generateCustomQR();
        });
    }
}

function handleFileSelection(e) {
    const fileInput = e.target;
    const fileInfo = document.getElementById('fileInfo');
    const uploadBtn = document.getElementById('uploadBtn');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');

    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
        
        // Validar tamaño máximo (50MB)
        if (file.size > 50 * 1024 * 1024) {
            showError('El archivo es demasiado grande. Máximo 50MB permitidos.');
            clearFile();
            return;
        }
        
        fileName.textContent = file.name;
        fileSize.textContent = `${fileSizeMB} MB • ${getFileType(file.type)}`;
        
        fileInfo.classList.remove('hidden');
        uploadBtn.classList.remove('hidden');
        
        // Ocultar resultados anteriores
        document.getElementById('resultsSection').classList.add('hidden');
    }
}

function getFileType(mimeType) {
    if (mimeType.startsWith('image/')) return 'Imagen';
    if (mimeType.startsWith('video/')) return 'Video';
    if (mimeType.includes('pdf')) return 'PDF';
    if (mimeType.includes('word')) return 'Documento Word';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'Excel';
    if (mimeType.includes('text')) return 'Texto';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'PowerPoint';
    return 'Documento';
}

function clearFile() {
    const fileInput = document.getElementById('fileInput');
    const fileInfo = document.getElementById('fileInfo');
    const uploadBtn = document.getElementById('uploadBtn');
    const progressSection = document.getElementById('progressSection');
    
    fileInput.value = '';
    fileInfo.classList.add('hidden');
    uploadBtn.classList.add('hidden');
    
    if (progressSection) {
        progressSection.classList.add('hidden');
    }
    
    // Reset progress bar
    const progressFill = document.getElementById('progressFill');
    if (progressFill) {
        progressFill.style.width = '0%';
        progressFill.style.backgroundColor = '#3b82f6';
    }
}

function showError(message) {
    // Crear o actualizar elemento de error
    let errorDiv = document.getElementById('errorMessage');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.id = 'errorMessage';
        errorDiv.className = 'bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6 fade-in';
        document.querySelector('.container').insertBefore(errorDiv, document.querySelector('.container').firstChild);
    }
    
    errorDiv.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-exclamation-triangle mr-3"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-auto text-red-500 hover:text-red-700 btn-touch">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (errorDiv.parentElement) {
            errorDiv.remove();
        }
    }, 5000);
}

function showSuccess(message) {
    let successDiv = document.getElementById('successMessage');
    if (!successDiv) {
        successDiv = document.createElement('div');
        successDiv.id = 'successMessage';
        successDiv.className = 'bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-6 fade-in';
        document.querySelector('.container').insertBefore(successDiv, document.querySelector('.container').firstChild);
    }
    
    successDiv.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-check-circle mr-3"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-auto text-green-500 hover:text-green-700 btn-touch">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    setTimeout(() => {
        if (successDiv.parentElement) {
            successDiv.remove();
        }
    }, 5000);
}

// Función para generar QR desde URL personalizada
async function generateCustomQR() {
    const customUrlInput = document.getElementById('customUrlInput');
    const generateCustomQRBtn = document.getElementById('generateCustomQRBtn');
    const qrContainer = document.getElementById('qrContainer');
    const noQR = document.getElementById('noQR');
    const downloadQRBtn = document.getElementById('downloadQRBtn');
    
    const customUrl = customUrlInput.value.trim();
    
    if (!customUrl) {
        showError('Por favor ingresa una URL');
        return;
    }
    
    generateCustomQRBtn.disabled = true;
    generateCustomQRBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Generando...';
    
    try {
        const response = await fetch('/generate-custom-qr', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ customUrl })
        });
        
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('qrImage').src = data.qrCode;
            qrContainer.classList.remove('hidden');
            noQR.classList.add('hidden');
            downloadQRBtn.classList.remove('hidden');
            downloadQRBtn.setAttribute('data-qr-uri', data.qrCode);
            
            // Mostrar URL en el campo de resultados
            const urlInput = document.getElementById('urlInput');
            if (urlInput) {
                urlInput.value = data.formattedUrl || customUrl;
            }
            
            // Mostrar sección de resultados
            document.getElementById('resultsSection').classList.remove('hidden');
            
            showSuccess('Código QR generado correctamente');
            
            // Scroll suave a la sección de resultados
            document.getElementById('resultsSection').scrollIntoView({ 
                behavior: 'smooth',
                block: 'start'
            });
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        showError('Error al generar código QR: ' + error.message);
    } finally {
        generateCustomQRBtn.disabled = false;
        generateCustomQRBtn.innerHTML = '<i class="fas fa-qrcode mr-2"></i>Generar QR';
    }
}

// Manejo del formulario de subida
document.getElementById('uploadForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const fileInput = document.getElementById('fileInput');
    
    if (!fileInput.files.length) {
        showError('Por favor selecciona un archivo primero.');
        return;
    }
    
    await uploadFile(formData);
});

async function uploadFile(formData) {
    const progressSection = document.getElementById('progressSection');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const uploadBtn = document.getElementById('uploadBtn');
    
    // Mostrar progreso
    progressSection.classList.remove('hidden');
    uploadBtn.disabled = true;
    uploadBtn.classList.add('pulse-upload');
    uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Subiendo...';
    
    try {
        // Simular progreso
        const progressInterval = simulateProgress(progressFill, progressText);
        
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });
        
        clearInterval(progressInterval);
        
        if (response.ok) {
            progressFill.style.width = '100%';
            progressText.textContent = '¡Subida completada!';
            
            // Esperar un momento antes de recargar para mostrar el progreso completo
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else {
            const errorData = await response.text();
            throw new Error(errorData || 'Error en la subida');
        }
    } catch (error) {
        progressText.textContent = 'Error en la subida';
        progressFill.style.backgroundColor = '#ef4444';
        uploadBtn.disabled = false;
        uploadBtn.classList.remove('pulse-upload');
        uploadBtn.innerHTML = '<i class="fas fa-cloud-upload-alt mr-2"></i>Subir a Cloudinary';
        showError('Error al subir archivo: ' + error.message);
        console.error('Upload error:', error);
    }
}

function simulateProgress(progressFill, progressText) {
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress > 85) {
            progress = 85;
        }
        progressFill.style.width = `${progress}%`;
        progressText.textContent = `Subiendo... ${Math.round(progress)}%`;
    }, 300);
    
    return interval;
}

// Funciones para URLs y QR
function copyUrl() {
    const urlInput = document.getElementById('urlInput');
    
    if (!urlInput.value) {
        showError('No hay URL para copiar.');
        return;
    }
    
    // Método moderno usando Clipboard API
    navigator.clipboard.writeText(urlInput.value).then(() => {
        // Feedback visual
        const copyBtn = document.getElementById('copyUrlBtn');
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = '<i class="fas fa-check mr-2"></i>Copiado!';
        copyBtn.classList.remove('bg-gray-600', 'hover:bg-gray-700');
        copyBtn.classList.add('bg-green-600', 'hover:bg-green-700');
        
        showSuccess('URL copiada al portapapeles');
        
        setTimeout(() => {
            copyBtn.innerHTML = originalText;
            copyBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
            copyBtn.classList.add('bg-gray-600', 'hover:bg-gray-700');
        }, 2000);
    }).catch(err => {
        // Fallback para navegadores antiguos
        urlInput.select();
        document.execCommand('copy');
        showSuccess('URL copiada al portapapeles');
    });
}

async function generateQR() {
    const cloudinaryUrl = document.getElementById('urlInput').value;
    const generateQRBtn = document.getElementById('generateQRBtn');
    const qrContainer = document.getElementById('qrContainer');
    const noQR = document.getElementById('noQR');
    const downloadQRBtn = document.getElementById('downloadQRBtn');
    
    if (!cloudinaryUrl) {
        showError('No hay URL disponible para generar QR');
        return;
    }
    
    generateQRBtn.disabled = true;
    generateQRBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Generando...';
    
    try {
        const response = await fetch('/generate-qr', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ cloudinaryUrl })
        });
        
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('qrImage').src = data.qrCode;
            qrContainer.classList.remove('hidden');
            noQR.classList.add('hidden');
            downloadQRBtn.classList.remove('hidden');
            downloadQRBtn.setAttribute('data-qr-uri', data.qrCode);
            showSuccess('Código QR generado correctamente');
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        showError('Error al generar código QR: ' + error.message);
    } finally {
        generateQRBtn.disabled = false;
        generateQRBtn.innerHTML = '<i class="fas fa-qrcode mr-2"></i>Generar Código QR';
    }
}

function downloadQR() {
    const downloadBtn = document.getElementById('downloadQRBtn');
    const qrDataUri = downloadBtn.getAttribute('data-qr-uri');
    
    if (qrDataUri) {
        const urlInput = document.getElementById('urlInput').value;
        // Crear nombre de archivo más descriptivo
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
        const fileName = `qrcode-${timestamp}.png`;
        const downloadUrl = `/download-qr?dataUri=${encodeURIComponent(qrDataUri)}&filename=${fileName}`;
        
        // Crear link temporal para descarga
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = fileName;
        link.target = '_blank'; // Para mobile compatibility
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showSuccess('Código QR descargado correctamente');
    } else {
        showError('No hay código QR para descargar. Genera uno primero.');
    }
}

// Drag and Drop functionality
function initializeDragAndDrop() {
    const dropArea = document.querySelector('.border-dashed');
    
    if (!dropArea) return;
    
    // Prevenir comportamientos por defecto
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    // Highlight drop area when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });
    
    function highlight() {
        dropArea.classList.add('border-blue-400', 'bg-blue-50', 'border-2');
        dropArea.classList.remove('border-gray-300');
    }
    
    function unhighlight() {
        dropArea.classList.remove('border-blue-400', 'bg-blue-50', 'border-2');
        dropArea.classList.add('border-gray-300');
    }
    
    // Handle dropped files
    dropArea.addEventListener('drop', handleDrop, false);
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length) {
            const fileInput = document.getElementById('fileInput');
            
            // Crear un nuevo DataTransfer para asignar los archivos
            const dataTransfer = new DataTransfer();
            for (let file of files) {
                dataTransfer.items.add(file);
            }
            fileInput.files = dataTransfer.files;
            
            // Disparar el evento change
            const event = new Event('change', { bubbles: true });
            fileInput.dispatchEvent(event);
        }
    }
}

// Funciones auxiliares para la página de archivos
function copyFileUrl(url) {
    navigator.clipboard.writeText(url).then(() => {
        showSuccess('URL del archivo copiada al portapapeles');
    }).catch(err => {
        // Fallback
        const tempInput = document.createElement('input');
        tempInput.value = url;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        showSuccess('URL del archivo copiada al portapapeles');
    });
}

function deleteFile(publicId, resourceType) {
    if (!confirm('¿Estás seguro de que quieres eliminar este archivo?')) {
        return;
    }
    
    fetch('/delete-file', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ publicId, resourceType })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showSuccess('Archivo eliminado correctamente');
            // Recargar después de un momento
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else {
            throw new Error(data.error);
        }
    })
    .catch(error => {
        showError('Error al eliminar archivo: ' + error.message);
    });
}

// Mobile-specific optimizations
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Prevenir zoom en inputs en iOS
document.addEventListener('DOMContentLoaded', function() {
    if (isMobileDevice()) {
        const inputs = document.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            input.addEventListener('focus', function() {
                // Pequeño delay para asegurar que el zoom no ocurra
                setTimeout(() => {
                    document.body.style.zoom = "1.0";
                }, 100);
            });
        });
    }
});

// Manejar la visibilidad de la página para mobile
document.addEventListener('visibilitychange', function() {
    if (!document.hidden && isMobileDevice()) {
        // La página se ha vuelto visible, forzar redibujado
        document.body.style.display = 'none';
        document.body.offsetHeight; // Trigger reflow
        document.body.style.display = '';
    }
});

// Prevenir comportamiento de pull-to-refresh en mobile
let touchStartY = 0;

document.addEventListener('touchstart', function(e) {
    touchStartY = e.touches[0].clientY;
}, { passive: true });

document.addEventListener('touchmove', function(e) {
    const touchY = e.touches[0].clientY;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    // Si estamos en la parte superior y haciendo scroll hacia abajo, prevenir
    if (scrollTop === 0 && touchY - touchStartY > 0) {
        e.preventDefault();
    }
}, { passive: false });

// Mejorar el rendimiento en mobile
if (isMobileDevice()) {
    // Reducir animaciones en dispositivos lentos
    const style = document.createElement('style');
    style.textContent = `
        @media (prefers-reduced-motion: reduce) {
            * {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
            }
        }
    `;
    document.head.appendChild(style);
}

// Inicializar service worker para funcionalidad offline (opcional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js').then(function(registration) {
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
        }, function(err) {
            console.log('ServiceWorker registration failed: ', err);
        });
    });
}

// Utility function para formatear URLs
function formatUrl(url) {
    if (!url) return '';
    
    // Asegurar que la URL tenga protocolo
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return 'https://' + url;
    }
    
    return url;
}

// Detectar y manejar cambios de orientación en mobile
window.addEventListener('orientationchange', function() {
    // Pequeño delay para permitir que el viewport se ajuste
    setTimeout(() => {
        window.scrollTo(0, 0);
    }, 100);
});

// Mejorar el manejo de teclado en mobile
document.addEventListener('focusout', function(e) {
    if (isMobileDevice() && (e.target.matches('input') || e.target.matches('textarea'))) {
        // Pequeño scroll para asegurar que el input sea visible después del teclado
        setTimeout(() => {
            e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
    }
});