export type Point = { x: number; y: number };

/** 相関分析を行う最小のデータ数。これ未満では結果を表示しない。 */
export const MIN_PAIRS_FOR_CORRELATION = 8;

export function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** ピアソンの積率相関係数。データ不足や分散0の場合は null。 */
export function pearson(points: Point[]): number | null {
  if (points.length < 2) return null;
  const mx = mean(points.map((p) => p.x));
  const my = mean(points.map((p) => p.y));
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (const p of points) {
    sxy += (p.x - mx) * (p.y - my);
    sxx += (p.x - mx) ** 2;
    syy += (p.y - my) ** 2;
  }
  if (sxx === 0 || syy === 0) return null;
  return sxy / Math.sqrt(sxx * syy);
}

export function describeCorrelation(r: number): string {
  const a = Math.abs(r);
  const dir = r > 0 ? "正の" : "負の";
  if (a < 0.2) return "ほとんど関連は見られません";
  if (a < 0.4) return `弱い${dir}関連が見られます`;
  if (a < 0.7) return `中程度の${dir}関連が見られます`;
  return `強い${dir}関連が見られます`;
}

/** 最小二乗法による傾き（xは日数など）。2点未満または分散0なら null。 */
export function slope(points: Point[]): number | null {
  if (points.length < 2) return null;
  const mx = mean(points.map((p) => p.x));
  const my = mean(points.map((p) => p.y));
  let num = 0;
  let den = 0;
  for (const p of points) {
    num += (p.x - mx) * (p.y - my);
    den += (p.x - mx) ** 2;
  }
  return den === 0 ? null : num / den;
}
