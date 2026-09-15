// Standalone local MCP server for testing keyword data pull with Claude — stdio
// transport, no Netlify/Supabase/apiKey gating. Run: npm run mcp:local (from server/).
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');
const { generateKeywordIdeas, generateHistoricalMetrics } = require('../googleAds');
const { runPagespeed } = require('../pagespeed');

function toolOk(result) {
  return { content: [{ type: 'text', text: JSON.stringify({ ok: true, result }) }] };
}

function toolError(err) {
  console.error('LOCAL_MCP_TOOL_ERROR', err);
  return { isError: true, content: [{ type: 'text', text: JSON.stringify({ ok: false, message: err.message }) }] };
}

const server = new McpServer({ name: 'seo-keyword-api-local', version: '1.0.0' });

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
    try {
      return toolOk(await generateKeywordIdeas(keyword, country));
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
    try {
      return toolOk(await generateHistoricalMetrics(keywords.join(','), country));
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
    try {
      return toolOk(await runPagespeed(url, strategy));
    } catch (err) {
      return toolError(err);
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('seo-keyword-api-local MCP server running on stdio');
}

main().catch((err) => {
  console.error('LOCAL_MCP_FATAL', err);
  process.exit(1);
});
