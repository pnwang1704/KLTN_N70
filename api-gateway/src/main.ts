import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { RpcExceptionFilter } from './common/filters/rpc-exception.filter';
import { createProxyMiddleware } from 'http-proxy-middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const allowedOrigins: (string | RegExp)[] = [
    /\.vercel\.app$/,
    /\.ngrok-free\.app$/,
    /\.ngrok\.io$/,
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    ...(process.env.FRONTEND_URL
      ? process.env.FRONTEND_URL.split(',').map((url) => url.trim())
      : []),
  ];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.useGlobalFilters(new RpcExceptionFilter());

  // Proxy WebSocket & Socket.IO requests ('/socket.io') sang Order Service
  const orderServiceTarget = process.env.ORDER_SERVICE_URL || 'http://localhost:3004';
  const socketProxy = createProxyMiddleware({
    target: orderServiceTarget,
    changeOrigin: true,
    ws: true,
    pathFilter: '/socket.io',
  });

  app.use(socketProxy);

  const server = app.getHttpServer();
  server.on('upgrade', (req: any, socket: any, head: any) => {
    if (req.url?.startsWith('/socket.io')) {
      socketProxy.upgrade(req, socket, head);
    }
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
