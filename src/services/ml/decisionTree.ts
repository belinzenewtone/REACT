/**
 * Minimal CART decision tree — pure TypeScript, zero dependencies.
 *
 * Trains in milliseconds on the ~500–2000 correction samples expected from
 * a typical user. Serialises to plain JSON so the model can be persisted in
 * AsyncStorage and pushed as an OTA update.
 *
 * Gini impurity is used as the split criterion. Hyper-parameters are fixed
 * at values that prevent overfitting on small datasets:
 *   maxDepth   = 8   — deep enough to capture merchant patterns
 *   minSamples = 3   — at least 3 examples per leaf
 */

export interface TreeNode {
  // Leaf
  label?: string;
  // Internal
  fi?: number;       // feature index
  threshold?: number;
  left?: TreeNode;
  right?: TreeNode;
}

export interface DecisionTree {
  root: TreeNode;
}

// ─── Gini impurity ────────────────────────────────────────────────────────────

function gini(labels: string[]): number {
  const n = labels.length;
  if (n === 0) return 0;
  const counts: Record<string, number> = {};
  for (const l of labels) counts[l] = (counts[l] ?? 0) + 1;
  let impurity = 1;
  for (const c of Object.values(counts)) {
    const p = c / n;
    impurity -= p * p;
  }
  return impurity;
}

function majority(labels: string[]): string {
  const counts: Record<string, number> = {};
  for (const l of labels) counts[l] = (counts[l] ?? 0) + 1;
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

// ─── Best split ───────────────────────────────────────────────────────────────

function bestSplit(
  X: number[][],
  y: string[],
): { fi: number; threshold: number } | null {
  const nFeatures = X[0].length;
  const n = y.length;
  let bestScore = Infinity;
  let best: { fi: number; threshold: number } | null = null;

  for (let fi = 0; fi < nFeatures; fi++) {
    const vals = Array.from(new Set(X.map(r => r[fi]))).sort((a, b) => a - b);

    for (let vi = 0; vi < vals.length - 1; vi++) {
      const threshold = (vals[vi] + vals[vi + 1]) / 2;
      const lL: string[] = [], lR: string[] = [];

      for (let i = 0; i < n; i++) {
        if (X[i][fi] <= threshold) lL.push(y[i]);
        else lR.push(y[i]);
      }

      if (lL.length === 0 || lR.length === 0) continue;

      const score = (lL.length / n) * gini(lL) + (lR.length / n) * gini(lR);
      if (score < bestScore) {
        bestScore = score;
        best = { fi, threshold };
      }
    }
  }
  return best;
}

// ─── Recursive builder ────────────────────────────────────────────────────────

function build(
  X: number[][],
  y: string[],
  depth: number,
  maxDepth: number,
  minSamples: number,
): TreeNode {
  if (y.length <= minSamples || depth >= maxDepth || new Set(y).size === 1) {
    return { label: majority(y) };
  }

  const split = bestSplit(X, y);
  if (!split) return { label: majority(y) };

  const lX: number[][] = [], lY: string[] = [];
  const rX: number[][] = [], rY: string[] = [];

  for (let i = 0; i < X.length; i++) {
    if (X[i][split.fi] <= split.threshold) {
      lX.push(X[i]); lY.push(y[i]);
    } else {
      rX.push(X[i]); rY.push(y[i]);
    }
  }

  return {
    fi: split.fi,
    threshold: split.threshold,
    left:  build(lX, lY, depth + 1, maxDepth, minSamples),
    right: build(rX, rY, depth + 1, maxDepth, minSamples),
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function trainTree(
  X: number[][],
  y: string[],
  maxDepth = 8,
  minSamples = 3,
): DecisionTree {
  if (X.length === 0) throw new Error('no_training_data');
  return { root: build(X, y, 0, maxDepth, minSamples) };
}

export function predictTree(tree: DecisionTree, features: number[]): string {
  let node = tree.root;
  while (node.label === undefined) {
    node = features[node.fi!] <= node.threshold! ? node.left! : node.right!;
  }
  return node.label;
}
