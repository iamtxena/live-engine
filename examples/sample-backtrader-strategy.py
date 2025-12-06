"""
Sample Backtrader Strategy - Simple Moving Average Crossover
This is a basic strategy that buys when short SMA crosses above long SMA
"""

import backtrader as bt

class SmaCrossStrategy(bt.Strategy):
    params = (
        ('sma_short', 10),
        ('sma_long', 30),
        ('size', 0.1),
    )

    def __init__(self):
        self.sma_short = bt.indicators.SMA(self.data.close, period=self.params.sma_short)
        self.sma_long = bt.indicators.SMA(self.data.close, period=self.params.sma_long)
        self.crossover = bt.indicators.CrossOver(self.sma_short, self.sma_long)

    def next(self):
        if not self.position:
            if self.crossover > 0:
                self.buy(size=self.params.size)
        elif self.crossover < 0:
            self.sell(size=self.params.size)

if __name__ == '__main__':
    cerebro = bt.Cerebro()
    cerebro.addstrategy(SmaCrossStrategy)
    # Add data feed here
    cerebro.run()
