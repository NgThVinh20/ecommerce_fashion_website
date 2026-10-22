import express from 'express';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Đọc dữ liệu JSON trong body của request
app.use(express.json());

// API kiểm tra server còn sống
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
