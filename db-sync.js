// Database Real-time Sync Engine
// File ini bertugas menjembatani logika database Anda menggunakan Adapter Pattern.

const db = typeof firebase !== 'undefined' ? firebase.firestore() : null;

window.FirebaseSync = {
  init: function() {
    return new Promise((resolve) => {
      if (!db) {
        console.error("Database SDK belum dimuat.");
        resolve();
        return;
      }
      
      const overlay = document.createElement('div');
      overlay.id = "firebase-loading";
      overlay.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:#0f172a; z-index:9999; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#d4af37; font-family:sans-serif;";
      overlay.innerHTML = `<div style="font-size:24px; font-weight:bold; margin-bottom:16px;">Action Plan Suite</div><div>Menyinkronkan data Cloud...</div>`;
      document.body.appendChild(overlay);

      const originalSetItem = localStorage.setItem;
      const originalRemoveItem = localStorage.removeItem;
      
      let isFirstLoad = true;

      // Real-time listener: onSnapshot
      const unsubscribe = db.collection('actionplan_db').onSnapshot({ includeMetadataChanges: false }, (snapshot) => {
        let changed = false;
        
        snapshot.docChanges().forEach(change => {
          if (change.type === "added" || change.type === "modified") {
            const key = change.doc.id;
            const val = change.doc.data().value;
            // Prevent self-triggering loops by checking if value is actually different
            if (localStorage.getItem(key) !== val) {
              originalSetItem.call(localStorage, key, val);
              changed = true;
            }
          }
          if (change.type === "removed") {
            const key = change.doc.id;
            if (localStorage.getItem(key) !== null) {
              originalRemoveItem.call(localStorage, key);
              changed = true;
            }
          }
        });

        // If Cloud was completely empty initially, migrate existing local data up to cloud.
        if (isFirstLoad && snapshot.empty) {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('mdi_')) {
              const val = localStorage.getItem(key);
              db.collection('actionplan_db').doc(key).set({ value: val }).catch(e => console.error(e));
            }
          }
        }
        
        if (isFirstLoad) {
           isFirstLoad = false;
           document.body.removeChild(overlay);
           resolve(); // Unlock the app initialization
        } else if (changed) {
           // Broadcast real-time update event to all active HTML windows
           window.dispatchEvent(new Event('firebaseDataChanged'));
        }
      }, (error) => {
        console.error("Real-time Sync Error:", error);
        if (isFirstLoad) {
           overlay.innerHTML = `<div style="font-size:24px; font-weight:bold; margin-bottom:16px;">Action Plan Suite</div><div style="color:#ef4444;">Koneksi terputus. Menggunakan mode Offline.</div>`;
           setTimeout(() => { if(overlay.parentNode) overlay.parentNode.removeChild(overlay); resolve(); }, 2000);
           isFirstLoad = false;
        }
      });

      // Override localStorage write methods to broadcast to Firestore
      localStorage.setItem = function(key, value) {
        originalSetItem.apply(this, arguments);
        if (key.startsWith('mdi_')) {
          db.collection('actionplan_db').doc(key).set({ value: value }).catch(e => console.error("Firebase save error:", e));
        }
      };

      localStorage.removeItem = function(key) {
        originalRemoveItem.apply(this, arguments);
        if (key.startsWith('mdi_')) {
          db.collection('actionplan_db').doc(key).delete().catch(e => console.error("Firebase remove error:", e));
        }
      };
    });
  }
};
