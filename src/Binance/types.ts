// tslint:disable:variable-name
import { Castable, cast } from '@bitr/castable';

export interface OrderRequest {
  symbol: string;
  type: string;
  side: string;
  price: number;
  amount: number;
}

export class OrderRequestResponse extends Castable {
  id: string;
}

export class OrderResponse extends Castable {
  @cast id: string;
  @cast symbol: string;
  @cast side: string;
  @cast type: string;
  @cast price: number;
  @cast average: number;
  @cast amount: number;
  @cast status: string;
  @cast filled: number; //已成交数量
  @cast cost: number; //已成交金额
  @cast remaining: number;//未成交数量
}

export interface ExecutionsParam {
  symbol: string;
  limit?: number;
  since?: number;
  order_id?: string;
}