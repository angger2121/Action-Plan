const fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const html = fs.readFileSync('MDI_ActionPlan_Admin.html', 'utf8');

const dom = new JSDOM(html, { runScripts: "dangerously", url: "http://localhost/?formId=form_bayan" });

dom.window.localStorage = {
  store: { 'mdi_forms': '[{"id":"form_bayan","title":"Action Plan - Bayan Group"}]' },
  getItem(key) { return this.store[key] || null; },
  setItem(key, value) { this.store[key] = value; },
  removeItem(key) { delete this.store[key]; },
  get length() { return Object.keys(this.store).length; },
  key(i) { return Object.keys(this.store)[i]; }
};

dom.window.onerror = function(msg) {
  console.error('Browser Error:', msg);
};

setTimeout(() => {
  try {
    dom.window.init();
    console.log("Head Title:", dom.window.document.getElementById('head-form-title').textContent);
  } catch (e) {
    console.error("Init Error:", e);
  }
}, 500);
