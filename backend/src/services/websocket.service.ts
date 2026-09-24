import type { WebSocket } from 'ws';

export interface WebSocketEventMessage {
  type: 'new_photo' | 'photo_liked' | 'connection_ack' | 'ping' | 'pong';
  data?: any;
  photo?: any;
}

class LiveVaultWsManager {
  // Map of eventId (string) -> Set of active WebSockets
  private rooms: Map<string, Set<WebSocket>> = new Map();

  /**
   * Adds a WebSocket connection to an event room
   */
  public addSubscriber(eventId: string | number, socket: WebSocket): void {
    const key = String(eventId);
    if (!this.rooms.has(key)) {
      this.rooms.set(key, new Set());
    }

    const room = this.rooms.get(key)!;
    room.add(socket);

    // Send connection acknowledgement
    try {
      if (socket.readyState === 1 /* OPEN */) {
        socket.send(
          JSON.stringify({
            type: 'connection_ack',
            data: {
              eventId: key,
              message: `Subscribed to live updates for event ${key}`,
              timestamp: new Date().toISOString(),
            },
          })
        );
      }
    } catch {
      // Ignore initial send error
    }

    // Auto cleanup on close or error
    socket.on('close', () => {
      this.removeSubscriber(key, socket);
    });

    socket.on('error', () => {
      this.removeSubscriber(key, socket);
    });
  }

  /**
   * Removes a WebSocket connection from an event room
   */
  public removeSubscriber(eventId: string | number, socket: WebSocket): void {
    const key = String(eventId);
    const room = this.rooms.get(key);
    if (room) {
      room.delete(socket);
      if (room.size === 0) {
        this.rooms.delete(key);
      }
    }
  }

  /**
   * Broadcasts a message to all active subscribers of an event
   */
  public broadcastToEvent(eventId: string | number, payload: WebSocketEventMessage): void {
    const key = String(eventId);
    const room = this.rooms.get(key);
    if (!room || room.size === 0) return;

    const serialized = JSON.stringify(payload);
    const deadSockets: WebSocket[] = [];

    for (const socket of room) {
      try {
        if (socket.readyState === 1 /* OPEN */) {
          socket.send(serialized);
        } else if (socket.readyState === 2 || socket.readyState === 3 /* CLOSING / CLOSED */) {
          deadSockets.push(socket);
        }
      } catch {
        deadSockets.push(socket);
      }
    }

    // Prune disconnected sockets
    for (const dead of deadSockets) {
      room.delete(dead);
    }
    if (room.size === 0) {
      this.rooms.delete(key);
    }
  }

  /**
   * Returns count of active connections for an event
   */
  public getSubscriberCount(eventId: string | number): number {
    const key = String(eventId);
    return this.rooms.get(key)?.size || 0;
  }
}

export const wsManager = new LiveVaultWsManager();
