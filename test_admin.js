const fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const html = fs.readFileSync('MDI_ActionPlan_Admin.html', 'utf8');

const dom = new JSDOM(html, { runScripts: "dangerously", url: "http://localhost/?formId=form_bayan" });

dom.window.localStorage = {
  store: {},
  getItem(key) { return this.store[key] || null; },
  setItem(key, value) { this.store[key] = value; },
  removeItem(key) { delete this.store[key]; },
  get length() { return Object.keys(this.store).length; },
  key(i) { return Object.keys(this.store)[i]; }
};

dom.window.localStorage.setItem('mdi_forms', JSON.stringify([{ id: 'form_bayan', title: 'Action Plan - Bayan Group' }]));
dom.window.localStorage.setItem('mdi_participants_form_bayan', JSON.stringify([]));

// Catch any errors
dom.window.onerror = function(msg, source, lineNo, columnNo, error) {
  console.error('Browser Error:', msg, lineNo, columnNo, error);
  return false;
};

// Wait for a second to see if scripts execute
setTimeout(() => {
  console.log("Head Title:", dom.window.document.getElementById('head-form-title') ? dom.window.document.getElementById('head-form-title').textContent : 'not found');
}, 1000);
