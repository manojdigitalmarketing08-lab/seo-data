(function () {
  'use strict';

  // Base URL of the Node/Express backend (server/). Defaults to local dev —
  // point this at the deployed API origin once the backend has a real domain
  // (see server/README.md), same placeholder pattern as index.html's MCP config.
  // Use 127.0.0.1, not localhost — on this dev machine "localhost" resolves to
  // ::1 first and the Node server isn't reachable over IPv6, so browsers here
  // get a connection error even though the server is actually up.
  var API_BASE_URL = 'http://127.0.0.1:3000';
  var STORAGE_KEY = 'seoKeywordApi.apiKey';

  // Demo mode: open dashboard.html?demo=1 (or just double-click the file) to preview
  // the dashboard with mock data, no backend or API key required. Sticky across
  // reloads via localStorage until turned off with ?demo=0.
  var DEMO_KEY = 'demo-8f3a1c9b2e7d4f6a';
  var demoParam = new URLSearchParams(window.location.search).get('demo');
  if (demoParam === '1') localStorage.setItem('seoKeywordApi.demo', '1');
  if (demoParam === '0') localStorage.removeItem('seoKeywordApi.demo');
  var isDemo = localStorage.getItem('seoKeywordApi.demo') === '1' || demoParam === '1';

  var DEMO_CUSTOMER = {
    plan: 'starter',
    monthly_quota: 500,
    quota_used_this_period: 214,
    period_reset_at: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'active',
    created_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString()
  };
  var DEMO_USAGE = [
    { tool_name: 'Get_Keyword_Ideas', cache_hit: false, called_at: new Date(Date.now() - 3 * 60 * 1000).toISOString() },
    { tool_name: 'Get_PageSpeed_Insights', cache_hit: true, called_at: new Date(Date.now() - 47 * 60 * 1000).toISOString() },
    { tool_name: 'Get_Historical_Keyword_Metrics', cache_hit: false, called_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() },
    { tool_name: 'Get_Keyword_Ideas', cache_hit: true, called_at: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString() }
  ];
  var DEMO_KEYWORDS = [
    { text: 'photobooth software', keywordIdeaMetrics: { avgMonthlySearches: 2400, competition: 'LOW' } },
    { text: 'photo booth software', keywordIdeaMetrics: { avgMonthlySearches: 1900, competition: 'LOW' } },
    { text: 'photobooth app', keywordIdeaMetrics: { avgMonthlySearches: 1300, competition: 'MEDIUM' } },
    { text: 'digital photobooth', keywordIdeaMetrics: { avgMonthlySearches: 880, competition: 'LOW' } },
    { text: 'diy photo booth', keywordIdeaMetrics: { avgMonthlySearches: 590, competition: 'HIGH' } }
  ];
  var DEMO_BRIEF = {
    topic: 'project management software',
    location: 'India',
    intent: 'commercial',
    titleTag: 'Project Management Software',
    metaDescription: 'Explore project management software and project tracking software — what to know before you choose.',
    h1: 'Project Management Software',
    primary: { text: 'project management software', volume: 33100, competition: 'LOW', competitionIndex: 3, opportunity: 8275 },
    secondary: [
      { text: 'project tracking software', volume: 33100, competition: 'LOW', competitionIndex: 3, opportunity: 8275 },
      { text: 'pm software', volume: 33100, competition: 'LOW', competitionIndex: 3, opportunity: 8275 },
      { text: 'pmo software', volume: 33100, competition: 'LOW', competitionIndex: 3, opportunity: 8275 },
      { text: 'program management software', volume: 33100, competition: 'LOW', competitionIndex: 3, opportunity: 8275 },
      { text: 'project mgmt software', volume: 27100, competition: 'LOW', competitionIndex: 2, opportunity: 9033 },
      { text: 'task management', volume: 22200, competition: 'MEDIUM', competitionIndex: 12, opportunity: 1708 }
    ],
    faq: [
      { text: 'what is project management software', volume: 1300, competition: 'LOW', competitionIndex: 1, opportunity: 650 },
      { text: 'how to construct a gantt chart', volume: 720, competition: 'LOW', competitionIndex: 1, opportunity: 360 },
      { text: 'what is slack in project management', volume: 590, competition: 'LOW', competitionIndex: 0, opportunity: 590 }
    ],
    clusters: [
      { representative: 'project management software', keywords: [{ text: 'project management software', volume: 33100, competition: 'LOW', competitionIndex: 3, opportunity: 8275 }] },
      { representative: 'project mgmt software', keywords: [{ text: 'project mgmt software', volume: 27100, competition: 'LOW', competitionIndex: 2, opportunity: 9033 }] }
    ],
    totalClustersFound: 1139,
    totalKeywordsScored: 5087,
    currentlyRanking: {
      'project management software': {
        configured: true,
        results: [
          { title: 'Best Project Management Software of 2026', link: 'https://www.pcmag.com/picks/best-project-management-software', domain: 'www.pcmag.com', snippet: 'Compare the top project management tools for teams of every size.' },
          { title: 'Project Management Guide', link: 'https://www.wrike.com/project-management-guide/', domain: 'www.wrike.com', snippet: 'Everything you need to know about choosing project management software.' }
        ]
      }
    },
    excludedBrandTerms: ['zoho projects', 'zoho socials', 'asana project management software', 'trello project management software'],
    knownLimitations: [
      'Search volume and competition come from Google Ads auction data, not organic ranking difficulty — a low ad-competition keyword can still have a highly competitive organic SERP.',
      'Clustering groups keywords by shared significant words, not full semantic/SERP-based clustering — review clusters before finalizing a brief.',
      'No Google Search Console integration yet — this brief surfaces fresh keyword opportunities only, not queries your specific site already ranks for.',
      'Brand/competitor filtering is best-effort, not exhaustive — review the remaining list for names neither signal caught.',
      'Only the top 20 keyword clusters by opportunity are returned in full, out of however many Google\'s ideas expansion produced.'
    ]
  };

  var DEMO_PAGESPEED = {
    lighthouseResult: {
      categories: {
        performance: { score: 0.82 },
        accessibility: { score: 0.94 },
        'best-practices': { score: 0.89 },
        seo: { score: 1 }
      },
      audits: {
        'first-contentful-paint': { displayValue: '1.2 s' },
        'largest-contentful-paint': { displayValue: '2.1 s' },
        'speed-index': { displayValue: '2.4 s' },
        'total-blocking-time': { displayValue: '90 ms' },
        'cumulative-layout-shift': { displayValue: '0.02' }
      }
    }
  };
  var DEMO_HISTORICAL = {
    results: [
      {
        text: 'seo keyword api',
        keywordMetrics: {
          avgMonthlySearches: 1900,
          competition: 'LOW',
          monthlySearchVolumes: [
            { year: 2025, month: 10, monthlySearches: 1200 },
            { year: 2025, month: 11, monthlySearches: 1400 },
            { year: 2025, month: 12, monthlySearches: 2200 },
            { year: 2026, month: 1, monthlySearches: 1800 },
            { year: 2026, month: 2, monthlySearches: 1600 },
            { year: 2026, month: 3, monthlySearches: 1700 },
            { year: 2026, month: 4, monthlySearches: 1900 },
            { year: 2026, month: 5, monthlySearches: 2100 },
            { year: 2026, month: 6, monthlySearches: 1950 },
            { year: 2026, month: 7, monthlySearches: 1880 },
            { year: 2026, month: 8, monthlySearches: 1900 },
            { year: 2026, month: 9, monthlySearches: 1900 }
          ]
        }
      }
    ]
  };

  // ---------- Element refs ----------
  var gateWrap = document.getElementById('gateWrap');
  var gateForm = document.getElementById('gateForm');
  var apiKeyInput = document.getElementById('apiKeyInput');
  var gateSubmit = document.getElementById('gateSubmit');
  var gateError = document.getElementById('gateError');
  var gateErrorText = document.getElementById('gateErrorText');

  var dashRoot = document.getElementById('dashRoot');
  var signOutBtn = document.getElementById('signOutBtn');

  var devMenu = document.getElementById('devMenu');
  var devMenuBtn = document.getElementById('devMenuBtn');
  var devDropdown = document.getElementById('devDropdown');

  var keyPillText = document.getElementById('keyPillText');
  var copyKeyBtn = document.getElementById('copyKeyBtn');
  var revealKeyBtn = document.getElementById('revealKeyBtn');

  var suspendedAlert = document.getElementById('suspendedAlert');
  var statusText = document.getElementById('statusText');
  var quotaAlert = document.getElementById('quotaAlert');
  var quotaAlertText = document.getElementById('quotaAlertText');

  var planBadge = document.getElementById('planBadge');
  var statusBadge = document.getElementById('statusBadge');
  var quotaUsedValue = document.getElementById('quotaUsedValue');
  var quotaMeter = document.getElementById('quotaMeter');
  var quotaRemainingValue = document.getElementById('quotaRemainingValue');
  var resetValue = document.getElementById('resetValue');
  var resetSub = document.getElementById('resetSub');

  var searchForm = document.getElementById('searchForm');
  var seedKeywordsInput = document.getElementById('seedKeywords');
  var locationSelect = document.getElementById('location');
  var searchSubmit = document.getElementById('searchSubmit');
  var searchStatus = document.getElementById('searchStatus');
  var searchError = document.getElementById('searchError');
  var searchErrorText = document.getElementById('searchErrorText');
  var resultsWrap = document.getElementById('resultsWrap');
  var resultsEmpty = document.getElementById('resultsEmpty');
  var resultsBody = document.getElementById('resultsBody');
  var sourceBadge = document.getElementById('sourceBadge');
  var resultCount = document.getElementById('resultCount');

  var activityList = document.getElementById('activityList');
  var activityEmpty = document.getElementById('activityEmpty');
  var mcpSnippet = document.getElementById('mcpSnippet');

  var gscNotConnected = document.getElementById('gscNotConnected');
  var gscConnected = document.getElementById('gscConnected');
  var gscEmail = document.getElementById('gscEmail');
  var gscConnectBtn = document.getElementById('gscConnectBtn');
  var gscDisconnectBtn = document.getElementById('gscDisconnectBtn');
  var gscConnectBanner = document.getElementById('gscConnectBanner');
  var gscErrorBanner = document.getElementById('gscErrorBanner');

  // Tabs
  var tabKeywordExplorer = document.getElementById('tabKeywordExplorer');
  var tabContentBrief = document.getElementById('tabContentBrief');
  var tabPagespeed = document.getElementById('tabPagespeed');
  var tabHistorical = document.getElementById('tabHistorical');
  var paneKeywordExplorer = document.getElementById('paneKeywordExplorer');
  var paneContentBrief = document.getElementById('paneContentBrief');
  var panePagespeed = document.getElementById('panePagespeed');
  var paneHistorical = document.getElementById('paneHistorical');

  // PageSpeed Insights
  var pagespeedForm = document.getElementById('pagespeedForm');
  var pagespeedUrlInput = document.getElementById('pagespeedUrl');
  var pagespeedStrategySelect = document.getElementById('pagespeedStrategy');
  var pagespeedSubmit = document.getElementById('pagespeedSubmit');
  var pagespeedStatus = document.getElementById('pagespeedStatus');
  var pagespeedError = document.getElementById('pagespeedError');
  var pagespeedErrorText = document.getElementById('pagespeedErrorText');
  var pagespeedResults = document.getElementById('pagespeedResults');
  var pagespeedEmpty = document.getElementById('pagespeedEmpty');
  var pagespeedSourceBadge = document.getElementById('pagespeedSourceBadge');
  var pagespeedUrlLabel = document.getElementById('pagespeedUrlLabel');
  var scoreTiles = document.getElementById('scoreTiles');
  var metricsList = document.getElementById('metricsList');

  // Historical Metrics
  var historicalForm = document.getElementById('historicalForm');
  var historicalKeywordsInput = document.getElementById('historicalKeywords');
  var historicalLocationSelect = document.getElementById('historicalLocation');
  var historicalSubmit = document.getElementById('historicalSubmit');
  var historicalStatus = document.getElementById('historicalStatus');
  var historicalError = document.getElementById('historicalError');
  var historicalErrorText = document.getElementById('historicalErrorText');
  var historicalResultsWrap = document.getElementById('historicalResultsWrap');
  var historicalEmpty = document.getElementById('historicalEmpty');
  var historicalBody = document.getElementById('historicalBody');
  var historicalSourceBadge = document.getElementById('historicalSourceBadge');
  var historicalResultCount = document.getElementById('historicalResultCount');

  // Content Brief
  var briefForm = document.getElementById('briefForm');
  var briefTopicInput = document.getElementById('briefTopic');
  var briefLocationSelect = document.getElementById('briefLocation');
  var briefIntentSelect = document.getElementById('briefIntent');
  var briefSubmit = document.getElementById('briefSubmit');
  var briefStatus = document.getElementById('briefStatus');
  var briefStatusText = document.getElementById('briefStatusText');
  var briefError = document.getElementById('briefError');
  var briefErrorText = document.getElementById('briefErrorText');
  var briefResults = document.getElementById('briefResults');
  var briefEmpty = document.getElementById('briefEmpty');
  var briefSourceBadge = document.getElementById('briefSourceBadge');
  var briefSummary = document.getElementById('briefSummary');
  var briefPrimaryKeyword = document.getElementById('briefPrimaryKeyword');
  var briefPrimaryStats = document.getElementById('briefPrimaryStats');
  var briefTitleTag = document.getElementById('briefTitleTag');
  var briefMetaDescription = document.getElementById('briefMetaDescription');
  var briefH1 = document.getElementById('briefH1');
  var briefH2List = document.getElementById('briefH2List');
  var briefFaqSection = document.getElementById('briefFaqSection');
  var briefFaqList = document.getElementById('briefFaqList');
  var briefRankingSection = document.getElementById('briefRankingSection');
  var briefRankingGrid = document.getElementById('briefRankingGrid');
  var briefExcludedSection = document.getElementById('briefExcludedSection');
  var briefExcludedList = document.getElementById('briefExcludedList');
  var briefClustersBody = document.getElementById('briefClustersBody');
  var briefClustersNote = document.getElementById('briefClustersNote');
  var briefLimitationsList = document.getElementById('briefLimitationsList');

  var currentKey = null;
  var keyRevealed = false;

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = String(str == null ? '' : str);
    return div.innerHTML;
  }

  function maskKey(key) {
    if (!key) return '';
    if (key.length <= 8) return '••••••••';
    return key.slice(0, 4) + '••••••••' + key.slice(-4);
  }

  // ---------- Gate flow ----------
  function showGateError(text) {
    gateErrorText.textContent = text;
    gateError.hidden = false;
  }
  function clearGateError() {
    gateError.hidden = true;
    gateErrorText.textContent = '';
  }

  function verifyAndEnter(key, opts) {
    opts = opts || {};

    if (isDemo) {
      currentKey = key || DEMO_KEY;
      localStorage.setItem(STORAGE_KEY, currentKey);
      renderDashboard(DEMO_CUSTOMER, DEMO_USAGE);
      enterDashboard();
      return Promise.resolve(true);
    }

    if (opts.showLoading) {
      gateSubmit.disabled = true;
      gateSubmit.textContent = 'Checking…';
    }
    clearGateError();

    return fetch(API_BASE_URL + '/api/account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: key })
    })
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (result) {
        if (opts.showLoading) {
          gateSubmit.disabled = false;
          gateSubmit.textContent = 'Continue';
        }
        if (!result.ok || !result.data.ok) {
          var msg = (result.data && result.data.message) || 'Could not verify this API key.';
          if (result.data && result.data.code === 'INVALID_API_KEY') {
            msg = 'No account found for that API key. Double-check it, or sign up for a new one.';
          }
          if (opts.silent) return false;
          showGateError(msg);
          localStorage.removeItem(STORAGE_KEY);
          return false;
        }

        currentKey = key;
        localStorage.setItem(STORAGE_KEY, key);
        renderDashboard(result.data.customer, result.data.recentUsage || []);
        enterDashboard();
        return true;
      })
      .catch(function () {
        if (opts.showLoading) {
          gateSubmit.disabled = false;
          gateSubmit.textContent = 'Continue';
        }
        if (!opts.silent) showGateError('Network error — check your connection and that the API server is reachable.');
        return false;
      });
  }

  function closeDevDropdown() {
    devDropdown.hidden = true;
    devMenuBtn.setAttribute('aria-expanded', 'false');
  }

  function enterDashboard() {
    gateWrap.hidden = true;
    dashRoot.hidden = false;
    signOutBtn.hidden = false;
    devMenu.hidden = false;
    keyPillText.textContent = maskKey(currentKey);
    keyRevealed = false;
    revealKeyBtn.textContent = 'Reveal';
    buildMcpSnippet();
    refreshGscStatus();
  }

  function exitDashboard() {
    currentKey = null;
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    gateWrap.hidden = false;
    dashRoot.hidden = true;
    signOutBtn.hidden = true;
    devMenu.hidden = true;
    closeDevDropdown();
    apiKeyInput.value = '';
    apiKeyInput.focus();
  }

  devMenuBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    var isOpen = !devDropdown.hidden;
    if (isOpen) {
      closeDevDropdown();
    } else {
      devDropdown.hidden = false;
      devMenuBtn.setAttribute('aria-expanded', 'true');
    }
  });
  document.addEventListener('click', function (e) {
    if (!devDropdown.hidden && !devMenu.contains(e.target)) closeDevDropdown();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeDevDropdown();
  });

  gateForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var key = apiKeyInput.value.trim();
    if (!key) {
      showGateError('Enter your API key.');
      return;
    }
    verifyAndEnter(key, { showLoading: true });
  });

  signOutBtn.addEventListener('click', exitDashboard);

  // ---------- Tabs ----------
  var tabs = {
    keyword: { btn: tabKeywordExplorer, pane: paneKeywordExplorer },
    brief: { btn: tabContentBrief, pane: paneContentBrief },
    pagespeed: { btn: tabPagespeed, pane: panePagespeed },
    historical: { btn: tabHistorical, pane: paneHistorical }
  };
  function activateTab(active) {
    Object.keys(tabs).forEach(function (key) {
      var isActive = key === active;
      tabs[key].btn.classList.toggle('is-active', isActive);
      tabs[key].btn.setAttribute('aria-selected', String(isActive));
      tabs[key].pane.hidden = !isActive;
    });
  }
  Object.keys(tabs).forEach(function (key) {
    tabs[key].btn.addEventListener('click', function () { activateTab(key); });
  });

  copyKeyBtn.addEventListener('click', function () {
    if (!currentKey) return;
    var done = function () {
      copyKeyBtn.textContent = 'Copied!';
      setTimeout(function () { copyKeyBtn.textContent = 'Copy'; }, 1500);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(currentKey).then(done).catch(function () {});
    }
  });

  revealKeyBtn.addEventListener('click', function () {
    keyRevealed = !keyRevealed;
    keyPillText.textContent = keyRevealed ? currentKey : maskKey(currentKey);
    revealKeyBtn.textContent = keyRevealed ? 'Hide' : 'Reveal';
  });

  // ---------- Render account state ----------
  function formatDate(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function daysUntil(iso) {
    if (!iso) return null;
    var target = new Date(iso).getTime();
    if (isNaN(target)) return null;
    var diff = Math.ceil((target - Date.now()) / (1000 * 60 * 60 * 24));
    return diff;
  }

  function renderDashboard(customer, recentUsage) {
    var used = customer.quota_used_this_period || 0;
    var quota = customer.monthly_quota || 0;
    var remaining = Math.max(quota - used, 0);
    var pct = quota > 0 ? Math.min((used / quota) * 100, 100) : 0;

    planBadge.textContent = customer.plan;
    planBadge.className = 'badge badge-' + customer.plan;

    statusBadge.textContent = customer.status;
    statusBadge.className = 'badge badge-' + customer.status;

    quotaUsedValue.textContent = used.toLocaleString() + ' / ' + quota.toLocaleString();
    quotaRemainingValue.textContent = remaining.toLocaleString();

    quotaMeter.style.width = pct + '%';
    quotaMeter.className = 'meter-fill' + (pct >= 100 ? ' is-danger' : pct >= 80 ? ' is-warning' : '');

    resetValue.textContent = formatDate(customer.period_reset_at);
    var days = daysUntil(customer.period_reset_at);
    resetSub.textContent = days == null ? '' : (days <= 0 ? 'due for reset' : days + ' day' + (days === 1 ? '' : 's') + ' left');

    suspendedAlert.hidden = customer.status === 'active';
    statusText.textContent = customer.status;

    if (customer.status === 'active' && quota > 0 && used / quota >= 0.8) {
      quotaAlert.hidden = false;
      quotaAlertText.textContent = used.toLocaleString() + ' of ' + quota.toLocaleString() + ' requests';
    } else {
      quotaAlert.hidden = true;
    }

    renderActivity(recentUsage);
  }

  function timeAgo(iso) {
    var d = new Date(iso).getTime();
    if (isNaN(d)) return '';
    var seconds = Math.floor((Date.now() - d) / 1000);
    if (seconds < 60) return 'just now';
    var minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + 'm ago';
    var hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + 'h ago';
    var days = Math.floor(hours / 24);
    return days + 'd ago';
  }

  function renderActivity(rows) {
    activityList.innerHTML = '';
    if (!rows || rows.length === 0) {
      activityEmpty.hidden = false;
      return;
    }
    activityEmpty.hidden = true;
    rows.forEach(function (row) {
      var li = document.createElement('li');
      li.className = 'activity-row';
      li.innerHTML =
        '<span class="activity-tool">' + escapeHtml(row.tool_name || 'unknown') + '</span>' +
        '<span class="activity-meta">' +
        '<span class="dot ' + (row.cache_hit ? 'is-cache' : 'is-live') + '" aria-hidden="true"></span>' +
        (row.cache_hit ? 'cache' : 'live') + ' · ' + escapeHtml(timeAgo(row.called_at)) +
        '</span>';
      activityList.appendChild(li);
    });
  }

  function buildMcpSnippet() {
    var mcpUrl = API_BASE_URL + '/mcp';
    mcpSnippet.textContent =
      '{\n' +
      '  "mcpServers": {\n' +
      '    "seo-keyword-api": {\n' +
      '      "url": "' + mcpUrl + '",\n' +
      '      "headers": {\n' +
      '        "Authorization": "Bearer ' + currentKey + '"\n' +
      '      }\n' +
      '    }\n' +
      '  }\n' +
      '}';
  }

  // ---------- Search Console connect ----------
  function renderGscStatus(connected, email) {
    gscNotConnected.hidden = connected;
    gscConnected.hidden = !connected;
    gscDisconnectBtn.hidden = !connected;
    gscConnectBtn.textContent = connected ? 'Reconnect' : 'Connect Search Console';
    if (connected) gscEmail.textContent = email || '';
  }

  function refreshGscStatus() {
    if (isDemo) {
      renderGscStatus(false);
      return;
    }
    fetch(API_BASE_URL + '/api/gsc/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: currentKey })
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data && data.ok) renderGscStatus(data.connected, data.googleEmail);
      })
      .catch(function () {});
  }

  gscConnectBtn.addEventListener('click', function () {
    if (isDemo || !currentKey) return;
    window.location.href = API_BASE_URL + '/api/gsc/connect?apiKey=' + encodeURIComponent(currentKey);
  });

  gscDisconnectBtn.addEventListener('click', function () {
    if (isDemo || !currentKey) return;
    gscDisconnectBtn.disabled = true;
    fetch(API_BASE_URL + '/api/gsc/disconnect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: currentKey })
    })
      .then(function () { refreshGscStatus(); })
      .catch(function () {})
      .then(function () { gscDisconnectBtn.disabled = false; });
  });

  // One-time banner from the /api/gsc/callback redirect (?gsc=connected|error), then clean the URL.
  function handleGscRedirectBanner() {
    var params = new URLSearchParams(window.location.search);
    var gscParam = params.get('gsc');
    if (gscParam === 'connected') gscConnectBanner.hidden = false;
    if (gscParam === 'error') gscErrorBanner.hidden = false;
    if (gscParam) {
      params.delete('gsc');
      var qs = params.toString();
      var newUrl = window.location.pathname + (qs ? '?' + qs : '') + window.location.hash;
      window.history.replaceState({}, '', newUrl);
    }
  }

  document.querySelectorAll('.btn-copy').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var target = document.getElementById(btn.getAttribute('data-copy-target'));
      if (!target) return;
      var text = target.textContent;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
          var original = btn.textContent;
          btn.textContent = 'Copied';
          setTimeout(function () { btn.textContent = original; }, 1500);
        });
      }
    });
  });

  // ---------- Keyword search tool ----------
  function parseKeywordResults(payload) {
    // payload.result is the raw Google Ads generateKeywordIdeas response, cached as-is —
    // shape: { results: [{ text, keywordIdeaMetrics: { avgMonthlySearches, competition } }] }
    var raw = (payload && payload.result) || {};
    var list = raw.results || raw.keywordIdeas || [];
    return list.map(function (item) {
      var metrics = item.keywordIdeaMetrics || item.keywordMetrics || {};
      return {
        keyword: item.text || item.keyword || '—',
        avgMonthlySearches: metrics.avgMonthlySearches != null ? Number(metrics.avgMonthlySearches).toLocaleString() : '—',
        competition: metrics.competition ? String(metrics.competition).replace('_', ' ').toLowerCase() : '—'
      };
    });
  }

  function setSearchLoading(isLoading) {
    searchSubmit.disabled = isLoading;
    searchStatus.hidden = !isLoading;
  }

  searchForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!currentKey) return;

    var seedKeywords = seedKeywordsInput.value.trim();
    if (!seedKeywords) return;

    searchError.hidden = true;
    resultsWrap.hidden = true;
    resultsEmpty.hidden = true;
    setSearchLoading(true);

    if (isDemo) {
      setTimeout(function () {
        setSearchLoading(false);
        var rows = parseKeywordResults({ result: { results: DEMO_KEYWORDS } });
        sourceBadge.textContent = 'live result';
        sourceBadge.className = 'source-badge is-live';
        resultCount.textContent = rows.length + ' keyword' + (rows.length === 1 ? '' : 's') + ' (demo data)';
        resultsBody.innerHTML = '';
        rows.forEach(function (row) {
          var tr = document.createElement('tr');
          tr.innerHTML =
            '<td>' + escapeHtml(row.keyword) + '</td>' +
            '<td>' + escapeHtml(row.avgMonthlySearches) + '</td>' +
            '<td>' + escapeHtml(row.competition) + '</td>';
          resultsBody.appendChild(tr);
        });
        resultsWrap.hidden = false;
      }, 500);
      return;
    }

    fetch(API_BASE_URL + '/dashboard-search-keywords', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: currentKey, seedKeywords: seedKeywords, location: locationSelect.value })
    })
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (result) {
        setSearchLoading(false);

        if (!result.ok || !result.data.ok) {
          var code = result.data && result.data.code;
          var msg = (result.data && result.data.message) || 'Something went wrong. Try again.';
          if (code === 'QUOTA_EXCEEDED') {
            msg = 'You’ve used your full monthly quota. Upgrade your plan to keep searching.';
          }
          searchErrorText.innerHTML = escapeHtml(msg) + (code === 'QUOTA_EXCEEDED' ? ' <a href="upgrade.html">Upgrade →</a>' : '');
          searchError.hidden = false;
          resultsEmpty.hidden = false;
          return;
        }

        var rows = parseKeywordResults(result.data);
        sourceBadge.textContent = result.data.source === 'cache' ? 'from cache' : 'live result';
        sourceBadge.className = 'source-badge ' + (result.data.source === 'cache' ? 'is-cache' : 'is-live');
        resultCount.textContent = rows.length + ' keyword' + (rows.length === 1 ? '' : 's');

        resultsBody.innerHTML = '';
        if (rows.length === 0) {
          resultsEmpty.hidden = false;
          resultsEmpty.textContent = 'No keyword ideas found for that seed — try a broader term.';
        } else {
          resultsEmpty.hidden = true;
          rows.forEach(function (row) {
            var tr = document.createElement('tr');
            tr.innerHTML =
              '<td>' + escapeHtml(row.keyword) + '</td>' +
              '<td>' + escapeHtml(row.avgMonthlySearches) + '</td>' +
              '<td>' + escapeHtml(row.competition) + '</td>';
            resultsBody.appendChild(tr);
          });
        }
        resultsWrap.hidden = false;

        // Refresh quota display — this search just counted against it (unless cached).
        verifyAndEnter(currentKey, { silent: true });
      })
      .catch(function () {
        setSearchLoading(false);
        searchErrorText.textContent = 'Network error — check your connection and that the API server is reachable.';
        searchError.hidden = false;
        resultsEmpty.hidden = false;
      });
  });

  // ---------- Content Brief tool ----------
  function formatCompetition(text) {
    return text ? String(text).replace('_', ' ').toLowerCase() : '—';
  }

  function renderKeywordStat(kw) {
    return kw.volume.toLocaleString() + ' searches/mo · ' + formatCompetition(kw.competition) + ' competition · opportunity ' + kw.opportunity.toLocaleString();
  }

  function renderRankingGrid(currentlyRanking) {
    briefRankingGrid.innerHTML = '';
    var keywords = Object.keys(currentlyRanking || {});
    if (keywords.length === 0) {
      briefRankingSection.hidden = true;
      return;
    }
    briefRankingSection.hidden = false;

    keywords.forEach(function (kw) {
      var entry = currentlyRanking[kw];
      var card = document.createElement('div');
      card.className = 'brief-rank-card';

      var html = '<div class="brief-rank-keyword">' + escapeHtml(kw) + '</div>';
      if (!entry || !entry.configured) {
        html += '<div class="brief-rank-empty">Live SERP data not configured.</div>';
      } else if (!entry.results || entry.results.length === 0) {
        html += '<div class="brief-rank-empty">No ranking data available.</div>';
      } else {
        entry.results.slice(0, 3).forEach(function (r) {
          html +=
            '<div class="brief-rank-result">' + escapeHtml(r.title || r.domain || 'Untitled') +
            '<br><span class="brief-rank-domain">' + escapeHtml(r.domain || '') + '</span></div>';
        });
      }
      card.innerHTML = html;
      briefRankingGrid.appendChild(card);
    });
  }

  function renderBrief(data, source, cachedAt) {
    briefSourceBadge.textContent = source === 'cache' ? 'from cache' : 'live result';
    briefSourceBadge.className = 'source-badge ' + (source === 'cache' ? 'is-cache' : 'is-live');

    if (data.warning) {
      briefSummary.textContent = data.warning;
      briefResults.hidden = true;
      briefEmpty.hidden = false;
      briefEmpty.textContent = data.warning;
      return;
    }

    briefSummary.textContent =
      data.totalKeywordsScored.toLocaleString() + ' keyword ideas scored · ' +
      data.totalClustersFound.toLocaleString() + ' clusters found' +
      (source === 'cache' && cachedAt ? ' · cached ' + timeAgo(cachedAt) : '');

    briefPrimaryKeyword.textContent = data.primary.text;
    briefPrimaryStats.innerHTML =
      '<span><strong>' + data.primary.volume.toLocaleString() + '</strong> searches/mo</span>' +
      '<span><strong>' + formatCompetition(data.primary.competition) + '</strong> competition</span>' +
      '<span><strong>' + data.primary.opportunity.toLocaleString() + '</strong> opportunity score</span>';

    briefTitleTag.textContent = data.titleTag;
    briefMetaDescription.textContent = data.metaDescription;
    briefH1.textContent = data.h1;

    briefH2List.innerHTML = '';
    data.secondary.forEach(function (kw) {
      var li = document.createElement('li');
      li.innerHTML = '<span class="brief-tag">H2</span>' + escapeHtml(kw.text) + ' <span style="color:var(--muted);font-size:.78rem;">— ' + escapeHtml(renderKeywordStat(kw)) + '</span>';
      briefH2List.appendChild(li);
    });

    briefFaqList.innerHTML = '';
    if (!data.faq || data.faq.length === 0) {
      briefFaqSection.hidden = true;
    } else {
      briefFaqSection.hidden = false;
      data.faq.forEach(function (kw) {
        var li = document.createElement('li');
        li.textContent = kw.text;
        briefFaqList.appendChild(li);
      });
    }

    renderRankingGrid(data.currentlyRanking);

    briefExcludedList.innerHTML = '';
    if (!data.excludedBrandTerms || data.excludedBrandTerms.length === 0) {
      briefExcludedSection.hidden = true;
    } else {
      briefExcludedSection.hidden = false;
      data.excludedBrandTerms.forEach(function (term) {
        var span = document.createElement('span');
        span.className = 'chip';
        span.textContent = term;
        briefExcludedList.appendChild(span);
      });
    }

    briefClustersBody.innerHTML = '';
    (data.clusters || []).forEach(function (cluster) {
      cluster.keywords.forEach(function (kw) {
        var tr = document.createElement('tr');
        tr.innerHTML =
          '<td>' + escapeHtml(kw.text) + '</td>' +
          '<td>' + kw.volume.toLocaleString() + '</td>' +
          '<td>' + escapeHtml(formatCompetition(kw.competition)) + '</td>' +
          '<td>' + kw.opportunity.toLocaleString() + '</td>';
        briefClustersBody.appendChild(tr);
      });
    });
    briefClustersNote.textContent =
      'Showing ' + (data.clusters || []).length + ' of ' + data.totalClustersFound.toLocaleString() + ' clusters found (' +
      data.totalKeywordsScored.toLocaleString() + ' keyword ideas scored in total).';

    briefLimitationsList.innerHTML = '';
    (data.knownLimitations || []).forEach(function (item) {
      var li = document.createElement('li');
      li.textContent = item;
      briefLimitationsList.appendChild(li);
    });

    briefEmpty.hidden = true;
    briefResults.hidden = false;
  }

  function setBriefLoading(isLoading) {
    briefSubmit.disabled = isLoading;
    briefStatus.hidden = !isLoading;
  }

  briefForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!currentKey) return;

    var topic = briefTopicInput.value.trim();
    if (!topic) return;

    briefError.hidden = true;
    briefResults.hidden = true;
    briefEmpty.hidden = true;
    setBriefLoading(true);

    if (isDemo) {
      setTimeout(function () {
        setBriefLoading(false);
        renderBrief(DEMO_BRIEF, 'live', null);
      }, 700);
      return;
    }

    fetch(API_BASE_URL + '/api/content-brief', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: currentKey,
        topic: topic,
        location: briefLocationSelect.value,
        intent: briefIntentSelect.value || undefined
      })
    })
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (result) {
        setBriefLoading(false);

        if (!result.ok || !result.data.ok) {
          var code = result.data && result.data.code;
          var msg = (result.data && result.data.message) || 'Something went wrong. Try again.';
          if (code === 'QUOTA_EXCEEDED') {
            msg = 'You’ve used your full monthly quota. Upgrade your plan to keep generating briefs.';
          }
          briefErrorText.innerHTML = escapeHtml(msg) + (code === 'QUOTA_EXCEEDED' ? ' <a href="upgrade.html">Upgrade →</a>' : '');
          briefError.hidden = false;
          briefEmpty.hidden = false;
          return;
        }

        renderBrief(result.data.result, result.data.source, result.data.cachedAt);

        // Refresh quota display — this call just counted against it (unless cached).
        verifyAndEnter(currentKey, { silent: true });
      })
      .catch(function () {
        setBriefLoading(false);
        briefErrorText.textContent = 'Network error — check your connection and that the API server is reachable.';
        briefError.hidden = false;
        briefEmpty.hidden = false;
      });
  });

  // ---------- PageSpeed Insights ----------
  function parsePagespeedResult(rawResult) {
    var lr = (rawResult && rawResult.lighthouseResult) || {};
    var categories = lr.categories || {};
    var audits = lr.audits || {};
    function scoreOf(key) {
      var c = categories[key];
      return c && c.score != null ? Math.round(c.score * 100) : null;
    }
    function auditVal(key) {
      var a = audits[key];
      return a && a.displayValue ? a.displayValue : '—';
    }
    return {
      scores: {
        performance: scoreOf('performance'),
        accessibility: scoreOf('accessibility'),
        bestPractices: scoreOf('best-practices'),
        seo: scoreOf('seo')
      },
      metrics: [
        { label: 'First Contentful Paint', value: auditVal('first-contentful-paint') },
        { label: 'Largest Contentful Paint', value: auditVal('largest-contentful-paint') },
        { label: 'Speed Index', value: auditVal('speed-index') },
        { label: 'Total Blocking Time', value: auditVal('total-blocking-time') },
        { label: 'Cumulative Layout Shift', value: auditVal('cumulative-layout-shift') }
      ]
    };
  }

  function scoreClass(score) {
    if (score == null) return '';
    if (score >= 90) return 'is-good';
    if (score >= 50) return 'is-mid';
    return 'is-poor';
  }

  function renderPagespeed(rawResult, source, url) {
    pagespeedSourceBadge.textContent = source === 'cache' ? 'from cache' : 'live result';
    pagespeedSourceBadge.className = 'source-badge ' + (source === 'cache' ? 'is-cache' : 'is-live');
    pagespeedUrlLabel.textContent = url;

    var parsed = parsePagespeedResult(rawResult);

    scoreTiles.innerHTML = '';
    [
      { key: 'performance', label: 'Performance' },
      { key: 'accessibility', label: 'Accessibility' },
      { key: 'bestPractices', label: 'Best Practices' },
      { key: 'seo', label: 'SEO' }
    ].forEach(function (item) {
      var score = parsed.scores[item.key];
      var div = document.createElement('div');
      div.className = 'score-tile ' + scoreClass(score);
      div.innerHTML =
        '<span class="score-tile-value">' + (score != null ? score : '—') + '</span>' +
        '<span class="score-tile-label">' + escapeHtml(item.label) + '</span>';
      scoreTiles.appendChild(div);
    });

    metricsList.innerHTML = '';
    parsed.metrics.forEach(function (m) {
      var row = document.createElement('div');
      row.className = 'metric-row';
      row.innerHTML = '<span class="metric-label">' + escapeHtml(m.label) + '</span><span class="metric-value">' + escapeHtml(m.value) + '</span>';
      metricsList.appendChild(row);
    });

    pagespeedEmpty.hidden = true;
    pagespeedResults.hidden = false;
  }

  function setPagespeedLoading(isLoading) {
    pagespeedSubmit.disabled = isLoading;
    pagespeedStatus.hidden = !isLoading;
  }

  pagespeedForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!currentKey) return;

    var url = pagespeedUrlInput.value.trim();
    if (!url) return;

    pagespeedError.hidden = true;
    pagespeedResults.hidden = true;
    pagespeedEmpty.hidden = true;
    setPagespeedLoading(true);

    if (isDemo) {
      setTimeout(function () {
        setPagespeedLoading(false);
        renderPagespeed(DEMO_PAGESPEED, 'live', url);
      }, 700);
      return;
    }

    fetch(API_BASE_URL + '/api/pagespeed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: currentKey, url: url, strategy: pagespeedStrategySelect.value })
    })
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (result) {
        setPagespeedLoading(false);

        if (!result.ok || !result.data.ok) {
          var code = result.data && result.data.code;
          var msg = (result.data && result.data.message) || 'Something went wrong. Try again.';
          if (code === 'QUOTA_EXCEEDED') {
            msg = 'You’ve used your full monthly quota. Upgrade your plan to keep analyzing pages.';
          }
          pagespeedErrorText.innerHTML = escapeHtml(msg) + (code === 'QUOTA_EXCEEDED' ? ' <a href="upgrade.html">Upgrade →</a>' : '');
          pagespeedError.hidden = false;
          pagespeedEmpty.hidden = false;
          return;
        }

        renderPagespeed(result.data.result, result.data.source, url);

        // Refresh quota display — this call just counted against it (unless cached).
        verifyAndEnter(currentKey, { silent: true });
      })
      .catch(function () {
        setPagespeedLoading(false);
        pagespeedErrorText.textContent = 'Network error — check your connection and that the API server is reachable.';
        pagespeedError.hidden = false;
        pagespeedEmpty.hidden = false;
      });
  });

  // ---------- Historical Metrics ----------
  function buildSparkline(volumes) {
    if (!volumes || volumes.length === 0) return '—';
    var blocks = '▁▂▃▄▅▆▇█';
    var values = volumes.map(function (v) { return v.monthlySearches || 0; });
    var min = Math.min.apply(null, values);
    var max = Math.max.apply(null, values);
    var range = max - min || 1;
    return values.map(function (v) {
      var idx = Math.round(((v - min) / range) * (blocks.length - 1));
      return blocks.charAt(idx);
    }).join('');
  }

  function parseHistoricalResults(payload) {
    var raw = payload || {};
    var list = raw.results || [];
    return list.map(function (item) {
      var metrics = item.keywordMetrics || {};
      var volumes = (metrics.monthlySearchVolumes || []).slice(-12);
      return {
        keyword: item.text || '—',
        avgMonthlySearches: metrics.avgMonthlySearches != null ? Number(metrics.avgMonthlySearches).toLocaleString() : '—',
        competition: formatCompetition(metrics.competition),
        sparkline: buildSparkline(volumes)
      };
    });
  }

  function renderHistoricalRows(rows) {
    historicalBody.innerHTML = '';
    if (rows.length === 0) {
      historicalEmpty.hidden = false;
      historicalEmpty.textContent = 'No historical data found for those keywords.';
      return;
    }
    historicalEmpty.hidden = true;
    rows.forEach(function (row) {
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + escapeHtml(row.keyword) + '</td>' +
        '<td>' + escapeHtml(row.avgMonthlySearches) + '</td>' +
        '<td>' + escapeHtml(row.competition) + '</td>' +
        '<td class="sparkline">' + escapeHtml(row.sparkline) + '</td>';
      historicalBody.appendChild(tr);
    });
  }

  function setHistoricalLoading(isLoading) {
    historicalSubmit.disabled = isLoading;
    historicalStatus.hidden = !isLoading;
  }

  historicalForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!currentKey) return;

    var keywords = historicalKeywordsInput.value.trim();
    if (!keywords) return;

    historicalError.hidden = true;
    historicalResultsWrap.hidden = true;
    historicalEmpty.hidden = true;
    setHistoricalLoading(true);

    if (isDemo) {
      setTimeout(function () {
        setHistoricalLoading(false);
        var rows = parseHistoricalResults(DEMO_HISTORICAL);
        historicalSourceBadge.textContent = 'live result';
        historicalSourceBadge.className = 'source-badge is-live';
        historicalResultCount.textContent = rows.length + ' keyword' + (rows.length === 1 ? '' : 's') + ' (demo data)';
        renderHistoricalRows(rows);
        historicalResultsWrap.hidden = false;
      }, 500);
      return;
    }

    fetch(API_BASE_URL + '/api/historical-metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: currentKey, keywords: keywords, location: historicalLocationSelect.value })
    })
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (result) {
        setHistoricalLoading(false);

        if (!result.ok || !result.data.ok) {
          var code = result.data && result.data.code;
          var msg = (result.data && result.data.message) || 'Something went wrong. Try again.';
          if (code === 'QUOTA_EXCEEDED') {
            msg = 'You’ve used your full monthly quota. Upgrade your plan to keep searching.';
          }
          historicalErrorText.innerHTML = escapeHtml(msg) + (code === 'QUOTA_EXCEEDED' ? ' <a href="upgrade.html">Upgrade →</a>' : '');
          historicalError.hidden = false;
          historicalEmpty.hidden = false;
          return;
        }

        var rows = parseHistoricalResults(result.data.result);
        historicalSourceBadge.textContent = result.data.source === 'cache' ? 'from cache' : 'live result';
        historicalSourceBadge.className = 'source-badge ' + (result.data.source === 'cache' ? 'is-cache' : 'is-live');
        historicalResultCount.textContent = rows.length + ' keyword' + (rows.length === 1 ? '' : 's');
        renderHistoricalRows(rows);
        historicalResultsWrap.hidden = false;

        // Refresh quota display — this call just counted against it (unless cached).
        verifyAndEnter(currentKey, { silent: true });
      })
      .catch(function () {
        setHistoricalLoading(false);
        historicalErrorText.textContent = 'Network error — check your connection and that the API server is reachable.';
        historicalError.hidden = false;
        historicalEmpty.hidden = false;
      });
  });

  // ---------- Boot ----------
  handleGscRedirectBanner();
  if (isDemo) {
    verifyAndEnter(localStorage.getItem(STORAGE_KEY) || DEMO_KEY, {});
  } else {
    // localStorage: "keep me logged in" from login.html/signup.html.
    // sessionStorage: same origin, this tab only (unchecked "keep me logged in").
    var storedKey = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);
    if (storedKey) {
      apiKeyInput.value = storedKey;
      verifyAndEnter(storedKey, {});
    }
  }
})();
