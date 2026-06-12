// Database Real-time Sync Engine (SUPABASE ADAPTER)
// File ini bertugas menjembatani logika database Anda menggunakan Adapter Pattern untuk supabaseClient.

window.FirebaseSync = {
  init: function() {
    return new Promise(async (resolve) => {
      if (!supabaseClient) {
        console.error("Supabase SDK belum dimuat.");
        resolve();
        return;
      }
      
      const overlay = document.createElement('div');
      overlay.id = "firebase-loading";
      overlay.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:#0f172a; z-index:9999; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#10b981; font-family:sans-serif;";
      overlay.innerHTML = `<div style="font-size:24px; font-weight:bold; margin-bottom:16px;">Action Plan Suite</div><div>Menyinkronkan data supabaseClient...</div>`;
      document.body.appendChild(overlay);

      const originalSetItem = localStorage.setItem;
      const originalRemoveItem = localStorage.removeItem;
      
      let isFirstLoad = true;

      try {
        // Fetch existing data initially
        const { data: snapshot, error } = await supabaseClient.from('actionplan_db').select('*');
        
        if (error) throw error;

        if (snapshot && snapshot.length > 0) {
          snapshot.forEach(doc => {
            if (localStorage.getItem(doc.id) !== doc.value) {
              originalSetItem.call(localStorage, doc.id, doc.value);
            }
          });
        } else {
          // If Cloud was completely empty initially, migrate existing local data up to cloud.
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('mdi_')) {
              const val = localStorage.getItem(key);
              supabaseClient.from('actionplan_db').upsert({ id: key, value: val }).then();
            }
          }
        }

        // Setup Real-time listener using Supabase Channels
        supabaseClient.channel('public:actionplan_db')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'actionplan_db' }, payload => {
            let changed = false;
            
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const key = payload.new.id;
              const val = payload.new.value;
              if (localStorage.getItem(key) !== val) {
                originalSetItem.call(localStorage, key, val);
                changed = true;
              }
            } else if (payload.eventType === 'DELETE') {
              const key = payload.old.id;
              if (localStorage.getItem(key) !== null) {
                originalRemoveItem.call(localStorage, key);
                changed = true;
              }
            }

            if (changed) {
              window.dispatchEvent(new Event('firebaseDataChanged'));
            }
          })
          .subscribe();

        isFirstLoad = false;
        document.body.removeChild(overlay);
        resolve();

      } catch (error) {
        console.error("Real-time Sync Error:", error);
        if (isFirstLoad) {
           overlay.innerHTML = `<div style="font-size:24px; font-weight:bold; margin-bottom:16px;">Action Plan Suite</div><div style="color:#ef4444;">Koneksi terputus. Pastikan Anda telah menjalankan script SQL (Tabel actionplan_db tidak ditemukan).</div>`;
           setTimeout(() => { if(overlay.parentNode) overlay.parentNode.removeChild(overlay); resolve(); }, 3500);
           isFirstLoad = false;
        }
      }

      // Override localStorage write methods to broadcast to Supabase
      localStorage.setItem = function(key, value) {
        originalSetItem.apply(this, arguments);
        if (key.startsWith('mdi_')) {
          supabaseClient.from('actionplan_db').upsert({ id: key, value: value })
            .then(({error}) => { if(error) console.error("Supabase save error:", error); });
        }
      };

      localStorage.removeItem = function(key) {
        originalRemoveItem.apply(this, arguments);
        if (key.startsWith('mdi_')) {
          supabaseClient.from('actionplan_db').delete().eq('id', key)
            .then(({error}) => { if(error) console.error("Supabase remove error:", error); });
        }
      };
    });
  }
};
