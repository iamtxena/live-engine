#!/bin/bash

cd /Users/txena/sandbox/16.enjoy/live-engine

echo "🔄 Converting all CSV files to Lona format..."
echo ""

count=0
for file in data/binance/btcusdt/1m/BTCUSDT-1m-*.csv; do
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
echo ""
echo "📂 Files available in: data/binance/btcusdt/1m/"
ls -lh data/binance/btcusdt/1m/*-lona.csv | wc -l | xargs echo "Total Lona CSV files:"
