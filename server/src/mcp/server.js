const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { z } = require('zod');
const { runGatedTool, GateError } = require('../gatedTool');
const { generateKeywordIdeas, generateHistoricalMetrics } = require('../googleAds');
const { runPagespeed } = require('../pagespeed');

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

  return server;
}

module.exports = { buildMcpServer };
