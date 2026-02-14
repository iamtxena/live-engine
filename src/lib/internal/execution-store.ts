import type {
  DeploymentContract,
  DeploymentStatus,
  OrderContract,
  OrderStatus,
  PortfolioContract,
} from '@/lib/types/execution-contract';

interface CreateDeploymentInput {
  strategyId: string;
  mode: 'paper' | 'live';
  capital: number;
}

interface PlaceOrderInput {
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit';
  quantity: number;
  price: number | null;
  deploymentId: string | null;
}

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function cloneContract<T>(value: T): T {
  return structuredClone(value);
}

let deploymentCounter = 2;
let orderCounter = 2;

const deployments = new Map<string, DeploymentContract>();
const orders = new Map<string, OrderContract>();
const portfolios = new Map<string, PortfolioContract>();

function seedStore(): void {
  deployments.clear();
  orders.clear();
  portfolios.clear();
  deploymentCounter = 2;
  orderCounter = 2;

  deployments.set('dep-001', {
    id: 'dep-001',
    strategyId: 'strat-001',
    mode: 'paper',
    status: 'running',
    capital: 20000,
    providerRefId: 'live-dep-001',
    latestPnl: 120.25,
    createdAt: '2026-02-13T20:00:00Z',
    updatedAt: '2026-02-14T10:00:00Z',
  });

  orders.set('ord-001', {
    id: 'ord-001',
    providerOrderId: 'live-order-001',
    symbol: 'BTCUSDT',
    side: 'buy',
    type: 'limit',
    quantity: 0.1,
    price: 64800,
    status: 'pending',
    deploymentId: 'dep-001',
    createdAt: '2026-02-14T10:02:00Z',
  });

  portfolios.set('portfolio-paper-001', {
    id: 'portfolio-paper-001',
    mode: 'paper',
    cash: 12450.75,
    totalValue: 20891.12,
    pnlTotal: 891.12,
    positions: [
      {
        symbol: 'BTCUSDT',
        quantity: 0.3,
        avgPrice: 62000,
        currentPrice: 64800,
        unrealizedPnl: 840,
      },
    ],
  });
}

seedStore();

function nextDeploymentId(): string {
  const id = `dep-${String(deploymentCounter).padStart(3, '0')}`;
  deploymentCounter += 1;
  return id;
}

function nextOrderId(): string {
  const id = `ord-${String(orderCounter).padStart(3, '0')}`;
  orderCounter += 1;
  return id;
}

function nextProviderOrderId(orderId: string): string {
  return `live-order-${orderId.replace(/^ord-/, '')}`;
}

function findDeployment(identifier: string): DeploymentContract | undefined {
  const direct = deployments.get(identifier);
  if (direct) {
    return direct;
  }
  for (const deployment of deployments.values()) {
    if (deployment.providerRefId === identifier) {
      return deployment;
    }
  }
  return undefined;
}

function findOrder(identifier: string): OrderContract | undefined {
  const direct = orders.get(identifier);
  if (direct) {
    return direct;
  }
  for (const order of orders.values()) {
    if (order.providerOrderId === identifier) {
      return order;
    }
  }
  return undefined;
}

export function createDeployment(input: CreateDeploymentInput): DeploymentContract {
  const id = nextDeploymentId();
  const now = nowIso();
  const deployment: DeploymentContract = {
    id,
    strategyId: input.strategyId,
    mode: input.mode,
    status: 'queued',
    capital: input.capital,
    providerRefId: `live-${id}`,
    latestPnl: null,
    createdAt: now,
    updatedAt: now,
  };
  deployments.set(id, deployment);
  return cloneContract(deployment);
}

export function listDeployments(status?: string | null): DeploymentContract[] {
  const items = Array.from(deployments.values());
  const filtered = status ? items.filter((item) => item.status === status) : items;
  return filtered.map((item) => cloneContract(item));
}

export function getDeployment(identifier: string): DeploymentContract | null {
  const deployment = findDeployment(identifier);
  return deployment ? cloneContract(deployment) : null;
}

export function stopDeployment(identifier: string): DeploymentContract | null {
  const deployment = findDeployment(identifier);
  if (!deployment) {
    return null;
  }
  deployment.status = mapStopTransition(deployment.status);
  deployment.updatedAt = nowIso();
  return cloneContract(deployment);
}

function mapStopTransition(current: DeploymentStatus): DeploymentStatus {
  if (current === 'stopped' || current === 'failed') {
    return current;
  }
  return 'stopping';
}

export function placeOrder(input: PlaceOrderInput): OrderContract {
  const id = nextOrderId();
  const order: OrderContract = {
    id,
    providerOrderId: nextProviderOrderId(id),
    symbol: input.symbol,
    side: input.side,
    type: input.type,
    quantity: input.quantity,
    price: input.price,
    status: 'pending',
    deploymentId: input.deploymentId,
    createdAt: nowIso(),
  };
  orders.set(id, order);
  return cloneContract(order);
}

export function listOrders(status?: string | null): OrderContract[] {
  const items = Array.from(orders.values());
  const filtered = status ? items.filter((item) => item.status === status) : items;
  return filtered.map((item) => cloneContract(item));
}

export function getOrder(identifier: string): OrderContract | null {
  const order = findOrder(identifier);
  return order ? cloneContract(order) : null;
}

export function cancelOrder(identifier: string): OrderContract | null {
  const order = findOrder(identifier);
  if (!order) {
    return null;
  }
  order.status = mapCancelTransition(order.status);
  return cloneContract(order);
}

export function mapCancelTransition(current: OrderStatus): OrderStatus {
  if (current === 'filled' || current === 'cancelled' || current === 'rejected' || current === 'failed') {
    return current;
  }
  return 'cancelled';
}

export function listPortfolios(): PortfolioContract[] {
  return Array.from(portfolios.values()).map((item) => cloneContract(item));
}

export function getPortfolio(portfolioId: string): PortfolioContract | null {
  const portfolio = portfolios.get(portfolioId);
  return portfolio ? cloneContract(portfolio) : null;
}

export function resetExecutionStore(): void {
  seedStore();
}
