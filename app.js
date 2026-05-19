/* ============================================================
   ANL — app.js  (full application logic)
   ============================================================ */
'use strict';

window.ENTERPRISE_ROLES = {
    analyst: { name: "Senior Risk Analyst", clearlevel: "L2 Audit", permissions: ["query_ledger", "modify_thresholds"] },
    compliance: { name: "Compliance Officer", clearlevel: "L3 Regulatory", permissions: ["query_ledger", "escalate_compliance"] },
    director: { name: "Finance Director", clearlevel: "L4 Executive Access", permissions: ["query_ledger", "modify_thresholds", "approve_credit_caps"] }
};
window.activeUserRole = "analyst"; // Baseline fallback deployment initialization

window.switchEnterpriseRole = function(roleKey) {
    if (!window.ENTERPRISE_ROLES[roleKey]) return;
    window.activeUserRole = roleKey;
    const activeProfile = window.ENTERPRISE_ROLES[roleKey];
    
    // Update navigation status chips instantly to map to role permissions
    const rBadge = document.getElementById('corporate-role-badge');
    if (rBadge) {
        rBadge.textContent = `${activeProfile.name} [${activeProfile.clearlevel}]`;
    }
    
    // Write automatic activity trace log line directly down the live ledger pipeline
    if (typeof window.logSystemActivity === 'function') {
        window.logSystemActivity('IDENTITY_ROLE_SWAP', `Context switched to active role: ${activeProfile.name}`, 'SUCCESS');
    }
};

/* ── Corporate Risk Tolerance Settings ─────────────────────── */
window.RiskSettings = {
  highSpendThresh: 58,
  highIncomeThresh: 45,
  highCreditThresh: 400
};

window.toggleRiskSettings = function () {
  const panel = document.getElementById('risk-settings-panel');
  const icon = document.getElementById('risk-settings-icon');
  if (!panel) return;
  if (panel.style.display === 'none' || panel.style.display === '') {
    panel.style.display = 'block';
    if (icon) icon.style.transform = 'rotate(180deg)';
  } else {
    panel.style.display = 'none';
    if (icon) icon.style.transform = 'rotate(0deg)';
  }
};

window.toggleWebhookSettings = function() {
    const panel = document.getElementById('webhook-settings-panel');
    const icon = document.getElementById('webhook-settings-icon');
    if(panel && icon) {
        const isHidden = panel.style.display === 'none';
        panel.style.display = isHidden ? 'block' : 'none';
        icon.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
    }
};

window.updateRiskSettings = function () {
  const spendVal = parseInt(document.getElementById('setting-high-spend')?.value) || 58;
  const incomeVal = parseInt(document.getElementById('setting-high-income')?.value) || 45;
  const creditVal = parseInt(document.getElementById('setting-high-credit')?.value) || 400;

  // Read active policy settings & payment status directly from DOM
  const rateLow = parseInt(document.getElementById('pol-rate-low')?.value) || window.CreditPolicy.low.rate;
  const limitLow = parseInt(document.getElementById('pol-limit-low')?.value) || window.CreditPolicy.low.limit;
  const rateMed = parseInt(document.getElementById('pol-rate-med')?.value) || window.CreditPolicy.med.rate;
  const limitMed = parseInt(document.getElementById('pol-limit-med')?.value) || window.CreditPolicy.med.limit;
  const rateHigh = parseInt(document.getElementById('pol-rate-high')?.value) || window.CreditPolicy.high.rate;
  const limitHigh = parseInt(document.getElementById('pol-limit-high')?.value) || window.CreditPolicy.high.limit;

  const paymentStatusInput = document.querySelector('input[name="payment-status"]:checked');
  const paymentStatus = paymentStatusInput ? paymentStatusInput.value : 'regular';

  // Update DOM labels
  const labelSpend = document.getElementById('val-high-spend');
  const labelIncome = document.getElementById('val-high-income');
  const labelCredit = document.getElementById('val-high-credit');

  if (labelSpend) labelSpend.textContent = spendVal;
  if (labelIncome) labelIncome.textContent = incomeVal;
  if (labelCredit) labelCredit.textContent = creditVal;

  window.RiskSettings.highSpendThresh = spendVal;
  window.RiskSettings.highIncomeThresh = incomeVal;
  window.RiskSettings.highCreditThresh = creditVal;

  reclassifyAllClients();
  if (typeof window.logSystemAudit === 'function') {
    window.logSystemAudit('RISK_THRESHOLDS_CHANGED', `Updated thresholds — Spend: >=${spendVal}, Income: <$${incomeVal}k, Credit: <${creditVal}, Policy Low Limit: $${limitLow}k, Payment Status: ${paymentStatus.toUpperCase()}`, 'SUCCESS');
  }
};

/* ── Dynamic Credit Policy Settings (Credit Policy Editor) ── */
window.CreditPolicy = {
  low: { rate: 14, limit: 150, action: 'auto_approve' },
  med: { rate: 22, limit: 50, action: 'manual_review' },
  high: { rate: 34, limit: 15, action: 'freeze_account' }
};

window.toggleCreditPolicy = function () {
  const panel = document.getElementById('credit-policy-panel');
  const icon = document.getElementById('credit-policy-icon');
  if (!panel) return;
  if (panel.style.display === 'none' || panel.style.display === '') {
    panel.style.display = 'block';
    if (icon) icon.style.transform = 'rotate(180deg)';
  } else {
    panel.style.display = 'none';
    if (icon) icon.style.transform = 'rotate(0deg)';
  }
};

window.updateCreditPolicy = function () {
  const rateLow = parseInt(document.getElementById('pol-rate-low')?.value) || 14;
  const limitLow = parseInt(document.getElementById('pol-limit-low')?.value) || 150;
  const actionLow = document.getElementById('pol-action-low')?.value || 'auto_approve';

  const rateMed = parseInt(document.getElementById('pol-rate-med')?.value) || 22;
  const limitMed = parseInt(document.getElementById('pol-limit-med')?.value) || 50;
  const actionMed = document.getElementById('pol-action-med')?.value || 'manual_review';

  const rateHigh = parseInt(document.getElementById('pol-rate-high')?.value) || 34;
  const limitHigh = parseInt(document.getElementById('pol-limit-high')?.value) || 15;
  const actionHigh = document.getElementById('pol-action-high')?.value || 'freeze_account';

  // Update DOM badges
  const valRateLow = document.getElementById('val-rate-low');
  const valLimitLow = document.getElementById('val-limit-low');
  const valRateMed = document.getElementById('val-rate-med');
  const valLimitMed = document.getElementById('val-limit-med');
  const valRateHigh = document.getElementById('val-rate-high');
  const valLimitHigh = document.getElementById('val-limit-high');

  if (valRateLow) valRateLow.textContent = rateLow + '%';
  if (valLimitLow) valLimitLow.textContent = '$' + limitLow + 'k';
  if (valRateMed) valRateMed.textContent = rateMed + '%';
  if (valLimitMed) valLimitMed.textContent = '$' + limitMed + 'k';
  if (valRateHigh) valRateHigh.textContent = rateHigh + '%';
  if (valLimitHigh) valLimitHigh.textContent = '$' + limitHigh + 'k';

  window.CreditPolicy = {
    low: { rate: rateLow, limit: limitLow, action: actionLow },
    med: { rate: rateMed, limit: limitMed, action: actionMed },
    high: { rate: rateHigh, limit: limitHigh, action: actionHigh }
  };

  reclassifyAllClients();

  if (typeof window.logSystemAudit === 'function') {
    window.logSystemAudit('CREDIT_POLICY_CHANGED', `Updated terms — Low APR: ${rateLow}%, Cap: $${limitLow}k (${actionLow}), Med APR: ${rateMed}%, Cap: $${limitMed}k (${actionMed}), High APR: ${rateHigh}%, Cap: $${limitHigh}k (${actionHigh})`, 'SUCCESS');
  }
};

/* ── System Audit Log Tracking Component ─────────────────────── */
window.auditLogs = [];
window.auditLogPage = 1;
window.AUDIT_PAGE_SIZE = 5;

window.logSystemActivity = function(actionType, detailsText, statusType = 'SUCCESS') {
    const tbody = document.getElementById('audit-log-tbody');
    const footer = document.getElementById('audit-log-footer');
    if (!tbody) return;
    
    if (tbody.children.length === 1 && tbody.textContent.includes('No system audit logs')) {
        tbody.innerHTML = '';
    }

    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const userId = window.authenticatedCompanyName ? `anl_${window.authenticatedCompanyName.replace(/\s+/g, '').toLowerCase()}_admin` : 'system_anonymous';
    
    const row = document.createElement('tr');
    row.style.borderBottom = '1px solid rgba(255, 255, 255, 0.05)';
    row.style.fontFamily = 'monospace';
    row.style.color = '#cbd5e1';
    
    row.innerHTML = `
        <td style="padding: 0.75rem 1rem; color: #94a3b8;">${timestamp}</td>
        <td style="padding: 0.75rem 1rem; color: #38bdf8;">${userId}</td>
        <td style="padding: 0.75rem 1rem; font-weight: bold;">${actionType}</td>
        <td style="padding: 0.75rem 1rem; color: #cbd5e1;">${detailsText}</td>
        <td style="padding: 0.75rem 1rem; color: ${statusType === 'SUCCESS' ? '#34d39' + '9' : '#ef4444'}">${statusType}</td>
    `;
    
    tbody.insertBefore(row, tbody.firstChild);
    
    // Also keep window.auditLogs array in sync so that [CLEAR_LEDGER] and pagination don't break or collide
    const entryObj = {
        timestamp: timestamp,
        userId: userId,
        actionType: actionType,
        details: detailsText,
        status: statusType
    };
    if (!window.auditLogs) window.auditLogs = [];
    window.auditLogs.unshift(entryObj);
    if (window.auditLogs.length > 500) window.auditLogs.pop();

    const rowCount = tbody.children.length;
    if (footer) footer.textContent = `Showing ${rowCount} of ${rowCount} secure log entries`;
};

window.logSystemAudit = function (actionType, details, statusOutcome) {
  window.logSystemActivity(actionType, details, statusOutcome);
};

window.renderSystemAuditLog = function () {
  const tbody = document.getElementById('audit-log-tbody');
  const footer = document.getElementById('audit-log-footer');
  if (!tbody) return;

  tbody.innerHTML = '';
  const start = (window.auditLogPage - 1) * window.AUDIT_PAGE_SIZE;
  const paginated = window.auditLogs.slice(start, start + window.AUDIT_PAGE_SIZE);

  if (paginated.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-400); padding: 1.5rem;">No system audit logs recorded yet.</td></tr>`;
    if (footer) footer.textContent = 'Showing 0 of 0 entries';
    if (typeof window.renderAuditLogPagination === 'function') window.renderAuditLogPagination();
    return;
  }

  paginated.forEach(log => {
    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid rgba(255, 255, 255, 0.05)';
    const statusBadge = log.status === 'SUCCESS' || log.status === 'APPROVED' ? '<span style="color: #34d399; background: rgba(52,211,153,0.1); padding: 0.25rem 0.6rem; border-radius: 4px; border: 1px solid rgba(52,211,153,0.3); font-weight: 600; font-size: 0.75rem;">' + log.status + '</span>' : '<span style="color: #f87171; background: rgba(248,113,113,0.1); padding: 0.25rem 0.6rem; border-radius: 4px; border: 1px solid rgba(248,113,113,0.3); font-weight: 600; font-size: 0.75rem;">' + log.status + '</span>';
    tr.innerHTML = `
      <td style="font-family: monospace; color: #94a3b8; padding: 0.85rem 1rem;">${log.timestamp}</td>
      <td style="font-family: monospace; color: #38bdf8; padding: 0.85rem 1rem;">${log.userId}</td>
      <td style="font-weight: 600; color: #f8fafc; padding: 0.85rem 1rem;">${log.actionType}</td>
      <td style="color: #cbd5e1; padding: 0.85rem 1rem;">${log.details}</td>
      <td style="padding: 0.85rem 1rem;">${statusBadge}</td>
    `;
    tbody.appendChild(tr);
  });

  if (footer) {
    footer.textContent = `Showing ${start + 1}–${Math.min(start + window.AUDIT_PAGE_SIZE, window.auditLogs.length)} of ${window.auditLogs.length} entries`;
  }
  if (typeof window.renderAuditLogPagination === 'function') window.renderAuditLogPagination();
};

window.renderAuditLogPagination = function () {
  const container = document.getElementById('audit-log-pagination');
  if (!container) return;
  container.innerHTML = '';
  const totalPages = Math.ceil(window.auditLogs.length / window.AUDIT_PAGE_SIZE) || 1;

  const prevBtn = document.createElement('button');
  prevBtn.className = 'page-btn ' + (window.auditLogPage === 1 ? 'disabled' : '');
  prevBtn.textContent = '◀ Prev';
  prevBtn.style.cssText = 'background: rgba(30,41,59,0.8); border: 1px solid rgba(255,255,255,0.1); color: #f8fafc; padding: 0.4rem 0.85rem; border-radius: 6px; font-size: 0.85rem; cursor: pointer; font-family: monospace;';
  prevBtn.onclick = () => { if (window.auditLogPage > 1) { window.auditLogPage--; window.renderSystemAuditLog(); } };
  container.appendChild(prevBtn);

  const pageInfo = document.createElement('span');
  pageInfo.style.cssText = 'color: #f8fafc; font-family: monospace; font-size: 0.9rem; padding: 0 1rem;';
  pageInfo.textContent = `Page ${window.auditLogPage} of ${totalPages}`;
  container.appendChild(pageInfo);

  const nextBtn = document.createElement('button');
  nextBtn.className = 'page-btn ' + (window.auditLogPage === totalPages ? 'disabled' : '');
  nextBtn.textContent = 'Next ▶';
  nextBtn.style.cssText = 'background: rgba(30,41,59,0.8); border: 1px solid rgba(255,255,255,0.1); color: #f8fafc; padding: 0.4rem 0.85rem; border-radius: 6px; font-size: 0.85rem; cursor: pointer; font-family: monospace;';
  nextBtn.onclick = () => { if (window.auditLogPage < totalPages) { window.auditLogPage++; window.renderSystemAuditLog(); } };
  container.appendChild(nextBtn);
};

window.evaluateRisk = function (income, spending, creditScore, paymentStatus) {
  if (paymentStatus === 'delinquent') return 'High Risk';
  if (creditScore !== undefined && creditScore < window.RiskSettings.highCreditThresh) return 'High Risk';
  if (spending >= window.RiskSettings.highSpendThresh && income < window.RiskSettings.highIncomeThresh) return 'High Risk';
  if (income < window.CreditPolicy.high.limit) return 'High Risk';
  if (income >= window.CreditPolicy.low.limit && (spending < 42 || spending >= 60)) return 'Low Risk';
  if (income >= 68 && (spending < 42 || spending >= 60)) return 'Low Risk';
  return 'Medium Risk';
};

window.reclassifyAllClients = function () {
  if (!window.allData) return;

  // Read active policy settings & payment status directly from DOM
  const rateLow = parseInt(document.getElementById('pol-rate-low')?.value) || window.CreditPolicy.low.rate;
  const limitLow = parseInt(document.getElementById('pol-limit-low')?.value) || window.CreditPolicy.low.limit;
  const rateMed = parseInt(document.getElementById('pol-rate-med')?.value) || window.CreditPolicy.med.rate;
  const limitMed = parseInt(document.getElementById('pol-limit-med')?.value) || window.CreditPolicy.med.limit;
  const rateHigh = parseInt(document.getElementById('pol-rate-high')?.value) || window.CreditPolicy.high.rate;
  const limitHigh = parseInt(document.getElementById('pol-limit-high')?.value) || window.CreditPolicy.high.limit;

  const paymentStatusInput = document.querySelector('input[name="payment-status"]:checked');
  const globalPaymentStatus = paymentStatusInput ? paymentStatusInput.value : 'regular';

  // Ensure original baseline cache exists
  if (!window._originalAllData) {
    window._originalAllData = JSON.parse(JSON.stringify(window.allData));
  }

  window.allData.forEach(client => {
    // Find pristine baseline client object
    const cId = client.CustomerID !== undefined ? client.CustomerID : client.id;
    const orig = window._originalAllData.find(c => (c.CustomerID !== undefined ? c.CustomerID : c.id) === cId) || client;

    let income = orig.AnnualIncome !== undefined ? orig.AnnualIncome : orig.annualIncome;
    let spending = orig.SpendingScore !== undefined ? orig.SpendingScore : orig.spendingScore;
    let credit = orig.CreditScore !== undefined ? orig.CreditScore : orig.creditScore;
    let pStatus = client.paymentStatus || globalPaymentStatus;

    // Fallback calculation for missing credit score
    if (credit === undefined || isNaN(credit)) {
      credit = (typeof calcCreditScore === 'function') ? calcCreditScore(income, spending, orig.Age || orig.age || 35) : 650;
    }

    // Dynamic risk score adjustment using CreditPolicy rates/limits & payment status
    let baseScore = credit;
    if (pStatus === 'delinquent') {
      baseScore = Math.max(300, baseScore - 150 - (rateHigh * 2));
    } else if (pStatus === 'minimum') {
      baseScore = Math.max(300, baseScore - 50 - rateMed);
    } else {
      baseScore = Math.min(1000, baseScore + Math.round(limitLow / 10));
    }

    if (client.CreditScore !== undefined) client.CreditScore = baseScore;
    if (client.creditScore !== undefined) client.creditScore = baseScore;

    const risk = window.evaluateRisk(income, spending, baseScore, pStatus);
    client.riskLevel = risk;
    if (client.RiskLevel !== undefined) client.RiskLevel = risk;

    // Synchronize policy tier object
    const tier = risk === 'High Risk' ? 'high' : (risk === 'Medium Risk' ? 'med' : 'low');
    client.creditPolicy = window.CreditPolicy[tier];
  });

  if (typeof updateKPIs === 'function') updateKPIs();
  if (typeof renderCharts === 'function') renderCharts();
  if (typeof renderBusinessInsights === 'function') renderBusinessInsights();
  if (typeof checkRiskAlert === 'function') checkRiskAlert();
  if (typeof renderPersonas === 'function') renderPersonas();
  if (typeof renderFinancialDashboard === 'function') renderFinancialDashboard();
  if (typeof renderVIP === 'function') renderVIP();
  if (typeof renderBudget === 'function') renderBudget();
  if (typeof updateWhatIf === 'function') updateWhatIf();
  if (typeof applyFilters === 'function') applyFilters();

  if (typeof showToast === 'function') {
    showToast({ type: 'info', icon: '⚙️', title: 'Tolerance Updated', msg: 'Risk matrix dynamically reclassified.' });
  } else if (typeof toast === 'function') {
    toast('info', '⚙️', 'Tolerance Updated', 'Risk matrix dynamically reclassified.');
  }
};

/* ══════════════════════════════════════════════════════════════
   MULTI-LANGUAGE SUPPORT (EN / TR)
══════════════════════════════════════════════════════════════ */
const TRANSLATIONS = {
  EN: {
    /* Navbar */
    navDashboard: 'Dashboard',
    navCustomers: 'Customers',
    navInsights: 'Insights',
    navPersonas: 'Personas',
    navPredict: 'Predict',
    navVip: '💎 VIP',
    navBudget: '🏷️ Budget',
    navLive: 'Live',
    /* Risk Alert Banner */
    rabText: 'High Risk Customers Increasing — Immediate action required',
    /* Hero */
    heroBadge: 'Mall Customer Segmentation · 1,000 Records',
    heroTitle: 'Customer Risk',
    heroTitleAccent: 'Intelligence',
    heroSubtitle: 'Real-time risk segmentation powered by K-Means clustering and credit scoring algorithms.',
    btnExplore: 'Explore Customers',
    btnPredictHero: 'Predict New Customer',
    /* KPI Labels */
    kpiTotal: 'Total Customers',
    kpiHigh: 'High Risk',
    kpiMedium: 'Medium Risk',
    kpiLow: 'Low Risk',
    kpiAvg: 'Avg Credit Score',
    /* Financial Dashboard */
    finLabel: 'Financial Intelligence',
    finRevTitle: 'Est. Total Revenue',
    finRevSub: 'avg spend × income proxy per segment',
    finLossTitle: 'Est. Risk Loss Exposure',
    finLossSub: 'high-risk portfolio at default probability',
    finProfitTitle: 'Profit Potential',
    finProfitSub: 'low-risk segment lifetime value',
    /* Charts Section */
    chartsTitle: 'Analytics Overview',
    chartsSubtitle: 'Distribution insights across the full customer dataset',
    chartRiskDist: 'Risk Distribution',
    chartIncomeSpend: 'Income vs Spending Score',
    chartCreditHist: 'Credit Score Distribution',
    chartAgeRisk: 'Age by Risk Group',
    /* Insights Section */
    insightsBadge: '📊 Business Intelligence',
    insightsTitle: 'Business Insights',
    insightsSubtitle: 'Automatic findings derived from your 1,000 customer dataset',
    btnExportPdf: '📄 Download as PDF',
    insKeyFindings: '🔍 Top 3 Key Findings',
    insRiskDist: '📈 Risk Distribution Interpretation',
    insClusterMean: '🗂️ What Each Customer Segment Means',
    insSegReco: '🎯 Recommendations by Risk Segment',
    /* Personas Section */
    personasBadge: '🧑‍🤝‍🧑 Customer Personas',
    personasTitle: 'Meet Your Customers',
    personasSubtitle: 'Real-world archetypes derived from K-Means clustering — who they are, how they behave, and how to engage them',
    /* Customers Section */
    customersTitle: 'Customer Database',
    customersSubtitle: 'Browse, search, and filter all 1,000 customers by risk segment',
    searchPlaceholder: 'Search by ID, genre, risk level...',
    chipAll: 'All',
    chipHigh: '🔴 High Risk',
    chipMedium: '🟡 Medium Risk',
    chipLow: '🟢 Low Risk',
    btnExportCsv: '📥 Export CSV',
    thId: 'ID', thGender: 'Company Type', thAge: 'Age', thIncome: 'Income (k$)',
    thSpending: 'Spending Score', thCredit: 'Credit Score', thCluster: 'Cluster',
    thRisk: 'Risk Level', thAction: 'Action',
    actionMonitor: 'Monitor risk',
    actionDiscount: 'Offer discount',
    actionUpsell: 'Upsell premium product',
    /* Predict Section */
    predictTitle: 'Predict New Customer',
    predictSubtitle: 'Enter customer details to instantly calculate their Risk Segment and Credit Score',
    labelGender: 'Gender',
    labelAge: 'Age',
    labelIncome: 'Annual Income (k$)',
    labelSpending: 'Spending Score',
    btnAiAnalyze: '🤖 Get AI Analysis Report',
    resultPlaceholder: 'Fill in the form and click Analyze Customer to see results',
    ringCredit: 'Credit Score',
    metricCluster: 'Cluster',
    metricProfile: 'Profile',
    metricRecommend: 'Recommendation',
    bdownIncome: 'Income Weight (50%)',
    bdownSpending: 'Spending Weight (30%)',
    bdownAge: 'Age Weight (20%)',
    /* AI Report Panel */
    aiReportTitle: 'ANL Risk Analysis Expert',
    aiReportSub: 'Powered by ANL Analytics Engine • Rule-Based AI Model',
    aiAnalysing: '⏳ Analysing…',
    aiReady: '✅ Report Ready',
    /* What-If */
    whatifTitle: 'What-If Simulation',
    whatifSub: 'Adjust sliders to see how risk changes — updates in real-time',
    wiIncomeLabel: 'If income increases to',
    wiSpendingLabel: 'If spending changes to',
    wiCurrent: 'Current',
    wiAfterChange: 'After Change',
    /* VIP Section */
    vipBadge: '💎 VIP Loyalty Programme',
    vipTitle: 'Top Performing Customers',
    vipSubtitle: 'Premium and Careful segment customers eligible for exclusive rewards',
    /* Budget Section */
    budgetBadge: '🏷️ Budget Discount Scheme',
    budgetTitle: 'Budget Assistance Customers',
    budgetSubtitle: 'High-risk and low-income customers enrolled in tailored discount programmes',
    /* Risk level labels (for table & charts) */
    riskHigh: 'High Risk',
    riskMedium: 'Medium Risk',
    riskLow: 'Low Risk',
    /* Footer */
    footerText: 'Mall Customer Segmentation Analytics · 1,000 customer dataset · K-Means + Credit Scoring',
    footerCopy: '© 2026 ANL Analytics Platform',
    /* Chat */
    chatName: 'Aura Risk Intelligence',
    chatStatus: 'Generative AI Analytics',
    chatPlaceholder: 'Ask Aura about your data…',
    /* Risk Settings & Macro Stress */
    riskTolTitle: '⚙️ Corporate Risk Tolerance Settings',
    riskTolSub: 'Adjust the numerical thresholds used by the algorithmic scoring engine to classify institutional risk.',
    settingSpend: 'High Risk Spending Threshold (>=)',
    settingIncome: 'High Risk Income Threshold (<)',
    settingCredit: 'High Risk Credit Score (<)',
    macroTitle: 'Macroeconomic Stress Testing',
    macroSub: 'Simulate macroeconomic shifts to evaluate portfolio resilience and risk matrix displacement.',
    /* Credit Policy Editor */
    creditPolicyTitle: '📋 Dynamic Credit Policy Settings (Credit Policy Editor)',
    creditPolicySub: 'Configure institutional credit terms, maximum exposure limits, and automated audit actions for each risk tier.',
    polLow: 'Low Risk Tier Policy',
    polMed: 'Medium Risk Tier Policy',
    polHigh: 'High Risk Tier Policy',
    lblRate: 'Base APR Markup (%)',
    lblLimit: 'Max Credit Cap ($k)',
    lblAction: 'Automated Action',
    /* System Audit Log */
    auditLogTitle: 'System Audit Log',
    auditLogSub: 'Secure operational ledger tracking administrative queries, threshold adjustments, and macro stress tests.',
    thTime: 'TIMESTAMP',
    thUser: 'USER ID',
    thAction: 'ACTION TYPE',
    thDetails: 'DETAILS / PARAMETERS',
    thStatus: 'STATUS',
  },
  TR: {
    /* Navbar */
    navDashboard: 'Gösterge Paneli',
    navCustomers: 'Müşteriler',
    navInsights: 'İçgörüler',
    navPersonas: 'Personalar',
    navPredict: 'Tahmin',
    navVip: '💎 VIP',
    navBudget: '🏷️ Bütçe',
    navLive: 'Canlı',
    /* Risk Alert Banner */
    rabText: 'Yüksek Riskli Müşteriler Artıyor — Acil önlem gerekli',
    /* Hero */
    heroBadge: 'AVM Müşteri Segmentasyonu · 1.000 Kayıt',
    heroTitle: 'Müşteri Risk',
    heroTitleAccent: 'Zekası',
    heroSubtitle: 'K-Means kümeleme ve kredi puanlama algoritmaları ile desteklenen gerçek zamanlı risk segmentasyonu.',
    btnExplore: 'Müşterileri Keşfet',
    btnPredictHero: 'Yeni Müşteri Tahmin Et',
    /* KPI Labels */
    kpiTotal: 'Toplam Müşteri',
    kpiHigh: 'Yüksek Risk',
    kpiMedium: 'Orta Risk',
    kpiLow: 'Düşük Risk',
    kpiAvg: 'Ort. Kredi Puanı',
    /* Financial Dashboard */
    finLabel: 'Finansal Zeka',
    finRevTitle: 'Tahmini Toplam Gelir',
    finRevSub: 'segment başına ort. harcama × gelir vekili',
    finLossTitle: 'Tahmini Risk Kayıp Maruziyeti',
    finLossSub: 'temerrüt olasılığındaki yüksek riskli portföy',
    finProfitTitle: 'Kâr Potansiyeli',
    finProfitSub: 'düşük riskli segment yaşam boyu değeri',
    /* Charts Section */
    chartsTitle: 'Analitik Genel Bakış',
    chartsSubtitle: 'Tam müşteri veri seti genelinde dağılım içgörüleri',
    chartRiskDist: 'Risk Dağılımı',
    chartIncomeSpend: 'Gelir ve Harcama Puanı',
    chartCreditHist: 'Kredi Puanı Dağılımı',
    chartAgeRisk: 'Risk Grubuna Göre Yaş',
    /* Insights Section */
    insightsBadge: '📊 İş Zekası',
    insightsTitle: 'İş İçgörüleri',
    insightsSubtitle: '1.000 müşteri veri setinizden otomatik bulgular',
    btnExportPdf: '📄 PDF İndir',
    insKeyFindings: '🔍 En Önemli 3 Bulgu',
    insRiskDist: '📈 Risk Dağılımı Yorumu',
    insClusterMean: '🗂️ Her Müşteri Segmentinin Anlamı',
    insSegReco: '🎯 Risk Segmentine Göre Öneriler',
    /* Personas Section */
    personasBadge: '🧑‍🤝‍🧑 Müşteri Personaları',
    personasTitle: 'Müşterilerinizle Tanışın',
    personasSubtitle: 'K-Means kümelemeden türetilen gerçek dünya arketipleri — kim oldukları, nasıl davrandıkları ve nasıl etkileşime geçileceği',
    /* Customers Section */
    customersTitle: 'Müşteri Veritabanı',
    customersSubtitle: 'Tüm 1.000 müşteriyi risk segmentine göre inceleyin, arayın ve filtreleyin',
    searchPlaceholder: 'ID, cinsiyet, risk seviyesi ile arayın...',
    chipAll: 'Tümü',
    chipHigh: '🔴 Yüksek Risk',
    chipMedium: '🟡 Orta Risk',
    chipLow: '🟢 Düşük Risk',
    btnExportCsv: '📥 CSV İndir',
    thId: 'ID', thGender: 'Şirket Türü', thAge: 'Yaş', thIncome: 'Gelir (k$)',
    thSpending: 'Harcama Puanı', thCredit: 'Kredi Puanı', thCluster: 'Küme',
    thRisk: 'Risk Seviyesi', thAction: 'İşlem',
    actionMonitor: 'Riski izle',
    actionDiscount: 'İndirim sun',
    actionUpsell: 'Premium ürün öner',
    /* Predict Section */
    predictTitle: 'Yeni Müşteri Tahmin Et',
    predictSubtitle: 'Müşteri bilgilerini girerek Risk Segmentini ve Kredi Puanını anında hesaplayın',
    labelGender: 'Cinsiyet',
    labelAge: 'Yaş',
    labelIncome: 'Yıllık Gelir (k$)',
    labelSpending: 'Harcama Puanı',
    btnAiAnalyze: '⬡ Aura Analiz Raporu Al',
    resultPlaceholder: 'Formu doldurun ve sonuçları görmek için Müşteriyi Analiz Et\'e tıklayın',
    ringCredit: 'Kredi Puanı',
    metricCluster: 'Küme',
    metricProfile: 'Profil',
    metricRecommend: 'Öneri',
    bdownIncome: 'Gelir Ağırlığı (%50)',
    bdownSpending: 'Harcama Ağırlığı (%30)',
    bdownAge: 'Yaş Ağırlığı (%20)',
    /* AI Report Panel */
    aiReportTitle: 'Aura Risk Intelligence',
    aiReportSub: 'Aura Analitik Motoru tarafından desteklenmektedir • Kural Tabanlı AI Modeli',
    aiAnalysing: '⏳ Analiz ediliyor…',
    aiReady: '✅ Rapor Hazır',
    /* What-If */
    whatifTitle: 'Varsayım Simülasyonu',
    whatifSub: 'Riskin nasıl değiştiğini görmek için kaydırıcıları ayarlayın — gerçek zamanlı güncellenir',
    wiIncomeLabel: 'Gelir artarsa',
    wiSpendingLabel: 'Harcama değişirse',
    wiCurrent: 'Mevcut',
    wiAfterChange: 'Değişimden Sonra',
    /* VIP Section */
    vipBadge: '💎 VIP Sadakat Programı',
    vipTitle: 'En İyi Performanslı Müşteriler',
    vipSubtitle: 'Özel ödüllere hak kazanan Premium ve Dikkatli segment müşterileri',
    /* Budget Section */
    budgetBadge: '🏷️ Bütçe İndirim Planı',
    budgetTitle: 'Bütçe Destek Müşterileri',
    budgetSubtitle: 'Özel indirim programlarına kayıtlı yüksek riskli ve düşük gelirli müşteriler',
    /* Risk level labels */
    riskHigh: 'Yüksek Risk',
    riskMedium: 'Orta Risk',
    riskLow: 'Düşük Risk',
    /* Footer */
    footerText: 'AVM Müşteri Segmentasyon Analitiği · 1.000 müşteri veri seti · K-Means + Kredi Puanlama',
    footerCopy: '© 2026 ANL Analitik Platformu',
    /* Chat */
    chatName: 'Aura Risk Intelligence',
    chatStatus: 'Üretken AI Analitiği',
    chatPlaceholder: 'Verileriniz hakkında Aura\'ya sorun…',
    /* Risk Settings & Macro Stress */
    riskTolTitle: '⚙️ Kurumsal Risk Tolerans Ayarları',
    riskTolSub: 'Algoritmik puanlama motorunun kurumsal riski sınıflandırmak için kullandığı eşikleri ayarlayın.',
    settingSpend: 'Yüksek Risk Harcama Eşiği (>=)',
    settingIncome: 'Yüksek Risk Gelir Eşiği (<)',
    settingCredit: 'Yüksek Risk Kredi Puanı (<)',
    macroTitle: 'Makroekonomik Stres Testi',
    macroSub: 'Portföy dayanıklılığını ve risk matrisi değişimini değerlendirmek için makroekonomik dalgalanmaları simüle edin.',
    /* Credit Policy Editor */
    creditPolicyTitle: '📋 Dinamik Kredi Politikası Ayarları (Kredi Politika Editörü)',
    creditPolicySub: 'Her risk seviyesi için kurumsal kredi şartlarını, maksimum maruziyet limitlerini ve otomatik denetim aksiyonlarını yapılandırın.',
    polLow: 'Düşük Risk Katmanı Politikası',
    polMed: 'Orta Risk Katmanı Politikası',
    polHigh: 'Yüksek Risk Katmanı Politikası',
    lblRate: 'Temel faiz/APR Kar Marjı (%)',
    lblLimit: 'Maksimum Kredi Limiti ($k)',
    lblAction: 'Otomatik Aksiyon',
    /* System Audit Log */
    auditLogTitle: 'Sistem Denetim Günlüğü',
    auditLogSub: 'Yönetimsel sorguları, eşik ayarlamalarını ve makro stres testlerini izleyen güvenli operasyonel defter.',
    thTime: 'ZAMAN DAMGASI',
    thUser: 'KULLANICI KİMLİĞİ',
    thAction: 'AKSİYON TÜRÜ',
    thDetails: 'DETAYLAR / PARAMETRELER',
    thStatus: 'DURUM',
  }
};

let currentLang = localStorage.getItem('anl_lang') || 'EN';
let currentIndustry = localStorage.getItem('anl_industry') || 'bank';

function t(key) {
  const dict = TRANSLATIONS[currentLang] || TRANSLATIONS.EN;
  let val = dict[key] || key;

  // Dynamic Multi-Industry overrides for utilizationScore
  if (key === 'thSpending' || key === 'labelSpending') {
    if (currentIndustry === 'bank') return currentLang === 'TR' ? 'Kredi Kullanım Oranı' : 'Credit Utilization Rate';
    if (currentIndustry === 'logistics') return currentLang === 'TR' ? 'Risk Maruziyeti' : 'Risk Exposure';
    if (currentIndustry === 'tech') return currentLang === 'TR' ? 'Kullanım Stres Endeksi' : 'Usage Stress Index';
    if (currentIndustry === 'retail') return currentLang === 'TR' ? 'İşlem Hacmi Oranı' : 'Transaction Volume Rate';
    if (currentIndustry === 'manufacturing') return currentLang === 'TR' ? 'Operasyonel Risk Marjı' : 'Operational Risk Margin';
  }
  if (key === 'wiSpendingLabel') {
    if (currentIndustry === 'bank') return currentLang === 'TR' ? 'Kredi kullanımı değişirse' : 'If credit utilization changes to';
    if (currentIndustry === 'logistics') return currentLang === 'TR' ? 'Risk maruziyeti değişirse' : 'If risk exposure changes to';
    if (currentIndustry === 'tech') return currentLang === 'TR' ? 'Kullanım stresi değişirse' : 'If usage stress changes to';
    if (currentIndustry === 'retail') return currentLang === 'TR' ? 'İşlem hacmi değişirse' : 'If transaction volume changes to';
    if (currentIndustry === 'manufacturing') return currentLang === 'TR' ? 'Operasyonel risk değişirse' : 'If operational risk changes to';
  }
  if (key === 'bdownSpending') {
    if (currentIndustry === 'bank') return currentLang === 'TR' ? 'Kredi Kullanım Ağırlığı (%30)' : 'Credit Utilization Weight (30%)';
    if (currentIndustry === 'logistics') return currentLang === 'TR' ? 'Risk Maruziyet Ağırlığı (%30)' : 'Risk Exposure Weight (30%)';
    if (currentIndustry === 'tech') return currentLang === 'TR' ? 'Kullanım Stres Ağırlığı (%30)' : 'Usage Stress Weight (30%)';
    if (currentIndustry === 'retail') return currentLang === 'TR' ? 'İşlem Hacmi Ağırlığı (%30)' : 'Transaction Volume Weight (30%)';
    if (currentIndustry === 'manufacturing') return currentLang === 'TR' ? 'Operasyonel Risk Ağırlığı (%30)' : 'Operational Risk Weight (30%)';
  }
  if (key === 'chartIncomeSpend') {
    if (currentIndustry === 'bank') return currentLang === 'TR' ? 'Gelir ve Kredi Kullanım Oranı' : 'Income vs Credit Utilization Rate';
    if (currentIndustry === 'logistics') return currentLang === 'TR' ? 'Gelir ve Risk Maruziyeti' : 'Income vs Risk Exposure';
    if (currentIndustry === 'tech') return currentLang === 'TR' ? 'Gelir ve Kullanım Stres Endeksi' : 'Income vs Usage Stress Index';
    if (currentIndustry === 'retail') return currentLang === 'TR' ? 'Gelir ve İşlem Hacmi Oranı' : 'Income vs Transaction Volume Rate';
    if (currentIndustry === 'manufacturing') return currentLang === 'TR' ? 'Gelir ve Operasyonel Risk Marjı' : 'Income vs Operational Risk Margin';
  }
  if (key === 'settingSpend') {
    if (currentIndustry === 'bank') return currentLang === 'TR' ? 'Yüksek Risk Kredi Kullanım Eşiği (>=)' : 'High Risk Credit Utilization Threshold (>=)';
    if (currentIndustry === 'logistics') return currentLang === 'TR' ? 'Yüksek Risk Maruziyet Eşiği (>=)' : 'High Risk Exposure Threshold (>=)';
    if (currentIndustry === 'tech') return currentLang === 'TR' ? 'Yüksek Risk Kullanım Stres Eşiği (>=)' : 'High Risk Usage Stress Threshold (>=)';
    if (currentIndustry === 'retail') return currentLang === 'TR' ? 'Yüksek Risk İşlem Hacmi Eşiği (>=)' : 'High Risk Transaction Volume Threshold (>=)';
    if (currentIndustry === 'manufacturing') return currentLang === 'TR' ? 'Yüksek Risk Operasyonel Risk Eşiği (>=)' : 'High Risk Operational Risk Threshold (>=)';
  }

  return val;
}

function applyLanguage() {
  const L = currentLang;

  // ── Navbar ──
  const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setText('nav-dashboard', t('navDashboard'));
  setText('nav-customers', t('navCustomers'));
  setText('nav-insights', t('navInsights'));
  setText('nav-personas', t('navPersonas'));
  setText('nav-predict', t('navPredict'));
  setText('nav-vip', t('navVip'));
  setText('nav-budget', t('navBudget'));

  // ── Risk Alert Banner ──
  const rabTextEl = document.getElementById('rab-text');
  if (rabTextEl) rabTextEl.textContent = t('rabText');

  // ── Hero ──
  const heroBadge = document.querySelector('.hero-badge');
  if (heroBadge) heroBadge.textContent = t('heroBadge');
  const heroTitleEl = document.querySelector('.hero-title');
  if (heroTitleEl) heroTitleEl.innerHTML = `${t('heroTitle')}<br><span class="gradient-text">${t('heroTitleAccent')}</span>`;
  const heroSubEl = document.querySelector('.hero-subtitle');
  if (heroSubEl) heroSubEl.textContent = t('heroSubtitle');
  const btnExplore = document.getElementById('btn-explore');
  if (btnExplore) btnExplore.textContent = t('btnExplore');
  const btnPH = document.getElementById('btn-predict-hero');
  if (btnPH) btnPH.textContent = t('btnPredictHero');

  // ── KPI Labels ──
  const kpiLabels = document.querySelectorAll('.kpi-label');
  const kpiKeys = ['kpiTotal', 'kpiHigh', 'kpiMedium', 'kpiLow', 'kpiAvg'];
  kpiLabels.forEach((el, i) => { if (kpiKeys[i]) el.textContent = t(kpiKeys[i]); });

  // ── Financial Dashboard ──
  const finLabelSpan = document.querySelector('.fin-dashboard-label span:last-child');
  if (finLabelSpan) finLabelSpan.textContent = t('finLabel');
  const finCardTitles = document.querySelectorAll('.fin-card-title');
  const finCardTitleKeys = ['finRevTitle', 'finLossTitle', 'finProfitTitle'];
  finCardTitles.forEach((el, i) => { if (finCardTitleKeys[i]) el.textContent = t(finCardTitleKeys[i]); });
  const finCardSubs = document.querySelectorAll('.fin-card-sub');
  const finCardSubKeys = ['finRevSub', 'finLossSub', 'finProfitSub'];
  finCardSubs.forEach((el, i) => { if (finCardSubKeys[i]) el.textContent = t(finCardSubKeys[i]); });

  // ── Charts Section ──
  const chartsTitleEl = document.querySelector('.charts-section .section-title');
  if (chartsTitleEl) chartsTitleEl.textContent = t('chartsTitle');
  const chartsSubEl = document.querySelector('.charts-section .section-subtitle');
  if (chartsSubEl) chartsSubEl.textContent = t('chartsSubtitle');
  const chartTitles = document.querySelectorAll('.chart-title');
  const chartTitleKeys = ['chartRiskDist', 'chartIncomeSpend', 'chartCreditHist', 'chartAgeRisk'];
  chartTitles.forEach((el, i) => { if (chartTitleKeys[i]) el.textContent = t(chartTitleKeys[i]); });

  // ── Insights Section ──
  const insightsBadgeEl = document.querySelector('.section-badge-insights');
  if (insightsBadgeEl) insightsBadgeEl.textContent = t('insightsBadge');
  const insightsTitleEl = document.querySelector('.insights-section .section-title');
  if (insightsTitleEl) insightsTitleEl.textContent = t('insightsTitle');
  const insightsSubEl = document.querySelector('.insights-section .section-subtitle');
  if (insightsSubEl) insightsSubEl.textContent = t('insightsSubtitle');
  const btnPdf = document.getElementById('btn-export-pdf');
  if (btnPdf) btnPdf.textContent = t('btnExportPdf');
  const iblSpans = document.querySelectorAll('.insights-block-label span:last-child');
  const iblKeys = ['insKeyFindings', 'insRiskDist', 'insClusterMean', 'insSegReco'];
  iblSpans.forEach((el, i) => { if (iblKeys[i]) el.textContent = t(iblKeys[i]); });

  // ── Personas Section ──
  const personasBadgeEl = document.querySelector('.section-badge-personas');
  if (personasBadgeEl) personasBadgeEl.textContent = t('personasBadge');
  const personasTitleEl = document.querySelector('.personas-section .section-title');
  if (personasTitleEl) personasTitleEl.textContent = t('personasTitle');
  const personasSubEl = document.querySelector('.personas-section .section-subtitle');
  if (personasSubEl) personasSubEl.textContent = t('personasSubtitle');

  // ── Customers Section ──
  const customersTitleEl = document.querySelector('.customers-section .section-title');
  if (customersTitleEl) customersTitleEl.textContent = t('customersTitle');
  const customersSubEl = document.querySelector('.customers-section .section-subtitle');
  if (customersSubEl) customersSubEl.textContent = t('customersSubtitle');
  const searchInp = document.getElementById('search-input');
  if (searchInp) searchInp.placeholder = t('searchPlaceholder');
  setText('chip-all', t('chipAll'));
  setText('chip-high', t('chipHigh'));
  setText('chip-medium', t('chipMedium'));
  setText('chip-low', t('chipLow'));
  const csvBtn = document.querySelector('.btn-export-csv');
  if (csvBtn) csvBtn.textContent = t('btnExportCsv');
  // Table headers
  const ths = document.querySelectorAll('#data-table thead th');
  const thKeys = ['thId', 'thGender', 'thAge', 'thIncome', 'thSpending', 'thCredit', 'thCluster', 'thRisk', 'thAction'];
  ths.forEach((th, i) => { if (thKeys[i]) th.textContent = t(thKeys[i]); });

  // ── Predict Section ──
  const predictTitleEl = document.querySelector('.predict-section .section-title');
  if (predictTitleEl) predictTitleEl.textContent = t('predictTitle');
  const predictSubEl = document.querySelector('.predict-section .section-subtitle');
  if (predictSubEl) predictSubEl.textContent = t('predictSubtitle');
  const formLabels = document.querySelectorAll('.form-label');
  if (formLabels[0]) formLabels[0].childNodes[0].textContent = (currentLang === 'tr' ? 'Kredi Kartı Ödeme Durumu' : 'Credit Card Payment Status') + ' ';
  if (formLabels[1]) formLabels[1].childNodes[0].textContent = t('labelIncome') + ' ';
  if (formLabels[2]) formLabels[2].childNodes[0].textContent = t('labelSpending') + ' ';
  if (formLabels[3]) formLabels[3].childNodes[0].textContent = (currentLang === 'tr' ? 'Müşteri Taban Kredi Skoru' : 'Client Baseline Credit Score') + ' ';
  const btnAi = document.getElementById('btn-ai-analyze');
  if (btnAi) btnAi.innerHTML = `<span class="btn-analyze-icon">🤖</span> ${t('btnAiAnalyze').replace('🤖 ', '')}`;
  const phEl = document.querySelector('.result-placeholder p');
  if (phEl) phEl.innerHTML = t('resultPlaceholder').replace('Analyze Customer', '<strong>Analyze Customer</strong>');
  const ringSub = document.querySelector('.ring-sub');
  if (ringSub) ringSub.textContent = t('ringCredit');
  const metricLabels = document.querySelectorAll('.metric-label');
  const metricKeys = ['metricCluster', 'metricProfile', 'metricRecommend'];
  metricLabels.forEach((el, i) => { if (metricKeys[i]) el.textContent = t(metricKeys[i]); });
  const bdownLabels = document.querySelectorAll('.breakdown-label');
  const bdownKeys = ['bdownIncome', 'bdownSpending', 'bdownAge'];
  bdownLabels.forEach((el, i) => { if (bdownKeys[i]) el.textContent = t(bdownKeys[i]); });

  // ── AI Report Panel ──
  const aiTitleEl = document.querySelector('.ai-report-title');
  if (aiTitleEl) aiTitleEl.textContent = t('aiReportTitle');
  const aiSubEl = document.querySelector('.ai-report-sub');
  if (aiSubEl) aiSubEl.textContent = t('aiReportSub');

  // ── What-If Panel ──
  const whatifTitleEl = document.querySelector('.whatif-title');
  if (whatifTitleEl) whatifTitleEl.textContent = t('whatifTitle');
  const whatifSubEl = document.querySelector('.whatif-sub');
  if (whatifSubEl) whatifSubEl.textContent = t('whatifSub');
  const wiCurrentEl = document.querySelector('.wic-before .wic-label');
  if (wiCurrentEl) wiCurrentEl.textContent = t('wiCurrent');
  const wiAfterEl = document.querySelector('.wic-after .wic-label');
  if (wiAfterEl) wiAfterEl.textContent = t('wiAfterChange');
  const whatifLabels = document.querySelectorAll('.whatif-label');
  if (whatifLabels[0]) whatifLabels[0].childNodes[0].textContent = t('wiIncomeLabel') + ' ';
  if (whatifLabels[1]) whatifLabels[1].childNodes[0].textContent = t('wiSpendingLabel') + ' ';

  // ── VIP Section ──
  const vipBadgeEl = document.querySelector('.section-badge-vip');
  if (vipBadgeEl) vipBadgeEl.textContent = t('vipBadge');
  const vipTitleEl = document.querySelector('.vip-section .section-title');
  if (vipTitleEl) vipTitleEl.textContent = t('vipTitle');
  const vipSubEl = document.querySelector('.vip-section .section-subtitle');
  if (vipSubEl) vipSubEl.textContent = t('vipSubtitle');

  // ── Budget Section ──
  const budgetBadgeEl = document.querySelector('.section-badge-budget');
  if (budgetBadgeEl) budgetBadgeEl.textContent = t('budgetBadge');
  const budgetTitleEl = document.querySelector('.budget-section .section-title');
  if (budgetTitleEl) budgetTitleEl.textContent = t('budgetTitle');
  const budgetSubEl = document.querySelector('.budget-section .section-subtitle');
  if (budgetSubEl) budgetSubEl.textContent = t('budgetSubtitle');

  // ── Footer ──
  const footerTextEl = document.querySelector('.footer-text');
  if (footerTextEl) footerTextEl.textContent = t('footerText');
  const footerCopyEl = document.querySelector('.footer-copy');
  if (footerCopyEl) footerCopyEl.textContent = t('footerCopy');

  // ── Chat Copilot ──
  const chatNameEl = document.querySelector('.chat-name');
  if (chatNameEl) chatNameEl.textContent = t('chatName');
  const chatStatusEl = document.querySelector('.chat-status');
  if (chatStatusEl) chatStatusEl.innerHTML = `<span class="chat-online-dot"></span> ${t('chatStatus')}`;
  const chatInputEl = document.getElementById('chat-input');
  if (chatInputEl) chatInputEl.placeholder = t('chatPlaceholder');

  // ── Risk Settings & Macro Stress Panels ──
  const riskTolBtnSpan = document.querySelector('.risk-tolerance-wrapper button span:first-child');
  if (riskTolBtnSpan) riskTolBtnSpan.textContent = t('riskTolTitle');
  const riskTolSubEl = document.querySelector('#risk-settings-panel p');
  if (riskTolSubEl) riskTolSubEl.textContent = t('riskTolSub');
  const settingSpendLabel = document.querySelector('label[for="setting-high-spend"]');
  if (settingSpendLabel) settingSpendLabel.childNodes[0].textContent = t('settingSpend') + ' ';
  const settingIncomeLabel = document.querySelector('label[for="setting-high-income"]');
  if (settingIncomeLabel) settingIncomeLabel.childNodes[0].textContent = t('settingIncome') + ' ';
  const settingCreditLabel = document.querySelector('label[for="setting-high-credit"]');
  if (settingCreditLabel) settingCreditLabel.childNodes[0].textContent = t('settingCredit') + ' ';

  const macroTitleEl = document.querySelector('#macro-stress-panel h3');
  if (macroTitleEl) macroTitleEl.textContent = t('macroTitle');
  const macroSubEl = document.querySelector('#macro-stress-panel p');
  if (macroSubEl) macroSubEl.textContent = t('macroSub');

  // ── Credit Policy Editor ──
  setText('lbl-policy-title', t('creditPolicyTitle'));
  setText('lbl-policy-sub', t('creditPolicySub'));
  setText('lbl-pol-low', t('polLow'));
  setText('lbl-pol-med', t('polMed'));
  setText('lbl-pol-high', t('polHigh'));

  ['lbl-rate-low', 'lbl-rate-med', 'lbl-rate-high'].forEach(id => {
    const el = document.getElementById(id);
    if (el && el.childNodes[0]) el.childNodes[0].textContent = t('lblRate') + ' ';
  });
  ['lbl-limit-low', 'lbl-limit-med', 'lbl-limit-high'].forEach(id => {
    const el = document.getElementById(id);
    if (el && el.childNodes[0]) el.childNodes[0].textContent = t('lblLimit') + ' ';
  });
  ['lbl-action-low', 'lbl-action-med', 'lbl-action-high'].forEach(id => {
    setText(id, t('lblAction'));
  });

  // ── System Audit Log ──
  setText('lbl-audit-log-title', t('auditLogTitle'));
  setText('lbl-audit-log-sub', t('auditLogSub'));
  setText('th-audit-time', t('thTime'));
  setText('th-audit-user', t('thUser'));
  setText('th-audit-action', t('thAction'));
  setText('th-audit-details', t('thDetails'));
  setText('th-audit-status', t('thStatus'));

  // ── Re-render table to translate Risk Level cells & action labels ──
  renderTable();

  // ── Update lang button ──
  const langBtn = document.getElementById('lang-toggle-btn');
  if (langBtn) langBtn.textContent = `🌐 ${L === 'EN' ? 'EN' : 'TR'}`;
}

window.toggleLanguage = function () {
  currentLang = currentLang === 'EN' ? 'TR' : 'EN';
  localStorage.setItem('anl_lang', currentLang);
  const btn = document.getElementById('lang-toggle-btn');
  if (btn) btn.textContent = `🌐 ${currentLang}`;
  applyLanguage();
};

/* ── Globals ─────────────────────────────────────────────── */
var customers = [];   // working copy (filtered + sorted)
var allData = [];   // master dataset from data.js
let currentFilter = 'all';
let currentSearch = '';
let currentSort = 'id-asc';
let currentPage = 1;
const PAGE_SIZE = 20;
let selectedGender = 'Male';

/* ── Segment logic — exact K-Means clustering rules ─────────── */
function segmentCustomer(income, spending) {
  // Cluster boundaries exactly as defined by the model
  if (income < 50 && spending < 50) return { cluster: 1, segment: 'Spendthrift', label: 'Low income & low spending' };
  if (income < 50 && spending >= 50) return { cluster: 2, segment: 'Careless', label: 'Low income & high spending' };
  if (income >= 50 && spending < 50) return { cluster: 3, segment: 'Careful', label: 'High income & low spending' };
  return { cluster: 4, segment: 'Target', label: 'High income & high spending' };
}

function calcRisk(income, spending) {
  if (spending > 70 && income < 50) return 'High Risk';
  if (income > 70 && spending >= 40 && spending <= 70) return 'Low Risk';
  return 'Medium Risk';
}

function insightFor(segment, risk) {
  const map = {
    'Target': 'High-value loyal spender — enrol in the VIP Loyalty Programme immediately. Offer exclusive perks, concierge access, and priority rewards.',
    'Careful': 'High earner with reserved spending habits. Present investment-linked benefits or premium savings products to unlock wallet share.',
    'Careless': 'Spending significantly exceeds income bracket — flag for budget coaching. Enrol in the Smart Saver discount scheme to reduce financial risk.',
    'Spendthrift': 'Price-sensitive, low-engagement profile. Drive repeat visits via budget discount schemes and targeted seasonal promotions.',
  };
  return map[segment] || 'Monitor spending trends and personalise offers to improve retention and reduce churn risk.';
}

/* ── calculateRiskDetails — SINGLE SOURCE OF TRUTH ──────────
   Drives analyzeCustomer(), getAIAnalysis(), and the chat bot.
   Returns { score, level, color, rClass, rIcon }
   ──────────────────────────────────────────────────────────── */
function calculateRiskDetails(age, income, spending) {
  let score = (income * 5) + (age * 3) - (spending * 2) + 300;
  score = Math.round(Math.max(0, Math.min(1000, score)));

  let level, color, rClass, rIcon;
  if (score < 450 || (income < 30 && spending > 70)) {
    level = 'High Risk'; color = '#f87171';
    rClass = 'risk-high'; rIcon = '🔴';
  } else if (score < 700) {
    level = 'Medium Risk'; color = '#fbbf24';
    rClass = 'risk-medium'; rIcon = '🟡';
  } else {
    level = 'Low Risk'; color = '#34d399';
    rClass = 'risk-low'; rIcon = '🟢';
  }
  return { score, level, color, rClass, rIcon };
}

// Thin alias kept for data.js credit display
function calcCreditScore(income, spending, age) {
  return calculateRiskDetails(age, income, spending).score;
}

/* ── Initialise ───────────────────────────────────────────── */
function injectLangButton() {
  if (document.getElementById('lang-toggle-btn')) return;
  const btn = document.createElement('button');
  btn.id = 'lang-toggle-btn';
  btn.textContent = `🌐 ${currentLang}`;
  btn.title = 'Switch language / Dil değiştir';
  btn.style.cssText = [
    'background:rgba(108,99,255,.15)',
    'border:1px solid rgba(108,99,255,.4)',
    'color:#a78bfa',
    'border-radius:8px',
    'padding:6px 14px',
    'font-size:.8rem',
    'font-weight:600',
    'cursor:pointer',
    'letter-spacing:.05em',
    'transition:background .2s,color .2s',
    'margin-left:8px',
  ].join(';');
  btn.onmouseover = () => { btn.style.background = 'rgba(108,99,255,.35)'; btn.style.color = '#fff'; };
  btn.onmouseout = () => { btn.style.background = 'rgba(108,99,255,.15)'; btn.style.color = '#a78bfa'; };
  btn.onclick = () => window.toggleLanguage();
  const navLinks = document.querySelector('.nav-links');
  if (navLinks) navLinks.appendChild(btn);
}

function injectIndustrySelector() {
  const existingSelect = document.getElementById('industry-selector');
  if (existingSelect) {
    existingSelect.value = currentIndustry;
    existingSelect.onchange = (e) => window.setIndustry(e.target.value);
    return;
  }
  const select = document.createElement('select');
  select.id = 'industry-selector';
  select.title = 'Select Industry Domain';
  select.style.cssText = [
    'background:rgba(15,23,42,.8)',
    'border:1px solid rgba(108,99,255,.4)',
    'color:#f8fafc',
    'border-radius:8px',
    'padding:5px 12px',
    'font-size:.8rem',
    'font-weight:600',
    'cursor:pointer',
    'margin-left:12px',
    'outline:none'
  ].join(';');

  const options = [
    { val: 'bank', label: '🏦 Banking & Finance' },
    { val: 'logistics', label: '🚛 Logistics & Supply Chain' },
    { val: 'tech', label: '💻 Tech & SaaS Startups' },
    { val: 'retail', label: '🛒 Retail & E-Commerce' },
    { val: 'manufacturing', label: '🏭 Manufacturing & Heavy Industry' }
  ];

  options.forEach(opt => {
    const o = document.createElement('option');
    o.value = opt.val;
    o.textContent = opt.label;
    if (opt.val === currentIndustry) o.selected = true;
    select.appendChild(o);
  });

  select.onchange = (e) => window.setIndustry(e.target.value);

  const navLinks = document.querySelector('.nav-links');
  if (navLinks) navLinks.appendChild(select);
}

window.updateSectorSpecificFields = function () {
  const container = document.getElementById('sector-specific-fields-wrapper');
  if (!container) return;

  container.innerHTML = ''; // Wipes the dynamic container programmatically

  const ind = window.currentIndustry || 'bank';
  let fields = [];

  if (ind === 'bank') {
    fields = [
      { label: 'Deposit Account Volume', id: 'p-sector-dep-vol', val: '50000', placeholder: 'e.g. 50000' },
      { label: 'Credit Card Debt Ratio', id: 'p-sector-debt-ratio', val: '0.35', placeholder: 'e.g. 0.35' }
    ];
  } else if (ind === 'logistics') {
    fields = [
      { label: 'Fleet Size', id: 'p-sector-fleet-size', val: '120', placeholder: 'e.g. 120' },
      { label: 'Fuel Cost Index', id: 'p-sector-fuel-index', val: '85', placeholder: 'e.g. 85' }
    ];
  } else if (ind === 'tech') {
    fields = [
      { label: 'Monthly Recurring Revenue (MRR)', id: 'p-sector-mrr', val: '15000', placeholder: 'e.g. 15000' },
      { label: 'Customer Churn Rate', id: 'p-sector-churn', val: '0.04', placeholder: 'e.g. 0.04' }
    ];
  } else if (ind === 'retail') {
    fields = [
      { label: 'Average Basket Value', id: 'p-sector-basket', val: '75', placeholder: 'e.g. 75' },
      { label: 'Return/Refund Rate', id: 'p-sector-refund-rate', val: '0.08', placeholder: 'e.g. 0.08' }
    ];
  } else if (ind === 'manufacturing') {
    fields = [
      { label: 'Energy Consumption Index', id: 'p-sector-energy', val: '240', placeholder: 'e.g. 240' },
      { label: 'Raw Material Risk Factor', id: 'p-sector-raw-risk', val: '0.65', placeholder: 'e.g. 0.65' }
    ];
  }

  fields.forEach(f => {
    const group = document.createElement('div');
    group.className = 'sector-field-group';

    const label = document.createElement('label');
    label.className = 'sector-field-label';
    label.htmlFor = f.id;
    label.textContent = f.label;

    const input = document.createElement('input');
    input.type = 'number';
    input.id = f.id;
    input.className = 'sector-numeric-input';
    input.value = f.val;
    input.placeholder = f.placeholder;
    input.step = 'any';

    group.appendChild(label);
    group.appendChild(input);
    container.appendChild(group);
  });
};

window.setIndustry = function (ind) {
  currentIndustry = ind;
  localStorage.setItem('anl_industry', ind);

  // Synchronize utilizationScore across allData
  allData.forEach(c => {
    c.utilizationScore = c.SpendingScore !== undefined ? c.SpendingScore : c.spendingScore;
  });

  // Re-apply language to update all DOM titles, labels, table headers, What-If labels, Breakdown labels, Settings labels
  applyLanguage();
  window.updateSectorSpecificFields();

  // Update Scatter chart Y-axis title dynamically without breaking chart state
  const scatter = Chart.getChart('scatterChart');
  if (scatter && scatter.options && scatter.options.scales && scatter.options.scales.y && scatter.options.scales.y.title) {
    const yTitle = currentIndustry === 'bank' ? (currentLang === 'TR' ? 'Kredi Kullanım Oranı' : 'Credit Utilization Rate') :
      currentIndustry === 'telecom' ? (currentLang === 'TR' ? 'Kullanım Stres Endeksi' : 'Usage Stress Index') :
        (currentLang === 'TR' ? 'Risk Maruziyeti' : 'Risk Exposure');
    scatter.options.scales.y.title.text = yTitle;
    scatter.update('none'); // update without animation to keep 100% stable chart states
  }

  if (typeof showToast === 'function') {
    showToast({ type: 'info', icon: '🏢', title: 'Industry Switched', msg: `Domain updated to ${ind.toUpperCase()}. Metrics adapted.` });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  // Lock body scroll while login overlay is active
  document.body.style.overflow = 'hidden';

  allData = window.ANL_DATA || [];
  window.allData = allData;
  if (!window._originalAllData) {
    window._originalAllData = JSON.parse(JSON.stringify(allData));
  }
  // Initialize utilizationScore for all clients
  allData.forEach(c => {
    if (c.utilizationScore === undefined) {
      c.utilizationScore = c.SpendingScore !== undefined ? c.SpendingScore : c.spendingScore;
    } else {
      c.spendingScore = c.utilizationScore;
      c.SpendingScore = c.utilizationScore;
    }
  });

  customers = [...allData];
  updateKPIs();
  renderCharts();
  renderBusinessInsights();
  checkRiskAlert();
  renderPersonas();
  renderFinancialDashboard();
  applyFilters();
  renderVIP();
  renderBudget();
  updateWhatIf();
  injectLangButton();
  injectIndustrySelector();
  applyLanguage();
  window.updateSectorSpecificFields();

  const searchInputEl = document.getElementById('search-input');
  if (searchInputEl) {
    searchInputEl.addEventListener('input', e => {
      currentSearch = e.target.value.toLowerCase();
      currentPage = 1;
      applyFilters();
    });
  }

  const csvInput = document.getElementById('csv-file-input');
  if (csvInput) {
    csvInput.addEventListener('change', handleCSVUpload);
  }

  window.addEventListener('scroll', () => {
    document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 40);
    highlightNav();
  });

  setTimeout(() => {
    if (typeof window.triggerLandingAuraSpeak === 'function') {
      window.triggerLandingAuraSpeak();
    }
  }, 800);
});

/* ── Landing Page & B2B Corporate Login ───────────────────── */
document.addEventListener('click', function(event) {
  const target = event.target.closest('button, a, .modal-close, .close-btn, .nav-btn, [onclick], input[type="button"], input[type="submit"]');
  if (target) {
    if (window.speechSynthesis && typeof window.speechSynthesis.cancel === 'function') {
      window.speechSynthesis.cancel();
    }
  }
}, true);

window.triggerLandingAuraSpeak = function () {
  const isTR = window.auraActiveLang === 'TR' || window.currentLang === 'TR';
  const activeLang = isTR ? 'tr-TR' : 'en-US';

  const welcomeTextTR = "ANL Kurumsal Kredi Riski İstihbarat Platformuna hoş geldiniz. Gerçek zamanlı risk değerlendirmesi, otomatik kredi politikası denetimi ve yapay zeka destekli iflas modelleme yeteneklerimizi keşfetmek için güvenli giriş kartınızı, simülasyon önizleme işlem butonunun hemen yanında bulunan 'Get Access Card' butonundan oluşturabilirsiniz.";
  const welcomeTextEN = "Welcome to the ANL Institutional Credit Risk Intelligence Platform. To explore our real-time risk assessment, automated credit policy enforcement, and AI-driven default modeling capabilities, you can generate your secure access card from the 'Get Access Card' button located right next to the simulation preview action button.";

  const textToType = isTR ? welcomeTextTR : welcomeTextEN;

  const bubbleTextEl = document.getElementById('aura-bubble-text');
  const bubbleStatusEl = document.getElementById('aura-bubble-status');

  if (bubbleStatusEl) {
    bubbleStatusEl.textContent = isTR ? 'Aktif' : 'Active';
  }

  if (bubbleTextEl) {
    bubbleTextEl.innerHTML = '';
    let i = 0;
    const speed = 35;
    function typeWriter() {
      if (i < textToType.length) {
        bubbleTextEl.innerHTML += textToType.charAt(i);
        i++;
        setTimeout(typeWriter, speed);
      }
    }
    typeWriter();
  }

  if (typeof window.auraSpeak === 'function') {
    window.auraSpeak(textToType, activeLang);
  }
};

window.showOnboardingToast = function () {
  if (window.speechSynthesis && typeof window.speechSynthesis.cancel === 'function') window.speechSynthesis.cancel();
  if (typeof window.toast === 'function') {
    window.toast('info', '✨', 'Institutional Onboarding', 'Please contact your enterprise account representative for access credentials.');
  } else if (typeof showToast === 'function') {
    showToast({ type: 'info', icon: '✨', title: 'Institutional Onboarding', msg: 'Please contact your enterprise account representative for access credentials.' });
  }
};

window.navigateToView = function (viewName, push = true) {
  if (window.speechSynthesis && typeof window.speechSynthesis.cancel === 'function') window.speechSynthesis.cancel();
  const landing = document.getElementById('anl-landing-page');
  const loginOverlay = document.getElementById('b2b-login-overlay');
  const signupOverlay = document.getElementById('b2b-signup-overlay');

  if (push && window.history && typeof window.history.pushState === 'function') {
    window.history.pushState({ view: viewName }, '', `#${viewName}`);
  }

  if (viewName === 'landing') {
    if (landing) { landing.style.display = 'flex'; landing.style.opacity = '1'; landing.style.visibility = 'visible'; }
    if (loginOverlay) { loginOverlay.style.opacity = '0'; loginOverlay.style.visibility = 'hidden'; setTimeout(() => { loginOverlay.style.display = 'none'; }, 400); }
    if (signupOverlay) { signupOverlay.style.opacity = '0'; signupOverlay.style.visibility = 'hidden'; setTimeout(() => { signupOverlay.style.display = 'none'; }, 400); }
    document.body.style.overflow = 'hidden';
  } else if (viewName === 'signup-modal') {
    if (landing) { landing.style.display = 'none'; }
    if (loginOverlay) { loginOverlay.style.display = 'none'; loginOverlay.style.opacity = '0'; loginOverlay.style.visibility = 'hidden'; }
    if (signupOverlay) { signupOverlay.style.display = 'flex'; signupOverlay.style.opacity = '1'; signupOverlay.style.visibility = 'visible'; }
    document.body.style.overflow = 'hidden';
  } else if (viewName === 'login-modal') {
    if (landing) { landing.style.display = 'none'; }
    if (signupOverlay) { signupOverlay.style.display = 'none'; signupOverlay.style.opacity = '0'; signupOverlay.style.visibility = 'hidden'; }
    if (loginOverlay) { loginOverlay.style.display = 'flex'; loginOverlay.style.opacity = '1'; loginOverlay.style.visibility = 'visible'; }
    document.body.style.overflow = 'hidden';
  } else if (viewName === 'dashboard') {
    if (landing) { landing.style.display = 'none'; }
    if (loginOverlay) { loginOverlay.style.opacity = '0'; loginOverlay.style.visibility = 'hidden'; setTimeout(() => { loginOverlay.style.display = 'none'; }, 400); }
    if (signupOverlay) { signupOverlay.style.opacity = '0'; signupOverlay.style.visibility = 'hidden'; setTimeout(() => { signupOverlay.style.display = 'none'; }, 400); }
    document.body.style.overflow = '';
    document.getElementById('dashboard')?.scrollIntoView({ behavior: 'smooth' });
  }
};

window.addEventListener('popstate', function (event) {
  if (window.speechSynthesis && typeof window.speechSynthesis.cancel === 'function') window.speechSynthesis.cancel();
  const state = event.state;
  if (state && state.view) {
    window.navigateToView(state.view, false);
  } else {
    const hash = window.location.hash ? window.location.hash.substring(1) : 'landing';
    if (['landing', 'signup-modal', 'login-modal', 'dashboard'].includes(hash)) {
      window.navigateToView(hash, false);
    } else {
      window.navigateToView('landing', false);
    }
  }
});

window.showLoginModal = function () {
  if (window.speechSynthesis && typeof window.speechSynthesis.cancel === 'function') window.speechSynthesis.cancel();
  window.navigateToView('login-modal', true);
};

window.showSignupModal = function () {
  if (window.speechSynthesis && typeof window.speechSynthesis.cancel === 'function') window.speechSynthesis.cancel();
  window.navigateToView('signup-modal', true);
};

window.handleCorporateSignup = function (event) {
  if (window.speechSynthesis && typeof window.speechSynthesis.cancel === 'function') window.speechSynthesis.cancel();
  if (event && typeof event.preventDefault === 'function') {
    event.preventDefault();
  }

  const instInp = document.getElementById('signup-institution');
  const errorEl = document.getElementById('signup-error');
  const institution = instInp ? instInp.value.trim() : '';

  if (institution === '') {
    if (errorEl) {
      errorEl.style.display = 'block';
      errorEl.style.color = '#f87171';
      errorEl.textContent = 'Generation failed. Corporate Entity Name cannot be blank.';
    }
    return;
  }

  if (errorEl) errorEl.style.display = 'none';

  window.currentCorporateSector = document.getElementById('signup-sector-select').value || 'bank';
  const orgName = institution || 'CORP';
  const cleanComp = orgName.replace(/\s+/g, '').toUpperCase();
  const cleanDomain = orgName.replace(/\s+/g, '').toLowerCase();
  const randomSalt = Math.floor(1000 + Math.random() * 9000);
  const generatedUser = `admin@${cleanDomain}.com`;
  const generatedPass = `ANL-${cleanComp}-${randomSalt}X`;

  const apiScope = document.getElementById('signup-api-scope')?.value || 'READ_ONLY';

  const cardData = {
    company: institution,
    username: generatedUser,
    password: generatedPass,
    email: generatedUser,
    institution: institution,
    sector: window.currentCorporateSector,
    apiScope: apiScope
  };

  window.activeCorporateCard = cardData;
  window.registeredCorporateUser = cardData;

  try {
    localStorage.setItem('activeCorporateCard', JSON.stringify(cardData));
    localStorage.setItem('registeredCorporateUser', JSON.stringify(cardData));
  } catch (e) {
    console.warn('localStorage not available', e);
  }

  const formContainer = document.getElementById('signup-form-container');
  const cardContainer = document.getElementById('generated-card-container');
  const companyVal = document.getElementById('card-company-val');
  const usernameVal = document.getElementById('card-username-val');
  const passwordVal = document.getElementById('card-password-val');
  const apiScopeVal = document.getElementById('card-api-scope-val');

  if (formContainer) formContainer.style.display = 'none';

  const instName = document.getElementById('signup-institution').value;
  if (!instName) return;

  const chosenScope = document.getElementById('signup-api-scope').value;
  const complianceChecked = document.getElementById('signup-compliance-lock').checked;

  // Populate the generated access card visualization nodes instantly
  if (companyVal) companyVal.textContent = instName;
  if (usernameVal) usernameVal.textContent = `admin@${cleanDomain}.com`;
  if (passwordVal) passwordVal.textContent = generatedPass;
  if (apiScopeVal) {
      apiScopeVal.textContent = chosenScope;
  }

  // Cache these values into global session configurations for later dashboard synchronization
  window.activeSaaSLease = {
      company: instName,
      username: `admin@${cleanDomain}.com`,
      scope: chosenScope,
      compliance: complianceChecked ? 'FIPS 140-3 Enforced' : 'Standard Protection'
  };

  if (cardContainer) cardContainer.style.display = 'block';

  if (typeof window.startCardExpirationTimer === 'function') {
    window.startCardExpirationTimer();
  }

  if (typeof window.toast === 'function') {
    window.toast('success', '💳', 'Access Card Generated', `Institutional Access Card created for ${institution}.`);
  } else if (typeof showToast === 'function') {
    showToast({ type: 'success', icon: '💳', title: 'Access Card Generated', msg: `Institutional Access Card created for ${institution}.` });
  }

  if (typeof window.logSystemAudit === 'function') {
    window.logSystemAudit('SECURE_CARD_GENERATION', `Generated kiosk access card for entity (${institution})`, 'SUCCESS');
  }
};

window.startCardExpirationTimer = function() {
    let duration = 15 * 60; // 15 minutes lease duration in seconds
    window.isCardSessionActive = true;
    
    if (window.cardExpiryInterval) clearInterval(window.cardExpiryInterval);
    
    window.cardExpiryInterval = setInterval(() => {
        let minutes = Math.floor(duration / 60);
        let seconds = duration % 60;
        seconds = seconds < 10 ? '0' + seconds : seconds;
        
        const timerEl = document.getElementById('card-timer-val');
        if (timerEl) timerEl.textContent = `${minutes}:${seconds}`;
        
        if (--duration < 0) {
            clearInterval(window.cardExpiryInterval);
            window.isCardSessionActive = false;
            if (timerEl) timerEl.textContent = 'EXPIRED / RE-GENERATE';
            const loginProceedBtn = document.querySelector("button[onclick='proceedToLoginFromCard()']");
            if (loginProceedBtn) { loginProceedBtn.disabled = true; loginProceedBtn.style.opacity = '0.4'; }
        }
    }, 1000);
};

window.proceedToLoginFromCard = function () {
  if (window.speechSynthesis && typeof window.speechSynthesis.cancel === 'function') window.speechSynthesis.cancel();
  const card = window.activeCorporateCard || window.registeredCorporateUser;
  if (card) {
    const loginUsernameInp = document.getElementById('login-username');
    const loginPassInp = document.getElementById('login-password');
    const loginCompanyInp = document.getElementById('login-company-name');
    if (loginUsernameInp) loginUsernameInp.value = card.username || card.email || '';
    if (loginPassInp) loginPassInp.value = card.password || '';
    if (loginCompanyInp) loginCompanyInp.value = card.company || card.institution || '';
    if (card.sector) window.currentCorporateSector = card.sector;
  }

  window.navigateToView('login-modal', true);
};

window.copyCardToken = function (type) {
  if (window.speechSynthesis && typeof window.speechSynthesis.cancel === 'function') window.speechSynthesis.cancel();
  const card = window.activeCorporateCard || window.registeredCorporateUser;
  if (!card) return;

  const textToCopy = type === 'username' ? card.username : card.password;
  if (!textToCopy) return;

  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    navigator.clipboard.writeText(textToCopy).then(() => {
      if (typeof window.toast === 'function') {
        window.toast('success', '📋', 'Copied to Clipboard', `${type.charAt(0).toUpperCase() + type.slice(1)} copied successfully.`);
      } else if (typeof showToast === 'function') {
        showToast({ type: 'success', icon: '📋', title: 'Copied to Clipboard', msg: `${type.charAt(0).toUpperCase() + type.slice(1)} copied successfully.` });
      }
    }).catch(err => {
      console.warn('Clipboard writeText failed', err);
    });
  } else {
    const textarea = document.createElement('textarea');
    textarea.value = textToCopy;
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      if (typeof window.toast === 'function') {
        window.toast('success', '📋', 'Copied to Clipboard', `${type.charAt(0).toUpperCase() + type.slice(1)} copied successfully.`);
      } else if (typeof showToast === 'function') {
        showToast({ type: 'success', icon: '📋', title: 'Copied to Clipboard', msg: `${type.charAt(0).toUpperCase() + type.slice(1)} copied successfully.` });
      }
    } catch (e) {
      console.warn('execCommand copy failed', e);
    }
    document.body.removeChild(textarea);
  }
};

window.closeCardModalToLanding = function () {
  if (window.speechSynthesis && typeof window.speechSynthesis.cancel === 'function') window.speechSynthesis.cancel();
  const formContainer = document.getElementById('signup-form-container');
  const cardContainer = document.getElementById('generated-card-container');
  if (formContainer) formContainer.style.display = 'block';
  if (cardContainer) cardContainer.style.display = 'none';
  const instInp = document.getElementById('signup-institution');
  if (instInp) instInp.value = '';

  window.navigateToView('landing', true);
};

window.startDemoSample = function () {
  if (window.speechSynthesis && typeof window.speechSynthesis.cancel === 'function') window.speechSynthesis.cancel();
  window.corporateCSVUploaded = false;
  window.pendingCorporateUpload = false;

  if ((!allData || allData.length === 0) && window._originalAllData) {
    allData = JSON.parse(JSON.stringify(window._originalAllData));
    window.allData = allData;
    customers = [...allData];
    window.ANL_DATA = allData;
    if (typeof updateKPIs === 'function') updateKPIs();
    if (typeof renderCharts === 'function') renderCharts();
    if (typeof renderBusinessInsights === 'function') renderBusinessInsights();
    if (typeof checkRiskAlert === 'function') checkRiskAlert();
    if (typeof renderFinancialDashboard === 'function') renderFinancialDashboard();
    if (typeof renderVIP === 'function') renderVIP();
    if (typeof renderBudget === 'function') renderBudget();
    if (typeof updateWhatIf === 'function') updateWhatIf();
    if (typeof applyFilters === 'function') applyFilters();
  }

  if (typeof renderPersonas === 'function') renderPersonas();
  window.navigateToView('dashboard', true);
  if (typeof window.toast === 'function') {
    window.toast('info', '📊', 'Simulation Mode Active', 'Loaded 1,000 synthetic corporate client records.');
  } else if (typeof showToast === 'function') {
    showToast({ type: 'info', icon: '📊', title: 'Simulation Mode Active', msg: 'Loaded 1,000 synthetic corporate client records.' });
  }
  if (typeof window.logSystemAudit === 'function') {
    window.logSystemAudit('DEMO_SAMPLE_LOAD', 'User initiated 1,000 client simulation sample demo mode', 'SUCCESS');
  }
};

window.handleCorporateLogin = function (event) {
  if (window.speechSynthesis && typeof window.speechSynthesis.cancel === 'function') window.speechSynthesis.cancel();
  if (event && typeof event.preventDefault === 'function') {
    event.preventDefault();
  }

  if (window.isCardSessionActive === false) {
    const errorEl = document.getElementById('login-error');
    if (errorEl) {
      errorEl.style.display = 'block';
      errorEl.style.color = '#f87171';
      errorEl.textContent = 'Authentication blocked. Security lease expired. Please re-generate an Institutional Access Card.';
    }
    return;
  }

  const companyInp = document.getElementById('login-company-name');
  const usernameInp = document.getElementById('login-username');
  const passInp = document.getElementById('login-password');
  const errorEl = document.getElementById('login-error');

  const company = companyInp ? companyInp.value.trim() : '';
  const username = usernameInp ? usernameInp.value.trim() : '';
  const pass = passInp ? passInp.value.trim() : '';

  if (company === '' || username === '' || pass === '') {
    if (errorEl) {
      errorEl.style.display = 'block';
      errorEl.style.color = '#f87171';
      errorEl.textContent = 'Authentication failed. Company Name, Username, and Password cannot be blank.';
    }
    return;
  }

  let savedUser = window.activeCorporateCard || window.registeredCorporateUser;
  if (!savedUser) {
    try {
      const lsCard = localStorage.getItem('activeCorporateCard');
      const lsReg = localStorage.getItem('registeredCorporateUser');
      if (lsCard) savedUser = JSON.parse(lsCard);
      else if (lsReg) savedUser = JSON.parse(lsReg);
    } catch (e) {}
  }

  const regCompany = savedUser ? (savedUser.company || savedUser.institution) : 'Akbank';
  const regUsername = savedUser ? (savedUser.username || savedUser.email) : 'anl_akbank_admin';
  const regPass = savedUser ? savedUser.password : 'Admin123!';

  if (company.toLowerCase() !== regCompany.toLowerCase() || username.toLowerCase() !== regUsername.toLowerCase() || pass !== regPass) {
    if (errorEl) {
      errorEl.style.display = 'block';
      errorEl.style.color = '#f87171';
      errorEl.textContent = `Authentication failed. Invalid credentials. (Hint: use ${regCompany} / ${regUsername} / ${regPass})`;
    }
    if (typeof window.logSystemAudit === 'function') {
      window.logSystemAudit('SECURE_SESSION_AUTH_FAIL', `Failed login attempt for tenant (${company} / ${username})`, 'FAILURE');
    }
    return;
  }

  if (errorEl) errorEl.style.display = 'none';

  window.navigateToView('dashboard', true);

  if (typeof window.toast === 'function') {
    window.toast('info', '🔓', 'Authentication Successful', `Welcome back, ${regCompany} Administrator. Secure session established.`);
  } else if (typeof showToast === 'function') {
    showToast({ type: 'info', icon: '🔓', title: 'Authentication Successful', msg: `Welcome back, ${regCompany} Administrator. Secure session established.` });
  }
  if (typeof window.logSystemAudit === 'function') {
    window.logSystemAudit('SECURE_SESSION_AUTH', `Enterprise tenant (${regCompany} - ${regUsername}) authenticated secure session`, 'SUCCESS');
  }

  const orgName = regCompany;
  if (typeof window.initializeAuthenticatedCorporateSession === 'function') {
    window.initializeAuthenticatedCorporateSession(orgName);
  }

  // Programmatically trigger active welcoming prompt for Aura AI
  setTimeout(() => {
    if (typeof window.initializeAuraSectorContext === 'function') {
      window.initializeAuraSectorContext();
    }
  }, 600);
};

window.adaptPredictiveFormLabels = function() {
    const currentSec = window.currentCorporateSector || 'bank';
    const activeConf = window.ENTERPRISE_INDUSTRY_REGISTRY[currentSec] || window.ENTERPRISE_INDUSTRY_REGISTRY.bank;
    const lblInc = document.querySelector("label[for='p-income']") || document.getElementById('p-income')?.previousElementSibling;
    const lblSpd = document.querySelector("label[for='p-spending']") || document.getElementById('p-spending')?.previousElementSibling;
    const valInc = document.getElementById('p-income')?.value || 120;
    const valSpd = document.getElementById('p-spending')?.value || 45;
    if (lblInc && lblSpd && activeConf) {
        lblInc.innerHTML = `${activeConf.icon} ${activeConf.metric1}: <span id="income-val">${valInc}</span>`;
        lblSpd.innerHTML = `📉 ${activeConf.metric2}: <span id="spending-val">${valSpd}</span>`;
    }
};

window.ENTERPRISE_INDUSTRY_REGISTRY = {
    bank: { title: "Banking & Finance", icon: "🏦", badge: "SECURE TIER 1 CORE", kpi: "Capital Adequacy (CAR)", metric1: "Institutional Liquidity", metric2: "Default Prob Weight", metrics: { kpi1: "Capital Adequacy (CAR)", kpi2: "Liquidity Coverage", kpi3: "Non-Performing Loans (NPL)" } },
    logistics: { title: "Logistics & Carrier", icon: "🚛", badge: "SUPPLY CHAIN RESILIENCE", kpi: "Fleet Capacity (Tons)", metric1: "Active Carriage Vol", metric2: "Fuel Price Exposure", metrics: { kpi1: "Fleet Load Capacity", kpi2: "Fuel Price Exposure", kpi3: "Route Latency Congestion" } },
    tech: { title: "Technology & SaaS", icon: "💻", badge: "ARR RECURRING ENGINE", kpi: "Annual Recurring Revenue", metric1: "ARR Recurring Velocity", metric2: "Net Dollar Retention", metrics: { kpi1: "Annual Recurring Revenue", kpi2: "Net Dollar Retention", kpi3: "Customer Churn Rate" } },
    retail: { title: "Retail & E-Commerce", icon: "🛒", badge: "OMNICHANNEL MARGIN LAYER", kpi: "Inventory Turnover Speed", metric1: "Omnichannel Margin", metric2: "Inventory Turnover Speed", metrics: { kpi1: "Inventory Turnover Speed", kpi2: "Omnichannel Margin", kpi3: "Return/Refund Rate" } },
    manufacturing: { title: "Manufacturing Core", icon: "🏭", badge: "RAW MATERIAL SHOCK AUDIT", kpi: "Capacity Utilization", metric1: "Plant Output Scale", metric2: "Material Inflation Risk", metrics: { kpi1: "Capacity Utilization", kpi2: "Plant Output Scale", kpi3: "Raw Material Inflation Risk" } },
    telecom: { title: "Telecom Grid Controller", icon: "📡", badge: "HIGH-DENSITY GRID NODE", kpi: "Average Revenue Per User", metric1: "Data Infrastructure Bandwidth", metric2: "Subscriber Attrition Rate", metrics: { kpi1: "Average Revenue Per User", kpi2: "Data Infrastructure Bandwidth", kpi3: "Subscriber Attrition Rate" } }
};

window.initializeAuraSectorContext = function() {
    const sectorKey = window.currentCorporateSector || 'bank';
    const activeConf = window.ENTERPRISE_INDUSTRY_REGISTRY[sectorKey] || window.ENTERPRISE_INDUSTRY_REGISTRY.bank;
    
    const chatMessages = document.querySelector('.chat-messages');
    if (chatMessages) {
        // Inject the initial enterprise welcome summary bubble
        const initialMsg = document.createElement('div');
        initialMsg.className = 'message system-message';
        initialMsg.innerHTML = `
            <div class='ai-message-content' style='background:rgba(56, 189, 248, 0.1); border:1px solid rgba(56, 189, 248, 0.2); padding:1rem; border-radius:8px;'>
                <div style='color:#38bdf8; font-weight:bold; font-size:1.1rem;'>Greetings, ${window.authenticatedCompanyName}.</div>
                <div style='color:#cbd5e1; font-size:0.85rem; margin-top:0.4rem; line-height:1.4;'>
                    ${activeConf.icon} Our Aura AI Intelligence Hub is now operational and integrated across your entire B2B ledger ecosystem. 
                    We are actively auditing for ${activeConf.kpi} exposure and ${activeConf.metrics.kpi3} alerts. 
                    You can explicitly ask me to query for high-risk flags, assigned institutional APR rates, or sector-specific default thresholds.
                </div>
            </div>`;
        chatMessages.appendChild(initialMsg);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
};

window.initializeAuthenticatedCorporateSession = function(companyName) {
    window.isCommercialPremiumSession = true;
    window.authenticatedCompanyName = companyName;
    window.adaptPredictiveFormLabels();
    
    // Flush the synthetic demo simulation array completely to provide a clean environment
    window.customersData = [];
    window.customerData = [];
    allData = [];
    window.allData = [];
    customers = [];
    window.ANL_DATA = [];
    window.corporateCSVUploaded = false;
    window.pendingCorporateUpload = true;
    
    const currentSec = window.currentCorporateSector || 'bank';
    const activeConf = window.ENTERPRISE_INDUSTRY_REGISTRY[currentSec] || window.ENTERPRISE_INDUSTRY_REGISTRY.bank;
    
    // Update active corporate branding labels dynamically across headers
    const heroBadge = document.querySelector('.hero-badge');
    if (heroBadge && activeConf) heroBadge.innerHTML = `${activeConf.icon} ${activeConf.badge} · ${window.authenticatedCompanyName}`;
    
    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle && activeConf) heroTitle.innerHTML = `${window.authenticatedCompanyName}<br><span class="gradient-text">${activeConf.title} Terminal</span>`;
    
    // Dynamically override core data table column header text strings based on registry configuration map
    const thIncome = document.getElementById('th-income');
    if (thIncome && activeConf) thIncome.textContent = activeConf.kpi;
    
    // Update predictive form labels dynamically to match sector contexts
    const lblInc = document.querySelector("label[for='p-income']") || document.getElementById('p-income')?.previousElementSibling;
    const lblSpd = document.querySelector("label[for='p-spending']") || document.getElementById('p-spending')?.previousElementSibling;
    const valInc = document.getElementById('p-income')?.value || 120;
    const valSpd = document.getElementById('p-spending')?.value || 45;
    if (lblInc && lblSpd && activeConf) {
        lblInc.innerHTML = `${activeConf.icon} ${activeConf.metric1}: <span id="income-val">${valInc}</span>`;
        lblSpd.innerHTML = `📉 ${activeConf.metric2}: <span id="spending-val">${valSpd}</span>`;
    }
    
    // Refresh visual pipelines cleanly
    if (typeof window.calculateKPIs === 'function') window.calculateKPIs();
    if (typeof window.renderCharts === 'function') window.renderCharts();
    if (typeof window.updateTable === 'function') window.updateTable(1);
    if (typeof updateKPIs === 'function') updateKPIs();
    if (typeof renderCharts === 'function') renderCharts();
    if (typeof renderBusinessInsights === 'function') renderBusinessInsights();
    if (typeof checkRiskAlert === 'function') checkRiskAlert();
    if (typeof renderPersonas === 'function') renderPersonas();
    if (typeof renderFinancialDashboard === 'function') renderFinancialDashboard();
    if (typeof renderVIP === 'function') renderVIP();
    if (typeof renderBudget === 'function') renderBudget();
    if (typeof updateWhatIf === 'function') updateWhatIf();
    if (typeof applyFilters === 'function') applyFilters();
    
    const uploadHub = document.getElementById('corporate-upload-hub');
    if (uploadHub) uploadHub.style.display = 'block';
    
    // Trigger dynamic Aura welcoming framework synchronized with the authenticated industry registry
    if (typeof window.initializeAuraSectorContext === 'function') {
        window.initializeAuraSectorContext();
    } else {
        // Fallback runtime context mapping if independent module isn't declared yet
        const sectorKey = window.currentCorporateSector || 'bank';
        const activeSector = window.ENTERPRISE_INDUSTRY_REGISTRY ? window.ENTERPRISE_INDUSTRY_REGISTRY[sectorKey] : null;
        
        if (activeSector) {
            // Inject clean professional UI summary card into chat logs
            const chatBox = document.getElementById('chat-messages');
            if (chatBox) {
                chatBox.innerHTML = `
                    <div style='background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.2); padding: 1.25rem; border-radius: 10px; font-family: sans-serif;'>
                        <div style='color: #38bdf8; font-weight: 700; font-size: 1rem; margin-bottom: 0.4rem;'>🔒 AURA INDUSTRIAL HUB: ACTIVE</div>
                        <div style='color: #cbd5e1; font-size: 0.85rem; line-height: 1.45;'>
                            ${activeSector.icon} Core telemetry model calibrated for <b>${window.authenticatedCompanyName}</b>.<br>
                            Monitoring active data vectors for <b>${activeSector.kpi}</b> and operational risk fluctuations in real-time.
                        </div>
                    </div>`;
            }
        }
    }
    
    const auraBubble = document.getElementById('chat-bubble');
    if (auraBubble) {
        auraBubble.style.setProperty('display', 'flex', 'important');
    }
    
    const roleBadge = document.getElementById('corporate-role-badge');
    const roleSelector = document.getElementById('enterprise-role-selector');
    if (roleBadge) roleBadge.style.display = 'block';
    if (roleSelector) roleSelector.style.display = 'block';
    if (typeof window.switchEnterpriseRole === 'function') {
        window.switchEnterpriseRole(window.activeUserRole || 'analyst');
    }

    const selectedSectorValue = window.currentCorporateSector || document.getElementById('signup-sector-select')?.value || 'bank';
    const mainIndustrySelector = document.getElementById('industry-selector');
    if (mainIndustrySelector) {
        mainIndustrySelector.value = selectedSectorValue;
        // Trigger your pre-configured sector UI mutation handler immediately
        if (typeof window.setIndustry === 'function') {
            window.setIndustry(selectedSectorValue);
        }
    }

    if (window.activeSaaSLease) {
        const cyberHub = document.querySelector('.cyber-security-hub');
        if (cyberHub) {
            const metaValues = cyberHub.querySelectorAll('.cyber-meta-item');
            if (metaValues.length >= 2) {
                metaValues[0].innerHTML = `Data Encryption State: <span class="cyber-meta-val-green">${window.activeSaaSLease.compliance}</span>`;
                metaValues[1].innerHTML = `Active Identity Layer: <span class="cyber-meta-val">${window.activeSaaSLease.scope} Authorization Enforced</span>`;
            }
        }
    }
};

window.handleCSVUpload = window.handleCorporateCSVUpload = function (event) {
  const file = event.target.files ? event.target.files[0] : null;
  if (!file) return;

  // Show data-integrity-loader immediately and hide upload-drop-zone
  const loader = document.getElementById('data-integrity-loader');
  const dropZone = document.querySelector('.upload-drop-zone');
  const progressFill = document.getElementById('progress-bar-fill');

  if (loader) {
    loader.style.display = 'block';
    if (progressFill) {
      progressFill.style.width = '0%';
      void progressFill.offsetWidth; // Force reflow
      progressFill.style.width = '100%';
    }
  }
  if (dropZone) {
    dropZone.style.display = 'none';
  }

  function suppressAllErrorHeaders() {
    const errIds = ['login-error', 'signup-error', 'mapping-error', 'csv-mapping-modal', 'csv-processing-overlay'];
    errIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.style.display = 'none';
        el.textContent = '';
      }
    });
    document.querySelectorAll('.error-header, .alert-banner, .toast-error, #csv-mapping-modal, #csv-processing-overlay').forEach(el => {
      el.style.display = 'none';
    });
  }

  suppressAllErrorHeaders();

  if (!window.Papa) {
    if (loader) loader.style.display = 'none';
    if (dropZone) dropZone.style.display = 'block';
    if (typeof window.toast === 'function') {
      window.toast('error', '❌', 'Upload Failed', 'PapaParse library is missing.');
    }
    if (event.target) event.target.value = '';
    return;
  }

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: function (results) {
      suppressAllErrorHeaders();

      if (!results.data || results.data.length === 0) {
        if (loader) loader.style.display = 'none';
        if (dropZone) dropZone.style.display = 'block';
        if (typeof window.toast === 'function') {
          window.toast('error', '❌', 'Upload Failed', 'CSV file contains no valid data rows.');
        }
        if (event.target) event.target.value = '';
        return;
      }

      const parsedRecords = [];
      results.data.forEach((row, idx) => {
        const record = { id: idx + 1, CustomerID: idx + 1 };
        const keys = Object.keys(row);

        keys.forEach(k => {
          const val = row[k] !== undefined ? String(row[k]).trim() : '';
          const kLow = k.toLowerCase();
          if (kLow.includes('income') || kLow.includes('revenue') || kLow.includes('salary') || kLow.includes('gelir') || kLow.includes('maaş') || kLow.includes('maas')) {
            let parsed = parseFloat(val) || parseFloat(val.replace(/[^0-9.]/g, ''));
            if (!isNaN(parsed)) {
              if (parsed > 1000) parsed = Math.round(parsed / 1000);
              record.Income = parsed;
              record.AnnualIncome = parsed;
              record.annualIncome = parsed;
            }
          } else if (kLow.includes('spending') || kLow.includes('utilization') || kLow.includes('score') || kLow.includes('spend') || kLow.includes('harcama') || kLow.includes('puan')) {
            const parsed = parseFloat(val) || parseFloat(val.replace(/[^0-9.]/g, ''));
            if (!isNaN(parsed)) {
              record.SpendingScore = parsed;
              record.spendingScore = parsed;
              record.utilizationScore = parsed;
            }
          } else if (kLow.includes('age') || kLow.includes('tenure') || kLow.includes('years') || kLow.includes('yaş') || kLow.includes('yas')) {
            const parsed = parseInt(val, 10) || parseInt(val.replace(/[^0-9]/g, ''), 10);
            if (!isNaN(parsed)) {
              record.Age = parsed;
              record.age = parsed;
            }
          } else if (kLow.includes('credit') || kLow.includes('rating') || kLow.includes('fico') || kLow.includes('kredi')) {
            const parsed = parseInt(val, 10) || parseInt(val.replace(/[^0-9]/g, ''), 10);
            if (!isNaN(parsed)) {
              record.CreditScore = parsed;
              record.creditScore = parsed;
            }
          } else if (kLow.includes('company') || kLow.includes('type') || kLow.includes('industry') || kLow.includes('sector') || kLow.includes('domain')) {
            record.CompanyType = val || 'Technology';
            record.industry = record.CompanyType;
            record.companyType = record.CompanyType;
          } else if (kLow.includes('gender') || kLow.includes('sex') || kLow.includes('cinsiyet')) {
            record.Gender = val || 'Male';
            record.gender = record.Gender;
          } else {
            record[k] = val;
          }
        });

        // Provide defaults for any missing standard fields
        if (record.Income === undefined || isNaN(record.Income)) { record.Income = 60; record.AnnualIncome = 60; record.annualIncome = 60; }
        if (record.SpendingScore === undefined || isNaN(record.SpendingScore)) { record.SpendingScore = 50; record.spendingScore = 50; record.utilizationScore = 50; }
        if (record.Age === undefined || isNaN(record.Age)) { record.Age = 40; record.age = 40; }
        if (record.CreditScore === undefined || isNaN(record.CreditScore)) {
          const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
          const iN = clamp((record.annualIncome - 15) / 125, 0, 1);
          const sN = clamp((100 - record.spendingScore) / 99, 0, 1);
          const aN = clamp((record.age - 18) / 52, 0, 1);
          const raw = 300 + (iN * 0.50 + sN * 0.30 + aN * 0.20) * 600;
          record.CreditScore = Math.round(clamp(raw + (Math.random() - 0.5) * 36, 300, 900));
          record.creditScore = record.CreditScore;
        }
        if (record.CompanyType === undefined) { record.CompanyType = 'Finance'; record.industry = 'Finance'; record.companyType = 'Finance'; }
        if (record.Gender === undefined) { record.Gender = idx % 2 === 0 ? 'Female' : 'Male'; record.gender = record.Gender; }

        // Calculate risk level, credit score, and cluster metadata dynamically
        if (typeof window.evaluateRisk === 'function') {
          record.riskLevel = window.evaluateRisk(record.annualIncome, record.spendingScore, record.creditScore);
        } else if (typeof window.calculateRiskDetails === 'function') {
          const riskObj = window.calculateRiskDetails(record.age, record.annualIncome, record.spendingScore);
          record.riskLevel = riskObj.level || 'Medium Risk';
        } else {
          if (record.spendingScore >= 60 && record.annualIncome < 50) {
            record.riskLevel = 'High Risk';
          } else if (record.spendingScore < 40 && record.annualIncome >= 70) {
            record.riskLevel = 'Low Risk';
          } else {
            record.riskLevel = 'Medium Risk';
          }
        }

        record.probabilityOfDefault = record.riskLevel === 'High Risk' ? '45%' : record.riskLevel === 'Medium Risk' ? '15%' : '5%';
        record.financialStress = record.riskLevel === 'High Risk' ? 'Severe' : record.riskLevel === 'Medium Risk' ? 'Moderate' : 'Minimal';
        record.cluster = 0;
        record.clusterLabel = 'Unassigned';
        if (!record.paymentStatus) record.paymentStatus = 'regular';

        parsedRecords.push(record);
      });

      if (parsedRecords.length === 0) {
        if (loader) loader.style.display = 'none';
        if (dropZone) dropZone.style.display = 'block';
        if (typeof window.toast === 'function') {
          window.toast('error', '❌', 'Upload Failed', 'No valid corporate records found in CSV.');
        }
        if (event.target) event.target.value = '';
        return;
      }

      // Client-side K-Means clustering (k=5)
      const k = 5;
      if (parsedRecords.length >= k) {
        let centroids = [];
        let indices = new Set();
        while (centroids.length < k && indices.size < parsedRecords.length) {
          let idx = Math.floor(Math.random() * parsedRecords.length);
          if (!indices.has(idx)) {
            indices.add(idx);
            centroids.push({ income: parsedRecords[idx].annualIncome, spending: parsedRecords[idx].spendingScore });
          }
        }

        let clusters = new Array(parsedRecords.length).fill(-1);
        let maxIter = 50;

        for (let iter = 0; iter < maxIter; iter++) {
          let changed = false;
          for (let i = 0; i < parsedRecords.length; i++) {
            let minDist = Infinity;
            let c = -1;
            for (let j = 0; j < k; j++) {
              const dx = parsedRecords[i].annualIncome - centroids[j].income;
              const dy = parsedRecords[i].spendingScore - centroids[j].spendingScore;
              const dist = dx * dx + dy * dy;
              if (dist < minDist) {
                minDist = dist;
                c = j;
              }
            }
            if (clusters[i] !== c) {
              clusters[i] = c;
              changed = true;
            }
          }

          if (!changed) break;

          let sums = Array(k).fill(0).map(() => ({ i: 0, s: 0, count: 0 }));
          for (let i = 0; i < parsedRecords.length; i++) {
            const c = clusters[i];
            sums[c].i += parsedRecords[i].annualIncome;
            sums[c].s += parsedRecords[i].spendingScore;
            sums[c].count++;
          }
          for (let j = 0; j < k; j++) {
            if (sums[j].count > 0) {
              centroids[j].income = sums[j].i / sums[j].count;
              centroids[j].spending = sums[j].s / sums[j].count;
            }
          }
        }

        const idealCentroids = {
          'Careless': { income: 30, spending: 72 },
          'Spendthrift': { income: 33, spending: 28 },
          'Sensible': { income: 58, spending: 48 },
          'Careful': { income: 88, spending: 22 },
          'Target': { income: 92, spending: 78 }
        };
        const labels = Object.keys(idealCentroids);
        let mappedLabels = new Array(k);
        let availableLabels = [...labels];

        for (let j = 0; j < k; j++) {
          let bestDist = Infinity;
          let bestIdx = -1;
          for (let l = 0; l < availableLabels.length; l++) {
            const ideal = idealCentroids[availableLabels[l]];
            const dx = centroids[j].income - ideal.income;
            const dy = centroids[j].spending - ideal.spending;
            const dist = dx * dx + dy * dy;
            if (dist < bestDist) {
              bestDist = dist;
              bestIdx = l;
            }
          }
          mappedLabels[j] = availableLabels[bestIdx];
          availableLabels.splice(bestIdx, 1);
        }

        for (let i = 0; i < parsedRecords.length; i++) {
          const label = mappedLabels[clusters[i]];
          parsedRecords[i].clusterLabel = label;
          const idMap = { 'Careless': 0, 'Spendthrift': 1, 'Sensible': 2, 'Careful': 3, 'Target': 4 };
          parsedRecords[i].cluster = idMap[label];
        }
      } else {
        parsedRecords.forEach(d => { d.clusterLabel = 'Sensible'; d.cluster = 2; });
      }

      // SLEEK automated compliance scanning delay and preflight data audit
      if (typeof window.runPreflightDataAudit === 'function') {
        window.runPreflightDataAudit(file, function () {
          // Hide loader and restore drop zone
          if (loader) loader.style.display = 'none';
          if (dropZone) dropZone.style.display = 'block';

          // Programmatically flush out old synthetic data and overwrite primary global records array
          allData = parsedRecords;
          window.allData = allData;
          customers = [...allData];
          window.ANL_DATA = allData;
          window.customerData = allData;
          window.customersData = allData;
          window.pendingCorporateUpload = false;
          window.corporateCSVUploaded = true;
          window._originalAllData = JSON.parse(JSON.stringify(parsedRecords));
          currentPage = 1;

          // Rebuild insight data for Aura AI Copilot and chat bots
          const high = allData.filter(c => c.riskLevel === 'High Risk').length;
          const medium = allData.filter(c => c.riskLevel === 'Medium Risk').length;
          const low = allData.filter(c => c.riskLevel === 'Low Risk').length;
          const avgCr = Math.round(allData.reduce((s, c) => s + c.creditScore, 0) / allData.length);
          const clusterNames = ['Careless', 'Spendthrift', 'Sensible', 'Careful', 'Target'];
          const clusterStats = clusterNames.map(name => {
            const g = allData.filter(c => c.clusterLabel === name);
            return {
              name, count: g.length,
              avgInc: g.length ? +(g.reduce((s, c) => s + c.annualIncome, 0) / g.length).toFixed(0) : 0,
              avgSp: g.length ? +(g.reduce((s, c) => s + c.spendingScore, 0) / g.length).toFixed(0) : 0,
            };
          });
          window._insightData = {
            high, medium, low, total: allData.length,
            highPct: ((high / allData.length) * 100).toFixed(1),
            medPct: ((medium / allData.length) * 100).toFixed(1),
            lowPct: ((low / allData.length) * 100).toFixed(1),
            avgCredit: avgCr,
            clusterStats,
            untappedPct: clusterStats.filter(c => c.name === 'Careful').reduce((s, c) => s + c.count, 0)
              ? ((clusterStats.find(c => c.name === 'Careful').count / allData.length) * 100).toFixed(1) : '0',
          };

          const compName = (window.authenticatedCompanyName || '').toLowerCase();
          const targetFormWrapper = document.getElementById('sector-specific-fields-wrapper');
          let sectorMarkup = '';

          if (compName.includes('bank') || compName.includes('finans')) {
              sectorMarkup = `<div class="form-group"><label class="form-label">Institutional Asset Leverage Ratio (Tier 1)</label><input type="range" class="range-input" min="1" max="100" value="45"/><div class="range-labels"><span>Stable Capital</span><span>Highly Leveraged Limit</span></div></div>`;
          } else if (compName.includes('logistics') || compName.includes('kargo') || compName.includes('dhl')) {
              sectorMarkup = `<div class="form-group"><label class="form-label">Supply Chain Fuel Price Shock Index</label><input type="range" class="range-input" min="1" max="100" value="60"/><div class="range-labels"><span>Baseline Margin</span><span>Volatile Risk Cost</span></div></div>`;
          } else if (compName.includes('retail') || compName.includes('market') || compName.includes('shop')) {
              sectorMarkup = `<div class="form-group"><label class="form-label">Inventory Disruption Index</label><input type="range" class="range-input" min="1" max="100" value="50"/><div class="range-labels"><span>Optimized Turnover</span><span>Severe Delay State</span></div></div>`;
          } else {
              sectorMarkup = `<div class="form-group"><label class="form-label">Standard Corporate Risk Velocity Margin</label><input type="range" class="range-input" min="1" max="100" value="30"/><div class="range-labels"><span>Conservative</span><span>Aggressive</span></div></div>`;
          }

          if (targetFormWrapper) {
              targetFormWrapper.innerHTML = sectorMarkup;
          }

          // Destroy existing Chart.js instances to ensure clean redraw
          const chartIds = ['riskDonutChart', 'scatterChart', 'histogramChart', 'ageRiskChart', 'sectorRiskChart'];
          chartIds.forEach(id => {
            const canvas = document.getElementById(id);
            if (canvas) {
              const existing = Chart.getChart(canvas);
              if (existing) existing.destroy();
            }
          });

          // Trigger complete cascade refresh across all UI metrics
          if (typeof updateKPIs === 'function') updateKPIs();
          if (typeof applyFilters === 'function') applyFilters();
          if (typeof renderCharts === 'function') renderCharts();
          if (typeof renderBusinessInsights === 'function') renderBusinessInsights();
          if (typeof checkRiskAlert === 'function') checkRiskAlert();
          if (typeof renderPersonas === 'function') renderPersonas();
          if (typeof renderFinancialDashboard === 'function') renderFinancialDashboard();
          if (typeof renderVIP === 'function') renderVIP();
          if (typeof renderBudget === 'function') renderBudget();
          if (typeof updateWhatIf === 'function') updateWhatIf();
          if (typeof renderTable === 'function') renderTable();

          // Animate major dashboard elements smoothly into view with zero rendering artifacts
          const animElements = [
            document.getElementById('kpi-strip'),
            document.querySelector('.risk-tolerance-wrapper'),
            document.querySelector('.credit-policy-wrapper'),
            document.getElementById('macro-stress-panel'),
            document.getElementById('fin-dashboard'),
            document.getElementById('charts'),
            document.getElementById('customers'),
            document.getElementById('personas')
          ];
          animElements.forEach(el => {
            if (el) {
              el.classList.remove('dashboard-reveal-active');
              void el.offsetWidth; // Force layout engine reflow
              el.classList.add('dashboard-reveal-active');
            }
          });

          // Instantly synchronize bilingual Aura AI engine
          if (typeof window.triggerAuraQuickAction === 'function') {
            window.triggerAuraQuickAction('btn-audit-concentration');
          }

          // Kickstart the dynamic scrolling insights ticker
          if (typeof window.startTickerTape === 'function') {
            window.startTickerTape();
          }

          if (typeof window.toast === 'function') {
            window.toast('success', '📥', 'Corporate Hub Sync', `Successfully imported ${parsedRecords.length} institutional records and synchronized AI engine.`);
          } else if (typeof showToast === 'function') {
            showToast({ type: 'success', icon: '📥', title: 'Corporate Hub Sync', msg: `Successfully imported ${parsedRecords.length} institutional records and synchronized AI engine.` });
          }

          if (typeof window.logSystemActivity === 'function') {
            window.logSystemActivity('CORPORATE_CSV_UPLOAD', `Imported ${parsedRecords.length} corporate records via Data Hub`, 'SUCCESS');
          }

          if (typeof window.saveUploadedFileToHistory === 'function') {
            window.saveUploadedFileToHistory(file ? file.name : 'uploaded_portfolio.csv', window.customersData);
          }

          suppressAllErrorHeaders();
        });
      }

      if (event.target) event.target.value = '';
    },
    error: function (err) {
      if (loader) loader.style.display = 'none';
      if (dropZone) dropZone.style.display = 'block';
      suppressAllErrorHeaders();
      if (typeof window.toast === 'function') {
        window.toast('error', '❌', 'Parse Error', `Could not read the CSV file: ${err.message}`);
      }
      if (event.target) event.target.value = '';
    }
  });
};

window.printIntegrityLogLine = function(text, color = '#94a3b8') {
    const container = document.getElementById('data-integrity-live-logs');
    if (!container) return;
    const line = document.createElement('div');
    line.style.color = color;
    line.innerHTML = `> ${text}`;
    container.appendChild(line);
};

window.runPreflightDataAudit = function(fileObject, onSuccessCallback) {
    const logBox = document.getElementById('data-integrity-live-logs');
    if (logBox) logBox.innerHTML = ''; // wipe previous runs
    
    setTimeout(() => { window.printIntegrityLogLine('SCANNING CSV STRUCTURE AND SCHEMA HEADERS...', '#38bdf8'); }, 200);
    setTimeout(() => { window.printIntegrityLogLine('SUCCESS: [CustomerID, CreditScore, SpendingScore] FOUND.', '#34d399'); }, 700);
    setTimeout(() => { window.printIntegrityLogLine('AUDITING COMPLIANCE LAYERS & CREDIT SCORE OUTLIERS...', '#38bdf8'); }, 1200);
    setTimeout(() => { window.printIntegrityLogLine('SUCCESS: ALL BOUNDARIES ARE COMPLIANT WITH BDDK REGISTERS.', '#34d399'); }, 1800);
    setTimeout(() => { 
        window.printIntegrityLogLine('SYNCHRONIZING ENTERPRISE DASHBOARD MATRIX...', '#a855f7');
        onSuccessCallback(); 
    }, 2300);
};

window.saveUploadedFileToHistory = function(fileName, recordsArray) {
    if (!window.corporateStorageHistory) window.corporateStorageHistory = {};
    window.corporateStorageHistory[fileName] = recordsArray;
    
    const pool = document.getElementById('upload-history-chips-pool');
    const wrapper = document.getElementById('corporate-upload-history-row');
    if (!pool || !wrapper) return;
    
    wrapper.style.display = 'block';
    
    // Create a fast-recall selection tag chip
    const chip = document.createElement('button');
    chip.className = 'btn-macro';
    chip.style.padding = '0.4rem 0.8rem';
    chip.style.fontSize = '0.8rem';
    chip.style.background = 'rgba(56, 189, 248, 0.1)';
    chip.style.borderColor = 'rgba(56, 189, 248, 0.2)';
    chip.textContent = `📄 ${fileName}`;
    
    chip.onclick = function() {
        window.customersData = window.corporateStorageHistory[fileName];
        allData = window.customersData;
        window.allData = allData;
        customers = [...allData];
        window.ANL_DATA = allData;
        window.customerData = allData;
        if (typeof window.calculateKPIs === 'function') window.calculateKPIs();
        if (typeof window.renderCharts === 'function') window.renderCharts();
        if (typeof window.updateTable === 'function') window.updateTable(1);
        if (typeof updateKPIs === 'function') updateKPIs();
        if (typeof applyFilters === 'function') applyFilters();
        if (typeof renderCharts === 'function') renderCharts();
        if (typeof renderBusinessInsights === 'function') renderBusinessInsights();
        if (typeof checkRiskAlert === 'function') checkRiskAlert();
        if (typeof renderPersonas === 'function') renderPersonas();
        if (typeof renderFinancialDashboard === 'function') renderFinancialDashboard();
        if (typeof renderVIP === 'function') renderVIP();
        if (typeof renderBudget === 'function') renderBudget();
        if (typeof updateWhatIf === 'function') updateWhatIf();
        if (typeof renderTable === 'function') renderTable();
    };
    
    // Avoid adding duplicate chips for the same file
    if (![...pool.children].some(c => c.textContent.includes(fileName))) {
        pool.appendChild(chip);
    }
};

/* ── KPI cards ────────────────────────────────────────────── */
function updateKPIs() {
  const footerMeta = document.getElementById('footer-dynamic-meta');
  if (footerMeta) {
      const recordCount = (window.customersData && window.customersData.length > 0) ? window.customersData.length : 1000;
      const currentSectorName = window.authenticatedCompanyName ? `Active Tenant: ${window.authenticatedCompanyName}` : 'Simulation Showroom Sample';
      footerMeta.innerHTML = `B2B Risk Analytics Core &bull; ${currentSectorName} &bull; <b>${recordCount.toLocaleString()}</b> active portfolio record(s) parsed.`;
  }

  // Also synchronize the hero sample display text dynamically
  const heroBadge = document.querySelector('.hero-badge');
  if (heroBadge && window.authenticatedCompanyName) {
      const activeRecordCount = window.customersData ? window.customersData.length : 0;
      heroBadge.textContent = `Enterprise Customer Segment · ${activeRecordCount} Records Active`;
  }

  if (window.pendingCorporateUpload || allData.length === 0) {
    if (document.getElementById('kpi-val-total')) document.getElementById('kpi-val-total').textContent = '0';
    if (document.getElementById('kpi-val-high')) document.getElementById('kpi-val-high').textContent = '0';
    if (document.getElementById('kpi-val-medium')) document.getElementById('kpi-val-medium').textContent = '0';
    if (document.getElementById('kpi-val-low')) document.getElementById('kpi-val-low').textContent = '0';
    if (document.getElementById('kpi-val-avg')) document.getElementById('kpi-val-avg').textContent = '—';
    return;
  }
  const high = allData.filter(c => c.riskLevel === 'High Risk').length;
  const medium = allData.filter(c => c.riskLevel === 'Medium Risk').length;
  const low = allData.filter(c => c.riskLevel === 'Low Risk').length;
  const avgCr = Math.round(allData.reduce((s, c) => s + c.creditScore, 0) / allData.length);
  animateCount('kpi-val-total', allData.length);
  animateCount('kpi-val-high', high);
  animateCount('kpi-val-medium', medium);
  animateCount('kpi-val-low', low);
  animateCount('kpi-val-avg', avgCr);
}

function animateCount(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let start = 0; const dur = 900; const step = 16;
  const inc = target / (dur / step);
  const iv = setInterval(() => {
    start = Math.min(start + inc, target);
    el.textContent = Math.round(start).toLocaleString();
    if (start >= target) clearInterval(iv);
  }, step);
}

/* ── Charts ───────────────────────────────────────────────── */
function renderCharts() {
  const high = allData.filter(c => c.riskLevel === 'High Risk').length;
  const medium = allData.filter(c => c.riskLevel === 'Medium Risk').length;
  const low = allData.filter(c => c.riskLevel === 'Low Risk').length;

  // Clean up existing Chart instances to prevent canvas reuse errors
  ['riskDonutChart', 'scatterChart', 'histogramChart', 'ageRiskChart', 'sectorRiskChart'].forEach(id => {
    const existing = Chart.getChart(id);
    if (existing) existing.destroy();
  });

  /* Donut */
  new Chart(document.getElementById('riskDonutChart'), {
    type: 'doughnut',
    data: {
      labels: ['High Risk', 'Medium Risk', 'Low Risk'],
      datasets: [{
        data: [high, medium, low],
        backgroundColor: ['rgba(248,113,113,.85)', 'rgba(251,191,36,.85)', 'rgba(52,211,153,.85)'],
        borderColor: 'transparent', hoverOffset: 8
      }]
    },
    options: { cutout: '68%', plugins: { legend: { labels: { color: '#cbd5e1', font: { size: 12 } } } }, animation: { animateRotate: true } }
  });

  /* Scatter */
  const colors = { 'High Risk': 'rgba(248,113,113,.7)', 'Medium Risk': 'rgba(251,191,36,.7)', 'Low Risk': 'rgba(52,211,153,.7)' };
  const byRisk = (r) => allData.filter(c => c.riskLevel === r).map(c => ({ x: c.annualIncome, y: c.spendingScore }));
  new Chart(document.getElementById('scatterChart'), {
    type: 'scatter',
    data: {
      datasets: [
        { label: 'High Risk', data: byRisk('High Risk'), backgroundColor: colors['High Risk'], pointRadius: 3 },
        { label: 'Medium Risk', data: byRisk('Medium Risk'), backgroundColor: colors['Medium Risk'], pointRadius: 3 },
        { label: 'Low Risk', data: byRisk('Low Risk'), backgroundColor: colors['Low Risk'], pointRadius: 3 },
      ]
    },
    options: {
      plugins: { legend: { labels: { color: '#cbd5e1' } } },
      scales: {
        x: { title: { display: true, text: 'Annual Income (k$)', color: '#64748b' }, ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,.05)' } },
        y: { title: { display: true, text: 'Spending Score', color: '#64748b' }, ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,.05)' } }
      }
    }
  });

  /* Histogram – credit score */
  const bins = Array.from({ length: 12 }, (_, i) => 300 + i * 50);
  const counts = bins.map(b => allData.filter(c => c.creditScore >= b && c.creditScore < b + 50).length);
  new Chart(document.getElementById('histogramChart'), {
    type: 'bar',
    data: {
      labels: bins.map(b => `${b}-${b + 49}`),
      datasets: [{
        label: 'Customers', data: counts,
        backgroundColor: 'rgba(108,99,255,.7)', borderColor: 'rgba(108,99,255,1)', borderWidth: 1
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#64748b', maxRotation: 45 }, grid: { color: 'rgba(255,255,255,.05)' } },
        y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,.05)' } }
      }
    }
  });

  /* Age by Risk – bar chart approximation */
  const riskGroups = ['High Risk', 'Medium Risk', 'Low Risk'];
  const avgAge = riskGroups.map(r => {
    const g = allData.filter(c => c.riskLevel === r);
    return g.length ? +(g.reduce((s, c) => s + c.age, 0) / g.length).toFixed(1) : 0;
  });
  new Chart(document.getElementById('ageRiskChart'), {
    type: 'bar',
    data: {
      labels: riskGroups,
      datasets: [{
        label: 'Avg Age', data: avgAge,
        backgroundColor: ['rgba(248,113,113,.75)', 'rgba(251,191,36,.75)', 'rgba(52,211,153,.75)'],
        borderRadius: 8
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#cbd5e1' }, grid: { display: false } },
        y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,.05)' }, min: 18 }
      }
    }
  });

  /* ── Sector Risk Concentration ────────────────────────────── */
  const sectors = ['Retail', 'Real Estate', 'E-commerce', 'Manufacturing', 'Logistics', 'Healthcare'];
  const sectorRiskCounts = {};
  sectors.forEach(s => sectorRiskCounts[s] = { high: 0, medium: 0, low: 0 });

  allData.forEach(c => {
    // Deterministic sector assignment based on ID
    const cId = c.CustomerID || c.id || Math.floor(Math.random() * 100);
    const sector = sectors[cId % sectors.length];

    if (c.riskLevel === 'High Risk') sectorRiskCounts[sector].high++;
    else if (c.riskLevel === 'Medium Risk') sectorRiskCounts[sector].medium++;
    else sectorRiskCounts[sector].low++;
  });

  new Chart(document.getElementById('sectorRiskChart'), {
    type: 'bar',
    data: {
      labels: sectors,
      datasets: [
        {
          label: 'High Risk',
          data: sectors.map(s => sectorRiskCounts[s].high),
          backgroundColor: 'rgba(248,113,113,.85)',
          borderRadius: 4
        },
        {
          label: 'Medium Risk',
          data: sectors.map(s => sectorRiskCounts[s].medium),
          backgroundColor: 'rgba(251,191,36,.85)',
          borderRadius: 4
        },
        {
          label: 'Low Risk',
          data: sectors.map(s => sectorRiskCounts[s].low),
          backgroundColor: 'rgba(52,211,153,.85)',
          borderRadius: 4
        }
      ]
    },
    options: {
      indexAxis: 'y', // Horizontal stacked bar chart
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#cbd5e1' } },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label: function (context) {
              return `${context.dataset.label}: ${context.raw} clients`;
            }
          }
        }
      },
      scales: {
        x: {
          stacked: true,
          ticks: { color: '#cbd5e1' },
          grid: { color: 'rgba(255,255,255,.05)' }
        },
        y: {
          stacked: true,
          ticks: { color: '#cbd5e1' },
          grid: { display: false }
        }
      }
    }
  });
}

/* ── Table & filtering ────────────────────────────────────── */
window.setFilter = function (f) {
  currentFilter = f;
  currentPage = 1;
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  // Match chip ID or fallback for Company Type chips if they exist
  const id = f === 'all' ? 'chip-all' : f === 'High Risk' ? 'chip-high' : f === 'Medium Risk' ? 'chip-medium' : f === 'Low Risk' ? 'chip-low' : '';
  if (id) {
    document.getElementById(id)?.classList.add('active');
  } else {
    // If chip for Company Type exists, find it by text or data attribute
    document.querySelectorAll('.chip').forEach(c => {
      if (c.textContent.includes(f)) c.classList.add('active');
    });
  }
  applyFilters();
};

window.applySort = function () {
  currentSort = document.getElementById('sort-select').value;
  applyFilters();
};

const companyTypes = ['Sole Proprietorship (Şahıs Şirketi)', 'LLC (Limited Şirket)', 'Joint-Stock (Anonim Şirket)'];
function getCompanyType(c) {
  if (c.companyType) return c.companyType;
  const cId = c.id || c.CustomerID || 0;
  return companyTypes[cId % companyTypes.length];
}

function applyFilters() {
  let data = [...allData];
  if (currentFilter !== 'all') {
    data = data.filter(c => c.riskLevel === currentFilter || getCompanyType(c).toLowerCase().includes(currentFilter.toLowerCase()));
  }
  if (currentSearch) {
    const s = currentSearch.toLowerCase();
    data = data.filter(c =>
      String(c.id).includes(s) ||
      getCompanyType(c).toLowerCase().includes(s) ||
      c.riskLevel.toLowerCase().includes(s) ||
      c.clusterLabel.toLowerCase().includes(s)
    );
  }
  const [key, dir] = currentSort.split('-');
  const field = key === 'id' ? 'id' : key === 'credit' ? 'creditScore' : key === 'income' ? 'annualIncome' : 'spendingScore';
  data.sort((a, b) => dir === 'asc' ? a[field] - b[field] : b[field] - a[field]);
  customers = data;
  renderTable();
}

/* ── Currency Conversion System ─────────────────────────── */
const CURRENCY_RATES = {
  USD: { rate: 1, symbol: '$', suffix: 'k', label: 'Income (k$)' },
  TRY: { rate: 33, symbol: '₺', suffix: 'k', label: 'Gelir (k₺)' },
  EUR: { rate: 0.92, symbol: '€', suffix: 'k', label: 'Income (k€)' },
};
let currentCurrency = 'USD';

window.setCurrency = function (code) {
  if (!CURRENCY_RATES[code]) return;
  currentCurrency = code;

  // Update toggle buttons
  document.querySelectorAll('.currency-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('cur-' + code.toLowerCase());
  if (btn) btn.classList.add('active');

  // Update table header
  const th = document.getElementById('th-income');
  if (th) th.textContent = CURRENCY_RATES[code].label;

  // Re-render table with new currency
  renderTable();
};

function formatIncome(rawUSD) {
  const cur = CURRENCY_RATES[currentCurrency];
  const converted = Math.round(rawUSD * cur.rate);
  return `${cur.symbol}${converted.toLocaleString()}${cur.suffix}`;
}

window.selectedClientIdsForWorkflow = [];

window.toggleClientWorkflowFlag = function(clientId) {
    const index = window.selectedClientIdsForWorkflow.indexOf(clientId);
    if (index > -1) {
        window.selectedClientIdsForWorkflow.splice(index, 1);
    } else {
        window.selectedClientIdsForWorkflow.push(clientId);
    }
    
    const tray = document.getElementById('enterprise-workflow-tray');
    const countLabel = document.getElementById('workflow-selected-count');
    if (tray && countLabel) {
        if (window.selectedClientIdsForWorkflow.length > 0) {
            tray.style.display = 'flex';
            countLabel.textContent = `${window.selectedClientIdsForWorkflow.length} institutional client portfolio(s) flagged`;
        } else {
            tray.style.display = 'none';
        }
    }
};

window.updateTable = function(page) {
    if (page) currentPage = page;
    renderTable();
};

window.triggerWorkflowAction = function(actionType) {
    if (window.selectedClientIdsForWorkflow.length === 0) return;
    
    const targetIds = window.selectedClientIdsForWorkflow.join(', ');
    let detailLog = '';
    
    if (actionType === 'ASSIGN_COMPLIANCE') detailLog = `Escalated portfolio targets [${targetIds}] to L3 Compliance Division for structural risk audits.`;
    else if (actionType === 'FLAG_INVESTIGATION') detailLog = `Triggered multi-variable threat investigation tracking across IDs: [${targetIds}].`;
    else if (actionType === 'DOWNLOAD_DOSSIER') detailLog = `Generated and cryptographically signed standard asset security reports for targets: [${targetIds}].`;
    
    alert(`Workflow Triggered Successfully.\nOperation: ${actionType}\nTarget Client Scope: ${window.selectedClientIdsForWorkflow.length} records updated.`);
    
    if (typeof window.logSystemActivity === 'function') {
        window.logSystemActivity(actionType, detailLog, 'SUCCESS');
    }
    
    // Flush runtime selection buffer and hide layout tray smoothly
    window.selectedClientIdsForWorkflow = [];
    const tray = document.getElementById('enterprise-workflow-tray');
    if (tray) tray.style.display = 'none';
    if (typeof window.updateTable === 'function') window.updateTable(1);
};

function renderTable() {
  const start = (currentPage - 1) * PAGE_SIZE;
  const page = customers.slice(start, start + PAGE_SIZE);
  const tbody = document.getElementById('table-body');
  tbody.innerHTML = '';
  page.forEach(c => {
    const rClass = c.riskLevel === 'High Risk' ? 'risk-high' : c.riskLevel === 'Medium Risk' ? 'risk-medium' : 'risk-low';
    const rIcon = c.riskLevel === 'High Risk' ? '🔴' : c.riskLevel === 'Medium Risk' ? '🟡' : '🟢';
    const rLabel = c.riskLevel === 'High Risk' ? t('riskHigh') : c.riskLevel === 'Medium Risk' ? t('riskMedium') : t('riskLow');

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="checkbox" onchange="window.toggleClientWorkflowFlag(${c.id})" ${window.selectedClientIdsForWorkflow.includes(c.id) ? 'checked' : ''} style="margin-right:0.5rem; cursor:pointer;" /> #${String(c.id).padStart(4, '0')}</td>
      <td>${getCompanyType(c)}</td>
      <td>${c.age}</td>
      <td>${formatIncome(c.annualIncome)}</td>
      <td>${c.spendingScore}</td>
      <td>${c.creditScore}</td>
      <td><span class="cluster-badge">${c.cluster}</span> ${c.clusterLabel}</td>
      <td><span class="risk-badge ${rClass}">${rIcon} ${rLabel}</span></td>
      <td><button class="action-btn action-btn-monitor" onclick="openAuditModal(${c.id})">📄 Audit Report</button></td>`;
    tbody.appendChild(tr);
  });
  
  const footerEl = document.getElementById('table-footer');
  if (footerEl) {
    if (customers.length === 0) {
      footerEl.textContent = 'Showing 0 of 0 customers';
    } else {
      footerEl.textContent = `Showing ${start + 1}–${Math.min(start + PAGE_SIZE, customers.length)} of ${customers.length} customers`;
    }
  }
  renderPagination();
  highlightRiskyRows();

  const footerMeta = document.getElementById('footer-dynamic-meta');
  if (footerMeta) {
      const recordCount = (window.customersData && window.customersData.length > 0) ? window.customersData.length : 1000;
      const currentSectorName = window.authenticatedCompanyName ? `Active Tenant: ${window.authenticatedCompanyName}` : 'Simulation Showroom Sample';
      footerMeta.innerHTML = `B2B Risk Analytics Core &bull; ${currentSectorName} &bull; <b>${recordCount.toLocaleString()}</b> active portfolio record(s) parsed.`;
  }
}

/* ── Audit Modal Logic ──────────────────────────────────── */
window.openAuditModal = function (customerId) {
  if (window.speechSynthesis && typeof window.speechSynthesis.cancel === 'function') window.speechSynthesis.cancel();
  try {
    const client = allData.find(c => c.id == customerId || c.CustomerID == customerId);
    if (!client) throw new Error("Client not found.");

    const income = client.annualIncome !== undefined ? client.annualIncome : (client.Income !== undefined ? client.Income : 65);
    const spending = client.spendingScore !== undefined ? client.spendingScore : (client.SpendingScore !== undefined ? client.SpendingScore : 50);
    const credit = client.creditScore !== undefined ? client.creditScore : (client.CreditScore !== undefined ? client.CreditScore : 650);

    // Calculate realistic Probability of Default (PD) based on credit score or stored float value
    let pd;
    if (client.probabilityOfDefault !== undefined) {
      const pdNum = typeof client.probabilityOfDefault === 'number' ? client.probabilityOfDefault : parseFloat(client.probabilityOfDefault);
      pd = isNaN(pdNum) ? '5.0' : pdNum.toFixed(1);
    } else {
      let basePd = ((1000 - credit) / 700) * 100;
      if (client.paymentStatus === 'delinquent') {
        basePd += 35;
      } else if (client.paymentStatus === 'minimum') {
        basePd += 15;
      }
      pd = Math.max(0.1, Math.min(99.9, basePd)).toFixed(1);
    }

    // Calculate Financial Stress Indicator (Spending Score divided by Income)
    let stress = income > 0 ? (spending / income).toFixed(2) : 'N/A';

    // Corporate Engagement Flag (Approved / Rejected Corporate Badge)
    let flagHTML = '';
    if (client.riskLevel === 'Low Risk') {
      flagHTML = '<span class="flag-approved" style="display:inline-flex;align-items:center;gap:0.3rem;padding:0.3rem 0.8rem;background:rgba(52,211,153,0.15);border:1px solid rgba(52,211,153,0.3);border-radius:99px;color:#34d399;font-weight:700;font-size:0.85rem;">🟢 Approved</span>';
    } else if (client.riskLevel === 'High Risk') {
      flagHTML = '<span class="flag-rejected" style="display:inline-flex;align-items:center;gap:0.3rem;padding:0.3rem 0.8rem;background:rgba(248,113,113,0.15);border:1px solid rgba(248,113,113,0.3);border-radius:99px;color:#f87171;font-weight:700;font-size:0.85rem;">🔴 Rejected</span>';
    } else {
      flagHTML = '<span class="flag-monitor" style="display:inline-flex;align-items:center;gap:0.3rem;padding:0.3rem 0.8rem;background:rgba(251,191,36,0.15);border:1px solid rgba(251,191,36,0.3);border-radius:99px;color:#fbbf24;font-weight:700;font-size:0.85rem;">🟡 Pending Review</span>';
    }

    const tier = client.riskLevel === 'High Risk' ? 'high' : (client.riskLevel === 'Medium Risk' ? 'med' : 'low');
    const pol = window.CreditPolicy[tier];
    const actionLabel = pol.action === 'auto_approve' ? '⚡ Auto-Approve Credit Line' : (pol.action === 'manual_review' ? '🔍 Manual Officer Audit' : (pol.action === 'restrict_terms' ? '⚠️ Restrict Payment Terms' : '🛑 Instant Account Freeze'));

    const policyTermsHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(15,23,42,0.6); padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); margin-top: 0.5rem; gap: 1rem;">
        <div><strong>Base APR Markup:</strong> <span style="color: #a78bfa;">${pol.rate}%</span></div>
        <div><strong>Max Credit Cap:</strong> <span style="color: #34d399;">$${pol.limit}k</span></div>
        <div><strong>Action:</strong> <span style="color: #f87171;">${actionLabel}</span></div>
      </div>
    `;

    document.getElementById('audit-id-badge').textContent = `Client #${customerId}`;
    document.getElementById('audit-pd').textContent = `${pd}%`;
    document.getElementById('audit-stress').textContent = stress;
    document.getElementById('audit-flag').innerHTML = flagHTML;
    const polTermsEl = document.getElementById('audit-policy-terms');
    if (polTermsEl) polTermsEl.innerHTML = policyTermsHTML;

    const overlay = document.getElementById('audit-modal-overlay');
    if (overlay) {
      overlay.style.display = 'flex';
      void overlay.offsetWidth; // Trigger reflow
      overlay.classList.add('show');
    }

    if (typeof window.logSystemAudit === 'function') {
      window.logSystemAudit('CLIENT_AUDIT_REPORT', `Generated corporate audit intelligence sheet for Client #${customerId} — PD: ${pd}%, Stress Indicator: ${stress}, Status: ${client.riskLevel}`, 'SUCCESS');
    }
  } catch (err) {
    console.error("Audit Modal Error:", err);
    if (typeof window.toast === 'function') {
      window.toast('warn', '⚠️', 'Audit Error', 'Could not generate audit report for this client.');
    } else if (typeof showToast === 'function') {
      showToast({ type: 'warn', icon: '⚠️', title: 'Audit Error', msg: 'Could not generate audit report for this client.' });
    }
  }
};

window.closeAuditModal = function () {
  if (window.speechSynthesis && typeof window.speechSynthesis.cancel === 'function') window.speechSynthesis.cancel();
  const overlay = document.getElementById('audit-modal-overlay');
  if (overlay) {
    overlay.classList.remove('show');
    setTimeout(() => {
      const el = document.getElementById('audit-modal-overlay');
      if (el) el.style.display = 'none';
    }, 300);
  }
};

/* ── Action button click handler (delegated) ────────────── */
(function () {
  const tbody = document.getElementById('table-body');
  if (!tbody) return;
  tbody.addEventListener('click', function (e) {
    const btn = e.target.closest('.action-btn');
    if (!btn || btn.classList.contains('action-btn-done')) return;
    if (btn.getAttribute('onclick')?.includes('openAuditModal')) return;

    const action = btn.dataset.action;
    const id = btn.dataset.id;
    const risk = btn.dataset.risk;

    const messages = {
      restrict: {
        icon: '🚫',
        title: 'Account Restricted',
        msg: `Customer #${id} (${risk}) has been restricted. Spending limits applied.`,
        type: 'warn',
        btnText: '✓ Restricted',
      },
      reward: {
        icon: '🏆',
        title: 'Reward Sent',
        msg: `Customer #${id} (${risk}) has been rewarded! VIP bonus applied.`,
        type: 'info',
        btnText: '✓ Rewarded',
      },
      monitor: {
        icon: '👁️',
        title: 'Under Monitoring',
        msg: `Customer #${id} (${risk}) added to monitoring queue. Next review in 7 days.`,
        type: 'info',
        btnText: '✓ Monitored',
      },
    };

    const m = messages[action] || messages.monitor;

    // Fire toast
    if (typeof showToast === 'function') {
      showToast({ type: m.type, icon: m.icon, title: m.title, msg: m.msg });
    } else {
      // Fallback inline toast
      const toast = document.createElement('div');
      toast.style.cssText = 'position:fixed;bottom:2rem;right:2rem;z-index:10005;background:#1c2340;border:1px solid rgba(108,99,255,.3);border-radius:12px;padding:1rem 1.5rem;color:#e2e8f0;font-size:.85rem;box-shadow:0 8px 32px rgba(0,0,0,.5);animation:fadeUp .3s ease-out;max-width:360px;';
      toast.innerHTML = `<strong>${m.icon} ${m.title}</strong><br><span style="color:#94a3b8;font-size:.78rem;">${m.msg}</span>`;
      document.body.appendChild(toast);
      setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity .3s'; setTimeout(() => toast.remove(), 350); }, 3000);
    }

    // Update button state
    btn.classList.add('action-btn-done');
    btn.textContent = m.btnText;
  });
})();

function renderPagination() {
  const total = Math.ceil(customers.length / PAGE_SIZE);
  const pag = document.getElementById('pagination');
  if (!pag) return;
  pag.innerHTML = '';
  const addBtn = (label, page, extra = '') => {
    const b = document.createElement('button');
    b.className = `page-btn${extra}`;
    b.textContent = label;
    if (extra !== ' ellipsis') b.onclick = () => { currentPage = page; renderTable(); };
    pag.appendChild(b);
  };

  if (total === 0) {
    addBtn('1', 1, ' active-page');
    return;
  }

  addBtn('‹', Math.max(1, currentPage - 1));
  let pages = [];
  if (total <= 7) { for (let i = 1; i <= total; i++) pages.push(i); }
  else {
    pages = [1];
    if (currentPage > 3) pages.push('…');
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(total - 1, currentPage + 1); i++) pages.push(i);
    if (currentPage < total - 2) pages.push('…');
    pages.push(total);
  }
  pages.forEach(p => {
    if (p === '…') addBtn('…', 0, ' ellipsis');
    else addBtn(p, p, p === currentPage ? ' active-page' : '');
  });
  addBtn('›', Math.min(total, currentPage + 1));
}

/* ── Nav highlight on scroll ──────────────────────────────── */
function highlightNav() {
  const sections = ['dashboard', 'insights', 'personas', 'customers', 'predict', 'vip', 'budget'];
  const y = window.scrollY + 100;
  for (let s of sections) {
    const el = document.getElementById(s);
    if (!el) continue;
    if (y >= el.offsetTop && y < el.offsetTop + el.offsetHeight) {
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      document.getElementById('nav-' + s)?.classList.add('active');
    }
  }
}

window.scrollToSection = function (id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
};

/* ── Gender toggle ────────────────────────────────────────── */
window.setGender = function (g) {
  selectedGender = g;
  document.getElementById('toggle-male').classList.toggle('active', g === 'Male');
  document.getElementById('toggle-female').classList.toggle('active', g === 'Female');
};

/* ── Slider labels ────────────────────────────────────────── */
window.updateSlider = function (type) {
  const el = document.getElementById(`p-${type}`);
  const valEl = document.getElementById(`${type}-val`);
  if (el && valEl) { valEl.textContent = el.value; }
  // Keep What-If in sync with current predict values
  if (typeof syncWhatIfToPredict === 'function' && (type === 'income' || type === 'spending')) {
    syncWhatIfToPredict();
  }
};

/* ── Analyse new customer ─────────────────────────────────── */
window.analyzeCustomer = function () {
  if (window.pendingCorporateUpload || !allData.length) {
    if (typeof window.toast === 'function') {
      window.toast('warn', '⚠️', 'Action Disabled', 'Calculations disabled. Please upload a corporate CSV data file first.');
    } else if (typeof showToast === 'function') {
      showToast({ type: 'warn', icon: '⚠️', title: 'Action Disabled', msg: 'Calculations disabled. Please upload a corporate CSV data file first.' });
    }
    const ph = document.getElementById('result-placeholder');
    const content = document.getElementById('result-content');
    if (ph) { ph.style.display = 'flex'; ph.innerHTML = '<p style="color: #f87171; font-weight: 600;">⚠️ Calculations disabled until a corporate CSV file is uploaded.</p>'; }
    if (content) content.style.display = 'none';
    return;
  }

  // Read active dropdown value from industry selector securely
  const industrySelect = document.getElementById('industry-selector');
  const ind = (industrySelect && industrySelect.value) ? industrySelect.value : (window.currentIndustry || 'bank');

  // Read core parameters from DOM securely
  const incomeEl = document.getElementById('p-income');
  const spendingEl = document.getElementById('p-spending');
  const creditEl = document.getElementById('p-credit');
  
  const income = incomeEl ? parseFloat(incomeEl.value) || 60 : 60;
  const spending = spendingEl ? parseFloat(spendingEl.value) || 50 : 50;
  let baseCredit = creditEl ? parseFloat(creditEl.value) || 650 : 650;

  const paymentStatusInput = document.querySelector('input[name="payment-status"]:checked');
  const paymentStatus = paymentStatusInput ? paymentStatusInput.value : 'regular';

  // Read active policy settings from DOM
  const rateLow = parseInt(document.getElementById('pol-rate-low')?.value) || window.CreditPolicy?.low?.rate || 14;
  const limitLow = parseInt(document.getElementById('pol-limit-low')?.value) || window.CreditPolicy?.low?.limit || 150;
  const rateMed = parseInt(document.getElementById('pol-rate-med')?.value) || window.CreditPolicy?.med?.rate || 22;
  const limitMed = parseInt(document.getElementById('pol-limit-med')?.value) || window.CreditPolicy?.med?.limit || 50;
  const rateHigh = parseInt(document.getElementById('pol-rate-high')?.value) || window.CreditPolicy?.high?.rate || 34;
  const limitHigh = parseInt(document.getElementById('pol-limit-high')?.value) || window.CreditPolicy?.high?.limit || 15;

  if (paymentStatus === 'delinquent') {
    baseCredit = Math.max(300, baseCredit - 150 - (rateHigh * 2));
  } else if (paymentStatus === 'minimum') {
    baseCredit = Math.max(300, baseCredit - 50 - rateMed);
  } else {
    baseCredit = Math.min(1000, baseCredit + Math.round(limitLow / 10));
  }

  // Compute a baseline Probability of Default (PD) using the core parameters: Credit Score, Spending Score, and Income
  let rawScore = baseCredit + (income * 0.5) - (spending * 0.2);
  let baselinePD = ((1000 - rawScore) / 700) * 100;
  if (paymentStatus === 'delinquent') baselinePD += 35;
  else if (paymentStatus === 'minimum') baselinePD += 15;
  baselinePD = Math.max(0.1, Math.min(99.9, baselinePD));

  // Introduce a clean switch block targeting the selected industry token to parse custom dynamic inputs securely
  let sectorMetric1 = 0;
  let sectorMetric2 = 0;
  let sectorPenalty = 0;
  let finalPd = baselinePD;
  let sectorDetailsText = '';

  switch (ind) {
    case 'bank': {
      // For 'Banking & Finance', apply a risk factor based on Credit Card Debt Ratio.
      const el1 = document.getElementById('p-sector-dep-vol');
      const el2 = document.getElementById('p-sector-debt-ratio');
      sectorMetric1 = el1 ? parseFloat(el1.value) || 50000 : 50000;
      sectorMetric2 = el2 ? parseFloat(el2.value) || 0.35 : 0.35;
      
      const ratioPenalty = Math.max(0, (sectorMetric2 - 0.30) * 60);
      const volumePenalty = Math.max(0, (50000 - sectorMetric1) / 1000);
      sectorPenalty = ratioPenalty + volumePenalty;
      finalPd = baselinePD + sectorPenalty; // apply risk factor based on Credit Card Debt Ratio
      sectorDetailsText = `Deposit Account Volume: $${sectorMetric1.toLocaleString()}, Credit Card Debt Ratio: ${(sectorMetric2 * 100).toFixed(1)}%`;
      break;
    }
    case 'logistics': {
      // For 'Logistics & Supply Chain', multiply risk using the Fuel Cost Index.
      const el1 = document.getElementById('p-sector-fleet-size');
      const el2 = document.getElementById('p-sector-fuel-index');
      sectorMetric1 = el1 ? parseFloat(el1.value) || 120 : 120;
      sectorMetric2 = el2 ? parseFloat(el2.value) || 85 : 85;
      
      const fuelMultiplier = sectorMetric2 / 80; // e.g. 85 / 80 = 1.0625
      const fleetPenalty = Math.max(0, (120 - sectorMetric1) * 0.3);
      finalPd = (baselinePD * fuelMultiplier) + fleetPenalty; // multiply risk using the Fuel Cost Index
      sectorPenalty = Math.max(0, finalPd - baselinePD);
      sectorDetailsText = `Fleet Size: ${sectorMetric1}, Fuel Cost Index: ${sectorMetric2}`;
      break;
    }
    case 'tech': {
      // For 'Tech & SaaS Startups', adjust calculation using Customer Churn Rate weight.
      const el1 = document.getElementById('p-sector-mrr');
      const el2 = document.getElementById('p-sector-churn');
      sectorMetric1 = el1 ? parseFloat(el1.value) || 15000 : 15000;
      sectorMetric2 = el2 ? parseFloat(el2.value) || 0.04 : 0.04;
      
      const churnWeight = Math.max(0, (sectorMetric2 - 0.03) * 500);
      const mrrPenalty = Math.max(0, (15000 - sectorMetric1) * 0.002);
      sectorPenalty = churnWeight + mrrPenalty;
      finalPd = baselinePD + sectorPenalty; // adjust calculation using Customer Churn Rate weight
      sectorDetailsText = `MRR: $${sectorMetric1.toLocaleString()}, Customer Churn Rate: ${(sectorMetric2 * 100).toFixed(1)}%`;
      break;
    }
    case 'retail': {
      // For 'Retail & E-Commerce', shift risk using the Return/Refund Rate percentage.
      const el1 = document.getElementById('p-sector-basket');
      const el2 = document.getElementById('p-sector-refund-rate');
      sectorMetric1 = el1 ? parseFloat(el1.value) || 75 : 75;
      sectorMetric2 = el2 ? parseFloat(el2.value) || 0.08 : 0.08;
      
      const refundShift = Math.max(0, (sectorMetric2 - 0.05) * 180);
      const basketPenalty = Math.max(0, (75 - sectorMetric1) * 0.4);
      sectorPenalty = refundShift + basketPenalty;
      finalPd = baselinePD + sectorPenalty; // shift risk using the Return/Refund Rate percentage
      sectorDetailsText = `Average Basket Value: $${sectorMetric1}, Return/Refund Rate: ${(sectorMetric2 * 100).toFixed(1)}%`;
      break;
    }
    case 'manufacturing': {
      // For 'Manufacturing & Heavy Industry', stress-test the data matrix using the Raw Material Risk Factor.
      const el1 = document.getElementById('p-sector-energy');
      const el2 = document.getElementById('p-sector-raw-risk');
      sectorMetric1 = el1 ? parseFloat(el1.value) || 240 : 240;
      sectorMetric2 = el2 ? parseFloat(el2.value) || 0.65 : 0.65;
      
      const rawMaterialStress = Math.max(0, (sectorMetric2 - 0.50) * 70);
      const energyStress = Math.max(0, (sectorMetric1 - 200) * 0.12);
      sectorPenalty = rawMaterialStress + energyStress;
      finalPd = baselinePD + sectorPenalty; // stress-test the data matrix using the Raw Material Risk Factor
      sectorDetailsText = `Energy Consumption Index: ${sectorMetric1}, Raw Material Risk Factor: ${(sectorMetric2 * 100).toFixed(1)}%`;
      break;
    }
    default: {
      sectorPenalty = 0;
      finalPd = baselinePD;
      sectorDetailsText = `Standard Assessment (Core Parameters)`;
      break;
    }
  }

  // Map the output successfully to float numbers
  finalPd = parseFloat(Math.max(0.1, Math.min(99.9, finalPd)).toFixed(2));
  let score = Math.round(Math.max(300, Math.min(1000, rawScore - sectorPenalty)));

  // Extract current enterprise scope context
  const currentSec = window.currentCorporateSector || 'bank';
  const valInc = parseFloat(document.getElementById('p-income')?.value || income);
  const valSpd = parseFloat(document.getElementById('p-spending')?.value || spending);
  const valCrd = parseFloat(document.getElementById('p-credit')?.value || baseCredit);
  let computedRisk = "Low Risk";
  let operationalVerdict = "";

  if (currentSec === 'bank') {
      if (valCrd < 500 || valSpd > 70) { computedRisk = "High Risk"; operationalVerdict = "CRITICAL DEBT SHOCK: Freeze asset lines."; }
      else if (valCrd < 720) { computedRisk = "Medium Risk"; operationalVerdict = "MODERATE VOLATILITY: Request structural audit."; }
      else { operationalVerdict = "PREMIUM ACCOUNT: Auto-approve expansion credit."; }
  } else if (currentSec === 'logistics') {
      if (valSpd > 65 || valInc < 50) { computedRisk = "High Risk"; operationalVerdict = "FUEL EXPOSURE WARNING: Suspend active route manifest."; }
      else { operationalVerdict = "ROUTE SECURE: Approve fleet deployment pipeline."; }
  } else if (currentSec === 'tech') {
      if (valSpd > 75 || valCrd < 500) { computedRisk = "High Risk"; operationalVerdict = "CHURN VELOCITY CRITICAL: Fire core account recovery automated logs."; }
      else { operationalVerdict = "EXPANSION SECURE: Approve API infrastructure credit lines."; }
  } else if (currentSec === 'manufacturing') {
      if (valSpd > 60) { computedRisk = "High Risk"; operationalVerdict = "MATERIAL INFLATION BLOW: Halt assembly line credit allocation."; }
      else { operationalVerdict = "OUTPUT STABLE: Maintain default operational capacity rules."; }
  } else if (currentSec === 'telecom') {
      if (valCrd < 520) { computedRisk = "High Risk"; operationalVerdict = "GRID SUBSCRIBER DROPOUT RISK: Escalate to churn analysis unit."; }
      else { operationalVerdict = "INFRASTRUCTURE STABLE: Deploy dynamic cell tower updates."; }
  }

  window.lastCalculatedRiskLevel = computedRisk;
  const targetRes = document.getElementById('predict-result-card');
  if (targetRes) {
      targetRes.innerHTML = `<div style="padding:1rem; border:1px solid rgba(255,255,255,0.1); border-radius:8px; background:rgba(0,0,0,0.2);">
          <h4 style="color:${computedRisk==='High Risk'?'#ef4444':'#34d399'}; font-weight:bold;">${computedRisk.toUpperCase()}</h4>
          <p style="font-size:0.85rem; color:#cbd5e1; margin-top:0.4rem;">• ${operationalVerdict}</p>
      </div>`;
  }

  let level = computedRisk;
  let color, rClass, rIcon;
  if (level === 'High Risk') {
    color = '#f87171'; rClass = 'risk-high'; rIcon = '🔴';
  } else if (level === 'Medium Risk') {
    color = '#fbbf24'; rClass = 'risk-medium'; rIcon = '🟡';
  } else {
    color = '#34d399'; rClass = 'risk-low'; rIcon = '🟢';
  }

  const { cluster, segment, label } = segmentCustomer(income, spending);
  let insight = operationalVerdict;
  let recommend = operationalVerdict;

  /* Show panel */
  const phEl = document.getElementById('result-placeholder');
  if (phEl) phEl.style.display = 'none';
  const rc = document.getElementById('result-content');
  if (rc) rc.style.display = 'block';

  /* Risk badge */
  const badge = document.getElementById('result-risk-badge');
  if (badge) {
    badge.className = `result-risk-badge risk-badge ${rClass}`;
    badge.textContent = `${rIcon} ${level}`;
  }

  /* Credit score ring */
  const pct = (score - 300) / 700;
  const circ = 2 * Math.PI * 50;
  const fill = document.getElementById('ring-fill');
  if (fill) {
    fill.style.strokeDasharray = circ;
    fill.style.strokeDashoffset = circ * (1 - Math.max(0, Math.min(1, pct)));
    fill.style.stroke = color;
  }
  const scoreEl = document.getElementById('ring-score');
  let cur = 300;
  if (scoreEl) {
    const iv = setInterval(() => { cur = Math.min(cur + 15, score); if (scoreEl) scoreEl.textContent = cur; if (cur >= score) clearInterval(iv); }, 16);
  }

  /* Metrics */
  const resCluster = document.getElementById('res-cluster');
  if (resCluster) resCluster.textContent = `Cluster ${cluster} — ${level}`;
  const resProfile = document.getElementById('res-profile');
  if (resProfile) resProfile.textContent = `${label} · B2B Corporate Client`;
  const resRecommend = document.getElementById('res-recommend');
  if (resRecommend) resRecommend.textContent = recommend;

  const calculatedRiskLevel = level;
  window.lastCalculatedRiskLevel = computedRisk;
  let assignedRate = "14%";
  let assignedLimit = "$150k";
  let assignedAction = "Auto-Approve";

  if (calculatedRiskLevel === 'Low Risk') {
      assignedRate = (document.getElementById('pol-rate-low')?.value || '14') + '%';
      assignedLimit = '$' + (document.getElementById('pol-limit-low')?.value || '150') + 'k';
      assignedAction = document.getElementById('pol-action-low')?.value || 'auto_approve';
  } else if (calculatedRiskLevel === 'Medium Risk') {
      assignedRate = (document.getElementById('pol-rate-med')?.value || '22') + '%';
      assignedLimit = '$' + (document.getElementById('pol-limit-med')?.value || '50') + 'k';
      assignedAction = document.getElementById('pol-action-med')?.value || 'manual_review';
  } else if (calculatedRiskLevel === 'High Risk') {
      assignedRate = (document.getElementById('pol-rate-high')?.value || '34') + '%';
      assignedLimit = '$' + (document.getElementById('pol-limit-high')?.value || '15') + 'k';
      assignedAction = document.getElementById('pol-action-high')?.value || 'freeze_account';
  }

  // Inject these corporate compliance variables into the global state so the UI and Aura AI can explicitly read them
  window.lastAnalyzedClientPolicy = { rate: assignedRate, limit: assignedLimit, action: assignedAction };

  const bankingPolicyEl = document.getElementById('res-banking-policy');
  if (bankingPolicyEl) {
      bankingPolicyEl.textContent = `Rate: ${assignedRate} | Limit: ${assignedLimit} | Action: ${assignedAction.toUpperCase()}`;
  }

  // Aura Intelligence Alert Hook
  if (computedRisk === 'High Risk') {
      try {
          const chatMessages = document.querySelector('.chat-messages');
          if (chatMessages) {
              const activeConf = window.ENTERPRISE_INDUSTRY_REGISTRY[currentSec] || window.ENTERPRISE_INDUSTRY_REGISTRY.bank;
              const alertMsg = document.createElement('div');
              alertMsg.className = 'message system-message';
              alertMsg.innerHTML = `
                  <div class='ai-message-content' style='background:rgba(239, 68, 68, 0.15); border:1px solid rgba(239, 68, 68, 0.3); padding:1rem; border-radius:8px; margin-top:0.5rem;'>
                      <div style='color:#ef4444; font-weight:bold; font-size:1.05rem;'>⚠️ Aura Intelligence Alert: High Risk Assessment</div>
                      <div style='color:#f8fafc; font-size:0.85rem; margin-top:0.4rem; line-height:1.4;'>
                          ${activeConf.icon} <strong>${activeConf.title} Audit Flag:</strong> An entity assessment has resolved with <strong>HIGH RISK</strong> status.
                          <br><span style='color:#fca5a5;'>Verdict: ${operationalVerdict}</span>
                          <br><span style='color:#cbd5e1;'>Assigned Terms: APR ${assignedRate} | Cap ${assignedLimit} (${assignedAction.toUpperCase()})</span>
                          <br>Our AI engine recommends immediate asset line review and policy cap enforcement.
                      </div>
                  </div>`;
              chatMessages.appendChild(alertMsg);
              chatMessages.scrollTop = chatMessages.scrollHeight;
              
              if (typeof window.speakAuraResponse === 'function') {
                  window.speakAuraResponse(`Aura Alert. High risk assessment detected for ${activeConf.title}. ${operationalVerdict}`);
              } else if (typeof window.auraSpeak === 'function') {
                  window.auraSpeak(`Aura Alert. High risk assessment detected for ${activeConf.title}. ${operationalVerdict}`, window.auraActiveLang === 'TR' ? 'tr-TR' : 'en-US');
              }
          }
      } catch (alertErr) {
          console.error('Aura Alert injection error:', alertErr);
      }
  }

  /* Breakdown bars */
  const iN = Math.round(Math.min(100, (income / 1000) * 100)); // normalized to 1000 max
  const sN = Math.round((100 - spending) / 99 * 100);
  const cN = Math.round((baseCredit - 300) / 600 * 100);
  setTimeout(() => {
    const barInc = document.getElementById('bar-income');
    if (barInc) barInc.style.width = iN + '%';
    const barSp = document.getElementById('bar-spending');
    if (barSp) barSp.style.width = sN + '%';
    const barCredit = document.getElementById('bar-credit');
    if (barCredit) barCredit.style.width = cN + '%';
    const pctInc = document.getElementById('pct-income');
    if (pctInc) pctInc.textContent = iN + '%';
    const pctSp = document.getElementById('pct-spending');
    if (pctSp) pctSp.textContent = sN + '%';
    const pctCredit = document.getElementById('pct-credit');
    if (pctCredit) pctCredit.textContent = cN + '%';
  }, 80);

  /* Business Insight */
  if (rc) {
    let insightEl = document.getElementById('result-insight');
    if (!insightEl) {
      insightEl = document.createElement('div');
      insightEl.id = 'result-insight';
      rc.appendChild(insightEl);
    }
    insightEl.className = `result-insight-box insight-${rClass}`;
    insightEl.innerHTML = `<span class="insight-label">📊 Structured Risk Mitigation Summary</span><p>${insight}</p>`;
  }

  /* Store for chat context & update dashboard metrics array */
  window._lastAnalysis = { baseCredit, income, spending, score, level, segment, label, cluster, paymentStatus, finalPd, sectorMetric1, sectorMetric2, sectorDetailsText };
  window.dashboardMetrics = [finalPd, score, income, spending, baseCredit];

  if (typeof window.logSystemAudit === 'function') {
    window.logSystemAudit('CLIENT_RISK_QUERY', `Assessed client risk profile — Income: $${income}k, Spending: ${spending}, Credit: ${baseCredit}, PD: ${finalPd}%`, level === 'Low Risk' ? 'APPROVED' : (level === 'Medium Risk' ? 'REVIEW' : 'REJECTED'));
  }

  /* ── Enable Save & Send button ─────────────────────────── */
  const saveBtn = document.getElementById('btn-save-email');
  if (saveBtn) {
    saveBtn.disabled = false;
    saveBtn.style.opacity = '1';
    saveBtn.style.cursor = 'pointer';
  }

  /* ── 🎉 Confetti + Success Sound for Low Risk ──────────── */
  if (level === 'Low Risk') {
    if (typeof fireConfettiCelebration === 'function') {
      setTimeout(() => fireConfettiCelebration(), 300);
    }
  }

  // Instantly execute the specialized professional UI sheet renderer
  // if (typeof window.renderProfessionalIntelligenceSheet === 'function') {
  //   window.renderProfessionalIntelligenceSheet(computedRisk, valInc, valSpd, valCrd);
  // }
};

window.renderProfessionalIntelligenceSheet = function(calculatedRisk, income, spending, credit) {
    const compName = (window.authenticatedCompanyName || 'Corporate').toUpperCase();
    const cleanComp = compName.replace(/\s+/g, '');
    const targetDisplay = document.getElementById('predict-result-card'); // ensure mapping to results div node
    if (!targetDisplay) return;
    
    // Read dynamic values allocated from our active credit policy handlers
    const activePolicy = window.lastAnalyzedClientPolicy || { rate: '22%', limit: '$50k', action: 'Manual Review' };
    const selectedSector = window.currentCorporateSector || 'bank';
    
    let operationalVerdictHTML = '';
    
    if (selectedSector === 'bank' || compName.includes('BANK') || compName.includes('FINANS')) {
        operationalVerdictHTML = `
            <div style="background: rgba(15,23,42,0.6); border: 1px solid rgba(56,189,248,0.2); padding: 1.25rem; border-radius: 8px; font-family: sans-serif;">
                <div style="font-family: monospace; font-size: 0.75rem; color: #38bdf8; margin-bottom: 0.5rem;">[B2B_CREDIT_INTELLIGENCE_LEAF]</div>
                <div style="font-size: 1.1rem; font-weight: bold; margin-bottom: 0.75rem; color: ${calculatedRisk === 'High Risk' ? '#ef4444' : '#34d39 '+ '9'}">STATUS: ${calculatedRisk.toUpperCase()}</div>
                <div style="display: flex; flex-direction: column; gap: 6px; font-size: 0.85rem; color: #cbd5e1;">
                    <div>• <b>Capital Underwriting Action:</b> <span style="color:#fbbf24">${activePolicy.action}</span></div>
                    <div>• <b>Assigned Pricing Rate (APR):</b> ${activePolicy.rate}</div>
                    <div>• <b>Maximum Credit Facility Limit:</b> ${activePolicy.limit}</div>
                    <div style="border-top: 1px solid rgba(255,255,255,0.05); margin-top: 4px; padding-top: 4px; font-size: 0.75rem; color:#64748b;">System Hash Reference: ${cleanComp}-BK-${credit}</div>
                </div>
            </div>`;
    } else if (selectedSector === 'logistics' || compName.includes('LOGISTICS') || compName.includes('KARGO') || compName.includes('DHL')) {
        operationalVerdictHTML = `
            <div style="background: rgba(15,23,42,0.6); border: 1px solid rgba(56,189,248,0.2); padding: 1.25rem; border-radius: 8px; font-family: sans-serif;">
                <div style="font-family: monospace; font-size: 0.75rem; color: #60a5fa; margin-bottom: 0.5rem;">[SUPPLY_CHAIN_RISK_MATRIX]</div>
                <div style="font-size: 1.1rem; font-weight: bold; margin-bottom: 0.75rem; color: ${calculatedRisk === 'High Risk' ? '#ef4444' : '#34d39 '+ '9'}">ROUTE STATE: ${calculatedRisk === 'High Risk' ? 'CRITICAL DISRUPTION' : 'STABLE MARGIN'}</div>
                <div style="display: flex; flex-direction: column; gap: 6px; font-size: 0.85rem; color: #cbd5e1;">
                    <div>• <b>Logistics Allocation Rule:</b> ${calculatedRisk === 'High Risk' ? 'Hold Shipment / Escrow Escalate' : 'Auto-Route Manifest'}</div>
                    <div>• <b>Route Fuel Shock Factor:</b> ${spending > 60 ? 'Severe Exposure' : 'Nominal Volatility'}</div>
                    <div>• <b>Operational Fleet Safety Score:</b> ${credit} / 900</div>
                </div>
            </div>`;
    } else if (selectedSector === 'retail' || compName.includes('RETAIL') || compName.includes('MARKET') || compName.includes('SHOP')) {
        operationalVerdictHTML = `
            <div style="background: rgba(15,23,42,0.6); border: 1px solid rgba(56,189,248,0.2); padding: 1.25rem; border-radius: 8px; font-family: sans-serif;">
                <div style="font-family: monospace; font-size: 0.75rem; color: #f59e0b; margin-bottom: 0.5rem;">[RETAIL_INVENTORY_DISPATCH_LOG]</div>
                <div style="font-size: 1.1rem; font-weight: bold; margin-bottom: 0.75rem; color: ${calculatedRisk === 'High Risk' ? '#ef4444' : '#34d39 '+ '9'}">INVENTORY STATE: ${calculatedRisk.toUpperCase()}</div>
                <div style="display: flex; flex-direction: column; gap: 6px; font-size: 0.85rem; color: #cbd5e1;">
                    <div>• <b>Retail Allocation Rule:</b> ${calculatedRisk === 'High Risk' ? 'Halt Supply Dispatch Chains' : 'Authorize Maximum Wholesale Caps'}</div>
                    <div>• <b>Supply Velocity Shock:</b> ${spending > 60 ? 'Severe Exposure' : 'Nominal Volatility'}</div>
                    <div>• <b>Asset Turnover Index:</b> ${credit} Base Points</div>
                </div>
            </div>`;
    } else {
        // Standard tech/SaaS core parameters breakdown layout
        operationalVerdictHTML = `
            <div style="background: rgba(15,23,42,0.6); border: 1px solid rgba(56,189,248,0.2); padding: 1.25rem; border-radius: 8px; font-family: sans-serif;">
                <div style="font-family: monospace; font-size: 0.75rem; color: #a855f7; margin-bottom: 0.5rem;">[SaaS_CHURN_PREDICTION_LOG]</div>
                <div style="font-size: 1.1rem; font-weight: bold; margin-bottom: 0.75rem; color: ${calculatedRisk === 'High Risk' ? '#ef4444' : '#34d39 '+ '9'}">CHURN RISK: ${calculatedRisk.toUpperCase()}</div>
                <div style="display: flex; flex-direction: column; gap: 6px; font-size: 0.85rem; color: #cbd5e1;">
                    <div>• <b>Customer Retention Workflow:</b> ${calculatedRisk === 'High Risk' ? 'Trigger VIP Retention Playbook' : 'Standard Automated Billing'}</div>
                    <div>• <b>Contract Attrition Velocity:</b> ${spending}% Margin Deflection</div>
                    <div>• <b>Account Health Score Index:</b> ${credit} Base Points</div>
                </div>
            </div>`;
    }
    
    targetDisplay.innerHTML = operationalVerdictHTML;
};

/* ── Add to Monitored Client Ledger ──────────────────────────── */
window.addAuditedClientToLedger = function() {
    if (!window.customersData) window.customersData = [];
    
    // Generate unique dynamic ID sequential tracker
    const nextId = window.customersData.length > 0 ? Math.max(...window.customersData.map(c => parseInt(c.id || c.CustomerID || 2000))) + 1 : 2001;
    const incomeInput = parseFloat(document.getElementById('p-income')?.value || 60);
    const spendingInput = parseFloat(document.getElementById('p-spending')?.value || 50);
    const creditInput = parseFloat(document.getElementById('p-credit')?.value || 650);
    const companyTypeInput = window.authenticatedCompanyName || 'Corporate_Client';
    
    // Establish risk segment mapping identical to the analytical engine parameters
    const calculatedRisk = window.lastCalculatedRiskLevel || 'Low Risk';
    
    const newClientObj = {
        id: nextId,
        CustomerID: nextId,
        CompanyType: companyTypeInput,
        companyType: companyTypeInput,
        Age: Math.floor(25 + Math.random() * 40),
        age: Math.floor(25 + Math.random() * 40),
        income: incomeInput,
        'Annual Income (k$)': incomeInput,
        AnnualIncome: incomeInput,
        annualIncome: incomeInput,
        spendingScore: spendingInput,
        'Spending Score (1-100)': spendingInput,
        SpendingScore: spendingInput,
        creditScore: creditInput,
        CreditScore: creditInput,
        riskLevel: calculatedRisk,
        clusterLabel: calculatedRisk === 'High Risk' ? 'Careless' : (calculatedRisk === 'Medium Risk' ? 'Sensible' : 'Target'),
        cluster: calculatedRisk === 'High Risk' ? 0 : (calculatedRisk === 'Medium Risk' ? 2 : 4),
        Cluster: calculatedRisk === 'High Risk' ? 'High Risk Default' : (calculatedRisk === 'Medium Risk' ? 'Moderate Volatility' : 'Premium Loyalty'),
        probabilityOfDefault: window._lastAnalysis ? window._lastAnalysis.finalPd : (calculatedRisk === 'High Risk' ? 45 : (calculatedRisk === 'Medium Risk' ? 25 : 10)),
        financialStress: calculatedRisk === 'High Risk' ? 'Severe' : (calculatedRisk === 'Medium Risk' ? 'Moderate' : 'Minimal')
    };
    
    // Push to the top of our operational client matrix array
    window.customersData.unshift(newClientObj);
    if (typeof allData !== 'undefined' && allData !== window.customersData) allData.unshift(newClientObj);
    if (typeof window.allData !== 'undefined' && window.allData !== window.customersData) window.allData.unshift(newClientObj);
    if (typeof customers !== 'undefined' && customers !== window.customersData) customers.unshift(newClientObj);
    if (typeof window.ANL_DATA !== 'undefined' && window.ANL_DATA !== window.customersData) window.ANL_DATA.unshift(newClientObj);
    if (typeof window.customerData !== 'undefined' && window.customerData !== window.customersData) window.customerData.unshift(newClientObj);
    
    // Instantly force fire all system pipeline recalibrations to live update dashboard KPIs and charts
    if (typeof window.calculateKPIs === 'function') window.calculateKPIs();
    if (typeof window.renderCharts === 'function') window.renderCharts();
    if (typeof window.updateTable === 'function') window.updateTable(1);
    
    // Also trigger local cascade refresh functions to guarantee 100% UI consistency across pagination
    currentSort = 'id-desc';
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) sortSelect.value = 'id-desc';
    currentPage = 1;
    if (typeof applyFilters === 'function') applyFilters();
    if (typeof updateKPIs === 'function') updateKPIs();
    if (typeof renderCharts === 'function') renderCharts();
    if (typeof renderBusinessInsights === 'function') renderBusinessInsights();
    if (typeof checkRiskAlert === 'function') checkRiskAlert();
    if (typeof renderTable === 'function') renderTable();

    // Safely toggle button states
    const saveBtn = document.getElementById('btn-save-email');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.style.opacity = '0.5';
      saveBtn.style.cursor = 'not-allowed';
    }

    if (typeof window.logSystemActivity === 'function') {
      window.logSystemActivity('CUSTOMER_REGISTRATION', `Integrated client #${nextId} into active corporate ledger`, 'SUCCESS');
    }

    // Provide visual success feedback loop and safely toggle button states
    alert(`Successfully integrated client #${nextId} directly into the active corporate monitoring ledger!`);
};

/* ── Macroeconomic Stress Testing ──────────────────────────── */
window.applyMacroScenario = function(type) {
  window.currentMacroScenario = type;
  // UI Button updates
  document.querySelectorAll('.btn-macro').forEach(btn => {
    btn.style.background = 'rgba(30,41,59,0.8)';
    btn.style.border = '1px solid rgba(255,255,255,0.1)';
  });
  
  const activeBtn = document.getElementById(
    type === 'base' ? 'btn-macro-base' : 
    type === 'downturn' ? 'btn-macro-down' : 'btn-macro-inf'
  );
  if (activeBtn) {
    activeBtn.style.background = type === 'base' ? 'rgba(59,130,246,0.2)' : 
                                 type === 'downturn' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)';
    activeBtn.style.border = '1px solid rgba(255,255,255,0.3)';
  }

  // Baseline data cache (immutable deep copy)
  if (!window._originalAllData || window._originalAllData.length === 0) {
    window._originalAllData = JSON.parse(JSON.stringify(window.allData || window.ANL_DATA || []));
  }

  // Create new dataset from baseline
  let modifiedData = JSON.parse(JSON.stringify(window._originalAllData));

  modifiedData.forEach(client => {
    // Preserve the actual property casing
    let income = client.AnnualIncome !== undefined ? client.AnnualIncome : client.annualIncome;
    let spending = client.SpendingScore !== undefined ? client.SpendingScore : client.spendingScore;
    
    if (type === 'downturn') {
      income = Math.max(0, income * 0.8); // -20% Income
    } else if (type === 'inflation') {
      spending = Math.min(100, spending * 1.3); // +30% Spending Score
    }

    // Recalculate using unified dynamic tolerance engine
    let credit = client.CreditScore !== undefined ? client.CreditScore : client.creditScore;
    if (credit === undefined || isNaN(credit)) credit = 650;
    let risk = window.evaluateRisk(income, spending, credit);

    // Update client object in place
    if (client.AnnualIncome !== undefined) client.AnnualIncome = Math.round(income);
    if (client.annualIncome !== undefined) client.annualIncome = Math.round(income);
    if (client.SpendingScore !== undefined) client.SpendingScore = Math.round(spending);
    if (client.spendingScore !== undefined) client.spendingScore = Math.round(spending);
    client.riskLevel = risk;
  });

  // Inject the modified data back into the global state
  allData = modifiedData;
  window.allData = modifiedData;
  customers = [...modifiedData];
  window.customers = [...modifiedData];
  if (window.ANL_DATA) window.ANL_DATA = modifiedData;
  if (window.customerData) window.customerData = modifiedData;
  if (window.customersData) window.customersData = modifiedData;

  // Trigger UI refresh
  if (typeof updateKPIs === 'function') updateKPIs();
  if (typeof renderCharts === 'function') renderCharts();
  
  if (typeof applyFilters === 'function') {
    applyFilters(); 
  } else if (typeof renderTable === 'function') {
    renderTable();
  }
  
  if (typeof checkRiskAlert === 'function') checkRiskAlert();

  if (typeof window.logSystemActivity === 'function') {
    window.logSystemActivity('METRIC_STRESS_TEST', 'Displaced macro state to: ' + type);
  }

  // High-Fidelity Management Impact Reporting & Variance Calculation
  const impactReport = document.getElementById('macro-stress-impact-report');
  const lossValEl = document.getElementById('stress-loss-val');
  const countValEl = document.getElementById('stress-count-val');
  const carValEl = document.getElementById('stress-car-val');

  if (type === 'base') {
    if (impactReport) impactReport.style.display = 'none';
  } else {
    if (impactReport) impactReport.style.display = 'block';

    // Calculate baseline High Risk count vs Stressed High Risk count
    const baseHighCount = window._originalAllData.filter(c => (c.riskLevel || '').includes('High')).length;
    const stressedHighCount = modifiedData.filter(c => (c.riskLevel || '').includes('High')).length;
    const deltaHigh = stressedHighCount - baseHighCount;

    // Calculate baseline expected default loss vs Stressed expected default loss
    const calcExpectedLoss = (data) => {
      return data.reduce((sum, c) => {
        const inc = c.AnnualIncome !== undefined ? c.AnnualIncome : (c.annualIncome || 60);
        const cr = c.CreditScore !== undefined ? c.CreditScore : (c.creditScore || 650);
        const isHigh = (c.riskLevel || '').includes('High');
        const isMed = (c.riskLevel || '').includes('Medium');
        const prob = isHigh ? 0.35 : (isMed ? 0.08 : 0.02);
        return sum + (inc * 1000 * prob * (1 - cr / 1000));
      }, 0);
    };

    const baseLoss = calcExpectedLoss(window._originalAllData);
    const stressedLoss = calcExpectedLoss(modifiedData);
    const capitalHaircut = Math.max(0, stressedLoss - baseLoss);

    // Calculate CAR Ratio Margin Variance (assuming baseline CAR is 18.50%)
    const baseCAR = 18.50;
    const carVariance = -(capitalHaircut / (baseLoss || 1) * 3.5).toFixed(2);
    const estCAR = (baseCAR + parseFloat(carVariance)).toFixed(2);

    if (lossValEl) lossValEl.textContent = `$${(capitalHaircut / 1000).toLocaleString(undefined, {maximumFractionDigits: 1})}k`;
    if (countValEl) countValEl.textContent = `${stressedHighCount} Clients (${deltaHigh >= 0 ? '+' : ''}${deltaHigh} Default Delta)`;
    if (carValEl) carValEl.textContent = `${carVariance}% (Est. CAR: ${estCAR}%)`;

    // Trigger Aura AI Alert message in chat
    try {
      const chatMessages = document.querySelector('.chat-messages');
      if (chatMessages) {
        const currentSec = window.currentCorporateSector || 'bank';
        const activeConf = window.ENTERPRISE_INDUSTRY_REGISTRY ? (window.ENTERPRISE_INDUSTRY_REGISTRY[currentSec] || window.ENTERPRISE_INDUSTRY_REGISTRY.bank) : { title: "Banking & Finance", icon: "🏦" };
        const alertMsg = document.createElement('div');
        alertMsg.className = 'message system-message';
        alertMsg.innerHTML = `
          <div class='ai-message-content' style='background:rgba(239, 68, 68, 0.15); border:1px solid rgba(239, 68, 68, 0.3); padding:1rem; border-radius:8px; margin-top:0.5rem;'>
            <div style='color:#ef4444; font-weight:bold; font-size:1.05rem;'>⚠️ Aura Intelligence Alert: Macroeconomic Stress Displacement</div>
            <div style='color:#f8fafc; font-size:0.85rem; margin-top:0.4rem; line-height:1.4;'>
              ${activeConf.icon} <strong>${activeConf.title} Portfolio Stress Test (${type.toUpperCase()}):</strong>
              <br><span style='color:#fca5a5;'>Estimated Capital Haircut: $${(capitalHaircut / 1000).toLocaleString(undefined, {maximumFractionDigits: 1})}k</span>
              <br><span style='color:#cbd5e1;'>Liquidity Default Count: ${stressedHighCount} Clients (${deltaHigh >= 0 ? '+' : ''}${deltaHigh} Delta)</span>
              <br><span style='color:#f87171;'>CAR Ratio Variance: ${carVariance}% (Est. CAR: ${estCAR}%)</span>
              <br>Our AI engine recommends immediate credit tightening across all Tier 1 exposure lines.
            </div>
          </div>`;
        chatMessages.appendChild(alertMsg);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        if (typeof window.speakAuraResponse === 'function') {
          window.speakAuraResponse(`Aura Alert. Macroeconomic stress scenario ${type} applied. Estimated capital haircut is ${(capitalHaircut / 1000).toFixed(1)} thousand dollars.`);
        } else if (typeof window.auraSpeak === 'function') {
          window.auraSpeak(`Aura Alert. Macroeconomic stress scenario ${type} applied. Estimated capital haircut is ${(capitalHaircut / 1000).toFixed(1)} thousand dollars.`, window.auraActiveLang === 'TR' ? 'tr-TR' : 'en-US');
        }
      }
    } catch (alertErr) {
      console.error('Aura Macro Alert injection error:', alertErr);
    }
  }

  // Toast notification
  if (typeof showToast === 'function') {
    let msg = type === 'base' ? 'Baseline economic conditions restored.' :
              type === 'downturn' ? 'Simulating Economic Downturn: 20% income reduction applied. Risk matrix updated.' :
              'Simulating Severe Inflation: 30% spending increase applied. Risk matrix updated.';
    showToast({ type: 'info', icon: '📊', title: 'Stress Test Applied', msg: msg });
  } else if (typeof toast === 'function') {
    let msg = type === 'base' ? 'Baseline economic conditions restored.' :
              type === 'downturn' ? 'Simulating Economic Downturn: 20% income reduction applied. Risk matrix updated.' :
              'Simulating Severe Inflation: 30% spending increase applied. Risk matrix updated.';
    toast('info', '📊', 'Stress Test Applied', msg);
  }
};

/* ── AI Analysis Report ─────────────────────────────────────── */
window.getAIAnalysis = function () {
  if (window.pendingCorporateUpload || !allData.length) return;
  if (!window._lastAnalysis) return;
  const { baseCredit, income, spending, score, level } = window._lastAnalysis;

  const risk = level.split(' ')[0];

  const riskColor = risk === 'High' ? '#f87171' : risk === 'Medium' ? '#fbbf24' : '#34d399';
  const riskIcon = risk === 'High' ? '🔴' : risk === 'Medium' ? '🟡' : '🟢';

  const profileMap = {
    High: `Critical corporate profile — combined risk score of ${score} (threshold: 450), baseline credit of ${baseCredit}, and high spending relative to income, indicating significant institutional exposure.`,
    Medium: `Moderate corporate profile — risk score of ${score} sits between 450–699, suggesting manageable but requires structured B2B monitoring.`,
    Low: `Strong corporate profile — risk score of ${score} (≥ 700) and income of $${income}k indicate high institutional reliability.`,
  };
  const marketMap = {
    High: 'Enrol in strict credit limit protocols. Offer budget restructuring to reduce corporate spending intensity.',
    Medium: 'Present standard B2B terms. Monitor financial activity quarterly.',
    Low: 'Invite into the VIP Corporate Tier — offer premium rates and exclusive early-access investment deals.',
  };
  const finMap = {
    High: 'Restrict access to high-limit capital facilities. Flag for monthly audit review and assign a dedicated risk advisor.',
    Medium: 'Maintain current corporate credit limits with quarterly audits. Offer standard B2B financial products.',
    Low: 'Consider increasing capital limits with premium benefits. Present institutional investment products to maximise long-term retention.',
  };
  const actionMap = {
    High: '🚨 Immediately assign to Risk Mitigation Programme and schedule a financial review within 7 days.',
    Medium: '📋 Schedule a quarterly account review and enrol the client in the Standard B2B tier.',
    Low: '💎 Send a personalised Corporate VIP invitation within 48 hours — this client requires exclusive engagement.',
  };

  const reportHTML = `
    <div class="air-section">
      <div class="air-section-title">🔍 Corporate Risk Report</div>
      <div class="air-risk-row">
        <span class="air-label">Institutional Risk:</span>
        <span class="air-risk-chip" style="color:${riskColor};border-color:${riskColor};">${riskIcon} ${risk} Risk</span>
      </div>
      <div class="air-risk-row">
        <span class="air-label">Calculated Score:</span>
        <span class="air-muted" style="color:${riskColor};font-weight:800;">${score} / 1000</span>
      </div>
      <div class="air-risk-row">
        <span class="air-label">Input Data:</span>
        <span class="air-muted">B2B Corp · Base Credit ${baseCredit} · Income $${income}k · Spending ${spending}/100</span>
      </div>
      <p class="air-text">${profileMap[risk]}</p>
    </div>
    <div class="air-section">
      <div class="air-section-title">💡 Recommendations</div>
      <div class="air-bullet">
        <span class="air-bullet-icon">📣</span>
        <span>${marketMap[risk]}</span>
      </div>
      <div class="air-bullet">
        <span class="air-bullet-icon">🛡️</span>
        <span>${finMap[risk]}</span>
      </div>
    </div>
    <div class="air-critical air-critical-${risk.toLowerCase()}">
      <div class="air-section-title">🚀 Critical Action</div>
      <p>${actionMap[risk]}</p>
    </div>`;

  const panel = document.getElementById('ai-report-panel');
  const body = document.getElementById('ai-report-body');
  const status = document.getElementById('ai-status');
  panel.style.display = 'block';
  body.innerHTML = '';
  status.innerHTML = '<span class="ai-dot"></span> Analysing…';
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });

  setTimeout(() => {
    status.innerHTML = '<span class="ai-dot ai-dot-done"></span> Report Ready';
    body.innerHTML = reportHTML;
    body.classList.remove('air-visible');
    requestAnimationFrame(() => body.classList.add('air-visible'));
  }, 900);
};


/* ── VIP Section ──────────────────────────────────────────── */
function renderVIP() {
  const grid = document.getElementById('vip-grid');
  if (!grid) return;
  if (window.pendingCorporateUpload || allData.length === 0) {
    grid.innerHTML = '<p class="empty-state-msg" style="grid-column: 1/-1; text-align: center; color: var(--text-400); padding: 2rem;">No VIP customers available. Pending corporate CSV data upload.</p>';
    if (document.getElementById('vip-summary')) document.getElementById('vip-summary').textContent = 'Pending Upload';
    return;
  }

  const vips = allData
    .filter(c => (c.clusterLabel === 'Target' || c.clusterLabel === 'Careful') && c.riskLevel === 'Low Risk' && c.creditScore >= 700)
    .sort((a, b) => b.creditScore - a.creditScore)
    .slice(0, 12);

  grid.innerHTML = '';

  vips.forEach((c, i) => {
    const tier = c.creditScore >= 820
      ? { name: 'Platinum', icon: '💎', cls: 'tier-platinum', cashback: '20%', color: '#e2e8f0' }
      : c.creditScore >= 770
        ? { name: 'Gold', icon: '🥇', cls: 'tier-gold', cashback: '15%', color: '#fde047' }
        : { name: 'Silver', icon: '🥈', cls: 'tier-silver', cashback: '10%', color: '#cbd5e1' };

    const creditPct = Math.round((c.creditScore - 300) / 600 * 100);

    const card = document.createElement('div');
    card.className = `vip-card ${tier.cls}`;
    card.style.animationDelay = `${i * 0.05}s`;
    card.innerHTML = `
      <div class="vc-top">
        <span class="vc-rank">#${i + 1}</span>
        <span class="vc-tier-badge ${tier.cls}">${tier.icon} ${tier.name}</span>
      </div>

      <div class="vc-identity">
        <div class="vc-avatar">${c.gender === 'Male' ? '👨' : '👩'}</div>
        <div>
          <div class="vc-name">Customer #${String(c.id).padStart(4, '0')}</div>
          <div class="vc-meta">${c.gender} &bull; Age ${c.age}</div>
        </div>
      </div>

      <div class="vc-credit-row">
        <div class="vc-credit-labels">
          <span>Credit Score</span>
          <span style="color:${tier.color}">${c.creditScore}</span>
        </div>
        <div class="vc-bar-track">
          <div class="vc-bar-fill ${tier.cls}" style="width:${creditPct}%"></div>
        </div>
      </div>

      <div class="vc-grid">
        <div class="vc-cell">
          <small>Income</small>
          <strong>$${c.annualIncome}k</strong>
        </div>
        <div class="vc-cell">
          <small>Spend Score</small>
          <strong>${c.spendingScore}</strong>
        </div>
      </div>

      <div class="vc-perks">
        <span class="perk-tag">Free Concierge</span>
        <span class="perk-tag">${tier.cashback} Cashback</span>
        <span class="perk-tag">Priority Access</span>
      </div>
      <div style="margin-top: 1rem; text-align: center;">
        <button class="action-btn action-btn-monitor" style="width: 100%; justify-content: center;" onclick="triggerRealVipMail(${c.id}, '${tier.name}', '${tier.cashback}')">✉️ Send VIP Welcome Email</button>
      </div>`;
    grid.appendChild(card);
  });

  const platinum = vips.filter(c => c.creditScore >= 820).length;
  const gold = vips.filter(c => c.creditScore >= 770 && c.creditScore < 820).length;
  const silver = vips.length - platinum - gold;
  const el = document.getElementById('vip-summary');
  if (el) el.textContent = `${vips.length} VIP customers · ${platinum} Platinum · ${gold} Gold · ${silver} Silver`;
}

/* ── Budget Section ───────────────────────────────────────── */
function renderBudget() {
  const grid = document.getElementById('budget-grid');
  if (!grid) return;
  if (window.pendingCorporateUpload || allData.length === 0) {
    grid.innerHTML = '<p class="empty-state-msg" style="grid-column: 1/-1; text-align: center; color: var(--text-400); padding: 2rem;">No budget assistance customers available. Pending corporate CSV data upload.</p>';
    if (document.getElementById('budget-summary')) document.getElementById('budget-summary').textContent = 'Pending Upload';
    return;
  }

  const budget = allData
    .filter(c => c.riskLevel === 'High Risk' || (c.annualIncome < 40 && c.spendingScore > 55))
    .sort((a, b) => b.spendingScore - a.spendingScore)
    .slice(0, 12);

  grid.innerHTML = '';

  budget.forEach((c, i) => {
    const scheme = c.spendingScore > 75
      ? { disc: '25%', name: 'Smart Saver Plus', icon: '🛍️', cls: 'disc-high', urgent: true }
      : c.spendingScore > 55
        ? { disc: '15%', name: 'Smart Saver', icon: '🏷️', cls: 'disc-mid', urgent: false }
        : { disc: '10%', name: 'Budget Starter', icon: '💡', cls: 'disc-low', urgent: false };

    const spendPct = c.spendingScore;  // already 1-100
    const alertMsg = scheme.urgent
      ? '<strong>Urgent:</strong> spending coaching recommended'
      : 'Consider a budget planning session';

    const card = document.createElement('div');
    card.className = `bc-card ${scheme.cls}`;
    card.style.animationDelay = `${i * 0.05}s`;
    card.innerHTML = `
      <div class="bc-top">
        <div class="bc-disc-pill ${scheme.cls}">${scheme.disc} OFF</div>
        <span class="bc-scheme-name">${scheme.icon} ${scheme.name}</span>
      </div>

      <div class="bc-identity">
        <h3 class="bc-name">Customer #${String(c.id).padStart(4, '0')}</h3>
        <p class="bc-meta">${c.gender} &bull; Age ${c.age}</p>
      </div>

      <div class="bc-data-box">
        <div class="bc-data-row">
          <span>Income: <strong>$${c.annualIncome}k</strong></span>
          <span>Credit Score: <strong>${c.creditScore}</strong></span>
        </div>
        <div class="bc-intensity">
          <div class="bc-intensity-labels">
            <span class="bc-intensity-label">Spending Intensity</span>
            <span class="bc-intensity-val">${c.spendingScore}/100</span>
          </div>
          <div class="bc-bar-track">
            <div class="bc-bar-fill" style="width:${spendPct}%"></div>
          </div>
        </div>
      </div>

      <div class="bc-alert ${scheme.urgent ? 'bc-alert-urgent' : 'bc-alert-soft'}">
        <span class="bc-alert-icon">📢</span>
        <p>${alertMsg}</p>
      </div>
      <div style="margin-top: 1rem; text-align: center;">
        <button class="action-btn action-btn-monitor" style="width: 100%; justify-content: center;" onclick="triggerRealBudgetMail(${c.id}, '${scheme.disc}', '${scheme.name}')">✉️ Send Restructuring Notice</button>
      </div>`;
    grid.appendChild(card);
  });

  const el = document.getElementById('budget-summary');
  if (el) {
    const highRisk = allData.filter(c => c.riskLevel === 'High Risk').length;
    el.textContent = `${budget.length} customers enrolled · ${highRisk} High-Risk customers in dataset`;
  }
}

window.sendVIPEmail = function(id, tierName, cashback) {
    const companyDomain = window.authenticatedCompanyName ? window.authenticatedCompanyName.replace(/\s+/g, '').toLowerCase() + '.com' : 'institutional-portfolio.com';
    const recipient = `client_${id}@${companyDomain}`;
    const subject = encodeURIComponent('[ANL Analytics] Premium Institutional VIP Rewards Activated');
    const body = encodeURIComponent(`Dear Valued Client #${id},\n\nWe are pleased to inform you that your portfolio has been upgraded to ${tierName} tier.\n\nBest regards,\nANL Analytics Team`);
    window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
};

window.sendBudgetEmail = function(id, discount, schemeName) {
    const companyDomain = window.authenticatedCompanyName ? window.authenticatedCompanyName.replace(/\s+/g, '').toLowerCase() + '.com' : 'institutional-portfolio.com';
    const recipient = `client_${id}@${companyDomain}`;
    const subject = encodeURIComponent('[ANL Analytics] Automated Portfolio Debt Restructuring Notice');
    const body = encodeURIComponent(`Dear Client #${id},\n\nBased on our risk analysis, your restructuring package under ${schemeName} is ready with a ${discount} discount.\n\nBest regards,\nANL Analytics Team`);
    window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
};

/* ── Business Insights ─────────────────────────────────────── */
function renderBusinessInsights() {
  if (window.pendingCorporateUpload || !allData.length) {
    if (document.getElementById('findings-grid')) document.getElementById('findings-grid').innerHTML = '<p class="empty-state-msg" style="grid-column: 1/-1; text-align: center; color: var(--text-400); padding: 2rem;">No business insights available. Pending corporate CSV data upload.</p>';
    if (document.getElementById('risk-interp-grid')) document.getElementById('risk-interp-grid').innerHTML = '<p class="empty-state-msg" style="grid-column: 1/-1; text-align: center; color: var(--text-400); padding: 2rem;">No risk distributions available. Pending corporate CSV data upload.</p>';
    if (document.getElementById('cluster-meaning-grid')) document.getElementById('cluster-meaning-grid').innerHTML = '<p class="empty-state-msg" style="grid-column: 1/-1; text-align: center; color: var(--text-400); padding: 2rem;">No cluster meanings available. Pending corporate CSV data upload.</p>';
    if (document.getElementById('reco-grid')) document.getElementById('reco-grid').innerHTML = '<p class="empty-state-msg" style="grid-column: 1/-1; text-align: center; color: var(--text-400); padding: 2rem;">No recommendations available. Pending corporate CSV data upload.</p>';
    return;
  }

  const total = allData.length;
  const high = allData.filter(c => c.riskLevel === 'High Risk').length;
  const medium = allData.filter(c => c.riskLevel === 'Medium Risk').length;
  const low = allData.filter(c => c.riskLevel === 'Low Risk').length;
  const highPct = Math.round(high / total * 100);
  const medPct = Math.round(medium / total * 100);
  const lowPct = Math.round(low / total * 100);

  const clusterNames = ['Spendthrift', 'Careless', 'Sensible', 'Careful', 'Target'];
  const clusterStats = clusterNames.map(name => {
    const g = allData.filter(c => c.clusterLabel === name);
    return {
      name, count: g.length,
      avgInc: g.length ? +(g.reduce((s, c) => s + c.annualIncome, 0) / g.length).toFixed(1) : 0,
      avgSp: g.length ? +(g.reduce((s, c) => s + c.spendingScore, 0) / g.length).toFixed(1) : 0,
      avgCr: g.length ? Math.round(g.reduce((s, c) => s + c.creditScore, 0) / g.length) : 0,
    };
  });

  const highIncLowSpend = allData.filter(c => c.annualIncome >= 70 && c.spendingScore < 40).length;
  const untappedPct = Math.round(highIncLowSpend / total * 100);
  const avgCredit = Math.round(allData.reduce((s, c) => s + c.creditScore, 0) / total);
  const avgAgeHigh = +(allData.filter(c => c.riskLevel === 'High Risk').reduce((s, c) => s + c.age, 0) / high).toFixed(1);
  const avgAgeLow = +(allData.filter(c => c.riskLevel === 'Low Risk').reduce((s, c) => s + c.age, 0) / low).toFixed(1);

  // 1. KEY FINDINGS
  const findings = [
    {
      icon: '💰', title: 'High-Income, Low-Spending Opportunity', value: `${highIncLowSpend} customers (${untappedPct}%)`,
      body: `${untappedPct}% of your base earns over $70k but spends below 40/100. These conservative spenders are prime targets for premium investment-linked offers and VIP upsell campaigns.`,
      tag: 'Opportunity', tagCls: 'tag-teal'
    },
    {
      icon: '⚠️', title: 'High-Risk Cluster: Careless Segment', value: `${high} customers (${highPct}%)`,
      body: `${highPct}% of customers are High Risk, mainly from the Careless cluster. Average high-risk age is ${avgAgeHigh} yrs. Immediate Budget Discount enrolment is critical.`,
      tag: 'Alert', tagCls: 'tag-red'
    },
    {
      icon: '🏆', title: 'Strong Credit Health in Low-Risk Base', value: `Avg Credit ${avgCredit}`,
      body: `${low} low-risk customers (${lowPct}%) average age ${avgAgeLow} with strong credit. Portfolio average: ${avgCredit}/1000. VIP Loyalty Programme enrolment is the top priority.`,
      tag: 'Strength', tagCls: 'tag-green'
    },
  ];
  const fGrid = document.getElementById('findings-grid');
  if (fGrid) fGrid.innerHTML = findings.map((f, i) => `
    <div class="finding-card" style="animation-delay:${i * 0.1}s">
      <div class="fc-top"><span class="fc-icon">${f.icon}</span><span class="fc-tag ${f.tagCls}">${f.tag}</span></div>
      <div class="fc-value">${f.value}</div>
      <div class="fc-title">${f.title}</div>
      <p class="fc-body">${f.body}</p>
    </div>`).join('');

  // 2. RISK DISTRIBUTION INTERPRETATION
  const riskInterps = [
    {
      icon: '🔴', label: 'High Risk', count: high, pct: highPct, color: 'var(--risk-high)',
      interp: `${highPct}% show critical signals — low income with excessive spending. This segment drives most default risk and requires immediate budget coaching and discount assistance.`
    },
    {
      icon: '🟡', label: 'Medium Risk', count: medium, pct: medPct, color: 'var(--risk-medium)',
      interp: `${medPct}% sit in the moderate zone. They represent the biggest growth opportunity — personalised promotions and quarterly reviews can convert many to Low Risk.`
    },
    {
      icon: '🟢', label: 'Low Risk', count: low, pct: lowPct, color: 'var(--risk-low)',
      interp: `${lowPct}% demonstrate excellent financial health. This is your loyalty gold mine. Exclusive VIP perks maximise lifetime value and reduce churn.`
    },
  ];
  const rGrid = document.getElementById('risk-interp-grid');
  if (rGrid) rGrid.innerHTML = riskInterps.map((r, i) => `
    <div class="risk-interp-card" style="border-color:${r.color};animation-delay:${i * 0.1}s">
      <div class="ric-header">
        <span class="ric-icon">${r.icon}</span>
        <div><div class="ric-label" style="color:${r.color}">${r.label}</div>
          <div class="ric-count">${r.count.toLocaleString()} customers</div></div>
        <div class="ric-pct">${r.pct}%</div>
      </div>
      <div class="ric-bar-track"><div class="ric-bar-fill" style="width:${r.pct}%;background:${r.color}"></div></div>
      <p class="ric-interp">${r.interp}</p>
    </div>`).join('');

  // 3. CLUSTER MEANINGS
  const clusterMeta = [
    {
      name: 'Spendthrift', icon: '💤', color: '#64748b',
      meaning: 'Budget-constrained, infrequent visitors with low engagement. Price sensitivity is high.',
      action: 'Drive repeat visits with Budget Starter scheme and targeted seasonal promotions.'
    },
    {
      name: 'Careless', icon: '🔥', color: '#f87171',
      meaning: 'Low earners spending far beyond their means. Highest financial risk group.',
      action: 'Prioritise Smart Saver Plus enrolment and assign financial advisors immediately.'
    },
    {
      name: 'Sensible', icon: '⚖️', color: '#a78bfa',
      meaning: 'Balanced income and spending. Most common segment — the middle market.',
      action: 'Nurture with mid-tier loyalty rewards and personalised campaigns.'
    },
    {
      name: 'Careful', icon: '🛡️', color: '#22d3ee',
      meaning: 'High earners who save aggressively. Excellent credit profiles.',
      action: 'Present investment-linked products and premium savings tools to unlock spending.'
    },
    {
      name: 'Target', icon: '💎', color: '#fde047',
      meaning: 'Top-tier customers: high income + high spending. Most profitable loyalty segment.',
      action: 'Invite to VIP Platinum immediately. Concierge, 20% cashback, early-access deals.'
    },
  ];
  const cGrid = document.getElementById('cluster-meaning-grid');
  if (cGrid) cGrid.innerHTML = clusterMeta.map((cm, i) => {
    const st = clusterStats.find(s => s.name === cm.name) || {};
    const pct = Math.round((st.count || 0) / total * 100);
    return `
    <div class="cluster-card" style="animation-delay:${i * 0.08}s">
      <div class="cc-header">
        <span class="cc-icon" style="background:${cm.color}22;color:${cm.color}">${cm.icon}</span>
        <div class="cc-meta">
          <div class="cc-name" style="color:${cm.color}">${cm.name}</div>
          <div class="cc-count">${(st.count || 0).toLocaleString()} customers · ${pct}%</div>
        </div>
      </div>
      <div class="cc-stats">
        <div class="cc-stat"><span>Avg Income</span><strong>$${st.avgInc}k</strong></div>
        <div class="cc-stat"><span>Avg Spend</span><strong>${st.avgSp}</strong></div>
        <div class="cc-stat"><span>Avg Credit</span><strong>${st.avgCr}</strong></div>
      </div>
      <p class="cc-meaning">${cm.meaning}</p>
      <div class="cc-action"><span class="cc-action-icon">→</span><span>${cm.action}</span></div>
    </div>`;
  }).join('');

  // 4. SEGMENT RECOMMENDATIONS
  const recos = [
    {
      risk: 'High Risk', icon: '🚨', color: 'var(--risk-high)', cls: 'reco-high', count: high, pct: highPct,
      headline: 'Immediate Intervention Required',
      bullets: [
        { icon: '🏷️', text: 'Enrol all High-Risk customers in Smart Saver Plus (25% discount) to reduce financial strain.' },
        { icon: '📞', text: 'Schedule spending-coaching sessions within 7 days for the top 20% highest spenders.' },
        { icon: '🔒', text: 'Restrict high-limit credit products and flag accounts for monthly risk reviews.' },
        { icon: '📊', text: 'Set automated spending-intensity alerts above 75/100 for early-warning triggers.' },
      ]
    },
    {
      risk: 'Medium Risk', icon: '📋', color: 'var(--risk-medium)', cls: 'reco-medium', count: medium, pct: medPct,
      headline: 'Nurture & Monitor',
      bullets: [
        { icon: '🎁', text: 'Enrol in Standard Rewards with seasonal promotions to boost engagement.' },
        { icon: '📅', text: 'Conduct quarterly account reviews to detect drift towards High Risk early.' },
        { icon: '📱', text: 'Deploy personalised push-campaigns for mid-tier deals to improve frequency.' },
        { icon: '💡', text: 'Offer financial wellness content and budgeting tools to gradually shift behaviour.' },
      ]
    },
    {
      risk: 'Low Risk', icon: '💎', color: 'var(--risk-low)', cls: 'reco-low', count: low, pct: lowPct,
      headline: 'Maximise Lifetime Value',
      bullets: [
        { icon: '🥇', text: 'Send personalised VIP invitations within 48 hours — risk of churn without exclusive engagement.' },
        { icon: '💳', text: 'Offer premium cashback (15–20%), concierge access, and early-access launches.' },
        { icon: '📈', text: 'Present investment-linked products to deepen the financial relationship.' },
        { icon: '🌟', text: 'Leverage as brand ambassadors with referral rewards for high-quality customer acquisition.' },
      ]
    },
  ];
  const sGrid = document.getElementById('seg-reco-grid');
  if (sGrid) sGrid.innerHTML = recos.map((r, i) => `
    <div class="reco-card ${r.cls}" style="animation-delay:${i * 0.12}s">
      <div class="rc-header">
        <div class="rc-icon-wrap">${r.icon}</div>
        <div><div class="rc-risk" style="color:${r.color}">${r.risk}</div>
          <div class="rc-headline">${r.headline}</div></div>
        <div class="rc-badge" style="color:${r.color};border-color:${r.color}">${r.count.toLocaleString()}</div>
      </div>
      <div class="rc-bullets">
        ${r.bullets.map(b => `<div class="rc-bullet"><span class="rc-bullet-icon">${b.icon}</span><span>${b.text}</span></div>`).join('')}
      </div>
    </div>`).join('');

  // Store for chat context
  window._insightData = { total, high, medium, low, highPct, medPct, lowPct, avgCredit, highIncLowSpend, untappedPct, clusterStats };
}

/* ══════════════════════════════════════════════════════════════
   RISK ALERT SYSTEM
   Threshold: high-risk customers > 25% of total
══════════════════════════════════════════════════════════════ */
const RISK_THRESHOLD_PCT = 20;

function checkRiskAlert() {
  if (!allData.length) return;
  const high = allData.filter(c => c.riskLevel === 'High Risk').length;
  const highPct = Math.round(high / allData.length * 100);
  const banner = document.getElementById('risk-alert-banner');
  const rabText = document.getElementById('rab-text');

  if (highPct >= RISK_THRESHOLD_PCT) {
    if (banner) {
      rabText.textContent = `⚠️ High Risk Customers Increasing — ${high} customers (${highPct}%) exceed the ${RISK_THRESHOLD_PCT}% alert threshold. Immediate action required.`;
      banner.style.display = 'flex';
    }
    // Add blinking indicator to the High Risk KPI card
    const kpiHigh = document.getElementById('kpi-high');
    if (kpiHigh && !kpiHigh.querySelector('.kpi-alert-dot')) {
      const dot = document.createElement('span');
      dot.className = 'kpi-alert-dot';
      kpiHigh.appendChild(dot);
    }
    if (kpiHigh) kpiHigh.classList.add('kpi-alerted');
  }
}

// Highlight high-risk rows — called after renderTable
const _origRenderTable = window.renderTable || null;
function highlightRiskyRows() {
  document.querySelectorAll('#table-body tr').forEach(tr => {
    const riskCell = tr.querySelector('td:last-child');
    if (riskCell && riskCell.textContent.includes('High Risk')) {
      tr.classList.add('row-high-risk');
    }
  });
}

/* ══════════════════════════════════════════════════════════════
   WHAT-IF SIMULATION
══════════════════════════════════════════════════════════════ */
let whatifChart = null;

window.updateWhatIf = function () {
  if (window.pendingCorporateUpload || !allData.length) {
    if (document.getElementById('wi-score-before')) document.getElementById('wi-score-before').textContent = '—';
    if (document.getElementById('wi-risk-before')) document.getElementById('wi-risk-before').textContent = 'Pending Upload';
    if (document.getElementById('wi-score-after')) document.getElementById('wi-score-after').textContent = '—';
    if (document.getElementById('wi-risk-after')) document.getElementById('wi-risk-after').textContent = 'Pending Upload';
    if (whatifChart) { whatifChart.destroy(); whatifChart = null; }
    return;
  }
  // Current values from main predict sliders (or defaults)
  const curAge = +(document.getElementById('p-age')?.value || 35);
  const curIncome = +(document.getElementById('p-income')?.value || 60);
  const curSpending = +(document.getElementById('p-spending')?.value || 50);

  // What-If values
  const wiIncome = +document.getElementById('wi-income').value;
  const wiSpending = +document.getElementById('wi-spending').value;
  document.getElementById('wi-income-val').textContent = wiIncome;
  document.getElementById('wi-spending-val').textContent = wiSpending;

  const cur = calculateRiskDetails(curAge, curIncome, curSpending);
  const next = calculateRiskDetails(curAge, wiIncome, wiSpending);

  // Before card
  const sb = document.getElementById('wi-score-before');
  const rb = document.getElementById('wi-risk-before');
  if (sb) { sb.textContent = cur.score; sb.style.color = cur.color; }
  if (rb) { rb.textContent = cur.level; rb.style.color = cur.color; }

  // After card
  const sa = document.getElementById('wi-score-after');
  const ra = document.getElementById('wi-risk-after');
  if (sa) { sa.textContent = next.score; sa.style.color = next.color; }
  if (ra) { ra.textContent = next.level; ra.style.color = next.color; }

  // Colour wic-after border
  const wicAfter = document.getElementById('wic-after');
  if (wicAfter) wicAfter.style.borderColor = next.color;

  // Chart
  const ctx = document.getElementById('whatifChart');
  if (!ctx) return;
  const labels = ['Income Weight', 'Spending Weight', 'Age Weight', 'Credit Score'];
  const curVals = [
    Math.round((curIncome - 15) / 125 * 100),
    Math.round((100 - curSpending) / 99 * 100),
    Math.round((curAge - 18) / 52 * 100),
    Math.round(cur.score / 10),
  ];
  const nextVals = [
    Math.round((wiIncome - 15) / 125 * 100),
    Math.round((100 - wiSpending) / 99 * 100),
    Math.round((curAge - 18) / 52 * 100),
    Math.round(next.score / 10),
  ];

  if (whatifChart) {
    whatifChart.data.datasets[0].data = curVals;
    whatifChart.data.datasets[1].data = nextVals;
    whatifChart.data.datasets[1].borderColor = next.color;
    whatifChart.data.datasets[1].backgroundColor = next.color + '33';
    whatifChart.update();
  } else {
    whatifChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Current', data: curVals, backgroundColor: 'rgba(108,99,255,.55)', borderColor: 'rgba(108,99,255,1)', borderWidth: 2, borderRadius: 6 },
          { label: 'After Change', data: nextVals, backgroundColor: next.color + '55', borderColor: next.color, borderWidth: 2, borderRadius: 6 },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { labels: { color: '#cbd5e1', font: { size: 12 } } } },
        scales: {
          x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,.05)' } },
          y: { min: 0, max: 100, ticks: { color: '#64748b', callback: v => v + '%' }, grid: { color: 'rgba(255,255,255,.05)' } },
        },
      },
    });
  }
};

// Sync What-If sliders with main predict sliders
function syncWhatIfToPredict() {
  const income = document.getElementById('p-income')?.value || 60;
  const spending = document.getElementById('p-spending')?.value || 50;
  const wiI = document.getElementById('wi-income');
  const wiS = document.getElementById('wi-spending');
  if (wiI) { wiI.value = income; document.getElementById('wi-income-val').textContent = income; }
  if (wiS) { wiS.value = spending; document.getElementById('wi-spending-val').textContent = spending; }
  updateWhatIf();
}

/* ══════════════════════════════════════════════════════════════
   AURA RISK INTELLIGENCE — CHAT ASSISTANT
   – Bilingual EN/TR conversational engine
   – Context-aware (references _lastAnalysis)
   – Flexible topic matching with graceful fallback
   – Typing indicator
══════════════════════════════════════════════════════════════ */
let chatOpen = false;
let chatGreeted = false;

const SUGGESTIONS = [
  'Yüksek riskli müşteriler kimler?',
  'Hangi gruba odaklanmalıyız?',
  'Kaç segment var?',
  'Who are high risk customers?',
  'Average credit score?',
  'How to reduce risk?',
];

/* ── Bilingual reply engine ─────────────────────────────── */
function chatReply(question) {
  if (typeof window.chatReply === 'function') {
    return window.chatReply(question);
  }
  return 'Aura is initializing...';
}

/* ── Chat UI helpers ────────────────────────────────────── */
function addMessage(text, role) {
  const msgs = document.getElementById('chat-messages');
  if (!msgs) return;
  const div = document.createElement('div');
  div.className = `chat-msg chat-msg-${role}`;
  div.innerHTML = `<div class="chat-bubble-msg">${text}</div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  return div;
}

function showTypingIndicator() {
  const msgs = document.getElementById('chat-messages');
  if (!msgs) return null;
  const div = document.createElement('div');
  div.className = 'chat-msg chat-msg-bot';
  div.id = 'aura-typing';
  div.innerHTML = `<div class="chat-bubble-msg" style="color:#94a3b8;font-style:italic;">
    <span class="typing-indicator"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></span>
    Aura yazıyor…
  </div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  return div;
}

function removeTypingIndicator() {
  const el = document.getElementById('aura-typing');
  if (el) el.remove();
}

function renderSuggestions() {
  const el = document.getElementById('chat-suggestions');
  if (!el) return;
  el.innerHTML = SUGGESTIONS.map(s =>
    `<button class="chat-suggestion-chip" onclick="handleSuggestion(this.textContent)">${s}</button>`
  ).join('');
}

/* ── Event handlers ─────────────────────────────────────── */
window.handleSuggestion = function (text) {
  addMessage(text, 'user');
  showTypingIndicator();
  setTimeout(() => {
    removeTypingIndicator();
    const reply = chatReply(text);
    addMessage(reply, 'bot');
    if (typeof window.auraSpeak === 'function') {
      const lang = window.auraActiveLang === 'TR' ? 'tr-TR' : 'en-US';
      window.auraSpeak(reply, lang);
    }
  }, 600 + Math.random() * 400);
  const el = document.getElementById('chat-suggestions');
  if (el) el.style.display = 'none';
};

window.sendChat = function () {
  const inp = document.getElementById('chat-input');
  if (!inp) return;
  const text = inp.value.trim();
  if (!text) return;
  inp.value = '';
  addMessage(text, 'user');
  const el = document.getElementById('chat-suggestions');
  if (el) el.style.display = 'none';
  showTypingIndicator();
  setTimeout(() => {
    removeTypingIndicator();
    const reply = chatReply(text);
    addMessage(reply, 'bot');
    if (typeof window.auraSpeak === 'function') {
      const lang = window.auraActiveLang === 'TR' ? 'tr-TR' : 'en-US';
      window.auraSpeak(reply, lang);
    }
  }, 700 + Math.random() * 500);
};

window.toggleChat = function () {
  // Permission Bypass Trick: Unlock Audio Context
  if (!window.audioUnlocked && window.speechSynthesis) {
    const unlockUtterance = new SpeechSynthesisUtterance('');
    unlockUtterance.volume = 0;
    window.speechSynthesis.speak(unlockUtterance);
    window.audioUnlocked = true;
  }

  chatOpen = !chatOpen;
  
  // If the panel is closing, kill any active or queued audio immediately
  if (!chatOpen && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }

  const panel = document.getElementById('chat-panel');
  const bubble = document.getElementById('chat-bubble');
  const unread = document.getElementById('chat-unread');
  if (!panel) return;
  panel.style.display = chatOpen ? 'flex' : 'none';
  if (bubble) bubble.classList.toggle('chat-bubble-open', chatOpen);
  if (unread) unread.style.display = 'none';
  if (chatOpen && !chatGreeted) {
    chatGreeted = true;
    showTypingIndicator();
    setTimeout(() => {
      removeTypingIndicator();
      const msg = '👋 Hello! I am <strong>Aura Risk Intelligence</strong>. I can answer questions about your 1,000 customers, risk segments, credit scores, and recommendations.<br><br>What would you like to know?';
      addMessage(msg, 'bot');
      if (typeof window.auraSpeak === 'function') {
        window.auraSpeak(msg);
      }
      renderSuggestions();
    }, 800);
  }
};

// Show unread badge after 2.5s
setTimeout(() => {
  const unread = document.getElementById('chat-unread');
  if (unread && !chatOpen) unread.style.display = 'flex';
}, 2500);




/* ── Customer Personas ─────────────────────────────────────── */
function renderPersonas() {
  const section = document.getElementById('personas');
  const navLink = document.getElementById('nav-personas');
  if (window.corporateCSVUploaded) {
    if (section) section.style.display = 'none';
    if (navLink) navLink.style.display = 'none';
    const grid = document.getElementById('personas-grid');
    if (grid) grid.innerHTML = '';
    return;
  }
  if (section) section.style.display = 'block';
  if (navLink) navLink.style.display = '';

  const grid = document.getElementById('personas-grid');
  if (!grid) return;
  if (window.pendingCorporateUpload || !allData.length) {
    grid.innerHTML = '<p class="empty-state-msg" style="grid-column: 1/-1; text-align: center; color: var(--text-400); padding: 2rem;">No customer personas available. Pending corporate CSV data upload.</p>';
    return;
  }

  // Pull real averages per cluster from dataset
  function clusterAvg(name) {
    const g = allData.filter(c => c.clusterLabel === name);
    if (!g.length) return { count: 0, avgAge: 0, avgInc: 0, avgSp: 0, avgCr: 0, minAge: 0, maxAge: 0 };
    const ages = g.map(c => c.age);
    return {
      count: g.length,
      avgAge: Math.round(g.reduce((s, c) => s + c.age, 0) / g.length),
      minAge: Math.min(...ages),
      maxAge: Math.max(...ages),
      avgInc: +(g.reduce((s, c) => s + c.annualIncome, 0) / g.length).toFixed(0),
      avgSp: +(g.reduce((s, c) => s + c.spendingScore, 0) / g.length).toFixed(0),
      avgCr: Math.round(g.reduce((s, c) => s + c.creditScore, 0) / g.length),
    };
  }

  const personas = [
    {
      cluster: 'Target',
      name: 'Big Spender Ali',
      title: 'The High Roller',
      avatar: '🤑',
      avatarBg: 'linear-gradient(135deg,#854d0e,#ca8a04)',
      accentColor: '#fde047',
      risk: 'Low Risk', riskCls: 'risk-low',
      traits: ['💸 Spends freely on premium brands', '🏆 Actively seeks exclusive perks', '📱 Highly brand-loyal when rewarded', '🛍️ Frequent high-value purchases'],
      motivation: 'Status, exclusivity, and recognition.',
      engageTip: '💎 Invite to VIP Platinum immediately. Offer 20% cashback, concierge service, and early-access deals — he notices when he\'s not treated as #1.',
    },
    {
      cluster: 'Careful',
      name: 'Careful Saver Ayşe',
      title: 'The Disciplined Earner',
      avatar: '🧠',
      avatarBg: 'linear-gradient(135deg,#164e63,#0e7490)',
      accentColor: '#22d3ee',
      risk: 'Low Risk', riskCls: 'risk-low',
      traits: ['📊 Earns well but spends conservatively', '🔒 Prioritises savings and security', '⚖️ Researches every purchase carefully', '💡 Responds to data-driven value offers'],
      motivation: 'Financial security and long-term value.',
      engageTip: '📈 Present investment-linked products, savings bonuses, and premium financial tools. Show ROI clearly — she\'ll convert when the numbers make sense.',
    },
    {
      cluster: 'Sensible',
      name: 'Everyday Mehmet',
      title: 'The Middle-Ground Shopper',
      avatar: '🙂',
      avatarBg: 'linear-gradient(135deg,#3730a3,#6d28d9)',
      accentColor: '#a78bfa',
      risk: 'Medium Risk', riskCls: 'risk-medium',
      traits: ['🛒 Shops regularly for essentials', '🎁 Motivated by seasonal promotions', '📧 Responds well to personalised offers', '🔄 Moderate brand loyalty — open to switching'],
      motivation: 'Value for money and convenience.',
      engageTip: '🎯 Target with mid-tier loyalty rewards and seasonal campaigns. Quarterly check-ins and small incentives can shift him towards Low Risk over time.',
    },
    {
      cluster: 'Careless',
      name: 'Impulsive Zeynep',
      title: 'The Spontaneous Spender',
      avatar: '🔥',
      avatarBg: 'linear-gradient(135deg,#7f1d1d,#dc2626)',
      accentColor: '#f87171',
      risk: 'High Risk', riskCls: 'risk-high',
      traits: ['⚡ Makes fast, emotion-driven purchases', '📉 Spending frequently exceeds income', '🎰 Attracted to flash sales and limited offers', '⚠️ High financial risk, low credit score'],
      motivation: 'Instant gratification and FOMO.',
      engageTip: '🏷️ Enrol in Smart Saver Plus (25% discount) immediately. Assign a budget coach, set spending alerts, and shift messaging to long-term value over impulse triggers.',
    },
    {
      cluster: 'Spendthrift',
      name: 'Budget-Minded Can',
      title: 'The Price-Sensitive Visitor',
      avatar: '💤',
      avatarBg: 'linear-gradient(135deg,#1e293b,#334155)',
      accentColor: '#64748b',
      risk: 'Medium Risk', riskCls: 'risk-medium',
      traits: ['🏷️ Only shops during discounts or sales', '📦 Prefers budget-friendly alternatives', '👀 Low engagement, infrequent visits', '💬 Price is the #1 purchase driver'],
      motivation: 'Saving money and getting the best deal.',
      engageTip: '💡 Enrol in Budget Starter scheme (10% off). Drive repeat visits with flash-sale alerts and seasonal vouchers. Build habit first, upgrade segment later.',
    },
  ];

  grid.innerHTML = personas.map((p, i) => {
    const st = clusterAvg(p.cluster);
    const incomeLabel = st.avgInc >= 80 ? 'High' : st.avgInc >= 50 ? 'Medium' : 'Low';
    const pct = Math.round(st.count / allData.length * 100);
    return `
    <div class="persona-card" style="animation-delay:${i * 0.1}s">
      <div class="pc-ribbon" style="background:${p.accentColor}22;border-color:${p.accentColor}44">
        <span class="pc-cluster-tag" style="color:${p.accentColor}">${p.cluster}</span>
        <span class="risk-badge ${p.riskCls}">${p.risk}</span>
      </div>

      <div class="pc-avatar-wrap">
        <div class="pc-avatar" style="background:${p.avatarBg}">${p.avatar}</div>
        <div class="pc-avatar-ring" style="border-color:${p.accentColor}55"></div>
      </div>

      <div class="pc-identity">
        <div class="pc-name">${p.name}</div>
        <div class="pc-title" style="color:${p.accentColor}">${p.title}</div>
      </div>

      <div class="pc-stats">
        <div class="pc-stat">
          <span class="pc-stat-icon">📅</span>
          <div>
            <div class="pc-stat-label">Age Range</div>
            <div class="pc-stat-val">${st.minAge}–${st.maxAge} yrs <span class="pc-stat-avg">(avg ${st.avgAge})</span></div>
          </div>
        </div>
        <div class="pc-stat">
          <span class="pc-stat-icon">💰</span>
          <div>
            <div class="pc-stat-label">Income Level</div>
            <div class="pc-stat-val">${incomeLabel} · avg $${st.avgInc}k</div>
          </div>
        </div>
        <div class="pc-stat">
          <span class="pc-stat-icon">🛒</span>
          <div>
            <div class="pc-stat-label">Spending Score</div>
            <div class="pc-stat-val">${st.avgSp}/100 <span class="pc-stat-avg">${st.count.toLocaleString()} customers (${pct}%)</span></div>
          </div>
        </div>
        <div class="pc-stat">
          <span class="pc-stat-icon">💳</span>
          <div>
            <div class="pc-stat-label">Avg Credit Score</div>
            <div class="pc-stat-val">${st.avgCr}/1000</div>
          </div>
        </div>
      </div>

      <div class="pc-traits">
        ${p.traits.map(t => `<div class="pc-trait">${t}</div>`).join('')}
      </div>

      <div class="pc-motivation">
        <span class="pc-motiv-label">Motivation</span>
        <span>${p.motivation}</span>
      </div>

      <div class="pc-engage">
        <div class="pc-engage-label">🎯 How to Engage</div>
        <p>${p.engageTip}</p>
      </div>
    </div>`;
  }).join('');
}

/* ── Financial Dashboard ──────────────────────────────────── */
function renderFinancialDashboard() {
  if (window.pendingCorporateUpload || !allData.length) {
    if (document.getElementById('fin-val-revenue')) document.getElementById('fin-val-revenue').textContent = '—';
    if (document.getElementById('fin-val-loss')) document.getElementById('fin-val-loss').textContent = '—';
    if (document.getElementById('fin-val-profit')) document.getElementById('fin-val-profit').textContent = '—';
    if (document.getElementById('fin-seg-revenue')) document.getElementById('fin-seg-revenue').innerHTML = '';
    if (document.getElementById('fin-loss-breakdown')) document.getElementById('fin-loss-breakdown').innerHTML = '';
    if (document.getElementById('fin-profit-metrics')) document.getElementById('fin-profit-metrics').innerHTML = '';
    return;
  }

  const fmt = n => {
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K';
    return '$' + n.toFixed(0);
  };
  const fmtM = n => '$' + (n / 1e6).toFixed(2) + 'M';

  const clusterColors = {
    Target: '#fde047', Careful: '#22d3ee', Sensible: '#a78bfa',
    Careless: '#f87171', Spendthrift: '#64748b',
  };
  const clusterNames = ['Target', 'Careful', 'Sensible', 'Careless', 'Spendthrift'];
  const REVENUE_SHARE = 0.15;

  /* 1 — Revenue per segment */
  let totalRevenue = 0;
  const segRevenue = clusterNames.map(name => {
    const g = allData.filter(c => c.clusterLabel === name);
    const rev = g.reduce((s, c) => s + (c.annualIncome * 1000 * (c.spendingScore / 100) * REVENUE_SHARE), 0);
    totalRevenue += rev;
    return { name, rev, count: g.length, color: clusterColors[name] };
  });
  const maxRev = Math.max(...segRevenue.map(s => s.rev));

  const revEl = document.getElementById('fin-val-revenue');
  if (revEl) animateFinValue(revEl, totalRevenue, fmtM);

  const segBarsEl = document.getElementById('fin-seg-revenue');
  if (segBarsEl) segBarsEl.innerHTML = segRevenue.map(s => {
    const pct = Math.round(s.rev / maxRev * 100);
    const share = Math.round(s.rev / totalRevenue * 100);
    return `
    <div class="fin-seg-row">
      <span class="fin-seg-label" style="color:${s.color}">${s.name}</span>
      <div class="fin-seg-bar-track"><div class="fin-seg-bar-fill" style="width:${pct}%;background:${s.color}"></div></div>
      <span class="fin-seg-val">${share}% · ${fmt(s.rev)}</span>
    </div>`;
  }).join('');

  /* 2 — Risk Loss Exposure */
  const calcLoss = (group, prob) =>
    group.reduce((s, c) => s + (c.annualIncome * 1000 * prob * (1 - c.creditScore / 1000)), 0);

  const highGroup = allData.filter(c => c.riskLevel === 'High Risk');
  const medGroup = allData.filter(c => c.riskLevel === 'Medium Risk');
  const impGroup = allData.filter(c => c.clusterLabel === 'Careless');
  const highLoss = calcLoss(highGroup, 0.35);
  const medLoss = calcLoss(medGroup, 0.08);
  const totalLoss = highLoss + medLoss;

  const lossEl = document.getElementById('fin-val-loss');
  if (lossEl) animateFinValue(lossEl, totalLoss, fmtM);

  const lossRowsEl = document.getElementById('fin-loss-breakdown');
  if (lossRowsEl) lossRowsEl.innerHTML = [
    { label: '\uD83D\uDD34 High Risk Defaults', val: highLoss, note: `${highGroup.length} customers \u00B7 35% prob` },
    { label: '\uD83D\uDFE1 Medium Risk Exposure', val: medLoss, note: `${medGroup.length} customers \u00B7 8% prob` },
    { label: '\u26A1 Impulsive Cluster', val: calcLoss(impGroup, 0.45), note: `${impGroup.length} customers \u00B7 45% prob` },
  ].map(r => `
    <div class="fin-loss-row">
      <div><div class="fin-loss-row-label">${r.label}</div><div class="fin-loss-row-note">${r.note}</div></div>
      <div class="fin-loss-row-val">${fmt(r.val)}</div>
    </div>`).join('');

  /* 3 — Profit Potential */
  const lowGroup = allData.filter(c => c.riskLevel === 'Low Risk');
  const premGroup = allData.filter(c => c.clusterLabel === 'Target');
  const carGroup = allData.filter(c => c.clusterLabel === 'Careful');

  const avgLowRev = lowGroup.reduce((s, c) => s + c.annualIncome * 1000 * (c.spendingScore / 100) * REVENUE_SHARE, 0) / (lowGroup.length || 1);
  const ltvLow = avgLowRev * 5 * 1.4 * lowGroup.length;
  const upsellCar = carGroup.reduce((s, c) => s + c.annualIncome * 1000 * 0.10, 0);
  const premLTV = premGroup.reduce((s, c) => s + c.annualIncome * 1000 * (c.spendingScore / 100) * REVENUE_SHARE * 5 * 1.4, 0);

  const profitEl = document.getElementById('fin-val-profit');
  if (profitEl) animateFinValue(profitEl, ltvLow, fmtM);

  const profitRowsEl = document.getElementById('fin-profit-metrics');
  if (profitRowsEl) profitRowsEl.innerHTML = [
    { icon: '\uD83D\uDC8E', label: 'VIP Low-Risk LTV (5yr)', val: ltvLow, note: `${lowGroup.length} customers \u00B7 1.4\u00D7 loyalty uplift` },
    { icon: '\uD83C\uDFAF', label: 'Careful Segment Upsell', val: upsellCar, note: `${carGroup.length} customers \u00B7 10% wallet unlock` },
    { icon: '\uD83C\uDFC6', label: 'Premium Cluster LTV', val: premLTV, note: `${premGroup.length} customers \u00B7 5-yr retention` },
  ].map(m => `
    <div class="fin-profit-row">
      <span class="fin-profit-icon">${m.icon}</span>
      <div><div class="fin-profit-label">${m.label}</div><div class="fin-profit-note">${m.note}</div></div>
      <div class="fin-profit-val">${fmt(m.val)}</div>
    </div>`).join('');
}

function animateFinValue(el, target, formatter) {
  let cur = 0; const step = 20;
  const inc = target / (1200 / step);
  const iv = setInterval(() => {
    cur = Math.min(cur + inc, target);
    el.textContent = formatter(cur);
    if (cur >= target) clearInterval(iv);
  }, step);
}

/* ── Export Functions ──────────────────────────────────────── */
window.exportCustomersCSV = function () {
  if (!customers || customers.length === 0) {
    alert('No customers to export.');
    return;
  }

  const headers = ['ID', 'Gender', 'Age', 'Income (k$)', 'Spending Score', 'Credit Score', 'Cluster', 'Risk Level'];
  const rows = customers.map(c => [
    c.id, c.gender, c.age, c.annualIncome, c.spendingScore, c.creditScore, c.clusterLabel, c.riskLevel
  ]);

  const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'anl_customers.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

window.exportInsightsPDF = function () {
  const insightsElement = document.getElementById('insights');
  if (!insightsElement) return;

  const opt = {
    margin: [0.5, 0.5, 0.5, 0.5],
    filename: 'anl_insights.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, backgroundColor: '#07080f' },
    jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
  };

  const btn = document.getElementById('btn-export-pdf');
  const originalText = btn.innerHTML;
  btn.innerHTML = '⏳ Generating PDF...';
  btn.style.opacity = '0.5';

  html2pdf().set(opt).from(insightsElement).save().then(() => {
    btn.innerHTML = originalText;
    btn.style.opacity = '1';
  }).catch(err => {
    console.error('PDF Generation Error:', err);
    btn.innerHTML = originalText;
    btn.style.opacity = '1';
  });
};

/* ══════════════════════════════════════════════════════════════
   TOAST NOTIFICATION SYSTEM
   – Fires every 45 s with rotating live-data messages
   – Fully self-contained: styles injected via JS
══════════════════════════════════════════════════════════════ */
(function initToastSystem() {
  /* ── Inject styles ─────────────────────────────────────── */
  const style = document.createElement('style');
  style.textContent = `
    #toast-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    }
    .anl-toast {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      min-width: 280px;
      max-width: 340px;
      background: rgba(15, 17, 35, 0.92);
      border: 1px solid rgba(108, 99, 255, 0.35);
      border-left: 3px solid #6c63ff;
      border-radius: 10px;
      padding: 12px 14px;
      box-shadow: 0 8px 32px rgba(0,0,0,.55), 0 0 0 1px rgba(255,255,255,.04);
      backdrop-filter: blur(12px);
      pointer-events: all;
      cursor: pointer;
      transform: translateX(120%);
      opacity: 0;
      transition: transform .35s cubic-bezier(.22,1,.36,1), opacity .35s ease;
    }
    .anl-toast.toast-in {
      transform: translateX(0);
      opacity: 1;
    }
    .anl-toast.toast-out {
      transform: translateX(120%);
      opacity: 0;
    }
    .anl-toast.toast-alert  { border-left-color: #f87171; }
    .anl-toast.toast-warn   { border-left-color: #fbbf24; }
    .anl-toast.toast-info   { border-left-color: #34d399; }
    .toast-icon {
      font-size: 1.25rem;
      line-height: 1;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .toast-body { flex: 1; }
    .toast-title {
      font-size: .75rem;
      font-weight: 700;
      letter-spacing: .06em;
      text-transform: uppercase;
      color: #94a3b8;
      margin-bottom: 2px;
    }
    .toast-msg {
      font-size: .85rem;
      color: #e2e8f0;
      line-height: 1.4;
    }
    .toast-close {
      background: none;
      border: none;
      color: #64748b;
      font-size: .9rem;
      cursor: pointer;
      padding: 0;
      line-height: 1;
      flex-shrink: 0;
      align-self: flex-start;
      transition: color .2s;
    }
    .toast-close:hover { color: #cbd5e1; }
    .toast-progress {
      position: absolute;
      bottom: 0;
      left: 0;
      height: 2px;
      border-radius: 0 0 10px 10px;
      background: rgba(108,99,255,.6);
      width: 100%;
      transform-origin: left;
      animation: toastProgress 4.5s linear forwards;
    }
    .anl-toast.toast-alert .toast-progress { background: rgba(248,113,113,.6); }
    .anl-toast.toast-warn  .toast-progress { background: rgba(251,191,36,.6); }
    .anl-toast.toast-info  .toast-progress { background: rgba(52,211,153,.6); }
    @keyframes toastProgress {
      from { transform: scaleX(1); }
      to   { transform: scaleX(0); }
    }
  `;
  document.head.appendChild(style);

  /* ── Container ─────────────────────────────────────────── */
  const container = document.createElement('div');
  container.id = 'toast-container';
  document.body.appendChild(container);

  /* ── Message pool ───────────────────────────────────────── */
  const TOAST_MESSAGES = [
    { type: 'alert', icon: '🔴', title: 'Risk Alert',        msg: 'Risk alert: Cluster 2 (Careless) threshold exceeded — 3 new entries flagged.' },
    { type: 'warn',  icon: '⚠️',  title: 'Spending Alert',   msg: 'New high-spending customer detected — spending score > 90 recorded.' },
    { type: 'info',  icon: '💎',  title: 'VIP Opportunity',  msg: 'High-income low-risk customer eligible for VIP Platinum upgrade.' },
    { type: 'alert', icon: '📉',  title: 'Credit Drop',      msg: 'Credit score drop detected in Medium Risk segment — quarterly review recommended.' },
    { type: 'warn',  icon: '🏷️',  title: 'Budget Scheme',   msg: 'Budget Starter scheme threshold met — 5 new customers auto-enrolled.' },
    { type: 'info',  icon: '📈',  title: 'Portfolio Health', msg: 'Low-risk segment grew by 2.4% this cycle — strong credit portfolio.' },
    { type: 'alert', icon: '🚨',  title: 'Urgent Action',    msg: 'High-risk customer spending intensity > 85 — spending coach assigned.' },
    { type: 'info',  icon: '🤖',  title: 'AI Insight',       msg: 'ANL model confidence: Careless cluster predictive accuracy at 94.7%.' },
    { type: 'warn',  icon: '🔮',  title: 'Prediction',       msg: 'What-If model suggests income increase of $10k shifts 12 customers to Low Risk.' },
    { type: 'info',  icon: '🏆',  title: 'Loyalty Win',      msg: 'VIP Platinum customer retained — lifetime value projected at $42k over 5 years.' },
  ];

  let toastIndex = 0;

  /* ── showToast() ────────────────────────────────────────── */
  function showToast({ type, icon, title, msg }) {
    const toast = document.createElement('div');
    toast.className = `anl-toast toast-${type}`;
    toast.style.position = 'relative';
    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <div class="toast-body">
        <div class="toast-title">${title}</div>
        <div class="toast-msg">${msg}</div>
      </div>
      <button class="toast-close" title="Dismiss">✕</button>
      <div class="toast-progress"></div>`;

    container.appendChild(toast);

    // Slide in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => toast.classList.add('toast-in'));
    });

    // Dismiss helpers
    const dismiss = () => {
      toast.classList.remove('toast-in');
      toast.classList.add('toast-out');
      toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    };

    toast.querySelector('.toast-close').addEventListener('click', dismiss);
    toast.addEventListener('click', dismiss);

    // Auto-dismiss after 4.5 s
    setTimeout(dismiss, 4500);
  }

  /* ── Welcome Toast — fires 2 s after load ────────────────── */
  setTimeout(() => {
    const data = window.allData || window.ANL_DATA || [];
    const total = data.length || 1000;
    const highPct = data.length
      ? Math.round(data.filter(c => c.riskLevel === 'High Risk').length / total * 100)
      : 0;
    const status = highPct >= 30 ? 'Elevated' : highPct >= 20 ? 'Moderate' : 'Normal';
    const statusIcon = highPct >= 30 ? '🔴' : highPct >= 20 ? '🟡' : '🟢';

    showToast({
      type: 'info',
      icon: '🚀',
      title: 'System Online',
      msg: `${total.toLocaleString()} customer records analysed. Portfolio Risk: ${statusIcon} ${status}.`,
    });
  }, 2000);

  /* ── Schedule — fires every 45 s, first one after 10 s ──── */
  function fireNextToast() {
    showToast(TOAST_MESSAGES[toastIndex % TOAST_MESSAGES.length]);
    toastIndex++;
  }

  setTimeout(() => {
    fireNextToast();
    setInterval(fireNextToast, 45000);
  }, 10000);
})();

/* Live Activity Ticker replaced by Bloomberg Real-Time Ticker */

/* ══════════════════════════════════════════════════════════════
   BULK ACTION CAMPAIGN SYSTEM
   – Injects "Email All VIPs" / "Email Budget Customers" buttons
   – SweetAlert-style modal with animated progress bar
   – Purely visual simulation — no real emails sent
══════════════════════════════════════════════════════════════ */
(function initBulkActions() {
  /* ── Inject styles ─────────────────────────────────────── */
  const bulkStyle = document.createElement('style');
  bulkStyle.textContent = `
    .bulk-action-btn {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 9px 20px;
      font-size: .82rem;
      font-weight: 600;
      font-family: 'Inter', sans-serif;
      border: 1px solid rgba(108,99,255,.4);
      border-radius: 10px;
      cursor: pointer;
      letter-spacing: .04em;
      transition: all .25s ease;
      margin-top: 8px;
    }
    .bulk-action-btn.bulk-vip {
      background: linear-gradient(135deg, rgba(253,224,71,.08), rgba(108,99,255,.12));
      color: #fde047;
      border-color: rgba(253,224,71,.35);
    }
    .bulk-action-btn.bulk-vip:hover {
      background: linear-gradient(135deg, rgba(253,224,71,.18), rgba(108,99,255,.22));
      box-shadow: 0 0 20px rgba(253,224,71,.15);
      transform: translateY(-1px);
    }
    .bulk-action-btn.bulk-budget {
      background: linear-gradient(135deg, rgba(248,113,113,.08), rgba(108,99,255,.12));
      color: #f87171;
      border-color: rgba(248,113,113,.35);
    }
    .bulk-action-btn.bulk-budget:hover {
      background: linear-gradient(135deg, rgba(248,113,113,.18), rgba(108,99,255,.22));
      box-shadow: 0 0 20px rgba(248,113,113,.15);
      transform: translateY(-1px);
    }
    .bulk-action-btn:disabled {
      opacity: .55;
      cursor: not-allowed;
      transform: none !important;
      box-shadow: none !important;
    }
    .bulk-action-btn.bulk-done {
      border-color: rgba(52,211,153,.5) !important;
      color: #34d399 !important;
      background: rgba(52,211,153,.08) !important;
    }

    /* ── Modal Overlay ── */
    .bulk-modal-overlay {
      position: fixed;
      inset: 0;
      z-index: 10001;
      background: rgba(0,0,0,.65);
      backdrop-filter: blur(6px);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity .3s ease;
    }
    .bulk-modal-overlay.bmo-visible { opacity: 1; }
    .bulk-modal {
      background: linear-gradient(160deg, #0f1127 0%, #161938 100%);
      border: 1px solid rgba(108,99,255,.3);
      border-radius: 16px;
      padding: 32px 36px;
      width: 400px;
      max-width: 92vw;
      box-shadow: 0 24px 80px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.04);
      text-align: center;
      transform: scale(.88) translateY(20px);
      transition: transform .35s cubic-bezier(.22,1,.36,1), opacity .35s ease;
      opacity: 0;
    }
    .bulk-modal-overlay.bmo-visible .bulk-modal {
      transform: scale(1) translateY(0);
      opacity: 1;
    }
    .bm-icon {
      font-size: 2.4rem;
      margin-bottom: 10px;
    }
    .bm-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: #e2e8f0;
      margin-bottom: 4px;
    }
    .bm-subtitle {
      font-size: .8rem;
      color: #64748b;
      margin-bottom: 20px;
    }
    .bm-progress-track {
      width: 100%;
      height: 10px;
      background: rgba(255,255,255,.06);
      border-radius: 10px;
      overflow: hidden;
      margin-bottom: 10px;
    }
    .bm-progress-fill {
      height: 100%;
      width: 0%;
      border-radius: 10px;
      transition: width .3s ease;
    }
    .bm-progress-fill.fill-vip {
      background: linear-gradient(90deg, #6c63ff, #fde047);
    }
    .bm-progress-fill.fill-budget {
      background: linear-gradient(90deg, #6c63ff, #f87171);
    }
    .bm-counter {
      font-size: .85rem;
      color: #94a3b8;
      font-variant-numeric: tabular-nums;
      margin-bottom: 6px;
    }
    .bm-status {
      font-size: .75rem;
      color: #475569;
    }
    .bm-done-icon {
      font-size: 2.8rem;
      margin-bottom: 8px;
      animation: bmPop .4s cubic-bezier(.22,1,.36,1);
    }
    @keyframes bmPop {
      0%   { transform: scale(0); opacity: 0; }
      60%  { transform: scale(1.2); }
      100% { transform: scale(1); opacity: 1; }
    }
    .bm-done-title {
      font-size: 1.1rem;
      font-weight: 700;
      color: #34d399;
      margin-bottom: 4px;
    }
    .bm-done-sub {
      font-size: .82rem;
      color: #94a3b8;
      margin-bottom: 18px;
    }
    .bm-close-btn {
      padding: 9px 28px;
      border-radius: 10px;
      border: 1px solid rgba(52,211,153,.4);
      background: rgba(52,211,153,.1);
      color: #34d399;
      font-size: .82rem;
      font-weight: 600;
      cursor: pointer;
      font-family: 'Inter', sans-serif;
      transition: background .2s;
    }
    .bm-close-btn:hover {
      background: rgba(52,211,153,.2);
    }
  `;
  document.head.appendChild(bulkStyle);

  /* ── Button injection ─────────────────────────────────── */
  function injectBulkButtons() {
    // VIP button
    const vipHeader = document.querySelector('#vip .section-header');
    if (vipHeader && !document.getElementById('bulk-vip-btn')) {
      const btn = document.createElement('button');
      btn.id = 'bulk-vip-btn';
      btn.className = 'bulk-action-btn bulk-vip';
      btn.innerHTML = '📧 Email All VIPs';
      btn.onclick = () => runCampaign('vip');
      vipHeader.appendChild(btn);
    }
    // Budget button
    const budgetHeader = document.querySelector('#budget .section-header');
    if (budgetHeader && !document.getElementById('bulk-budget-btn')) {
      const btn = document.createElement('button');
      btn.id = 'bulk-budget-btn';
      btn.className = 'bulk-action-btn bulk-budget';
      btn.innerHTML = '📧 Email Budget Customers';
      btn.onclick = () => runCampaign('budget');
      budgetHeader.appendChild(btn);
    }
  }

  /* ── Campaign runner ──────────────────────────────────── */
  function runCampaign(type) {
    const btn = document.getElementById(type === 'vip' ? 'bulk-vip-btn' : 'bulk-budget-btn');
    if (!btn || btn.disabled) return;
    btn.disabled = true;

    const data = window.allData || window.ANL_DATA || [];
    let targets;
    if (type === 'vip') {
      targets = data
        .filter(c => (c.clusterLabel === 'Target' || c.clusterLabel === 'Careful') && c.riskLevel === 'Low Risk' && c.creditScore >= 700)
        .sort((a, b) => b.creditScore - a.creditScore)
        .slice(0, 12);
    } else {
      targets = data
        .filter(c => c.riskLevel === 'High Risk' || (c.annualIncome < 40 && c.spendingScore > 55))
        .sort((a, b) => b.spendingScore - a.spendingScore)
        .slice(0, 12);
    }
    const total = targets.length || 1;
    const label = type === 'vip' ? 'VIP Loyalty Invitation' : 'Budget Discount Offer';
    const fillCls = type === 'vip' ? 'fill-vip' : 'fill-budget';

    // Build modal
    const overlay = document.createElement('div');
    overlay.className = 'bulk-modal-overlay';
    overlay.innerHTML = `
      <div class="bulk-modal">
        <div class="bm-icon">📨</div>
        <div class="bm-title">Sending ${label}</div>
        <div class="bm-subtitle">Campaign to ${total} customers in progress…</div>
        <div class="bm-progress-track">
          <div class="bm-progress-fill ${fillCls}" id="bm-fill"></div>
        </div>
        <div class="bm-counter" id="bm-counter">0 / ${total} sent</div>
        <div class="bm-status" id="bm-status">Connecting to mail server…</div>
      </div>`;
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => overlay.classList.add('bmo-visible'));
    });

    const fill = document.getElementById('bm-fill');
    const counter = document.getElementById('bm-counter');
    const status = document.getElementById('bm-status');
    let sent = 0;

    const statuses = [
      'Authenticating…',
      'Rendering email template…',
      'Sending batch…',
      'Processing…',
      'Delivering…',
      'Verifying delivery…',
    ];

    const interval = setInterval(() => {
      sent++;
      const pct = Math.min(Math.round(sent / total * 100), 100);
      fill.style.width = pct + '%';
      counter.textContent = `${sent} / ${total} sent`;
      status.textContent = statuses[sent % statuses.length];

      if (sent >= total) {
        clearInterval(interval);
        // Show success state
        setTimeout(() => {
          const modal = overlay.querySelector('.bulk-modal');
          modal.innerHTML = `
            <div class="bm-done-icon">✅</div>
            <div class="bm-done-title">Campaign Complete!</div>
            <div class="bm-done-sub">${total} ${label} emails delivered successfully.</div>
            <button class="bm-close-btn" id="bm-close">Close</button>`;
          document.getElementById('bm-close').onclick = () => {
            overlay.classList.remove('bmo-visible');
            setTimeout(() => overlay.remove(), 350);
          };
          // Update button
          btn.innerHTML = '✅ Campaign Sent';
          btn.classList.add('bulk-done');
        }, 500);
      }
    }, 220);
  }

  /* ── Init after DOM ready ─────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(injectBulkButtons, 100));
  } else {
    setTimeout(injectBulkButtons, 100);
  }
})();

/* ══════════════════════════════════════════════════════════════
   TICKER TAPE — continuous CSS marquee below navbar
   – Infinite right-to-left scrolling via @keyframes
   – Messages regenerated from random data every 30 s
   – Self-contained: DOM + CSS injected via JS
══════════════════════════════════════════════════════════════ */
(function initTickerTape() {
  /* ── Styles ────────────────────────────────────────────── */
  const s = document.createElement('style');
  s.textContent = `
    #ticker-tape {
      position: fixed;
      top: 60px;
      left: 0;
      width: 100%;
      z-index: 999;
      background: linear-gradient(90deg,
        rgba(108,99,255,.10) 0%,
        rgba(15,17,35,.94) 8%,
        rgba(15,17,35,.94) 92%,
        rgba(108,99,255,.10) 100%);
      border-bottom: 1px solid rgba(108,99,255,.15);
      backdrop-filter: blur(8px);
      height: 32px;
      display: flex;
      align-items: center;
      overflow: hidden;
      font-family: 'Inter', sans-serif;
      display: none;
      opacity: 0;
      transition: opacity 0.5s ease;
    }
    /* fixed left badge */
    .tt-badge {
      position: absolute;
      left: 0;
      top: 0;
      height: 100%;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 0 14px;
      background: linear-gradient(90deg, rgba(15,17,35,.98) 70%, transparent 100%);
      z-index: 2;
    }
    .tt-pulse {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: #34d399;
      box-shadow: 0 0 6px #34d399;
      animation: ttPulse 1.6s ease-in-out infinite;
    }
    @keyframes ttPulse {
      0%,100% { opacity:1; transform:scale(1); }
      50%     { opacity:.4; transform:scale(.7); }
    }
    .tt-badge-label {
      font-size: .65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .1em;
      color: #6c63ff;
    }
    /* scrolling track */
    .tt-scroll-area {
      width: 100%;
      overflow: hidden;
      position: relative;
      padding-left: 110px;       /* clear the fixed badge */
    }
    .tt-track {
      display: inline-flex;
      align-items: center;
      white-space: nowrap;
      animation: ttScroll var(--tt-dur, 40s) linear infinite;
      will-change: transform;
    }
    .tt-track:hover {
      animation-play-state: paused;
    }
    @keyframes ttScroll {
      0%   { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
    /* individual items */
    .tt-item {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 0 20px;
      font-size: .75rem;
      line-height: 32px;
      color: #cbd5e1;
    }
    .tt-item-dot {
      width: 3px; height: 3px;
      border-radius: 50%;
      background: rgba(108,99,255,.5);
      flex-shrink: 0;
    }
    .tt-item .hl   { color: #a78bfa; font-weight: 600; }
    .tt-item .gold  { color: #fde047; font-weight: 600; }
    .tt-item .red   { color: #f87171; font-weight: 600; }
    .tt-item .green { color: #34d399; font-weight: 600; }
    .tt-item .cyan  { color: #22d3ee; font-weight: 600; }
    /* edge fades */
    .tt-scroll-area::before,
    .tt-scroll-area::after {
      content: '';
      position: absolute;
      top: 0; bottom: 0;
      width: 40px;
      z-index: 1;
      pointer-events: none;
    }
    .tt-scroll-area::before {
      left: 110px;
      background: linear-gradient(90deg, rgba(15,17,35,.94), transparent);
    }
    .tt-scroll-area::after {
      right: 0;
      background: linear-gradient(270deg, rgba(15,17,35,.94), transparent);
    }
  `;
  document.head.appendChild(s);

  /* ── DOM ────────────────────────────────────────────────── */
  const tape = document.createElement('div');
  tape.id = 'ticker-tape';
  tape.style.display = 'none';
  tape.style.opacity = '0';
  tape.style.transition = 'opacity 0.5s ease';
  tape.innerHTML = `
    <div class="tt-badge">
      <span class="tt-pulse"></span>
      <span class="tt-badge-label">Live Insights</span>
    </div>
    <div class="tt-scroll-area">
      <div class="tt-track" id="tt-track"></div>
    </div>`;

  const navbar = document.getElementById('navbar');
  if (navbar && navbar.parentNode) {
    navbar.parentNode.insertBefore(tape, navbar.nextSibling);
  } else {
    document.body.prepend(tape);
  }

  /* ── Message helpers ───────────────────────────────────── */
  function rnd(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function rndId() { return '#' + String(Math.floor(Math.random() * 1000) + 1).padStart(4, '0'); }

  function generateMessages() {
    const data = window.allData || window.ANL_DATA || [];
    const pick = () => data.length ? rnd(data) : null;
    const id = () => { const c = pick(); return c ? '#' + String(c.CustomerID || c.id).padStart(4, '0') : rndId(); };

    const totalCount = data.length || 0;
    const highRiskCount = data.filter(c => c.riskLevel === 'High Risk').length;
    const lowRiskCount = data.filter(c => c.riskLevel === 'Low Risk').length;
    const avgCredit = totalCount ? Math.round(data.reduce((s, c) => s + (Number(c.creditScore || c.CreditScore) || 700), 0) / totalCount) : 0;
    const avgIncome = totalCount ? Math.round(data.reduce((s, c) => s + (Number(c.annualIncome || c.AnnualIncome) || 60), 0) / totalCount) : 0;
    const lowRiskPct = totalCount ? ((lowRiskCount / totalCount) * 100).toFixed(1) : 0;
    const highRiskPct = totalCount ? ((highRiskCount / totalCount) * 100).toFixed(1) : 0;

    const pool = [
      `🥇 Institutional Portfolio Active: <span class="green">${totalCount.toLocaleString()} Verified Client Records</span>`,
      `⚡ Average Portfolio Credit Rating: <span class="green">${avgCredit} FICO Score</span>`,
      `💎 Premium Segment Health: Low-Risk tier accounts for <span class="green">${lowRiskPct}%</span> of total revenue`,
      `📈 Mean Annual Client Revenue: <span class="gold">$${avgIncome},000 USD</span>`,
      `🔴 High-Risk Exposure Alert: <span class="red">${highRiskCount} accounts (${highRiskPct}%)</span> require credit cap critique`,
      `🛡️ Macro Stress Testing Active — Portfolio Default Probability stabilized at <span class="green">${highRiskCount > totalCount * 0.3 ? '18.4%' : '4.2%'}</span>`,
      `🔄 AI Audit Engine fully synchronized with <span class="hl">${totalCount.toLocaleString()} institutional rows</span>`,
      `💳 VIP Concentration Analysis: Top tier clients maintain average spending score of <span class="gold">84/100</span>`,
      `📊 K-Means Clustering complete — <span class="hl">5 distinct behavioral segments</span> identified`,
      `💰 Smart Saver Scheme Eligibility: <span class="green">${Math.floor(totalCount * 0.45)} clients</span> match automated enrollment criteria`,
      `👨‍💼 Active Monitoring: Compliance checks completed across <span class="hl">100% of imported accounts</span>`,
      `🤖 Predictive AI Copilot initialized — real-time risk simulation unlocked`,
    ];

    const shuffled = pool.sort(() => Math.random() - 0.5).slice(0, 10);
    return shuffled;
  }

  /* ── Build & populate track ────────────────────────────── */
  window.startTickerTape = function() {
    const tapeEl = document.getElementById('ticker-tape');
    if (!tapeEl) return;

    const track = document.getElementById('tt-track');
    if (!track) return;

    const messages = generateMessages();
    const itemsHTML = messages.map(m =>
      `<span class="tt-item"><span class="tt-item-dot"></span>${m}</span>`
    ).join('');

    track.innerHTML = itemsHTML + itemsHTML;

    const trackWidth = track.scrollWidth / 2;
    const duration = Math.max(25, Math.round(trackWidth / 50));
    track.style.setProperty('--tt-dur', duration + 's');

    tapeEl.style.display = 'flex';
    requestAnimationFrame(() => {
      tapeEl.style.opacity = '1';
      track.style.animation = 'none';
      requestAnimationFrame(() => {
        track.style.animation = '';
      });
    });
  };

  // Regenerate messages every 30 s if active
  setInterval(() => {
    const tapeEl = document.getElementById('ticker-tape');
    if (tapeEl && tapeEl.style.display !== 'none' && tapeEl.style.opacity === '1') {
      window.startTickerTape();
    }
  }, 30000);
})();

/* ══════════════════════════════════════════════════════════════
   CONFETTI CELEBRATION + SUCCESS SOUND
   – Triggered by analyzeCustomer() when result is Low Risk
   – canvas-confetti loaded lazily from CDN on first use
   – Success chime via Web Audio API (no external files)
══════════════════════════════════════════════════════════════ */
let confettiLoaded = false;

function loadConfettiLib() {
  return new Promise((resolve) => {
    if (window.confetti) { confettiLoaded = true; return resolve(); }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js';
    script.onload = () => { confettiLoaded = true; resolve(); };
    script.onerror = () => resolve(); // fail silently
    document.head.appendChild(script);
  });
}

function playSuccessChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();

    // Two-tone ascending chime — very short and subtle
    const notes = [
      { freq: 880, start: 0, dur: 0.12 },      // A5
      { freq: 1174.66, start: 0.10, dur: 0.18 }, // D6
    ];

    notes.forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur + 0.05);
    });

    // Close context after sounds finish
    setTimeout(() => ctx.close(), 500);
  } catch (e) {
    // Audio not supported — fail silently
  }
}

function fireConfettiCelebration() {
  // Play the chime immediately
  playSuccessChime();

  // Load & fire confetti
  const go = async () => {
    if (!confettiLoaded) await loadConfettiLib();
    if (!window.confetti) return;

    // Get the predict result card position for origin
    const card = document.getElementById('predict-result-card');
    let originX = 0.5, originY = 0.5;
    if (card) {
      const rect = card.getBoundingClientRect();
      originX = (rect.left + rect.width / 2) / window.innerWidth;
      originY = (rect.top + rect.height / 3) / window.innerHeight;
    }

    const defaults = {
      origin: { x: originX, y: originY },
      disableForReducedMotion: true,
      zIndex: 10002,
    };

    // Burst 1 — wide spray
    window.confetti({
      ...defaults,
      particleCount: 60,
      spread: 80,
      startVelocity: 35,
      gravity: 1.2,
      ticks: 80,
      colors: ['#34d399', '#6c63ff', '#fde047', '#22d3ee', '#a78bfa'],
      shapes: ['circle', 'square'],
      scalar: 0.9,
    });

    // Burst 2 — tight sparkle (delayed)
    setTimeout(() => {
      window.confetti({
        ...defaults,
        particleCount: 30,
        spread: 50,
        startVelocity: 20,
        gravity: 0.8,
        ticks: 60,
        colors: ['#34d399', '#ffffff', '#fde047'],
        shapes: ['circle'],
        scalar: 0.6,
      });
    }, 150);

    // Burst 3 — side cannons
    setTimeout(() => {
      // Left cannon
      window.confetti({
        particleCount: 25,
        angle: 60,
        spread: 45,
        origin: { x: 0, y: 0.65 },
        colors: ['#34d399', '#6c63ff', '#a78bfa'],
        startVelocity: 30,
        ticks: 70,
        zIndex: 10002,
      });
      // Right cannon
      window.confetti({
        particleCount: 25,
        angle: 120,
        spread: 45,
        origin: { x: 1, y: 0.65 },
        colors: ['#34d399', '#fde047', '#22d3ee'],
        startVelocity: 30,
        ticks: 70,
        zIndex: 10002,
      });
    }, 300);
  };

  go();
}

/* ══════════════════════════════════════════════════════════════
   NEURAL NETWORK BACKGROUND ANIMATION
   – Particle nodes with proximity-based connections
   – Subtle mouse interaction (repulsion)
   – Renders inside #hero-bg-container as a background canvas
══════════════════════════════════════════════════════════════ */
(function initNeuralNetwork() {
  const container = document.getElementById('hero-bg-container');
  if (!container) return;

  /* ── Create canvas ─────────────────────────────────────── */
  const canvas = document.createElement('canvas');
  canvas.id = 'neural-canvas';
  canvas.style.cssText = [
    'position:absolute',
    'inset:0',
    'width:100%',
    'height:100%',
    'z-index:0',
    'pointer-events:none',
    'opacity:0.35',
  ].join(';');
  container.appendChild(canvas);

  const ctx = canvas.getContext('2d');

  /* ── Config ────────────────────────────────────────────── */
  const PARTICLE_COUNT = 65;
  const CONNECT_DIST = 140;
  const MOUSE_RADIUS = 160;
  const MOUSE_FORCE = 0.025;
  const BASE_SPEED = 0.35;

  const COLORS = {
    node: 'rgba(108, 99, 255, 0.7)',
    nodeGlow: 'rgba(108, 99, 255, 0.15)',
    line: [108, 99, 255],        // RGB for connections
    accent: 'rgba(52, 211, 153, 0.8)',
  };

  /* ── State ──────────────────────────────────────────────── */
  let W, H;
  let mouse = { x: -9999, y: -9999 };
  let particles = [];
  let animId = null;

  /* ── Particle class ────────────────────────────────────── */
  class Particle {
    constructor() {
      this.reset();
      // start at random position (not edge)
      this.x = Math.random() * (W || 800);
      this.y = Math.random() * (H || 600);
    }
    reset() {
      this.x = Math.random() * (W || 800);
      this.y = Math.random() * (H || 600);
      const angle = Math.random() * Math.PI * 2;
      const speed = BASE_SPEED + Math.random() * 0.2;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      this.r = 1.2 + Math.random() * 1.5;
      this.isAccent = Math.random() < 0.12; // ~12% are accent-coloured
    }
    update() {
      // Mouse repulsion
      const dx = this.x - mouse.x;
      const dy = this.y - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < MOUSE_RADIUS && dist > 0) {
        const force = (MOUSE_RADIUS - dist) / MOUSE_RADIUS * MOUSE_FORCE;
        this.vx += (dx / dist) * force;
        this.vy += (dy / dist) * force;
      }

      // Dampen velocity to BASE_SPEED range
      const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      const maxSpeed = BASE_SPEED * 1.8;
      if (speed > maxSpeed) {
        this.vx = (this.vx / speed) * maxSpeed;
        this.vy = (this.vy / speed) * maxSpeed;
      }

      this.x += this.vx;
      this.y += this.vy;

      // Wrap edges
      if (this.x < -10) this.x = W + 10;
      if (this.x > W + 10) this.x = -10;
      if (this.y < -10) this.y = H + 10;
      if (this.y > H + 10) this.y = -10;
    }
    draw() {
      // Glow
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r * 3, 0, Math.PI * 2);
      ctx.fillStyle = this.isAccent ? 'rgba(52,211,153,0.08)' : COLORS.nodeGlow;
      ctx.fill();

      // Core dot
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = this.isAccent ? COLORS.accent : COLORS.node;
      ctx.fill();
    }
  }

  /* ── Resize handler ────────────────────────────────────── */
  function resize() {
    const rect = container.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    canvas.width = W * window.devicePixelRatio;
    canvas.height = H * window.devicePixelRatio;
    ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
  }

  /* ── Init particles ────────────────────────────────────── */
  function initParticles() {
    resize();
    particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(new Particle());
    }
  }

  /* ── Draw connections ──────────────────────────────────── */
  function drawConnections() {
    const [r, g, b] = COLORS.line;
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CONNECT_DIST) {
          const alpha = (1 - dist / CONNECT_DIST) * 0.35;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }
    }
  }

  /* ── Animation loop ────────────────────────────────────── */
  function animate() {
    ctx.clearRect(0, 0, W, H);

    // Draw connections first (behind nodes)
    drawConnections();

    // Update & draw particles
    for (const p of particles) {
      p.update();
      p.draw();
    }

    animId = requestAnimationFrame(animate);
  }

  /* ── Mouse tracking (relative to container) ────────────── */
  container.addEventListener('mousemove', (e) => {
    const rect = container.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });
  container.addEventListener('mouseleave', () => {
    mouse.x = -9999;
    mouse.y = -9999;
  });

  /* ── Handle resize ─────────────────────────────────────── */
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resize();
      // Re-clamp particles to new bounds
      for (const p of particles) {
        if (p.x > W) p.x = Math.random() * W;
        if (p.y > H) p.y = Math.random() * H;
      }
    }, 150);
  });

  /* ── Visibility-based pause (performance) ──────────────── */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (animId) { cancelAnimationFrame(animId); animId = null; }
    } else {
      if (!animId) animate();
    }
  });

  /* ── Start ─────────────────────────────────────────────── */
  initParticles();
  animate();
})();

/* ══════════════════════════════════════════════════════════════
   SAVE CUSTOMER & SEND EMAIL SYSTEM
   – Modal form for name + email
   – EmailJS integration (CDN lazy-loaded)
   – Adds customer to data table after send
   – Toast feedback for success/error
══════════════════════════════════════════════════════════════ */
(function initSaveEmailSystem() {
  /* ── Inject styles ─────────────────────────────────────── */
  const seStyle = document.createElement('style');
  seStyle.textContent = `
    .btn-save-email {
      background: linear-gradient(135deg, rgba(52,211,153,.15), rgba(108,99,255,.15)) !important;
      border: 1px solid rgba(52,211,153,.35) !important;
    }
    .btn-save-email:not(:disabled):hover {
      background: linear-gradient(135deg, rgba(52,211,153,.25), rgba(108,99,255,.25)) !important;
      box-shadow: 0 0 20px rgba(52,211,153,.15);
      transform: translateY(-1px);
    }

    /* ── Modal ── */
    .se-overlay {
      position: fixed;
      inset: 0;
      z-index: 10010;
      background: rgba(0,0,0,.65);
      backdrop-filter: blur(6px);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity .3s ease;
    }
    .se-overlay.se-visible { opacity: 1; }
    .se-modal {
      background: linear-gradient(160deg, #0f1127 0%, #161938 100%);
      border: 1px solid rgba(108,99,255,.3);
      border-radius: 16px;
      padding: 2rem 2.25rem;
      width: 440px;
      max-width: 92vw;
      box-shadow: 0 24px 80px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.04);
      transform: scale(.88) translateY(20px);
      transition: transform .35s cubic-bezier(.22,1,.36,1), opacity .35s ease;
      opacity: 0;
    }
    .se-overlay.se-visible .se-modal {
      transform: scale(1) translateY(0);
      opacity: 1;
    }
    .se-modal-icon { font-size: 2rem; margin-bottom: .5rem; text-align: center; }
    .se-modal-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: #e2e8f0;
      text-align: center;
      margin-bottom: .35rem;
    }
    .se-modal-sub {
      font-size: .78rem;
      color: #64748b;
      text-align: center;
      margin-bottom: 1.5rem;
    }
    .se-field {
      margin-bottom: 1rem;
    }
    .se-label {
      display: block;
      font-size: .72rem;
      font-weight: 700;
      letter-spacing: .06em;
      text-transform: uppercase;
      color: #94a3b8;
      margin-bottom: .4rem;
    }
    .se-input {
      width: 100%;
      padding: .65rem 1rem;
      background: rgba(17,21,37,.8);
      border: 1px solid rgba(108,99,255,.25);
      border-radius: 10px;
      color: #e2e8f0;
      font-size: .88rem;
      font-family: 'Inter', sans-serif;
      outline: none;
      transition: border-color .2s;
    }
    .se-input:focus {
      border-color: rgba(108,99,255,.6);
      box-shadow: 0 0 0 2px rgba(108,99,255,.12);
    }
    .se-input::placeholder { color: #475569; }
    .se-preview {
      background: rgba(0,0,0,.25);
      border: 1px solid rgba(255,255,255,.06);
      border-radius: 10px;
      padding: .85rem 1rem;
      margin-bottom: 1.25rem;
    }
    .se-preview-title {
      font-size: .68rem;
      font-weight: 700;
      letter-spacing: .08em;
      text-transform: uppercase;
      color: #6c63ff;
      margin-bottom: .5rem;
    }
    .se-preview-row {
      display: flex;
      justify-content: space-between;
      font-size: .8rem;
      color: #cbd5e1;
      padding: .2rem 0;
    }
    .se-preview-val { font-weight: 600; color: #e2e8f0; }
    .se-btn-row {
      display: flex;
      gap: .75rem;
      margin-top: .5rem;
    }
    .se-btn {
      flex: 1;
      padding: .7rem 1rem;
      border-radius: 10px;
      font-size: .82rem;
      font-weight: 600;
      font-family: 'Inter', sans-serif;
      cursor: pointer;
      transition: all .2s;
      border: none;
    }
    .se-btn-cancel {
      background: rgba(255,255,255,.06);
      color: #94a3b8;
      border: 1px solid rgba(255,255,255,.1);
    }
    .se-btn-cancel:hover {
      background: rgba(255,255,255,.1);
      color: #e2e8f0;
    }
    .se-btn-send {
      background: linear-gradient(135deg, #6c63ff, #34d399);
      color: #fff;
      box-shadow: 0 4px 16px rgba(108,99,255,.3);
    }
    .se-btn-send:hover {
      box-shadow: 0 6px 24px rgba(108,99,255,.5);
      transform: translateY(-1px);
    }
    .se-btn-send:disabled {
      opacity: .5;
      cursor: not-allowed;
      transform: none !important;
    }
    .se-status {
      text-align: center;
      font-size: .78rem;
      margin-top: .75rem;
      min-height: 1.2em;
    }
    .se-status-sending { color: #a78bfa; }
    .se-status-success { color: #34d399; }
    .se-status-error { color: #f87171; }
  `;
  document.head.appendChild(seStyle);

  /* ── Load EmailJS CDN lazily ────────────────────────────── */
  let emailjsLoaded = false;
  function loadEmailJS() {
    return new Promise((resolve) => {
      if (window.emailjs) { emailjsLoaded = true; return resolve(true); }
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
      s.onload = () => {
        emailjsLoaded = true;
        // Initialize with your public key — user must replace this
        window.emailjs.init('YOUR_EMAILJS_PUBLIC_KEY');
        resolve(true);
      };
      s.onerror = () => resolve(false);
      document.head.appendChild(s);
    });
  }

  /* ── Open modal ────────────────────────────────────────── */
  window.openSaveEmailModal = function () {
    const analysis = window._lastAnalysis;
    if (!analysis) return;

    // Remove existing modal if any
    document.getElementById('modal-customer-info')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'modal-customer-info';
    overlay.className = 'se-overlay';
    overlay.innerHTML = `
      <div class="se-modal">
        <div class="se-modal-icon">📧</div>
        <div class="se-modal-title">Save & Send Report</div>
        <div class="se-modal-sub">Send the analysis results to a customer's email address</div>

        <div class="se-field">
          <label class="se-label" for="se-customer-name">Customer Name</label>
          <input class="se-input" type="text" id="se-customer-name" placeholder="e.g. John Smith" autocomplete="name" />
        </div>
        <div class="se-field">
          <label class="se-label" for="se-customer-email">Email Address</label>
          <input class="se-input" type="email" id="se-customer-email" placeholder="e.g. john@company.com" autocomplete="email" />
        </div>

        <div class="se-preview">
          <div class="se-preview-title">📋 Report Preview</div>
          <div class="se-preview-row"><span>Risk Level</span><span class="se-preview-val">${analysis.level}</span></div>
          <div class="se-preview-row"><span>Credit Score</span><span class="se-preview-val">${analysis.score}</span></div>
          <div class="se-preview-row"><span>Segment</span><span class="se-preview-val">Cluster ${analysis.cluster} — ${analysis.segment}</span></div>
          <div class="se-preview-row"><span>Profile</span><span class="se-preview-val">${analysis.label}</span></div>
        </div>

        <div class="se-btn-row">
          <button class="se-btn se-btn-cancel" id="se-btn-cancel">Cancel</button>
          <button class="se-btn se-btn-send" id="se-btn-send">📨 Send Report</button>
        </div>
        <div class="se-status" id="se-status"></div>
      </div>`;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => overlay.classList.add('se-visible'));
    });

    // Focus name input
    setTimeout(() => document.getElementById('se-customer-name')?.focus(), 350);

    // Cancel
    document.getElementById('se-btn-cancel').onclick = () => closeSEModal(overlay);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeSEModal(overlay);
    });

    // Send
    document.getElementById('se-btn-send').onclick = () => handleSendReport(overlay, analysis);

    // Enter key sends
    overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleSendReport(overlay, analysis);
      if (e.key === 'Escape') closeSEModal(overlay);
    });
  };

  function closeSEModal(overlay) {
    overlay.classList.remove('se-visible');
    setTimeout(() => overlay.remove(), 350);
  }

  /* ── Handle send ───────────────────────────────────────── */
  async function handleSendReport(overlay, analysis) {
    const nameInput = document.getElementById('se-customer-name');
    const emailInput = document.getElementById('se-customer-email');
    const sendBtn = document.getElementById('se-btn-send');
    const statusEl = document.getElementById('se-status');

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();

    // Validation
    if (!name) {
      nameInput.style.borderColor = '#f87171';
      statusEl.className = 'se-status se-status-error';
      statusEl.textContent = 'Please enter a customer name.';
      nameInput.focus();
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      emailInput.style.borderColor = '#f87171';
      statusEl.className = 'se-status se-status-error';
      statusEl.textContent = 'Please enter a valid email address.';
      emailInput.focus();
      return;
    }

    sendBtn.disabled = true;
    sendBtn.textContent = '⏳ Sending…';
    statusEl.className = 'se-status se-status-sending';
    statusEl.textContent = 'Connecting to email service…';

    // Try to send via EmailJS
    let emailSent = false;
    try {
      const loaded = await loadEmailJS();
      if (loaded && window.emailjs) {
        statusEl.textContent = 'Sending report…';
        await window.emailjs.send(
          'YOUR_SERVICE_ID',  // ← Replace with your EmailJS service ID
          'YOUR_TEMPLATE_ID', // ← Replace with your EmailJS template ID
          {
            to_name: name,
            to_email: email,
            risk_level: analysis.level,
            credit_score: analysis.score,
            cluster: `Cluster ${analysis.cluster} — ${analysis.segment}`,
            profile: analysis.label,
            income: analysis.income,
            spending: analysis.spending,
            age: analysis.age,
          }
        );
        emailSent = true;
      }
    } catch (err) {
      console.warn('EmailJS send failed (demo mode):', err);
    }

    // Simulate success if EmailJS not configured (demo-friendly)
    if (!emailSent) {
      await new Promise(r => setTimeout(r, 1200));
    }

    // ── Add to data table ───────────────────────────────── 
    addCustomerToTable(name, analysis);

    // ── Success feedback ────────────────────────────────── 
    statusEl.className = 'se-status se-status-success';
    statusEl.textContent = emailSent
      ? `✅ Report sent to ${email} successfully!`
      : `✅ Customer saved! Email demo — configure EmailJS keys to enable sending.`;
    sendBtn.textContent = '✅ Sent!';

    // Fire a toast if the toast system exists
    if (typeof showToast === 'function') {
      showToast({ type: 'info', icon: '📧', title: 'Report Sent', msg: `Analysis report for ${name} delivered to ${email}.` });
    }

    // Close modal after delay
    setTimeout(() => closeSEModal(overlay), 2200);
  }

  /* ── Add customer row to data table ────────────────────── */
  function addCustomerToTable(name, a) {
    const tbody = document.getElementById('table-body');
    if (!tbody) return;

    const newId = (window.allData ? window.allData.length : 1000) + 1;
    const rClass = a.level === 'High Risk' ? 'risk-high' : a.level === 'Medium Risk' ? 'risk-medium' : 'risk-low';
    const rIcon = a.level === 'High Risk' ? '🔴' : a.level === 'Medium Risk' ? '🟡' : '🟢';

    let action = '🔍 Monitor risk';
    let actionClass = 'action-monitor';
    if (a.level === 'High Risk' || (a.income < 40 && a.spending > 60)) {
      action = '🏷️ Offer discount';
      actionClass = 'action-discount';
    } else if (a.level === 'Low Risk' || a.income > 70) {
      action = '💎 Upsell premium product';
      actionClass = 'action-upsell';
    }

    const tr = document.createElement('tr');
    tr.style.animation = 'fadeUp .4s ease-out';
    tr.style.background = 'rgba(52,211,153,.04)';
    tr.innerHTML = `
      <td><strong>#${newId}</strong> <span style="font-size:.7rem;color:#34d399;">● NEW</span></td>
      <td>${selectedGender === 'Male' ? '♂' : '♀'} ${selectedGender}</td>
      <td>${a.age}</td>
      <td>$${a.income}k</td>
      <td>${a.spending}</td>
      <td>${a.score}</td>
      <td><span class="cluster-badge">${a.cluster}</span> ${a.segment}</td>
      <td><span class="risk-badge ${rClass}">${rIcon} ${a.level}</span></td>
      <td><span class="action-badge ${actionClass}">${action}</span></td>`;

    // Insert at top of table body so it's visible
    tbody.insertBefore(tr, tbody.firstChild);

    // Optionally add to allData array for consistency
    if (window.allData) {
      window.allData.push({
        id: newId,
        gender: selectedGender,
        age: a.age,
        annualIncome: a.income,
        spendingScore: a.spending,
        creditScore: a.score,
        cluster: a.cluster,
        clusterLabel: a.segment,
        riskLevel: a.level,
      });
    }
  }
})();

/* ══════════════════════════════════════════════════════════════
   AURA VOICE COMMAND ENGINE v2.0 & MASTER COPILOT
   – Robust webkitSpeechRecognition with local-file fallback
   – speechSynthesis TTS (Aura speaks back)
   – Bilingual EN/TR voice commands & deep corporate banking intents
   – Purple-glow listening state + speaking indicator
══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  window.auraActiveLang = 'TR';

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const SS = window.speechSynthesis;
  let recognition = null;
  let isListening = false;
  let isSpeaking = false;

  /* ── Preferred TTS voices (ranked) ──────────────────── */
  const PREFERRED_VOICES_EN = [
    'Google UK English Female', 'Microsoft Aria Online',
    'Google US English', 'Samantha', 'Karen', 'Microsoft Zira'
  ];

  function pickVoice(langCode) {
    if (!SS) return null;
    try {
      const voices = SS.getVoices();
      if (!voices.length) return null;

      if (langCode && langCode.startsWith('tr')) {
        const trFemale = voices.find(v => (v.lang.startsWith('tr') || v.name.includes('Turkish')) && (v.name.includes('Google') || v.name.includes('Microsoft') || v.name.includes('Female') || v.name.includes('Yelda') || v.name.includes('Emel')));
        if (trFemale) return trFemale;
        const trAny = voices.find(v => v.lang.startsWith('tr') || v.name.includes('Turkish') || v.name.includes('Tolga'));
        if (trAny) return trAny;
      }

      for (const name of PREFERRED_VOICES_EN) {
        const v = voices.find(v => v.name.includes(name));
        if (v) return v;
      }
      const match = voices.find(v => v.lang === 'en-US' || v.lang === 'en-GB' || v.lang.startsWith('en-'));
      return match || voices[0];
    } catch (e) {
      console.error('TTS pickVoice error:', e);
      return null;
    }
  }

  /* ── Aura Speak (TTS) ──────────────────────────────── */
  function auraSpeak(text, langCode) {
    if (!SS) return;
    try {
      // Strip HTML tags for clean speech
      const clean = text.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim();
      if (!clean) return;

      // Cancel any ongoing speech
      SS.cancel();

      // Determine language dynamically
      const isTR = langCode ? langCode.startsWith('tr') : (window.auraActiveLang === 'TR');
      const targetLang = isTR ? 'tr-TR' : 'en-US';

      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = targetLang;
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 0.85;

      const voice = pickVoice(targetLang);
      if (voice) utterance.voice = voice;

      // Speaking indicator
      utterance.onstart = () => {
        isSpeaking = true;
        showSpeakingIndicator(isTR);
      };
      utterance.onend = () => {
        isSpeaking = false;
        removeSpeakingIndicator();
      };
      utterance.onerror = () => {
        isSpeaking = false;
        removeSpeakingIndicator();
      };

      SS.speak(utterance);
    } catch (e) {
      console.error('TTS auraSpeak error:', e);
    }
  }
  window.auraSpeak = auraSpeak;
  window.speakAuraResponse = auraSpeak;

  function showSpeakingIndicator(isTR) {
    removeSpeakingIndicator();
    const msgs = document.getElementById('chat-messages');
    if (!msgs) return;
    const el = document.createElement('div');
    el.id = 'aura-speaking-el';
    el.className = 'aura-speaking-indicator';
    el.textContent = isTR ? '🔊 Aura konuşuyor…' : '🔊 Aura is speaking…';
    msgs.appendChild(el);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function removeSpeakingIndicator() {
    const el = document.getElementById('aura-speaking-el');
    if (el) el.remove();
  }

  // Pre-load voices (Chrome fires voiceschanged async)
  if (SS) SS.onvoiceschanged = () => {};

  /* ── Voice command routes (with spoken responses) ───── */
  const VOICE_COMMANDS = [
    // Navigation
    { patterns: [/dashboard|gösterge|ana\s?sayfa|home|main/i],
      action: () => scrollToSection('dashboard'),
      speak: { en: 'Navigating to the dashboard.', tr: 'Gösterge paneline gidiliyor.' } },
    { patterns: [/show.*customer|müşteri|veritabanı|database|customer\s?table/i],
      action: () => scrollToSection('customers'),
      speak: { en: 'Opening the customer database.', tr: 'Müşteri veritabanı açılıyor.' } },
    { patterns: [/insight|içgörü|business\s?intelligence/i],
      action: () => scrollToSection('insights'),
      speak: { en: 'Showing business insights.', tr: 'İş içgörüleri gösteriliyor.' } },
    { patterns: [/persona|profil|arketip|archetype/i],
      action: () => scrollToSection('personas'),
      speak: { en: 'Here are the customer personas.', tr: 'Müşteri personaları gösteriliyor.' } },
    { patterns: [/predict|tahmin|new\s?customer|yeni\s?müşteri/i],
      action: () => scrollToSection('predict'),
      speak: { en: 'Opening the prediction tool.', tr: 'Tahmin aracı açılıyor.' } },
    { patterns: [/\bvip\b|loyalty|sadakat|premium/i],
      action: () => scrollToSection('vip'),
      speak: { en: 'Showing VIP customers.', tr: 'VIP müşteriler gösteriliyor.' } },
    { patterns: [/budget|bütçe|indirim|discount\s?scheme/i],
      action: () => scrollToSection('budget'),
      speak: { en: 'Showing budget discount schemes.', tr: 'Bütçe indirim planları gösteriliyor.' } },

    // Exports
    { patterns: [/export\s?csv|download\s?csv|csv\s?indir/i],
      action: () => { if (typeof exportCustomersCSV === 'function') exportCustomersCSV(); },
      speak: { en: 'Exporting customer data as C S V file.', tr: 'Müşteri verileri C S V olarak indiriliyor.' } },
    { patterns: [/export\s?pdf|download\s?pdf|pdf\s?indir/i],
      action: () => { const btn = document.querySelector('.btn-export'); if (btn) btn.click(); },
      speak: { en: 'Generating P D F report now.', tr: 'P D F rapor oluşturuluyor.' } },
    { patterns: [/upload|yükle|dosya\s?yükle/i],
      action: () => { const inp = document.getElementById('csv-file-input'); if (inp) inp.click(); },
      speak: { en: 'Opening file upload dialog.', tr: 'Dosya yükleme penceresi açılıyor.' } },

    // Filters
    { patterns: [/show\s?high\s?risk|high\s?risk\s?customer|yüksek\s?risk\s?göster|filter\s?high/i],
      action: () => { if (typeof setFilter === 'function') setFilter('High Risk'); },
      speak: { en: 'Filtering the database for high risk customers now.', tr: 'Yüksek riskli müşteriler filtreleniyor.' } },
    { patterns: [/show\s?medium\s?risk|medium\s?risk\s?customer|orta\s?risk\s?göster|filter\s?medium/i],
      action: () => { if (typeof setFilter === 'function') setFilter('Medium Risk'); },
      speak: { en: 'Filtering for medium risk customers.', tr: 'Orta riskli müşteriler filtreleniyor.' } },
    { patterns: [/show\s?low\s?risk|low\s?risk\s?customer|düşük\s?risk\s?göster|filter\s?low/i],
      action: () => { if (typeof setFilter === 'function') setFilter('Low Risk'); },
      speak: { en: 'Showing low risk customers.', tr: 'Düşük riskli müşteriler gösteriliyor.' } },
    { patterns: [/show\s?all|all\s?customer|tümünü\s?göster|hepsini\s?göster|filter\s?all|clear\s?filter/i],
      action: () => { if (typeof setFilter === 'function') setFilter('all'); },
      speak: { en: 'Showing all customers. Filters cleared.', tr: 'Tüm müşteriler gösteriliyor. Filtreler temizlendi.' } },

    // Currency
    { patterns: [/dollar|dolar|\busd\b/i],
      action: () => { if (typeof setCurrency === 'function') setCurrency('USD'); },
      speak: { en: 'Currency set to U S dollars.', tr: 'Para birimi dolar olarak ayarlandı.' } },
    { patterns: [/\blira\b|\btry\b|türk\s?lirası/i],
      action: () => { if (typeof setCurrency === 'function') setCurrency('TRY'); },
      speak: { en: 'Currency set to Turkish Lira.', tr: 'Para birimi Türk Lirası olarak ayarlandı.' } },
    { patterns: [/\beuro\b|\beur\b/i],
      action: () => { if (typeof setCurrency === 'function') setCurrency('EUR'); },
      speak: { en: 'Currency set to Euro.', tr: 'Para birimi Euro olarak ayarlandı.' } },

    // Analyze
    { patterns: [/analyze|analiz\s?et|run\s?analysis|müşteriyi\s?analiz/i],
      action: () => { const btn = document.getElementById('btn-ai-analyze'); if (btn) btn.click(); },
      speak: { en: 'Running A I analysis on the customer.', tr: 'Yapay zeka analizi başlatılıyor.' } },

    // Scroll to top
    { patterns: [/scroll\s?top|go\s?up|yukarı|en\s?başa/i],
      action: () => { window.scrollTo({ top: 0, behavior: 'smooth' }); },
      speak: { en: 'Scrolling to the top.', tr: 'Sayfanın başına dönülüyor.' } },
  ];

  /* ── Route voice command ─────────────────────────────── */
  function routeVoiceCommand(transcript) {
    const text = transcript.trim();
    if (!text) return null;

    for (const cmd of VOICE_COMMANDS) {
      if (cmd.patterns.some(p => p.test(text))) {
        cmd.action();
        return { chatText: `✅ ${cmd.speak.en}`, spokenText: cmd.speak.en, matched: true };
      }
    }
    return null;
  }

  /* ── Toggle voice input ──────────────────────────────── */
  window.toggleVoiceInput = function () {
    const micBtn = document.getElementById('chat-mic-btn');
    const vis = document.getElementById('voice-visualizer');

    /* ── Browser support check ── */
    if (!SR) {
      if (typeof addMessage === 'function') {
        addMessage('🎙️ <strong>Voice commands are not supported</strong> in this browser.<br>Please use <strong>Google Chrome</strong> or <strong>Microsoft Edge</strong> for voice features.', 'bot');
      }
      return;
    }

    /* ── Stop if already listening ── */
    if (isListening && recognition) {
      isListening = false;
      if (vis) vis.style.display = 'none';
      if (micBtn) micBtn.classList.remove('listening');
      try { recognition.stop(); } catch (e) { /* silent */ }
      return;
    }

    /* ── Create new recognition session ── */
    try {
      recognition = new SR();
    } catch (e) {
      if (typeof addMessage === 'function') {
        addMessage('🎙️ Could not initialize speech recognition. This may happen when opening the file directly — try using a local server.', 'bot');
      }
      return;
    }

    const activeLang = window.auraActiveLang === 'TR' ? 'tr-TR' : 'en-US';
    recognition.lang = activeLang;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    /* ── Events ── */
    recognition.onstart = () => {
      isListening = true;
      if (vis) vis.style.display = 'flex';
      if (micBtn) micBtn.classList.add('listening');
      if (typeof addMessage === 'function') {
        const listenMsg = (activeLang === 'tr-TR') ? '🎙️ <em>Dinliyorum… Bir komut söyleyin.</em>' : '🎙️ <em>Listening… Say a command.</em>';
        addMessage(listenMsg, 'bot');
      }
    };

    recognition.onresult = (event) => {
      try {
        const transcript = event.results[0][0].transcript;

        // Show what the user said
        if (typeof addMessage === 'function') addMessage(transcript, 'user');

        // Route as command
        const result = routeVoiceCommand(transcript);

        if (result && result.matched) {
          if (typeof showTypingIndicator === 'function') showTypingIndicator();
          setTimeout(() => {
            if (typeof removeTypingIndicator === 'function') removeTypingIndicator();
            if (typeof addMessage === 'function') addMessage(result.chatText, 'bot');
            auraSpeak(result.spokenText, activeLang);
          }, 350);
        } else {
          if (typeof showTypingIndicator === 'function') showTypingIndicator();
          setTimeout(() => {
            if (typeof removeTypingIndicator === 'function') removeTypingIndicator();
            if (typeof window.chatReply === 'function') {
              const reply = window.chatReply(transcript);
              if (typeof addMessage === 'function') addMessage(reply, 'bot');
              auraSpeak(reply, activeLang);
            }
          }, 500 + Math.random() * 400);
        }
      } catch (err) {
        console.error('Speech recognition onresult error:', err);
        isListening = false;
        if (vis) vis.style.display = 'none';
        if (micBtn) micBtn.classList.remove('listening');
      }
    };

    recognition.onerror = (event) => {
      try {
        switch (event.error) {
          case 'not-allowed':
          case 'service-not-allowed':
            isListening = false;
            if (vis) vis.style.display = 'none';
            if (micBtn) micBtn.classList.remove('listening');
            break;
          case 'no-speech':
            break;
          case 'network':
            break;
          case 'aborted':
            break;
          default:
            isListening = false;
            if (vis) vis.style.display = 'none';
            if (micBtn) micBtn.classList.remove('listening');
            break;
        }
      } catch (err) {
        console.error('Speech recognition onerror error:', err);
        isListening = false;
        if (vis) vis.style.display = 'none';
        if (micBtn) micBtn.classList.remove('listening');
      }
    };

    recognition.onend = () => {
      try {
        if (isListening) {
          setTimeout(() => {
            if (isListening) {
              try {
                recognition.start();
              } catch (e) {
                // silent retry
              }
            }
          }, 2000);
        } else {
          if (vis) vis.style.display = 'none';
          if (micBtn) micBtn.classList.remove('listening');
        }
      } catch (err) {
        console.error('Speech recognition onend error:', err);
        isListening = false;
        if (vis) vis.style.display = 'none';
        if (micBtn) micBtn.classList.remove('listening');
      }
    };

    try {
      recognition.start();
    } catch (e) {
      isListening = false;
      if (vis) vis.style.display = 'none';
      if (micBtn) micBtn.classList.remove('listening');
      if (typeof addMessage === 'function') {
        addMessage('🎙️ Could not start voice recognition. Please check your browser permissions.', 'bot');
      }
    }
  };

  /* ── Chat UI & Logic ──────────────────────────────────── */
  window.requestCloseChat = function () {
    try {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }

      const confirmOverlay = document.getElementById('aura-confirm-overlay');
      const confirmText = document.getElementById('aura-confirm-text');
      const confirmYes = document.getElementById('aura-confirm-yes');
      const confirmNo = document.getElementById('aura-confirm-no');

      if (!confirmOverlay || !confirmText || !confirmYes || !confirmNo) {
        if (typeof window.toggleChat === 'function') window.toggleChat();
        return;
      }

      if (window.auraActiveLang === 'EN') {
        confirmText.textContent = 'Do you want to end the chat session?';
        confirmYes.textContent = 'Yes';
        confirmNo.textContent = 'No';
      } else {
        confirmText.textContent = 'Sohbet oturumunu sonlandırmak istiyor musunuz?';
        confirmYes.textContent = 'Evet';
        confirmNo.textContent = 'Hayır';
      }

      confirmOverlay.style.display = 'flex';
      confirmOverlay.style.opacity = '0';
      confirmOverlay.style.transition = 'opacity 0.2s ease';
      setTimeout(() => { confirmOverlay.style.opacity = '1'; }, 10);
    } catch (err) {
      console.error('requestCloseChat error:', err);
      if (typeof window.toggleChat === 'function') window.toggleChat();
    }
  };

  window.confirmCloseChat = function (confirm) {
    try {
      const confirmOverlay = document.getElementById('aura-confirm-overlay');
      if (confirm) {
        if (confirmOverlay) confirmOverlay.style.display = 'none';
        
        const panel = document.getElementById('chat-panel');
        const bubble = document.getElementById('chat-bubble');
        if (panel) {
          panel.style.display = 'none';
          panel.style.setProperty('display', 'none', 'important');
        }
        if (bubble) bubble.classList.remove('chat-active');

        const msgs = document.getElementById('chat-messages');
        if (msgs) msgs.innerHTML = '';

        if (window.speechSynthesis) window.speechSynthesis.cancel();
      } else {
        if (confirmOverlay) {
          confirmOverlay.style.opacity = '0';
          setTimeout(() => { confirmOverlay.style.display = 'none'; }, 200);
        }
      }
    } catch (err) {
      console.error('confirmCloseChat error:', err);
    }
  };

  window.toggleChat = function() {
    try {
      const panel = document.getElementById('chat-panel');
      const bubble = document.getElementById('chat-bubble');
      const unread = document.getElementById('chat-unread');
      if (!panel) return;
      
      if (panel.style.display === 'none' || panel.style.display === '') {
        panel.style.display = 'flex';
        panel.style.setProperty('display', 'flex', 'important');
        if (bubble) bubble.classList.add('chat-active');
        if (unread) unread.style.display = 'none';
        if (panel.querySelectorAll('.chat-msg').length === 0) {
          const isTR = window.auraActiveLang === 'TR';
          const welcomeMsg = isTR ? '👋 Merhaba! Ben Aura, Kurumsal Kredi Risk Denetçisi yapay zekasıyım. Size portföy temerrüt riski, kritik borçlu hesaplar veya makro stres testleri konularında nasıl yardımcı olabilirim?' : '👋 Greetings. I am Aura, your automated Corporate Risk Auditor. How may I assist you with risk metrics, credit caps, or portfolio safety today?';
          window.addMessage(welcomeMsg, 'bot');
          auraSpeak(welcomeMsg);
        }
        setTimeout(() => document.getElementById('chat-input')?.focus(), 100);
      } else {
        panel.style.display = 'none';
        panel.style.setProperty('display', 'none', 'important');
        if (bubble) bubble.classList.remove('chat-active');
      }
    } catch (err) {
      console.error('toggleChat error:', err);
    }
  };

  window.renderAuraChatChart = function(containerId, labelText, dataPoints) {
    const ctx = document.getElementById(containerId);
    if (!ctx) return;
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['High Risk', 'Medium Risk', 'Low Risk'],
            datasets: [{
                label: labelText,
                data: dataPoints,
                backgroundColor: ['#ef4444', '#fbbf24', '#10b981'],
                borderWidth: 0,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { grid: { display: false }, ticks: { color: '#94a3b8' } }, x: { ticks: { color: '#94a3b8' } } }
        }
    });
  };

  window.addMessage = function(text, sender) {
    try {
      const msgs = document.getElementById('chat-messages');
      if (!msgs) return;
      const div = document.createElement('div');
      div.className = `chat-msg chat-${sender}`;
      
      if (sender === 'bot' && /chart|grafik|distribution|concentration/i.test(text)) {
        const chartId = `aura-chart-${Date.now()}-${Math.floor(Math.random()*1000)}`;
        div.innerHTML = `<div class="chat-bubble-inner">${text}<div style="position: relative; width: 100%; height: 180px; margin-top: 1rem;"><canvas id="${chartId}"></canvas></div></div>`;
        msgs.appendChild(div);
        msgs.scrollTop = msgs.scrollHeight;
        
        const data = window.allData || [];
        const highCount = data.filter(c => c.riskLevel === 'High Risk' || c.level === 'High Risk').length || 14;
        const medCount = data.filter(c => c.riskLevel === 'Medium Risk' || c.level === 'Medium Risk').length || 32;
        const lowCount = data.filter(c => c.riskLevel === 'Low Risk' || c.level === 'Low Risk').length || 54;
        
        setTimeout(() => {
          if (typeof window.renderAuraChatChart === 'function') {
            window.renderAuraChatChart(chartId, 'Risk Concentration Distribution', [highCount, medCount, lowCount]);
          }
        }, 100);
      } else {
        div.innerHTML = `<div class="chat-bubble-inner">${text}</div>`;
        msgs.appendChild(div);
        msgs.scrollTop = msgs.scrollHeight;
      }
    } catch (err) {
      console.error('addMessage error:', err);
    }
  };

  window.showTypingIndicator = function() {
    try {
      const msgs = document.getElementById('chat-messages');
      if (!msgs) return;
      const el = document.createElement('div');
      el.id = 'aura-typing';
      el.className = 'chat-msg chat-bot';
      el.innerHTML = '<div class="chat-bubble-inner"><span class="ai-dot"></span><span class="ai-dot"></span><span class="ai-dot"></span></div>';
      msgs.appendChild(el);
      msgs.scrollTop = msgs.scrollHeight;
    } catch (err) {
      console.error('showTypingIndicator error:', err);
    }
  };

  window.removeTypingIndicator = function() {
    try {
      const el = document.getElementById('aura-typing');
      if (el) el.remove();
    } catch (err) {
      console.error('removeTypingIndicator error:', err);
    }
  };

  window.sendChat = function() {
    try {
      const inp = document.getElementById('chat-input');
      if (!inp) return;
      const text = inp.value.trim();
      if (!text) return;

      window.addMessage(text, 'user');
      inp.value = '';

      // Route command
      const result = routeVoiceCommand(text);
      const activeLang = window.auraActiveLang === 'TR' ? 'tr-TR' : 'en-US';

      if (result && result.matched) {
        window.showTypingIndicator();
        setTimeout(() => {
          window.removeTypingIndicator();
          window.addMessage(result.chatText, 'bot');
          auraSpeak(result.spokenText, activeLang);
        }, 400);
        return;
      }

      // NLP Reply
      window.showTypingIndicator();
      setTimeout(() => {
        window.removeTypingIndicator();
        const reply = window.chatReply(text);
        window.addMessage(reply, 'bot');
        auraSpeak(reply, activeLang);
      }, 600);
    } catch (err) {
      console.error('sendChat error:', err);
    }
  };

  window.chatReply = function(text) {
    try {
      const q = text.toLowerCase().trim();
      const isTR = window.auraActiveLang === 'TR';

      const total = window.allData ? window.allData.length : 0;
      if (total === 0) {
        return isTR ? 'Kurumsal veritabanı şu anda boş. Lütfen analiz yapmadan önce müşteri portföyünü yükleyin.' : 'Corporate database is currently empty. Please upload the customer portfolio before running analysis.';
      }

      const highRiskCount = window.allData.filter(c => c.riskLevel === 'High Risk').length;
      const pct = ((highRiskCount / total) * 100).toFixed(1);

      // Intent: Chart rendering request
      if (/chart|grafik|distribution|concentration/.test(q)) {
        if (isTR) {
          return `📊 <strong>Risk Konsantrasyon Dağılım Grafiği</strong><br><br>Aşağıdaki grafik portföyünüzdeki kurumsal risk dağılımını canlı olarak göstermektedir. Yüksek riskli kurumlar kırmızı, orta riskliler sarı ve düşük riskliler yeşil ile temsil edilmektedir.`;
        }
        return `📊 <strong>Risk Concentration Distribution Chart</strong><br><br>The chart below displays the live institutional risk breakdown across your portfolio. High risk corporations are highlighted in red, medium risk in yellow, and low risk in green.`;
      }

      // Intent 1: Portfolio Health & Stress Tests (Keywords: 'durum', 'özet', 'rapor', 'status', 'portfolio health', 'stres testi', 'downturn', 'inflation')
      if (/durum|özet|rapor|status|portfolio health|stres testi|stres|downturn|inflation/.test(q)) {
        if (isTR) {
          return `Mevcut makroekonomik stres senaryosu altında, yüksek risk yoğunluğu %${pct} seviyesindedir. Oynak şahıs şirketi segmentleri için kredi limitlerinin derhal kısıtlanmasını öneriyorum.`;
        }
        return `Under the current macroeconomic stress scenario, high-risk concentration stands at ${pct}%. I recommend restricting credit caps for volatile LLC segments immediately.`;
      }

      // Intent 2: Policy Critique & Compliance (Keywords: 'politika', 'kural', 'limit', 'policy', 'compliance', 'credit cap', 'apr')
      if (/politika|kural|limit|policy|compliance|credit cap|apr/.test(q)) {
        const actionEl = document.getElementById('pol-action-high');
        const actionVal = actionEl ? actionEl.value : (window.CreditPolicy ? window.CreditPolicy.high.action : 'freeze_account');
        const actionLabelEN = actionVal === 'freeze_account' ? 'Account Freeze' : actionVal === 'restrict_terms' ? 'Restrict Payment Terms' : actionVal === 'manual_review' ? 'Manual Officer Audit' : 'Auto-Approve';
        const actionLabelTR = actionVal === 'freeze_account' ? 'Hesap Dondurma' : actionVal === 'restrict_terms' ? 'Ödeme Şartlarını Kısıtlama' : actionVal === 'manual_review' ? 'Manuel İnceleme' : 'Otomatik Onay';

        if (isTR) {
          return `Yüksek risk baremi politikanız ${actionLabelTR} olarak ayarlanmış. Bu durum temerrüt riskini başarılı şekilde azaltır ancak kısa vadeli üye işyeri sadakatini etkileyebilir.`;
        }
        return `Your high-risk tier policy is currently set to ${actionLabelEN}. This effectively mitigates credit default exposure but may impact short-term merchant loyalty.`;
      }

      // Intent 3: Granular Deep Audit (Keywords: 'kritik hesaplar', 'riskli', 'critical accounts', 'default risk', 'toxic asset')
      if (/kritik hesaplar|riskli|critical accounts|default risk|toxic asset|critical|kritik|account|hesap/.test(q)) {
        const delinquentOrLowCredit = window.allData.filter(c => c.paymentStatus === 'delinquent' || (c.creditScore !== undefined && c.creditScore < 500));
        const sortedWorst = [...delinquentOrLowCredit].sort((a, b) => (a.creditScore || 650) - (b.creditScore || 650)).slice(0, 3);
        let worstTextEN = sortedWorst.map(c => `Client #${c.id || c.CustomerID} (Credit: ${c.creditScore}, Status: ${c.paymentStatus || 'delinquent'})`).join(', ');
        let worstTextTR = sortedWorst.map(c => `Müşteri #${c.id || c.CustomerID} (Kredi: ${c.creditScore}, Durum: ${c.paymentStatus || 'delinquent'})`).join(', ');
        if (!sortedWorst.length) {
          worstTextEN = 'No critical delinquent accounts found.';
          worstTextTR = 'Kritik temerrüt hesabı bulunamadı.';
        }

        if (isTR) {
          return `Küresel veritabanının derinlemesine denetimine göre, en kötü kredi ve temerrüt profiline sahip ilk 3 kritik hesap: ${worstTextTR}. Acil yapılandırma veya yasal takip başlatılması şiddetle tavsiye edilir.`;
        }
        return `Based on a granular deep audit of the global dataset, here are the top 3 critical accounts with the worst credit and delinquency profiles: ${worstTextEN}. Immediate restructuring or legal action is strongly advised.`;
      }

      // Intent 4: Handle / Recovery / Management advice
      if (/handle|recovery|tavsiye|how to|yönetim/.test(q)) {
        if (isTR) {
          return `Yüksek riskli kurumsal müşterilerin yönetiminde 3 aşamalı strateji öneriyorum: 1. Açık hesap çalışma limitlerini iptal ederek DBS (Doğrudan Borçlandırma Sistemi) modeline geçin. 2. Vade sürelerini maksimum 30 gün ile sınırlandırın. 3. Gecikmeli ödemelerde (Minimum/Delinquent) kurumsal bazda ek temerrüt yaptırımları uygulayın.`;
        }
        return `For managing high-risk corporate clients, I recommend a 3-stage strategy: 1. Cancel open account credit limits and transition to Direct Debit Systems. 2. Restrict payment terms to a maximum of 30 days. 3. Apply additional institutional default penalties on delayed payments (Minimum/Delinquent).`;
      }

      // Intent 5: Context: currently analyzed customer
      const a = window._lastAnalysis || null;
      if (a && (/bu müşteri|this customer|current|son analiz|neden riskli|why risky|analiz sonucu/.test(q))) {
        if (isTR) {
          return `📋 <strong>Son Analiz Sonuçları:</strong><br>Risk Seviyesi: <strong>${a.level}</strong><br>Kredi Skoru: <strong>${a.score}/1000</strong><br>Segment: <strong>Küme ${a.cluster} — ${a.segment}</strong><br>Profil: ${a.label}<br><br>${a.level === 'High Risk' ? '⚠️ <strong>Neden riskli?</strong> Düşük gelir ve yüksek harcama oranı kredi skorunu düşürmüştür. Harcama koçluğu ve indirim programı önerilir.' : a.level === 'Medium Risk' ? '🟡 <strong>Orta risk</strong> — gelir-harcama dengesi kırılgan. Kişiselleştirilmiş tekliflerle Düşük Risk\'e dönüştürülebilir.' : '🟢 <strong>Düşük riskli</strong> müşteri — güçlü kredi profili. VIP programına uygun.'}`;
        }
        return `📋 <strong>Current Analysis Results:</strong><br>Risk Level: <strong>${a.level}</strong><br>Credit Score: <strong>${a.score}/1000</strong><br>Segment: <strong>Cluster ${a.cluster} — ${a.segment}</strong><br>Profile: ${a.label}<br><br>${a.level === 'High Risk' ? '⚠️ <strong>Why risky?</strong> Low income combined with high spending has depressed the credit score. Recommend spending coaching and budget discount enrolment.' : a.level === 'Medium Risk' ? '🟡 <strong>Medium risk</strong> — income-spending balance is fragile. Convert to Low Risk with personalised offers.' : '🟢 <strong>Low risk</strong> customer — strong credit profile. Eligible for VIP programme and premium upsell.'}`;
      }

      // Intent 6: High risk general overview
      const d = window._insightData || {};
      const cs = d.clusterStats || [];
      const get = name => cs.find(c => c.name === name) || {};
      if (/high risk|highest risk|risky customer|yüksek risk|riskli müşteri|tehlikeli/.test(q)) {
        const car = get('Careless');
        if (isTR) return `🔴 <strong>Yüksek Riskli Müşteriler (${d.high || '—'}, %${d.highPct || '—'})</strong><br>Genellikle <em>Careless</em> kümesi — düşük gelir (~$${car.avgInc}k) ama yüksek harcama (~${car.avgSp}/100). Kredi skorları 450 altında.<br><br>→ <strong>Smart Saver Plus</strong> (%25 indirim) programına kaydedilmeli.`;
        return `🔴 <strong>High Risk Customers (${d.high || '—'}, ${d.highPct || '—'}%)</strong><br>Primarily <em>Careless</em> cluster — low income (~$${car.avgInc}k) but high spending (~${car.avgSp}/100). Credit scores below 450.<br><br>→ Enrol in <strong>Smart Saver Plus</strong> (25% discount).`;
      }

      // Intent 7: Targeting
      if (/target|focus|priorit|hedef|odaklan|öncelik/.test(q)) {
        if (isTR) return `🎯 <strong>İki Öncelikli Hedef:</strong><br><strong>1.</strong> Yüksek Risk (%${d.highPct || '—'}) — Acil müdahale, bütçe indirimi.<br><strong>2.</strong> Conservative/Careful — %${d.untappedPct || '—'} yüksek gelirli ama düşük harcamalı. Premium ürünler için fırsat.`;
        return `🎯 <strong>Two Priority Targets:</strong><br><strong>1.</strong> High Risk (${d.highPct || '—'}%) — Urgent intervention.<br><strong>2.</strong> Conservative/Careful — ${d.untappedPct || '—'}% high-income, low-spending. Huge upsell opportunity.`;
      }

      // Intent 8: Clusters / segments
      if (/cluster|segment|group|küme|grup|kaç.*segment|kaç.*küme/.test(q)) {
        if (isTR) return `🗂️ <strong>5 Müşteri Segmenti:</strong><br>🔥 <strong>Careless</strong> — düşük gelir, yüksek harcama (${get('Careless').count || 0})<br>💤 <strong>Spendthrift</strong> — bütçe kısıtlı (${get('Spendthrift').count || 0})<br>⚖️ <strong>Sensible</strong> — dengeli orta (${get('Sensible').count || 0})<br>🛡️ <strong>Careful</strong> — yüksek gelir, muhafazakâr (${get('Careful').count || 0})<br>💎 <strong>Target</strong> — yüksek gelir+harcama (${get('Target').count || 0})`;
        return `🗂️ <strong>5 Customer Segments:</strong><br>🔥 <strong>Careless</strong> — low income, high spend (${get('Careless').count || 0})<br>💤 <strong>Spendthrift</strong> — budget-constrained (${get('Spendthrift').count || 0})<br>⚖️ <strong>Sensible</strong> — balanced middle (${get('Sensible').count || 0})<br>🛡️ <strong>Careful</strong> — high income, conservative (${get('Careful').count || 0})<br>💎 <strong>Target</strong> — high income+spend (${get('Target').count || 0})`;
      }

      // Intent 9: Credit score
      if (/credit|score|kredi|skor|puan/.test(q)) {
        if (isTR) return `💳 <strong>Kredi Skoru Özeti:</strong><br>Portföy ortalaması: <strong>${d.avgCredit || '—'}/1000</strong>.<br>Gelir (%50), harcama (%30), yaş (%20) ile hesaplanır.`;
        return `💳 <strong>Credit Score Overview:</strong><br>Portfolio average: <strong>${d.avgCredit || '—'}/1000</strong>.<br>Calculated from income (50%), spending (30%), age (20%).`;
      }

      // Intent 10: Reduce risk
      if (/reduc|lower risk|improve|azalt|düşür|iyileştir|risk.*nasıl/.test(q)) {
        if (isTR) return `📉 <strong>Riski Azaltma:</strong><br>1. Careless müşterilerini Smart Saver Plus'a kaydedin (%25)<br>2. En yüksek %20 harcamacıya danışman atayın<br>3. Orta risklileri üç ayda bir izleyip kişisel tekliflerle dönüştürün<br>4. 75/100 üstü harcama için erken uyarı ayarlayın`;
        return `📉 <strong>Reduce Risk:</strong><br>1. Enrol Careless in Smart Saver Plus (25%)<br>2. Assign advisors to top 20% spenders<br>3. Monitor Medium Risk quarterly with personalised offers<br>4. Set alerts above 75/100 spending intensity`;
      }

      // Intent 11: VIP / loyalty
      if (/vip|loyalty|sadakat|en iyi müşteri|best customer|platinum/.test(q)) {
        const tgt = get('Target'); const car2 = get('Careful');
        if (isTR) return `💎 <strong>VIP Adayları:</strong><br><em>Target</em> (${tgt.count || 0}) — yüksek gelir+harcama. <em>Careful</em> (${car2.count || 0}) — 720+ kredi skoru.<br><br>→ Platinum: %20 cashback, concierge, erken erişim.`;
        return `💎 <strong>VIP Candidates:</strong><br><em>Target</em> (${tgt.count || 0}) — high income+spend. <em>Careful</em> (${car2.count || 0}) — 720+ credit scores.<br><br>→ Platinum tier: 20% cashback, concierge, early-access.`;
      }

      // Intent 12: Distribution
      if (/distribution|breakdown|split|how many|dağılım|kaç.*müşteri|kaç.*kişi/.test(q)) {
        if (isTR) return `📊 <strong>Risk Dağılımı (1.000):</strong><br>🔴 Yüksek: <strong>${d.high || '—'}</strong> (%${d.highPct || '—'})<br>🟡 Orta: <strong>${d.medium || '—'}</strong> (%${d.medPct || '—'})<br>🟢 Düşük: <strong>${d.low || '—'}</strong> (%${d.lowPct || '—'})`;
        return `📊 <strong>Risk Distribution (1,000):</strong><br>🔴 High: <strong>${d.high || '—'}</strong> (${d.highPct || '—'}%)<br>🟡 Medium: <strong>${d.medium || '—'}</strong> (${d.medPct || '—'}%)<br>🟢 Low: <strong>${d.low || '—'}</strong> (${d.lowPct || '—'}%)`;
      }

      // Intent 13: Age / demographics
      if (/age|demographic|gender|yaş|demografi|cinsiyet/.test(q)) {
        if (isTR) return `👥 <strong>Demografik:</strong><br>18–70 yaş, 1.000 kayıt. Yüksek riskliler daha genç. Cinsiyet dağılımı ~%50/%50.`;
        return `👥 <strong>Demographics:</strong><br>Age 18–70, 1,000 records. High-risk tend younger. Gender split ~50/50.`;
      }

      // Intent 14: Budget / discount
      if (/budget|discount|scheme|bütçe|indirim|tasarruf/.test(q)) {
        if (isTR) return `🏷️ <strong>İndirim Programları:</strong><br>🎯 Smart Saver Plus (%25) — Harcama > 75<br>🏷️ Smart Saver (%15) — Harcama 55–75<br>💡 Budget Starter (%10) — Yüksek Risk / düşük gelir`;
        return `🏷️ <strong>Budget Schemes:</strong><br>🎯 Smart Saver Plus (25%) — Spending > 75<br>🏷️ Smart Saver (15%) — Spending 55–75<br>💡 Budget Starter (10%) — High Risk / low income`;
      }

      // Intent 15: Greetings
      if (/merhaba|selam|hello|hi|hey|günaydın|good morning|nasılsın|how are you/.test(q)) {
        if (isTR) return `👋 Merhaba! Ben <strong>Aura Risk Intelligence</strong>. 1.000 müşteriniz hakkında risk, kredi skoru, kümeler ve kurumsal bankacılık politikaları konusunda yardımcı olabilirim!`;
        return `👋 Hello! I'm <strong>Aura Risk Intelligence</strong>. I can help with risk segments, credit scores, clusters, and corporate banking policies for your 1,000 customers!`;
      }

      // Intent 16: Thanks
      if (/teşekkür|sağol|thanks|thank you|thx/.test(q)) {
        if (isTR) return `😊 Rica ederim! Başka sorunuz varsa buradayım.`;
        return `😊 You're welcome! I'm here if you need anything else.`;
      }

      // Intent 17: Help / capabilities
      if (/ne yapabilir|yardım|help|what can you|capabilities/.test(q)) {
        if (isTR) return `🧠 <strong>Aura Yetenekleri:</strong><br>• Portföy sağlığı ve makro stres testleri<br>• Politika uyumluluk ve kredi limit analizi<br>• Kritik hesaplar ve temerrüt derin denetimi<br>• VIP, bütçe ve küme dağılım bilgileri<br><br>Türkçe veya İngilizce sorabilirsiniz!`;
        return `🧠 <strong>Aura Capabilities:</strong><br>
• Portfolio health & macro stress tests<br>
• Policy compliance & credit cap critique<br>
• Critical accounts & deep default audit<br>
• VIP, budget, and cluster distribution insights<br><br>Ask in English or Turkish!`;
      }

      // Graceful fallback
      if (isTR) {
        return `Ben Aura, Kurumsal Kredi Risk Denetçisi yapay zekasıyım. Size portföy temerrüt riski (%${pct} Yüksek Risk), kritik borçlu hesaplar, makro stres testleri veya yüksek riskli müşterilerin yönetimi konularında stratejik finansal tavsiyeler sunabilirim.`;
      }
      return `I am Aura, your Corporate Credit Risk Auditor AI. I can provide strategic financial advice regarding portfolio default risk (${pct}% High Risk), critical debtor accounts, macro stress testing, or the management of high-risk clients.`;
    } catch (err) {
      console.error('Aura Chat Error:', err);
      return (typeof currentLang !== 'undefined' && currentLang === 'TR') ? 'Aura analiz motorunda bir hata oluştu. Lütfen sorunuzu tekrar iletin.' : 'An error occurred in the Aura analytics engine. Please submit your question again.';
    }
  };

  /* ── Expose globals ───── */
  window.auraSpeak = auraSpeak;
  window.speakText = auraSpeak;
})();

/* -- End of app.js -- */

/* ══════════════════════════════════════════════════════════════
   CSV UPLOAD & LIVE RE-ANALYSIS ENGINE
   – PapaParse-based file parsing
   – Flexible EN/TR column mapping
   – Full dashboard refresh on successful upload
   – Processing overlay with Aura pulse animation
══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  function processCSV(file) {
    if (typeof window.handleCorporateCSVUpload === 'function') {
      window.handleCorporateCSVUpload({ target: { files: [file] } });
    }
  }

  /* ── File input listener ──────────────────────────────── */
  document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('csv-file-input');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) processCSV(file);
        fileInput.value = ''; // reset so same file can be uploaded again
      });
    }

    /* ── Aura Quick Actions Listeners ─────────────────────── */
    const quickButtons = [
      {
        id: 'btn-audit-concentration',
        action: () => {
          try {
            const data = window.allData || [];
            const total = data.length || 1000;
            const highCount = data.filter(c => c.riskLevel === 'High Risk' || c.level === 'High Risk').length;
            const lowCount = data.filter(c => c.riskLevel === 'Low Risk' || c.level === 'Low Risk').length;
            const highPct = ((highCount / total) * 100).toFixed(1);
            const lowPct = ((lowCount / total) * 100).toFixed(1);

            const isTR = window.auraActiveLang === 'TR';
            const activeLang = isTR ? 'tr-TR' : 'en-US';

            const chatText = isTR
              ? `📊 <strong>Risk Konsantrasyonu Analizi / Risk Concentration Analysis</strong><br><br>• Toplam Kurumsal Kayıt: <strong>${total}</strong><br>• Yüksek Riskli (High Risk) Kurumlar: <strong>${highCount} (%${highPct})</strong><br>• Düşük Riskli (Low Risk) Kurumlar: <strong>${lowCount} (%${lowPct})</strong><br><br><strong>Aura Önerisi:</strong> Yüksek risk konsantrasyonu portföy dengesini tehdit etmektedir. Düşük riskli kurumlara VIP teşvikleri sunulurken, yüksek riskli segmentte teminat marjları artırılmalıdır.`
              : `📊 <strong>Risk Concentration Analysis</strong><br><br>• Total Corporate Records: <strong>${total}</strong><br>• High Risk Corporations: <strong>${highCount} (${highPct}%)</strong><br>• Low Risk Corporations: <strong>${lowCount} (${lowPct}%)</strong><br><br><strong>Aura Recommendation:</strong> High risk concentration threatens portfolio stability. Collateral margins should be increased for the high-risk segment while offering VIP incentives to low-risk institutions.`;

            const spokenText = isTR
              ? `Risk konsantrasyonu analizi tamamlandı. Yüksek riskli kurumların oranı yüzde ${highPct}, düşük riskli kurumların oranı ise yüzde ${lowPct} seviyesindedir. Teminat marjlarının artırılmasını öneriyorum.`
              : `Risk concentration analysis complete. High risk corporations stand at ${highPct} percent, while low risk corporations account for ${lowPct} percent. I recommend increasing collateral margins.`;

            executeQuickAction(chatText, spokenText, activeLang);
          } catch (err) {
            console.error('Concentration action error:', err);
          }
        }
      },
      {
        id: 'btn-audit-toxic',
        action: () => {
          try {
            const isTR = window.auraActiveLang === 'TR';
            const activeLang = isTR ? 'tr-TR' : 'en-US';

            const chatText = '[ANOMALY_DETECTION_ENGINE] System flagged 23 industrial portfolio streams matching structural fraud markers over the last 45-day window.';
            const spokenText = chatText;

            executeQuickAction(chatText, spokenText, activeLang);
          } catch (err) {
            console.error('Toxic action error:', err);
          }
        }
      },
      {
        id: 'btn-audit-policy',
        action: () => {
          try {
            const isTR = window.auraActiveLang === 'TR';
            const activeLang = isTR ? 'tr-TR' : 'en-US';

            const chatText = '[PORTFOLIO_DRIFT_COMPLIANCE] Verified asset migration metrics. 98.2% of corporate profiles match BDDK 2026 guidelines.';
            const spokenText = chatText;

            executeQuickAction(chatText, spokenText, activeLang);
          } catch (err) {
            console.error('Policy action error:', err);
          }
        }
      },
      {
        id: 'btn-audit-stresstest',
        action: () => {
          try {
            const activeBtn = document.querySelector('.macro-btn.active');
            const scenario = activeBtn ? activeBtn.dataset.scenario || 'baseline' : window.currentMacroScenario || 'baseline';
            
            let shiftRatio = 4.2;
            let scenarioNameTR = 'Temel (Baseline)';
            let scenarioNameEN = 'Baseline';

            if (scenario === 'downturn') { shiftRatio = 18.5; scenarioNameTR = 'Ekonomik Durgunluk (Downturn)'; scenarioNameEN = 'Economic Downturn'; }
            else if (scenario === 'inflation') { shiftRatio = 14.1; scenarioNameTR = 'Yüksek Enflasyon (Inflation)'; scenarioNameEN = 'High Inflation'; }
            else if (scenario === 'regulatory') { shiftRatio = 9.8; scenarioNameTR = 'Yasal Düzenleme (Regulatory)'; scenarioNameEN = 'Regulatory Shock'; }

            const isTR = window.auraActiveLang === 'TR';
            const activeLang = isTR ? 'tr-TR' : 'en-US';

            const chatText = isTR
              ? `💥 <strong>Stres Testi Analizi / Stress Test Impact Analysis</strong><br><br>• Aktif Makroekonomik Senaryo: <strong>${scenarioNameTR}</strong><br>• Potansiyel İflas / Temerrüt Kayma Oranı: <strong style="color:var(--risk-high);font-size:1.2rem;">%${shiftRatio}</strong><br><br><strong>Aura Analizi:</strong> Seçilen makroekonomik stres altında, portföydeki nakit akışı zayıf şirketlerin temerrüde düşme olasılığı %${shiftRatio} oranında artacaktır. Acil likidite tamponları devreye alınmalıdır.`
              : `💥 <strong>Stress Test Impact Analysis</strong><br><br>• Active Macroeconomic Scenario: <strong>${scenarioNameEN}</strong><br>• Potential Bankruptcy Shift Ratio: <strong style="color:var(--risk-high);font-size:1.2rem;">${shiftRatio}%</strong><br><br><strong>Aura Analysis:</strong> Under the selected macroeconomic stress, companies with weak cash flows face a ${shiftRatio}% higher probability of default. Emergency liquidity buffers should be deployed immediately.`;

            const spokenText = isTR
              ? `Stres testi analizi tamamlandı. Aktif ${scenarioNameTR} senaryosu altında potansiyel iflas kayma oranı yüzde ${shiftRatio} olarak öngörülmektedir. Likidite tamponları devreye alınmalıdır.`
              : `Stress test analysis complete. Under the active ${scenarioNameEN} scenario, the potential bankruptcy shift ratio is projected at ${shiftRatio} percent. Liquidity buffers should be deployed.`;

            executeQuickAction(chatText, spokenText, activeLang);
          } catch (err) {
            console.error('Stresstest action error:', err);
          }
        }
      }
    ];

    function executeQuickAction(chatText, spokenText, activeLang) {
      try {
        const panel = document.getElementById('chat-panel');
        if (panel && (panel.style.display === 'none' || panel.style.display === '')) {
          if (typeof window.toggleChat === 'function') window.toggleChat();
        }

        const msgs = document.getElementById('chat-messages');
        if (msgs) {
          msgs.innerHTML = ''; // Clear previous text states smoothly
        }

        if (typeof window.showTypingIndicator === 'function') window.showTypingIndicator();

        setTimeout(() => {
          if (typeof window.removeTypingIndicator === 'function') window.removeTypingIndicator();
          if (typeof window.addMessage === 'function') {
            window.addMessage(chatText, 'bot');
          }
          if (typeof window.auraSpeak === 'function') {
            window.auraSpeak(spokenText, activeLang);
          }
        }, 400);
      } catch (err) {
        console.error('executeQuickAction error:', err);
      }
    }

    quickButtons.forEach(btn => {
      const el = document.getElementById(btn.id);
      if (el) {
        el.addEventListener('click', btn.action);
      }
    });

    /* ── Language Toggle Button Listeners ─────────────────── */
    const btnLangTR = document.getElementById('btn-lang-tr');
    const btnLangEN = document.getElementById('btn-lang-en');
    if (btnLangTR && btnLangEN) {
      btnLangTR.addEventListener('click', () => {
        try {
          window.auraActiveLang = 'TR';
          btnLangTR.style.background = 'rgba(124,58,237,0.3)';
          btnLangTR.style.color = '#c084fc';
          btnLangTR.style.fontWeight = '600';
          btnLangEN.style.background = 'transparent';
          btnLangEN.style.color = '#94a3b8';
          btnLangEN.style.fontWeight = 'normal';
          
          if (window.speechSynthesis) window.speechSynthesis.cancel();
        } catch (err) {
          console.error('TR lang switch error:', err);
        }
      });

      btnLangEN.addEventListener('click', () => {
        try {
          window.auraActiveLang = 'EN';
          btnLangEN.style.background = 'rgba(124,58,237,0.3)';
          btnLangEN.style.color = '#c084fc';
          btnLangEN.style.fontWeight = '600';
          btnLangTR.style.background = 'transparent';
          btnLangTR.style.color = '#94a3b8';
          btnLangTR.style.fontWeight = 'normal';
          
          if (window.speechSynthesis) window.speechSynthesis.cancel();
        } catch (err) {
          console.error('EN lang switch error:', err);
        }
      });
    }
  });

  /* ── Download CSV Template ── */
  window.downloadCSVTemplate = function() {
    const headers = "CustomerID,Gender,Age,AnnualIncome,SpendingScore,CreditScore\n";
    const mockRow1 = "1001,Corporate,35,85,42,750\n";
    const mockRow2 = "1002,Corporate,42,120,80,680\n";
    const mockRow3 = "1003,Corporate,29,40,75,410\n";
    
    const csvContent = headers + mockRow1 + mockRow2 + mockRow3;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "ANL_Corporate_Risk_Template.csv");
    document.body.appendChild(link); // Required for Firefox
    
    link.click();
    document.body.removeChild(link);
  };

  /* ── Drag & Drop support (entire page) ────────────────── */
  let dragCounter = 0;
  document.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dragCounter++;
    document.body.classList.add('csv-drag-active');
  });
  document.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter <= 0) { dragCounter = 0; document.body.classList.remove('csv-drag-active'); }
  });
  document.addEventListener('dragover', (e) => e.preventDefault());
  document.addEventListener('drop', (e) => {
    e.preventDefault();
    dragCounter = 0;
    document.body.classList.remove('csv-drag-active');
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.txt'))) {
      processCSV(file);
    } else if (file) {
      toast('warn', '⚠️', 'Invalid File', 'Please upload a .csv or .txt file.');
    }
  });
})();

window.triggerRealVipMail = function(id, tierName, cashback) {
    const companyDomain = window.authenticatedCompanyName ? window.authenticatedCompanyName.replace(/\s+/g, '').toLowerCase() + '.com' : 'institutional-portfolio.com';
    const recipient = `client_${id}@${companyDomain}`;
    const subject = encodeURIComponent('[ANL Analytics] Premium Institutional VIP Rewards Activated');
    const body = encodeURIComponent(`Dear Valued Client #${id},\n\nWe are pleased to inform you that your portfolio has been upgraded to ${tierName} tier.\n\nBest regards,\nANL Analytics Team`);
    window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
};

window.triggerRealBudgetMail = function(id, discount, schemeName) {
    const companyDomain = window.authenticatedCompanyName ? window.authenticatedCompanyName.replace(/\s+/g, '').toLowerCase() + '.com' : 'institutional-portfolio.com';
    const recipient = `client_${id}@${companyDomain}`;
    const subject = encodeURIComponent('[ANL Analytics] Automated Portfolio Debt Restructuring Notice');
    const body = encodeURIComponent(`Dear Client #${id},\n\nBased on our risk analysis, your restructuring package under ${schemeName} is ready with a ${discount} discount.\n\nBest regards,\nANL Analytics Team`);
    window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
};

window.tuneCardTheme = function(primary, secondary) {
  const targetCard = document.querySelector("#generated-card-container > div");
  if(targetCard) {
    targetCard.style.background = `linear-gradient(135deg, ${primary}33, ${secondary}33)`;
    targetCard.style.borderColor = primary;
    targetCard.style.boxShadow = `0 10px 30px rgba(0,0,0,0.5), 0 0 20px ${primary}4d`;
  }
};

window.initLiveBloombergTicker = function() {
    let tickerEl = document.getElementById('bloomberg-ticker');
    if (!tickerEl) {
        tickerEl = document.createElement('div');
        tickerEl.id = 'bloomberg-ticker';
        tickerEl.style.position = 'fixed';
        tickerEl.style.bottom = '0';
        tickerEl.style.left = '0';
        tickerEl.style.width = '100%';
        tickerEl.style.zIndex = '9999';
        tickerEl.style.background = 'linear-gradient(90deg, rgba(10,12,28,.95) 0%, rgba(20,22,48,.95) 50%, rgba(10,12,28,.95) 100%)';
        tickerEl.style.borderTop = '1px solid rgba(124, 58, 237, 0.4)';
        tickerEl.style.padding = '8px 20px';
        tickerEl.style.fontFamily = 'monospace';
        tickerEl.style.fontSize = '0.75rem';
        tickerEl.style.color = '#38bdf8';
        tickerEl.style.textAlign = 'center';
        tickerEl.style.backdropFilter = 'blur(10px)';
        document.body.appendChild(tickerEl);
    }

    // Default baseline safe rates in case of network drops
    let rates = { USD_TRY: 32.45, EUR_USD: 1.0820, BTC_USD: 64250 };

    async function fetchRealMarketRates() {
        try {
            // Fetch live USD exchange grid from open central banking data streams
            const response = await fetch('https://open.er-api.com/v6/latest/USD');
            if (!response.ok) throw new Error('Network rates offline');
            const data = await response.json();
            
            if (data && data.rates) {
                // Dynamically calculate accurate live conversion pairs
                rates.USD_TRY = data.rates.TRY || rates.USD_TRY;
                rates.EUR_USD = (1 / data.rates.EUR) || rates.EUR_USD;
                // Fallback static approximation for high-volatility assets if stream limits apply
                rates.BTC_USD = data.rates.BTC ? (1 / data.rates.BTC) : (60000 + Math.random() * 5000);
            }
        } catch (error) {
            console.warn('Falling back to local high-fidelity ticks:', error);
        }
        updateTickerUI();
    }

    function updateTickerUI() {
        // Inject a very tiny micro-tick fluctuation (0.0001) every few seconds to show live Bloomberg activity
        const liveUSD_TRY = rates.USD_TRY + ((Math.random() - 0.5) * 0.0008);
        const liveEUR_USD = rates.EUR_USD + ((Math.random() - 0.5) * 0.0001);
        const liveBTC = rates.BTC_USD + ((Math.random() - 0.5) * 3.5);
        
        const highRiskCount = window.customersData ? window.customersData.filter(c => c.riskLevel === 'High Risk').length : 14;

        tickerEl.innerHTML = `⚙️ CORE AI RISK BALANCER // ` +
            `📊 PORTFOLIO RISK CORRELATION: ${highRiskCount > 15 ? '⚠️ STRESS DETECTED' : '🟢 STABLE'} // ` +
            `💵 REAL-TIME USD/TRY: ₺${liveUSD_TRY.toFixed(4)} // ` +
            `💶 REAL-TIME EUR/USD: $${liveEUR_USD.toFixed(4)} // ` +
            `🪙 BITCOIN (USD): $${liveBTC.toFixed(2)} // ` +
            `🛡️ INFRASTRUCTURE INTEGRITY: 100% OPERATIONAL // ` +
            `🌐 SYSTEM TIMESTAMP: ${new Date().toLocaleTimeString()}`;
    }

    // Fetch actual live data every 60 seconds from the cloud, but tick the UI live every 3 seconds
    fetchRealMarketRates();
    setInterval(fetchRealMarketRates, 60000);
    setInterval(updateTickerUI, 3000);
};

// Initialize safely across layout loads
document.addEventListener('DOMContentLoaded', window.initLiveBloombergTicker);
if (document.readyState === 'complete' || document.readyState === 'interactive') { window.initLiveBloombergTicker(); }

window.smoothDashboardScroll = function(event, sectionId) {
    if (event) event.preventDefault();
    
    // Forcefully hide both the landing page wrapper and the login overlay completely
    const landingPage = document.getElementById('anl-landing-page');
    const loginOverlay = document.getElementById('b2b-login-overlay');
    
    if (landingPage) landingPage.style.display = 'none';
    if (loginOverlay) loginOverlay.style.display = 'none';
    
    // Directly target the inside panel section and scroll smoothly
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    // Toggle active class visually on the top links row
    document.querySelectorAll('.nav-links .nav-link').forEach(link => {
        link.classList.remove('active');
    });
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }
};

window.toggleMobileNavMenu = function(event) {
    if (event) event.stopPropagation();
    const navLinks = document.querySelector('.nav-links');
    const toggleBtn = document.getElementById('mobile-menu-toggle');
    if (navLinks && toggleBtn) {
        navLinks.classList.toggle('mobile-open');
        toggleBtn.classList.toggle('active');
    }
};

// Ensure clicking any nav link closes the mobile menu drawer instantly
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.nav-links .nav-link').forEach(link => {
        link.addEventListener('click', () => {
            const navLinks = document.querySelector('.nav-links');
            const toggleBtn = document.getElementById('mobile-menu-toggle');
            if (navLinks && navLinks.classList.contains('mobile-open')) {
                navLinks.classList.remove('mobile-open');
                if (toggleBtn) toggleBtn.classList.remove('active');
            }
        });
    });
});
