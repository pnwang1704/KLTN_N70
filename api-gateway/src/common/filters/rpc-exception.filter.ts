import { Catch, ExceptionFilter, ArgumentsHost, HttpStatus, HttpException } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class RpcExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    console.error('[RpcExceptionFilter caught]:', exception);
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // Nếu là HttpException chuẩn từ NestJS (JwtAuthGuard, RolesGuard, ValidationPipe...)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      return response.status(status).json(typeof res === 'object' ? res : { statusCode: status, message: res });
    }

    // Nếu là lỗi từ RPC/Microservices ném về (qua amqplib / ClientProxy)
    const rpcError = typeof exception?.getError === 'function' ? exception.getError() : exception;

    const rawStatus =
      rpcError?.statusCode ??
      (typeof rpcError?.status === 'number' ? rpcError.status : undefined) ??
      (typeof exception?.status === 'number' ? exception.status : undefined);

    const status =
      typeof rawStatus === 'number' && rawStatus >= 100 && rawStatus <= 599
        ? rawStatus
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      rpcError?.message ||
      (Array.isArray(exception?.response?.message) ? exception.response.message.join(', ') : exception?.message) ||
      'Internal server error';

    const errorName = rpcError?.error || (status >= 500 ? 'Internal Server Error' : 'Request Error');

    return response.status(status).json({
      statusCode: status,
      message: message,
      error: errorName,
    });
  }
}
