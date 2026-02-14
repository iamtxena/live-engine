export type DeploymentStatus =
  | 'queued'
  | 'running'
  | 'paused'
  | 'stopping'
  | 'stopped'
  | 'failed';

export type OrderStatus = 'pending' | 'filled' | 'cancelled' | 'rejected' | 'failed';

export interface DeploymentContract {
  id: string;
  strategyId: string;
  mode: 'paper' | 'live';
  status: DeploymentStatus;
  capital: number;
  providerRefId: string;
  latestPnl: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderContract {
  id: string;
  providerOrderId: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit';
  quantity: number;
  price: number | null;
  status: OrderStatus;
  deploymentId: string | null;
  createdAt: string;
}

export interface PortfolioPositionContract {
  symbol: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
}

export interface PortfolioContract {
  id: string;
  mode: 'paper' | 'live';
  cash: number;
  totalValue: number;
  pnlTotal: number | null;
  positions: PortfolioPositionContract[];
}
