import ccxt = require('ccxt');
import {
  OrderRequest,
  OrderRequestResponse,
  OrderResponse,
  ExecutionsParam,
} from './types';

export default class BrokerApi {
  private readonly exchange;

  constructor(private readonly key: string, private readonly secret: string) {
    this.exchange = new ccxt.okex({
      apiKey: this.key,
      secret: this.secret,
    });
  }

  async sendOrder(request: OrderRequest): Promise<OrderRequestResponse> {
    return await this.exchange.createOrder(request.symbol, 
      request.type, request.side, request.amount.toString()) ;
  }

  async getOrder(id: string): Promise<OrderResponse> {
    return await this.exchange.fetchOrder(id);
  }

  async cancelOrder(id: string): Promise<OrderRequestResponse> {
    return await this.exchange.cancelOrder(id);
  }

  async getExecutions(param: ExecutionsParam): Promise<ccxt.Trade[]> {
    return await this.exchange.fetchTrades(param.symbol, param.since, param.limit);
  }

  async getBalance(): Promise<ccxt.Balances> {
    return await this.exchange.fetchBalance();
  }

  async getOrderbook(): Promise<ccxt.OrderBook> {
    return await this.exchange.fetchOrderBook('BTC/USDT');
  }
}
