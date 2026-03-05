const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const api = {
  async chat(sessionId, message, category, history = []) {
    const res = await fetch(`${API_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, message, category, history }),
    });
    return res.json();
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
