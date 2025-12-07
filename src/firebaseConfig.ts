// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAoJVSzA6-jXn2-yLlnKDn4lwdI0aErUYY",
    authDomain: "nexora-c6328.firebaseapp.com",
    projectId: "nexora-c6328",
    storageBucket: "nexora-c6328.firebasestorage.app",
    messagingSenderId: "15743908748",
    appId: "1:15743908748:web:725e12079715bc711e34a9",
    measurementId: "G-HP6K7QRYWE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export { app, analytics };
