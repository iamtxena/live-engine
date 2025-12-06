#!/bin/bash

# Bulk download historical data from Binance Data Portal
# Much faster than API approach!
#
# Usage: ./src/cli/bulk-download.sh btcusdt 1m 2025-10-01 2025-11-23

SYMBOL=${1:-btcusdt}
INTERVAL=${2:-1m}
START_DATE=${3:-2025-10-01}
END_DATE=${4:-2025-11-23}

SYMBOL_UPPER=$(echo "$SYMBOL" | tr '[:lower:]' '[:upper:]')
BASE_URL="https://data.binance.vision/data/spot"
OUTPUT_DIR="data/binance/${SYMBOL}/${INTERVAL}"

mkdir -p "$OUTPUT_DIR"

echo "📥 Downloading ${SYMBOL_UPPER} ${INTERVAL} data from ${START_DATE} to ${END_DATE}..."
echo "📂 Output directory: ${OUTPUT_DIR}"
echo ""

# Parse dates
START_YEAR=$(date -j -f "%Y-%m-%d" "$START_DATE" "+%Y")
START_MONTH=$(date -j -f "%Y-%m-%d" "$START_DATE" "+%m")
END_YEAR=$(date -j -f "%Y-%m-%d" "$END_DATE" "+%Y")
END_MONTH=$(date -j -f "%Y-%m-%d" "$END_DATE" "+%m")

# Download monthly files
echo "📦 Downloading monthly archives..."
current_year=$START_YEAR
current_month=$START_MONTH

while [ "$current_year" -le "$END_YEAR" ]; do
  while [ "$current_month" -le 12 ]; do
    # Stop if we've passed the end date
    if [ "$current_year" -eq "$END_YEAR" ] && [ "$current_month" -gt "$END_MONTH" ]; then
      break
    fi

    month_str=$(printf "%02d" $current_month)
    filename="${SYMBOL_UPPER}-${INTERVAL}-${current_year}-${month_str}.zip"
    url="${BASE_URL}/monthly/klines/${SYMBOL_UPPER}/${INTERVAL}/${filename}"

    echo "  Downloading ${filename}..."
    curl -f -L -o "${OUTPUT_DIR}/${filename}" "$url" 2>/dev/null

    if [ $? -eq 0 ]; then
      echo "  ✓ Downloaded ${filename}"
    else
      echo "  ⚠️  ${filename} not available (might not exist yet)"
    fi

    current_month=$((current_month + 1))
  done

  current_year=$((current_year + 1))
  current_month=1

  # Break if we've finished
  if [ "$current_year" -gt "$END_YEAR" ]; then
    break
  fi
done

# Download daily files for the current/end month
echo ""
echo "📅 Downloading daily files for ${END_YEAR}-${END_MONTH}..."

# Get days in the month
end_day=$(date -j -f "%Y-%m-%d" "$END_DATE" "+%d")
start_day=1

# If start and end are in same month, use actual start day
if [ "$START_YEAR" -eq "$END_YEAR" ] && [ "$START_MONTH" -eq "$END_MONTH" ]; then
  start_day=$(date -j -f "%Y-%m-%d" "$START_DATE" "+%d")
fi

for day in $(seq $start_day $end_day); do
  day_str=$(printf "%02d" $day)
  month_str=$(printf "%02d" $END_MONTH)
  filename="${SYMBOL_UPPER}-${INTERVAL}-${END_YEAR}-${month_str}-${day_str}.zip"
  url="${BASE_URL}/daily/klines/${SYMBOL_UPPER}/${INTERVAL}/${filename}"

  echo "  Downloading ${filename}..."
  curl -f -L -o "${OUTPUT_DIR}/${filename}" "$url" 2>/dev/null

  if [ $? -eq 0 ]; then
    echo "  ✓ Downloaded ${filename}"
  else
    echo "  ⚠️  ${filename} not available"
  fi
done

echo ""
echo "✅ Download complete!"
echo "📂 Files saved to: ${OUTPUT_DIR}"
echo ""
echo "Next steps:"
echo "1. Unzip all files: cd ${OUTPUT_DIR} && unzip -o '*.zip'"
echo "2. Convert to Lona format: pnpm tsx src/cli/convert-binance-csv.ts <file.csv> ${SYMBOL}"
