import { Response } from 'express';

class StreamService {
  private clients: Set<Response> = new Set();

  public addClient(res: Response): void {
    this.clients.add(res);
    console.log(`🔌 [Stream] Client connected. Active clients: ${this.clients.size}`);
  }

  public removeClient(res: Response): void {
    this.clients.delete(res);
    console.log(`🔌 [Stream] Client disconnected. Active clients: ${this.clients.size}`);
  }

  public broadcast(eventType: string, data: any): void {
    const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of this.clients) {
      try {
        client.write(payload);
      } catch (err) {
        this.clients.delete(client);
      }
    }
  }
}

export const streamService = new StreamService();
