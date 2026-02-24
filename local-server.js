import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(express.json());

// 模拟 ESA 的 API 鉴权逻辑
app.post('/api/auth', (req, res) => {
    const { password } = req.body;
    const APP_PASSWORD = process.env.APP_PASSWORD;

    console.log(`[Auth] Attempt with password: ${password}`);

    if (!APP_PASSWORD || password === APP_PASSWORD) {
        return res.json({ success: true });
    }

    res.status(401).json({ success: false, message: 'Invalid password' });
});

// 托管静态文件
app.use(express.static('dist'));

app.listen(port, () => {
    console.log(`
  🚀 Local Test Server running at:
  http://localhost:${port}
  
  Using password from .env: ${process.env.APP_PASSWORD || '(Not Set)'}
  `);
});
