const express = require('express');
const router = express.Router();
const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');
const { buildMcpServer } = require('../mcp/server');

function jsonRpcError(res, status, message, id) {
  res.status(status).json({ jsonrpc: '2.0', error: { code: -32001, message }, id: id ?? null });
}

function extractApiKey(req) {
  const auth = req.get('Authorization') || '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

// The MCP endpoint documented in index.html: POST /mcp with "Authorization: Bearer <apiKey>".
// Every tool call is gated by the same validate/cache/quota logic as the REST routes
// (see src/mcp/server.js), keyed off this one apiKey for the whole connection.
router.post('/', async (req, res) => {
  const apiKey = extractApiKey(req);
  if (!apiKey) {
    return jsonRpcError(res, 401, 'Missing Authorization: Bearer <apiKey> header', req.body && req.body.id);
  }

  try {
    // Stateless mode: a fresh server + transport per request, no session to leak
    // state across unrelated calls (and no session store to manage/scale).
    const server = buildMcpServer(apiKey);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

    res.on('close', () => {
      transport.close();
      server.close();
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error('MCP_REQUEST_ERROR', err);
    if (!res.headersSent) {
      jsonRpcError(res, 500, 'Internal server error', req.body && req.body.id);
    }
  }
});

// No sessions exist in stateless mode, so there's nothing to resume (GET, for
// server-initiated SSE on an existing session) or terminate (DELETE).
router.get('/', (req, res) => {
  jsonRpcError(res, 405, 'Method not allowed: this MCP server is stateless (no sessions to resume).');
});
router.delete('/', (req, res) => {
  jsonRpcError(res, 405, 'Method not allowed: this MCP server is stateless (no sessions to terminate).');
});

module.exports = router;
