# Machine Learning System Documentation

## Overview
InsightEngine uses a local-first, deterministic ML pipeline for forecasting, clustering, and anomaly detection. The system is designed to be robust, explainable, and privacy-preserving.

## 1. Feature Engineering
Features are constructed from raw data in `dim_video` and `fact_video_day`.

### Video Features (`VideoInput`)
*   **Duration**: Normalized duration in minutes.
*   **Title Length**: Character count of the title.
*   **Channel Momentum**: `channelAvgViewsLast28d / channelSubscribersAtPublish`.
*   **Publish Hour**: Hour of day (0-23).

### Leakage Protection
*   **Time-Travel**: Features must only use data available *at the time of publication*.
*   **Maturity Check**: Training sets for `views_7d` targets automatically exclude videos published less than 7 days ago.

## 2. Models

### Forecasting
Used for predicting future channel performance.
*   **Naive**: Predicts the last observed value.
*   **Seasonal Naive**: Predicts the value from 7 days ago (weekly seasonality).
*   **Forecast V2**: A hybrid model combining:
    *   Linear Trend (Last 28 days)
    *   Day-of-Week Seasonality factors
    *   Momentum (Last 3 days vs Last 28 days)

### Clustering
Used for Topic Modeling.
*   **Algorithm**: K-Means.
*   **Vectorization**: TF-IDF on cleaned video titles.
*   **Initialization**: Seeded Random Shuffle (Deterministic).
*   **K-Selection**: Heuristic `sqrt(N/2)`.

### Nowcasting
Used for early performance prediction of new videos.
*   **Method**: Growth Curve Matching.
*   **Curves**: Median, 25th percentile, and 75th percentile cumulative view curves normalized to Day 28.

## 3. Model Registry & Quality Gate
Models are trained locally and stored in the `ml_models` table.

### Training Flow
1.  Fetch last 365 days of channel history.
2.  Split into rolling windows (Backtesting).
3.  Train and evaluate all candidates (Naive, Seasonal, V2).
4.  Calculate Metrics: **sMAPE** (Symmetric Mean Absolute Percentage Error) and **MAE**.

### Quality Gate
A model is promoted to `ACTIVE` status only if:
1.  It has the lowest sMAPE among candidates.
2.  Its sMAPE is lower than or equal to the **Baseline** (Seasonal Naive).

## 4. Determinism
All ML operations are deterministic to ensure reproducibility.
*   **RNG**: A Linear Congruential Generator (LCG) is used with a fixed seed for all random operations (e.g., K-Means initialization).
*   **Sorting**: Data is explicitly sorted by date/ID before processing.

## 5. Metrics Definitions
*   **sMAPE**: Used for relative error, robust to scale differences.
*   **MAE**: Used for absolute error magnitude.
*   **Quantiles**: Used for confidence intervals (25th-75th percentile of residuals).
