const API_URL = import.meta.env.VITE_API_URL || "https://ip-assist-backend-1058034030780.asia-northeast3.run.app";

export const api = {
  async chat(sessionId, message, category, history = [], phase = "chat", filledFields = {}) {
    const res = await fetch(`${API_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId, message, category, history,
        phase, filled_fields: filledFields,
      }),
    });
    return res.json();
  },

  async streamChat(sessionId, message, category, history, phase, filledFields, onToken, onMeta, onDone, onSuggestions) {
    const res = await fetch(`${API_URL}/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId, message, category, history,
        phase: phase || "chat", filled_fields: filledFields || {},
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
      headers: { "Content-Type": "application/json" },
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

  async uploadKnowledge(formData) {
    const res = await fetch(`${API_URL}/knowledge/upload`, {
      method: "POST",
      body: formData,
    });
    return res.json();
  },

  async getSuppliers() {
    const res = await fetch(`${API_URL}/suppliers`);
    return res.json();
  },

  async createSupplier(data) {
    const res = await fetch(`${API_URL}/suppliers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rule_type: ruleType, content }),
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
};
