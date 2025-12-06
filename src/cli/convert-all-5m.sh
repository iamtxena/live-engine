#!/bin/bash

cd /Users/txena/sandbox/16.enjoy/live-engine

echo "🔄 Converting all 5m CSV files to Lona format..."
echo ""

count=0
for file in data/binance/btcusdt/5m/BTCUSDT-5m-*.csv; do
  # Skip already converted files
  if [[ "$file" =~ -lona\.csv$ ]]; then
    continue
  fi

  basename_file=$(basename "$file")
  echo "[$((count + 1))] Converting: $basename_file"

  pnpm tsx src/cli/convert-binance-csv.ts "$file" btcusdt "${file%.csv}-lona.csv" 2>&1 | grep -E "(✓|📊)"

  count=$((count + 1))
done

echo ""
echo "✅ Converted $count files to Lona format!"
