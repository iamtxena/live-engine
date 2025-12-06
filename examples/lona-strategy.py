class HurstCycleBottoms(bt.Strategy):
    params = (
        ("P", 40),  # Cycle length
        ("envPct", 2.0),  # Envelope %
        ("confirmBars", 1),  # How many bars to confirm the cross up
        ("minSpaceFrac", 0.33),  # Minimum spacing as fraction of P
        ("risk_pct", 0.02),  # Risk percent per trade (2%)
        ("max_risk_perc", 0.05),  # Max distance from entry to SL as max % of price (to avoid oversized positions)
    )

    def __init__(self):
        self.ma = bt.indicators.SMA(self.data.close, period=self.p.P)
        self.lower_env = self.ma * (1.0 - self.p.envPct / 100.0)
        self.cross_up = bt.indicators.CrossOver(self.data.close, self.ma)
        self.cross_down = bt.indicators.CrossOver(self.ma, self.data.close)

        self.order = None
        self.last_signal_bar = None
        self.entry_price = None
        self.stop_loss_price = None

        self.register_tracked_variables(
            [
                {"name": "last_signal_bar"},
                {"name": "entry_price", "data": self.data},
                {"name": "stop_loss_price", "data": self.data},
            ]
        )

    def notify_order(self, order):
        if not order.alive():
            self.order = None
        if order.status == order.Completed and order.isbuy():
            self.entry_price = order.executed.price
            # Set stop loss price based on the lower envelope at entry bar as a conservative SL
            self.stop_loss_price = min(self.data.low[-1], self.lower_env[-1])

    def calculate_position_size(self, stop_loss):
        """
        Calculate position size based on risk % and stop loss level
        """
        if stop_loss >= self.entry_price:
            return 0  # invalid stop loss; no position

        cash = self.broker.getcash()
        risk_amount = cash * self.p.risk_pct
        risk_per_unit = self.entry_price - stop_loss
        if risk_per_unit <= 0:
            return 0

        size = int(risk_amount / risk_per_unit)

        # If the stop loss distance is too large, limit position size
        max_distance = self.entry_price * self.p.max_risk_perc
        if (self.entry_price - stop_loss) > max_distance:
            size = int(risk_amount / max_distance)

        # Prevent zero or negative size
        if size <= 0:
            size = 1

        return size

    def next(self):
        if len(self) < max(self.p.P, self.p.confirmBars + 1):
            return

        bar_index = len(self) - 1

        # Relax condition: allow price just touching or slightly below lower envelope
        dipped = self.data.low[0] <= self.lower_env[0] * 1.005  # 0.5% tolerance

        # Cross up confirmation allowance: current or confirmBars ago
        if self.p.confirmBars == 0:
            cross_up_confirmed = self.cross_up[0] > 0
        else:
            if len(self) > self.p.confirmBars:
                cross_up_confirmed = self.cross_up[-self.p.confirmBars] > 0
            else:
                cross_up_confirmed = False

        min_bars_between = max(1, int(round(self.p.P * self.p.minSpaceFrac)))
        spacing_ok = (self.last_signal_bar is None) or (bar_index - self.last_signal_bar > min_bars_between)

        bottom_signal = dipped and cross_up_confirmed and spacing_ok

        pos = self.getposition(data=self.data)

        if self.order:
            return

        # Check if not in position, enter long on bottom_signal
        if not pos and bottom_signal:
            # Set a temporary entry price as current close
            self.entry_price = self.data.close[0]

            # Calculate stop loss price as the lower envelope (or slightly below to allow margin)
            self.stop_loss_price = self.lower_env[0]

            size = self.calculate_position_size(self.stop_loss_price)

            if size > 0:
                self.order = self.buy(data=self.data, size=size)
                self.last_signal_bar = bar_index

        # Exit position on cross down or if price hits stop loss
        elif pos:
            # Exit if price crosses below MA
            if self.cross_down[0] > 0:
                self.order = self.close(data=self.data)

            # Or exit if stop loss triggered
            elif self.data.close[0] <= self.stop_loss_price:
                self.order = self.close(data=self.data)

        # Reset tracked variables if no position
        if not pos:
            self.entry_price = None
            self.stop_loss_price = None
