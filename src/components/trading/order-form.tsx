'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type OrderFormProps = {
  asset: string;
  currentPrice?: number;
  balance: number;
  onSubmit: (order: {
    side: 'buy' | 'sell';
    type: 'market' | 'limit';
    amount: number;
    price?: number;
  }) => Promise<void>;
};

/**
 * Order entry form for paper trading
 *
 * Usage:
 * ```tsx
 * <OrderForm
 *   asset="btcusdt"
 *   currentPrice={95000}
 *   balance={10000}
 *   onSubmit={handleOrder}
 * />
 * ```
 */
export function OrderForm({ asset, currentPrice, balance, onSubmit }: OrderFormProps) {
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (side: 'buy' | 'sell') => {
    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (orderType === 'limit' && (!price || parseFloat(price) <= 0)) {
      alert('Please enter a valid price for limit order');
      return;
    }

    const orderAmount = parseFloat(amount);
    const orderPrice = orderType === 'limit' ? parseFloat(price) : undefined;

    const totalCost = orderPrice
      ? orderAmount * orderPrice
      : currentPrice
      ? orderAmount * currentPrice
      : 0;

    if (side === 'buy' && totalCost > balance) {
      alert('Insufficient balance');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        side,
        type: orderType,
        amount: orderAmount,
        price: orderPrice,
      });

      setAmount('');
      setPrice('');
    } catch (error) {
      console.error('Order submission error:', error);
      alert(error instanceof Error ? error.message : 'Failed to place order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const estimatedTotal = () => {
    const amt = parseFloat(amount) || 0;
    const prc = orderType === 'market'
      ? currentPrice || 0
      : parseFloat(price) || 0;
    return amt * prc;
  };

  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">Place Order - {asset.toUpperCase().replace('USDT', '/USDT')}</h3>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <Select
            value={orderType}
            onValueChange={(value) => setOrderType(value as 'market' | 'limit')}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="market">Market</SelectItem>
              <SelectItem value="limit">Limit</SelectItem>
            </SelectContent>
          </Select>

          <div className="text-sm text-muted-foreground flex items-center justify-end">
            Balance: {formatCurrency(balance)}
          </div>
        </div>

        {currentPrice && (
          <div className="text-sm">
            <span className="text-muted-foreground">Current Price: </span>
            <span className="font-medium">{formatCurrency(currentPrice)}</span>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            type="number"
            step="0.0001"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        {orderType === 'limit' && (
          <div className="space-y-2">
            <Label htmlFor="price">Price (USDT)</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
        )}

        {amount && (
          <div className="text-sm p-2 bg-muted rounded">
            <span className="text-muted-foreground">Total: </span>
            <span className="font-medium">{formatCurrency(estimatedTotal())}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 pt-2">
          <Button
            onClick={() => handleSubmit('buy')}
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? 'Placing...' : 'Buy'}
          </Button>
          <Button
            onClick={() => handleSubmit('sell')}
            disabled={isSubmitting}
            variant="destructive"
          >
            {isSubmitting ? 'Placing...' : 'Sell'}
          </Button>
        </div>
      </div>
    </Card>
  );
}
