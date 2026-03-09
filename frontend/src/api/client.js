const API_URL = import.meta.env.VITE_API_URL || "https://ip-assist-backend-1058034030780.asia-northeast3.run.app";

export const api = {
  async chat(sessionId, message, category, history = [], phase = "chat", filledFields = {}, rfpType = "service_contract") {
    const res = await fetch(`${API_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        session_id: sessionId, message, category, history,
        phase, filled_fields: filledFields, rfp_type: rfpType,
      }),
    });
    return res.json();
  },

  async streamChat(sessionId, message, category, history, phase, filledFields, onToken, onMeta, onDone, onSuggestions, rfpType = "service_contract") {
    const res = await fetch(`${API_URL}/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        session_id: sessionId, message, category, history,
        phase: phase || "chat", filled_fields: filledFields || {},
        rfp_type: rfpType,
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

  async getSuppliers(category) {
    const params = category ? `?category=${encodeURIComponent(category)}` : "";
    const res = await fetch(`${API_URL}/suppliers${params}`);
    return res.json();
  },

  async searchSuppliers(category, keywords) {
    const params = new URLSearchParams({ category });
    if (keywords) params.set("keywords", keywords);
    const res = await fetch(`${API_URL}/suppliers/search?${params}`);
    return res.json();
  },

  async createSupplier(data) {
    const res = await fetch(`${API_URL}/suppliers`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(data),
    });
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

  async getTaxonomy() {
    const res = await fetch(`${API_URL}/admin/taxonomy`);
    return res.json();
  },

  async getUsers() {
    const res = await fetch(`${API_URL}/admin/users`);
    return res.json();
  },

  async getDashboard() {
    const res = await fetch(`${API_URL}/admin/dashboard`);
    return res.json();
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

  // ── 공급업체 CRUD (기존 확장) ──
  async updateSupplier(id, data) {
    const res = await fetch(`${API_URL}/suppliers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async deleteSupplier(id) {
    const res = await fetch(`${API_URL}/suppliers/${id}`, { method: "DELETE" });
    return res.json();
  },

  async uploadSuppliersCsv(formData) {
    const res = await fetch(`${API_URL}/suppliers/upload-csv`, {
      method: "POST",
      body: formData,
    });
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
};
