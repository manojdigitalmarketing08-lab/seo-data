const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { z } = require('zod');
const { runGatedTool, GateError } = require('../gatedTool');
const { generateKeywordIdeas, generateHistoricalMetrics } = require('../googleAds');
const { runPagespeed } = require('../pagespeed');
const { buildContentBrief } = require('../contentBrief/buildBrief');
const { getGscSearchAnalytics } = require('../gsc/searchAnalyticsService');

// MCP tool results report failures inside the JSON-RPC result (isError: true),
// not as an HTTP-level error — the connection/auth itself is fine, the *call* failed.
function toolError(err) {
  if (err instanceof GateError) {
    return {
      isError: true,
      content: [{ type: 'text', text: JSON.stringify({ code: err.code, message: err.message }) }]
    };
  }
  console.error('MCP_TOOL_ERROR', err);
  return {
    isError: true,
    content: [{ type: 'text', text: JSON.stringify({ code: 'UPSTREAM_ERROR', message: err.message }) }]
  };
}

function toolOk(out) {
  return { content: [{ type: 'text', text: JSON.stringify({ ok: true, ...out }) }] };
}

// One MCP server instance per HTTP request (stateless mode — see routes/mcp.js), scoped
// to the caller's apiKey so every tool call is gated exactly like the REST routes are.
function buildMcpServer(apiKey) {
  const server = new McpServer({ name: 'seo-keyword-api', version: '1.0.0' });

  server.registerTool(
    'get_keyword_ideas',
    {
      title: 'Get Keyword Ideas',
      description: 'Find keyword ideas from a seed term via Google Ads Keyword Planner.',
      inputSchema: {
        keyword: z.string().describe('Seed keyword, or comma-separated seed keywords'),
        country: z.string().optional().describe('Target location, e.g. "United States" or "India" (default: India)')
      }
    },
    async ({ keyword, country }) => {
      const loc = (country || 'india').toLowerCase().trim();
      const seeds = keyword.split(',').map((k) => k.trim().toLowerCase()).sort().join(',');
      const cacheKey = `${loc}::${seeds}`;
      try {
        const out = await runGatedTool({
          apiKey,
          cacheKey,
          cacheLabel: keyword,
          cacheLocation: country || 'India',
          toolName: 'Get_Keyword_Ideas',
          callApi: () => generateKeywordIdeas(keyword, country)
        });
        return toolOk(out);
      } catch (err) {
        return toolError(err);
      }
    }
  );

  server.registerTool(
    'get_historical_keyword_metrics',
    {
      title: 'Get Historical Keyword Metrics',
      description: 'Monthly search volume history for a list of keywords via Google Ads Keyword Planner.',
      inputSchema: {
        keywords: z.array(z.string()).min(1).describe('Keywords to fetch historical volume for'),
        country: z.string().optional().describe('Target location, e.g. "United States" or "India" (default: India)')
      }
    },
    async ({ keywords, country }) => {
      const joined = keywords.join(',');
      const loc = (country || 'india').toLowerCase().trim();
      const kws = keywords.map((k) => k.trim().toLowerCase()).sort().join(',');
      const cacheKey = `historical::${loc}::${kws}`;
      try {
        const out = await runGatedTool({
          apiKey,
          cacheKey,
          cacheLabel: joined,
          cacheLocation: country || 'India',
          toolName: 'Get_Historical_Keyword_Metrics',
          callApi: () => generateHistoricalMetrics(joined, country)
        });
        return toolOk(out);
      } catch (err) {
        return toolError(err);
      }
    }
  );

  server.registerTool(
    'get_pagespeed_insights',
    {
      title: 'Get PageSpeed Insights',
      description: 'Performance score and Core Web Vitals for a URL via Google PageSpeed Insights.',
      inputSchema: {
        url: z.string().url().describe('The page URL to test'),
        strategy: z.enum(['mobile', 'desktop']).optional().describe('Device strategy (default: mobile)')
      }
    },
    async ({ url, strategy }) => {
      const strat = (strategy || 'mobile').toLowerCase().trim();
      const cacheKey = `pagespeed::${strat}::${url.trim().toLowerCase()}`;
      try {
        const out = await runGatedTool({
          apiKey,
          cacheKey,
          cacheLabel: url,
          cacheLocation: strat,
          toolName: 'Get_PageSpeed_Insights',
          callApi: () => runPagespeed(url, strategy)
        });
        return toolOk(out);
      } catch (err) {
        return toolError(err);
      }
    }
  );

  server.registerTool(
    'get_content_brief',
    {
      title: 'Get Content Brief',
      description:
        'Turn a topic into a scored, clustered keyword opportunity set and a page outline (title, H1, H2s, FAQ), with live SERP context for the primary and secondary keywords. Answers "what should this page target and how should it be structured", not just raw keyword data.',
      inputSchema: {
        topic: z.string().describe('Page topic or working title, e.g. "project management software"'),
        country: z.string().optional().describe('Target location, e.g. "United States" or "India" (default: India)'),
        intent: z
          .enum(['informational', 'commercial', 'transactional'])
          .optional()
          .describe('Page intent — drops commercial-intent seeds (pricing, buy) for informational pages')
      }
    },
    async ({ topic, country, intent }) => {
      const loc = (country || 'india').toLowerCase().trim();
      const cacheKey = `brief::${loc}::${topic.trim().toLowerCase()}::${(intent || '').toLowerCase()}`;
      try {
        const out = await runGatedTool({
          apiKey,
          cacheKey,
          cacheLabel: topic,
          cacheLocation: country || 'India',
          toolName: 'Get_Content_Brief',
          callApi: () => buildContentBrief({ topic, location: country, intent })
        });
        return toolOk(out);
      } catch (err) {
        return toolError(err);
      }
    }
  );

  server.registerTool(
    'get_gsc_search_analytics',
    {
      title: 'Get GSC Search Analytics',
      description:
        "Query the caller's connected Google Search Console property for queries, impressions, clicks, CTR, and position. " +
        'Requires the customer to have connected a Search Console account first (via GET /api/gsc/connect) — returns a ' +
        "GSC_NOT_CONNECTED error otherwise. Always live data, not cached, since GSC's own data updates daily.",
      inputSchema: {
        siteUrl: z.string().describe('The verified GSC property, e.g. "https://example.com/" or "sc-domain:example.com"'),
        startDate: z.string().describe('Start date, YYYY-MM-DD'),
        endDate: z.string().describe('End date, YYYY-MM-DD'),
        dimensions: z
          .array(z.enum(['query', 'page', 'country', 'device', 'date']))
          .optional()
          .describe('Dimensions to break results down by (default: ["query"])'),
        rowLimit: z.number().optional().describe('Max rows to return (default: 100)')
      }
    },
    async ({ siteUrl, startDate, endDate, dimensions, rowLimit }) => {
      try {
        const out = await getGscSearchAnalytics({ apiKey, siteUrl, startDate, endDate, dimensions, rowLimit });
        return toolOk(out);
      } catch (err) {
        return toolError(err);
      }
    }
  );

  return server;
}

module.exports = { buildMcpServer };
