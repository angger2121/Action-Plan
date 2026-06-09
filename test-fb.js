const firebase = require('firebase/compat/app');
require('firebase/compat/database');

const firebaseConfig = {
  apiKey: "AIzaSyAxcM_4M3EmkcJhI4aIcS9RkvyjxjXw-ig",
  authDomain: "action-plan-7173a.firebaseapp.com",
  projectId: "action-plan-7173a",
  databaseURL: "https://action-plan-7173a-default-rtdb.asia-southeast1.firebasedatabase.app"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

db.ref('test').set('hello').then(() => {
  console.log('Success asia');
  process.exit(0);
}).catch(e => {
  console.error('Error asia', e.message);
  
  // try US central
  const app2 = firebase.initializeApp({...firebaseConfig, databaseURL: "https://action-plan-7173a-default-rtdb.firebaseio.com"}, 'app2');
  app2.database().ref('test').set('hello').then(() => {
    console.log('Success us-central');
    process.exit(0);
  }).catch(e2 => {
    console.error('Error us-central', e2.message);
    process.exit(1);
  });
});
