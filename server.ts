import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';

// Ensure upload directories exist
const galleryBase = path.join(process.cwd(), 'public', 'uploads', 'galeria');
const dirs = [
  path.join(process.cwd(), 'public', 'uploads', 'empresa'),
  path.join(galleryBase, 'cupom_saudacao'),
  path.join(galleryBase, 'clientes'),
  path.join(galleryBase, 'produtos')
];

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configuração do Multer Melhorada
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const category = req.query.category as string;
    let dest = path.join(process.cwd(), 'public', 'uploads');
    
    if (category === 'logo') dest = path.join(dest, 'empresa');
    else if (category === 'greeting') dest = path.join(galleryBase, 'cupom_saudacao');
    else if (category === 'customer') dest = path.join(galleryBase, 'clientes');
    else if (category === 'product') dest = path.join(galleryBase, 'produtos');
    else dest = path.join(dest, 'cupom'); // fallback

    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const category = req.query.category as string || 'gen';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${category}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  app.use(express.json({ limit: '50mb' }));

  // CORS Middleware First
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
  });

  // Logger para depuração
  app.use((req, _res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  // Endpoint de Teste
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Endpoint de Upload para Imagens e Empresa
  app.post('/api/upload', (req, res, next) => {
    upload.single('image')(req, res, (err) => {
      if (err) {
        console.error('Multer error:', err);
        return res.status(400).json({ error: `Erro no upload (multer): ${err.message}` });
      }
      next();
    });
  }, (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Nenhuma imagem enviada' });
    
    console.log('Arquivo recebido:', req.file.filename);
    
    // Construir a URL pública baseada no destino real
    const category = req.query.category as string;
    let publicPath = '/uploads/';
    
    if (category === 'logo') publicPath += 'empresa/';
    else if (category === 'greeting') publicPath += 'galeria/cupom_saudacao/';
    else if (category === 'customer') publicPath += 'galeria/clientes/';
    else if (category === 'product') publicPath += 'galeria/produtos/';
    else publicPath += 'cupom/';

    res.json({ url: `${publicPath}${req.file.filename}` });
  });

  // Manter compatibilidade com endpoints antigos (opcional, mas bom)
  app.post('/api/upload/coupon-bg', upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Nenhuma imagem enviada' });
    res.json({ url: `/uploads/cupom/${req.file.filename}` });
  });

  // Endpoint de Upload para Emojis Personalizados
  app.post('/api/upload/emoji', upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Nenhum emoji enviado' });
    res.json({ url: `/uploads/emojis/${req.file.filename}` });
  });

  // Servir arquivos estáticos ANTES do handler de 404
  app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));

  // Error handling para multer e outros erros de API
  app.use('/api', (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('API SERVER ERROR:', err);
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Arquivo muito grande. Máximo 10MB.' });
      }
      return res.status(400).json({ error: `Erro no upload: ${err.message}` });
    }
    res.status(500).json({ error: 'Erro interno do servidor', message: err.message });
  });

  app.all('/api/*', (_req, res) => {
    res.status(404).json({ error: 'API route not found' });
  });

  // Vite integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n=================================================`);
    console.log(`🚀 SERVIDOR LOCAL PDV RODANDO`);
    console.log(`🌐 Endereço: http://localhost:${PORT}`);
    console.log(`📂 Dados em: local-sync-data.json`);
    console.log(`=================================================\n`);
  });
}

startServer();
