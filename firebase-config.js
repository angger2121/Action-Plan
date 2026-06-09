const firebaseConfig = {
  apiKey: "AIzaSyAxcM_4M3EmkcJhI4aIcS9RkvyjxjXw-ig",
  authDomain: "action-plan-7173a.firebaseapp.com",
  projectId: "action-plan-7173a",
  storageBucket: "action-plan-7173a.firebasestorage.app",
  messagingSenderId: "674231775940",
  appId: "1:674231775940:web:e00f982cfe89bd7d454f91",
  databaseURL: "https://action-plan-7173a-default-rtdb.asia-southeast1.firebasedatabase.app"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

window.FirebaseSync = {
  init: async function() {
    try {
      const overlay = document.createElement('div');
      overlay.id = "firebase-loading";
      overlay.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:#0f172a; z-index:9999; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#d4af37; font-family:sans-serif;";
      overlay.innerHTML = `<div style="font-size:24px; font-weight:bold; margin-bottom:16px;">Action Plan Suite</div><div>Menyinkronkan data Cloud...</div>`;
      document.body.appendChild(overlay);

      // Fetch all data once with a 5 second timeout
      const fetchPromise = db.collection('actionplan_db').get();
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000));
      
      const snapshot = await Promise.race([fetchPromise, timeoutPromise]);
      
      const originalSetItem = localStorage.setItem;
      const originalRemoveItem = localStorage.removeItem;

      if (!snapshot.empty) {
        // Cloud has data, overwrite local
        snapshot.forEach(doc => {
          originalSetItem.call(localStorage, doc.id, doc.data().value);
        });
      } else {
        // Cloud is empty. If we have existing local data, upload it to the cloud!
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('mdi_')) {
            const val = localStorage.getItem(key);
            db.collection('actionplan_db').doc(key).set({ value: val }).catch(e => console.error(e));
          }
        }
      }
      
      // Override localStorage methods to sync with Firebase
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

      document.body.removeChild(overlay);
    } catch (e) {
      console.error("Firebase Sync Error:", e);
      const overlay = document.getElementById('firebase-loading');
      if (overlay) {
          overlay.innerHTML = `<div style="font-size:24px; font-weight:bold; margin-bottom:16px;">Action Plan Suite</div><div style="color:#ef4444;">Gagal menyinkronkan data Cloud. Menggunakan mode Offline.</div>`;
          setTimeout(() => { if(overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 2500);
      }
    }
  }
};
