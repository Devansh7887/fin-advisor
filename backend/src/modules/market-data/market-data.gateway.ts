import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { MarketDataService } from './market-data.service';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/market-data',
})
export class MarketDataGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MarketDataGateway.name);
  private subscriptions = new Map<string, Set<string>>();
  private intervals = new Map<string, NodeJS.Timeout>();

  constructor(private marketDataService: MarketDataService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    this.subscriptions.set(client.id, new Set());
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    
    // Clean up subscriptions
    const clientSymbols = this.subscriptions.get(client.id);
    if (clientSymbols) {
      clientSymbols.forEach(symbol => {
        this.checkAndStopPriceFeed(symbol);
      });
      this.subscriptions.delete(client.id);
    }
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { symbols: string[] },
  ) {
    const { symbols } = data;
    const clientSymbols = this.subscriptions.get(client.id);

    symbols.forEach(symbol => {
      const upperSymbol = symbol.toUpperCase();
      clientSymbols.add(upperSymbol);
      this.logger.log(`Client ${client.id} subscribed to ${upperSymbol}`);
      
      // Start price feed if not already running
      this.startPriceFeed(upperSymbol);
    });

    return { success: true, subscribed: Array.from(clientSymbols) };
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { symbols: string[] },
  ) {
    const { symbols } = data;
    const clientSymbols = this.subscriptions.get(client.id);

    symbols.forEach(symbol => {
      const upperSymbol = symbol.toUpperCase();
      clientSymbols.delete(upperSymbol);
      this.logger.log(`Client ${client.id} unsubscribed from ${upperSymbol}`);
      
      // Stop price feed if no one is subscribed
      this.checkAndStopPriceFeed(upperSymbol);
    });

    return { success: true, subscribed: Array.from(clientSymbols) };
  }

  private startPriceFeed(symbol: string) {
    // Don't start if already running
    if (this.intervals.has(symbol)) {
      return;
    }

    this.logger.log(`Starting price feed for ${symbol}`);

    // Fetch immediately
    this.fetchAndBroadcast(symbol);

    // Then fetch every 15 seconds
    const interval = setInterval(() => {
      this.fetchAndBroadcast(symbol);
    }, 15000);

    this.intervals.set(symbol, interval);
  }

  private async fetchAndBroadcast(symbol: string) {
    try {
      const quote = await this.marketDataService.getQuote(symbol);
      
      // Broadcast to all clients subscribed to this symbol
      this.server.emit(`price:${symbol}`, {
        symbol: quote.symbol,
        price: quote.price,
        change: quote.change,
        changePercent: quote.changePercent,
        timestamp: quote.timestamp,
      });

      this.logger.debug(`Broadcasted price for ${symbol}: $${quote.price}`);
    } catch (error) {
      this.logger.error(`Error fetching price for ${symbol}`, error);
    }
  }

  private checkAndStopPriceFeed(symbol: string) {
    // Check if any client is still subscribed to this symbol
    let hasSubscribers = false;
    
    for (const [clientId, symbols] of this.subscriptions.entries()) {
      if (symbols.has(symbol)) {
        hasSubscribers = true;
        break;
      }
    }

    // Stop the feed if no subscribers
    if (!hasSubscribers && this.intervals.has(symbol)) {
      this.logger.log(`Stopping price feed for ${symbol}`);
      clearInterval(this.intervals.get(symbol));
      this.intervals.delete(symbol);
    }
  }
}
