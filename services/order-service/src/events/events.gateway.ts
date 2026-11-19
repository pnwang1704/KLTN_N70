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

  private getBranchRoom(branchId: string): string {
    const cleanId = String(branchId || '1').replace(/^branch_/, '');
    return `branch_${cleanId}`;
  }

  @SubscribeMessage('joinBranchRoom')
  handleJoinBranchRoom(
    @MessageBody() branchId: string,
    @ConnectedSocket() client: Socket,
  ) {
    const targetRoom = this.getBranchRoom(branchId);
    // Rời khỏi các room chi nhánh cũ nếu client chuyển chi nhánh trên cùng kết nối socket
    for (const room of client.rooms) {
      if (room.startsWith('branch_') && room !== targetRoom) {
        client.leave(room);
      }
    }
    client.join(targetRoom);
    console.log(`Client ${client.id} joined room: ${targetRoom}`);
    return { event: 'joinedRoom', data: targetRoom };
  }

  emitNewOrder(branchId: string, orderData: any) {
    const room = this.getBranchRoom(branchId);
    this.server.to(room).emit('NEW_ORDER_CREATED', orderData);
    this.server.to(room).emit('newOrder', orderData);
  }

  emitQrOrderPending(branchId: string, orderData: any) {
    this.server.to(this.getBranchRoom(branchId)).emit('QR_ORDER_PENDING', orderData);
  }

  emitQrOrderUpdated(
    branchId: string,
    payload: { orderId: string; branchId: string; tableId?: string; status: string; reason?: string; order?: any },
  ) {
    this.server.to(this.getBranchRoom(branchId)).emit('QR_ORDER_UPDATED', payload);
  }

  emitItemReady(branchId: string, itemData: any) {
    this.server.to(this.getBranchRoom(branchId)).emit('ITEM_READY', itemData);
  }

  emitOrderPaid(branchId: string, payload: any) {
    this.server.to(this.getBranchRoom(branchId)).emit('order:paid', payload);
  }

  emitTableCompleted(branchId: string, payload: { branchId: string; tableId: string; orderId?: string; orderIds?: string[] }) {
    this.server.to(this.getBranchRoom(branchId)).emit('table:completed', payload);
  }

  emitOrderUpdated(branchId: string, orderData: any) {
    this.server.to(this.getBranchRoom(branchId)).emit('orderUpdated', orderData);
  }

  emitOrderCancelled(branchId: string, payload: { orderId: string; branchId: string; tableId?: string; status: string; cancelReason?: string; cancelledBy?: string; order?: any }) {
    this.server.to(this.getBranchRoom(branchId)).emit('orderCancelled', payload);
  }
}

