import { Catch, ExceptionFilter, ArgumentsHost, HttpStatus } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Response } from 'express';

@Catch(RpcException)
export class RpcExceptionFilter implements ExceptionFilter {
  catch(exception: RpcException, host: ArgumentsHost) {
    const error: any = exception.getError();
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status = error?.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
    const message = error?.message || 'Internal server error from microservice';

    response.status(status).json({
      statusCode: status,
      message: message,
      error: error?.error || 'Rpc Error',
    });
  }
}
