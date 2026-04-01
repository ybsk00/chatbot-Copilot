const API_URL = import.meta.env.VITE_API_URL || "https://ip-assist-backend-1058034030780.asia-northeast3.run.app";

export const api = {
  async chat(sessionId, message, category, history = [], phase = "chat", filledFields = {}, rfpType = "service_contract", prType = null, prFilledFields = {}, userRole = null, roleTurnCount = 0, rfqType = null, rfqFilledFields = {}) {
    const res = await fetch(`${API_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        session_id: sessionId, message, category, history,
        phase, filled_fields: filledFields, rfp_type: rfpType,
        pr_type: prType, pr_filled_fields: prFilledFields,
        user_role: userRole, role_turn_count: roleTurnCount,
        rfq_type: rfqType, rfq_filled_fields: rfqFilledFields,
      }),
    });
    return res.json();
  },

  async streamChat(sessionId, message, category, history, phase, filledFields, onToken, onMeta, onDone, onSuggestions, rfpType = "service_contract", userRole = null, roleTurnCount = 0, prType = null) {
    const res = await fetch(`${API_URL}/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        session_id: sessionId, message, category, history,
        phase: phase || "chat", filled_fields: filledFields || {},
        rfp_type: rfpType,
        user_role: userRole, role_turn_count: roleTurnCount, pr_type: prType,
      }),
    });
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const data = JSON.parse(line.slice(6));
          if (data.type === "token" && onToken) onToken(data.content);
          else if (data.type === "meta" && onMeta) onMeta(data);
          else if (data.type === "suggestions" && onSuggestions) onSuggestions(data.items);
          else if (data.type === "done" && onDone) onDone();
          else if (data.type === "l4_select" && onMeta) onMeta({ ...data, _l4_event: "l4_select" });
          else if (data.type === "l4_branch" && onMeta) onMeta({ ...data, _l4_event: "l4_branch" });
        } catch (e) {
          console.warn("SSE parse error:", e);
        }
      }
    }
  },

  async generateRfp(category, requirements, sessionId) {
    const res = await fetch(`${API_URL}/rfp/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ category, requirements, session_id: sessionId }),
    });
    return res.json();
  },

  async getKnowledge() {
    const res = await fetch(`${API_URL}/knowledge`);
    return res.json();
  },

  async getKnowledgeStats() {
    const res = await fetch(`${API_URL}/knowledge/stats`);
    return res.json();
  },

  async getKnowledgeOverview() {
    const res = await fetch(`${API_URL}/knowledge/overview`);
    return res.json();
  },

  async uploadKnowledge(formData) {
    const res = await fetch(`${API_URL}/knowledge/upload`, {
      method: "POST",
      body: formData,
    });
    return res.json();
  },

  // ── L4 공급업체 추천 ──
  async getL4Options(l3Code) {
    const res = await fetch(`${API_URL}/suppliers/l4/options/${encodeURIComponent(l3Code)}`);
    return res.json();
  },
  async getL4Suppliers(l4Code, scopeType = "nationwide", scopeValue = null, sessionId = null) {
    const params = new URLSearchParams({ scope_type: scopeType });
    if (scopeValue) params.set("scope_value", scopeValue);
    if (sessionId) params.set("session_id", sessionId);
    const res = await fetch(`${API_URL}/suppliers/l4/recommend/${encodeURIComponent(l4Code)}?${params}`);
    return res.json();
  },
  async getL4BranchOptions(l4Code) {
    const res = await fetch(`${API_URL}/suppliers/l4/branch/${encodeURIComponent(l4Code)}`);
    return res.json();
  },

  async getConstitution() {
    const res = await fetch(`${API_URL}/admin/constitution`);
    return res.json();
  },

  async addConstitution(ruleType, content) {
    const res = await fetch(`${API_URL}/admin/constitution`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ rule_type: ruleType, content }),
    });
    return res.json();
  },

  async updateConstitution(id, ruleType, content, isActive = true) {
    const res = await fetch(`${API_URL}/admin/constitution/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ rule_type: ruleType, content, is_active: isActive }),
    });
    return res.json();
  },

  async deleteConstitution(id) {
    const res = await fetch(`${API_URL}/admin/constitution/${id}`, { method: "DELETE" });
    return res.json();
  },

  async login(email, password) {
    const res = await fetch(`${API_URL}/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ email, password }),
    });
    return res.json();
  },

  async getConversations() {
    const res = await fetch(`${API_URL}/admin/conversations`);
    return res.json();
  },

  async getConversationDetail(sessionId) {
    const res = await fetch(`${API_URL}/admin/conversations/${encodeURIComponent(sessionId)}`);
    return res.json();
  },

  async deleteConversation(id) {
    const res = await fetch(`${API_URL}/admin/conversations/${id}`, { method: "DELETE" });
    return res.json();
  },

  async getTaxonomy() {
    const res = await fetch(`${API_URL}/admin/taxonomy`);
    return res.json();
  },

  async getUsers() {
    const res = await fetch(`${API_URL}/admin/users`);
    return res.json();
  },

  async getDashboard() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(`${API_URL}/admin/dashboard`, { signal: controller.signal });
      return res.json();
    } finally {
      clearTimeout(timer);
    }
  },

  // ── RFP 신청 관리 ──
  async getRfpRequests(status) {
    const params = status ? `?status=${status}` : "";
    const res = await fetch(`${API_URL}/admin/rfp-requests${params}`);
    return res.json();
  },
  async updateRfpStatus(id, status) {
    const res = await fetch(`${API_URL}/admin/rfp-requests/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ status }),
    });
    return res.json();
  },
  async deleteRfpRequest(id) {
    const res = await fetch(`${API_URL}/admin/rfp-requests/${id}`, { method: "DELETE" });
    return res.json();
  },

  // ── 구매담당자 PDF 업로드 ──
  async uploadPr(formData) {
    const res = await fetch(`${API_URL}/chat/upload-pr`, {
      method: "POST",
      body: formData,
    });
    return res.json();
  },

  // ── PR PDF → RFP/RFQ 변환 업로드 ──
  async uploadPrConvert(formData, target) {
    const res = await fetch(`${API_URL}/chat/upload-pr-convert?target=${target}`, {
      method: "POST",
      body: formData,
    });
    return res.json();
  },

  // ── RFP 양식 관리 ──
  async getRfpTemplates() {
    const res = await fetch(`${API_URL}/admin/rfp-templates`);
    return res.json();
  },
  async createRfpTemplate(data) {
    const res = await fetch(`${API_URL}/admin/rfp-templates`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async updateRfpTemplate(id, data) {
    const res = await fetch(`${API_URL}/admin/rfp-templates/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async deleteRfpTemplate(id) {
    const res = await fetch(`${API_URL}/admin/rfp-templates/${id}`, { method: "DELETE" });
    return res.json();
  },

  // ── PR 양식 관리 ──
  async getPrTemplates() {
    const res = await fetch(`${API_URL}/admin/pr-templates`);
    return res.json();
  },

  // ── RFQ 양식 관리 ──
  async getRfqTemplates() {
    const res = await fetch(`${API_URL}/admin/rfq-templates`);
    return res.json();
  },

  // ── 차세대 분류체계 (taxonomy_v2) ──
  async getTaxonomyTree() {
    const res = await fetch(`${API_URL}/admin/taxonomy-v2/tree`);
    return res.json();
  },

  // ── 사용자 관리 CRUD ──
  async createUser(data) {
    const res = await fetch(`${API_URL}/admin/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async updateUser(id, data) {
    const res = await fetch(`${API_URL}/admin/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async deleteUser(id) {
    const res = await fetch(`${API_URL}/admin/users/${id}`, { method: "DELETE" });
    return res.json();
  },

  // ── PR 관리 (관리자) ──
  async getPrRequests(status) {
    const params = status ? `?status=${status}` : "";
    const res = await fetch(`${API_URL}/admin/pr-requests${params}`);
    return res.json();
  },
  async updatePrStatus(id, status) {
    const res = await fetch(`${API_URL}/admin/pr-requests/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ status }),
    });
    return res.json();
  },
  async deletePrRequest(id) {
    const res = await fetch(`${API_URL}/admin/pr-requests/${id}`, { method: "DELETE" });
    return res.json();
  },
  async getSessionPrRequests(sessionId) {
    const res = await fetch(`${API_URL}/admin/pr-requests/session/${sessionId}`);
    return res.json();
  },

  // ── RFP 이메일 발송 ──
  async sendRfpEmail(requestId, toEmail) {
    const res = await fetch(`${API_URL}/admin/rfp-requests/${requestId}/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ to_email: toEmail }),
    });
    return res.json();
  },

  // ── 세션별 RFP 신청 내역 조회 ──
  async getSessionRfpRequests(sessionId) {
    const res = await fetch(`${API_URL}/admin/rfp-requests/session/${sessionId}`);
    return res.json();
  },
};
