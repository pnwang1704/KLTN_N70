import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class EventsGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('joinBranchRoom')
  handleJoinBranchRoom(
    @MessageBody() branchId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(branchId);
    console.log(`Client ${client.id} joined room: ${branchId}`);
    return { event: 'joinedRoom', data: branchId };
  }

  emitNewOrder(branchId: string, orderData: any) {
    this.server.to(branchId).emit('NEW_ORDER_CREATED', orderData);
  }

  emitItemReady(branchId: string, itemData: any) {
    this.server.to(branchId).emit('ITEM_READY', itemData);
  }

  emitOrderPaid(branchId: string, payload: any) {
    this.server.to(branchId).emit('order:paid', payload);
  }
}
