const STOPWORDS = new Set([
  'a', 'an', 'the', 'for', 'to', 'of', 'in', 'on', 'and', 'is', 'are', 'with',
  'how', 'what', 'why', 'does', 'do', 'who', 'vs', 'best', 'top', 'free', 'buy'
]);

function tokenize(text) {
  return new Set(text.toLowerCase().split(/\s+/).filter((w) => w && !STOPWORDS.has(w)));
}

function jaccard(a, b) {
  const intersectionSize = [...a].filter((x) => b.has(x)).length;
  const unionSize = new Set([...a, ...b]).size;
  return unionSize === 0 ? 0 : intersectionSize / unionSize;
}

// Greedy token-overlap clustering ("best CRM" / "top CRM software" cluster
// together; "CRM pricing" doesn't — different intent). This is a lightweight
// heuristic standing in for the semantic/SERP-based clustering an LLM or
// dedicated NLP model would do — good enough for a first pass, not exact.
function clusterKeywords(items, threshold = 0.34) {
  const clusters = [];

  for (const item of items) {
    const tokens = tokenize(item.text);
    let best = null;
    let bestScore = 0;

    for (const cluster of clusters) {
      const score = jaccard(tokens, cluster.tokens);
      if (score > bestScore) {
        bestScore = score;
        best = cluster;
      }
    }

    if (best && bestScore >= threshold) {
      best.items.push(item);
      best.tokens = new Set([...best.tokens, ...tokens]);
    } else {
      clusters.push({ tokens, items: [item] });
    }
  }

  return clusters.map((c) => ({
    items: c.items.sort((a, b) => b.opportunity - a.opportunity)
  }));
}

module.exports = { clusterKeywords };
