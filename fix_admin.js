const fs = require('fs');
let html = fs.readFileSync('MDI_ActionPlan_Admin.html', 'utf8');

const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (scriptMatch) {
  let content = scriptMatch[1];
  
  // Cut everything after the last valid function brace if it's garbled
  // Actually let's just find "document.getElementById("cfg-desc").value = FORM_CONFIG.desc;"
  const idx = content.lastIndexOf('document.getElementById("cfg-desc").value = FORM_CONFIG.desc;');
  
  if (idx !== -1) {
    content = content.substring(0, idx) + `window.addEventListener('storage', (e) => {
  if (e.key === 'mdi_forms') {
    const list = JSON.parse(e.newValue);
    const item = list.find(f => f.id === formId);
    if (item) {
      FORM_CONFIG = item;
      document.getElementById("cfg-desc").value = FORM_CONFIG.desc;
      document.getElementById("head-form-title").textContent = FORM_CONFIG.title;
      document.getElementById("admin-brand-title").innerHTML = \`\${FORM_CONFIG.title} <span>Action Plan Admin</span>\`;
      if (activeTab === "backend") {
        renderConfiguratorUI();
      }
    }
  }
});

window.onload = init;
`;
    
    html = html.substring(0, scriptMatch.index) + '<script>' + content + '</script>' + html.substring(scriptMatch.index + scriptMatch[0].length);
    fs.writeFileSync('MDI_ActionPlan_Admin.html', html);
    console.log('Fixed EOF');
  } else {
    // If not found, maybe it's just missing window.onload
    if (!content.includes('window.onload = init;')) {
      content += '\nwindow.onload = init;\n';
      html = html.substring(0, scriptMatch.index) + '<script>' + content + '</script>' + html.substring(scriptMatch.index + scriptMatch[0].length);
      fs.writeFileSync('MDI_ActionPlan_Admin.html', html);
      console.log('Added window.onload');
    } else {
      console.log('Nothing to fix');
    }
  }
}
