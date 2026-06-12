// Database Configuration Keys
// Pisahkan file ini jika Anda ingin melakukan migrasi database.

const firebaseConfig = {
  apiKey: "AIzaSyAxcM_4M3EmkcJhI4aIcS9RkvyjxjXw-ig",
  authDomain: "action-plan-7173a.firebaseapp.com",
  projectId: "action-plan-7173a",
  storageBucket: "action-plan-7173a.firebasestorage.app",
  messagingSenderId: "674231775940",
  appId: "1:674231775940:web:e00f982cfe89bd7d454f91",
  databaseURL: "https://action-plan-7173a-default-rtdb.asia-southeast1.firebasedatabase.app"
};

// Initialize connection
if (typeof firebase !== 'undefined') {
  firebase.initializeApp(firebaseConfig);
}
