// ========== FIREBASE CONFIGURATION ==========
const firebaseConfig = {
  apiKey: "AIzaSyA-bBRMrAyHuEuD8UkCJr8ieB77U72DJSU",
  authDomain: "clock-in-and-clock-out-28176.firebaseapp.com",
  databaseURL: "https://clock-in-and-clock-out-28176-default-rtdb.firebaseio.com",
  projectId: "clock-in-and-clock-out-28176",
  storageBucket: "clock-in-and-clock-out-28176.firebasestorage.app",
  messagingSenderId: "404643144546",
  appId: "1:404643144546:web:d385a193f39eb54faec23b"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ========== APP CONSTANTS ==========
const CLOUDINARY_CLOUD_NAME = 't3tg9lfb';
const CLOUDINARY_UPLOAD_PRESET = 'ml_default';
const MAX_TEACHERS = 100;
const PER_PAGE = 10;