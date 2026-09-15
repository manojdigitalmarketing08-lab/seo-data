// Standalone local MCP server for testing keyword data pull with Claude — HTTP
// transport so it can stay running in the background and be shared across
// multiple Claude sessions/clients. No Netlify/Supabase/apiKey gating.
// Start: npm run mcp:local:http (from server/). Stop: see stop-mcp-local.ps1.
const express = require('express');
const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { z } = require('zod');
const { generateKeywordIdeas, generateHistoricalMetrics } = require('../googleAds');
const { runPagespeed } = require('../pagespeed');

const PORT = process.env.LOCAL_MCP_PORT || 4100;

function toolOk(result) {
  return { content: [{ type: 'text', text: JSON.stringify({ ok: true, result }) }] };
}

function toolError(err) {
  console.error('LOCAL_MCP_TOOL_ERROR', err);
  return { isError: true, content: [{ type: 'text', text: JSON.stringify({ ok: false, message: err.message }) }] };
}

function buildServer() {
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

  return server;
}

const app = express();
app.use(express.json({ limit: '20kb' }));

app.get('/health', (req, res) => res.json({ ok: true, name: 'seo-keyword-api-local' }));

// Stateless mode, same pattern as the gated /mcp route, just no apiKey check —
// this is a local-only, no-auth server meant to sit behind 127.0.0.1.
app.post('/mcp', async (req, res) => {
  try {
    const server = buildServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on('close', () => {
      transport.close();
      server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error('LOCAL_MCP_REQUEST_ERROR', err);
    if (!res.headersSent) {
      res.status(500).json({ jsonrpc: '2.0', error: { code: -32001, message: 'Internal server error' }, id: null });
    }
  }
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`seo-keyword-api-local MCP server listening on http://127.0.0.1:${PORT}/mcp`);
});
