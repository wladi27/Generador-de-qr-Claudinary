# Generador de QR con Cloudinary

App web para subir archivos a Cloudinary y generar códigos QR desde la URL resultante o desde cualquier URL personalizada.

## Requisitos

- Node.js >= 14
- Cuenta de Cloudinary

## Instalación

```bash
npm install
```

## Configuración

1. Copia el ejemplo de variables de entorno:

```bash
cp .env.example .env
```

2. Completa los valores reales en `.env`.

Variables requeridas:

- `PORT` (opcional, por defecto 3000)
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

## Cómo obtener las credenciales de Cloudinary

1. Crea una cuenta o inicia sesión en https://cloudinary.com.
2. En el panel principal (Dashboard) encontrarás:
   - **Cloud name**
   - **API Key**
   - **API Secret**
3. Copia esos valores en tu archivo `.env`.

> Importante: nunca publiques tu `API Secret` en repositorios públicos.

## Ejecutar la app

Modo normal:

```bash
npm start
```

Modo desarrollo (reinicio automático):

```bash
npm run dev
```

Luego abre en el navegador:

- http://localhost:3000

## Uso rápido

1. **Subir a Cloudinary**: selecciona un archivo y súbelo.
2. **Generar QR**: usa la URL de Cloudinary o pega una URL personalizada.
3. **Descargar QR**: usa la opción de descarga desde la interfaz.

## Endpoints útiles

- `GET /` interfaz principal
- `GET /files` lista archivos recientes
- `GET /health` estado básico del servidor
