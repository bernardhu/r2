import {
  BrokerAdapter,
  OrderStatus,
  OrderType,
  CashMarginType,
  QuoteSide,
  Order,
  Execution,
  Quote,
  BrokerConfigType
} from '../types';
//import { getLogger } from '@bitr/logger';
import * as _ from 'lodash';
import BrokerApi from './BrokerApi';
import { OrderRequest, OrderResponse } from './types';
import { eRound, toExecution } from '../util';
import ccxt = require('ccxt');

export default class BrokerAdapterImpl implements BrokerAdapter {
  private readonly brokerApi: BrokerApi;
  //private readonly log = getLogger('Huobi.BrokerAdapter');
  readonly broker = 'Okex';

  constructor(private readonly config: BrokerConfigType) {
    this.brokerApi = new BrokerApi(this.config.key, this.config.secret);
  }

  async send(order: Order): Promise<void> {
    if (order.broker !== this.broker) {
      throw new Error();
    }
    const param = this.mapOrderToSendChildOrderRequest(order);
    const reply = await this.brokerApi.sendOrder(param);
    order.brokerOrderId = reply.id;
    order.status = OrderStatus.New;
    order.sentTime = new Date();
    order.lastUpdated = new Date();
  }

  async refresh(order: Order): Promise<void> {
    const orderId = order.brokerOrderId;
    const reply = await this.brokerApi.getOrder(orderId);
    this.setOrderFields(reply, order);

    const executions = await this.brokerApi.getExecutions({ symbol: order.symbol });
    order.executions = 
    _.remove(executions, x => {return x.order == order.id})
    .map(x => {
      const e = toExecution(order);
      e.size = x.amount;
      e.price = x.price;
      e.execTime = new Date(x.timestamp);
      return e as Execution;
    });

    order.lastUpdated = new Date();
  }
  
  async cancel(order: Order): Promise<void> {
    await this.brokerApi.cancelOrder(order.id);
    order.lastUpdated = new Date();
    order.status = OrderStatus.Canceled;
  }

  async getBtcPosition(): Promise<number> {
    const balanceResponse = await this.brokerApi.getBalance();
    const btcBalance = _.get(balanceResponse, 'BTC');
    if (!btcBalance) {
      throw new Error('Btc balance is not found.');
    }
    return btcBalance.free;
  }

  async fetchQuotes(): Promise<Quote[]> {
    const response = await this.brokerApi.getOrderbook();
    return this.mapToQuote(response);
  }

  private mapOrderToSendChildOrderRequest(order: Order): OrderRequest {
    if (order.cashMarginType !== CashMarginType.Cash) {
      throw new Error('Not implemented.');
    }

    let symbol = order.symbol;
    let price = 0;
    let type = '';
    switch (order.type) {
      case OrderType.Limit:
        type = order.type.toLowerCase();
        price = order.price;
        break;
      case OrderType.Market:
        type = order.type.toLowerCase();
        price = 0;
        break;
      default:
        throw new Error('Not implemented.');
    }

    return {
      symbol: symbol,
      type: type,
      side: order.side,
      price: price,
      amount: order.size
    };
  }

  private setOrderFields(childOrder: OrderResponse, order: Order): void {
    order.filledSize = eRound(childOrder.filled);
    if (childOrder.status === 'CANCELED') {
      order.status = OrderStatus.Canceled;
    } else if (childOrder.status === 'EXPIRED') {
      order.status = OrderStatus.Expired;
    } else if (order.filledSize === order.size) {
      order.status = OrderStatus.Filled;
    } else if (order.filledSize > 0) {
      order.status = OrderStatus.PartiallyFilled;
    }
    order.lastUpdated = new Date();
  }

  private mapToQuote(orderBook: ccxt.OrderBook): Quote[] {
    //console.log("okex", orderBook);
    const asks = _(orderBook.asks)
      .take(100)
      .map(q => {
        return { broker: this.broker, side: QuoteSide.Ask, price: Number(q[0]), volume: Number(q[1]) };
      })
      .value();
    const bids = _(orderBook.bids)
      .take(100)
      .map(q => {
        return { broker: this.broker, side: QuoteSide.Bid, price: Number(q[0]), volume: Number(q[1]) };
      })
      .value();
    return _.concat(asks, bids);
  }
} /* istanbul ignore next */