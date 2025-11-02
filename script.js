// Import Firebase modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, onSnapshot, setDoc, getDoc, updateDoc, query, where, orderBy } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyA_H9jJwyhfUrFoYCWZERf8R8W1o2TmqO0",
    authDomain: "desi-cart-wuaze.firebaseapp.com",
    projectId: "desi-cart-wuaze",
    storageBucket: "desi-cart-wuaze.firebasestorage.app",
    messagingSenderId: "891883106075",
    appId: "1:891883106075:web:c66fa32fe6fa8e8c36edbe"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// Login modal functions
window.showLoginModal = function() {
    if (currentUser) {
        logout();
        return;
    }
    document.getElementById('loginModal').style.display = 'flex';
    // Hide bottom navbar when modal opens
    const bottomNav = document.querySelector('.app-bottom-nav');
    if (bottomNav) {
        bottomNav.style.display = 'none';
    }
};

window.closeLoginModal = function() {
    document.getElementById('loginModal').style.display = 'none';
    // Show bottom navbar when modal closes
    const bottomNav = document.querySelector('.app-bottom-nav');
    if (bottomNav) {
        bottomNav.style.display = 'flex';
    }
};

// Form switching functions
window.switchToRegister = function() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    loginForm.style.setProperty('display', 'none', 'important');
    registerForm.style.setProperty('display', 'block', 'important');
    
    // Clear login form
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
};

window.switchToLogin = function() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    registerForm.style.setProperty('display', 'none', 'important');
    loginForm.style.setProperty('display', 'block', 'important');
    
    // Clear register form
    document.getElementById('registerName').value = '';
    document.getElementById('registerEmail').value = '';
    document.getElementById('registerPhone').value = '';
    document.getElementById('registerPassword').value = '';
    document.getElementById('confirmPassword').value = '';
};

// Password toggle function
window.togglePassword = function(inputId) {
    const passwordInput = document.getElementById(inputId);
    const toggleIcon = document.getElementById(inputId + 'Toggle');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.className = 'fas fa-eye-slash';
    } else {
        passwordInput.type = 'password';
        toggleIcon.className = 'fas fa-eye';
    }
};

// Helper function to check if input is email or phone
function isEmail(input) {
    return input.includes('@') && input.includes('.');
}

// Find user by phone number in Firestore
async function findUserByPhone(phone) {
    try {
        const usersQuery = query(
            collection(db, 'users'),
            where('phone', '==', phone)
        );
        const querySnapshot = await getDocs(usersQuery);
        
        if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            return userDoc.data();
        }
        return null;
    } catch (error) {
        console.error('Error finding user by phone:', error);
        return null;
    }
}

// Updated login function to handle both email and phone
window.loginWithEmailOrPhone = async function(emailOrPhone, password) {
    const loginBtn = document.querySelector('#loginForm .auth-btn');
    const originalText = loginBtn.textContent;
    
    try {
        // Show loading state
        loginBtn.textContent = 'Logging in...';
        loginBtn.disabled = true;
        
        let userCredential;
        
        if (isEmail(emailOrPhone)) {
            // Login with email
            userCredential = await signInWithEmailAndPassword(auth, emailOrPhone, password);
        } else {
            // Login with phone - first find the email associated with this phone
            const userData = await findUserByPhone(emailOrPhone);
            if (!userData || !userData.email) {
                throw new Error('No account found with this phone number.');
            }
            userCredential = await signInWithEmailAndPassword(auth, userData.email, password);
        }
        
        const user = userCredential.user;
        console.log('User logged in successfully:', user.email);
        
        showNotification(`Welcome back! Loading your data...`, 'success', 1000);
        closeLoginModal();
        setTimeout(() => {
            window.location.reload();
        }, 1000);
        
    } catch (error) {
        console.error('Login error:', error);
        let errorMessage = 'Login failed. Please check your credentials.';
        
        if (error.message === 'No account found with this phone number.') {
            errorMessage = error.message;
        } else {
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = isEmail(emailOrPhone) ? 'No account found with this email.' : 'No account found with this phone number.';
                    break;
                case 'auth/wrong-password':
                case 'auth/invalid-credential':
                    errorMessage = 'Incorrect credentials. Please check your details.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Invalid email address.';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Too many failed attempts. Try again later.';
                    break;
                case 'auth/network-request-failed':
                    errorMessage = 'Network error. Please check your connection.';
                    break;
            }
        }
        
        showNotification(errorMessage, 'error');
        
        // Reset button
        loginBtn.textContent = originalText;
        loginBtn.disabled = false;
    }
};

window.registerWithEmailAndPhone = async function(name, email, phone, password) {
    const registerBtn = document.querySelector('#registerForm .auth-btn');
    const originalText = registerBtn.textContent;
    
    try {
        // Show loading state
        registerBtn.textContent = 'Creating Account...';
        registerBtn.disabled = true;
        
        // Check if phone number already exists
        const existingUser = await findUserByPhone(phone);
        if (existingUser) {
            throw new Error('An account with this phone number already exists.');
        }
        
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Update user profile with display name
        await updateProfile(user, {
            displayName: name
        });
        
        // Save user data to Firestore with phone number
        await setDoc(doc(db, 'users', user.uid), {
            name: name,
            email: email,
            phone: phone,
            createdAt: new Date(),
            displayName: name
        });
        
        console.log('User registered successfully:', user.email);
        showNotification(`Welcome ${name}! Account created successfully.`, 'success', 1000);
        closeLoginModal();
        
        setTimeout(() => {
            window.location.reload();
        }, 1000);
        
    } catch (error) {
        console.error('Registration error:', error);
        let errorMessage = 'Registration failed. Please try again.';
        
        if (error.message === 'An account with this phone number already exists.') {
            errorMessage = error.message;
        } else {
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'An account with this email already exists.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Invalid email address.';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'Password should be at least 6 characters.';
                    break;
                case 'auth/network-request-failed':
                    errorMessage = 'Network error. Please check your connection.';
                    break;
            }
        }
        
        showNotification(errorMessage, 'error');
        
        // Reset button
        registerBtn.textContent = originalText;
        registerBtn.disabled = false;
    }
};

// Function to completely clear all user data
function clearAllUserData() {
    // Clear all global variables
    cartItems = [];
    userAddressData = null;
    currentUser = null;
    welcomeMessageShown = false;
    productsData = [];
    categoriesData = [];
    slidesData = [];
    
    // Clear localStorage completely
    localStorage.clear();
    
    // Clear sessionStorage
    sessionStorage.clear();
    
    // Reset UI elements
    const cartCount = document.getElementById('cartCountBottom');
    if (cartCount) {
        cartCount.textContent = '0';
        cartCount.style.display = 'none';
    }
    
    // Clear any cached DOM elements
    const cartItems = document.getElementById('cartItems');
    if (cartItems) cartItems.innerHTML = '';
    
    const cartItemsMain = document.getElementById('cartItemsMain');
    if (cartItemsMain) cartItemsMain.innerHTML = '';
    
    const ordersContent = document.getElementById('ordersContent');
    if (ordersContent) ordersContent.innerHTML = '';
    
    console.log('All user data cleared completely');
}

window.logout = async function() {
    try {
        console.log('Starting logout process...');
        
        // Redirect to home page immediately on click
        setActiveTab('home');
        
        // Firebase logout
        await signOut(auth);
        console.log('User signed out successfully');
        
        // Clear all user data
        clearAllUserData();
        
        // Show logout notification
        showNotification('Logged out successfully! 👋', 'success', 1000);
        
        // Reload after 1 second - same as login
        setTimeout(() => {
            window.location.reload();
        }, 1000);
        
    } catch (error) {
        console.error('Error during sign-out:', error);
        
        // Redirect to home even on error
        setActiveTab('home');
        clearAllUserData();
        showNotification('Logged out! 👋', 'success', 1000);
        
        // Same reload pattern as login
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    }
};

// Track if welcome message has been shown
let welcomeMessageShown = false;

// Show main app after login
function showMainApp(user) {
    console.log('showMainApp called with user:', user);
    currentUser = user;
    document.body.style.background = 'white';
    
    // Fix: Use correct element IDs
    const loginContainer = document.getElementById('loginContainer');
    const mainApp = document.querySelector('.main-app');
    
    console.log('loginContainer:', loginContainer);
    console.log('mainApp:', mainApp);
    
    if (loginContainer) {
        loginContainer.style.display = 'none';
    }
    if (mainApp) {
        mainApp.style.display = 'block';
    }
    
    // Show welcome notification only once per session
    if (!welcomeMessageShown) {
        showNotification(`Welcome, ${user.displayName || 'User'}! 🎉<br>You have successfully logged in.`, 'success', 5000);
        welcomeMessageShown = true;
    }
    
    // Update auth button to show "Logout" when user is logged in
    const authBtn = document.getElementById('authBtn');
    if (authBtn) {
        authBtn.textContent = 'Logout';
        authBtn.onclick = logout;
    }
    
    // Bottom navbar is always visible - no need to show/hide
    
    const welcomeMsg = document.querySelector('.welcome-message');
    if (welcomeMsg && user.displayName) {
        welcomeMsg.textContent = `Welcome, ${user.displayName}!`;
    }
    
    // Add user to registered users and update admin visibility
    addRegisteredUser(user);
    updateAdminVisibility(user);
    updateDeliveryManVisibility(user);
    
    // Initialize slideshow
    updateSlideshow();
    
    // Load data from Firebase
    loadSlidesFromFirebase();
    loadCategoriesFromFirebase();
    
    // Load user addresses
    loadSavedAddresses();
    loadProductsFromFirebase();
    
    // Check and schedule existing completed/rejected orders for deletion
    checkAndScheduleExistingOrders();
    
    setTimeout(async () => {
        await loadCartFromFirebase();
    
    // Show floating cart notification after cart is loaded
    setTimeout(() => {
        updateFloatingCartNotification();
    }, 500);
        await loadUserAddressFromFirebase();
        
        // Setup real-time cart listener for authenticated users
        setupCartRealTimeListener();
        
        // Update cart display after loading cart data
        updateCartCount();
        updateCartDisplayMain();
        
        // Load wallet balance for authenticated users
        loadWalletBalance();
        
        // Update profile info
        updateProfileInfo();
        
        // Show floating cart notification if cart has items
        updateFloatingCartNotification();
    }, 1000);
}

// Show login screen
function showLoginScreen() {
    document.body.style.background = 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)';
    
    // Reset welcome message flag when user logs out
    welcomeMessageShown = false;
    
    // Fix: Use correct element IDs
    const loginContainer = document.getElementById('loginContainer');
    const mainApp = document.querySelector('.main-app');
    
    if (loginContainer) {
        loginContainer.style.display = 'flex';
    }
    if (mainApp) {
        mainApp.style.display = 'none';
    }
    
    // Bottom navbar is always visible - no need to hide
}

// Listen for authentication state changes
onAuthStateChanged(auth, (user) => {
    console.log('Auth state changed:', user ? 'User logged in' : 'User logged out');
    if (user) {
        // User is signed in
        console.log('User details:', user.displayName, user.email);
        showMainApp(user);
        // Update address display after login
        setTimeout(() => updateHomeAddressDisplay(), 1000);
    } else {
        // User is signed out - but don't show login screen, show main app for guest browsing
        console.log('Guest mode - showing main app without login');
        currentUser = null;
        // Update address display for guest mode
        setTimeout(() => updateHomeAddressDisplay(), 500);
        document.body.style.background = 'white';
        
        const loginContainer = document.getElementById('loginContainer');
        const mainApp = document.querySelector('.main-app');
        
        if (loginContainer) {
            loginContainer.style.display = 'none';
        }
        if (mainApp) {
            mainApp.style.display = 'block';
        }
        
        // Update auth button to show "Login"
        const authBtn = document.getElementById('authBtn');
        if (authBtn) {
            authBtn.textContent = 'Login';
            authBtn.onclick = showLoginModal;
        }
        
        // Load public data for guest browsing
        setTimeout(async () => {
            await loadSlidesFromFirebase();
            await loadCategoriesFromFirebase();
            await loadProductsFromFirebase();
        }, 500);
            
            // Show floating cart notification for guest users if cart has items
            setTimeout(() => {
                updateFloatingCartNotification();
            }, 1000);
    }
});

// Slideshow functionality
let slideIndex = 0;
let slideInterval;

function showSlide(index) {
    const slidesWrapper = document.querySelector('.slides-wrapper');
    const dots = document.querySelectorAll('.dot');
    
    if (slidesWrapper && slidesData.length > 0) {
        // Move the wrapper to show the current slide
        const translateX = -index * 100;
        slidesWrapper.style.transform = `translateX(${translateX}%)`;
        
        // Update dots
        dots.forEach(dot => dot.classList.remove('active'));
        if (dots[index]) {
            dots[index].classList.add('active');
        }
    }
}

function nextSlide() {
    if (slidesData.length > 0) {
        slideIndex = (slideIndex + 1) % slidesData.length;
        showSlide(slideIndex);
    }
}

function startSlideshow() {
    slideInterval = setInterval(nextSlide, 5000); // Change every 5 seconds
}

function stopSlideshow() {
    if (slideInterval) {
        clearInterval(slideInterval);
    }
}

// Manual slide navigation
window.currentSlide = function(index) {
    slideIndex = index - 1; // Convert to 0-based index
    showSlide(slideIndex);
    stopSlideshow();
    startSlideshow(); // Restart auto-scroll
};

// Navigation arrow functions
window.changeSlide = function(direction) {
    if (slidesData.length === 0) return;
    
    slideIndex += direction;
    
    if (slideIndex >= slidesData.length) {
        slideIndex = 0;
    } else if (slideIndex < 0) {
        slideIndex = slidesData.length - 1;
    }
    
    showSlide(slideIndex);
    stopSlideshow();
    startSlideshow(); // Restart auto-scroll
};

// Admin and User Management
let currentUser = null;
let adminUsers = ['moghaeashu@gmail.com']; // Permanent admin
let registeredUsers = [];
let slidesData = [];
let categoriesData = [];
let productsData = [];
let selectedCategory = '';
let cartItems = [];
let userAddressData = null;

// Load data from Firebase and localStorage
// Optimized loading with lazy loading and caching
async function loadData() {
    try {
        // Load admin and user data from localStorage (instant)
        const savedAdmins = localStorage.getItem('adminUsers');
        const savedUsers = localStorage.getItem('registeredUsers');
        
        if (savedAdmins) adminUsers = JSON.parse(savedAdmins);
        if (savedUsers) registeredUsers = JSON.parse(savedUsers);
        
        // Load critical data first (parallel loading)
        const [slidesResult, categoriesResult] = await Promise.all([
            loadSlidesFromFirebase(),
            loadCategoriesFromFirebase()
        ]);
        
        // Update UI with initial data immediately
        updateInitialUI();
        
        // Load products in background (lazy loading)
        setTimeout(async () => {
            await loadProductsFromFirebase();
            // Trigger events loading after products are loaded
            setTimeout(() => {
                loadEventsOnHomePage();
            }, 50);
        }, 10);
        
        // Preload critical images
        preloadCriticalImages();
        
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

function showLoadingIndicator() {
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loadingIndicator';
    loadingDiv.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(255,255,255,0.9); z-index: 9999; display: flex; align-items: center; justify-content: center; flex-direction: column;">
            <div style="width: 50px; height: 50px; border: 3px solid #f3f3f3; border-top: 3px solid #fbbf24; border-radius: 8px; animation: spin 1s linear infinite;"></div>
            <p style="margin-top: 15px; color: #666; font-family: 'Geologica', sans-serif;">Loading Ficokart...</p>
        </div>
        <style>
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    `;
    document.body.appendChild(loadingDiv);
}

function hideLoadingIndicator() {
    const loadingDiv = document.getElementById('loadingIndicator');
    if (loadingDiv) {
        loadingDiv.remove();
    }
}

function updateInitialUI() {
    // Initialize slideshow immediately with available data
    updateSlideshow();
    // Update categories display
    displayCategories();
}

// Wait for products to be loaded
function waitForProductsToLoad() {
    return new Promise((resolve) => {
        const checkProducts = () => {
            if (productsData && productsData.length > 0) {
                console.log('Products found:', productsData.length);
                resolve();
            } else {
                console.log('Waiting for products to load...');
                setTimeout(checkProducts, 100);
            }
        };
        checkProducts();
    });
}

function preloadCriticalImages() {
    // Preload logo and app icon
    const criticalImages = ['logo.png', 'applogo.png'];
    
    criticalImages.forEach(src => {
        const img = new Image();
        img.src = src;
    });
    
    // Preload first few category images if available
    if (categoriesData && categoriesData.length > 0) {
        categoriesData.slice(0, 6).forEach(category => {
            if (category.imageUrl) {
                const img = new Image();
                img.src = category.imageUrl;
            }
        });
    }
}

// Debounced scroll handler for better performance
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Firebase User Address Functions
async function saveUserAddressToFirebase(addressData) {
    try {
        if (!currentUser) return false;
        
        const userDocRef = doc(db, 'users', currentUser.uid);
        await setDoc(userDocRef, {
            email: currentUser.email,
            name: currentUser.displayName,
            phone: addressData.phone,
            state: addressData.state,
            city: addressData.city,
            address: addressData.address,
            pincode: addressData.pincode,
            nearby: addressData.nearby,
            googleMapsLink: addressData.googleMapsLink,
            updatedAt: new Date()
        }, { merge: true });
        
        console.log('User address saved to Firebase');
        return true;
    } catch (error) {
        console.error('Error saving user address:', error);
        return false;
    }
}

async function loadUserAddressFromFirebase() {
    try {
        if (!currentUser) return null;
        
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // Check if user has selected address from new addresses array
            if (userData.addresses && userData.addresses.length > 0 && userData.selectedAddressId) {
                const selectedAddress = userData.addresses.find(addr => addr.id === userData.selectedAddressId);
                if (selectedAddress) {
                    userAddressData = {
                        phone: selectedAddress.phone || '',
                        state: '',
                        city: '',
                        address: selectedAddress.address || '',
                        pincode: '',
                        nearby: '',
                        googleMapsLink: selectedAddress.googleMapsLink || ''
                    };
                    return userAddressData;
                }
            }
            
            // Fallback to old address format
            userAddressData = {
                phone: userData.phone || '',
                state: userData.state || '',
                city: userData.city || '',
                address: userData.address || '',
                pincode: userData.pincode || '',
                nearby: userData.nearby || '',
                googleMapsLink: userData.googleMapsLink || ''
            };
            return userAddressData;
        }
        return null;
    } catch (error) {
        console.error('Error loading user address:', error);
        return null;
    }
}

// Firebase Cart Functions
async function saveCartToFirebase() {
    try {
        if (!currentUser) return;
        
        const cartDocRef = doc(db, 'carts', currentUser.uid);
        if (cartItems.length === 0) {
            // If cart is empty, delete the document
            await deleteDoc(cartDocRef);
            console.log('Empty cart removed from Firebase');
        } else {
            await setDoc(cartDocRef, {
                userId: currentUser.uid,
                items: cartItems,
                updatedAt: new Date()
            });
            console.log('Cart saved to Firebase');
        }
    } catch (error) {
        console.error('Error saving cart:', error);
    }
}

async function loadCartFromFirebase() {
    try {
        if (!currentUser) {
            // If no user is logged in, clear cart and show empty state
            cartItems = [];
            updateCartCount();
            updateCartDisplay();
            updateCartDisplayMain();
            return;
        }
        
        const cartDocRef = doc(db, 'carts', currentUser.uid);
        const cartDoc = await getDoc(cartDocRef);
        
        if (cartDoc.exists()) {
            const cartData = cartDoc.data();
            cartItems = cartData.items || [];
            console.log('Cart loaded from Firebase:', cartItems.length, 'items');
        } else {
            // No cart document exists, initialize empty cart
            cartItems = [];
            console.log('No cart found in Firebase, initialized empty cart');
        }
        
        // Always update displays after loading
        updateCartCount();
        updateCartDisplay();
        updateCartDisplayMain();
        
    } catch (error) {
        console.error('Error loading cart:', error);
        // On error, initialize empty cart
        cartItems = [];
        updateCartCount();
        updateCartDisplay();
        updateCartDisplayMain();
    }
}

// Real-time cart synchronization using Firebase onSnapshot
let cartUnsubscribe = null;
let isUpdatingQuantity = false; // Flag to prevent conflicts

function setupCartRealTimeListener() {
    try {
        if (!currentUser) {
            if (cartUnsubscribe) {
                cartUnsubscribe();
                cartUnsubscribe = null;
            }
            return;
        }
        
        // Clean up existing listener
        if (cartUnsubscribe) {
            cartUnsubscribe();
        }
        
        const cartDocRef = doc(db, 'carts', currentUser.uid);
        cartUnsubscribe = onSnapshot(cartDocRef, (doc) => {
            // Skip updates if we're currently modifying quantity
            if (isUpdatingQuantity) {
                console.log('🚫 Skipping real-time update - quantity modification in progress');
                return;
            }
            
            if (doc.exists()) {
                const cartData = doc.data();
                const newItems = cartData.items || [];
                console.log('📥 Cart updated from Firebase real-time:', newItems.length, 'items');
                
                // Log quantity changes for debugging
                newItems.forEach(item => {
                    const existing = cartItems.find(ci => ci.id === item.id && ci.selectedSize === item.selectedSize);
                    if (existing && existing.quantity !== item.quantity) {
                        console.log(`🔄 Quantity changed for ${item.name} (${item.selectedSize}): ${existing.quantity} → ${item.quantity}`);
                    }
                });
                
                cartItems = newItems;
            } else {
                cartItems = [];
                console.log('Cart document deleted, cleared local cart');
            }
            
            // Update displays in real-time
            updateCartCount();
            updateCartDisplay();
            updateCartDisplayMain();
            updateAllProductButtons();
        }, (error) => {
            console.error('Error in cart real-time listener:', error);
        });
        
        console.log('Cart real-time listener setup complete');
        
    } catch (error) {
        console.error('Error setting up cart real-time listener:', error);
    }
}

// Firebase Orders Functions
async function saveOrderToFirebase(orderData, skipCashback = false) {
    try {
        if (!currentUser) return false;
        
        // Handle wallet deduction if applied (ONLY for single orders, not cart orders)
        let finalOrderData = { ...orderData };
        if (appliedWalletAmount > 0 && !skipCashback) {
            console.log('Deducting wallet amount (single order):', appliedWalletAmount);
            
            // Deduct from earned cashback (with proper rounding)
            const userRef = doc(db, 'users', currentUser.uid);
            const userDoc = await getDoc(userRef);
            const currentEarned = userDoc.exists() ? (userDoc.data().earnedCashback || 0) : 0;
            const newEarned = Math.max(0, Math.round((currentEarned - appliedWalletAmount) * 100) / 100);
            
            await setDoc(userRef, { earnedCashback: newEarned }, { merge: true });
            console.log('Earned cashback updated:', currentEarned, '->', newEarned);
            
            // Update order data with wallet info (with proper rounding)
            finalOrderData.originalAmount = Math.round(originalOrderAmount * 100) / 100;
            finalOrderData.walletUsed = Math.round(appliedWalletAmount * 100) / 100;
            finalOrderData.totalAmount = Math.round((originalOrderAmount - appliedWalletAmount) * 100) / 100;
            
            // Reset wallet application variables
            appliedWalletAmount = 0;
            originalOrderAmount = 0;
        } else if (skipCashback) {
            console.log('Cart order - preserving individual wallet amounts:', finalOrderData.walletUsed);
        }
        
        // Validate required fields before saving
        const requiredFields = ['productId', 'productName', 'productPrice', 'quantity', 'totalAmount', 'userPhone', 'userAddress'];
        const missingFields = requiredFields.filter(field => !finalOrderData[field]);
        
        if (missingFields.length > 0) {
            console.error('Missing required fields:', missingFields);
            console.error('Order data:', finalOrderData);
            throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }
        
        // Ensure all fields have proper values
        const cleanOrderData = {
            userId: currentUser.uid,
            userEmail: currentUser.email || '',
            userName: currentUser.displayName || 'User',
            productId: finalOrderData.productId || '',
            productName: finalOrderData.productName || '',
            productPrice: finalOrderData.productPrice || 0,
            productImage: finalOrderData.productImage || '',
            selectedSize: finalOrderData.selectedSize || '',
            quantity: finalOrderData.quantity || 1,
            totalAmount: finalOrderData.totalAmount || 0,
            userPhone: finalOrderData.userPhone || '',
            userAddress: finalOrderData.userAddress || '',
            googleMapsLink: finalOrderData.googleMapsLink || '',
            paymentMethod: finalOrderData.paymentMethod || 'cod',
            status: finalOrderData.status || 'Pending',
            orderType: finalOrderData.orderType || 'Single Product',
            originalAmount: finalOrderData.originalAmount || finalOrderData.totalAmount || 0,
            walletUsed: finalOrderData.walletUsed || 0,
            paymentId: finalOrderData.paymentId || '',
            paymentSignature: finalOrderData.paymentSignature || '',
            paymentStatus: finalOrderData.paymentStatus || 'pending',
            paymentDate: finalOrderData.paymentDate || '',
            createdAt: new Date()
        };
        
        const orderDocRef = await addDoc(collection(db, 'orders'), cleanOrderData);
        
        console.log('Order saved to Firebase with ID:', orderDocRef.id);
        
        // Calculate random cashback amount (4-9 rupees per 100 rupees) only if not skipping
        if (!skipCashback) {
            const cashbackBaseAmount = finalOrderData.originalAmount || finalOrderData.totalAmount;
            const cashbackPerHundred = Math.floor(Math.random() * 6) + 4; // Random between 4-9
            const cashbackAmount = Math.round(((cashbackBaseAmount * cashbackPerHundred) / 100) * 100) / 100;
            console.log(`Cashback calculation: ₹${cashbackBaseAmount} × ${cashbackPerHundred}% = ₹${cashbackAmount}`);
            
            // Update order with cashback info
            if (cashbackAmount > 0) {
            await setDoc(orderDocRef, {
                cashbackAmount: cashbackAmount,
                cashbackStatus: 'pending'
            }, { merge: true });
            
            console.log(`Order saved with ₹${cashbackAmount} pending cashback`);
            
            // Add to pending cashback immediately
            const userRef = doc(db, 'users', currentUser.uid);
            const userDoc = await getDoc(userRef);
            const currentPending = userDoc.exists() ? (userDoc.data().pendingCashback || 0) : 0;
            
            await setDoc(userRef, {
                pendingCashback: Math.round((currentPending + cashbackAmount) * 100) / 100
            }, { merge: true });
            
            // Show cashback notification
            setTimeout(() => {
                console.log('Showing cashback reward for amount:', cashbackAmount);
                showCashbackReward(cashbackAmount);
            }, 1000);
            }
        }
        
        return orderDocRef.id;
    } catch (error) {
        console.error('Error saving order:', error);
        return false;
    }
}

async function cancelOrderFromFirebase(orderId) {
    try {
        // First get the order data to calculate cashback deduction
        const orderRef = doc(db, 'orders', orderId);
        const orderDoc = await getDoc(orderRef);
        
        if (!orderDoc.exists()) {
            console.error('Order not found');
            return false;
        }
        
        const orderData = orderDoc.data();
        console.log('Cancelling order:', orderData);
        
        // Check if order is in cancellable status (not shipped)
        if (orderData.status === 'Shipped' || orderData.status === 'Delivered') {
            console.log('Cannot cancel shipped/delivered order');
            return { success: false, message: 'Cannot cancel shipped or delivered orders' };
        }
        
        // Use the actual cashback amount that was earned for this order
        const cashbackToDeduct = orderData.cashbackAmount || 0;
        console.log('Cashback to deduct:', cashbackToDeduct);
        
        // Check if wallet was used in this order
        const walletUsed = orderData.walletUsed || 0;
        console.log('Wallet amount used in order:', walletUsed);
        
        // Remove cashback from pending if order had cashback
        if (orderData.cashbackAmount > 0) {
            await cancelCashbackForOrder(orderId, orderData.cashbackAmount);
        }
        
        // Refund wallet amount if it was used
        if (walletUsed > 0) {
            await refundWalletAmount(walletUsed);
        }
        
        // Add total amount to cashback wallet for online payments
        let totalAmountRefunded = 0;
        if (orderData.paymentMethod === 'online') {
            totalAmountRefunded = orderData.totalAmount || 0;
            console.log('Adding total amount to cashback wallet for online payment cancellation:', totalAmountRefunded);
            await addCashbackToWallet(totalAmountRefunded, `Order cancellation refund for Order #${orderId}`);
        }
        
        // Delete the order
        await deleteDoc(orderRef);
        console.log('Order cancelled and removed from Firebase');
        
        return { 
            success: true, 
            cashbackDeducted: cashbackToDeduct, 
            walletRefunded: walletUsed,
            totalAmountRefunded: totalAmountRefunded
        };
    } catch (error) {
        console.error('Error cancelling order:', error);
        return { success: false, message: 'Error cancelling order' };
    }
}

// Add cashback to wallet (for refunds, cancellations, etc.)
async function addCashbackToWallet(amount, reason = 'Cashback added') {
    if (!currentUser || amount <= 0) return;
    
    try {
        console.log('Adding cashback to wallet:', amount, 'Reason:', reason);
        const userRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userRef);
        const currentEarned = userDoc.exists() ? (userDoc.data().earnedCashback || 0) : 0;
        const newEarned = Math.round((currentEarned + amount) * 100) / 100;
        
        await setDoc(userRef, { 
            earnedCashback: newEarned 
        }, { merge: true });
        
        console.log(`Cashback wallet updated: ₹${currentEarned} → ₹${newEarned} (Added ₹${amount})`);
        
        // Refresh wallet display for current user
        loadWalletBalance();
        
    } catch (error) {
        console.error('Error adding cashback to wallet:', error);
    }
}

// Refund wallet amount when order is cancelled
async function refundWalletAmount(amount) {
    if (!currentUser || amount <= 0) return;
    
    try {
        console.log('Refunding earned cashback amount:', amount);
        const userRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userRef);
        const currentEarned = userDoc.exists() ? (userDoc.data().earnedCashback || 0) : 0;
        const newEarned = Math.round((currentEarned + amount) * 100) / 100;
        
        await setDoc(userRef, { earnedCashback: newEarned }, { merge: true });
        console.log('Cashback refund successful. Earned updated:', currentEarned, '->', newEarned);
        
        // Update wallet display if visible
        loadWalletBalance();
        
    } catch (error) {
        console.error('Error refunding wallet amount:', error);
    }
}

// Deduct cashback from wallet when order is cancelled
async function deductCashbackFromWallet(amount) {
    if (!currentUser || amount <= 0) return;
    
    try {
        console.log('Deducting cashback from wallet:', amount);
        const userRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userRef);
        const currentBalance = userDoc.exists() ? (userDoc.data().walletBalance || 0) : 0;
        
        // Ensure balance doesn't go negative (with proper rounding)
        const newBalance = Math.max(0, Math.round((currentBalance - amount) * 100) / 100);
        console.log('Current balance:', currentBalance, 'New balance:', newBalance);
        
        await setDoc(userRef, { walletBalance: newBalance }, { merge: true });
        console.log('Cashback deducted successfully');
        
        // Update wallet balance display if wallet is open
        loadWalletBalance();
        
    } catch (error) {
        console.error('Error deducting cashback:', error);
    }
}

async function loadOrdersFromFirebase() {
    try {
        if (!currentUser) return [];
        
        const ordersQuery = query(
            collection(db, 'orders'),
            where('userId', '==', currentUser.uid)
        );
        
        const querySnapshot = await getDocs(ordersQuery);
        const orders = [];
        
        querySnapshot.forEach((doc) => {
            orders.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Sort by creation date (newest first)
        orders.sort((a, b) => b.createdAt.toDate() - a.createdAt.toDate());
        
        console.log('Orders loaded from Firebase:', orders.length, 'orders');
        return orders;
    } catch (error) {
        console.error('Error loading orders:', error);
        return [];
    }
}

// Store all orders for filtering
let allAdminOrders = [];

// Admin: Load all pending and shipped orders across users
async function loadPendingOrdersForAdmin() {
    try {
        const adminOrdersList = document.getElementById('adminOrdersList');
        if (!adminOrdersList) return;
        
        adminOrdersList.innerHTML = '<p style="text-align:center; color:#666; padding: 20px;">Loading orders...</p>';
        
        const ordersQuery = query(
            collection(db, 'orders'),
            where('status', 'in', ['Pending', 'Shipped'])
        );
        const snapshot = await getDocs(ordersQuery);

        allAdminOrders = [];
        snapshot.forEach(d => allAdminOrders.push({ id: d.id, ...d.data() }));

        // Sort newest first if createdAt exists
        allAdminOrders.sort((a, b) => {
            const aTime = a.createdAt && a.createdAt.toDate ? a.createdAt.toDate().getTime() : 0;
            const bTime = b.createdAt && b.createdAt.toDate ? b.createdAt.toDate().getTime() : 0;
            return bTime - aTime;
        });

        displayFilteredOrders(allAdminOrders);
    } catch (error) {
        console.error('Error loading orders for admin:', error);
        const adminOrdersList = document.getElementById('adminOrdersList');
        if (adminOrdersList) adminOrdersList.innerHTML = '<p style="text-align:center; color:#e74c3c; padding: 20px;">Failed to load orders.</p>';
    }
}

// Display filtered orders
function displayFilteredOrders(orders) {
    const adminOrdersList = document.getElementById('adminOrdersList');
    if (!adminOrdersList) return;

    adminOrdersList.innerHTML = '';
    if (orders.length === 0) {
        adminOrdersList.innerHTML = '<p style="text-align:center; color:#666; padding: 20px;">No orders found.</p>';
        return;
    }

    orders.forEach(order => {
        const el = document.createElement('div');
        el.className = 'admin-item';
        el.style.cssText = `
            background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
            border: none;
            border-radius: 12px;
            padding: 12px;
            margin-bottom: 12px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.06);
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
            cursor: pointer;
        `;
        
        // Add hover effects
        el.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
            this.style.boxShadow = '0 8px 20px rgba(0,0,0,0.12)';
        });
        
        el.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 4px 15px rgba(0,0,0,0.06)';
        });
        el.innerHTML = `
            <div style="position: absolute; top: 0; left: 0; width: 100%; height: 3px; background: ${order.status === 'Pending' ? 'linear-gradient(90deg, #f39c12, #e67e22)' : order.status === 'Shipped' ? 'linear-gradient(90deg, #3498db, #2980b9)' : 'linear-gradient(90deg, #27ae60, #2ecc71)'};"></div>
            
            <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px;">
                <div style="position: relative;">
                    <img src="${order.productImage || ''}" alt="${order.productName || ''}" style="width: 40px; height: 40px; object-fit: contain; border-radius: 6px; background: linear-gradient(135deg, #f8f9fa, #e9ecef); border: 1px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.1);" onerror="this.style.display='none'">
                    <div style="position: absolute; top: -3px; right: -3px; background: ${order.status === 'Pending' ? '#f39c12' : order.status === 'Shipped' ? '#3498db' : '#27ae60'}; color: white; padding: 1px 3px; border-radius: 4px; font-size: 7px; font-weight: 600; box-shadow: 0 1px 3px rgba(0,0,0,0.2);">
                        ${order.status === 'Pending' ? '⏳' : order.status === 'Shipped' ? '🚚' : '✅'}
                    </div>
                </div>
                
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <h3 style="margin: 0; font-size: 13px; font-weight: 700; color: #2c3e50; line-height: 1.2;">${order.productName || 'Product'}</h3>
                        <span style="font-size: 9px; color: #95a5a6; background: rgba(149, 165, 166, 0.1); padding: 1px 4px; border-radius: 3px;">${order.status}</span>
                    </div>
                </div>
            </div>
            
            <div style="background: rgba(52, 152, 219, 0.08); border-radius: 8px; padding: 8px; margin-bottom: 6px; border-left: 3px solid #3498db;">
                <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <span style="color: #3498db; font-size: 11px;">📦</span>
                        <span style="font-size: 11px; color: #2c3e50; font-weight: 600;">Qty: ${order.quantity || 1}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <span style="color: #27ae60; font-size: 11px;">💰</span>
                        <span style="font-size: 10px; color: #27ae60; font-weight: 700;">₹${Math.round((order.totalAmount || 0) * 100) / 100}</span>
                    </div>
                    ${order.walletUsed > 0 ? `
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <span style="color: #f39c12; font-size: 11px;">💰</span>
                        <span style="font-size: 11px; color: #f39c12; font-weight: 600;">Wallet Applied: ₹${Math.round((order.walletUsed || 0) * 100) / 100}</span>
                    </div>
                    ` : ''}
                    ${order.originalAmount && order.originalAmount !== order.totalAmount ? `
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <span style="color: #95a5a6; font-size: 11px;">💸</span>
                        <span style="font-size: 10px; color: #95a5a6; text-decoration: line-through;">Original: ₹${Math.round((order.originalAmount || 0) * 100) / 100}</span>
                    </div>
                    ` : ''}
                </div>
                <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(52, 152, 219, 0.15);">
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <span style="color: #f39c12; font-size: 11px;">💳</span>
                        <span style="font-size: 11px; color: #2c3e50; font-weight: 500;">Payment: ${order.paymentMethod === 'cod' ? '💵 Cash on Delivery' : order.paymentMethod === 'online' ? '💳 Online Payment - Already Paid' : order.paymentMethod || 'Not specified'}</span>
                    </div>
                </div>
            </div>
            
            <div style="background: rgba(149, 165, 166, 0.08); border-radius: 6px; padding: 8px; margin-bottom: 6px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 11px;">
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <span style="color: #3498db;">👤</span>
                        <span style="color: #2c3e50; font-weight: 500;">${order.userName || 'N/A'}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <span style="color: #e74c3c;">📧</span>
                        <span style="color: #2c3e50; font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${order.userEmail || 'N/A'}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <span style="color: #27ae60;">📞</span>
                        <span style="color: #2c3e50; font-weight: 500;">${order.userPhone || 'N/A'}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <span style="color: #9b59b6;">📍</span>
                        <span style="color: #2c3e50; font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Location</span>
                    </div>
                </div>
                <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(149, 165, 166, 0.15);">
                    <div style="display: flex; align-items: flex-start; gap: 4px;">
                        <span style="color: #9b59b6; font-size: 10px; margin-top: 1px;">📍</span>
                        <span style="color: #2c3e50; font-size: 10px; line-height: 1.4; word-break: break-word;">${order.userAddress || 'Address not provided'}</span>
                    </div>
                </div>
            </div>
            
            <div style="background: rgba(52, 73, 94, 0.05); border-radius: 4px; padding: 4px; margin-bottom: 8px;">
                <div style="display: flex; align-items: center; gap: 3px;">
                    <span style="color: #34495e; font-size: 9px;">🆔</span>
                    <span style="font-family: 'Courier New', monospace; font-size: 8px; color: #34495e; background: rgba(52, 73, 94, 0.1); padding: 1px 4px; border-radius: 2px;">${order.id}</span>
                </div>
            </div>
            
            <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(149, 165, 166, 0.15);">
                <button class="btn-invoice" style="flex: 1; min-width: 70px; background: linear-gradient(135deg, #3498db, #2980b9); border: none; padding: 6px 8px; border-radius: 6px; color: white; font-size: 10px; font-weight: 600; box-shadow: 0 2px 6px rgba(52, 152, 219, 0.3); transition: all 0.2s ease; cursor: pointer;" onclick="showInvoice('${order.id}')" onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(52, 152, 219, 0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 6px rgba(52, 152, 219, 0.3)'">📄 Invoice</button>
                
                <button class="btn-location" style="flex: 1; min-width: 70px; background: linear-gradient(135deg, #4285f4, #1a73e8); border: none; padding: 6px 8px; border-radius: 6px; color: white; font-size: 10px; font-weight: 600; box-shadow: 0 2px 6px rgba(66, 133, 244, 0.3); transition: all 0.2s ease; cursor: pointer;" onclick="openUserLocation('${order.id}')" onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(66, 133, 244, 0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 6px rgba(66, 133, 244, 0.3)'">📍 Location</button>
                
                ${order.status === 'Pending' ? `
                <button class="btn-primary" style="flex: 1; min-width: 60px; background: linear-gradient(135deg, #f39c12, #e67e22); border: none; padding: 6px 8px; border-radius: 6px; color: white; font-size: 10px; font-weight: 600; box-shadow: 0 2px 6px rgba(243, 156, 18, 0.3); transition: all 0.2s ease; cursor: pointer;" onclick="adminShipOrder('${order.id}')" onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(243, 156, 18, 0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 6px rgba(243, 156, 18, 0.3)'">🚚 Ship</button>
                ` : ''}
                
                <button class="btn-success" style="flex: 1; min-width: 70px; background: linear-gradient(135deg, #27ae60, #2ecc71); border: none; padding: 6px 8px; border-radius: 6px; color: white; font-size: 10px; font-weight: 600; box-shadow: 0 2px 6px rgba(39, 174, 96, 0.3); transition: all 0.2s ease; cursor: pointer;" onclick="adminCompleteOrder('${order.id}')" onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(39, 174, 96, 0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 6px rgba(39, 174, 96, 0.3)'">✅ Complete</button>
                
                <button class="btn-danger" style="flex: 1; min-width: 60px; background: linear-gradient(135deg, #e74c3c, #c0392b); border: none; padding: 6px 8px; border-radius: 6px; color: white; font-size: 10px; font-weight: 600; box-shadow: 0 2px 6px rgba(231, 76, 60, 0.3); transition: all 0.2s ease; cursor: pointer;" onclick="adminRejectOrder('${order.id}')" onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(231, 76, 60, 0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 6px rgba(231, 76, 60, 0.3)'">❌ Reject</button>
            </div>
        `;
        adminOrdersList.appendChild(el);
    });
}

// Open user's Google Maps location
window.openUserLocation = async function(orderId) {
    let order = null;
    
    // First, check if order exists in admin orders (for admin panel)
    if (allAdminOrders && allAdminOrders.length > 0) {
        order = allAdminOrders.find(o => o.id === orderId);
    }
    
    // If not found in admin orders, check global orders (for user orders)
    if (!order && globalOrdersData && globalOrdersData.length > 0) {
        order = globalOrdersData.find(o => o.id === orderId);
    }
    
    // If still not found, try to load from Firebase directly
    if (!order) {
        try {
            console.log('Order not found in cache, loading from Firebase...');
            const orderDoc = await getDoc(doc(db, 'orders', orderId));
            if (orderDoc.exists()) {
                order = { id: orderDoc.id, ...orderDoc.data() };
            } else {
                showNotification('❌ Order not found in database', 'error');
                return;
            }
        } catch (error) {
            console.error('Error loading order from Firebase:', error);
            showNotification('❌ Error loading order data', 'error');
            return;
        }
    }
    
    // Add to navigation stack
    pushToNavigationStack('user-location-modal', { orderId: orderId });
    
    const userLocation = order.userGoogleMapsLink || order.googleMapsLink || '';
    
    console.log('Order data:', order);
    console.log('userGoogleMapsLink:', order.userGoogleMapsLink);
    console.log('googleMapsLink:', order.googleMapsLink);
    console.log('Final userLocation:', userLocation);
    console.log('Available fields:', Object.keys(order));
    
    if (!userLocation) {
        showNotification('❌ No location link available for this order', 'warning');
        return;
    }
    
    // Open the Google Maps link in a new tab
    window.open(userLocation, '_blank');
    showNotification('📍 Opening user location...', 'success');
};

// Open admin location from user order view
window.openAdminLocation = function(adminLocation) {
    if (!adminLocation) {
        showNotification('❌ No admin location available', 'warning');
        return;
    }
    
    // Open the admin Google Maps link in a new tab
    window.open(adminLocation, '_blank');
    showNotification('📍 Opening admin location...', 'success');
};

// Filter orders by status
window.filterOrders = function() {
    const filterValue = document.getElementById('orderStatusFilter').value;
    const searchValue = document.getElementById('orderSearchInput').value.toLowerCase();
    
    let filteredOrders = allAdminOrders;
    
    // Apply status filter
    if (filterValue !== 'all') {
        filteredOrders = filteredOrders.filter(order => order.status === filterValue);
    }
    
    // Apply search filter
    if (searchValue) {
        filteredOrders = filteredOrders.filter(order => 
            (order.userEmail && order.userEmail.toLowerCase().includes(searchValue)) ||
            (order.userPhone && order.userPhone.includes(searchValue))
        );
    }
    
    displayFilteredOrders(filteredOrders);
}

// Search orders by email or phone
window.searchOrders = function() {
    filterOrders(); // Use the same filtering logic
}

// Clear all filters
window.clearFilters = function() {
    document.getElementById('orderStatusFilter').value = 'all';
    document.getElementById('orderSearchInput').value = '';
    displayFilteredOrders(allAdminOrders);
}

// Admin: update order status to Shipped
window.adminShipOrder = async function(orderId) {
    try {
        // Get current admin's address data from Firebase
        let adminLocation = '';
        if (auth.currentUser) {
            try {
                const adminDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
                if (adminDoc.exists()) {
                    const adminData = adminDoc.data();
                    adminLocation = adminData.googleMapsLink || '';
                }
            } catch (e) {
                console.log('Could not fetch admin address data:', e);
            }
        }
        
        await updateDoc(doc(db, 'orders', orderId), { 
            status: 'Shipped',
            shippedAt: new Date(),
            adminLocation: adminLocation,
            shippedByAdmin: auth.currentUser?.uid || ''
        });
        
        showNotification('Order marked as shipped! 🚚', 'success');
        
        // Don't schedule deletion for shipped orders - keep them in admin panel
        // Only delete when admin marks as Complete or Reject
        
        loadPendingOrdersForAdmin();
        loadOrdersDataFromFirebase();
        
        // Also refresh delivery orders if delivery panel is open
        if (document.getElementById('deliveryPanel').style.display === 'flex') {
            loadDeliveryOrders();
        }
    } catch (e) {
        console.error('Error shipping order:', e);
        showNotification('Failed to ship order', 'error');
    }
}

// Admin: update order status to Completed
window.adminCompleteOrder = async function(orderId) {
    try {
        // Get order data first to check for cashback
        const orderDoc = await getDoc(doc(db, 'orders', orderId));
        const orderData = orderDoc.data();
        
        await updateDoc(doc(db, 'orders', orderId), { 
            status: 'Completed',
            completedAt: new Date()
        });
        
        // Transfer cashback from pending to earned if order has cashback
        if (orderData && orderData.cashbackAmount > 0 && orderData.userId) {
            console.log(`Transferring ₹${orderData.cashbackAmount} from pending to earned cashback for customer ${orderData.userId}`);
            await completeCashbackForOrder(orderId, orderData.cashbackAmount, orderData.userId);
            showNotification(`Order completed! Customer earned ₹${orderData.cashbackAmount} cashback ✅`, 'success');
        } else {
            showNotification('Order marked as Completed ✅', 'success');
        }
        
        // Schedule automatic deletion after 8 days
        scheduleOrderDeletion(orderId, 8 * 24 * 60 * 60 * 1000); // 8 days in milliseconds
        
        loadPendingOrdersForAdmin();
        // Also refresh user orders if currently viewing
        loadOrdersDataFromFirebase();
        
        // Also refresh delivery orders if delivery panel is open
        if (document.getElementById('deliveryPanel').style.display === 'flex') {
            loadDeliveryOrders();
        }
    } catch (e) {
        console.error('Error completing order:', e);
        showNotification('Failed to complete order', 'error');
    }
}

// Admin: update order status to Rejected
window.adminRejectOrder = async function(orderId) {
    try {
        // Get order data first to check for cashback
        const orderDoc = await getDoc(doc(db, 'orders', orderId));
        const orderData = orderDoc.data();
        
        await updateDoc(doc(db, 'orders', orderId), { 
            status: 'Rejected',
            rejectedAt: new Date()
        });
        
        // Cancel pending cashback if order has cashback
        if (orderData && orderData.cashbackAmount > 0 && orderData.userId) {
            console.log(`Cancelling ₹${orderData.cashbackAmount} pending cashback for rejected order of customer ${orderData.userId}`);
            await cancelCashbackForOrder(orderId, orderData.cashbackAmount, orderData.userId);
            showNotification(`Order rejected! Customer's ₹${orderData.cashbackAmount} cashback cancelled ❌`, 'success');
        } else {
            showNotification('Order marked as Rejected ❌', 'success');
        }
        
        // Schedule automatic deletion after 8 days
        scheduleOrderDeletion(orderId, 8 * 24 * 60 * 60 * 1000); // 8 days in milliseconds
        
        loadPendingOrdersForAdmin();
        loadOrdersDataFromFirebase();
        
        // Also refresh delivery orders if delivery panel is open
        if (document.getElementById('deliveryPanel').style.display === 'flex') {
            loadDeliveryOrders();
        }
    } catch (e) {
        console.error('Error rejecting order:', e);
        showNotification('Failed to reject order', 'error');
    }
}

// Schedule order deletion after specified time
function scheduleOrderDeletion(orderId, delayMs) {
    console.log(`Scheduling deletion of order ${orderId} in ${delayMs / 1000 / 60} minutes`);
    
    setTimeout(async () => {
        try {
            await deleteDoc(doc(db, 'orders', orderId));
            console.log(`Order ${orderId} automatically deleted after completion/rejection`);
            
            // Refresh orders display if user is currently viewing orders
            if (currentUser) {
                loadOrdersDataFromFirebase();
            }
            
            // Refresh admin orders if admin panel is open
            loadPendingOrdersForAdmin();
            
        } catch (error) {
            console.error(`Error auto-deleting order ${orderId}:`, error);
        }
    }, delayMs);
}

// Start countdown timer for order deletion
function startCountdownTimer(orderId, statusChangeTime) {
    console.log(`🕒 Starting countdown timer for order: ${orderId}`, statusChangeTime);
    
    // Try multiple times to find the element (in case DOM is still loading)
    let attempts = 0;
    const maxAttempts = 10;
    
    function tryStartTimer() {
        const countdownElement = document.getElementById(`countdown-${orderId}`);
        
        if (!countdownElement) {
            attempts++;
            console.log(`❌ Attempt ${attempts}: Countdown element not found for order: ${orderId}`);
            
            if (attempts < maxAttempts) {
                setTimeout(tryStartTimer, 200); // Try again after 200ms
                return;
            } else {
                console.log(`🚫 Max attempts reached. Element countdown-${orderId} not found.`);
                return;
            }
        }
        
        console.log(`✅ Countdown element found for order: ${orderId} after ${attempts + 1} attempts`);
        
        const statusDate = statusChangeTime?.toDate ? statusChangeTime.toDate() : new Date(statusChangeTime);
        const eightDays = 8 * 24 * 60 * 60 * 1000; // 8 days in milliseconds
        
        console.log(`📅 Status date: ${statusDate}, Current time: ${new Date()}`);
        
        // Clear any existing "Calculating..." message and set initial styling
        countdownElement.style.color = '#dc3545';
        countdownElement.style.fontWeight = '600';
        countdownElement.style.fontFamily = 'monospace';
        
        startActualTimer();
        
        function startActualTimer() {
    
    function updateTimer() {
        const now = new Date();
        const timeSinceStatusChange = now.getTime() - statusDate.getTime();
        const remainingTime = eightDays - timeSinceStatusChange;
        
        if (remainingTime <= 0) {
            countdownElement.textContent = 'Deleting...';
            const timerDiv = document.getElementById(`timer-${orderId}`);
            if (timerDiv) {
                timerDiv.style.background = '#f8d7da';
                timerDiv.style.color = '#721c24';
                timerDiv.innerHTML = '🗑️ Order will be deleted shortly...';
            }
            
            // Actually delete the order when timer reaches 0
            setTimeout(async () => {
                try {
                    await deleteDoc(doc(db, 'orders', orderId));
                    console.log(`Order ${orderId} deleted by timer`);
                    
                    // Refresh orders display
                    if (currentUser) {
                        loadOrdersDataFromFirebase();
                    }
                    
                    showNotification('Order automatically deleted 🗑️', 'info', 3000);
                } catch (error) {
                    console.error(`Error deleting order ${orderId} by timer:`, error);
                }
            }, 2000); // Delete after 2 seconds of showing "deleting" message
            
            return;
        }
        
        const days = Math.floor(remainingTime / (1000 * 60 * 60 * 24));
        const hours = Math.floor((remainingTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remainingTime % (1000 * 60)) / 1000);
        
        // Add pulsing animation when time is running out
        if (remainingTime < 60000) { // Less than 1 minute
            countdownElement.style.animation = 'countdownPulse 0.8s infinite';
            countdownElement.style.color = '#dc3545';
            countdownElement.style.fontWeight = '700';
        } else if (remainingTime < 3600000) { // Less than 1 hour
            countdownElement.style.color = '#fd7e14';
            countdownElement.style.animation = 'countdownPulse 1.5s infinite';
            countdownElement.style.fontWeight = '600';
        } else {
            countdownElement.style.color = '#dc3545';
            countdownElement.style.animation = 'none';
            countdownElement.style.fontWeight = '600';
        }
        
        if (days > 0) {
            countdownElement.innerHTML = `🗓️ <strong>${days}</strong> Days <strong>${hours}</strong>h <strong>${minutes}</strong>m`;
        } else if (hours > 0) {
            countdownElement.innerHTML = `⏰ <strong>${hours}</strong>h <strong>${minutes}</strong>m <strong>${seconds}</strong>s`;
        } else if (minutes > 0) {
            countdownElement.innerHTML = `⏱️ <strong>${minutes}</strong>m <strong>${seconds}</strong>s`;
        } else {
            countdownElement.innerHTML = `🚨 <strong>${seconds}</strong> seconds`;
        }
    }
    
        // Update immediately
        console.log(`🚀 Starting timer update for order: ${orderId}`);
        updateTimer();
        
        // Update every second
        const interval = setInterval(() => {
            updateTimer();
            
            // Stop timer when time is up
            const now = new Date();
            const timeSinceStatusChange = now.getTime() - statusDate.getTime();
            const eightDays = 8 * 24 * 60 * 60 * 1000; // 8 days in milliseconds
            if (timeSinceStatusChange >= eightDays) {
                clearInterval(interval);
            }
        }, 1000);
        }
    }
    
    // Start the timer attempt process
    tryStartTimer();
}

// Check for existing completed/rejected orders on app load and schedule their deletion
async function checkAndScheduleExistingOrders() {
    try {
        const completedQuery = query(
            collection(db, 'orders'),
            where('status', 'in', ['Completed', 'Rejected', 'Shipped'])
        );
        
        const snapshot = await getDocs(completedQuery);
        
        snapshot.forEach((doc) => {
            const orderData = doc.data();
            const completedAt = orderData.completedAt?.toDate();
            const rejectedAt = orderData.rejectedAt?.toDate();
            const shippedAt = orderData.shippedAt?.toDate();
            const statusChangeTime = completedAt || rejectedAt || shippedAt;
            
            if (statusChangeTime) {
                const timeSinceStatusChange = Date.now() - statusChangeTime.getTime();
                const eightDays = 8 * 24 * 60 * 60 * 1000;
                
                if (timeSinceStatusChange >= eightDays) {
                    // Order is already past 8 days, delete immediately
                    deleteDoc(doc.ref).then(() => {
                        console.log(`Expired order ${doc.id} deleted immediately`);
                    }).catch(error => {
                        console.error(`Error deleting expired order ${doc.id}:`, error);
                    });
                } else {
                    // Schedule deletion for remaining time
                    const remainingTime = eightDays - timeSinceStatusChange;
                    scheduleOrderDeletion(doc.id, remainingTime);
                }
            }
        });
    } catch (error) {
        console.error('Error checking existing orders for deletion:', error);
    }
}

// Save admin/user data to localStorage
function saveData() {
    localStorage.setItem('adminUsers', JSON.stringify(adminUsers));
    localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));
}

// Load slides from Firebase Firestore
async function loadSlidesFromFirebase() {
    try {
        console.log('Loading slides from Firebase...');
        const querySnapshot = await getDocs(collection(db, 'slides'));
        slidesData = [];
        querySnapshot.forEach((doc) => {
            console.log('Found slide:', doc.id, doc.data());
            slidesData.push({
                id: doc.id,
                ...doc.data()
            });
        });
        // Sort slides by order if available, otherwise by creation time
        slidesData.sort((a, b) => (a.order || 0) - (b.order || 0));
        console.log('Total slides loaded:', slidesData.length);
        
        // Add fallback slides if no slides found
        if (slidesData.length === 0) {
            console.log('No slides found, adding fallback slides');
            slidesData = [
                {
                    id: 'fallback1',
                    title: 'Welcome to Ficokart',
                    url: 'https://via.placeholder.com/800x400/3498db/ffffff?text=Welcome+to+Ficokart',
                    order: 0
                },
                {
                    id: 'fallback2', 
                    title: 'Shop Amazing Products',
                    url: 'https://via.placeholder.com/800x400/27ae60/ffffff?text=Shop+Amazing+Products',
                    order: 1
                }
            ];
        }
        
        updateSlideshow();
    } catch (error) {
        console.error('Error loading slides from Firebase:', error);
        // Fallback slides for error case
        slidesData = [
            {
                id: 'fallback1',
                title: 'Welcome to Ficokart',
                url: 'https://via.placeholder.com/800x400/3498db/ffffff?text=Welcome+to+Ficokart',
                order: 0
            }
        ];
        updateSlideshow();
    }
}

// Convert Google Drive sharing URL to direct image URL
function convertGoogleDriveUrl(url) {
    if (url.includes('drive.google.com/file/d/')) {
        const fileId = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (fileId && fileId[1]) {
            // Try multiple formats for better compatibility
            return `https://lh3.googleusercontent.com/d/${fileId[1]}=w800-h400-c`;
        }
    }
    return url; // Return original URL if not a Google Drive link
}

// Add event to Firebase Firestore
async function addEventToFirebase(eventData) {
    try {
        // Remove any existing local ID before sending to Firebase
        delete eventData.id;
        
        const docRef = await addDoc(collection(db, 'events'), eventData);
        console.log('Event added with Firebase ID: ', docRef.id);
        
        // Create new event object with Firebase ID
        const firebaseEvent = {
            id: docRef.id,
            ...eventData
        };
        
        console.log('Event with Firebase ID:', firebaseEvent);
        eventsData.push(firebaseEvent);
        return true;
    } catch (error) {
        console.error('Error adding event: ', error);
        return false;
    }
}

// Remove event from Firebase Firestore
async function removeEventFromFirebase(eventId) {
    try {
        console.log('Attempting to delete event with ID:', eventId);
        console.log('Current eventsData before deletion:', eventsData);
        
        // Create document reference
        const eventDocRef = doc(db, 'events', eventId);
        console.log('Document reference created for:', eventId);
        
        // Delete from Firebase with await and error checking
        const deleteResult = await deleteDoc(eventDocRef);
        console.log('Firebase deleteDoc completed. Result:', deleteResult);
        
        // Verify deletion by trying to get the document
        try {
            const deletedDoc = await getDoc(eventDocRef);
            if (deletedDoc.exists()) {
                console.error('ERROR: Document still exists in Firebase after deletion!');
                return false;
            } else {
                console.log('SUCCESS: Document confirmed deleted from Firebase');
            }
        } catch (verifyError) {
            console.log('Document verification failed (expected for deleted doc):', verifyError.message);
        }
        
        // Remove from local array only after Firebase deletion is confirmed
        eventsData = eventsData.filter(event => event.id !== eventId);
        console.log('Event removed from local array. New eventsData:', eventsData);
        
        return true;
    } catch (error) {
        console.error('Error removing event from Firebase:', error);
        console.error('Event ID that failed to delete:', eventId);
        console.error('Full error object:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        return false;
    }
}

// Load events from Firebase
async function loadEventsFromFirebase() {
    try {
        const querySnapshot = await getDocs(collection(db, 'events'));
        eventsData = [];
        querySnapshot.forEach((doc) => {
            eventsData.push({
                id: doc.id,
                ...doc.data()
            });
        });
        console.log('Events loaded:', eventsData);
        return true;
    } catch (error) {
        console.error('Error loading events: ', error);
        return false;
    }
}

// Add slide to Firebase Firestore
async function addSlideToFirebase(title, url) {
    try {
        // Convert Google Drive URL to direct image URL
        const convertedUrl = convertGoogleDriveUrl(url);
        console.log('Original URL:', url);
        console.log('Converted URL:', convertedUrl);
        
        const docRef = await addDoc(collection(db, 'slides'), {
            title: title,
            url: convertedUrl,
            originalUrl: url,
            order: slidesData.length,
            createdAt: new Date(),
            createdBy: currentUser?.email || 'unknown'
        });
        console.log('Slide added with ID: ', docRef.id);
        await loadSlidesFromFirebase(); // Refresh slides
        return true;
    } catch (error) {
        console.error('Error adding slide to Firebase:', error);
        return false;
    }
}

// Remove slide from Firebase Firestore
async function removeSlideFromFirebase(slideId) {
    try {
        await deleteDoc(doc(db, 'slides', slideId));
        console.log('Slide removed from Firebase');
        await loadSlidesFromFirebase(); // Refresh slides
        return true;
    } catch (error) {
        console.error('Error removing slide from Firebase:', error);
        return false;
    }
}

// Load categories from Firebase Firestore
async function loadCategoriesFromFirebase() {
    try {
        console.log('Loading categories from Firebase...');
        const querySnapshot = await getDocs(collection(db, 'categories'));
        categoriesData = [];
        querySnapshot.forEach((doc) => {
            console.log('Found category:', doc.id, doc.data());
            categoriesData.push({
                id: doc.id,
                ...doc.data()
            });
        });
        // Sort categories by order if available, otherwise by creation time
        categoriesData.sort((a, b) => (a.order || 0) - (b.order || 0));
        console.log('Total categories loaded:', categoriesData.length);
        
        // Add fallback categories if no categories found
        if (categoriesData.length === 0) {
            console.log('No categories found, adding fallback categories');
            categoriesData = [
                {
                    id: 'clothing',
                    name: 'Clothing',
                    imageUrl: 'https://via.placeholder.com/200x150/e74c3c/ffffff?text=Clothing',
                    order: 0
                },
                {
                    id: 'footwear',
                    name: 'Footwear',
                    imageUrl: 'https://via.placeholder.com/200x150/3498db/ffffff?text=Footwear',
                    order: 1
                },
                {
                    id: 'accessories',
                    name: 'Accessories',
                    imageUrl: 'https://via.placeholder.com/200x150/27ae60/ffffff?text=Accessories',
                    order: 2
                }
            ];
        }
        
        updateCategoriesDisplay();
    } catch (error) {
        console.error('Error loading categories from Firebase:', error);
        // Fallback categories for error case
        categoriesData = [
            {
                id: 'general',
                name: 'General',
                imageUrl: 'https://via.placeholder.com/200x150/95a5a6/ffffff?text=General',
                order: 0
            }
        ];
        updateCategoriesDisplay();
    }
}

// Add category to Firebase Firestore
async function addCategoryToFirebase(name, imageUrl, bannerUrl, subcategories = []) {
    try {
        const convertedUrl = convertGoogleDriveUrl(imageUrl);
        const convertedBannerUrl = convertGoogleDriveUrl(bannerUrl);
        console.log('Adding category:', name, convertedUrl, 'with banner:', convertedBannerUrl, 'and subcategories:', subcategories);
        
        const categoryData = {
            name: name,
            imageUrl: convertedUrl,
            bannerUrl: convertedBannerUrl,
            subcategories: subcategories,
            createdAt: new Date()
        };
        
        const docRef = await addDoc(collection(db, 'categories'), categoryData);
        console.log('Category added with ID:', docRef.id);
        return true;
    } catch (error) {
        console.error('Error adding category:', error);
        return false;
    }
}

// Remove category from Firebase Firestore
async function removeCategoryFromFirebase(categoryId) {
    try {
        await deleteDoc(doc(db, 'categories', categoryId));
        console.log('Category removed from Firebase');
        await loadCategoriesFromFirebase();
        return true;
    } catch (error) {
        console.error('Error removing category from Firebase:', error);
        return false;
    }
}

// Update categories display on main page
function updateCategoriesDisplay() {
    const categoriesGrid = document.getElementById('categoriesGrid');
    if (!categoriesGrid) return;
    
    // Preserve the title and clear only category items
    const title = categoriesGrid.querySelector('.section-title');
    categoriesGrid.innerHTML = '';
    if (title) {
        categoriesGrid.appendChild(title);
    }
    
    categoriesData.forEach(category => {
        const categoryItem = document.createElement('div');
        categoryItem.className = 'category-item';
        categoryItem.onclick = () => openCategoryModal(category.name);
        
        categoryItem.innerHTML = `
            <img src="${category.imageUrl}" alt="${category.name}" class="category-image" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjgwIiB2aWV3Qm94PSIwIDAgMTIwIDgwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cmVjdCB3aWR0aD0iMTIwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjZjNmNGY2Ii8+Cjx0ZXh0IHg9IjYwIiB5PSI0MCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEyIiBmaWxsPSIjOTk5YWEyIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Tm8gSW1hZ2U8L3RleHQ+Cjwvc3ZnPgo='">
            <div class="category-name">${category.name}</div>
        `;
        categoriesGrid.appendChild(categoryItem);
    });
    
    // Update category dropdown in admin panel
    updateCategoryDropdown();
}

// Update category checkboxes in admin panel
function updateCategoryDropdown() {
    const categoriesContainer = document.getElementById('productCategoriesContainer');
    if (!categoriesContainer) return;
    
    categoriesContainer.innerHTML = '';
    categoriesData.forEach(category => {
        const checkboxDiv = document.createElement('div');
        checkboxDiv.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 8px; border: 1px solid #ddd; border-radius: 6px; background: white;';
        checkboxDiv.innerHTML = `
            <input type="checkbox" id="cat_${category.name}" value="${category.name}" class="category-checkbox" onchange="loadSubcategoriesForProduct()">
            <label for="cat_${category.name}" style="flex: 1; cursor: pointer; font-weight: 500;">${category.name}</label>
        `;
        categoriesContainer.appendChild(checkboxDiv);
    });
}

// Filter products by category
function filterProductsByCategory(categoryName) {
    selectedCategory = categoryName;
    updateProductsDisplay();
}

// Category Modal Functions
let currentCategoryProducts = [];
let currentCategoryName = '';

let currentSelectedSubcategory = 'All Products';

window.openCategoryModal = async function(categoryName, selectedSubcategory = null) {
    console.log('Opening category modal for:', categoryName);
    console.log('Selected subcategory:', selectedSubcategory);
    console.log('productsData available:', productsData ? productsData.length : 'undefined');
    
    // Store current selected subcategory
    currentSelectedSubcategory = selectedSubcategory || 'All Products';
    
    // Add to navigation stack
    pushToNavigationStack('category-modal', { categoryName: categoryName, subcategory: selectedSubcategory });

    // Ensure products are loaded first
    if (!productsData || productsData.length === 0) {
        console.log('Products not loaded, loading now...');
        await loadProductsFromFirebase();
        console.log('Products loaded, total:', productsData.length);
    }
    
    currentCategoryName = categoryName;
    // Set the selected subcategory if provided, otherwise default to 'All Products'
    currentSelectedSubcategory = selectedSubcategory || 'All Products';
    
    
    const modal = document.getElementById('categoryModal');
    const title = document.getElementById('categoryModalTitle');
    const searchInput = document.getElementById('categorySearchInput');
    
    title.textContent = categoryName;
    if (searchInput) {
        searchInput.value = '';
    }
    modal.setAttribute('data-category', categoryName);
    modal.style.display = 'flex';
    modal.classList.add('open');
    
    // IMMEDIATE scroll reset for category modal
    modal.scrollTop = 0;
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
    
    // Reset scroll for all scrollable containers in modal
    const modalBody = modal.querySelector('.category-modal-body');
    const productsArea = modal.querySelector('.category-products-area');
    const productsGrid = modal.querySelector('.category-products-grid');
    
    if (modalBody) modalBody.scrollTop = 0;
    if (productsArea) productsArea.scrollTop = 0;
    if (productsGrid) productsGrid.scrollTop = 0;
    
    // Load and display category banner image
    loadCategoryBanner(categoryName);
    
    // Load subcategories for this category
    loadCategorySubcategories(categoryName);
    
    // Load products for this category
    loadCategoryProducts(categoryName);
    
    // Setup scroll behavior for category modal
    setupCategoryModalScroll();
}

// Load category banner image
function loadCategoryBanner(categoryName) {
    console.log('Loading banner for category:', categoryName);
    const bannerSection = document.getElementById('categoryBannerSection');
    const bannerImage = document.getElementById('categoryBannerImage');
    const modalBody = document.querySelector('.category-modal-body');
    
    console.log('Banner section:', bannerSection);
    console.log('Banner image:', bannerImage);
    
    if (!bannerSection || !bannerImage || !modalBody) {
        console.log('Banner elements not found');
        return;
    }
    
    // Find the category data
    const category = categoriesData.find(cat => cat.name === categoryName);
    console.log('Found category:', category);
    
    if (category && category.bannerUrl) {
        console.log('Using banner URL:', category.bannerUrl);
        bannerImage.src = category.bannerUrl;
        bannerImage.alt = `${categoryName} Banner`;
        bannerSection.style.display = 'block';
        bannerSection.classList.remove('hidden');
        modalBody.classList.add('banner-visible');
    } else if (category && category.imageUrl) {
        console.log('Using category image URL:', category.imageUrl);
        bannerImage.src = category.imageUrl;
        bannerImage.alt = `${categoryName} Banner`;
        bannerSection.style.display = 'block';
        bannerSection.classList.remove('hidden');
        modalBody.classList.add('banner-visible');
    } else {
        console.log('No banner or image URL found, using default banner');
        // Use a default banner with category name
        bannerImage.src = `https://via.placeholder.com/800x200/3498db/ffffff?text=${encodeURIComponent(categoryName)}`;
        bannerImage.alt = `${categoryName} Banner`;
        bannerSection.style.display = 'block';
        bannerSection.classList.remove('hidden');
        modalBody.classList.add('banner-visible');
    }
}

function closeCategoryModalInternal() {
    console.log('Closing category modal');
    
    const modal = document.getElementById('categoryModal');
    if (modal) {
        modal.classList.remove('open');
        modal.style.display = 'none';
        modal.removeAttribute('data-category');
    }
    currentCategoryProducts = [];
    currentCategoryName = '';
    document.body.style.overflow = 'auto';
    
    // Reset header, search bar, banner and sidebar positions
    const header = document.querySelector('.category-modal-header');
    const searchSection = document.querySelector('.category-search-section');
    const bannerSection = document.querySelector('.category-banner-section');
    const sidebar = document.querySelector('.category-sidebar');
    const modalBody = document.querySelector('.category-modal-body');
    if (header) {
        header.classList.remove('hidden');
    }
    if (searchSection) {
        searchSection.classList.remove('sticky');
    }
    if (bannerSection) {
        bannerSection.classList.remove('hidden');
    }
    if (sidebar) {
        sidebar.classList.remove('sticky-mode');
    }
    if (document.querySelector('.category-products-area')) {
        document.querySelector('.category-products-area').classList.remove('sticky-mode');
    }
    if (modalBody) {
        modalBody.classList.remove('sticky-mode');
    }
}

function setupCategoryModalScroll() {
    const productsArea = document.querySelector('.category-products-area');
    const header = document.querySelector('.category-modal-header');
    const searchSection = document.querySelector('.category-search-section');
    const bannerSection = document.querySelector('.category-banner-section');
    const sidebar = document.querySelector('.category-sidebar');
    
    if (!productsArea || !header || !searchSection || !bannerSection || !sidebar) return;
    
    let lastScrollTop = 0;
    let isScrolling = false;
    
    productsArea.addEventListener('scroll', function() {
        if (isScrolling) return;
        
        isScrolling = true;
        requestAnimationFrame(() => {
            const scrollTop = productsArea.scrollTop;
            const scrollDirection = scrollTop > lastScrollTop ? 'down' : 'up';
            
            const modalBody = document.querySelector('.category-modal-body');
            
            if (scrollTop > 10) { // Start hiding banner immediately on scroll
                // Hide banner when scrolling
                bannerSection.classList.add('hidden');
                if (modalBody) modalBody.classList.remove('banner-visible');
            } else {
                // Show banner when at top
                bannerSection.classList.remove('hidden');
                if (modalBody) modalBody.classList.add('banner-visible');
            }
            
            if (scrollTop > 50) { // Start hiding header after 50px scroll
                if (scrollDirection === 'down') {
                    // Hide header and make search bar sticky
                    header.classList.add('hidden');
                    searchSection.classList.add('sticky');
                    sidebar.classList.add('sticky-mode');
                    productsArea.classList.add('sticky-mode');
                    document.querySelector('.category-modal-body').classList.add('sticky-mode');
                }
            } else {
                // Show header and remove sticky search bar
                header.classList.remove('hidden');
                searchSection.classList.remove('sticky');
                sidebar.classList.remove('sticky-mode');
                productsArea.classList.remove('sticky-mode');
                document.querySelector('.category-modal-body').classList.remove('sticky-mode');
            }
            
            if (scrollDirection === 'up' && scrollTop < 100) {
                // Show header when scrolling up near top
                header.classList.remove('hidden');
                searchSection.classList.remove('sticky');
                sidebar.classList.remove('sticky-mode');
                productsArea.classList.remove('sticky-mode');
                document.querySelector('.category-modal-body').classList.remove('sticky-mode');
            }
            
            lastScrollTop = scrollTop;
            isScrolling = false;
        });
    });
}

function loadCategorySubcategories(categoryName) {
    const subcategoriesContainer = document.getElementById('categoryModalSubcategories');
    const bannerImage = document.getElementById('categoryBannerImage');
    if (!subcategoriesContainer) return;
    
    // Find the category
    const category = categoriesData.find(cat => cat.name === categoryName);
    
    // Set banner image
    if (category && category.bannerUrl) {
        bannerImage.src = category.bannerUrl;
        bannerImage.style.display = 'block';
    } else {
        bannerImage.src = category ? category.imageUrl : 'https://via.placeholder.com/800x200/fbbf24/ffffff?text=' + encodeURIComponent(categoryName);
        bannerImage.style.display = 'block';
    }
    
    // Clear container
    subcategoriesContainer.innerHTML = '';
    
    // Add "All Products" item
    const allItem = document.createElement('div');
    allItem.className = 'subcategory-sidebar-item active';
    const categoryImage = category ? category.imageUrl : 'https://via.placeholder.com/60x45/fbbf24/ffffff?text=All';
    allItem.innerHTML = `
        <img src="${categoryImage}" alt="All Products" class="subcategory-sidebar-image">
        <div class="subcategory-sidebar-name">All Products</div>
    `;
    allItem.onclick = () => filterBySubcategory('All Products');
    subcategoriesContainer.appendChild(allItem);
    
    // Add subcategory items
    if (category && category.subcategories && category.subcategories.length > 0) {
        category.subcategories.forEach(subcategory => {
            const item = document.createElement('div');
            item.className = 'subcategory-sidebar-item';
            item.innerHTML = `
                <img src="${subcategory.imageUrl || 'https://via.placeholder.com/60x45/e5e7eb/374151?text=' + encodeURIComponent(subcategory.name.charAt(0))}" alt="${subcategory.name}" class="subcategory-sidebar-image">
                <div class="subcategory-sidebar-name">${subcategory.name}</div>
            `;
            item.onclick = () => filterBySubcategory(subcategory.name);
            subcategoriesContainer.appendChild(item);
        });
    }
}

function filterBySubcategory(subcategoryName) {
    currentSelectedSubcategory = subcategoryName;
    
    // Update sidebar item states
    const items = document.querySelectorAll('.subcategory-sidebar-item');
    items.forEach(item => {
        item.classList.remove('active');
        const nameElement = item.querySelector('.subcategory-sidebar-name');
        if (nameElement && nameElement.textContent === subcategoryName) {
            item.classList.add('active');
        }
    });
    
    // Update banner image based on selected subcategory
    updateBannerForSubcategory(subcategoryName);
    
    // Filter products
    filterCategoryProducts();
}

function updateBannerForSubcategory(subcategoryName) {
    const bannerImage = document.getElementById('categoryBannerImage');
    if (!bannerImage) return;
    
    // Find the current category
    const category = categoriesData.find(cat => cat.name === currentCategoryName);
    if (!category) return;
    
    if (subcategoryName === 'All Products') {
        // Show main category banner
        if (category.bannerUrl) {
            bannerImage.src = category.bannerUrl;
        } else {
            bannerImage.src = category.imageUrl;
        }
    } else {
        // Find and show subcategory banner
        const subcategory = category.subcategories?.find(sub => sub.name === subcategoryName);
        if (subcategory && subcategory.bannerUrl) {
            bannerImage.src = subcategory.bannerUrl;
        } else if (subcategory && subcategory.imageUrl) {
            bannerImage.src = subcategory.imageUrl;
        } else {
            // Fallback to category banner/image
            bannerImage.src = category.bannerUrl || category.imageUrl;
        }
    }
}

function loadCategoryProducts(categoryName) {
    console.log('Loading products for category:', categoryName);
    console.log('Total products available:', productsData.length);
    
    // Filter products by category - check both category and categories array
    currentCategoryProducts = productsData.filter(product => {
        // Check single category field
        if (product.category && product.category.toLowerCase() === categoryName.toLowerCase()) {
            return true;
        }
        // Check categories array
        if (product.categories && Array.isArray(product.categories)) {
            return product.categories.some(cat => cat.toLowerCase() === categoryName.toLowerCase());
        }
        return false;
    });
    
    console.log('Products found for category:', currentCategoryProducts.length);
    console.log('Filtered products:', currentCategoryProducts.map(p => p.name));
    filterCategoryProducts();
}

function filterCategoryProducts() {
    let filteredProducts = [...currentCategoryProducts];
    
    // Filter by subcategory if not "All Products"
    if (currentSelectedSubcategory !== 'All Products') {
        filteredProducts = filteredProducts.filter(product => {
            // Check both subcategory field and subcategories array
            if (product.subcategory && product.subcategory === currentSelectedSubcategory) {
                return true;
            }
            if (product.subcategories && Array.isArray(product.subcategories)) {
                return product.subcategories.includes(currentSelectedSubcategory);
            }
            return false;
        });
    }
    
    // Filter by search term if exists
    const searchInput = document.getElementById('categorySearchInput');
    if (searchInput && searchInput.value.trim()) {
        const searchTerm = searchInput.value.toLowerCase().trim();
        filteredProducts = filteredProducts.filter(product =>
            product.name.toLowerCase().includes(searchTerm) ||
            (product.description && product.description.toLowerCase().includes(searchTerm))
        );
    }
    
    console.log('Final filtered products:', filteredProducts.length);
    displayCategoryProducts(filteredProducts);
}

function displayCategoryProducts(products) {
    console.log('Displaying products:', products.length);
    
    // Reset scroll to top for fresh category search/filter
    const productsArea = document.querySelector('.category-products-area');
    if (productsArea) {
        productsArea.scrollTop = 0;
    }
    
    const grid = document.getElementById('categoryProductsGrid');
    
    if (!grid) {
        console.error('Category products grid not found!');
        return;
    }
    
    if (products.length === 0) {
        grid.innerHTML = '<div class="no-products-message">No products found in this category</div>';
        return;
    }
    
    grid.innerHTML = products.map(product => {
        const rating = product.rating || 4.5;
        const stars = '⭐'.repeat(Math.floor(rating));
        
        // Calculate discount pricing
        let priceHTML = '';
        if (product.originalPrice && product.discount && product.originalPrice > product.price) {
            priceHTML = `
                <div class="category-product-price">
                    <span class="category-current-price">₹${product.price}</span>
                    <span class="category-original-price">₹${product.originalPrice}</span>
                    <span class="category-discount-badge">${product.discount}% off</span>
                </div>
            `;
        } else {
            priceHTML = `
                <div class="category-product-price">
                    <span class="category-current-price">₹${product.price}</span>
                </div>
            `;
        }
        
        return `
            <div class="category-product-card" data-product-id='${product.id}' onclick="openProductModalFromCategory('${product.id}')">
                <div class="category-product-image-container">
                    <img src="${product.imageUrl}" alt="${product.name}" class="category-product-image" 
                         onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDIwMCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTUwIiBmaWxsPSIjZjNmNGY2Ii8+Cjx0ZXh0IHg9IjEwMCIgeT0iNzUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OWFhMiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pgo8L3N2Zz4K'">
                    <button class="product-heart-icon">❤️</button>
                    ${getAddButtonHTML(product.id)}
                </div>
                <div class="category-product-info">
                    ${(product.sizes && product.sizes.length > 0) || (product.weightPricing && (product.weightPricing.ml?.length > 0 || product.weightPricing.g?.length > 0 || product.weightPricing.kg?.length > 0)) ? `<div class="product-sizes" style="margin-bottom: 5px; display: flex; align-items: center; gap: 3px; flex-wrap: wrap;"><img src="mark.png" alt="Size" style="width: 16px; height: 16px; object-fit: contain;">${product.sizes ? product.sizes.map(size => `<span class="size-badge" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2px 6px; border-radius: 10px; font-size: 9px; font-weight: 600; display: inline-block;">${size}</span>`).join('') : ''}${product.weightPricing ? [product.weightPricing.ml?.map(option => `<span class="size-badge" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2px 6px; border-radius: 10px; font-size: 9px; font-weight: 600; display: inline-block;">${option.quantity}ml</span>`).join('') || '', product.weightPricing.g?.map(option => `<span class="size-badge" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2px 6px; border-radius: 10px; font-size: 9px; font-weight: 600; display: inline-block;">${option.quantity}g</span>`).join('') || '', product.weightPricing.kg?.map(option => `<span class="size-badge" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2px 6px; border-radius: 10px; font-size: 9px; font-weight: 600; display: inline-block;">${option.quantity}kg</span>`).join('') || ''].join('') : ''}</div>` : ''}
                    <h3 class="category-product-name">${product.name}</h3>
                    <div class="category-product-rating">
                        <span>${stars}</span>
                        <span>(${rating})</span>
                    </div>
                    ${priceHTML}
                </div>
            </div>
        `;
    }).join('');
}

window.searchCategoryProducts = function() {
    console.log('Search function called');
    const searchInput = document.getElementById('categorySearchInput');
    if (!searchInput) {
        console.log('Search input not found');
        return;
    }
    
    const searchTerm = searchInput.value.trim();
    console.log('Search term:', searchTerm);
    console.log('Current category products:', currentCategoryProducts.length);
    
    if (!searchTerm || searchTerm === '') {
        displayCategoryProducts(currentCategoryProducts);
        return;
    }
    
    // Use fuzzy search for better results with spelling mistakes
    const filteredProducts = fuzzySearchProducts(currentCategoryProducts, searchTerm, 0.6);
    
    console.log('Filtered products:', filteredProducts.length);
    displayCategoryProducts(filteredProducts);
}


// Close modal when clicking outside
document.addEventListener('click', function(event) {
    const modal = document.getElementById('categoryModal');
    if (event.target === modal) {
        closeCategoryModal();
    }
});

// Admin category management functions
window.addCategory = async function() {
    const name = document.getElementById('categoryName').value;
    const imageUrl = document.getElementById('categoryImageUrl').value;
    const bannerUrl = document.getElementById('categoryBannerUrl').value;
    
    if (!name || !imageUrl || !bannerUrl) {
        alert('Please fill in all fields including banner image');
        return;
    }
    
    // Collect subcategories
    const subcategories = collectSubcategories();
    
    if (subcategories.length === 0) {
        alert('Please add at least one subcategory');
        return;
    }
    
    const success = await addCategoryToFirebase(name, imageUrl, bannerUrl, subcategories);
    if (success) {
        loadCategoriesAdminData();
        // Clear form
        document.getElementById('categoryName').value = '';
        document.getElementById('categoryImageUrl').value = '';
        document.getElementById('categoryBannerUrl').value = '';
        clearSubcategoriesForm();
    } else {
        alert('Failed to add category');
    }
};

// Subcategory management functions
window.addSubcategoryInput = function() {
    const container = document.getElementById('subcategoriesContainer');
    const inputGroup = document.createElement('div');
    inputGroup.className = 'subcategory-input-group';
    inputGroup.style.cssText = 'display: flex; flex-direction: column; gap: 8px; margin-bottom: 15px; padding: 10px; border: 1px solid #ddd; border-radius: 8px; background: #f9f9f9;';
    inputGroup.innerHTML = `
        <div style="display: flex; gap: 10px; align-items: center;">
            <input type="text" class="subcategory-name" placeholder="Subcategory Name" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
            <button type="button" onclick="removeSubcategoryInput(this)" style="background: #e74c3c; color: white; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer; font-size: 10px;">Remove</button>
        </div>
        <input type="url" class="subcategory-image" placeholder="Subcategory Image URL" style="padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
        <input type="url" class="subcategory-banner" placeholder="Subcategory Banner Image URL" style="padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
    `;
    container.appendChild(inputGroup);
};

window.closeAddSubcategoryModal = closeAddSubcategoryModal;
window.saveNewSubcategory = saveNewSubcategory;

window.removeSubcategoryInput = function(button) {
    const inputGroup = button.parentElement;
    inputGroup.remove();
};

function collectSubcategories() {
    const subcategories = [];
    const inputGroups = document.querySelectorAll('.subcategory-input-group');
    
    inputGroups.forEach(group => {
        const nameInput = group.querySelector('.subcategory-name');
        const imageInput = group.querySelector('.subcategory-image');
        const bannerInput = group.querySelector('.subcategory-banner');
        
        if (nameInput.value.trim() && imageInput.value.trim() && bannerInput.value.trim()) {
            subcategories.push({
                name: nameInput.value.trim(),
                imageUrl: convertGoogleDriveUrl(imageInput.value.trim()),
                bannerUrl: convertGoogleDriveUrl(bannerInput.value.trim())
            });
        }
    });
    
    return subcategories;
}

function clearSubcategoriesForm() {
    const container = document.getElementById('subcategoriesContainer');
    // Keep only the first input group and clear it
    const inputGroups = container.querySelectorAll('.subcategory-input-group');
    
    // Remove all but the first input group
    for (let i = 1; i < inputGroups.length; i++) {
        inputGroups[i].remove();
    }
    // Clear the first input group
    if (inputGroups[0]) {
        inputGroups[0].querySelector('.subcategory-name').value = '';
        inputGroups[0].querySelector('.subcategory-image').value = '';
        inputGroups[0].querySelector('.subcategory-banner').value = '';
    }
}

window.loadSubcategoriesForProduct = function() {
    const subcategoriesSection = document.getElementById('productSubcategoriesSection');
    const subcategoriesContainer = document.getElementById('productSubcategoriesContainer');
    
    // Get selected categories
    const selectedCategories = Array.from(document.querySelectorAll('.category-checkbox:checked')).map(cb => cb.value);
    
    if (selectedCategories.length === 0) {
        subcategoriesSection.style.display = 'none';
        return;
    }
    
    // Show subcategories section
    subcategoriesSection.style.display = 'block';
    
    // Clear and populate subcategories
    subcategoriesContainer.innerHTML = '';
    
    // Collect all subcategories from selected categories
    const allSubcategories = [];
    selectedCategories.forEach(categoryName => {
        const category = categoriesData.find(cat => cat.name === categoryName);
        if (category && category.subcategories) {
            category.subcategories.forEach(sub => {
                if (!allSubcategories.find(s => s.name === sub.name)) {
                    allSubcategories.push({...sub, parentCategory: categoryName});
                }
            });
        }
    });
    
    if (allSubcategories.length === 0) {
        subcategoriesContainer.innerHTML = '<p style="color: #666; text-align: center; grid-column: 1 / -1;">No subcategories available for selected categories.</p>';
        return;
    }
    
    allSubcategories.forEach(subcategory => {
        const checkboxDiv = document.createElement('div');
        checkboxDiv.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 8px; border: 1px solid #ddd; border-radius: 6px; background: white;';
        checkboxDiv.innerHTML = `
            <input type="checkbox" id="sub_${subcategory.name}" value="${subcategory.name}" class="subcategory-checkbox">
            <label for="sub_${subcategory.name}" style="flex: 1; cursor: pointer; font-weight: 500;">${subcategory.name}</label>
            <span style="font-size: 10px; color: #666; background: #f3f4f6; padding: 2px 6px; border-radius: 4px;">${subcategory.parentCategory}</span>
        `;
        subcategoriesContainer.appendChild(checkboxDiv);
    });
};

window.removeCategory = async function(categoryId) {
    console.log('Attempting to remove category with ID:', categoryId);
    const success = await removeCategoryFromFirebase(categoryId);
    if (success) {
        loadCategoriesAdminData();
        // Refresh home page to remove category event card
        loadEventsOnHomePage();
    } else {
        showNotification('Error removing category. Please try again.', 'error');
    }
}

function loadCategoriesAdminData() {
    const categoriesAdminList = document.getElementById('categoriesAdminList');
    if (!categoriesAdminList) return;
    
    categoriesAdminList.innerHTML = '';
    
    categoriesData.forEach((category, index) => {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'admin-category-card';
        categoryDiv.style.cssText = 'margin-bottom: 15px; padding: 15px; border: 1px solid #ddd; border-radius: 8px; background: white;';
        
        let subcategoriesHtml = '';
        if (category.subcategories && category.subcategories.length > 0) {
            subcategoriesHtml = `
                <div style="margin-top: 10px;">
                    <h5 style="margin: 0 0 8px 0; color: #333; font-size: 14px;">Subcategories:</h5>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                        ${category.subcategories.map((sub, subIndex) => `
                            <div style="display: flex; align-items: center; background: #f8f9fa; padding: 5px 10px; border-radius: 15px; border: 1px solid #e9ecef;">
                                <span style="font-size: 10px; margin-right: 8px;">${sub.name}</span>
                                <button onclick="removeSubcategory('${category.id}', ${subIndex})" style="background: #dc3545; color: white; border: none; border-radius: 8px; width: 18px; height: 18px; font-size: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center;">×</button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        } else {
            subcategoriesHtml = '<p style="margin: 8px 0 0 0; font-size: 10px; color: #999; font-style: italic;">No subcategories</p>';
        }
        
        categoryDiv.innerHTML = `
            <h4 style="margin: 0 0 5px 0; color: #2c3e50;">${category.name}</h4>
            ${subcategoriesHtml}
            <div style="margin-top: 12px; display: flex; gap: 8px; flex-wrap: wrap;">
                <button class="btn-primary" onclick="addSubcategoryToCategory('${category.id}')" style="background: #28a745; font-size: 10px; padding: 6px 12px;">+ Add Subcategory</button>
                <button class="btn-edit" onclick="editCategory('${category.id}')" style="background: #3498db; color: white; border: none; border-radius: 4px; font-size: 10px; padding: 6px 12px; cursor: pointer;">✏️ Edit Category</button>
                <button class="btn-danger" onclick="removeCategory('${category.id}')" style="font-size: 10px; padding: 6px 12px;">Remove Category</button>
            </div>
        `;
        categoriesAdminList.appendChild(categoryDiv);
    });
}

function filterCategoriesAdmin() {
    const searchTerm = document.getElementById('adminCategorySearchInput').value.trim();
    const categoriesAdminList = document.getElementById('categoriesAdminList');
    const categoryCards = categoriesAdminList.querySelectorAll('.admin-category-card');
    
    if (!searchTerm) {
        // Show all categories if search is empty
        categoryCards.forEach(card => {
            card.style.display = 'block';
        });
        return;
    }
    
    categoryCards.forEach(card => {
        const categoryName = card.querySelector('h4').textContent;
        // Use fuzzy search for better matching with spelling mistakes
        if (fuzzyMatch(searchTerm, categoryName, 0.6)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// Remove subcategory from a category
window.removeSubcategory = async function(categoryId, subIndex) {
    if (!confirm('Are you sure you want to remove this subcategory?')) return;
    
    try {
        const category = categoriesData.find(cat => cat.id === categoryId);
        if (!category) return;
        
        const updatedSubcategories = category.subcategories.filter((_, index) => index !== subIndex);
        
        const categoryRef = doc(db, 'categories', categoryId);
        await updateDoc(categoryRef, {
            subcategories: updatedSubcategories,
            updatedAt: new Date()
        });
        
        showNotification('Subcategory removed successfully! ✅', 'success');
        await loadCategoriesFromFirebase();
        loadCategoriesAdminData();
        // Refresh home page to update category event cards
        loadEventsOnHomePage();
        
    } catch (error) {
        console.error('Error removing subcategory:', error);
        showNotification('Error removing subcategory. Please try again.', 'error');
    }
}

let currentCategoryIdForSubcategory = null;

// Add new subcategory to existing category
window.addSubcategoryToCategory = function(categoryId) {
    currentCategoryIdForSubcategory = categoryId;
    const modal = document.getElementById('addSubcategoryModal');
    modal.style.display = 'flex';
    
    // Clear form
    document.getElementById('newSubcategoryName').value = '';
    document.getElementById('newSubcategoryImage').value = '';
    document.getElementById('newSubcategoryBanner').value = '';
}

function closeAddSubcategoryModal() {
    const modal = document.getElementById('addSubcategoryModal');
    modal.style.display = 'none';
    currentCategoryIdForSubcategory = null;
}

async function saveNewSubcategory() {
    const subcategoryName = document.getElementById('newSubcategoryName').value.trim();
    const subcategoryImage = document.getElementById('newSubcategoryImage').value.trim();
    const subcategoryBanner = document.getElementById('newSubcategoryBanner').value.trim();
    
    if (!subcategoryName) {
        alert('Please enter subcategory name');
        return;
    }
    
    try {
        const category = categoriesData.find(cat => cat.id === currentCategoryIdForSubcategory);
        if (!category) return;
        
        const newSubcategory = {
            name: subcategoryName,
            imageUrl: subcategoryImage ? convertGoogleDriveUrl(subcategoryImage) : '',
            bannerUrl: subcategoryBanner ? convertGoogleDriveUrl(subcategoryBanner) : ''
        };
        
        const updatedSubcategories = [...(category.subcategories || []), newSubcategory];
        
        const categoryRef = doc(db, 'categories', currentCategoryIdForSubcategory);
        await updateDoc(categoryRef, {
            subcategories: updatedSubcategories,
            updatedAt: new Date()
        });
        
        showNotification('Subcategory added successfully! ✅', 'success');
        await loadCategoriesFromFirebase();
        loadCategoriesAdminData();
        closeAddSubcategoryModal();
        
    } catch (error) {
        console.error('Error adding subcategory:', error);
        showNotification('Error adding subcategory. Please try again.', 'error');
    }
}

// Edit Category Functions
let currentEditCategoryId = null;

// Open edit category modal
window.editCategory = function(categoryId) {
    currentEditCategoryId = categoryId;
    const category = categoriesData.find(cat => cat.id === categoryId);
    
    if (!category) {
        showNotification('Category not found!', 'error');
        return;
    }
    
    // Fill the form with current category data
    document.getElementById('editCategoryName').value = category.name || '';
    document.getElementById('editCategoryImage').value = category.imageUrl || '';
    document.getElementById('editCategoryBanner').value = category.bannerUrl || '';
    
    // Load products for selection
    loadProductsForCategoryEdit(categoryId);
    
    // Show the modal
    const modal = document.getElementById('editCategoryModal');
    modal.style.display = 'flex';
}

// Load products for category editing
function loadProductsForCategoryEdit(categoryId) {
    const productsList = document.getElementById('editCategoryProductsList');
    
    if (!productsData || productsData.length === 0) {
        productsList.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">No products available</div>';
        return;
    }
    
    const category = categoriesData.find(cat => cat.id === categoryId);
    const categoryName = category ? category.name : '';
    
    productsList.innerHTML = '';
    
    productsData.forEach(product => {
        const isAssigned = product.categories && product.categories.includes(categoryName);
        
        const productItem = document.createElement('div');
        productItem.style.cssText = 'display: flex; align-items: center; gap: 10px; padding: 8px; border: 1px solid #eee; border-radius: 5px; background: #fafafa;';
        
        productItem.innerHTML = `
            <input type="checkbox" id="product_${product.id}" ${isAssigned ? 'checked' : ''} 
                   style="margin: 0; cursor: pointer;" 
                   onchange="toggleProductCategory('${product.id}', this.checked)">
            <img src="${product.imageUrl}" alt="${product.name}" 
                 style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;">
            <div style="flex: 1;">
                <div style="font-weight: 600; font-size: 12px; color: #2c3e50;">${product.name}</div>
                <div style="font-size: 10px; color: #666;">₹${product.price} • Rating: ${product.rating}⭐</div>
            </div>
        `;
        
        productsList.appendChild(productItem);
    });
}

// Toggle product category assignment
window.toggleProductCategory = function(productId, isChecked) {
    // This will be handled when saving the category
    console.log(`Product ${productId} ${isChecked ? 'assigned to' : 'removed from'} category`);
}

// Filter products in edit modal based on search term
window.filterProductsInEditModal = function(searchTerm) {
    if (!currentEditCategoryId) return;
    
    const productsList = document.getElementById('editCategoryProductsList');
    
    if (!searchTerm.trim()) {
        // Reload all products if search is empty
        loadProductsForCategoryEdit(currentEditCategoryId);
        return;
    }
    
    const searchLower = searchTerm.toLowerCase().trim();
    const category = categoriesData.find(cat => cat.id === currentEditCategoryId);
    const categoryName = category ? category.name : '';
    
    // Clear current list
    productsList.innerHTML = '';
    
    // Filter products based on search term (includes keywords)
    const filteredProducts = productsData.filter(product => {
        const nameText = product.name || '';
        const keywords = product.keywords || [];
        
        // Search in product name
        const nameExactMatch = nameText.toLowerCase().includes(searchLower);
        const nameFuzzyMatch = fuzzyMatch(searchTerm, nameText, 0.6);
        
        // Search in keywords
        let keywordMatch = false;
        if (Array.isArray(keywords)) {
            keywordMatch = keywords.some(keyword => {
                const keywordStr = keyword.toString().toLowerCase();
                return keywordStr.includes(searchLower) || fuzzyMatch(searchTerm, keywordStr, 0.6);
            });
        }
        
        // Return true if name OR keywords match
        return nameExactMatch || nameFuzzyMatch || keywordMatch;
    });
    
    if (filteredProducts.length === 0) {
        productsList.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">No products found matching your search</div>';
        return;
    }
    
    // Display filtered products
    filteredProducts.forEach(product => {
        const isAssigned = product.categories && product.categories.includes(categoryName);
        
        const productItem = document.createElement('div');
        productItem.style.cssText = 'display: flex; align-items: center; gap: 10px; padding: 8px; border: 1px solid #eee; border-radius: 5px; background: #fafafa;';
        
        productItem.innerHTML = `
            <input type="checkbox" id="product_${product.id}" ${isAssigned ? 'checked' : ''} 
                   style="margin: 0; cursor: pointer;" 
                   onchange="toggleProductCategory('${product.id}', this.checked)">
            <img src="${product.imageUrl}" alt="${product.name}" 
                 style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;">
            <div style="flex: 1;">
                <div style="font-weight: 600; font-size: 12px; color: #2c3e50;">${product.name}</div>
                <div style="font-size: 10px; color: #666;">₹${product.price} • Rating: ${product.rating}⭐</div>
            </div>
        `;
        
        productsList.appendChild(productItem);
    });
}

// Close edit category modal
window.closeEditCategoryModal = function() {
    const modal = document.getElementById('editCategoryModal');
    modal.style.display = 'none';
    currentEditCategoryId = null;
    
    // Clear form
    document.getElementById('editCategoryName').value = '';
    document.getElementById('editCategoryImage').value = '';
    document.getElementById('editCategoryBanner').value = '';
    
    // Clear search bar
    document.getElementById('editCategoryProductSearch').value = '';
    
    // Clear products list
    document.getElementById('editCategoryProductsList').innerHTML = '';
}

// Save edited category
window.saveEditedCategory = async function() {
    const categoryName = document.getElementById('editCategoryName').value.trim();
    const categoryImage = document.getElementById('editCategoryImage').value.trim();
    const categoryBanner = document.getElementById('editCategoryBanner').value.trim();
    
    if (!categoryName) {
        showNotification('Please enter category name!', 'error');
        return;
    }
    
    if (!currentEditCategoryId) {
        showNotification('No category selected for editing!', 'error');
        return;
    }
    
    try {
        // Find the current category
        const currentCategory = categoriesData.find(cat => cat.id === currentEditCategoryId);
        if (!currentCategory) {
            showNotification('Category not found!', 'error');
            return;
        }
        
        const oldCategoryName = currentCategory.name;
        
        // Get selected products from checkboxes
        const productCheckboxes = document.querySelectorAll('#editCategoryProductsList input[type="checkbox"]');
        const selectedProductIds = [];
        const unselectedProductIds = [];
        
        productCheckboxes.forEach(checkbox => {
            const productId = checkbox.id.replace('product_', '');
            if (checkbox.checked) {
                selectedProductIds.push(productId);
            } else {
                unselectedProductIds.push(productId);
            }
        });
        
        // Prepare updated category data
        const updatedCategoryData = {
            name: categoryName,
            imageUrl: categoryImage ? convertGoogleDriveUrl(categoryImage) : (currentCategory.imageUrl || ''),
            bannerUrl: categoryBanner ? convertGoogleDriveUrl(categoryBanner) : (currentCategory.bannerUrl || ''),
            subcategories: currentCategory.subcategories || [],
            updatedAt: new Date()
        };
        
        // Update category in Firebase
        const categoryRef = doc(db, 'categories', currentEditCategoryId);
        await updateDoc(categoryRef, updatedCategoryData);
        
        // Update product-category relationships
        const productUpdatePromises = [];
        
        // Add category to selected products
        selectedProductIds.forEach(productId => {
            const product = productsData.find(p => p.id === productId);
            if (product) {
                let categories = product.categories || [];
                
                // Remove old category name if it was changed
                if (oldCategoryName !== categoryName) {
                    categories = categories.filter(cat => cat !== oldCategoryName);
                }
                
                // Add new category name if not already present
                if (!categories.includes(categoryName)) {
                    categories.push(categoryName);
                }
                
                const productRef = doc(db, 'products', productId);
                productUpdatePromises.push(updateDoc(productRef, {
                    categories: categories,
                    category: categories[0] || '', // Set primary category
                    updatedAt: new Date()
                }));
            }
        });
        
        // Remove category from unselected products
        unselectedProductIds.forEach(productId => {
            const product = productsData.find(p => p.id === productId);
            if (product && product.categories) {
                let categories = product.categories.filter(cat => cat !== categoryName && cat !== oldCategoryName);
                
                const productRef = doc(db, 'products', productId);
                productUpdatePromises.push(updateDoc(productRef, {
                    categories: categories,
                    category: categories[0] || '', // Set primary category
                    updatedAt: new Date()
                }));
            }
        });
        
        // Wait for all product updates to complete
        await Promise.all(productUpdatePromises);
        
        showNotification(`Category and ${selectedProductIds.length} products updated successfully! ✅`, 'success');
        
        // Refresh data and UI
        await loadCategoriesFromFirebase();
        await loadProductsFromFirebase();
        loadCategoriesAdminData();
        loadEventsOnHomePage();
        closeEditCategoryModal();
        
    } catch (error) {
        console.error('Error updating category:', error);
        showNotification('Error updating category. Please try again.', 'error');
    }
}


function addEditSubcategory(name = '', imageUrl = '', bannerUrl = '') {
    const container = document.getElementById('editSubcategoriesContainer');
    const subcategoryItem = document.createElement('div');
    subcategoryItem.className = 'edit-subcategory-item';
    
    subcategoryItem.innerHTML = `
        <button type="button" class="edit-subcategory-remove" onclick="this.parentElement.remove()">×</button>
        <input type="text" placeholder="Subcategory Name" value="${name}" required>
        <input type="url" placeholder="Subcategory Image URL" value="${imageUrl}">
        <input type="url" placeholder="Subcategory Banner URL" value="${bannerUrl}">
    `;
    
    container.appendChild(subcategoryItem);
}

function collectEditSubcategories() {
    const container = document.getElementById('editSubcategoriesContainer');
    const subcategoryItems = container.querySelectorAll('.edit-subcategory-item');
    const subcategories = [];
    
    subcategoryItems.forEach(item => {
        const inputs = item.querySelectorAll('input');
        const name = inputs[0].value.trim();
        const imageUrl = inputs[1].value.trim();
        const bannerUrl = inputs[2].value.trim();
        
        if (name) {
            subcategories.push({
                name: name,
                imageUrl: imageUrl ? convertGoogleDriveUrl(imageUrl) : '',
                bannerUrl: bannerUrl ? convertGoogleDriveUrl(bannerUrl) : ''
            });
        }
    });
    
    return subcategories;
}

async function saveEditCategory() {
    const name = document.getElementById('editCategoryName').value.trim();
    const imageUrl = document.getElementById('editCategoryImageUrl').value.trim();
    const bannerUrl = document.getElementById('editCategoryBannerUrl').value.trim();
    
    if (!name || !imageUrl || !bannerUrl) {
        alert('Please fill in all fields including banner image');
        return;
    }
    
    const subcategories = collectEditSubcategories();
    
    if (subcategories.length === 0) {
        alert('Please add at least one subcategory');
        return;
    }
    
    try {
        const categoryRef = doc(db, 'categories', editingCategoryId);
        await updateDoc(categoryRef, {
            name: name,
            imageUrl: convertGoogleDriveUrl(imageUrl),
            bannerUrl: convertGoogleDriveUrl(bannerUrl),
            subcategories: subcategories,
            updatedAt: new Date()
        });
        
        showNotification('Category updated successfully! ✅', 'success');
        await loadCategoriesFromFirebase();
        loadCategoriesAdminData();
        closeEditCategoryModal();
        
    } catch (error) {
        console.error('Error updating category:', error);
        showNotification('Error updating category. Please try again.', 'error');
    }
}

// Load products from Firebase Firestore
async function loadProductsFromFirebase() {
    try {
        console.log('Loading products from Firebase...');
        const querySnapshot = await getDocs(collection(db, 'products'));
        productsData = [];
        querySnapshot.forEach((doc) => {
            console.log('Found product:', doc.id, doc.data());
            productsData.push({
                id: doc.id,
                ...doc.data()
            });
        });
        // Sort products by order if available, otherwise by creation time
        productsData.sort((a, b) => (a.order || 0) - (b.order || 0));
        console.log('Total products loaded:', productsData.length);
        
        // Add fallback products if no products found
        if (productsData.length === 0) {
            console.log('No products found, adding fallback products');
            productsData = [
                {
                    id: 'sample1',
                    name: 'Sample T-Shirt',
                    price: 299,
                    imageUrl: 'https://via.placeholder.com/300x300/e74c3c/ffffff?text=T-Shirt',
                    description: 'Comfortable cotton t-shirt',
                    category: 'Clothing'
                },
                {
                    id: 'sample2',
                    name: 'Sample Jeans',
                    price: 599,
                    imageUrl: 'https://via.placeholder.com/300x300/3498db/ffffff?text=Jeans',
                    description: 'Stylish denim jeans',
                    category: 'Clothing'
                },
                {
                    id: 'sample3',
                    name: 'Sample Shoes',
                    price: 899,
                    imageUrl: 'https://via.placeholder.com/300x300/27ae60/ffffff?text=Shoes',
                    description: 'Comfortable running shoes',
                    category: 'Footwear'
                }
            ];
        }
        
        updateProductsDisplay();
    } catch (error) {
        console.error('Error loading products from Firebase:', error);
        // Fallback products for error case
        productsData = [
            {
                id: 'sample1',
                name: 'Sample Product',
                price: 299,
                imageUrl: 'https://via.placeholder.com/300x300/95a5a6/ffffff?text=Product',
                description: 'Sample product description',
                category: 'General'
            }
        ];
        updateProductsDisplay();
    }
}

// Add product to Firebase Firestore
async function addProductToFirebase(name, imageUrl, description, finalPrice, subImages, categories, sizes, sizePricing, deliveryCharge, rating, originalPrice, discount, weightPricing, subcategories = [], sizeDiscounts = {}, keywords = '', isReturnable = true) {
    try {
        const convertedUrl = convertGoogleDriveUrl(imageUrl);
        // Create a fresh array copy to prevent reference leaking between products
        const subImagesArray = subImages ? [...subImages.split(',')].map(url => convertGoogleDriveUrl(url.trim())).filter(url => url) : [];
        
        const productData = {
            name: name,
            imageUrl: convertedUrl,
            description: description,
            price: parseFloat(finalPrice),
            originalPrice: parseFloat(originalPrice),
            discount: parseFloat(discount),
            basePrice: parseFloat(finalPrice), // Keep for compatibility
            deliveryCharge: parseFloat(deliveryCharge),
            rating: parseFloat(rating),
            subImages: [...subImagesArray], // Create fresh array copy for this product
            categories: categories || [], // Multiple categories
            category: categories && categories.length > 0 ? categories[0] : '', // Primary category for backward compatibility
            subcategories: subcategories || [],
            sizes: sizes || [],
            sizePricing: sizePricing || {},
            sizeDiscounts: sizeDiscounts || {},
            weightPricing: weightPricing || { ml: [], g: [], kg: [] },
            keywords: keywords ? keywords.split(',').map(k => k.trim().toLowerCase()).filter(k => k) : [],
            isReturnable: isReturnable,
            createdAt: new Date().toISOString()
        };
        
        const docRef = await addDoc(collection(db, 'products'), productData);
        console.log('Product added with ID:', docRef.id);
        
        // Reload products data
        await loadProductsFromFirebase();
        loadProductsAdminData();
        
        return true;
    } catch (error) {
        console.error('Error adding product:', error);
        return false;
    }
}

// Remove product from Firebase Firestore
async function removeProductFromFirebase(productId) {
    try {
        await deleteDoc(doc(db, 'products', productId));
        console.log('Product removed from Firebase');
        await loadProductsFromFirebase();
        return true;
    } catch (error) {
        console.error('Error removing product from Firebase:', error);
        return false;
    }
}

// Update products display on main page
function updateProductsDisplay() {
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) return;

    // Preserve the title and clear only product items
    const title = productsGrid.querySelector('.section-title');
    productsGrid.innerHTML = '';
    if (title) {
        productsGrid.appendChild(title);
    }

    // Filter products by selected category
    const filteredProducts = selectedCategory 
        ? productsData.filter(product => product.category === selectedCategory)
        : productsData;

    // Show all products in rows of 2
    const displayProducts = filteredProducts;

    displayProducts.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = "product-card";
        productCard.setAttribute("data-product-id", product.id);;
        productCard.onclick = () => openProductModal(product.id);
        
        // Create pricing display with discount
        const originalPrice = product.originalPrice;
        const currentPrice = product.price;
        const discount = product.discount;
        
        let priceHTML = '';
        if (originalPrice && originalPrice > currentPrice && discount > 0) {
            priceHTML = `
                <div class="product-price-container">
                    <div class="special-price-label" style="color: #27ae60; font-size: 10px; font-weight: 600; margin-bottom: 2px;">Special price</div>
                    <div class="price-row" style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                        <span class="current-price" style="color: #27ae60; font-size: 18px; font-weight: 700;">₹${currentPrice}</span>
                        <span class="original-price" style="color: #999; font-size: 14px; text-decoration: line-through;">₹${originalPrice}</span>
                        <span class="discount-badge" style="background: #27ae60; color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600;">${discount}% off</span>
                    </div>
                </div>
            `;
        } else {
            priceHTML = `<div class="product-price" style="color: #27ae60; font-size: 18px; font-weight: 700;">₹${currentPrice}</div>`;
        }
        
        productCard.innerHTML = `
            <div class="product-image-container">
                <img src="${product.imageUrl}" alt="${product.name}" class="product-image" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDIwMCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTUwIiBmaWxsPSIjZjNmNGY2Ii8+Cjx0ZXh0IHg9IjEwMCIgeT0iNzUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OWFhMiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pgo8L3N2Zz4K'">
                <button class="product-heart-icon" onclick="event.stopPropagation(); openProductModal('${product.id}')">♡</button>
                ${getAddButtonHTML(product.id)}
            </div>
            <div class="product-info">
                ${(product.sizes && product.sizes.length > 0) || (product.weightPricing && (product.weightPricing.ml?.length > 0 || product.weightPricing.g?.length > 0 || product.weightPricing.kg?.length > 0)) ? `<div class="product-sizes" style="margin-bottom: 6px; display: flex; align-items: center; gap: 4px; flex-wrap: wrap;"><img src="mark.png" alt="Size" style="width: 20px; height: 20px; object-fit: contain;">${product.sizes ? product.sizes.map(size => `<span class="size-badge" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: 600; display: inline-block;">${size}</span>`).join('') : ''}${product.weightPricing ? [product.weightPricing.ml?.map(option => `<span class="size-badge" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: 600; display: inline-block;">${option.quantity}ml</span>`).join('') || '', product.weightPricing.g?.map(option => `<span class="size-badge" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: 600; display: inline-block;">${option.quantity}g</span>`).join('') || '', product.weightPricing.kg?.map(option => `<span class="size-badge" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: 600; display: inline-block;">${option.quantity}kg</span>`).join('') || ''].join('') : ''}</div>` : ''}
                <h3 class="product-name">${product.name}</h3>
                <div class="product-rating" style="color: #fbbf24; font-size: 14px; margin: 4px 0;">
                    ${'⭐'.repeat(product.rating || 0)} ${product.rating ? `(${product.rating})` : ''}
                </div>
                ${priceHTML}
                <div class="product-buttons">
                    <button class="btn-cart" onclick="event.stopPropagation(); openProductModal('${product.id}')">Add to Cart</button>
                    <button class="btn-order" onclick="event.stopPropagation(); openProductModal('${product.id}')">Order Now</button>
                </div>
            </div>
        `;
        productsGrid.appendChild(productCard);
    });

    // Show message if no products found for selected category
    if (filteredProducts.length === 0 && selectedCategory) {
        const title = productsGrid.querySelector('.section-title');
        productsGrid.innerHTML = '';
        if (title) {
            productsGrid.appendChild(title);
        }
        const noProductsMsg = document.createElement('p');
        noProductsMsg.style.cssText = 'text-align: center; color: #666; grid-column: 1 / -1;';
        noProductsMsg.textContent = `No products found in "${selectedCategory}" category.`;
        productsGrid.appendChild(noProductsMsg);
    }
}

// Functions for managing multiple product images
window.addImageInput = function() {
    const container = document.getElementById('additionalImagesContainer');
    const newImageGroup = document.createElement('div');
    newImageGroup.className = 'image-input-group';
    newImageGroup.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px; align-items: center;';
    newImageGroup.innerHTML = `
        <input type="url" class="additional-image-url" placeholder="Additional Image URL" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
        <button type="button" onclick="removeImageInput(this)" style="background: #e74c3c; color: white; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer; font-size: 10px;">Remove</button>
    `;
    container.appendChild(newImageGroup);
}

window.removeImageInput = function(button) {
    const container = document.getElementById('additionalImagesContainer');
    if (container.children.length > 1) {
        button.parentElement.remove();
    } else {
        showNotification('At least one additional image input is required', 'warning');
    }
}

// Function to collect all additional image URLs
function collectAdditionalImages() {
    const additionalImageInputs = document.querySelectorAll('.additional-image-url');
    const imageUrls = [];
    additionalImageInputs.forEach(input => {
        if (input.value.trim()) {
            // Create a fresh copy of the trimmed value to avoid any reference issues
            imageUrls.push(String(input.value.trim()));
        }
    });
    // Return a fresh array copy as comma-separated string
    return [...imageUrls].join(',');
}

// Function to clear additional image inputs
function clearAdditionalImages() {
    const container = document.getElementById('additionalImagesContainer');
    container.innerHTML = `
        <div class="image-input-group" style="display: flex; gap: 10px; margin-bottom: 10px; align-items: center;">
            <input type="url" class="additional-image-url" placeholder="Additional Image URL" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
            <button type="button" onclick="removeImageInput(this)" style="background: #e74c3c; color: white; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer; font-size: 10px;">Remove</button>
        </div>
    `;
}

// Function to clear weight pricing inputs
function clearWeightInputs() {
    // Clear ML container
    const mlContainer = document.getElementById('mlContainer');
    if (mlContainer) {
        mlContainer.innerHTML = `
            <div class="weight-input-group" style="display: flex; gap: 8px; margin-bottom: 8px; align-items: center;">
                <input type="text" class="weight-quantity" placeholder="Quantity (e.g., 100ml)" style="width: 120px; padding: 8px; border: 1px solid #e74c3c; border-radius: 4px;">
                <input type="number" class="weight-price" placeholder="Original Price (₹)" step="0.01" min="0" style="width: 120px; padding: 8px; border: 1px solid #e74c3c; border-radius: 4px;" oninput="calculateWeightFinalPrice(this)">
                <input type="number" class="weight-discount" placeholder="Discount %" min="0" max="99" step="1" value="0" style="width: 90px; padding: 8px; border: 1px solid #f39c12; border-radius: 4px; background: #fef9e7;" oninput="calculateWeightFinalPrice(this)">
                <div class="weight-final-price" style="min-width: 80px; padding: 8px; background: #e8f5e8; border: 1px solid #27ae60; border-radius: 4px; font-weight: 600; color: #27ae60; text-align: center;">₹0</div>
                <button type="button" onclick="removeWeightInput(this)" style="background: #e74c3c; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 10px;">Remove</button>
            </div>
        `;
    }
    
    // Clear Grams container
    const gContainer = document.getElementById('gContainer');
    if (gContainer) {
        gContainer.innerHTML = `
            <div class="weight-input-group" style="display: flex; gap: 8px; margin-bottom: 8px; align-items: center;">
                <input type="text" class="weight-quantity" placeholder="Quantity (e.g., 250g)" style="width: 120px; padding: 8px; border: 1px solid #e74c3c; border-radius: 4px;">
                <input type="number" class="weight-price" placeholder="Original Price (₹)" step="0.01" min="0" style="width: 120px; padding: 8px; border: 1px solid #e74c3c; border-radius: 4px;" oninput="calculateWeightFinalPrice(this)">
                <input type="number" class="weight-discount" placeholder="Discount %" min="0" max="99" step="1" value="0" style="width: 90px; padding: 8px; border: 1px solid #f39c12; border-radius: 4px; background: #fef9e7;" oninput="calculateWeightFinalPrice(this)">
                <div class="weight-final-price" style="min-width: 80px; padding: 8px; background: #e8f5e8; border: 1px solid #27ae60; border-radius: 4px; font-weight: 600; color: #27ae60; text-align: center;">₹0</div>
                <button type="button" onclick="removeWeightInput(this)" style="background: #e74c3c; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 10px;">Remove</button>
            </div>
        `;
    }
    
    // Clear KG container
    const kgContainer = document.getElementById('kgContainer');
    if (kgContainer) {
        kgContainer.innerHTML = `
            <div class="weight-input-group" style="display: flex; gap: 8px; margin-bottom: 8px; align-items: center;">
                <input type="text" class="weight-quantity" placeholder="Quantity (e.g., 1kg)" style="width: 120px; padding: 8px; border: 1px solid #e74c3c; border-radius: 4px;">
                <input type="number" class="weight-price" placeholder="Original Price (₹)" step="0.01" min="0" style="width: 120px; padding: 8px; border: 1px solid #e74c3c; border-radius: 4px;" oninput="calculateWeightFinalPrice(this)">
                <input type="number" class="weight-discount" placeholder="Discount %" min="0" max="99" step="1" value="0" style="width: 90px; padding: 8px; border: 1px solid #f39c12; border-radius: 4px; background: #fef9e7;" oninput="calculateWeightFinalPrice(this)">
                <div class="weight-final-price" style="min-width: 80px; padding: 8px; background: #e8f5e8; border: 1px solid #27ae60; border-radius: 4px; font-weight: 600; color: #27ae60; text-align: center;">₹0</div>
                <button type="button" onclick="removeWeightInput(this)" style="background: #e74c3c; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 10px;">Remove</button>
            </div>
        `;
    }
}

// Comprehensive form reset function
window.resetProductForm = function() {
    // Clear all basic inputs
    document.getElementById('productName').value = '';
    document.getElementById('productImageUrl').value = '';
    document.getElementById('productDescription').value = '';
    document.getElementById('productKeywords').value = '';
    document.getElementById('productOriginalPrice').value = '';
    document.getElementById('productDiscount').value = '0';
    document.getElementById('productFinalPrice').textContent = '₹0.00';
    document.getElementById('productFinalPriceValue').value = '0';
    document.getElementById('deliveryCharge').value = '0';
    document.getElementById('productRating').value = '';
    
    // Reset returnable option to default (returnable)
    document.getElementById('returnableYes').checked = true;
    document.getElementById('returnableNo').checked = false;
    
    // Clear hidden sub images field
    const subImagesField = document.getElementById('productSubImages');
    if (subImagesField) {
        subImagesField.value = '';
    }
    
    // Clear category and subcategory selections
    document.querySelectorAll('.category-checkbox').forEach(cb => cb.checked = false);
    document.querySelectorAll('.subcategory-checkbox').forEach(cb => cb.checked = false);
    
    // Hide subcategories section
    const subcategoriesSection = document.getElementById('productSubcategoriesSection');
    if (subcategoriesSection) {
        subcategoriesSection.style.display = 'none';
    }
    
    // Clear additional image inputs completely
    clearAdditionalImages();
    
    // Clear size checkboxes and price inputs
    document.querySelectorAll('.size-checkbox').forEach(checkbox => {
        checkbox.checked = false;
    });
    document.querySelectorAll('[id^="price"]').forEach(input => {
        input.value = '';
    });
    document.querySelectorAll('[id^="discount"]').forEach(input => {
        input.value = '';
    });
    
    // Clear weight pricing inputs completely
    clearWeightInputs();
    
    // Reset any validation states or error messages
    document.querySelectorAll('.error-message').forEach(error => {
        error.remove();
    });
    
    // Reset form styling if any
    document.querySelectorAll('input, textarea, select').forEach(input => {
        input.classList.remove('error', 'success');
        input.style.borderColor = '';
    });
    
    // Focus on first input for better UX
    const firstInput = document.getElementById('productName');
    if (firstInput) {
        setTimeout(() => {
            firstInput.focus();
        }, 100);
    }
    
    console.log('Product form completely reset and ready for new product');
}

// Admin product management functions
// Auto-calculate final price when original price or discount changes
window.calculateMainProductFinalPrice = function() {
    const originalPrice = parseFloat(document.getElementById('productOriginalPrice').value) || 0;
    const discount = parseFloat(document.getElementById('productDiscount').value) || 0;
    
    if (originalPrice > 0) {
        const finalPrice = originalPrice - (originalPrice * discount / 100);
        document.getElementById('productFinalPrice').textContent = `₹${Math.round(finalPrice * 100) / 100}`;
        document.getElementById('productFinalPriceValue').value = Math.round(finalPrice * 100) / 100;
    } else {
        document.getElementById('productFinalPrice').textContent = '₹0.00';
        document.getElementById('productFinalPriceValue').value = '0';
    }
};

// Add event listeners for price calculation
document.addEventListener('DOMContentLoaded', function() {
    const originalPriceInput = document.getElementById('productOriginalPrice');
    const discountInput = document.getElementById('productDiscount');
    
    if (originalPriceInput) {
        originalPriceInput.addEventListener('input', calculateMainProductFinalPrice);
    }
    if (discountInput) {
        discountInput.addEventListener('input', calculateMainProductFinalPrice);
    }
});

// Calculate final price for size options
window.calculateFinalPrice = function(size) {
    const priceInput = document.getElementById(`price${size}`);
    const discountInput = document.getElementById(`discount${size}`);
    const finalPriceDiv = document.getElementById(`finalPrice${size}`);
    
    const originalPrice = parseFloat(priceInput.value) || 0;
    const discount = parseFloat(discountInput.value) || 0;
    
    let finalPrice = originalPrice;
    if (discount > 0) {
        finalPrice = originalPrice - (originalPrice * discount / 100);
    }
    
    finalPriceDiv.textContent = `₹${Math.round(finalPrice * 100) / 100}`;
};

// Calculate final price for weight-based options
window.calculateWeightFinalPrice = function(inputElement) {
    const weightGroup = inputElement.parentElement;
    const priceInput = weightGroup.querySelector('.weight-price');
    const discountInput = weightGroup.querySelector('.weight-discount');
    const finalPriceDiv = weightGroup.querySelector('.weight-final-price');
    
    const originalPrice = parseFloat(priceInput.value) || 0;
    const discount = parseFloat(discountInput.value) || 0;
    
    let finalPrice = originalPrice;
    if (discount > 0) {
        finalPrice = originalPrice - (originalPrice * discount / 100);
    }
    
    finalPriceDiv.textContent = `₹${Math.round(finalPrice * 100) / 100}`;
};

// Weight-based pricing functions
window.addWeightInput = function(containerId, unit) {
    const container = document.getElementById(containerId);
    const newWeightGroup = document.createElement('div');
    newWeightGroup.className = 'weight-input-group';
    newWeightGroup.style.cssText = 'display: flex; gap: 8px; margin-bottom: 8px; align-items: center;';
    newWeightGroup.innerHTML = `
        <input type="text" class="weight-quantity" placeholder="Quantity (e.g., 100ml, 250g, 1kg)" style="width: 120px; padding: 8px; border: 1px solid #e74c3c; border-radius: 4px;">
        <input type="number" class="weight-price" placeholder="Original Price (₹)" step="0.01" min="0" style="width: 120px; padding: 8px; border: 1px solid #e74c3c; border-radius: 4px;" oninput="calculateWeightFinalPrice(this)">
        <input type="number" class="weight-discount" placeholder="Discount %" min="0" max="99" step="1" value="0" style="width: 90px; padding: 8px; border: 1px solid #f39c12; border-radius: 4px; background: #fef9e7;" oninput="calculateWeightFinalPrice(this)">
        <div class="weight-final-price" style="min-width: 80px; padding: 8px; background: #e8f5e8; border: 1px solid #27ae60; border-radius: 4px; font-weight: 600; color: #27ae60; text-align: center;">₹0</div>
        <button type="button" onclick="removeWeightInput(this)" style="background: #e74c3c; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 10px;">Remove</button>
    `;
    container.appendChild(newWeightGroup);
};

window.removeWeightInput = function(button) {
    const weightGroup = button.parentElement;
    weightGroup.remove();
};

// Collect weight-based pricing data
function collectWeightPricing() {
    const weightPricing = {
        ml: [],
        g: [],
        kg: []
    };
    
    // Collect ML pricing
    const mlContainer = document.getElementById('mlContainer');
    const mlGroups = mlContainer.querySelectorAll('.weight-input-group');
    mlGroups.forEach(group => {
        const quantity = group.querySelector('.weight-quantity').value;
        const price = group.querySelector('.weight-price').value;
        const discount = group.querySelector('.weight-discount').value || 0;
        if (quantity && price) {
            weightPricing.ml.push({ 
                quantity: quantity.trim(), 
                price: parseFloat(price),
                discount: parseFloat(discount)
            });
        }
    });
    
    // Collect G pricing
    const gContainer = document.getElementById('gContainer');
    const gGroups = gContainer.querySelectorAll('.weight-input-group');
    gGroups.forEach(group => {
        const quantity = group.querySelector('.weight-quantity').value;
        const price = group.querySelector('.weight-price').value;
        const discount = group.querySelector('.weight-discount').value || 0;
        if (quantity && price) {
            weightPricing.g.push({ 
                quantity: quantity.trim(), 
                price: parseFloat(price),
                discount: parseFloat(discount)
            });
        }
    });
    
    // Collect KG pricing
    const kgContainer = document.getElementById('kgContainer');
    const kgGroups = kgContainer.querySelectorAll('.weight-input-group');
    kgGroups.forEach(group => {
        const quantity = group.querySelector('.weight-quantity').value;
        const price = group.querySelector('.weight-price').value;
        const discount = group.querySelector('.weight-discount').value || 0;
        if (quantity && price) {
            weightPricing.kg.push({ 
                quantity: quantity.trim(), 
                price: parseFloat(price),
                discount: parseFloat(discount)
            });
        }
    });
    
    return weightPricing;
}

window.addProduct = async function() {
    const name = document.getElementById('productName').value;
    const imageUrl = document.getElementById('productImageUrl').value;
    const description = document.getElementById('productDescription').value;
    const keywords = document.getElementById('productKeywords').value;
    const originalPrice = document.getElementById('productOriginalPrice').value;
    const discount = document.getElementById('productDiscount').value || 0;
    const finalPrice = document.getElementById('productFinalPriceValue').value;
    const deliveryCharge = document.getElementById('deliveryCharge').value || 0;
    const rating = document.getElementById('productRating').value;
    const subImages = collectAdditionalImages();
    // Get selected main categories
    const selectedCategories = [];
    const categoryCheckboxes = document.querySelectorAll('.category-checkbox:checked');
    categoryCheckboxes.forEach(checkbox => {
        selectedCategories.push(checkbox.value);
    });
    
    // Get selected subcategories
    const selectedSubcategories = [];
    const subcategoryCheckboxes = document.querySelectorAll('.subcategory-checkbox:checked');
    subcategoryCheckboxes.forEach(checkbox => {
        selectedSubcategories.push(checkbox.value);
    });
    
    // Get selected regular sizes and their prices with discounts
    const sizeCheckboxes = document.querySelectorAll('.size-checkbox:checked');
    const sizes = [];
    const sizePricing = {};
    const sizeDiscounts = {};
    
    sizeCheckboxes.forEach(checkbox => {
        const size = checkbox.value;
        const priceInput = document.getElementById(`price${size}`);
        const discountInput = document.getElementById(`discount${size}`);
        const sizePrice = priceInput.value || finalPrice;
        const sizeDiscount = discountInput.value || 0;
        
        sizes.push(size);
        sizePricing[size] = parseFloat(sizePrice);
        sizeDiscounts[size] = parseFloat(sizeDiscount);
    });
    
    // Get weight-based pricing
    const weightPricing = collectWeightPricing();
    
    // Get returnable option
    const returnableRadio = document.querySelector('input[name="returnable"]:checked');
    const isReturnable = returnableRadio ? returnableRadio.value === 'true' : true; // Default to returnable
    
    if (!name || !imageUrl || !description || !originalPrice || !finalPrice || !rating) {
        showNotification('Please fill in all required fields (name, image, description, original price, rating)', 'warning');
        return;
    }
    
    if (selectedCategories.length === 0) {
        showNotification('Please select at least one main category', 'warning');
        return;
    }
    
    
    if (await addProductToFirebase(name, imageUrl, description, finalPrice, subImages, selectedCategories, sizes, sizePricing, deliveryCharge, rating, originalPrice, discount, weightPricing, selectedSubcategories, sizeDiscounts, keywords, isReturnable)) {
        // Show success notification first
        showNotification('✅ Product added successfully! Refreshing form...', 'success');
        
        // Small delay for better UX
        setTimeout(() => {
            // Use comprehensive form reset function
            resetProductForm();
            
            // Reload products data
            loadProductsAdminData();
            
            // Show final success message
            showNotification('🎉 Form has been completely reset! Ready for next product.', 'success');
            
            // Scroll to top of form for better UX
            const productForm = document.querySelector('#adminProductsTab form');
            if (productForm) {
                productForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 500);
    } else {
        showNotification('Error adding product. Please try again.', 'error');
    }
};

// Load products admin data with search functionality
function loadProductsAdminData() {
    const productsAdminList = document.getElementById('productsAdminList');
    if (!productsAdminList) return;
    
    productsAdminList.innerHTML = '';
    
    // Get search term
    const searchInput = document.getElementById('productSearchInput');
    const searchTerm = searchInput ? searchInput.value.trim() : '';
    
    // Filter products based on search term using fuzzy search
    const filteredProducts = searchTerm ? 
        fuzzySearchProducts(productsData, searchTerm, 0.6) : 
        productsData;
    
    // Create grid container
    const gridContainer = document.createElement('div');
    gridContainer.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; padding: 10px;';
    
    filteredProducts.forEach(product => {
        const productCard = document.createElement('div');
        productCard.style.cssText = `
            position: relative;
            background: white;
            border-radius: 15px;
            overflow: hidden;
            cursor: pointer;
            transition: all 0.2s ease;
            border: 2px solid #e5e7eb;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        `;
        
        const discountText = product.discount && product.discount > 0 ? ` (${product.discount}% off)` : '';
        const originalPriceText = product.originalPrice && product.originalPrice !== product.price ? `<span style="text-decoration: line-through; color: #999; font-size: 11px;">₹${product.originalPrice}</span> ` : '';
        
        productCard.innerHTML = `
            <img src="${product.imageUrl}" class="product-image" 
                 onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDIwMCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTUwIiBmaWxsPSIjZjNmNGY2Ii8+Cjx0ZXh0IHg9IjEwMCIgeT0iNzUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OWFhMiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pgo8L3N2Zz4K'">
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <div class="product-rating">
                    <span class="stars">${'⭐'.repeat(Math.floor(product.rating || 4))}</span>
                    <span>${product.rating || 4.0}</span>
                </div>
                <div style="font-size: 13px; color: #059669; font-weight: bold; margin-bottom: 2px;">
                    ${originalPriceText}<span style="color: #059669;">₹${product.price}</span>${discountText}
                </div>
                <div style="font-size: 11px; color: #666; margin-bottom: 4px;">Category: ${product.category || 'No category'}</div>
                ${product.sizes && product.sizes.length > 0 ? `<div style="margin-bottom: 8px; display: flex; align-items: center; gap: 3px; flex-wrap: wrap;"><img src="mark.png" alt="Size" style="width: 12px; height: 12px; object-fit: contain;">${product.sizes.map(size => `<span style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1px 4px; border-radius: 6px; font-size: 8px; font-weight: 600; display: inline-block;">${size}</span>`).join('')}</div>` : '<div style="margin-bottom: 8px;"></div>'}
            </div>
                <div style="display: flex; gap: 5px; margin-top: 8px;">
                    <button onclick="openEditProductModal('${product.id}')" style="flex: 1; background: #10b981; color: white; border: none; padding: 6px 8px; border-radius: 5px; cursor: pointer; font-size: 10px; font-weight: 600;">Edit Product</button>
                    <button onclick="removeProduct('${product.id}')" style="flex: 1; background: #dc3545; color: white; border: none; padding: 6px 8px; border-radius: 5px; cursor: pointer; font-size: 10px; font-weight: 600;">Remove</button>
                </div>
            </div>
        `;
        
        // Add hover effect
        productCard.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
            this.style.borderColor = '#3b82f6';
            this.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
        });
        productCard.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.borderColor = '#e5e7eb';
            this.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
        });
        
        gridContainer.appendChild(productCard);
    });
    
    productsAdminList.appendChild(gridContainer);
    
    // Show message if no products found
    if (filteredProducts.length === 0 && searchTerm) {
        productsAdminList.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No products found matching your search.</p>';
    } else if (filteredProducts.length === 0) {
        productsAdminList.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No products available. Add some products first.</p>';
    }
}

// Search products function
window.searchProducts = function() {
    loadProductsAdminData();
};

// Edit Product Modal Functions
let currentEditProductId = null;

window.openEditProductModal = function(productId) {
    currentEditProductId = productId;
    const product = productsData.find(p => p.id === productId);
    if (!product) {
        showNotification('Product not found', 'error');
        return;
    }
    
    // Show modal
    const modal = document.getElementById('editProductModal');
    modal.style.display = 'flex';
    
    // Populate form with existing data
    document.getElementById('editProductName').value = product.name || '';
    document.getElementById('editProductImageUrl').value = product.imageUrl || '';
    document.getElementById('editProductDescription').value = product.description || '';
    document.getElementById('editProductKeywords').value = product.keywords ? product.keywords.join(', ') : '';
    document.getElementById('editProductOriginalPrice').value = product.originalPrice || '';
    document.getElementById('editProductDiscount').value = product.discount || '';
    document.getElementById('editDeliveryCharge').value = product.deliveryCharge || '';
    document.getElementById('editProductRating').value = product.rating || '';
    
    // Set returnable option
    const isReturnable = product.isReturnable !== false; // Default to returnable if not specified
    if (isReturnable) {
        document.getElementById('editReturnableYes').checked = true;
    } else {
        document.getElementById('editReturnableNo').checked = true;
    }
    
    // Calculate final price
    calculateEditProductFinalPrice();
    
    // Clear and populate additional images
    const additionalImagesContainer = document.getElementById('editAdditionalImagesContainer');
    additionalImagesContainer.innerHTML = '';
    
    if (product.subImages && product.subImages.length > 0) {
        product.subImages.forEach((imageUrl) => {
            addEditImageInput();
            const inputs = additionalImagesContainer.querySelectorAll('input[type="url"]');
            const lastInput = inputs[inputs.length - 1];
            if (lastInput) {
                lastInput.value = imageUrl;
            }
        });
    } else {
        // Add one empty input if no additional images
        addEditImageInput();
    }
    
    // Load categories and populate existing selections
    setTimeout(() => {
        loadEditCategories(product.categories || [], product.subcategories || []);
    }, 100);
    
    // Load and populate sizes
    loadEditSizes(product.sizes || [], product.sizePricing || {}, product.sizeDiscounts || {});
    
    // Load weight-based pricing data
    loadEditWeightData(product.weightPricing || {});
    
    // Load rating
    if (product.rating) {
        document.getElementById('editProductRating').value = product.rating;
        updateEditRatingDisplay();
    }
};

window.closeEditProductModal = function() {
    document.getElementById('editProductModal').style.display = 'none';
    currentEditProductId = null;
};

// Functions for managing additional images in edit modal
window.addEditImageInput = function() {
    const container = document.getElementById('editAdditionalImagesContainer');
    const newImageGroup = document.createElement('div');
    newImageGroup.className = 'image-input-group';
    newImageGroup.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px; align-items: center;';
    
    newImageGroup.innerHTML = `
        <input type="url" class="additional-image-url" placeholder="Additional Image URL" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
        <button type="button" onclick="removeEditImageInput(this)" style="background: #e74c3c; color: white; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer; font-size: 10px;">Remove</button>
    `;
    
    container.appendChild(newImageGroup);
};

window.removeEditImageInput = function(button) {
    const container = document.getElementById('editAdditionalImagesContainer');
    if (container.children.length > 1) {
        button.parentElement.remove();
    } else {
        // Clear the input instead of removing if it's the last one
        const input = button.parentElement.querySelector('input');
        if (input) input.value = '';
    }
};

// Calculate final price for edit modal
window.calculateEditProductFinalPrice = function() {
    const originalPrice = parseFloat(document.getElementById('editProductOriginalPrice').value) || 0;
    const discount = parseFloat(document.getElementById('editProductDiscount').value) || 0;
    
    const finalPrice = originalPrice * (1 - discount / 100);
    
    document.getElementById('editProductFinalPrice').textContent = `₹${finalPrice.toFixed(2)}`;
    document.getElementById('editProductFinalPriceValue').value = finalPrice.toFixed(2);
};

// Load categories for edit modal
window.loadEditCategories = async function(selectedCategories = [], selectedSubcategories = []) {
    const container = document.getElementById('editCategoriesContainer');
    container.innerHTML = '';
    
    categoriesData.forEach(category => {
        const categoryDiv = document.createElement('div');
        categoryDiv.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 8px; border: 1px solid #ddd; border-radius: 5px; background: white;';
        
        const isSelected = selectedCategories.includes(category.name);
        categoryDiv.innerHTML = `
            <input type="checkbox" id="editCategory${category.name}" class="edit-category-checkbox" value="${category.name}" ${isSelected ? 'checked' : ''} onchange="loadEditSubcategories()">
            <label for="editCategory${category.name}" style="font-weight: 600; color: #2c3e50; cursor: pointer;">${category.name}</label>
        `;
        
        container.appendChild(categoryDiv);
    });
    
    // Load subcategories if categories are selected
    if (selectedCategories.length > 0) {
        setTimeout(() => {
            loadEditSubcategories(selectedSubcategories);
        }, 50);
    }
};

// Load subcategories for edit modal
window.loadEditSubcategories = function(selectedSubcategories = []) {
    const selectedCategories = Array.from(document.querySelectorAll('.edit-category-checkbox:checked')).map(cb => cb.value);
    const subcategoriesSection = document.getElementById('editSubcategoriesSection');
    const subcategoriesContainer = document.getElementById('editSubcategoriesContainer');
    
    if (selectedCategories.length === 0) {
        subcategoriesSection.style.display = 'none';
        return;
    }
    
    subcategoriesSection.style.display = 'block';
    subcategoriesContainer.innerHTML = '';
    
    const allSubcategories = new Set();
    selectedCategories.forEach(categoryName => {
        const category = categoriesData.find(cat => cat.name === categoryName);
        if (category && category.subcategories) {
            category.subcategories.forEach(sub => allSubcategories.add(sub));
        }
    });
    
    Array.from(allSubcategories).forEach(subcategory => {
        const subcategoryDiv = document.createElement('div');
        subcategoryDiv.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 10px; border: 1px solid #9b59b6; border-radius: 5px; background: white;';
        
        // Handle both string subcategories and object subcategories
        const subcategoryName = typeof subcategory === 'string' ? subcategory : subcategory.name;
        const isSelected = selectedSubcategories.includes(subcategoryName);
        
        subcategoryDiv.innerHTML = `
            <input type="checkbox" id="editSubcategory${subcategoryName}" class="edit-subcategory-checkbox" value="${subcategoryName}" ${isSelected ? 'checked' : ''}>
            <label for="editSubcategory${subcategoryName}" style="font-weight: 600; color: #8e44ad; cursor: pointer;">${subcategoryName}</label>
        `;
        
        subcategoriesContainer.appendChild(subcategoryDiv);
    });
};

// Load sizes for edit modal
window.loadEditSizes = function(selectedSizes = [], sizePricing = {}, sizeDiscounts = {}) {
    // Check selected sizes and populate pricing
    selectedSizes.forEach(size => {
        const checkbox = document.querySelector(`.edit-size-checkbox[value="${size}"]`);
        if (checkbox) {
            checkbox.checked = true;
            
            // Populate pricing data
            const priceInput = document.getElementById(`editPrice${size}`);
            const discountInput = document.getElementById(`editDiscount${size}`);
            
            if (priceInput && sizePricing[size]) {
                priceInput.value = sizePricing[size];
            }
            if (discountInput && sizeDiscounts[size]) {
                discountInput.value = sizeDiscounts[size];
            }
            
            // Calculate final price
            calculateEditFinalPrice(size);
        }
    });
};

// Load weight-based pricing data for edit modal
window.loadEditWeightData = function(weightPricing = {}) {
    // Clear existing weight inputs
    document.getElementById('editMlContainer').innerHTML = '';
    document.getElementById('editGContainer').innerHTML = '';
    document.getElementById('editKgContainer').innerHTML = '';
    
    // Load ML options
    if (weightPricing.ml && weightPricing.ml.length > 0) {
        weightPricing.ml.forEach(option => {
            addEditWeightInput('editMlContainer', 'ml');
            const container = document.getElementById('editMlContainer');
            const lastGroup = container.lastElementChild;
            
            lastGroup.querySelector('.edit-weight-quantity').value = option.quantity;
            lastGroup.querySelector('.edit-weight-price').value = option.originalPrice || option.price;
            lastGroup.querySelector('.edit-weight-discount').value = option.discount || 0;
            calculateEditWeightFinalPrice(lastGroup.querySelector('.edit-weight-price'));
        });
    } else {
        addEditWeightInput('editMlContainer', 'ml');
    }
    
    // Load G options
    if (weightPricing.g && weightPricing.g.length > 0) {
        weightPricing.g.forEach(option => {
            addEditWeightInput('editGContainer', 'g');
            const container = document.getElementById('editGContainer');
            const lastGroup = container.lastElementChild;
            
            lastGroup.querySelector('.edit-weight-quantity').value = option.quantity;
            lastGroup.querySelector('.edit-weight-price').value = option.originalPrice || option.price;
            lastGroup.querySelector('.edit-weight-discount').value = option.discount || 0;
            calculateEditWeightFinalPrice(lastGroup.querySelector('.edit-weight-price'));
        });
    } else {
        addEditWeightInput('editGContainer', 'g');
    }
    
    // Load KG options
    if (weightPricing.kg && weightPricing.kg.length > 0) {
        weightPricing.kg.forEach(option => {
            addEditWeightInput('editKgContainer', 'kg');
            const container = document.getElementById('editKgContainer');
            const lastGroup = container.lastElementChild;
            
            lastGroup.querySelector('.edit-weight-quantity').value = option.quantity;
            lastGroup.querySelector('.edit-weight-price').value = option.originalPrice || option.price;
            lastGroup.querySelector('.edit-weight-discount').value = option.discount || 0;
            calculateEditWeightFinalPrice(lastGroup.querySelector('.edit-weight-price'));
        });
    } else {
        addEditWeightInput('editKgContainer', 'kg');
    }
};

// Updated loadEditSizes function
window.loadEditSizes = function(selectedSizes = [], sizePricing = {}, sizeDiscounts = {}) {
    // Check selected sizes and populate pricing
    selectedSizes.forEach(size => {
        const checkbox = document.querySelector(`.edit-size-checkbox[value="${size}"]`);
        if (checkbox) {
            checkbox.checked = true;
            
            // Populate pricing data
            const priceInput = document.getElementById(`editPrice${size}`);
            const discountInput = document.getElementById(`editDiscount${size}`);
            
            if (priceInput && sizePricing[size]) {
                priceInput.value = sizePricing[size];
            }
            if (discountInput && sizeDiscounts[size]) {
                discountInput.value = sizeDiscounts[size];
            }
            
            // Calculate final price
            setTimeout(() => {
                calculateEditFinalPrice(size);
            }, 50);
        }
    });
    
    // Populate size pricing
    setTimeout(() => {
        Object.keys(sizePricing).forEach(size => {
            const priceInput = document.getElementById(`editSizePrice${size}`);
            if (priceInput) {
                priceInput.value = sizePricing[size] || '';
            }
        });
        
        Object.keys(sizeDiscounts).forEach(size => {
            const discountInput = document.getElementById(`editSizeDiscount${size}`);
            if (discountInput) {
                discountInput.value = sizeDiscounts[size] || '';
            }
        });
    }, 100);
};

// Toggle size pricing inputs for edit modal
window.toggleEditSizePricing = function(size) {
    const checkbox = document.getElementById(`editSize${size}`);
    const container = document.getElementById('editSizePricingContainer');
    const existingInput = document.getElementById(`editSizePricing${size}`);
    
    if (checkbox.checked && !existingInput) {
        const pricingDiv = document.createElement('div');
        pricingDiv.id = `editSizePricing${size}`;
        pricingDiv.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 10px; padding: 10px; border: 1px solid #e74c3c; border-radius: 5px; background: #fff5f5;';
        
        pricingDiv.innerHTML = `
            <div>
                <label style="display: block; font-size: 10px; font-weight: 600; color: #c0392b; margin-bottom: 3px;">Size ${size} Price (₹):</label>
                <input type="number" id="editSizePrice${size}" placeholder="Price for ${size}" step="0.01" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 10px;">
            </div>
            <div>
                <label style="display: block; font-size: 10px; font-weight: 600; color: #c0392b; margin-bottom: 3px;">Discount (%):</label>
                <input type="number" id="editSizeDiscount${size}" placeholder="Discount %" min="0" max="99" step="1" value="0" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 10px;">
            </div>
            <div>
                <label style="display: block; font-size: 10px; font-weight: 600; color: #27ae60; margin-bottom: 3px;">Final Price (₹):</label>
                <div id="editSizeFinalPrice${size}" style="width: 100%; padding: 6px; border: 1px solid #27ae60; border-radius: 4px; background: #e8f5e8; color: #27ae60; font-weight: 600; text-align: center; font-size: 10px;">₹0.00</div>
            </div>
        `;
        
        container.appendChild(pricingDiv);
        
        // Add event listeners for price calculation
        const priceInput = document.getElementById(`editSizePrice${size}`);
        const discountInput = document.getElementById(`editSizeDiscount${size}`);
        
        const calculateSizePrice = () => {
            const price = parseFloat(priceInput.value) || 0;
            const discount = parseFloat(discountInput.value) || 0;
            const finalPrice = price * (1 - discount / 100);
            document.getElementById(`editSizeFinalPrice${size}`).textContent = `₹${finalPrice.toFixed(2)}`;
        };
        
        priceInput.addEventListener('input', calculateSizePrice);
        discountInput.addEventListener('input', calculateSizePrice);
        
    } else if (!checkbox.checked && existingInput) {
        existingInput.remove();
    }
};

// Weight-based pricing functions for edit modal
window.loadEditWeightPricing = function(weightPricing = {}, weightOptions = []) {
    if (weightPricing.enabled) {
        document.getElementById('editEnableWeightPricing').checked = true;
        toggleEditWeightPricing();
        
        setTimeout(() => {
            if (weightPricing.baseWeight) {
                document.getElementById('editBaseWeight').value = weightPricing.baseWeight;
            }
            if (weightPricing.pricePerGram) {
                document.getElementById('editPricePerGram').value = weightPricing.pricePerGram;
            }
            
            // Load weight options
            weightOptions.forEach(option => {
                addEditWeightOption(option.weight, option.label);
            });
        }, 100);
    }
};

window.toggleEditWeightPricing = function() {
    const checkbox = document.getElementById('editEnableWeightPricing');
    const container = document.getElementById('editWeightPricingContainer');
    
    if (checkbox.checked) {
        container.style.display = 'block';
    } else {
        container.style.display = 'none';
        // Clear weight options when disabled
        document.getElementById('editWeightOptionsContainer').innerHTML = '';
    }
};

window.addEditWeightOption = function(weight = '', label = '') {
    const container = document.getElementById('editWeightOptionsContainer');
    const optionId = 'editWeightOption' + Date.now();
    
    const optionDiv = document.createElement('div');
    optionDiv.id = optionId;
    optionDiv.style.cssText = 'display: flex; gap: 8px; align-items: center; padding: 8px; border: 1px solid #f39c12; border-radius: 5px; background: white;';
    
    optionDiv.innerHTML = `
        <input type="number" placeholder="Weight (g)" value="${weight}" min="1" style="flex: 1; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 10px;">
        <input type="text" placeholder="Label (e.g., 500g)" value="${label}" style="flex: 1; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 10px;">
        <button type="button" onclick="document.getElementById('${optionId}').remove()" style="background: #e74c3c; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 10px;">×</button>
    `;
    
    container.appendChild(optionDiv);
};

// Calculate final price for edit modal main pricing
window.calculateEditProductFinalPrice = function() {
    const originalPrice = parseFloat(document.getElementById('editProductOriginalPrice').value) || 0;
    const discount = parseFloat(document.getElementById('editProductDiscount').value) || 0;
    
    const finalPrice = originalPrice - (originalPrice * discount / 100);
    
    document.getElementById('editProductFinalPrice').textContent = `₹${finalPrice.toFixed(2)}`;
    document.getElementById('editProductFinalPriceValue').value = finalPrice;
};

// Calculate final price for individual sizes in edit modal
window.calculateEditFinalPrice = function(size) {
    const priceInput = document.getElementById(`editPrice${size}`);
    const discountInput = document.getElementById(`editDiscount${size}`);
    const finalPriceDiv = document.getElementById(`editFinalPrice${size}`);
    
    if (priceInput && discountInput && finalPriceDiv) {
        const originalPrice = parseFloat(priceInput.value) || 0;
        const discount = parseFloat(discountInput.value) || 0;
        
        const finalPrice = originalPrice - (originalPrice * discount / 100);
        finalPriceDiv.textContent = `₹${finalPrice.toFixed(0)}`;
    }
};

// Calculate final price for weight-based pricing in edit modal
window.calculateEditWeightFinalPrice = function(element) {
    const group = element.closest('.edit-weight-input-group');
    const priceInput = group.querySelector('.edit-weight-price');
    const discountInput = group.querySelector('.edit-weight-discount');
    const finalPriceDiv = group.querySelector('.edit-weight-final-price');
    
    if (priceInput && discountInput && finalPriceDiv) {
        const originalPrice = parseFloat(priceInput.value) || 0;
        const discount = parseFloat(discountInput.value) || 0;
        
        const finalPrice = originalPrice - (originalPrice * discount / 100);
        finalPriceDiv.textContent = `₹${finalPrice.toFixed(0)}`;
    }
};

// Add weight input functions for edit modal
window.addEditWeightInput = function(containerId, unit) {
    const container = document.getElementById(containerId);
    const newGroup = document.createElement('div');
    newGroup.className = 'edit-weight-input-group';
    newGroup.style.cssText = 'display: flex; gap: 8px; margin-bottom: 8px; align-items: center;';
    
    newGroup.innerHTML = `
        <input type="text" class="edit-weight-quantity" placeholder="Quantity (e.g., 100ml, 250g, 1kg)" style="width: 120px; padding: 8px; border: 1px solid #e74c3c; border-radius: 4px;">
        <input type="number" class="edit-weight-price" placeholder="Original Price (₹)" step="0.01" min="0" style="width: 120px; padding: 8px; border: 1px solid #e74c3c; border-radius: 4px;" oninput="calculateEditWeightFinalPrice(this)">
        <input type="number" class="edit-weight-discount" placeholder="Discount %" min="0" max="99" step="1" value="0" style="width: 90px; padding: 8px; border: 1px solid #f39c12; border-radius: 4px; background: #fef9e7;" oninput="calculateEditWeightFinalPrice(this)">
        <div class="edit-weight-final-price" style="min-width: 80px; padding: 8px; background: #e8f5e8; border: 1px solid #27ae60; border-radius: 4px; font-weight: 600; color: #27ae60; text-align: center;">₹0</div>
        <button type="button" onclick="removeEditWeightInput(this)" style="background: #e74c3c; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 10px;">Remove</button>
    `;
    
    container.appendChild(newGroup);
};

// Remove weight input function for edit modal
window.removeEditWeightInput = function(button) {
    const group = button.closest('.edit-weight-input-group');
    const container = group.parentElement;
    
    // Only remove if there's more than one group in the container
    if (container.children.length > 1) {
        group.remove();
    } else {
        // Clear inputs instead of removing the last one
        const inputs = group.querySelectorAll('input');
        inputs.forEach(input => input.value = input.type === 'number' && input.classList.contains('edit-weight-discount') ? '0' : '');
        const finalPriceDiv = group.querySelector('.edit-weight-final-price');
        if (finalPriceDiv) finalPriceDiv.textContent = '₹0';
    }
};

// Rating display function for edit modal
window.updateEditRatingDisplay = function() {
    const rating = parseFloat(document.getElementById('editProductRating').value) || 0;
    const starsContainer = document.getElementById('editRatingStars');
    
    let starsHtml = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= Math.floor(rating)) {
            starsHtml += '⭐';
        } else if (i === Math.ceil(rating) && rating % 1 !== 0) {
            starsHtml += '⭐';
        } else {
            starsHtml += '☆';
        }
    }
    
    starsContainer.innerHTML = starsHtml;
};

// Update edited product
window.updateEditedProduct = async function() {
    if (!currentEditProductId) {
        showNotification('No product selected for editing', 'error');
        return;
    }
    
    // Collect form data
    const productData = {
        name: document.getElementById('editProductName').value.trim(),
        description: document.getElementById('editProductDescription').value.trim(),
        imageUrl: document.getElementById('editProductImageUrl').value.trim(),
        keywords: document.getElementById('editProductKeywords').value ? 
                 document.getElementById('editProductKeywords').value.split(',').map(k => k.trim().toLowerCase()).filter(k => k) : [],
        rating: parseFloat(document.getElementById('editProductRating').value) || 4.0,
        deliveryCharge: parseFloat(document.getElementById('editDeliveryCharge').value) || 0,
        originalPrice: parseFloat(document.getElementById('editProductOriginalPrice').value) || 0,
        discount: parseFloat(document.getElementById('editProductDiscount').value) || 0,
        price: parseFloat(document.getElementById('editProductFinalPriceValue').value) || 0
    };
    
    // Get returnable option
    const returnableRadio = document.querySelector('input[name="editReturnable"]:checked');
    productData.isReturnable = returnableRadio ? returnableRadio.value === 'true' : true; // Default to returnable
    
    // Validation
    if (!productData.name || !productData.imageUrl || productData.price <= 0) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    // Collect additional images - create fresh array copy to prevent reference leaking
    const additionalImageInputs = document.querySelectorAll('#editAdditionalImagesContainer input[type="url"]');
    const imageUrls = [];
    additionalImageInputs.forEach(input => {
        if (input.value.trim()) {
            // Create fresh copy of each URL string
            imageUrls.push(String(input.value.trim()));
        }
    });
    productData.subImages = [...imageUrls]; // Fresh array copy
    
    // Collect categories and subcategories
    const selectedCategories = Array.from(document.querySelectorAll('.edit-category-checkbox:checked')).map(cb => cb.value);
    const selectedSubcategories = Array.from(document.querySelectorAll('.edit-subcategory-checkbox:checked')).map(cb => cb.value);
    
    productData.categories = selectedCategories;
    productData.subcategories = selectedSubcategories;
    productData.category = selectedCategories[0] || ''; // Backward compatibility
    
    // Collect sizes and size pricing
    const selectedSizes = Array.from(document.querySelectorAll('.edit-size-checkbox:checked')).map(cb => cb.value);
    productData.sizes = selectedSizes;
    
    // Collect size pricing and discounts
    const sizePricing = {};
    const sizeDiscounts = {};
    selectedSizes.forEach(size => {
        const priceInput = document.getElementById(`editPrice${size}`);
        const discountInput = document.getElementById(`editDiscount${size}`);
        
        if (priceInput && priceInput.value) {
            sizePricing[size] = parseFloat(priceInput.value);
        }
        if (discountInput && discountInput.value) {
            sizeDiscounts[size] = parseFloat(discountInput.value);
        }
    });
    
    productData.sizePricing = sizePricing;
    productData.sizeDiscounts = sizeDiscounts;
    
    // Collect weight-based pricing (new format)
    const collectEditWeightPricing = () => {
        const weightPricing = { ml: [], g: [], kg: [] };
        
        // Collect ML options
        const mlGroups = document.querySelectorAll('#editMlContainer .edit-weight-input-group');
        mlGroups.forEach(group => {
            const quantity = group.querySelector('.edit-weight-quantity').value;
            const price = group.querySelector('.edit-weight-price').value;
            const discount = group.querySelector('.edit-weight-discount').value || 0;
            
            if (quantity && price) {
                const finalPrice = price - (price * discount / 100);
                weightPricing.ml.push({
                    quantity: quantity.trim(),
                    originalPrice: parseFloat(price),
                    discount: parseFloat(discount),
                    price: finalPrice
                });
            }
        });
        
        // Collect G options
        const gGroups = document.querySelectorAll('#editGContainer .edit-weight-input-group');
        gGroups.forEach(group => {
            const quantity = group.querySelector('.edit-weight-quantity').value;
            const price = group.querySelector('.edit-weight-price').value;
            const discount = group.querySelector('.edit-weight-discount').value || 0;
            
            if (quantity && price) {
                const finalPrice = price - (price * discount / 100);
                weightPricing.g.push({
                    quantity: quantity.trim(),
                    originalPrice: parseFloat(price),
                    discount: parseFloat(discount),
                    price: finalPrice
                });
            }
        });
        
        // Collect KG options
        const kgGroups = document.querySelectorAll('#editKgContainer .edit-weight-input-group');
        kgGroups.forEach(group => {
            const quantity = group.querySelector('.edit-weight-quantity').value;
            const price = group.querySelector('.edit-weight-price').value;
            const discount = group.querySelector('.edit-weight-discount').value || 0;
            
            if (quantity && price) {
                const finalPrice = price - (price * discount / 100);
                weightPricing.kg.push({
                    quantity: quantity.trim(),
                    originalPrice: parseFloat(price),
                    discount: parseFloat(discount),
                    price: finalPrice
                });
            }
        });
        
        return weightPricing;
    };
    
    productData.weightPricing = collectEditWeightPricing();
    
    try {
        // Update in Firebase
        const productRef = doc(db, 'products', currentEditProductId);
        await updateDoc(productRef, productData);
        
        // Update local data
        const productIndex = productsData.findIndex(p => p.id === currentEditProductId);
        if (productIndex !== -1) {
            productsData[productIndex] = { ...productsData[productIndex], ...productData };
        }
        
        // Close modal and refresh displays
        closeEditProductModal();
        loadProductsAdminData();
        updateProductsDisplay();
        loadEventsOnHomePage();
        
        showNotification('Product updated successfully!', 'success');
        
    } catch (error) {
        console.error('Error updating product:', error);
        showNotification('Error updating product. Please try again.', 'error');
    }
};

// Update Categories Modal Functions
let currentUpdateProductId = null;

window.openUpdateCategoriesModal = function(productId) {
    currentUpdateProductId = productId;
    const product = productsData.find(p => p.id === productId);
    if (!product) return;

    // Show modal
    const modal = document.getElementById('updateCategoriesModal');
    modal.style.display = 'flex';

    // Display product info
    const productInfo = document.getElementById('updateProductInfo');
    productInfo.innerHTML = `
        <div style="display: flex; align-items: center; gap: 15px;">
            <img src="${product.imageUrl}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;" 
                 onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjZjNmNGY2Ii8+Cjx0ZXh0IHg9IjMwIiB5PSIzMCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEwIiBmaWxsPSIjOTk5YWEyIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Tm8gSW1hZ2U8L3RleHQ+Cjwvc3ZnPgo='">
            <div>
                <div style="font-weight: bold; font-size: 16px; color: #1a202c;">${product.name}</div>
                <div style="color: #059669; font-weight: 600;">₹${product.price}</div>
                <div style="color: #666; font-size: 10px;">Current Category: ${product.category || 'No category'}</div>
            </div>
        </div>
    `;

    // Load categories for selection
    loadCategoriesForUpdate(product);
};

function loadCategoriesForUpdate(product) {
    const categoriesContainer = document.getElementById('updateCategoriesContainer');
    const subcategoriesContainer = document.getElementById('updateSubcategoriesContainer');
    
    // Clear containers
    categoriesContainer.innerHTML = '';
    subcategoriesContainer.innerHTML = '';

    // Load main categories
    categoriesData.forEach(category => {
        const checkboxDiv = document.createElement('div');
        checkboxDiv.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 8px; border: 1px solid #ddd; border-radius: 6px; background: white;';
        
        const isSelected = Array.isArray(product.categories) ? product.categories.includes(category.name) : product.category === category.name;
        
        checkboxDiv.innerHTML = `
            <input type="checkbox" id="updateCat_${category.name}" value="${category.name}" class="update-category-checkbox" ${isSelected ? 'checked' : ''} onchange="loadSubcategoriesForUpdate()">
            <label for="updateCat_${category.name}" style="flex: 1; cursor: pointer; font-weight: 500;">${category.name}</label>
        `;
        categoriesContainer.appendChild(checkboxDiv);
    });

    // Load subcategories based on selected categories
    loadSubcategoriesForUpdate();
}

function loadSubcategoriesForUpdate() {
    const subcategoriesContainer = document.getElementById('updateSubcategoriesContainer');
    subcategoriesContainer.innerHTML = '';

    // Get selected categories
    const selectedCategories = Array.from(document.querySelectorAll('.update-category-checkbox:checked')).map(cb => cb.value);
    
    if (selectedCategories.length === 0) {
        subcategoriesContainer.innerHTML = '<p style="color: #666; text-align: center; grid-column: 1 / -1;">Please select at least one main category to see subcategories.</p>';
        return;
    }

    // Collect all subcategories from selected categories
    const allSubcategories = [];
    selectedCategories.forEach(categoryName => {
        const category = categoriesData.find(cat => cat.name === categoryName);
        if (category && category.subcategories) {
            category.subcategories.forEach(sub => {
                if (!allSubcategories.find(s => s.name === sub.name)) {
                    allSubcategories.push({...sub, parentCategory: categoryName});
                }
            });
        }
    });

    if (allSubcategories.length === 0) {
        subcategoriesContainer.innerHTML = '<p style="color: #666; text-align: center; grid-column: 1 / -1;">No subcategories available for selected categories.</p>';
        return;
    }

    // Get current product
    const product = productsData.find(p => p.id === currentUpdateProductId);
    
    allSubcategories.forEach(subcategory => {
        const checkboxDiv = document.createElement('div');
        checkboxDiv.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 8px; border: 1px solid #ddd; border-radius: 6px; background: white;';
        
        const isSelected = Array.isArray(product.subcategories) ? product.subcategories.includes(subcategory.name) : false;
        
        checkboxDiv.innerHTML = `
            <input type="checkbox" id="updateSub_${subcategory.name}" value="${subcategory.name}" class="update-subcategory-checkbox" ${isSelected ? 'checked' : ''}>
            <label for="updateSub_${subcategory.name}" style="flex: 1; cursor: pointer; font-weight: 500;">${subcategory.name}</label>
            <span style="font-size: 10px; color: #666; background: #f3f4f6; padding: 2px 6px; border-radius: 4px;">${subcategory.parentCategory}</span>
        `;
        subcategoriesContainer.appendChild(checkboxDiv);
    });
}

window.closeUpdateCategoriesModal = function() {
    const modal = document.getElementById('updateCategoriesModal');
    modal.style.display = 'none';
    currentUpdateProductId = null;
};

window.updateProductCategories = async function() {
    if (!currentUpdateProductId) return;

    // Get selected categories and subcategories
    const selectedCategories = Array.from(document.querySelectorAll('.update-category-checkbox:checked')).map(cb => cb.value);
    const selectedSubcategories = Array.from(document.querySelectorAll('.update-subcategory-checkbox:checked')).map(cb => cb.value);

    if (selectedCategories.length === 0) {
        showNotification('Please select at least one main category', 'warning');
        return;
    }

    try {
        // Update product in Firebase
        const productRef = doc(db, 'products', currentUpdateProductId);
        await updateDoc(productRef, {
            categories: selectedCategories,
            subcategories: selectedSubcategories,
            category: selectedCategories[0] // Keep first category as primary for backward compatibility
        });

        // Update local data
        const productIndex = productsData.findIndex(p => p.id === currentUpdateProductId);
        if (productIndex !== -1) {
            productsData[productIndex].categories = selectedCategories;
            productsData[productIndex].subcategories = selectedSubcategories;
            productsData[productIndex].category = selectedCategories[0];
        }

        showNotification('Product categories updated successfully!', 'success');
        closeUpdateCategoriesModal();
        loadProductsAdminData(); // Refresh admin products display

    } catch (error) {
        console.error('Error updating product categories:', error);
        showNotification('Error updating categories. Please try again.', 'error');
    }
};

window.removeProduct = async function(productId) {
    console.log('Attempting to remove product with ID:', productId);
    const success = await removeProductFromFirebase(productId);
    if (success) {
        loadProductsAdminData();
        // Refresh all product displays including event cards
        updateProductsDisplay();
        loadEventsOnHomePage();
        showNotification('Product removed from all sections successfully!', 'success');
    } else {
        showNotification('Error removing product. Please try again.', 'error');
    }
};

// Edit Product Category Modal Functions
let currentEditCategoryProductId = null;

window.openEditCategoryModal = function(productId, currentCategory, currentSubcategory) {
    currentEditCategoryProductId = productId;
    const modal = document.getElementById('editCategoryModal');
    
    // Get current product data to load existing categories and subcategories
    const product = productsData.find(p => p.id === productId);
    const currentCategories = product?.categories || [currentCategory].filter(Boolean);
    const currentSubcategories = product?.subcategories || [currentSubcategory].filter(Boolean);
    
    // Load category checkboxes
    loadEditCategoryCheckboxes(currentCategories);
    
    // Load subcategory checkboxes if categories are selected
    if (currentCategories.length > 0) {
        loadEditSubcategoryCheckboxes(currentCategories, currentSubcategories);
    }
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    // Final scroll reset after modal is displayed
    setTimeout(() => {
        if (modal) modal.scrollTop = 0;
        if (modalContent) modalContent.scrollTop = 0;
        if (modalBody) modalBody.scrollTop = 0;
    }, 50);
};

function loadEditCategoryCheckboxes(selectedCategories = []) {
    console.log('Loading edit category checkboxes with selected:', selectedCategories);
    const categoriesContainer = document.getElementById('editProductCategoriesContainer');
    if (!categoriesContainer) {
        console.error('Categories container not found');
        return;
    }
    
    categoriesContainer.innerHTML = '';
    
    if (!categoriesData || categoriesData.length === 0) {
        console.error('No categories data available');
        categoriesContainer.innerHTML = '<p style="color: #666;">No categories available</p>';
        return;
    }
    
    categoriesData.forEach(category => {
        const categoryDiv = document.createElement('div');
        categoryDiv.style.cssText = 'background: white; padding: 10px; border-radius: 6px; border: 1px solid #ddd;';
        
        const isChecked = selectedCategories.includes(category.name);
        
        categoryDiv.innerHTML = `
            <label style="display: flex; align-items: center; cursor: pointer; font-weight: 500;">
                <input type="checkbox" class="edit-category-checkbox" value="${category.name}" ${isChecked ? 'checked' : ''} 
                       style="margin-right: 8px; transform: scale(1.2);">
                <span style="color: #2c3e50;">${category.name}</span>
            </label>
        `;
        
        categoriesContainer.appendChild(categoryDiv);
    });
    
    console.log('Added', categoriesData.length, 'category checkboxes');
    
    // Add event listeners to category checkboxes
    setTimeout(() => {
        document.querySelectorAll('.edit-category-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                updateEditSubcategories();
            });
        });
    }, 100);
}

function updateEditSubcategories() {
    const subcategoriesSection = document.getElementById('editProductSubcategoriesSection');
    const subcategoriesContainer = document.getElementById('editProductSubcategoriesContainer');
    
    // Get selected categories
    const selectedCategories = Array.from(document.querySelectorAll('.edit-category-checkbox:checked')).map(cb => cb.value);
    
    if (selectedCategories.length === 0) {
        subcategoriesSection.style.display = 'none';
        return;
    }
    
    subcategoriesSection.style.display = 'block';
    subcategoriesContainer.innerHTML = '';
    
    // Collect all subcategories from selected categories
    const allSubcategories = new Set();
    selectedCategories.forEach(categoryName => {
        const category = categoriesData.find(cat => cat.name === categoryName);
        if (category && category.subcategories) {
            category.subcategories.forEach(sub => {
                if (typeof sub === 'string') {
                    allSubcategories.add(sub);
                } else if (sub && sub.name) {
                    allSubcategories.add(sub.name);
                }
            });
        }
    });
    
    console.log('All subcategories found:', Array.from(allSubcategories));
    
    if (allSubcategories.size === 0) {
        subcategoriesContainer.innerHTML = '<p style="color: #666; text-align: center; grid-column: 1 / -1;">No subcategories available for selected categories.</p>';
        return;
    }
    
    // Create checkboxes for subcategories
    Array.from(allSubcategories).forEach(subcategory => {
        const subcategoryDiv = document.createElement('div');
        subcategoryDiv.style.cssText = 'background: white; padding: 10px; border-radius: 6px; border: 1px solid #ddd;';
        
        subcategoryDiv.innerHTML = `
            <label style="display: flex; align-items: center; cursor: pointer; font-weight: 500;">
                <input type="checkbox" class="edit-subcategory-checkbox" value="${subcategory}" 
                       style="margin-right: 8px; transform: scale(1.2);">
                <span style="color: #6a1b9a;">${subcategory}</span>
            </label>
        `;
        
        subcategoriesContainer.appendChild(subcategoryDiv);
    });
}

function loadEditSubcategoryCheckboxes(selectedCategories, selectedSubcategories = []) {
    updateEditSubcategories();
    
    // Pre-select subcategories after a short delay
    setTimeout(() => {
        selectedSubcategories.forEach(subcategory => {
            const checkbox = document.querySelector(`.edit-subcategory-checkbox[value="${subcategory}"]`);
            if (checkbox) {
                checkbox.checked = true;
            }
        });
    }, 100);
}

window.closeEditCategoryModal = function() {
    const modal = document.getElementById('editCategoryModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    currentEditCategoryProductId = null;
};

window.updateProductCategory = async function() {
    if (!currentEditCategoryProductId) return;
    
    // Get selected categories and subcategories
    const selectedCategories = Array.from(document.querySelectorAll('.edit-category-checkbox:checked')).map(cb => cb.value);
    const selectedSubcategories = Array.from(document.querySelectorAll('.edit-subcategory-checkbox:checked')).map(cb => cb.value);
    
    if (selectedCategories.length === 0) {
        showNotification('Please select at least one category', 'error');
        return;
    }
    
    try {
        // Update in Firebase
        const productRef = doc(db, 'products', currentEditCategoryProductId);
        await updateDoc(productRef, {
            categories: selectedCategories,
            subcategories: selectedSubcategories,
            category: selectedCategories[0] || '' // Backward compatibility
        });
        
        // Update local data
        const productIndex = productsData.findIndex(p => p.id === currentEditCategoryProductId);
        if (productIndex !== -1) {
            productsData[productIndex].categories = selectedCategories;
            productsData[productIndex].subcategories = selectedSubcategories;
            productsData[productIndex].category = selectedCategories[0];
        }
        
        // Refresh displays
        loadProductsAdminData();
        updateProductsDisplay();
        loadEventsOnHomePage();
        
        showNotification('Product categories updated successfully!', 'success');
        closeEditCategoryModal();
        
    } catch (error) {
        console.error('Error updating product categories:', error);
        showNotification('Error updating categories. Please try again.', 'error');
    }
};

// Carousel functions for product modal
window.changeCarouselImage = function(productId, direction) {
    const carousel = document.getElementById('imageCarousel-' + productId);
    if (!carousel) return;
    
    const images = carousel.querySelectorAll('.carousel-image');
    const indicators = carousel.parentElement.querySelectorAll('.carousel-indicator');
    
    let currentIndex = 0;
    images.forEach((img, index) => {
        if (img.style.opacity === '1') {
            currentIndex = index;
        }
    });
    
    let newIndex = currentIndex + direction;
    if (newIndex >= images.length) newIndex = 0;
    if (newIndex < 0) newIndex = images.length - 1;
    
    // Update images
    images.forEach((img, index) => {
        img.style.opacity = index === newIndex ? '1' : '0';
    });
    
    // Update indicators
    indicators.forEach((indicator, index) => {
        indicator.style.background = index === newIndex ? 'white' : 'rgba(255,255,255,0.5)';
    });
};

// Enhanced carousel functions for new image system
window.navigateCarousel = function(productId, direction) {
    const carouselImages = document.getElementById(`carouselImages-${productId}`);
    const thumbnailStrip = document.getElementById(`thumbnailStrip-${productId}`);
    
    if (!carouselImages || !thumbnailStrip) return;
    
    const slides = carouselImages.querySelectorAll('.carousel-slide');
    const thumbnails = thumbnailStrip.querySelectorAll('.thumbnail');
    
    // Find current active slide
    let currentIndex = 0;
    const currentTransform = carouselImages.style.transform;
    if (currentTransform) {
        const match = currentTransform.match(/translateX\((-?\d+)%\)/);
        if (match) {
            currentIndex = Math.abs(parseInt(match[1])) / 100;
        }
    }
    
    // Calculate new index
    let newIndex = currentIndex + direction;
    if (newIndex >= slides.length) newIndex = 0;
    if (newIndex < 0) newIndex = slides.length - 1;
    
    // Update carousel position
    carouselImages.style.transform = `translateX(-${newIndex * 100}%)`;
    
    // Update thumbnail active state
    thumbnails.forEach((thumb, index) => {
        thumb.classList.toggle('active', index === newIndex);
    });
};

window.goToSlide = function(productId, targetIndex) {
    const carouselImages = document.getElementById(`carouselImages-${productId}`);
    const thumbnailStrip = document.getElementById(`thumbnailStrip-${productId}`);
    
    if (!carouselImages || !thumbnailStrip) return;
    
    const thumbnails = thumbnailStrip.querySelectorAll('.thumbnail');
    
    // Update carousel position
    carouselImages.style.transform = `translateX(-${targetIndex * 100}%)`;
    
    // Update thumbnail active state
    thumbnails.forEach((thumb, index) => {
        thumb.classList.toggle('active', index === targetIndex);
    });
};

// Description toggle function
window.toggleDescription = function(productId) {
    const descriptionText = document.getElementById(`description-${productId}`);
    const readMoreBtn = document.getElementById(`readMoreBtn-${productId}`);
    
    if (!descriptionText || !readMoreBtn) return;
    
    if (descriptionText.classList.contains('truncated')) {
        // Expand description
        descriptionText.classList.remove('truncated');
        readMoreBtn.textContent = 'Read Less';
    } else {
        // Collapse description
        descriptionText.classList.add('truncated');
        readMoreBtn.textContent = 'Read More';
    }
};

// Enhanced product modal functions with new features
window.openProductModal = function(productId) {
    const product = productsData.find(p => p.id === productId);
    if (!product) return;
    
    // Show cart floating box when opening any product modal
    const floatingNotification = document.getElementById('floatingCartNotification');
    if (floatingNotification && cartItems.length > 0) {
        floatingNotification.classList.remove('hide');
        floatingNotification.classList.add('show');
    }
    
    // Add to navigation stack
    pushToNavigationStack('product-modal', { productId: productId });
    
    const modal = document.getElementById('productModal');
    const modalBody = document.getElementById('productModalBody');
    const modalContent = modal ? modal.querySelector('.product-modal-content') : null;
    
    // Force scroll to top after content loads with delay
    setTimeout(() => {
        if (modal) modal.scrollTop = 0;
        if (modalContent) modalContent.scrollTop = 0;
        if (modalBody) modalBody.scrollTop = 0;
    }, 100);
    
    // Prepare all images (main + sub images)
    const allImages = [product.imageUrl];
    if (product.subImages && product.subImages.length > 0) {
        allImages.push(...product.subImages);
    }
    
    // Create enhanced image carousel with thumbnails
    let carouselHTML = '';
    if (allImages.length > 1) {
        // Multiple images - show carousel with thumbnails
        let slidesHTML = '';
        let thumbnailsHTML = '';
        
        allImages.forEach((imgUrl, index) => {
            slidesHTML += `
                <div class="carousel-slide" data-index="${index}">
                    <img src="${imgUrl}" alt="${product.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjhGOUZBIi8+CjxwYXRoIGQ9Ik03NSA3NUgxMjVWMTI1SDc1Vjc1WiIgZmlsbD0iI0RERERERCIvPgo8L3N2Zz4K'">
                </div>
            `;
            
            thumbnailsHTML += `
                <div class="thumbnail ${index === 0 ? 'active' : ''}" onclick="goToSlide('${product.id}', ${index})">
                    <img src="${imgUrl}" alt="${product.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjhGOUZBIi8+CjxwYXRoIGQ9Ik03NSA3NUgxMjVWMTI1SDc1Vjc1WiIgZmlsbD0iI0RERERERCIvPgo8L3N2Zz4K'">
                </div>
            `;
        });
        
        carouselHTML = `
            <div class="image-carousel-container">
                <div class="image-carousel" id="imageCarousel-${product.id}">
                    <div class="carousel-images" id="carouselImages-${product.id}">
                        ${slidesHTML}
                    </div>
                    <button class="carousel-nav prev" onclick="navigateCarousel('${product.id}', -1)">‹</button>
                    <button class="carousel-nav next" onclick="navigateCarousel('${product.id}', 1)">›</button>
                </div>
                <div class="thumbnail-strip" id="thumbnailStrip-${product.id}">
                    ${thumbnailsHTML}
                </div>
            </div>
        `;
    } else {
        // Single image - show normally
        carouselHTML = `<img src="${product.imageUrl}" alt="${product.name}" class="product-modal-image" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjhGOUZBIi8+CjxwYXRoIGQ9Ik03NSA3NUgxMjVWMTI1SDc1Vjc1WiIgZmlsbD0iI0RERERERCIvPgo8L3N2Zz4K'">`;
    }
    
    modalBody.innerHTML = `
        ${carouselHTML}
        <h3 class="product-modal-name">${product.name}</h3>
        <div class="product-rating" style="color: #fbbf24; font-size: 16px; margin: 8px 0;">
            ${'⭐'.repeat(product.rating || 0)} ${product.rating ? `(${product.rating}/5)` : 'No rating'}
        </div>
        <div class="product-modal-price-container" id="price-${product.id}">
            ${product.originalPrice && product.originalPrice > product.price && product.discount > 0 ? `
                <div class="special-price-label" style="color: #27ae60; font-size: 14px; font-weight: 600; margin-bottom: 5px;">Special price</div>
                <div class="price-row" style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                    <span class="current-price" style="color: #27ae60; font-size: 24px; font-weight: 700;">₹${product.price}</span>
                    <span class="original-price" style="color: #999; font-size: 18px; text-decoration: line-through;">₹${product.originalPrice}</span>
                    <span class="discount-badge" style="background: #27ae60; color: white; padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: 600;">${product.discount}% off</span>
                </div>
            ` : `
                <div class="product-modal-price" style="color: #27ae60; font-size: 24px; font-weight: 700;">₹${product.price}</div>
            `}
        </div>
        <div class="description-container">
            <div class="description-text truncated" id="description-${product.id}">${product.description}</div>
            <button class="read-more-btn" id="readMoreBtn-${product.id}" onclick="toggleDescription('${product.id}')">Read More</button>
        </div>
        ${product.category ? `<p><strong>Category:</strong> ${product.category}</p>` : ''}
        ${product.deliveryCharge ? `<p style="color: #27ae60; font-weight: 600;">Delivery Charge: ₹${product.deliveryCharge}</p>` : ''}
        
        ${(product.sizes && product.sizes.length > 0) || (product.weightPricing && (product.weightPricing.ml.length > 0 || product.weightPricing.g.length > 0 || product.weightPricing.kg.length > 0)) ? `
        <div class="size-selection">
            <label><strong>Size/Quantity:</strong></label>
            <div class="size-buttons" id="size-buttons-${product.id}">
                ${product.sizes ? product.sizes.map(size => `
                    <button class="size-btn" data-size="${size}" onclick="selectSize('${product.id}', '${size}')">
                        ${size}
                    </button>
                `).join('') : ''}
                ${product.weightPricing ? [
                    ...product.weightPricing.ml.map(item => `
                        <button class="size-btn" data-size="ml-${item.quantity}" onclick="selectSize('${product.id}', 'ml-${item.quantity}')">
                            ${item.quantity} ml
                        </button>
                    `),
                    ...product.weightPricing.g.map(item => `
                        <button class="size-btn" data-size="g-${item.quantity}" onclick="selectSize('${product.id}', 'g-${item.quantity}')">
                            ${item.quantity} g
                        </button>
                    `),
                    ...product.weightPricing.kg.map(item => `
                        <button class="size-btn" data-size="kg-${item.quantity}" onclick="selectSize('${product.id}', 'kg-${item.quantity}')">
                            ${item.quantity} kg
                        </button>
                    `)
                ].join('') : ''}
            </div>
            <input type="hidden" id="selected-size-${product.id}" value="">
            
            <!-- Quantity controls inside size selection -->
            <div style="
                display: flex;
                align-items: center;
                gap: 12px;
                margin: 15px 0;
                padding: 12px;
                background: rgba(251, 191, 36, 0.1);
                border: 1px solid rgba(251, 191, 36, 0.3);
                border-radius: 8px;
                flex-wrap: wrap;
            ">
                <span style="
                    font-weight: 600;
                    color: #2c3e50;
                    font-size: 14px;
                ">Quantity:</span>
                <div style="
                    display: flex;
                    align-items: center;
                    gap: 10px;
                ">
                    <button onclick="changeModalQuantity('${product.id}', -1)" style="
                        width: 30px;
                        height: 30px;
                        border: 2px solid #fbbf24;
                        background: #fbbf24;
                        color: white;
                        border-radius: 50%;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-weight: bold;
                        font-size: 16px;
                        transition: all 0.3s ease;
                    " onmouseover="this.style.background='#f59e0b'; this.style.borderColor='#f59e0b';" onmouseout="this.style.background='#fbbf24'; this.style.borderColor='#fbbf24';">-</button>
                    <input type="number" id="modal-quantity-${product.id}" value="1" min="1" max="10" onchange="updateTotalPrice('${product.id}')" style="
                        width: 50px;
                        height: 30px;
                        font-size: 14px;
                        text-align: center;
                        border: 2px solid #fbbf24;
                        border-radius: 6px;
                        padding: 0 5px;
                    ">
                    <button onclick="changeModalQuantity('${product.id}', 1)" style="
                        width: 30px;
                        height: 30px;
                        border: 2px solid #fbbf24;
                        background: #fbbf24;
                        color: white;
                        border-radius: 50%;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-weight: bold;
                        font-size: 16px;
                        transition: all 0.3s ease;
                    " onmouseover="this.style.background='#f59e0b'; this.style.borderColor='#f59e0b';" onmouseout="this.style.background='#fbbf24'; this.style.borderColor='#fbbf24';">+</button>
                </div>
            </div>
        </div>
        ` : ''}
        
        <!-- Quantity controls for products without sizes -->
        ${!(product.sizes && product.sizes.length > 0) && !(product.weightPricing && (product.weightPricing.ml.length > 0 || product.weightPricing.g.length > 0 || product.weightPricing.kg.length > 0)) ? `
        <div style="
            display: flex;
            align-items: center;
            gap: 12px;
            margin: 15px 0;
            padding: 12px;
            background: rgba(251, 191, 36, 0.1);
            border: 1px solid rgba(251, 191, 36, 0.3);
            border-radius: 8px;
            flex-wrap: wrap;
        ">
            <span style="
                font-weight: 600;
                color: #2c3e50;
                font-size: 14px;
            ">Quantity:</span>
            <div style="
                display: flex;
                align-items: center;
                gap: 10px;
            ">
                <button onclick="changeModalQuantity('${product.id}', -1)" style="
                    width: 30px;
                    height: 30px;
                    border: 2px solid #fbbf24;
                    background: #fbbf24;
                    color: white;
                    border-radius: 50%;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    font-size: 16px;
                    transition: all 0.3s ease;
                " onmouseover="this.style.background='#f59e0b'; this.style.borderColor='#f59e0b';" onmouseout="this.style.background='#fbbf24'; this.style.borderColor='#fbbf24';">-</button>
                <input type="number" id="modal-quantity-${product.id}" value="1" min="1" max="10" onchange="updateTotalPrice('${product.id}')" style="
                    width: 50px;
                    height: 30px;
                    font-size: 14px;
                    text-align: center;
                    border: 2px solid #fbbf24;
                    border-radius: 6px;
                    padding: 0 5px;
                ">
                <button onclick="changeModalQuantity('${product.id}', 1)" style="
                    width: 30px;
                    height: 30px;
                    border: 2px solid #fbbf24;
                    background: #fbbf24;
                    color: white;
                    border-radius: 50%;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    font-size: 16px;
                    transition: all 0.3s ease;
                " onmouseover="this.style.background='#f59e0b'; this.style.borderColor='#f59e0b';" onmouseout="this.style.background='#fbbf24'; this.style.borderColor='#fbbf24';">+</button>
            </div>
        </div>
        ` : ''}
        
        <!-- Total Amount Display -->
        <div id="total-amount-${product.id}" style="margin: 15px 0; padding: 12px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #27ae60;">
            <div style="font-size: 14px; color: #666; margin-bottom: 4px;">Total Amount:</div>
            <div id="total-price-display-${product.id}">
                ${product.originalPrice && product.originalPrice > product.price && product.discount > 0 ? `
                    <div style="font-size: 10px; color: #27ae60; font-weight: 600; margin-bottom: 4px;">Special Price</div>
                    <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                        <span style="color: #27ae60; font-size: 20px; font-weight: 700;" id="total-price-${product.id}">₹${product.price}</span>
                        <span style="color: #999; font-size: 16px; text-decoration: line-through;" id="total-original-${product.id}">₹${product.originalPrice}</span>
                        <span style="background: #27ae60; color: white; padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: 600;" id="total-discount-${product.id}">${product.discount}% off</span>
                    </div>
                ` : `
                    <div style="font-size: 20px; font-weight: 700; color: #27ae60;" id="total-price-${product.id}">₹${product.price}</div>
                `}
            </div>
        </div>
        
        <div class="product-modal-buttons">
            <button class="btn-cart" id="cartBtn-${product.id}" onclick="addToCartWithQuantity('${product.id}')">Add to Cart</button>
            <button class="btn-order" onclick="handleOrderNow('${product.id}')">Order Now</button>
        </div>
        
        <div class="features-image-container" style="margin: 20px 0; text-align: center;">
            <img src="features.png" alt="Product Features" style="width: 100%; max-width: 600px; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        </div>
        
        <div class="related-products-section">
            <h4 class="related-products-title">Related Products</h4>
            <div class="related-products-scroll" id="relatedProducts-${product.id}">
                <!-- Related products will be populated here -->
            </div>
        </div>
        
        <div class="related-products-section">
            <h4 class="related-products-title">More Products You May Like</h4>
            <div class="related-products-scroll" id="relatedProducts2-${product.id}">
                <!-- Second related products will be populated here -->
            </div>
        </div>
        
        <div class="related-products-section">
            <h4 class="related-products-title">Recommended For You</h4>
            <div class="related-products-scroll" id="relatedProducts3-${product.id}">
                <!-- Third related products will be populated here -->
            </div>
        </div>
    `;
    
    modal.setAttribute('data-current-product-id', productId);
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    // Final scroll reset after modal is displayed
    setTimeout(() => {
        if (modal) modal.scrollTop = 0;
        if (modalContent) modalContent.scrollTop = 0;
        if (modalBody) modalBody.scrollTop = 0;
    }, 50);
    
    // Initialize total price display
    initializeTotalPrice(product.id);
    
    // Load related products
    loadRelatedProducts(product.id, product.category);
    loadRelatedProducts2(product.id, product.category);
    loadRelatedProducts3(product.id, product.category);
    
    // Update button state based on cart
    updateProductModalButtons(product.id);
};

// Function to update product modal content without adding to navigation stack
function updateProductModalContent(productId) {
    const product = productsData.find(p => p.id === productId);
    if (!product) return;
    
    const modal = document.getElementById('productModal');
    const modalBody = document.getElementById('productModalBody');
    const modalContent = modal ? modal.querySelector('.product-modal-content') : null;
    
    // Force scroll to top after content loads with delay
    setTimeout(() => {
        if (modal) modal.scrollTop = 0;
        if (modalContent) modalContent.scrollTop = 0;
        if (modalBody) modalBody.scrollTop = 0;
    }, 100);
    
    // Prepare all images (main + sub images)
    const allImages = [product.imageUrl];
    if (product.subImages && product.subImages.length > 0) {
        allImages.push(...product.subImages);
    }
    
    // Create enhanced image carousel with thumbnails
    let carouselHTML = '';
    if (allImages.length > 1) {
        // Multiple images - show carousel with thumbnails
        let slidesHTML = '';
        let thumbnailsHTML = '';
        
        allImages.forEach((imgUrl, index) => {
            slidesHTML += `
                <div class="carousel-slide" data-index="${index}">
                    <img src="${imgUrl}" alt="${product.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjhGOUZBIi8+CjxwYXRoIGQ9Ik03NSA3NUgxMjVWMTI1SDc1Vjc1WiIgZmlsbD0iI0RERERERCIvPgo8L3N2Zz4K'">
                </div>
            `;
            
            thumbnailsHTML += `
                <div class="thumbnail ${index === 0 ? 'active' : ''}" onclick="goToSlide('${product.id}', ${index})">
                    <img src="${imgUrl}" alt="${product.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjhGOUZBIi8+CjxwYXRoIGQ9Ik03NSA3NUgxMjVWMTI1SDc1Vjc1WiIgZmlsbD0iI0RERERERCIvPgo8L3N2Zz4K'">
                </div>
            `;
        });
        
        carouselHTML = `
            <div class="image-carousel-container">
                <div class="image-carousel" id="imageCarousel-${product.id}">
                    <div class="carousel-images" id="carouselImages-${product.id}">
                        ${slidesHTML}
                    </div>
                    <button class="carousel-nav prev" onclick="navigateCarousel('${product.id}', -1)">‹</button>
                    <button class="carousel-nav next" onclick="navigateCarousel('${product.id}', 1)">›</button>
                </div>
                <div class="thumbnail-strip" id="thumbnailStrip-${product.id}">
                    ${thumbnailsHTML}
                </div>
            </div>
        `;
    } else {
        // Single image - show normally
        carouselHTML = `<img src="${product.imageUrl}" alt="${product.name}" class="product-modal-image" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjhGOUZBIi8+CjxwYXRoIGQ9Ik03NSA3NUgxMjVWMTI1SDc1Vjc1WiIgZmlsbD0iI0RERERERCIvPgo8L3N2Zz4K'">`;
    }
    
    modalBody.innerHTML = `
        ${carouselHTML}
        <h3 class="product-modal-name">${product.name}</h3>
        <div class="product-rating" style="color: #fbbf24; font-size: 16px; margin: 8px 0;">
            ${'⭐'.repeat(product.rating || 0)} ${product.rating ? `(${product.rating}/5)` : 'No rating'}
        </div>
        <div class="product-modal-price-container" id="price-${product.id}">
            ${product.originalPrice && product.originalPrice > product.price && product.discount > 0 ? `
                <div class="special-price-label" style="color: #27ae60; font-size: 14px; font-weight: 600; margin-bottom: 5px;">Special price</div>
                <div class="price-row" style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                    <span class="current-price" style="color: #27ae60; font-size: 24px; font-weight: 700;">₹${product.price}</span>
                    <span class="original-price" style="color: #999; font-size: 18px; text-decoration: line-through;">₹${product.originalPrice}</span>
                    <span class="discount-badge" style="background: #27ae60; color: white; padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: 600;">${product.discount}% off</span>
                </div>
            ` : `
                <div class="product-modal-price" style="color: #27ae60; font-size: 24px; font-weight: 700;">₹${product.price}</div>
            `}
        </div>
        <div class="description-container">
            <div class="description-text truncated" id="description-${product.id}">${product.description}</div>
            <button class="read-more-btn" id="readMoreBtn-${product.id}" onclick="toggleDescription('${product.id}')">Read More</button>
        </div>
        ${product.category ? `<p><strong>Category:</strong> ${product.category}</p>` : ''}
        
        ${((product.sizes && product.sizes.length > 0) || (product.weightPricing && (product.weightPricing.ml?.length > 0 || product.weightPricing.g?.length > 0 || product.weightPricing.kg?.length > 0))) ? `
            <div class="size-selection">
                <label for="size-${product.id}"><strong>Size:</strong></label>
                <div class="size-buttons" id="sizeButtons-${product.id}">
                    ${product.sizes ? product.sizes.map(size => `
                        <button class="size-btn" onclick="selectSize('${product.id}', '${size}')" data-size="${size}">${size}</button>
                    `).join('') : ''}
                    ${product.weightPricing && (product.weightPricing.ml?.length > 0 || product.weightPricing.g?.length > 0 || product.weightPricing.kg?.length > 0) ? `
                        ${product.weightPricing.ml?.map(option => `
                            <button class="size-btn" onclick="selectSize('${product.id}', '${option.quantity}ml')" data-size="${option.quantity}ml">${option.quantity}ml</button>
                        `).join('') || ''}
                        ${product.weightPricing.g?.map(option => `
                            <button class="size-btn" onclick="selectSize('${product.id}', '${option.quantity}g')" data-size="${option.quantity}g">${option.quantity}g</button>
                        `).join('') || ''}
                        ${product.weightPricing.kg?.map(option => `
                            <button class="size-btn" onclick="selectSize('${product.id}', '${option.quantity}kg')" data-size="${option.quantity}kg">${option.quantity}kg</button>
                        `).join('') || ''}
                    ` : ''}
                </div>
                <input type="hidden" id="selected-size-${product.id}" value="">
            </div>
        ` : ''}
        
        <div class="total-amount-section" id="totalSection-${product.id}">
            <div style="font-size: 18px; font-weight: 600; color: #2c3e50; margin: 15px 0 5px 0;">Total Amount</div>
            ${product.originalPrice && product.originalPrice > product.price && product.discount > 0 ? `
                <div style="font-size: 20px; font-weight: 700; color: #27ae60;" id="total-price-${product.id}">₹${product.price}</div>
            ` : `
                <div style="font-size: 20px; font-weight: 700; color: #27ae60;" id="total-price-${product.id}">₹${product.price}</div>
            `}
        </div>
        
        <div class="product-modal-buttons">
            <button class="btn-cart" id="cartBtn-${product.id}" onclick="addToCartWithQuantity('${product.id}')">Add to Cart</button>
            <button class="btn-order" onclick="handleOrderNow('${product.id}')">Order Now</button>
        </div>
        
        <div class="features-image-container" style="margin: 20px 0; text-align: center;">
            <img src="features.png" alt="Product Features" style="width: 100%; max-width: 600px; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        </div>
        
        <div class="related-products-section">
            <h4 class="related-products-title">Related Products</h4>
            <div class="related-products-scroll" id="relatedProducts-${product.id}">
                <!-- Related products will be populated here -->
            </div>
        </div>
        
        <div class="related-products-section">
            <h4 class="related-products-title">More Products You May Like</h4>
            <div class="related-products-scroll" id="relatedProducts2-${product.id}">
                <!-- Second related products will be populated here -->
            </div>
        </div>
        
        <div class="related-products-section">
            <h4 class="related-products-title">Recommended For You</h4>
            <div class="related-products-scroll" id="relatedProducts3-${product.id}">
                <!-- Third related products will be populated here -->
            </div>
        </div>
    `;
    
    // Load related products
    loadRelatedProducts(product.id, product.category);
    loadRelatedProducts2(product.id, product.category);
    loadRelatedProducts3(product.id, product.category);
    
    // Update button state based on cart
    updateProductModalButtons(product.id);
    
    // Initialize total price display
    initializeTotalPrice(product.id);
}

// Open product modal from related products (with navigation stack)
window.openProductModalFromRelated = function(productId) {
    const product = productsData.find(p => p.id === productId);
    if (!product) return;
    
    // Show cart floating box when opening product modal from related products
    const floatingNotification = document.getElementById('floatingCartNotification');
    if (floatingNotification && cartItems.length > 0) {
        floatingNotification.classList.remove('hide');
        floatingNotification.classList.add('show');
    }
    
    // Always add to navigation stack for product-to-product navigation
    // This allows users to go back through all opened products one by one
    pushToNavigationStack('product-modal', { productId: productId });
    
    const modal = document.getElementById('productModal');
    const modalBody = document.getElementById('productModalBody');
    const modalContent = modal ? modal.querySelector('.product-modal-content') : null;
    
    // Force scroll to top after content loads with delay
    setTimeout(() => {
        if (modal) modal.scrollTop = 0;
        if (modalContent) modalContent.scrollTop = 0;
        if (modalBody) modalBody.scrollTop = 0;
    }, 100);
    
    // Prepare all images (main + sub images)
    const allImages = [product.imageUrl];
    if (product.subImages && product.subImages.length > 0) {
        allImages.push(...product.subImages);
    }
    
    // Create enhanced image carousel with thumbnails
    let carouselHTML = '';
    if (allImages.length > 1) {
        // Multiple images - show carousel with thumbnails
        let slidesHTML = '';
        let thumbnailsHTML = '';
        
        allImages.forEach((imgUrl, index) => {
            slidesHTML += `
                <div class="carousel-slide" data-index="${index}">
                    <img src="${imgUrl}" alt="${product.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjhGOUZBIi8+CjxwYXRoIGQ9Ik03NSA3NUgxMjVWMTI1SDc1Vjc1WiIgZmlsbD0iI0RERERERCIvPgo8L3N2Zz4K'">
                </div>
            `;
            
            thumbnailsHTML += `
                <div class="thumbnail ${index === 0 ? 'active' : ''}" onclick="goToSlide('${product.id}', ${index})">
                    <img src="${imgUrl}" alt="${product.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi0vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjhGOUZBIi8+CjxwYXRoIGQ9Ik03NSA3NUgxMjVWMTI1SDc1Vjc1WiIgZmlsbD0iI0RERERERCIvPgo8L3N2Zz4K'">
                </div>
            `;
        });
        
        carouselHTML = `
            <div class="image-carousel-container">
                <div class="image-carousel" id="imageCarousel-${product.id}">
                    <div class="carousel-images" id="carouselImages-${product.id}">
                        ${slidesHTML}
                    </div>
                    <button class="carousel-nav prev" onclick="navigateCarousel('${product.id}', -1)">‹</button>
                    <button class="carousel-nav next" onclick="navigateCarousel('${product.id}', 1)">›</button>
                </div>
                <div class="thumbnail-strip" id="thumbnailStrip-${product.id}">
                    ${thumbnailsHTML}
                </div>
            </div>
        `;
    } else {
        // Single image - show normally
        carouselHTML = `<img src="${product.imageUrl}" alt="${product.name}" class="product-modal-image" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjhGOUZBIi8+CjxwYXRoIGQ9Ik03NSA3NUgxMjVWMTI1SDc1Vjc1WiIgZmlsbD0iI0RERERERCIvPgo8L3N2Zz4K'">`;
    }
    
    modalBody.innerHTML = `
        ${carouselHTML}
        <h3 class="product-modal-name">${product.name}</h3>
        <div class="product-rating" style="color: #fbbf24; font-size: 16px; margin: 8px 0;">
            ${'⭐'.repeat(product.rating || 0)} ${product.rating ? `(${product.rating}/5)` : 'No rating'}
        </div>
        <div class="product-modal-price-container" id="price-${product.id}">
            ${product.originalPrice && product.originalPrice > product.price && product.discount > 0 ? `
                <div class="special-price-label" style="color: #27ae60; font-size: 14px; font-weight: 600; margin-bottom: 5px;">Special price</div>
                <div class="price-row" style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                    <span class="current-price" style="color: #27ae60; font-size: 24px; font-weight: 700;">₹${product.price}</span>
                    <span class="original-price" style="color: #999; font-size: 18px; text-decoration: line-through;">₹${product.originalPrice}</span>
                    <span class="discount-badge" style="background: #27ae60; color: white; padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: 600;">${product.discount}% off</span>
                </div>
            ` : `
                <div class="product-modal-price" style="color: #27ae60; font-size: 24px; font-weight: 700;">₹${product.price}</div>
            `}
        </div>
        <div class="description-container">
            <div class="description-text truncated" id="description-${product.id}">${product.description}</div>
            <button class="read-more-btn" id="readMoreBtn-${product.id}" onclick="toggleDescription('${product.id}')">Read More</button>
        </div>
        ${product.category ? `<p><strong>Category:</strong> ${product.category}</p>` : ''}
        
        ${((product.sizes && product.sizes.length > 0) || (product.weightPricing && (product.weightPricing.ml?.length > 0 || product.weightPricing.g?.length > 0 || product.weightPricing.kg?.length > 0))) ? `
            <div class="size-selection">
                <label for="size-${product.id}"><strong>Size:</strong></label>
                <div class="size-buttons" id="sizeButtons-${product.id}">
                    ${product.sizes ? product.sizes.map(size => `
                        <button class="size-btn" onclick="selectSize('${product.id}', '${size}')" data-size="${size}">${size}</button>
                    `).join('') : ''}
                    ${product.weightPricing && (product.weightPricing.ml?.length > 0 || product.weightPricing.g?.length > 0 || product.weightPricing.kg?.length > 0) ? `
                        ${product.weightPricing.ml?.map(option => `
                            <button class="size-btn" onclick="selectSize('${product.id}', '${option.quantity}ml')" data-size="${option.quantity}ml">${option.quantity}ml</button>
                        `).join('') || ''}
                        ${product.weightPricing.g?.map(option => `
                            <button class="size-btn" onclick="selectSize('${product.id}', '${option.quantity}g')" data-size="${option.quantity}g">${option.quantity}g</button>
                        `).join('') || ''}
                        ${product.weightPricing.kg?.map(option => `
                            <button class="size-btn" onclick="selectSize('${product.id}', '${option.quantity}kg')" data-size="${option.quantity}kg">${option.quantity}kg</button>
                        `).join('') || ''}
                    ` : ''}
                </div>
                <input type="hidden" id="selected-size-${product.id}" value="">
            </div>
        ` : ''}
        
        <div class="total-amount-section" id="totalSection-${product.id}">
            <div style="font-size: 18px; font-weight: 600; color: #2c3e50; margin: 15px 0 5px 0;">Total Amount</div>
            ${product.originalPrice && product.originalPrice > product.price && product.discount > 0 ? `
                <div style="font-size: 20px; font-weight: 700; color: #27ae60;" id="total-price-${product.id}">₹${product.price}</div>
            ` : `
                <div style="font-size: 20px; font-weight: 700; color: #27ae60;" id="total-price-${product.id}">₹${product.price}</div>
            `}
        </div>
        
        <div class="product-modal-buttons">
            <button class="btn-cart" id="cartBtn-${product.id}" onclick="addToCartWithQuantity('${product.id}')">Add to Cart</button>
            <button class="btn-order" onclick="handleOrderNow('${product.id}')">Order Now</button>
        </div>
        
        <div class="features-image-container" style="margin: 20px 0; text-align: center;">
            <img src="features.png" alt="Product Features" style="width: 100%; max-width: 600px; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        </div>
        
        <div class="related-products-section">
            <h4 class="related-products-title">Related Products</h4>
            <div class="related-products-scroll" id="relatedProducts-${product.id}">
                <!-- Related products will be populated here -->
            </div>
        </div>
        
        <div class="related-products-section">
            <h4 class="related-products-title">More Products You May Like</h4>
            <div class="related-products-scroll" id="relatedProducts2-${product.id}">
                <!-- Second related products will be populated here -->
            </div>
        </div>
        
        <div class="related-products-section">
            <h4 class="related-products-title">Recommended For You</h4>
            <div class="related-products-scroll" id="relatedProducts3-${product.id}">
                <!-- Third related products will be populated here -->
            </div>
        </div>
    `;
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    // Final scroll reset after modal is displayed
    setTimeout(() => {
        if (modal) modal.scrollTop = 0;
        if (modalContent) modalContent.scrollTop = 0;
        if (modalBody) modalBody.scrollTop = 0;
    }, 50);
    
    // Load related products
    loadRelatedProducts(product.id, product.category);
    loadRelatedProducts2(product.id, product.category);
    loadRelatedProducts3(product.id, product.category);
    
    // Update button state based on cart
    updateProductModalButtons(product.id);
    
    // Initialize total price display
    initializeTotalPrice(product.id);
};

// Open product modal from cart (without Add to Cart button)
window.openProductModalFromCart = function(productId) {
    const product = productsData.find(p => p.id === productId);
    if (!product) return;
    
    // Keep cart floating box visible when opening product modal from cart
    const floatingNotification = document.getElementById('floatingCartNotification');
    if (floatingNotification && cartItems.length > 0) {
        floatingNotification.classList.remove('hide');
        floatingNotification.classList.add('show');
    }
    
    // Add to navigation stack
    pushToNavigationStack('product-modal', { productId: productId });
    
    // Find the cart item to get its quantity, size, and pricing info
    const cartItem = cartItems.find(item => item.id === productId);
    const quantity = cartItem ? cartItem.quantity : 1;
    const size = cartItem ? cartItem.selectedSize : '';
    const originalPrice = cartItem ? (cartItem.originalPrice || cartItem.price) : product.price;
    const currentPrice = cartItem ? cartItem.price : product.price;
    const discount = cartItem ? (cartItem.discount || 0) : (product.discount || 0);
    
    const modal = document.getElementById('productModal');
    const modalBody = document.getElementById('productModalBody');
    const modalContent = modal ? modal.querySelector('.product-modal-content') : null;
    
    // Force scroll to top after content loads with delay
    setTimeout(() => {
        if (modal) modal.scrollTop = 0;
        if (modalContent) modalContent.scrollTop = 0;
        if (modalBody) modalBody.scrollTop = 0;
    }, 100);
    
    let deliveryCharge = product.deliveryCharge || 0;
    
    // Calculate totals with discount applied
    const subtotal = Math.round((currentPrice * quantity) * 100) / 100;
    const originalSubtotal = Math.round((originalPrice * quantity) * 100) / 100;
    const totalAmount = Math.round((subtotal + deliveryCharge) * 100) / 100;
    const savings = Math.round((originalSubtotal - subtotal) * 100) / 100;
    
    // Prepare all images (main + sub images)
    const allImages = [product.imageUrl];
    if (product.subImages && product.subImages.length > 0) {
        allImages.push(...product.subImages);
    }
    
    // Create enhanced image carousel with thumbnails (same as regular product modal)
    let carouselHTML = '';
    if (allImages.length > 1) {
        // Multiple images - show carousel with thumbnails
        let slidesHTML = '';
        let thumbnailsHTML = '';
        
        allImages.forEach((imgUrl, index) => {
            slidesHTML += `
                <div class="carousel-slide" data-index="${index}">
                    <img src="${imgUrl}" alt="${product.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjhGOUZBIi8+CjxwYXRoIGQ9Ik03NSA3NUgxMjVWMTI1SDc1Vjc1WiIgZmlsbD0iI0RERERERCIvPgo8L3N2Zz4K'">
                </div>
            `;
            
            thumbnailsHTML += `
                <div class="thumbnail ${index === 0 ? 'active' : ''}" onclick="goToSlide('${product.id}', ${index})">
                    <img src="${imgUrl}" alt="${product.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjhGOUZBIi8+CjxwYXRoIGQ9Ik03NSA3NUgxMjVWMTI1SDc1Vjc1WiIgZmlsbD0iI0RERERERCIvPgo8L3N2Zz4K'">
                </div>
            `;
        });
        
        carouselHTML = `
            <div class="image-carousel-container">
                <div class="image-carousel" id="imageCarousel-${product.id}">
                    <div class="carousel-images" id="carouselImages-${product.id}">
                        ${slidesHTML}
                    </div>
                    <button class="carousel-nav prev" onclick="navigateCarousel('${product.id}', -1)">‹</button>
                    <button class="carousel-nav next" onclick="navigateCarousel('${product.id}', 1)">›</button>
                </div>
                <div class="thumbnail-strip" id="thumbnailStrip-${product.id}">
                    ${thumbnailsHTML}
                </div>
            </div>
        `;
    } else {
        // Single image - show normally
        carouselHTML = `<img src="${product.imageUrl}" alt="${product.name}" class="product-modal-image" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjhGOUZBIi8+CjxwYXRoIGQ9Ik03NSA3NUgxMjVWMTI1SDc1Vjc1WiIgZmlsbD0iI0RERERERCIvPgo8L3N2Zz4K'">`;
    }
    
    modalBody.innerHTML = `
        ${carouselHTML}
        <h3 class="product-modal-name">${product.name}</h3>
        <div class="product-rating" style="color: #fbbf24; font-size: 16px; margin: 8px 0;">
            ${'⭐'.repeat(product.rating || 0)} ${product.rating ? `(${product.rating}/5)` : 'No rating'}
        </div>
        <div class="description-container">
            <div class="description-text truncated" id="description-${product.id}">${product.description}</div>
            <button class="read-more-btn" id="readMoreBtn-${product.id}" onclick="toggleDescription('${product.id}')">Read More</button>
        </div>
        ${product.category ? `<p><strong>Category:</strong> ${product.category}</p>` : ''}
        
        <!-- Cart Item Details -->
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #27ae60;">
            <h4 style="color: #2c3e50; margin-bottom: 12px; font-size: 16px;">Cart Item Details</h4>
            ${size ? `<p style="margin: 5px 0;"><strong>Selected Size:</strong> ${size}</p>` : ''}
            <p style="margin: 5px 0;"><strong>Quantity:</strong> ${quantity}</p>
            
            <!-- Pricing Information -->
            ${originalPrice > currentPrice && discount > 0 ? `
                <div style="margin: 10px 0; padding: 12px; background: white; border-radius: 6px; border: 1px solid #e0e0e0;">
                    <div style="font-size: 14px; color: #27ae60; font-weight: 600; margin-bottom: 8px;">🎉 Special Price Applied!</div>
                    <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 8px;">
                        <span style="color: #27ae60; font-size: 18px; font-weight: 700;">₹${currentPrice}</span>
                        <span style="color: #999; font-size: 16px; text-decoration: line-through;">₹${originalPrice}</span>
                        <span style="background: #27ae60; color: white; padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: 600;">${discount}% off</span>
                    </div>
                    <div style="color: #666; font-size: 13px;">Unit price after discount</div>
                </div>
                
                <!-- Calculation Breakdown -->
                <div style="margin: 10px 0; font-size: 14px;">
                    <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                        <span>Subtotal (${quantity} × ₹${currentPrice}):</span>
                        <span style="font-weight: 600;">₹${subtotal.toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin: 5px 0; color: #999; font-size: 10px;">
                        <span>Original subtotal (${quantity} × ₹${originalPrice}):</span>
                        <span style="text-decoration: line-through;">₹${originalSubtotal.toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin: 8px 0; color: #27ae60; font-weight: 600; border-top: 1px solid #e0e0e0; padding-top: 8px;">
                        <span>💰 You Save:</span>
                        <span>₹${savings.toFixed(2)}</span>
                    </div>
                </div>
            ` : `
                <div style="margin: 10px 0; padding: 12px; background: white; border-radius: 6px; border: 1px solid #e0e0e0;">
                    <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                        <span>Unit Price:</span>
                        <span style="font-weight: 600; color: #27ae60;">₹${currentPrice}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                        <span>Subtotal (${quantity} items):</span>
                        <span style="font-weight: 600;">₹${subtotal.toFixed(2)}</span>
                    </div>
                </div>
            `}
            
            ${deliveryCharge > 0 ? `
                <div style="display: flex; justify-content: space-between; margin: 8px 0; padding: 8px 0; border-top: 1px solid #e0e0e0;">
                    <span style="color: #27ae60; font-weight: 600;">🚚 Delivery Charge:</span>
                    <span style="color: #27ae60; font-weight: 600;">₹${deliveryCharge}</span>
                </div>
            ` : `
                <div style="display: flex; justify-content: space-between; margin: 8px 0; padding: 8px 0; border-top: 1px solid #e0e0e0;">
                    <span style="color: #27ae60; font-weight: 600;">🎁 Delivery:</span>
                    <span style="color: #27ae60; font-weight: 600;">FREE</span>
                </div>
            `}
            
            <div style="display: flex; justify-content: space-between; margin: 12px 0; padding: 12px 0; border-top: 2px solid #27ae60; font-size: 18px; font-weight: 700; color: #27ae60;">
                <span>Total Amount:</span>
                <span>₹${totalAmount.toFixed(2)}</span>
            </div>
        </div>
        
        <div class="product-modal-buttons">
            <button class="btn-order" onclick="handleOrderNowFromCart('${product.id}', '${size}', ${quantity})" style="background: #fbbf24; color: #000; font-weight: 600;">Order Now</button>
        </div>
        
        <div class="features-image-container" style="margin: 20px 0; text-align: center;">
            <img src="features.png" alt="Product Features" style="width: 100%; max-width: 600px; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        </div>
        
        <div class="related-products-section">
            <h4 class="related-products-title">Related Products</h4>
            <div class="related-products-scroll" id="relatedProducts-${product.id}">
                <!-- Related products will be populated here -->
            </div>
        </div>
        
        <div class="related-products-section">
            <h4 class="related-products-title">More Products You May Like</h4>
            <div class="related-products-scroll" id="relatedProducts2-${product.id}">
                <!-- Second related products will be populated here -->
            </div>
        </div>
        
        <div class="related-products-section">
            <h4 class="related-products-title">Recommended For You</h4>
            <div class="related-products-scroll" id="relatedProducts3-${product.id}">
                <!-- Third related products will be populated here -->
            </div>
        </div>
    `;
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    // Final scroll reset after modal is displayed
    setTimeout(() => {
        if (modal) modal.scrollTop = 0;
        if (modalContent) modalContent.scrollTop = 0;
        if (modalBody) modalBody.scrollTop = 0;
    }, 50);
    
    // Load related products
    loadRelatedProducts(product.id, product.category);
    loadRelatedProducts2(product.id, product.category);
    loadRelatedProducts3(product.id, product.category);
};

// Track modal navigation context
let modalContext = null; // 'category' if opened from category modal, null otherwise

window.closeProductModal = function() {
    if (modalContext === 'category') {
        // If opened from category modal, just close product modal and keep category modal open
        closeProductModalInternal();
        modalContext = null; // Reset context
    } else {
        // Normal close behavior - close everything
        closeProductModalInternal();
    }
};

window.closeCategoryModal = function() {
    closeCategoryModalInternal();
    modalContext = null; // Reset context when category modal is closed
};

// Function to open product modal from category modal
window.openProductModalFromCategory = function(productId) {
    modalContext = 'category'; // Set context to track that it was opened from category
    openProductModal(productId); // Use the existing openProductModal function
};

// Load related products for product modal (SAME CATEGORY ONLY)
window.loadRelatedProducts = function(currentProductId, currentCategory) {
    const relatedContainer = document.getElementById(`relatedProducts-${currentProductId}`);
    if (!relatedContainer) return;

    // Store current scroll positions for all related product rows
    const scrollPositions = {};
    const existingRows = relatedContainer.querySelectorAll('.related-products-row');
    existingRows.forEach((row, index) => {
        scrollPositions[index] = row.scrollLeft;
    });

    // Get products from SAME CATEGORY ONLY (excluding current product)
    let relatedProducts = productsData.filter(product => 
        product.id !== currentProductId && 
        product.category === currentCategory
    );

    // If not enough products from same category, fill with random same category products (shuffled)
    if (relatedProducts.length < 16) {
        const shuffled = relatedProducts.sort(() => 0.5 - Math.random());
        // Repeat products if needed to fill 16 slots
        while (relatedProducts.length < 16 && relatedProducts.length > 0) {
            relatedProducts = [...relatedProducts, ...shuffled].slice(0, 16);
        }
    } else {
        relatedProducts = relatedProducts.sort(() => 0.5 - Math.random()).slice(0, 16);
    }

    // Split into two rows of 8 products each
    const firstRow = relatedProducts.slice(0, 8);
    const secondRow = relatedProducts.slice(8, 16);

    // Generate HTML for a single product card
    const generateProductCard = (product) => `
        <div class="related-product-card" data-product-id='${product.id}' onclick="openProductModalFromRelated('${product.id}')">
            <div class="related-product-image-container">
                <img src="${product.imageUrl}" alt="${product.name}" class="related-product-image" 
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjhGOUZBIi8+CjxwYXRoIGQ9Ik03NSA3NUgxMjVWMTI1SDc1Vjc1WiIgZmlsbD0iI0RERERERCIvPgo8L3N2Zz4K'">
                <button class="related-product-heart-icon" onclick="event.stopPropagation(); openProductModal('${product.id}')">❤️</button>
                ${getAddButtonHTML(product.id, true)}
            </div>
            ${(product.sizes && product.sizes.length > 0) || (product.weightPricing && (product.weightPricing.ml?.length > 0 || product.weightPricing.g?.length > 0 || product.weightPricing.kg?.length > 0)) ? `<div class="product-sizes" style="margin-bottom: 4px; display: flex; align-items: center; gap: 2px; flex-wrap: wrap;"><img src="mark.png" alt="Size" style="width: 14px; height: 14px; object-fit: contain;">${product.sizes ? product.sizes.map(size => `<span class="size-badge" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1px 4px; border-radius: 8px; font-size: 8px; font-weight: 600; display: inline-block;">${size}</span>`).join('') : ''}${product.weightPricing ? [product.weightPricing.ml?.map(option => `<span class="size-badge" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1px 4px; border-radius: 8px; font-size: 8px; font-weight: 600; display: inline-block;">${option.quantity}ml</span>`).join('') || '', product.weightPricing.g?.map(option => `<span class="size-badge" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1px 4px; border-radius: 8px; font-size: 8px; font-weight: 600; display: inline-block;">${option.quantity}g</span>`).join('') || '', product.weightPricing.kg?.map(option => `<span class="size-badge" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1px 4px; border-radius: 8px; font-size: 8px; font-weight: 600; display: inline-block;">${option.quantity}kg</span>`).join('') || ''].join('') : ''}</div>` : ''}
            <div class="related-product-name">${product.name}</div>
            <div class="related-product-rating">
                ${'⭐'.repeat(product.rating || 0)} ${product.rating ? `(${product.rating})` : ''}
            </div>
            ${(product.originalPrice && product.originalPrice > product.price && product.discount > 0) ? `
                <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                    <span class="related-product-original-price">₹${product.originalPrice}</span>
                    <span class="related-product-price">₹${product.price}</span>
                    <span class="related-product-discount">${product.discount}% off</span>
                </div>
            ` : `
                <div class="related-product-price">₹${product.price}</div>
            `}
        </div>
    `;

    // Generate HTML for both rows
    const relatedHTML = `
        <div class="related-products-row">
            ${firstRow.map(generateProductCard).join('')}
        </div>
        <div class="related-products-row">
            ${secondRow.map(generateProductCard).join('')}
        </div>
    `;

    relatedContainer.innerHTML = relatedHTML;

    // Restore scroll positions after a brief delay
    setTimeout(() => {
        const newRows = relatedContainer.querySelectorAll('.related-products-row');
        newRows.forEach((row, index) => {
            if (scrollPositions[index] !== undefined) {
                row.scrollLeft = scrollPositions[index];
            }
        });
    }, 50);
};

// Load second related products section for product modal (DIFFERENT CATEGORIES ONLY)
window.loadRelatedProducts2 = function(currentProductId, currentCategory) {
    const relatedContainer = document.getElementById(`relatedProducts2-${currentProductId}`);
    if (!relatedContainer) return;

    // Store current scroll positions for all related product rows
    const scrollPositions = {};
    const existingRows = relatedContainer.querySelectorAll('.related-products-row');
    existingRows.forEach((row, index) => {
        scrollPositions[index] = row.scrollLeft;
    });

    // Get products from DIFFERENT CATEGORIES ONLY (excluding current product)
    let relatedProducts = productsData.filter(product => 
        product.id !== currentProductId && 
        product.category !== currentCategory
    );

    // Shuffle and take 6 products from different categories
    relatedProducts = relatedProducts.sort(() => 0.5 - Math.random()).slice(0, 6);
    
    // If not enough different category products, fill remaining with random products
    if (relatedProducts.length < 6) {
        const allOtherProducts = productsData.filter(product => product.id !== currentProductId);
        const shuffled = allOtherProducts.sort(() => 0.5 - Math.random());
        relatedProducts = [...relatedProducts, ...shuffled].slice(0, 6);
    }

    // Split into two rows of 3 products each
    const firstRow = relatedProducts.slice(0, 3);
    const secondRow = relatedProducts.slice(3, 6);

    // Generate HTML for a single product card
    const generateProductCard = (product) => `
        <div class="related-product-card" data-product-id='${product.id}' onclick="openProductModalFromRelated('${product.id}')">
            <div class="related-product-image-container">
                <img src="${product.imageUrl}" alt="${product.name}" class="related-product-image" 
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjhGOUZBIi8+CjxwYXRoIGQ9Ik03NSA3NUgxMjVWMTI1SDc1Vjc1WiIgZmlsbD0iI0RERERERCIvPgo8L3N2Zz4K'">
                <button class="related-product-heart-icon" onclick="event.stopPropagation(); openProductModal('${product.id}')">❤️</button>
                ${getAddButtonHTML(product.id, true)}
            </div>
            ${(product.sizes && product.sizes.length > 0) || (product.weightPricing && (product.weightPricing.ml?.length > 0 || product.weightPricing.g?.length > 0 || product.weightPricing.kg?.length > 0)) ? `<div class="product-sizes" style="margin-bottom: 4px; display: flex; align-items: center; gap: 2px; flex-wrap: wrap;"><img src="mark.png" alt="Size" style="width: 14px; height: 14px; object-fit: contain;">${product.sizes ? product.sizes.map(size => `<span class="size-badge" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1px 4px; border-radius: 8px; font-size: 8px; font-weight: 600; display: inline-block;">${size}</span>`).join('') : ''}${product.weightPricing ? [product.weightPricing.ml?.map(option => `<span class="size-badge" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1px 4px; border-radius: 8px; font-size: 8px; font-weight: 600; display: inline-block;">${option.quantity}ml</span>`).join('') || '', product.weightPricing.g?.map(option => `<span class="size-badge" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1px 4px; border-radius: 8px; font-size: 8px; font-weight: 600; display: inline-block;">${option.quantity}g</span>`).join('') || '', product.weightPricing.kg?.map(option => `<span class="size-badge" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1px 4px; border-radius: 8px; font-size: 8px; font-weight: 600; display: inline-block;">${option.quantity}kg</span>`).join('') || ''].join('') : ''}</div>` : ''}
            <div class="related-product-name">${product.name}</div>
            <div class="related-product-rating">
                ${'⭐'.repeat(product.rating || 0)} ${product.rating ? `(${product.rating})` : ''}
            </div>
            ${(product.originalPrice && product.originalPrice > product.price && product.discount > 0) ? `
                <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                    <span class="related-product-original-price">₹${product.originalPrice}</span>
                    <span class="related-product-price">₹${product.price}</span>
                    <span class="related-product-discount">${product.discount}% off</span>
                </div>
            ` : `
                <div class="related-product-price">₹${product.price}</div>
            `}
        </div>
    `;

    // Generate HTML for both rows
    const relatedHTML = `
        <div class="related-products-row-grid">
            ${firstRow.map(generateProductCard).join("")}
        </div>
        <div class="related-products-row-grid">
            ${secondRow.map(generateProductCard).join("")}
        </div>
    `;
    relatedContainer.innerHTML = relatedHTML;

    // Restore scroll positions after a brief delay
    setTimeout(() => {
        const newRows = relatedContainer.querySelectorAll('.related-products-row');
        newRows.forEach((row, index) => {
            if (scrollPositions[index] !== undefined) {
                row.scrollLeft = scrollPositions[index];
            }
        });
    }, 50);
};

// Load third related products section for product modal (RANDOM MIX OF ALL PRODUCTS)
window.loadRelatedProducts3 = function(currentProductId, currentCategory) {
    const relatedContainer = document.getElementById(`relatedProducts3-${currentProductId}`);
    if (!relatedContainer) return;

    // Store current scroll positions for all related product rows
    const scrollPositions = {};
    const existingRows = relatedContainer.querySelectorAll('.related-products-row');
    existingRows.forEach((row, index) => {
        scrollPositions[index] = row.scrollLeft;
    });

    // Get ALL products (excluding current product) and shuffle randomly
    let relatedProducts = productsData.filter(product => 
        product.id !== currentProductId
    );

    // Completely random shuffle of all products (mix of all categories)
    relatedProducts = relatedProducts.sort(() => 0.5 - Math.random()).slice(0, 16);

    // Split into two rows of 8 products each
    const firstRow = relatedProducts.slice(0, 8);
    const secondRow = relatedProducts.slice(8, 16);

    // Generate HTML for a single product card
    const generateProductCard = (product) => `
        <div class="related-product-card" data-product-id='${product.id}' onclick="openProductModalFromRelated('${product.id}')">
            <div class="related-product-image-container">
                <img src="${product.imageUrl}" alt="${product.name}" class="related-product-image" 
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjhGOUZBIi8+CjxwYXRoIGQ9Ik03NSA3NUgxMjVWMTI1SDc1Vjc1WiIgZmlsbD0iI0RERERERCIvPgo8L3N2Zz4K'">
                <button class="related-product-heart-icon" onclick="event.stopPropagation(); openProductModal('${product.id}')">❤️</button>
                ${getAddButtonHTML(product.id, true)}
            </div>
            ${(product.sizes && product.sizes.length > 0) || (product.weightPricing && (product.weightPricing.ml?.length > 0 || product.weightPricing.g?.length > 0 || product.weightPricing.kg?.length > 0)) ? `<div class="product-sizes" style="margin-bottom: 4px; display: flex; align-items: center; gap: 2px; flex-wrap: wrap;"><img src="mark.png" alt="Size" style="width: 14px; height: 14px; object-fit: contain;">${product.sizes ? product.sizes.map(size => `<span class="size-badge" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1px 4px; border-radius: 8px; font-size: 8px; font-weight: 600; display: inline-block;">${size}</span>`).join('') : ''}${product.weightPricing ? [product.weightPricing.ml?.map(option => `<span class="size-badge" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1px 4px; border-radius: 8px; font-size: 8px; font-weight: 600; display: inline-block;">${option.quantity}ml</span>`).join('') || '', product.weightPricing.g?.map(option => `<span class="size-badge" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1px 4px; border-radius: 8px; font-size: 8px; font-weight: 600; display: inline-block;">${option.quantity}g</span>`).join('') || '', product.weightPricing.kg?.map(option => `<span class="size-badge" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1px 4px; border-radius: 8px; font-size: 8px; font-weight: 600; display: inline-block;">${option.quantity}kg</span>`).join('') || ''].join('') : ''}</div>` : ''}
            <div class="related-product-name">${product.name}</div>
            <div class="related-product-rating">
                ${'⭐'.repeat(product.rating || 0)} ${product.rating ? `(${product.rating})` : ''}
            </div>
            ${(product.originalPrice && product.originalPrice > product.price && product.discount > 0) ? `
                <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                    <span class="related-product-original-price">₹${product.originalPrice}</span>
                    <span class="related-product-price">₹${product.price}</span>
                    <span class="related-product-discount">${product.discount}% off</span>
                </div>
            ` : `
                <div class="related-product-price">₹${product.price}</div>
            `}
        </div>
    `;

    // Generate HTML for both rows
    const relatedHTML = `
        <div class="related-products-row">
            ${firstRow.map(generateProductCard).join('')}
        </div>
        <div class="related-products-row">
            ${secondRow.map(generateProductCard).join('')}
        </div>
    `;

    relatedContainer.innerHTML = relatedHTML;

    // Restore scroll positions after a brief delay
    setTimeout(() => {
        const newRows = relatedContainer.querySelectorAll('.related-products-row');
        newRows.forEach((row, index) => {
            if (scrollPositions[index] !== undefined) {
                row.scrollLeft = scrollPositions[index];
            }
        });
    }, 50);
};

// Load related products for cart sidebar
window.loadCartRelatedProducts = function() {
    const relatedContainer = document.getElementById('cartRelatedProducts');
    if (!relatedContainer) return;

    // Store current scroll positions for all related product rows
    const scrollPositions = {};
    const existingRows = relatedContainer.querySelectorAll('.related-products-row');
    existingRows.forEach((row, index) => {
        scrollPositions[index] = row.scrollLeft;
    });

    // Get categories from current cart items
    const cartCategories = [...new Set(cartItems.map(item => {
        const product = productsData.find(p => p.id === item.id);
        return product ? product.category : null;
    }).filter(Boolean))];

    // Get cart product IDs to exclude
    const cartProductIds = cartItems.map(item => item.id);

    // Get related products from cart categories
    let relatedProducts = productsData.filter(product => 
        !cartProductIds.includes(product.id) && 
        cartCategories.includes(product.category)
    );

    // If not enough, add random products
    if (relatedProducts.length < 16) {
        const otherProducts = productsData.filter(product => 
            !cartProductIds.includes(product.id) && 
            !cartCategories.includes(product.category)
        );
        const shuffled = otherProducts.sort(() => 0.5 - Math.random());
        relatedProducts = [...relatedProducts, ...shuffled].slice(0, 16);
    } else {
        relatedProducts = relatedProducts.slice(0, 16);
    }

    // Split into two rows of 8 products each
    const firstRow = relatedProducts.slice(0, 8);
    const secondRow = relatedProducts.slice(8, 16);

    // Generate HTML for a single product card
    const generateProductCard = (product) => `
        <div class="related-product-card" data-product-id='${product.id}' onclick="openProductModalFromRelated('${product.id}')">
            <div class="related-product-image-container">
                <img src="${product.imageUrl}" alt="${product.name}" class="related-product-image" 
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjhGOUZBIi8+CjxwYXRoIGQ9Ik03NSA3NUgxMjVWMTI1SDc1Vjc1WiIgZmlsbD0iI0RERERERCIvPgo8L3N2Zz4K'">
                <button class="related-product-heart-icon">❤️</button>
                ${getAddButtonHTML(product.id, true)}
            </div>
            ${(product.sizes && product.sizes.length > 0) || (product.weightPricing && (product.weightPricing.ml?.length > 0 || product.weightPricing.g?.length > 0 || product.weightPricing.kg?.length > 0)) ? `<div class="product-sizes" style="margin-bottom: 4px; display: flex; align-items: center; gap: 2px; flex-wrap: wrap;"><img src="mark.png" alt="Size" style="width: 14px; height: 14px; object-fit: contain;">${product.sizes ? product.sizes.map(size => `<span class="size-badge" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1px 4px; border-radius: 8px; font-size: 8px; font-weight: 600; display: inline-block;">${size}</span>`).join('') : ''}${product.weightPricing ? [product.weightPricing.ml?.map(option => `<span class="size-badge" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1px 4px; border-radius: 8px; font-size: 8px; font-weight: 600; display: inline-block;">${option.quantity}ml</span>`).join('') || '', product.weightPricing.g?.map(option => `<span class="size-badge" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1px 4px; border-radius: 8px; font-size: 8px; font-weight: 600; display: inline-block;">${option.quantity}g</span>`).join('') || '', product.weightPricing.kg?.map(option => `<span class="size-badge" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1px 4px; border-radius: 8px; font-size: 8px; font-weight: 600; display: inline-block;">${option.quantity}kg</span>`).join('') || ''].join('') : ''}</div>` : ''}
            <div class="related-product-name">${product.name}</div>
            <div class="related-product-rating">
                ${'⭐'.repeat(product.rating || 0)} ${product.rating ? `(${product.rating})` : ''}
            </div>
            ${(product.originalPrice && product.originalPrice > product.price && product.discount > 0) ? `
                <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                    <span class="related-product-original-price">₹${product.originalPrice}</span>
                    <span class="related-product-price">₹${product.price}</span>
                    <span class="related-product-discount">${product.discount}% off</span>
                </div>
            ` : `
                <div class="related-product-price">₹${product.price}</div>
            `}
        </div>
    `;

    // Generate HTML for both rows
    const relatedHTML = `
        <div class="related-products-row">
            ${firstRow.map(generateProductCard).join('')}
        </div>
        <div class="related-products-row">
            ${secondRow.map(generateProductCard).join('')}
        </div>
    `;

    relatedContainer.innerHTML = relatedHTML;

    // Restore scroll positions after a brief delay
    setTimeout(() => {
        const newRows = relatedContainer.querySelectorAll('.related-products-row');
        newRows.forEach((row, index) => {
            if (scrollPositions[index] !== undefined) {
                row.scrollLeft = scrollPositions[index];
            }
        });
    }, 50);
};

// Load related products for cart confirmation modal
window.loadCartModalRelatedProducts = function() {
    const relatedContainer = document.getElementById('cartModalRelatedProducts');
    if (!relatedContainer) return;

    // Store current scroll positions for all related product rows
    const scrollPositions = {};
    const existingRows = relatedContainer.querySelectorAll('.related-products-row');
    existingRows.forEach((row, index) => {
        scrollPositions[index] = row.scrollLeft;
    });

    // Get categories from current cart items
    const cartCategories = [...new Set(cartItems.map(item => {
        const product = productsData.find(p => p.id === item.id);
        return product ? product.category : null;
    }).filter(Boolean))];

    // Get cart product IDs to exclude
    const cartProductIds = cartItems.map(item => item.id);

    // Get related products from cart categories
    let relatedProducts = productsData.filter(product => 
        !cartProductIds.includes(product.id) && 
        cartCategories.includes(product.category)
    );

    // If not enough, add random products
    if (relatedProducts.length < 16) {
        const otherProducts = productsData.filter(product => 
            !cartProductIds.includes(product.id) && 
            !cartCategories.includes(product.category)
        );
        const shuffled = otherProducts.sort(() => 0.5 - Math.random());
        relatedProducts = [...relatedProducts, ...shuffled].slice(0, 16);
    } else {
        relatedProducts = relatedProducts.slice(0, 16);
    }

    // Split into two rows of 8 products each
    const firstRow = relatedProducts.slice(0, 8);
    const secondRow = relatedProducts.slice(8, 16);

    // Generate HTML for a single product card
    const generateProductCard = (product) => `
        <div class="related-product-card" data-product-id='${product.id}' onclick="openProductModalFromRelated('${product.id}')">
            <div class="related-product-image-container">
                <img src="${product.imageUrl}" alt="${product.name}" class="related-product-image" 
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjhGOUZBIi8+CjxwYXRoIGQ9Ik03NSA3NUgxMjVWMTI1SDc1Vjc1WiIgZmlsbD0iI0RERERERCIvPgo8L3N2Zz4K'">
                <button class="related-product-heart-icon">❤️</button>
                ${getAddButtonHTML(product.id, true)}
            </div>
            ${(product.sizes && product.sizes.length > 0) || (product.weightPricing && (product.weightPricing.ml?.length > 0 || product.weightPricing.g?.length > 0 || product.weightPricing.kg?.length > 0)) ? `<div class="product-sizes" style="margin-bottom: 4px; display: flex; align-items: center; gap: 2px; flex-wrap: wrap;"><img src="mark.png" alt="Size" style="width: 14px; height: 14px; object-fit: contain;">${product.sizes ? product.sizes.map(size => `<span class="size-badge" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1px 4px; border-radius: 8px; font-size: 8px; font-weight: 600; display: inline-block;">${size}</span>`).join('') : ''}${product.weightPricing ? [product.weightPricing.ml?.map(option => `<span class="size-badge" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1px 4px; border-radius: 8px; font-size: 8px; font-weight: 600; display: inline-block;">${option.quantity}ml</span>`).join('') || '', product.weightPricing.g?.map(option => `<span class="size-badge" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1px 4px; border-radius: 8px; font-size: 8px; font-weight: 600; display: inline-block;">${option.quantity}g</span>`).join('') || '', product.weightPricing.kg?.map(option => `<span class="size-badge" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1px 4px; border-radius: 8px; font-size: 8px; font-weight: 600; display: inline-block;">${option.quantity}kg</span>`).join('') || ''].join('') : ''}</div>` : ''}
            <div class="related-product-name">${product.name}</div>
            <div class="related-product-rating">
                ${'⭐'.repeat(product.rating || 0)} ${product.rating ? `(${product.rating})` : ''}
            </div>
            ${(product.originalPrice && product.originalPrice > product.price && product.discount > 0) ? `
                <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                    <span class="related-product-original-price">₹${product.originalPrice}</span>
                    <span class="related-product-price">₹${product.price}</span>
                    <span class="related-product-discount">${product.discount}% off</span>
                </div>
            ` : `
                <div class="related-product-price">₹${product.price}</div>
            `}
        </div>
    `;

    // Generate HTML for both rows
    const relatedHTML = `
        <div class="related-products-row">
            ${firstRow.map(generateProductCard).join('')}
        </div>
        <div class="related-products-row">
            ${secondRow.map(generateProductCard).join('')}
        </div>
    `;

    relatedContainer.innerHTML = relatedHTML;

    // Restore scroll positions after a brief delay
    setTimeout(() => {
        const newRows = relatedContainer.querySelectorAll('.related-products-row');
        newRows.forEach((row, index) => {
            if (scrollPositions[index] !== undefined) {
                row.scrollLeft = scrollPositions[index];
            }
        });
    }, 50);
};

// Open confirm order modal
window.openConfirmOrderModal = async function(productId) {
    // Add to navigation stack
    pushToNavigationStack('confirm-order-modal', { productId: productId });
    const product = productsData.find(p => p.id === productId);
    if (!product) return;
    
    // Check for both modal and regular quantity inputs
    const quantityInput = document.getElementById(`modal-quantity-${productId}`) || document.getElementById(`quantity-${productId}`);
    const quantity = quantityInput ? parseInt(quantityInput.value) || 1 : 1;
    
    // Get selected size if available
    let selectedSize = '';
    const selectedSizeInput = document.getElementById(`selected-size-${productId}`);
    if (selectedSizeInput && ((product.sizes && product.sizes.length > 0) || (product.weightPricing && (product.weightPricing.ml.length > 0 || product.weightPricing.g.length > 0 || product.weightPricing.kg.length > 0)))) {
        selectedSize = selectedSizeInput.value || '';
        if (!selectedSize) {
            showNotification('Please select a size/quantity before placing order.', 'warning');
            return;
        }
    }
    
    // Calculate the correct price with discount
    let currentPrice = product.price;
    let originalPrice = product.originalPrice || product.price;
    let discount = product.discount || 0;
    
    // Check if this is from cart and use cart pricing
    if (window.orderFromCart && window.orderFromCart.productId === productId) {
        currentPrice = window.orderFromCart.cartPrice;
        originalPrice = window.orderFromCart.cartOriginalPrice;
        discount = window.orderFromCart.cartDiscount;
    } else {
        // Apply size-specific pricing if available
        if (selectedSize && product.sizePricing && product.sizePricing[selectedSize]) {
            currentPrice = product.sizePricing[selectedSize];
            originalPrice = currentPrice; // Use size price as base
        }
        // Check if it's a weight-based option
        else if (selectedSize && selectedSize.includes('-')) {
            const [unit, quantity] = selectedSize.split('-');
            const weightOptions = product.weightPricing && product.weightPricing[unit];
            const weightOption = weightOptions && weightOptions.find(item => item.quantity == quantity);
            
            if (weightOption) {
                originalPrice = weightOption.price;
                currentPrice = weightOption.price;
            }
        }
        
        // Apply discount if available
        if (product.discount && product.discount > 0) {
            currentPrice = Math.round((originalPrice - (originalPrice * product.discount / 100)) * 100) / 100;
        }
    }
    
    const deliveryCharge = product.deliveryCharge || 0;
    const subtotal = Math.round((currentPrice * quantity) * 100) / 100;
    const totalAmount = Math.round((subtotal + deliveryCharge) * 100) / 100;
    
    // Load user address data
    await loadUserAddressFromFirebase();
    
    const modal = document.getElementById('confirmOrderModal');
    const modalBody = document.getElementById('confirmOrderModalBody');
    
    modalBody.innerHTML = `
        <div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 10px;">
            <h4 style="margin: 0 0 10px 0; color: #2c3e50;">Order Summary</h4>
            <div style="display: flex; gap: 15px; align-items: center;">
                <img src="${product.imageUrl}" alt="${product.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;">
                <div>
                    <div style="font-weight: 600; color: #2c3e50;">${product.name}</div>
                    ${selectedSize ? `<div style="color: #666; font-size: 10px;">Size: ${selectedSize}</div>` : ''}
                    ${discount && discount > 0 && originalPrice > currentPrice ? `
                        <div style="margin: 5px 0;">
                            <div style="font-size: 11px; color: #999; margin-bottom: 2px;">Original Price</div>
                            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                                <span style="color: #27ae60; font-weight: 600;">₹${currentPrice}</span>
                                <span style="color: #999; font-size: 13px; text-decoration: line-through;">₹${originalPrice}</span>
                                <span style="background: #27ae60; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600;">${discount}% off</span>
                            </div>
                        </div>
                        <div style="color: #27ae60; font-weight: 600; margin-top: 3px;">₹${currentPrice} x ${quantity} = ₹${subtotal}</div>
                    ` : `
                        <div style="color: #27ae60; font-weight: 600;">₹${currentPrice} x ${quantity} = ₹${subtotal}</div>
                    `}
                    ${deliveryCharge > 0 ? `<div style="color: #666; font-size: 10px;">Delivery: ₹${deliveryCharge}</div>` : ''}
                    ${discount && discount > 0 && originalPrice > currentPrice ? `
                        <div style="margin-top: 5px; padding: 5px; background: #e8f5e8; border-radius: 4px;">
                            <div style="font-size: 11px; color: #27ae60; font-weight: 600;">💰 You Save: ₹${Math.round(((originalPrice - currentPrice) * quantity) * 100) / 100}</div>
                        </div>
                    ` : ''}
                    <div style="font-weight: 700; color: #e74c3c; font-size: 16px; margin-top: 5px;" id="finalTotalAmount">Total: ₹${totalAmount}</div>
                </div>
            </div>
        </div>
        
        ${getWalletSectionHTML(totalAmount)}
        
        <div style="margin-bottom: 20px;">
            <h4 style="margin: 0 0 15px 0; color: #2c3e50;">Select Delivery Address</h4>
            <div style="margin-bottom: 10px; padding: 8px 12px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; color: #856404; font-size: 13px;">
                ⚠️ Please select an address below to continue
            </div>
            
            <div id="savedAddressesContainer">
                <!-- Saved addresses will be populated here -->
            </div>
            
            <div style="text-align: center; margin-top: 15px;">
                <button onclick="openAddressMapModal()" style="background: linear-gradient(135deg, #fbbf24, #f59e0b); color: white; border: none; padding: 18px 24px; border-radius: 25px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; display: inline-flex; align-items: center; gap: 8px;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                    📍 Add New Address
                </button>
            </div>
        </div>
        
        <div style="margin-bottom: 20px;">
            <h4 style="margin: 0 0 15px 0; color: #2c3e50;">Choose Payment Method</h4>
            
            <div style="display: flex; flex-direction: column; gap: 10px;">
                <label id="codPaymentOption" style="display: flex; align-items: center; padding: 12px; border: 2px solid #e0e0e0; border-radius: 8px; cursor: pointer; transition: all 0.3s ease;" onclick="selectPaymentMethod('cod', this)">
                    <input type="radio" name="paymentMethod" value="cod" style="margin-transform: translateX(-50%) translateY(100px);">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 20px;">💵</span>
                        <div>
                            <div style="font-weight: 600; color: #2c3e50;">Cash on Delivery</div>
                            <div style="font-size: 10px; color: #666;">Pay when your order arrives</div>
                        </div>
                    </div>
                </label>
                
                <label id="onlinePaymentOption" style="display: flex; align-items: center; padding: 12px; border: 2px solid #e0e0e0; border-radius: 8px; cursor: pointer; transition: all 0.3s ease;" onclick="selectPaymentMethod('online', this)">
                    <input type="radio" name="paymentMethod" value="online" style="margin-transform: translateX(-50%) translateY(100px);">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 20px;">💳</span>
                        <div>
                            <div style="font-weight: 600; color: #2c3e50;">Pay Online</div>
                            <div style="font-size: 10px; color: #666;">UPI, Cards, Net Banking</div>
                        </div>
                    </div>
                </label>
            </div>
        </div>
        
        <div class="product-modal-buttons">
            <button class="btn-order" onclick="confirmOrderWithAddress('${productId}', ${quantity}, '${selectedSize}', ${currentPrice}, ${deliveryCharge}, ${totalAmount})" style="width: 100%; padding: 15px; font-size: 16px; font-weight: 600;">
                Confirm Order
            </button>
        </div>
    `;
    
    modal.style.display = 'flex';
    
    // Load wallet balance after modal is displayed
    loadWalletBalanceInModal();
    
    // Load saved addresses in confirm order modal
    loadSavedAddressesInConfirmModal();
    
    // Clear any previously selected address to force manual selection
    await clearSelectedAddressForOrder();
};

// Close confirm order modal
window.closeConfirmOrderModal = function() {
    closeConfirmOrderModalInternal();
};

// Payment method selection function
window.selectPaymentMethod = function(method, element) {
    // Remove selected style from all payment options
    const allLabels = element.parentNode.querySelectorAll('label');
    allLabels.forEach(label => {
        label.style.border = '2px solid #e0e0e0';
        label.style.background = 'white';
    });
    
    // Add selected style to clicked option
    element.style.border = '2px solid #27ae60';
    element.style.background = '#f8fff8';
    
    // Update the radio button
    const radio = element.querySelector('input[type="radio"]');
    radio.checked = true;
};


// Load cities based on selected state
window.loadCitiesForState = function() {
    const stateSelect = document.getElementById('customState');
    const citySelect = document.getElementById('customCity');
    const selectedState = stateSelect.value;
    
    // Clear existing cities
    citySelect.innerHTML = '<option value="">Select City</option>';
    
    if (!selectedState) return;
    
    // Indian states and their major cities
    const stateCities = {
        'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool', 'Rajahmundry', 'Tirupati', 'Kadapa', 'Anantapur', 'Eluru'],
        'Arunachal Pradesh': ['Itanagar', 'Naharlagun', 'Pasighat', 'Tezpur', 'Bomdila', 'Ziro', 'Along', 'Changlang', 'Tezu', 'Namsai'],
        'Assam': ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Nagaon', 'Tinsukia', 'Tezpur', 'Bongaigaon', 'Karimganj', 'Sivasagar'],
        'Bihar': ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Purnia', 'Darbhanga', 'Bihar Sharif', 'Arrah', 'Begusarai', 'Katihar'],
        'Chhattisgarh': ['Raipur', 'Bhilai', 'Korba', 'Bilaspur', 'Durg', 'Rajnandgaon', 'Jagdalpur', 'Raigarh', 'Ambikapur', 'Mahasamund'],
        'Goa': ['Panaji', 'Vasco da Gama', 'Margao', 'Mapusa', 'Ponda', 'Bicholim', 'Curchorem', 'Sanquelim', 'Cuncolim', 'Quepem'],
        'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Junagadh', 'Gandhinagar', 'Anand', 'Navsari'],
        'Haryana': ['Gurugram', 'Faridabad', 'Panipat', 'Ambala', 'Yamunanagar', 'Rohtak', 'Hisar', 'Karnal', 'Sonipat', 'Panchkula'],
        'Himachal Pradesh': ['Shimla', 'Dharamshala', 'Solan', 'Mandi', 'Palampur', 'Baddi', 'Nahan', 'Paonta Sahib', 'Sundernagar', 'Chamba'],
        'Jharkhand': ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Deoghar', 'Phusro', 'Hazaribagh', 'Giridih', 'Ramgarh', 'Medininagar'],
        'Karnataka': ['Bangalore', 'Mysore', 'Hubli', 'Mangalore', 'Belgaum', 'Gulbarga', 'Davanagere', 'Bellary', 'Bijapur', 'Shimoga'],
        'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam', 'Palakkad', 'Alappuzha', 'Malappuram', 'Kannur', 'Kasaragod'],
        'Madhya Pradesh': ['Bhopal', 'Indore', 'Gwalior', 'Jabalpur', 'Ujjain', 'Sagar', 'Dewas', 'Satna', 'Ratlam', 'Rewa'],
        'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Thane', 'Nashik', 'Aurangabad', 'Solapur', 'Amravati', 'Kolhapur', 'Sangli'],
        'Manipur': ['Imphal', 'Thoubal', 'Bishnupur', 'Churachandpur', 'Kakching', 'Ukhrul', 'Senapati', 'Tamenglong', 'Jiribam', 'Chandel'],
        'Meghalaya': ['Shillong', 'Tura', 'Jowai', 'Nongpoh', 'Baghmara', 'Williamnagar', 'Nongstoin', 'Mawkyrwat', 'Resubelpara', 'Ampati'],
        'Mizoram': ['Aizawl', 'Lunglei', 'Saiha', 'Champhai', 'Kolasib', 'Serchhip', 'Mamit', 'Lawngtlai', 'Saitual', 'Khawzawl'],
        'Nagaland': ['Kohima', 'Dimapur', 'Mokokchung', 'Tuensang', 'Wokha', 'Zunheboto', 'Phek', 'Kiphire', 'Longleng', 'Peren'],
        'Odisha': ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Sambalpur', 'Puri', 'Balasore', 'Bhadrak', 'Baripada', 'Jharsuguda'],
        'Punjab': ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali', 'Firozpur', 'Batala', 'Pathankot', 'Moga'],
        'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Bikaner', 'Ajmer', 'Bhilwara', 'Alwar', 'Sikar', 'Pali'],
        'Sikkim': ['Gangtok', 'Namchi', 'Geyzing', 'Mangan', 'Jorethang', 'Nayabazar', 'Rangpo', 'Singtam', 'Pakyong', 'Ravangla'],
        'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Tiruppur', 'Vellore', 'Erode', 'Thoothukkudi'],
        'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad', 'Khammam', 'Karimnagar', 'Ramagundam', 'Mahbubnagar', 'Nalgonda', 'Adilabad', 'Suryapet'],
        'Tripura': ['Agartala', 'Dharmanagar', 'Udaipur', 'Kailasahar', 'Belonia', 'Khowai', 'Pratapgarh', 'Ranir Bazar', 'Sonamura', 'Kamalpur'],
        'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Ghaziabad', 'Agra', 'Varanasi', 'Meerut', 'Allahabad', 'Bareilly', 'Aligarh', 'Moradabad', 'Saharanpur', 'Gorakhpur', 'Noida', 'Firozabad', 'Loni', 'Jhansi', 'Muzaffarnagar', 'Mathura', 'Shahjahanpur', 'Rampur', 'Maunath Bhanjan'],
        'Uttarakhand': ['Dehradun', 'Haridwar', 'Roorkee', 'Haldwani', 'Rudrapur', 'Kashipur', 'Rishikesh', 'Kotdwar', 'Pithoragarh', 'Almora'],
        'West Bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri', 'Malda', 'Bardhaman', 'Barasat', 'Kharagpur', 'Haldia'],
        'Delhi': ['New Delhi', 'Central Delhi', 'North Delhi', 'South Delhi', 'East Delhi', 'West Delhi', 'North East Delhi', 'North West Delhi', 'South East Delhi', 'South West Delhi'],
        'Jammu and Kashmir': ['Srinagar', 'Jammu', 'Baramulla', 'Anantnag', 'Sopore', 'Kathua', 'Udhampur', 'Punch', 'Rajouri', 'Kupwara'],
        'Ladakh': ['Leh', 'Kargil', 'Nubra', 'Changthang', 'Zanskar', 'Drass', 'Sankoo', 'Turtuk', 'Diskit', 'Panamik']
    };
    
    const cities = stateCities[selectedState] || [];
    cities.forEach(city => {
        const option = document.createElement('option');
        option.value = city;
        option.textContent = city;
        citySelect.appendChild(option);
    });
};

// Open confirm order modal for all cart items
window.openConfirmOrderModalForAllCartItems = async function() {
    if (cartItems.length === 0) {
        showNotification('Your cart is empty! 🛒', 'warning');
        return;
    }

    // Add to navigation stack
    pushToNavigationStack('confirm-order-all-modal', { cartItems: cartItems });

    if (!auth.currentUser) {
        showNotification('Please login or register first to continue.', 'warning');
        setTimeout(async () => {
            await setActiveTab('profile');
        }, 1000);
        return;
    }

    // Calculate total for all cart items
    const total = cartItems.reduce((sum, item) => {
        const product = productsData.find(p => p.id === item.id);
        const deliveryCharge = product ? (product.deliveryCharge || 0) : 0;
        return Math.round((sum + (item.price * item.quantity) + deliveryCharge) * 100) / 100;
    }, 0);

    await loadUserAddressFromFirebase();
    
    const modal = document.getElementById('confirmOrderModal');
    const modalBody = document.getElementById('confirmOrderModalBody');
    
    // Generate order summary for all cart items
    const orderSummaryHTML = cartItems.map(item => {
        const product = productsData.find(p => p.id === item.id);
        const deliveryCharge = product ? (product.deliveryCharge || 0) : 0;
        const itemTotal = Math.round(((item.price * item.quantity) + deliveryCharge) * 100) / 100;
        
        return `
            <div style="display: flex; gap: 15px; align-items: center; margin-bottom: 15px; padding: 10px; background: white; border-radius: 8px; border: 1px solid #e0e0e0;">
                <img src="${item.imageUrl}" alt="${item.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 6px;">
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: #2c3e50; font-size: 14px;">${item.name}</div>
                    ${item.selectedSize ? `<div style="color: #666; font-size: 11px;">Size: ${item.selectedSize}</div>` : ''}
                    <div style="color: #27ae60; font-weight: 600; font-size: 10px;">₹${item.price} x ${item.quantity} = ₹${Math.round((item.price * item.quantity) * 100) / 100}</div>
                    ${deliveryCharge > 0 ? `<div style="color: #666; font-size: 11px;">Delivery: ₹${deliveryCharge}</div>` : ''}
                </div>
                <div style="font-weight: 700; color: #e74c3c; font-size: 14px;">₹${itemTotal}</div>
            </div>
        `;
    }).join('');
    
    modalBody.innerHTML = `
        <div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 10px;">
            <h4 style="margin: 0 0 15px 0; color: #2c3e50;">Order Summary (${cartItems.length} items)</h4>
            <div style="max-height: 300px; overflow-y: auto;">
                ${orderSummaryHTML}
            </div>
            <div style="border-top: 2px solid #e0e0e0; padding-top: 15px; margin-top: 15px;">
                <div style="font-weight: 700; color: #e74c3c; font-size: 18px; text-align: right;" id="finalTotalAmount">
                    Grand Total: ₹${total}
                </div>
            </div>
        </div>
        
        ${getWalletSectionHTML(total)}
        
        <div style="margin-bottom: 20px;">
            <h4 style="margin: 0 0 15px 0; color: #2c3e50;">Select Delivery Address</h4>
            <div style="margin-bottom: 10px; padding: 8px 12px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; color: #856404; font-size: 13px;">
                ⚠️ Please select an address below to continue
            </div>
            
            <div id="savedAddressesContainer">
                <!-- Saved addresses will be populated here -->
            </div>
            
            <div style="text-align: center; margin-top: 15px;">
                <button onclick="openAddressMapModal()" style="background: linear-gradient(135deg, #fbbf24, #f59e0b); color: white; border: none; padding: 18px 24px; border-radius: 25px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; display: inline-flex; align-items: center; gap: 8px;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                    📍 Add New Address
                </button>
            </div>
        </div>
            
            <div id="customAddressForm" style="display: ${!userAddressData || !userAddressData.address ? 'block' : 'none'}; padding: 20px; background: #f8f9fa; border-radius: 12px; border: 1px solid #e0e0e0;">
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #2c3e50; font-size: 13px;">Phone Number *</label>
                    <input type="tel" id="customPhone" placeholder="Enter your phone number" style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 14px; box-sizing: border-box; transition: border-color 0.3s;" value="${userAddressData?.phone || ''}" onfocus="this.style.borderColor='#3498db'" onblur="this.style.borderColor='#ddd'">
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #2c3e50; font-size: 13px;">Full Address *</label>
                    <textarea id="customAddress" placeholder="Enter complete address with house/flat number, street, area" style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 14px; min-height: 70px; resize: vertical; box-sizing: border-box; transition: border-color 0.3s;" rows="3" onfocus="this.style.borderColor='#3498db'" onblur="this.style.borderColor='#ddd'">${userAddressData?.address || ''}</textarea>
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #2c3e50; font-size: 13px;">Google Maps Location Link (Optional)</label>
                    <input type="url" id="customGoogleMapsLink" placeholder="Paste your Google Maps location link here (optional)" style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 14px; box-sizing: border-box; transition: border-color 0.3s;" value="${userAddressData?.googleMapsLink || ''}" onfocus="this.style.borderColor='#3498db'" onblur="this.style.borderColor='#ddd'">
                    <div style="font-size: 10px; color: #666; margin-top: 5px; padding: 8px; background: #f0f8ff; border-radius: 6px;">📍 How to get link: Open Google Maps → Find your location → Share → Copy link → Paste here</div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #2c3e50; font-size: 13px;">State *</label>
                        <select id="customState" style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 14px; box-sizing: border-box; background: white; transition: border-color 0.3s;" onfocus="this.style.borderColor='#3498db'" onblur="this.style.borderColor='#ddd'">
                            <option value="">Select State</option>
                            <option value="Andhra Pradesh">Andhra Pradesh</option>
                            <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                            <option value="Assam">Assam</option>
                            <option value="Bihar">Bihar</option>
                            <option value="Chhattisgarh">Chhattisgarh</option>
                            <option value="Goa">Goa</option>
                            <option value="Gujarat">Gujarat</option>
                            <option value="Haryana">Haryana</option>
                            <option value="Himachal Pradesh">Himachal Pradesh</option>
                            <option value="Jharkhand">Jharkhand</option>
                            <option value="Karnataka">Karnataka</option>
                            <option value="Kerala">Kerala</option>
                            <option value="Madhya Pradesh">Madhya Pradesh</option>
                            <option value="Maharashtra">Maharashtra</option>
                            <option value="Manipur">Manipur</option>
                            <option value="Meghalaya">Meghalaya</option>
                            <option value="Mizoram">Mizoram</option>
                            <option value="Nagaland">Nagaland</option>
                            <option value="Odisha">Odisha</option>
                            <option value="Punjab">Punjab</option>
                            <option value="Rajasthan">Rajasthan</option>
                            <option value="Sikkim">Sikkim</option>
                            <option value="Tamil Nadu">Tamil Nadu</option>
                            <option value="Telangana">Telangana</option>
                            <option value="Tripura">Tripura</option>
                            <option value="Uttar Pradesh">Uttar Pradesh</option>
                            <option value="Uttarakhand">Uttarakhand</option>
                            <option value="West Bengal">West Bengal</option>
                            <option value="Delhi">Delhi</option>
                            <option value="Jammu and Kashmir">Jammu and Kashmir</option>
                            <option value="Ladakh">Ladakh</option>
                        </select>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #2c3e50; font-size: 13px;">City *</label>
                        <input type="text" id="customCity" placeholder="Enter your city" style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 14px; box-sizing: border-box; transition: border-color 0.3s;" value="${userAddressData?.city || ''}" onfocus="this.style.borderColor='#3498db'" onblur="this.style.borderColor='#ddd'">
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #2c3e50; font-size: 13px;">Pincode *</label>
                        <input type="text" id="customPincode" placeholder="Enter pincode" maxlength="6" pattern="[0-9]{6}" style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 14px; box-sizing: border-box; transition: border-color 0.3s;" value="${userAddressData?.pincode || ''}" onfocus="this.style.borderColor='#3498db'" onblur="this.style.borderColor='#ddd'">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #2c3e50; font-size: 13px;">Nearby Landmark</label>
                        <input type="text" id="customNearby" placeholder="Optional landmark" style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 14px; box-sizing: border-box; transition: border-color 0.3s;" value="${userAddressData?.nearby || ''}" onfocus="this.style.borderColor='#3498db'" onblur="this.style.borderColor='#ddd'">
                    </div>
                </div>
            </div>
        </div>
        
        <div style="margin-bottom: 20px;">
            <h4 style="margin: 0 0 15px 0; color: #2c3e50;">Choose Payment Method</h4>
            
            <div style="display: flex; flex-direction: column; gap: 10px;">
                <label id="codPaymentOptionCart" style="display: flex; align-items: center; padding: 12px; border: 2px solid #e0e0e0; border-radius: 8px; cursor: pointer; transition: all 0.3s ease;" onclick="selectPaymentMethod('cod', this)">
                    <input type="radio" name="paymentMethod" value="cod" style="margin-transform: translateX(-50%) translateY(100px);">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 20px;">💵</span>
                        <div>
                            <div style="font-weight: 600; color: #2c3e50;">Cash on Delivery</div>
                            <div style="font-size: 10px; color: #666;">Pay when your order arrives</div>
                        </div>
                    </div>
                </label>
                
                <label id="onlinePaymentOptionCart" style="display: flex; align-items: center; padding: 12px; border: 2px solid #e0e0e0; border-radius: 8px; cursor: pointer; transition: all 0.3s ease;" onclick="selectPaymentMethod('online', this)">
                    <input type="radio" name="paymentMethod" value="online" style="margin-transform: translateX(-50%) translateY(100px);">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 20px;">💳</span>
                        <div>
                            <div style="font-weight: 600; color: #2c3e50;">Pay Online</div>
                            <div style="font-size: 10px; color: #666;">UPI, Cards, Net Banking</div>
                        </div>
                    </div>
                </label>
            </div>
        </div>
        
        <div class="product-modal-buttons">
            <button class="btn-order" onclick="confirmOrderForAllCartItems(${total})" style="width: 100%; padding: 15px; font-size: 16px; font-weight: 600;" id="confirmAllOrdersBtn">
                Confirm All Orders
            </button>
        </div>
        
        <div class="related-products-section" id="cartModalRelatedSection" style="display: ${cartItems.length > 1 ? 'none' : 'block'};">
            <h4 class="related-products-title">You might also like</h4>
            <div class="related-products-scroll" id="cartModalRelatedProducts">
                <!-- Related products will be populated here -->
            </div>
        </div>
    `;
    
    modal.style.display = 'flex';
    
    // Load wallet balance after modal is displayed
    loadWalletBalanceInModal();
    
    // Load saved addresses in confirm order modal
    loadSavedAddressesInConfirmModal();
    
    // Clear any previously selected address to force manual selection
    await clearSelectedAddressForOrder();
    
    // Load related products for cart modal only if section is visible (single item)
    if (cartItems.length === 1) {
        loadCartModalRelatedProducts();
    }
};

// Confirm order for all cart items with selected address
window.confirmOrderForAllCartItems = async function(totalAmount) {
    // Check if payment method is selected
    const selectedPaymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value;
    if (!selectedPaymentMethod) {
        showNotification('Please choose payment method', 'error');
        return;
    }
    
    try {
        // Get selected address from Firebase
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (!userDoc.exists()) {
            showNotification('❌ User data not found!', 'error', 4000);
            return;
        }
        
        const userData = userDoc.data();
        const selectedAddressId = userData.selectedAddressId;
        const userAddresses = userData.addresses || [];
        
        console.log('confirmOrderForAllCartItems - Address validation check:', selectedAddressId);
        console.log('confirmOrderForAllCartItems - Available addresses:', userAddresses);
        if (!selectedAddressId || selectedAddressId === '' || selectedAddressId === null || selectedAddressId === undefined) {
            console.log('confirmOrderForAllCartItems - No address selected - blocking order');
            showNotification('❌ Please select a delivery address first!', 'error', 4000);
            return;
        }
        
        const selectedAddress = userAddresses.find(addr => addr.id === selectedAddressId);
        if (!selectedAddress) {
            showNotification('❌ Selected address not found!', 'error');
            return;
        }
        
        // Validate selected address
        if (!selectedAddress.phone || !selectedAddress.address) {
            showNotification('❌ Selected address is incomplete. Please choose another address.', 'error');
            return;
        }
    } catch (error) {
        console.error('Error fetching address data:', error);
        showNotification('❌ Error loading address data!', 'error');
        return;
    }
    
    // Get selected address again for order processing
    const userDoc2 = await getDoc(doc(db, 'users', currentUser.uid));
    const userData2 = userDoc2.data();
    const selectedAddressId2 = userData2.selectedAddressId;
    const userAddresses2 = userData2.addresses || [];
    const selectedAddress2 = userAddresses2.find(addr => addr.id === selectedAddressId2);
    
    const finalPhone = selectedAddress2.phone;
    const finalAddress = selectedAddress2.address;
    const finalGoogleMapsLink = selectedAddress2.googleMapsLink || '';
    
    // Calculate final amount after wallet deduction with proper rounding
    const finalTotalAmount = Math.round((totalAmount - appliedWalletAmount) * 100) / 100;
    
    try {
        // Deduct wallet amount from user's balance if applied
        if (appliedWalletAmount > 0) {
            const userRef = doc(db, 'users', currentUser.uid);
            const userDoc = await getDoc(userRef);
            const currentBalance = userDoc.exists() ? (userDoc.data().earnedCashback || 0) : 0;
            const newBalance = Math.round(Math.max(0, currentBalance - appliedWalletAmount) * 100) / 100;
            
            await setDoc(userRef, {
                earnedCashback: newBalance
            }, { merge: true });
            
            console.log(`Wallet deducted: ₹${appliedWalletAmount}, New balance: ₹${newBalance}`);
            console.log(`Sequential wallet distribution will start...`);
        }
        
        // Sequential wallet application - apply wallet to items one by one until wallet is exhausted
        let remainingWallet = appliedWalletAmount;
        console.log(`Starting wallet distribution: ₹${appliedWalletAmount} available`);
        
        // Debug: Show cart items order
        console.log('Cart items order:', cartItems.map((item, i) => `${i+1}. ${item.name}: ₹${item.price}`));
        
        // Create order data array with sequential wallet processing
        const orderDataArray = [];
        
        // PERFECT WALLET DISTRIBUTION SYSTEM
        // Step 1: Calculate all item totals first
        const itemTotals = cartItems.map((item, index) => {
            const product = productsData.find(p => p.id === item.id);
            const deliveryCharge = product ? (product.deliveryCharge || 0) : 0;
            const itemSubtotal = Math.round((item.price * item.quantity) * 100) / 100;
            const itemTotal = Math.round((itemSubtotal + deliveryCharge) * 100) / 100;
            return {
                item,
                product,
                deliveryCharge,
                itemTotal,
                index
            };
        });
        
        const totalCartAmount = itemTotals.reduce((sum, item) => sum + item.itemTotal, 0);
        console.log(`\n=== PERFECT WALLET DISTRIBUTION ===`);
        console.log(`Total Cart: ₹${totalCartAmount} | Available Wallet: ₹${appliedWalletAmount}`);
        
        // Step 2: Smart Distribution Logic
        let distributedWallet = 0;
        const walletDistribution = [];
        
        if (appliedWalletAmount >= totalCartAmount) {
            // Case 1: Wallet can cover entire cart - apply full to each item
            console.log(`\ud83d\udcb0 FULL COVERAGE MODE: Wallet covers entire cart`);
            itemTotals.forEach(({item, itemTotal, index}) => {
                walletDistribution.push({
                    index,
                    itemTotal,
                    walletApplied: itemTotal,
                    finalAmount: 0
                });
                distributedWallet += itemTotal;
                console.log(`  Item ${index + 1}: ₹${itemTotal} → ₹${itemTotal} wallet → ₹0 final`);
            });
            console.log(`  Total Used: ₹${distributedWallet} | Remaining: ₹${appliedWalletAmount - distributedWallet}`);
        } else {
            // Case 2: Partial coverage - distribute proportionally but ensure minimum coverage
            console.log(`\ud83d\udd04 SMART PROPORTIONAL MODE: Partial coverage`);
            
            // Calculate base proportion
            const baseRatio = appliedWalletAmount / totalCartAmount;
            console.log(`  Base ratio: ${Math.round(baseRatio * 100)}%`);
            
            // Distribute with rounding adjustment
            let remainingWallet = appliedWalletAmount;
            
            itemTotals.forEach(({item, itemTotal, index}, i) => {
                let walletForItem;
                
                if (i === itemTotals.length - 1) {
                    // Last item gets remaining wallet to avoid rounding errors
                    walletForItem = remainingWallet;
                } else {
                    // Calculate proportional amount
                    walletForItem = Math.round((itemTotal * baseRatio) * 100) / 100;
                    remainingWallet = Math.round((remainingWallet - walletForItem) * 100) / 100;
                }
                
                // Ensure wallet doesn't exceed item total
                walletForItem = Math.min(walletForItem, itemTotal);
                const finalAmount = Math.round((itemTotal - walletForItem) * 100) / 100;
                
                walletDistribution.push({
                    index,
                    itemTotal,
                    walletApplied: walletForItem,
                    finalAmount
                });
                
                distributedWallet += walletForItem;
                console.log(`  Item ${index + 1}: ₹${itemTotal} → ₹${walletForItem} wallet (${Math.round((walletForItem/itemTotal)*100)}%) → ₹${finalAmount} final`);
            });
        }
        
        console.log(`\n✅ Distribution Complete: ₹${Math.round(distributedWallet * 100) / 100} distributed`);
        console.log(`=======================================\n`);
        
        // Step 3: Create orders with calculated distribution
        cartItems.forEach((item, index) => {
            const itemData = itemTotals[index];
            const distribution = walletDistribution[index];
            const itemWalletAmount = distribution.walletApplied;
            const finalItemAmount = distribution.finalAmount;
            
            const orderData = {
                productId: item.id,
                productName: item.name,
                productPrice: item.price,
                productImage: item.imageUrl,
                productSize: item.selectedSize || '',
                quantity: item.quantity,
                deliveryCharge: itemData.deliveryCharge,
                originalAmount: itemData.itemTotal,
                walletUsed: itemWalletAmount,
                totalAmount: finalItemAmount,
                userPhone: finalPhone,
                userAddress: finalAddress,
                userGoogleMapsLink: finalGoogleMapsLink,
                paymentMethod: selectedPaymentMethod,
                orderDate: new Date().toLocaleDateString(),
                status: 'Pending',
                orderType: 'Cart Order All'
            };
            
            console.log(`Order Created - ${item.name}: Wallet ₹${itemWalletAmount}, Final ₹${finalItemAmount}`);
            orderDataArray.push(orderData);
        });
        
        // Handle payment method
        if (selectedPaymentMethod === 'online') {
            // For online payment, store order data globally and open Razorpay modal
            window.allCartOrdersData = orderDataArray;
            window.allCartTotalAmount = finalTotalAmount;
            
            // Open Razorpay payment modal for online payment
            openRazorpayModal({ productName: `${cartItems.length} items from cart` }, finalTotalAmount);
        } else {
            // Cash on Delivery - Save all orders directly to Firebase
            const orderPromises = orderDataArray.map(orderData => {
                return saveOrderToFirebase(orderData, true); // Pass flag to skip individual cashback
            });
            
            const orderIds = await Promise.all(orderPromises);
            const successfulOrders = orderIds.filter(id => id);
            
            if (successfulOrders.length === cartItems.length) {
                // Calculate combined cashback for all orders (based on original amount before wallet deduction)
                const combinedCashbackPerHundred = Math.floor(Math.random() * 6) + 4; // Random between 4-9
                const combinedCashbackAmount = Math.round((totalAmount * combinedCashbackPerHundred) / 100 * 100) / 100;
                
                // Update each order with proportional cashback
                if (combinedCashbackAmount > 0) {
                    const cashbackPromises = successfulOrders.map(async (orderId, index) => {
                        const item = cartItems[index];
                        const product = productsData.find(p => p.id === item.id);
                        const itemTotal = Math.round(((item.price * item.quantity) + (product ? (product.deliveryCharge || 0) : 0)) * 100) / 100;
                        const proportionalCashback = Math.round(((itemTotal / totalAmount) * combinedCashbackAmount) * 100) / 100;
                        
                        if (proportionalCashback > 0) {
                            const orderRef = doc(db, 'orders', orderId);
                            await setDoc(orderRef, {
                                cashbackAmount: proportionalCashback,
                                cashbackStatus: 'pending'
                            }, { merge: true });
                        }
                    });
                    
                    await Promise.all(cashbackPromises);
                    
                    // Add combined cashback to pending wallet
                    const userRef = doc(db, 'users', currentUser.uid);
                    const userDoc = await getDoc(userRef);
                    const currentPending = userDoc.exists() ? (userDoc.data().pendingCashback || 0) : 0;
                    
                    await setDoc(userRef, {
                        pendingCashback: Math.round((currentPending + combinedCashbackAmount) * 100) / 100
                    }, { merge: true });
                    
                    // Show combined cashback notification
                    setTimeout(() => {
                        showCashbackReward(combinedCashbackAmount);
                    }, 1000);
                    
                    const finalAmountPaid = Math.round((totalAmount - appliedWalletAmount) * 100) / 100;
                    const walletMessage = appliedWalletAmount > 0 ? `<br>💳 Wallet used: ₹${Math.round(appliedWalletAmount * 100) / 100}<br>💰 Final amount: ₹${finalAmountPaid}` : '';
                    
                    showNotification(`🎉 All orders placed successfully!<br>${successfulOrders.length} orders confirmed<br>Total amount: ₹${Math.round(totalAmount * 100) / 100}${walletMessage}<br>💰 Cashback: ₹${Math.round(combinedCashbackAmount * 100) / 100} added to pending wallet!<br>Payment: Cash on Delivery`, 'success', 8000);
                } else {
                    const finalAmountPaid = Math.round((totalAmount - appliedWalletAmount) * 100) / 100;
                    const walletMessage = appliedWalletAmount > 0 ? `<br>💳 Wallet used: ₹${Math.round(appliedWalletAmount * 100) / 100}<br>💰 Final amount: ₹${finalAmountPaid}` : '';
                    
                    showNotification(`🎉 All orders placed successfully!<br>${successfulOrders.length} orders confirmed<br>Total amount: ₹${Math.round(totalAmount * 100) / 100}${walletMessage}<br>Payment: Cash on Delivery`, 'success', 6000);
                }
                
                // Clear cart
                cartItems = [];
                localStorage.setItem('cartItems', JSON.stringify(cartItems));
                await saveCartToFirebase(); // Save empty cart to Firebase
                updateCartCount();
                updateCartDisplay();
                updateCartDisplayMain();
                
                // Close modal
                closeConfirmOrderModal();
                
                // Switch to orders tab to show the new orders
                setTimeout(async () => {
                    await setActiveTab('profile');
                    loadUserOrders();
                }, 2000);
            } else {
                showNotification('❌ Some orders failed to process. Please try again.', 'error');
            }
        }
    } catch (error) {
        console.error('Order confirmation error:', error);
        showNotification('❌ Error placing orders. Please try again.', 'error');
    }
};

// Open confirm order modal from cart
window.openConfirmOrderModalFromCart = async function(productId) {
    const product = productsData.find(p => p.id === productId);
    const cartItem = cartItems.find(item => item.id === productId);
    
    if (!product || !cartItem) return;
    
    // Add to navigation stack
    pushToNavigationStack('confirm-order-from-cart-modal', { productId: productId });
    const quantity = cartItem.quantity;
    const selectedSize = cartItem.selectedSize || '';
    const currentPrice = cartItem.price;
    const originalPrice = cartItem.originalPrice || currentPrice;
    const discount = cartItem.discount || 0;
    const deliveryCharge = product.deliveryCharge || 0;
    const subtotal = Math.round((currentPrice * quantity) * 100) / 100;
    const totalAmount = Math.round((subtotal + deliveryCharge) * 100) / 100;
    
    // Load user address data
    await loadUserAddressFromFirebase();
    
    const modal = document.getElementById('confirmOrderModal');
    const modalBody = document.getElementById('confirmOrderModalBody');
    
    modalBody.innerHTML = `
        <div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 10px;">
            <h4 style="margin: 0 0 10px 0; color: #2c3e50;">Order Summary</h4>
            <div style="display: flex; gap: 15px; align-items: center;">
                <img src="${product.imageUrl}" alt="${product.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;">
                <div>
                    <div style="font-weight: 600; color: #2c3e50;">${product.name}</div>
                    ${selectedSize ? `<div style="color: #666; font-size: 10px;">Size: ${selectedSize}</div>` : ''}
                    ${discount && discount > 0 && originalPrice > currentPrice ? `
                        <div style="margin: 5px 0;">
                            <div style="font-size: 11px; color: #999; margin-bottom: 2px;">Original Price</div>
                            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                                <span style="color: #27ae60; font-weight: 600;">₹${currentPrice}</span>
                                <span style="color: #999; font-size: 13px; text-decoration: line-through;">₹${originalPrice}</span>
                                <span style="background: #27ae60; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600;">${discount}% off</span>
                            </div>
                        </div>
                        <div style="color: #27ae60; font-weight: 600; margin-top: 3px;">₹${currentPrice} x ${quantity} = ₹${subtotal}</div>
                    ` : `
                        <div style="color: #27ae60; font-weight: 600;">₹${currentPrice} x ${quantity} = ₹${subtotal}</div>
                    `}
                    ${deliveryCharge > 0 ? `<div style="color: #666; font-size: 10px;">Delivery: ₹${deliveryCharge}</div>` : ''}
                    ${discount && discount > 0 && originalPrice > currentPrice ? `
                        <div style="margin-top: 5px; padding: 5px; background: #e8f5e8; border-radius: 4px;">
                            <div style="font-size: 11px; color: #27ae60; font-weight: 600;">💰 You Save: ₹${Math.round(((originalPrice - currentPrice) * quantity) * 100) / 100}</div>
                        </div>
                    ` : ''}
                    <div style="font-weight: 700; color: #e74c3c; font-size: 16px; margin-top: 5px;" id="finalTotalAmount">Total: ₹${totalAmount}</div>
                </div>
            </div>
        </div>
        
        ${getWalletSectionHTML(totalAmount)}
        
        <div style="margin-bottom: 20px;">
            <h4 style="margin: 0 0 15px 0; color: #2c3e50;">Delivery Address</h4>
            
            ${userAddressData && userAddressData.address ? `
                <div style="margin-bottom: 15px;">
                    <label style="display: flex; align-items: center; padding: 10px; border: 2px solid #ddd; border-radius: 8px; cursor: pointer; background: #f8f9fa;">
                        <input type="radio" name="addressOption" value="saved" checked onchange="toggleAddressForm()" style="margin-transform: translateX(-50%) translateY(100px);">
                        <div>
                            <div style="font-weight: 600; color: #2c3e50;">Use Saved Address</div>
                            <div style="font-size: 10px; color: #666; margin-top: 3px; word-break: break-word;">
                                📱 ${userAddressData.phone}<br>
                                📍 ${userAddressData.address}, ${userAddressData.city}, ${userAddressData.state} - ${userAddressData.pincode}
                                ${userAddressData.nearby ? `<br>Near: ${userAddressData.nearby}` : ''}
                            </div>
                        </div>
                    </label>
                </div>
            ` : ''}
            
            <div style="margin-bottom: 15px;">
                <label style="display: flex; align-items: center; padding: 10px; border: 2px solid #ddd; border-radius: 8px; cursor: pointer;">
                    <input type="radio" name="addressOption" value="custom" ${!userAddressData || !userAddressData.address ? 'checked' : ''} onchange="toggleAddressForm()" style="margin-transform: translateX(-50%) translateY(100px);">
                    <div style="font-weight: 600; color: #2c3e50;">Use Different Address</div>
                </label>
            </div>
            
            <div id="customAddressForm" style="display: ${!userAddressData || !userAddressData.address ? 'block' : 'none'}; padding: 20px; background: #f8f9fa; border-radius: 12px; border: 1px solid #e0e0e0;">
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #2c3e50; font-size: 13px;">Phone Number *</label>
                    <input type="tel" id="customPhone" placeholder="Enter your phone number" style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 14px; box-sizing: border-box; transition: border-color 0.3s;" value="${userAddressData?.phone || ''}" onfocus="this.style.borderColor='#3498db'" onblur="this.style.borderColor='#ddd'">
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #2c3e50; font-size: 13px;">Full Address *</label>
                    <textarea id="customAddress" placeholder="Enter complete address with house/flat number, street, area" style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 14px; min-height: 70px; resize: vertical; box-sizing: border-box; transition: border-color 0.3s;" rows="3" onfocus="this.style.borderColor='#3498db'" onblur="this.style.borderColor='#ddd'">${userAddressData?.address || ''}</textarea>
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #2c3e50; font-size: 13px;">Google Maps Location Link (Optional)</label>
                    <input type="url" id="customGoogleMapsLink" placeholder="Paste your Google Maps location link here (optional)" style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 14px; box-sizing: border-box; transition: border-color 0.3s;" value="${userAddressData?.googleMapsLink || ''}" onfocus="this.style.borderColor='#3498db'" onblur="this.style.borderColor='#ddd'">
                    <div style="font-size: 10px; color: #666; margin-top: 5px; padding: 8px; background: #f0f8ff; border-radius: 6px;">📍 How to get link: Open Google Maps → Find your location → Share → Copy link → Paste here</div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #2c3e50; font-size: 13px;">State *</label>
                        <select id="customState" style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 14px; box-sizing: border-box; background: white; transition: border-color 0.3s;" onfocus="this.style.borderColor='#3498db'" onblur="this.style.borderColor='#ddd'">
                            <option value="">Select State</option>
                            <option value="Andhra Pradesh">Andhra Pradesh</option>
                            <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                            <option value="Assam">Assam</option>
                            <option value="Bihar">Bihar</option>
                            <option value="Chhattisgarh">Chhattisgarh</option>
                            <option value="Goa">Goa</option>
                            <option value="Gujarat">Gujarat</option>
                            <option value="Haryana">Haryana</option>
                            <option value="Himachal Pradesh">Himachal Pradesh</option>
                            <option value="Jharkhand">Jharkhand</option>
                            <option value="Karnataka">Karnataka</option>
                            <option value="Kerala">Kerala</option>
                            <option value="Madhya Pradesh">Madhya Pradesh</option>
                            <option value="Maharashtra">Maharashtra</option>
                            <option value="Manipur">Manipur</option>
                            <option value="Meghalaya">Meghalaya</option>
                            <option value="Mizoram">Mizoram</option>
                            <option value="Nagaland">Nagaland</option>
                            <option value="Odisha">Odisha</option>
                            <option value="Punjab">Punjab</option>
                            <option value="Rajasthan">Rajasthan</option>
                            <option value="Sikkim">Sikkim</option>
                            <option value="Tamil Nadu">Tamil Nadu</option>
                            <option value="Telangana">Telangana</option>
                            <option value="Tripura">Tripura</option>
                            <option value="Uttar Pradesh">Uttar Pradesh</option>
                            <option value="Uttarakhand">Uttarakhand</option>
                            <option value="West Bengal">West Bengal</option>
                            <option value="Delhi">Delhi</option>
                            <option value="Jammu and Kashmir">Jammu and Kashmir</option>
                            <option value="Ladakh">Ladakh</option>
                        </select>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #2c3e50; font-size: 13px;">City *</label>
                        <input type="text" id="customCity" placeholder="Enter your city" style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 14px; box-sizing: border-box; transition: border-color 0.3s;" value="${userAddressData?.city || ''}" onfocus="this.style.borderColor='#3498db'" onblur="this.style.borderColor='#ddd'">
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #2c3e50; font-size: 13px;">Pincode *</label>
                        <input type="text" id="customPincode" placeholder="Enter pincode" maxlength="6" pattern="[0-9]{6}" style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 14px; box-sizing: border-box; transition: border-color 0.3s;" value="${userAddressData?.pincode || ''}" onfocus="this.style.borderColor='#3498db'" onblur="this.style.borderColor='#ddd'">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #2c3e50; font-size: 13px;">Nearby Landmark</label>
                        <input type="text" id="customNearby" placeholder="Optional landmark" style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 14px; box-sizing: border-box; transition: border-color 0.3s;" value="${userAddressData?.nearby || ''}" onfocus="this.style.borderColor='#3498db'" onblur="this.style.borderColor='#ddd'">
                    </div>
                </div>
            </div>
        </div>
        
        <div class="product-modal-buttons">
            <button class="btn-order" onclick="confirmOrderWithAddressFromCart('${productId}', ${quantity}, '${selectedSize}', ${currentPrice}, ${deliveryCharge}, ${totalAmount})" style="width: 100%; padding: 15px; font-size: 16px; font-weight: 600;">
                Confirm Order
            </button>
        </div>
    `;
    
    modal.style.display = 'flex';
    
    // Load wallet balance after modal is displayed
    loadWalletBalanceInModal();
};

// Confirm order with selected address
window.confirmOrderWithAddress = async function(productId, quantity, selectedSize, currentPrice, deliveryCharge, totalAmount) {
    const product = productsData.find(p => p.id === productId);
    if (!product) return;
    
    // Check if payment method is selected
    const selectedPaymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value;
    if (!selectedPaymentMethod) {
        showNotification('Please choose payment method', 'error');
        return;
    }
    
    let selectedAddress;
    
    try {
        // Get selected address from Firebase
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (!userDoc.exists()) {
            showNotification('❌ User data not found!', 'error');
            return;
        }
        
        const userData = userDoc.data();
        const selectedAddressId = userData.selectedAddressId;
        const userAddresses = userData.addresses || [];
        
        console.log('confirmOrderWithAddress - Address validation check:', selectedAddressId);
        console.log('confirmOrderWithAddress - Available addresses:', userAddresses);
        if (!selectedAddressId || selectedAddressId === '' || selectedAddressId === null || selectedAddressId === undefined) {
            console.log('confirmOrderWithAddress - No address selected - blocking order');
            showNotification('❌ Please select a delivery address first!', 'error', 4000);
            return;
        }
        
        selectedAddress = userAddresses.find(addr => addr.id === selectedAddressId);
        if (!selectedAddress) {
            showNotification('❌ Selected address not found!', 'error');
            return;
        }
    } catch (error) {
        console.error('Error fetching address data:', error);
        showNotification('❌ Error loading address data!', 'error');
        return;
    }
    
    // Validate selected address
    if (!selectedAddress.phone || !selectedAddress.address) {
        showNotification('❌ Selected address is incomplete. Please choose another address.', 'error');
        return;
    }
    
    const finalPhone = selectedAddress.phone;
    const finalAddress = selectedAddress.address;
    const finalGoogleMapsLink = selectedAddress.googleMapsLink || '';
    
    // Calculate discount information
    const originalPrice = product.originalPrice || product.price;
    const discount = product.discount || 0;
    
    // Create order data
    const orderData = {
        productId: product.id,
        productName: product.name,
        productPrice: currentPrice,
        originalPrice: originalPrice,
        discount: discount,
        productImage: product.imageUrl,
        productSize: selectedSize,
        quantity: quantity,
        deliveryCharge: deliveryCharge,
        totalAmount: totalAmount,
        userPhone: finalPhone,
        userAddress: finalAddress,
        userGoogleMapsLink: finalGoogleMapsLink,
        paymentMethod: selectedPaymentMethod,
        orderDate: new Date().toLocaleDateString(),
        status: 'Pending'
    };
    
    // Handle payment method
    if (selectedPaymentMethod === 'online') {
        // Open Razorpay payment modal for online payment
        openRazorpayModal(orderData, totalAmount);
    } else {
        // Cash on Delivery - Save order directly to Firebase
        const orderId = await saveOrderToFirebase(orderData);
        if (orderId) {
            // Check if this order was from cart and remove item
            if (window.orderFromCart && window.orderFromCart.productId === productId) {
                removeFromCart(window.orderFromCart.productId, window.orderFromCart.selectedSize);
                showNotification(`Order placed successfully! 🎉<br>Order ID: ${orderId}<br>Total: ₹${totalAmount}<br>Payment: Cash on Delivery<br>Item removed from cart.`, 'success', 6000);
                // Clear the cart flag
                window.orderFromCart = null;
            } else {
                showNotification(`Order placed successfully! 🎉<br>Order ID: ${orderId}<br>Total: ₹${totalAmount}<br>Payment: Cash on Delivery`, 'success', 6000);
            }
            closeConfirmOrderModal();
            closeProductModal();
        } else {
            showNotification('Error placing order. Please try again.', 'error');
        }
    }
};

// Confirm order with selected address from cart
window.confirmOrderWithAddressFromCart = async function(productId, quantity, selectedSize, currentPrice, deliveryCharge, totalAmount) {
    const product = productsData.find(p => p.id === productId);
    const cartItem = cartItems.find(item => item.id === productId);
    
    if (!product || !cartItem) {
        showNotification('Product not found in cart.', 'error');
        return;
    }
    
    // Check if payment method is selected
    const selectedPaymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value;
    if (!selectedPaymentMethod) {
        showNotification('Please choose payment method', 'error');
        return;
    }
    
    let selectedAddress;
    
    try {
        // Get selected address from Firebase
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (!userDoc.exists()) {
            showNotification('❌ User data not found!', 'error');
            return;
        }
        
        const userData = userDoc.data();
        const selectedAddressId = userData.selectedAddressId;
        const userAddresses = userData.addresses || [];
        
        console.log('confirmOrderWithAddressFromCart - Address validation check:', selectedAddressId);
        console.log('confirmOrderWithAddressFromCart - Available addresses:', userAddresses);
        if (!selectedAddressId || selectedAddressId === '' || selectedAddressId === null || selectedAddressId === undefined) {
            console.log('confirmOrderWithAddressFromCart - No address selected - blocking order');
            showNotification('❌ Please select a delivery address first!', 'error', 4000);
            return;
        }
        
        selectedAddress = userAddresses.find(addr => addr.id === selectedAddressId);
        if (!selectedAddress) {
            showNotification('❌ Selected address not found!', 'error');
            return;
        }
    } catch (error) {
        console.error('Error fetching address data:', error);
        showNotification('❌ Error loading address data!', 'error');
        return;
    }
    
    // Validate selected address
    if (!selectedAddress.phone || !selectedAddress.address) {
        showNotification('❌ Selected address is incomplete. Please choose another address.', 'error');
        return;
    }
    
    const finalPhone = selectedAddress.phone;
    const finalAddress = selectedAddress.address;
    const finalGoogleMapsLink = selectedAddress.googleMapsLink || '';
    
    // Calculate discount information
    const originalPrice = product.originalPrice || product.price;
    const discount = product.discount || 0;
    
    // Create order data
    const orderData = {
        productId: product.id,
        productName: product.name,
        productPrice: currentPrice,
        originalPrice: originalPrice,
        discount: discount,
        productImage: product.imageUrl,
        productSize: selectedSize,
        quantity: quantity,
        deliveryCharge: deliveryCharge,
        totalAmount: totalAmount,
        userPhone: finalPhone,
        userAddress: finalAddress,
        userGoogleMapsLink: finalGoogleMapsLink,
        paymentMethod: selectedPaymentMethod,
        orderDate: new Date().toLocaleDateString(),
        status: 'Pending'
    };
    
    // Handle payment method
    if (selectedPaymentMethod === 'online') {
        // Set flag to indicate this order is from cart
        window.orderFromCart = { productId: productId, selectedSize: selectedSize };
        
        // Open Razorpay payment modal for online payment
        openRazorpayModal(orderData, totalAmount);
    } else {
        // Cash on Delivery - Save order directly to Firebase
        const orderId = await saveOrderToFirebase(orderData);
        if (orderId) {
            // Remove item from cart after successful order (size-specific)
            removeFromCart(productId, selectedSize);
            showNotification(`Order placed successfully! 🎉<br>Order ID: ${orderId}<br>Total: ₹${totalAmount}<br>Payment: Cash on Delivery`, 'success', 6000);
            closeConfirmOrderModal();
            closeProductModal();
        } else {
            showNotification('Error placing order. Please try again.', 'error');
        }
    }
};

// Quantity control functions
// Size selection with buttons
window.selectSize = function(productId, selectedSize) {
    // Update hidden input
    document.getElementById(`selected-size-${productId}`).value = selectedSize;
    
    // Update button styles using CSS classes
    const sizeButtons = document.querySelectorAll(`#size-buttons-${productId} .size-btn, #sizeButtons-${productId} .size-btn`);
    sizeButtons.forEach(btn => {
        if (btn.dataset.size === selectedSize) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });
    
    // Update price and total
    updatePriceBySize(productId);
    
    // Update cart button based on new size selection
    updateProductModalButtons(productId);
};

// Update price based on selected size with discount application
window.updatePriceBySize = function(productId) {
    const product = productsData.find(p => p.id === productId);
    if (!product) return;
    
    const selectedSizeInput = document.getElementById(`selected-size-${productId}`);
    const priceContainer = document.getElementById(`price-${productId}`);
    const selectedSize = selectedSizeInput ? selectedSizeInput.value : '';
    
    let originalPrice = product.originalPrice || product.price;
    let currentPrice = product.price;
    let discount = product.discount || 0;
    
    if (selectedSize) {
        // Check if it's a regular size
        if (product.sizePricing && product.sizePricing[selectedSize]) {
            originalPrice = product.sizePricing[selectedSize];
            // Use size-specific discount if available, otherwise use general discount
            const sizeDiscount = (product.sizeDiscounts && product.sizeDiscounts[selectedSize]) ? product.sizeDiscounts[selectedSize] : discount;
            currentPrice = sizeDiscount > 0 ? originalPrice - (originalPrice * sizeDiscount / 100) : originalPrice;
        }
        // Check if it's a weight-based option
        else if (selectedSize.includes('-')) {
            const [unit, quantity] = selectedSize.split('-');
            const weightOptions = product.weightPricing[unit];
            const weightOption = weightOptions.find(item => item.quantity == quantity);
            
            if (weightOption) {
                originalPrice = weightOption.price;
                // Use weight-specific discount if available, otherwise use general discount
                const weightDiscount = weightOption.discount || discount;
                currentPrice = weightDiscount > 0 ? originalPrice - (originalPrice * weightDiscount / 100) : originalPrice;
            }
        }
    }
    
    // Update price display with size-specific discount
    let actualDiscount = discount;
    if (selectedSize) {
        if (product.sizePricing && product.sizePricing[selectedSize] && product.sizeDiscounts && product.sizeDiscounts[selectedSize]) {
            actualDiscount = product.sizeDiscounts[selectedSize];
        } else if (selectedSize.includes('-')) {
            const [unit, quantity] = selectedSize.split('-');
            const weightOptions = product.weightPricing[unit];
            const weightOption = weightOptions.find(item => item.quantity == quantity);
            if (weightOption && weightOption.discount) {
                actualDiscount = weightOption.discount;
            }
        }
    }
    
    if (originalPrice > currentPrice && actualDiscount > 0) {
        priceContainer.innerHTML = `
            <div class="special-price-label" style="color: #27ae60; font-size: 14px; font-weight: 600; margin-bottom: 5px;">Special price</div>
            <div class="price-row" style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                <span class="current-price" style="color: #27ae60; font-size: 24px; font-weight: 700;">₹${currentPrice.toFixed(2)}</span>
                <span class="original-price" style="color: #999; font-size: 18px; text-decoration: line-through;">₹${originalPrice.toFixed(2)}</span>
                <span class="discount-badge" style="background: #27ae60; color: white; padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: 600;">${actualDiscount}% off</span>
            </div>
        `;
    } else {
        priceContainer.innerHTML = `<div class="product-modal-price" style="color: #27ae60; font-size: 24px; font-weight: 700;">₹${currentPrice.toFixed(2)}</div>`;
    }
    updateTotalPrice(productId);
};

// Update total price with quantity and discount display
window.updateTotalPrice = function(productId) {
    const product = productsData.find(p => p.id === productId);
    if (!product) return;
    
    const selectedSizeInput = document.getElementById(`selected-size-${productId}`);
    // Check for both modal and regular quantity inputs
    const quantityInput = document.getElementById(`modal-quantity-${productId}`) || document.getElementById(`quantity-${productId}`);
    const totalPriceDisplayElement = document.getElementById(`total-price-display-${productId}`);
    
    if (!totalPriceDisplayElement) {
        console.log('Total price display element not found for product:', productId);
        return;
    }
    
    const selectedSize = selectedSizeInput ? selectedSizeInput.value : '';
    const quantity = parseInt(quantityInput ? quantityInput.value : 1) || 1;
    
    let originalPrice = product.originalPrice || product.price;
    let currentPrice = product.price;
    let discount = product.discount || 0;
    
    if (selectedSize) {
        // Check if it's a regular size
        if (product.sizePricing && product.sizePricing[selectedSize]) {
            originalPrice = product.sizePricing[selectedSize];
            currentPrice = discount > 0 ? originalPrice - (originalPrice * discount / 100) : originalPrice;
        }
        // Check if it's a weight-based option
        else if (selectedSize.includes('-')) {
            const [unit, quantityVal] = selectedSize.split('-');
            const weightOptions = product.weightPricing[unit];
            const weightOption = weightOptions.find(item => item.quantity == quantityVal);
            
            if (weightOption) {
                originalPrice = weightOption.price;
                currentPrice = discount > 0 ? Math.round((originalPrice - (originalPrice * discount / 100)) * 100) / 100 : originalPrice;
            }
        }
    } else {
        // No size selected, use base price with discount
        currentPrice = discount > 0 ? Math.round((originalPrice - (originalPrice * discount / 100)) * 100) / 100 : originalPrice;
    }
    
    const totalAmount = Math.round((currentPrice * quantity) * 100) / 100;
    const totalOriginalAmount = Math.round((originalPrice * quantity) * 100) / 100;
    
    // Update the entire total display with discount information
    if (originalPrice > currentPrice && discount > 0) {
        totalPriceDisplayElement.innerHTML = `
            <div style="font-size: 10px; color: #27ae60; font-weight: 600; margin-bottom: 4px;">Special Price (${quantity} items)</div>
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                <span style="color: #27ae60; font-size: 20px; font-weight: 700;">₹${totalAmount}</span>
                <span style="color: #999; font-size: 16px; text-decoration: line-through;">₹${totalOriginalAmount}</span>
                <span style="background: #27ae60; color: white; padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: 600;">${discount}% off</span>
            </div>
            <div style="font-size: 11px; color: #666; margin-top: 4px;">You save: ₹${Math.round((totalOriginalAmount - totalAmount) * 100) / 100}</div>
        `;
    } else {
        totalPriceDisplayElement.innerHTML = `
            <div style="font-size: 20px; font-weight: 700; color: #27ae60;">₹${totalAmount}</div>
            ${quantity > 1 ? `<div style="font-size: 11px; color: #666; margin-top: 4px;">${quantity} items × ₹${currentPrice} each</div>` : ''}
        `;
    }
};

window.changeQuantity = function(productId, change) {
    const quantityInput = document.getElementById(`quantity-${productId}`);
    let currentQuantity = parseInt(quantityInput.value);
    currentQuantity += change;
    
    if (currentQuantity < 1) currentQuantity = 1;
    if (currentQuantity > 10) currentQuantity = 10;
    
    quantityInput.value = currentQuantity;
    updateTotalPrice(productId);
};

// Separate function for product modal quantity controls
window.changeModalQuantity = function(productId, change) {
    const quantityInput = document.getElementById(`modal-quantity-${productId}`);
    let currentQuantity = parseInt(quantityInput.value);
    currentQuantity += change;
    
    if (currentQuantity < 1) currentQuantity = 1;
    if (currentQuantity > 10) currentQuantity = 10;
    
    quantityInput.value = currentQuantity;
    updateTotalPrice(productId);
};

// Initialize total price on modal open
function initializeTotalPrice(productId) {
    setTimeout(() => {
        console.log('Initializing total price for product:', productId);
        
        // Don't auto-select any size button - let user choose
        updateTotalPrice(productId);
    }, 200);
}

// Function to update product modal buttons based on cart status (size-specific)
function updateProductModalButtons(productId) {
    const cartBtn = document.getElementById(`cartBtn-${productId}`);
    if (!cartBtn) return;
    
    // Get currently selected size
    const selectedSizeInput = document.getElementById(`selected-size-${productId}`);
    const selectedSize = selectedSizeInput ? selectedSizeInput.value : '';
    
    // Check if this specific product with this specific size is in cart
    const isInCartWithSize = cartItems.some(item => 
        item.id === productId && item.selectedSize === selectedSize
    );
    
    if (isInCartWithSize) {
        cartBtn.textContent = 'Go to Cart';
        cartBtn.onclick = function() {
            closeProductModal();
            setActiveTab('cart');
        };
        cartBtn.style.background = '#27ae60';
        cartBtn.style.color = 'white';
    } else {
        cartBtn.textContent = 'Add to Cart';
        cartBtn.onclick = function() {
            addToCartWithQuantity(productId);
        };
        cartBtn.style.background = '#3498db';
        cartBtn.style.color = 'white';
    }
}

// Function to go to cart section
function goToCart() {
    closeProductModal();
    setActiveTab('cart');
}

// Star crystal animation function
function createStarCrystalAnimation(startElement) {
    // Get floating cart notification position (top right corner)
    const floatingCart = document.getElementById('floatingCartNotification');
    if (!floatingCart) return;

    // Get start position from the clicked button
    const startRect = startElement.getBoundingClientRect();
    const cartRect = floatingCart.getBoundingClientRect();

    // Create star crystal element
    const starCrystal = document.createElement('div');
    starCrystal.className = 'star-crystal';
    
    // Set initial position
    starCrystal.style.left = (startRect.left + startRect.width / 2) + 'px';
    starCrystal.style.top = (startRect.top + startRect.height / 2) + 'px';
    
    // Add to body
    document.body.appendChild(starCrystal);

    // Calculate trajectory
    const deltaX = (cartRect.left + cartRect.width / 2) - (startRect.left + startRect.width / 2);
    const deltaY = (cartRect.top + cartRect.height / 2) - (startRect.top + startRect.height / 2);

    // Animate to cart position
    starCrystal.animate([
        {
            transform: 'translate(0, 0) scale(1) rotate(0deg)',
            opacity: 1
        },
        {
            transform: `translate(${deltaX * 0.5}px, ${deltaY * 0.3}px) scale(1.3) rotate(180deg)`,
            opacity: 0.9
        },
        {
            transform: `translate(${deltaX}px, ${deltaY}px) scale(0.3) rotate(360deg)`,
            opacity: 0
        }
    ], {
        duration: 1000,
        easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
    }).onfinish = () => {
        starCrystal.remove();
        
        // Add floating cart bounce effect with proper class handling
        if (floatingCart) {
            // Remove any existing animation classes first
            floatingCart.classList.remove('cart-bounce');
            
            // Force reflow to ensure class removal takes effect
            floatingCart.offsetHeight;
            
            // Add bounce animation
            floatingCart.classList.add('cart-bounce');
            
            // Remove after animation completes
            setTimeout(() => {
                floatingCart.classList.remove('cart-bounce');
            }, 300);
        }
    };

    // Remove element after animation even if onfinish doesn't work
    setTimeout(() => {
        if (starCrystal.parentNode) {
            starCrystal.remove();
        }
    }, 1200);
}

// Remove duplicate - using the enhanced updateTotalPrice function above

// Helper functions for dynamic add/quantity buttons
window.getProductCartQuantity = function(productId, selectedSize = '') {
    const cartItem = cartItems.find(item => item.id === productId && item.selectedSize === selectedSize);
    return cartItem ? cartItem.quantity : 0;
};

// Get total cart quantity for a product (all sizes combined)
window.getTotalProductCartQuantity = function(productId) {
    const productCartItems = cartItems.filter(item => item.id === productId);
    return productCartItems.reduce((total, item) => total + item.quantity, 0);
};

// Open size variant modal from quantity controls
window.openQuantityVariantModal = function(productId) {
    if (!productsData || productsData.length === 0) {
        console.error('Products data not loaded yet');
        return;
    }
    const product = productsData.find(p => p.id === productId);
    if (product) {
        showSizeVariantModal(product);
    } else {
        console.error('Product not found:', productId);
    }
};

window.isProductInCart = function(productId, selectedSize = '') {
    return cartItems.some(item => item.id === productId && item.selectedSize === selectedSize);
};

window.increaseQuantity = async function(productId, selectedSize = '', event) {
    if (!currentUser) {
        showNotification('Please login or register first to continue.', 'warning');
        showLoginModal();
        return;
    }

    const product = productsData.find(p => p.id === productId);
    if (!product) return;

    console.log(`🚀 Starting quantity increase for ${product.name} (${selectedSize})`);

    // Find existing item with matching product ID and size
    const existingItem = cartItems.find(item => item.id === productId && item.selectedSize === selectedSize);
    if (existingItem) {
        console.log(`📊 Current quantity: ${existingItem.quantity}`);
        existingItem.quantity += 1;
        console.log(`🔢 Increased quantity to: ${existingItem.quantity} for ${product.name} (${selectedSize})`);
    } else {
        // Add new item with quantity 1
        cartItems.push({
            id: product.id,
            name: product.name,
            price: product.discount > 0 ? Math.round((product.originalPrice - (product.originalPrice * product.discount / 100)) * 100) / 100 : product.price,
            originalPrice: product.originalPrice || product.price,
            discount: product.discount || 0,
            imageUrl: product.imageUrl,
            quantity: 1,
            selectedSize: selectedSize || (product.sizes && product.sizes.length > 0 ? product.sizes[0] : ''),
            category: product.category
        });
        console.log(`➕ Added new item: ${product.name} (${selectedSize}) with quantity 1`);
    }

    // Set flag to prevent real-time listener conflicts
    isUpdatingQuantity = true;
    console.log('🔒 Setting quantity update flag');

    try {
        await saveCartToFirebase();
        console.log('💾 Saved to Firebase successfully');
        
        // Update UI immediately
        updateCartCount();
        updateCartDisplay();
        updateCartDisplayMain();
        updateFloatingCartNotification();
        updateAllProductButtons(true);
        updateCategoryModalButtons();
        
        // Ensure floating cart is visible after adding item and update images
        const floatingNotification = document.getElementById('floatingCartNotification');
        if (floatingNotification && cartItems.length > 0) {
            floatingNotification.classList.remove('hide');
            floatingNotification.classList.add('show');
            
            // Manually update images in floating cart
            const imagesContainer = document.getElementById('cartNotificationImages');
            if (imagesContainer) {
                imagesContainer.innerHTML = '';
                const recentItems = cartItems.slice(-3).reverse(); // Show last 3 items added
                
                recentItems.forEach(item => {
                    const img = document.createElement('img');
                    img.src = item.imageUrl;
                    img.alt = item.name;
                    img.className = 'cart-notification-image';
                    img.onerror = function() {
                        this.src = 'placeholder.jpg';
                    };
                    imagesContainer.appendChild(img);
                });
            }
        }
        
        // Create star crystal animation from the clicked + button
        const clickedButton = event && event.target ? event.target : document.querySelector(`[onclick*="increaseQuantity('${productId}')"]`);
        if (clickedButton) {
            console.log('🌟 Creating star crystal animation from quantity increase button');
            createStarCrystalAnimation(clickedButton);
        }
        
        // Debug: Check final quantity after all updates
        const finalItem = cartItems.find(item => item.id === productId && item.selectedSize === selectedSize);
        console.log(`✅ Final quantity after updates: ${finalItem ? finalItem.quantity : 'Item not found'}`);
        
        // showNotification(`${product.name} quantity increased to ${finalItem ? finalItem.quantity : '?'}!`, 'success');
        
    } catch (error) {
        console.error('❌ Error saving to Firebase:', error);
    }

    // Clear flag after a short delay to allow real-time updates
    setTimeout(() => {
        isUpdatingQuantity = false;
        console.log('🔓 Cleared quantity update flag');
    }, 2000);
};

window.decreaseQuantity = async function(productId, selectedSize = '') {
    if (!currentUser) return;

    // Find existing item with matching product ID and size
    const existingItem = cartItems.find(item => item.id === productId && item.selectedSize === selectedSize);
    if (!existingItem) return;

    // Set flag to prevent real-time listener conflicts
    isUpdatingQuantity = true;
    console.log('🔒 Setting quantity update flag for decrease');

    try {
        if (existingItem.quantity > 1) {
            existingItem.quantity -= 1;
            // showNotification(`Quantity decreased to ${existingItem.quantity}!`, 'success');
        } else {
            // Remove item from cart
            const index = cartItems.findIndex(item => item.id === productId && item.selectedSize === selectedSize);
            if (index > -1) {
                cartItems.splice(index, 1);
                // showNotification(`Item removed from cart!`, 'success');
            }
        }

        await saveCartToFirebase();
        console.log('💾 Decrease saved to Firebase successfully');
        
        // Update UI immediately
        updateCartCount();
        updateCartDisplay();
        updateCartDisplayMain();
        updateFloatingCartNotification();
        updateAllProductButtons(true);
        updateCategoryModalButtons();
        
        // Ensure floating cart is visible if items still exist and update images
        const floatingNotification = document.getElementById('floatingCartNotification');
        if (floatingNotification && cartItems.length > 0) {
            floatingNotification.classList.remove('hide');
            floatingNotification.classList.add('show');
            
            // Manually update images in floating cart
            const imagesContainer = document.getElementById('cartNotificationImages');
            if (imagesContainer) {
                imagesContainer.innerHTML = '';
                const recentItems = cartItems.slice(-3).reverse(); // Show last 3 items added
                
                recentItems.forEach(item => {
                    const img = document.createElement('img');
                    img.src = item.imageUrl;
                    img.alt = item.name;
                    img.className = 'cart-notification-image';
                    img.onerror = function() {
                        this.src = 'placeholder.jpg';
                    };
                    imagesContainer.appendChild(img);
                });
            }
        }
        
    } catch (error) {
        console.error('❌ Error saving decrease to Firebase:', error);
    }

    // Clear flag after a short delay to allow real-time updates
    setTimeout(() => {
        isUpdatingQuantity = false;
        console.log('🔓 Cleared quantity update flag after decrease');
    }, 2000);
};

window.updateAllProductCards = function() {
    // Update home page products
    if (typeof loadProductsOnHomePage === 'function') {
        loadProductsOnHomePage();
    }
    
    // Update event cards on home page
    if (typeof loadEventsOnHomePage === 'function') {
        loadEventsOnHomePage();
    }
    
    // Update search results if search section is active
    const searchSection = document.getElementById('searchSection');
    if (searchSection && searchSection.classList.contains('active')) {
        const searchInput = document.getElementById('searchInput');
        if (searchInput && searchInput.value.trim()) {
            searchProductsInSection(searchInput.value.trim());
        } else {
            loadAllProductsInSearch();
        }
    }
    
    // Update category modal if open
    const categoryModal = document.getElementById('categoryModal');
    if (categoryModal && (categoryModal.style.display === 'flex' || categoryModal.style.display === 'block')) {
        const categoryName = categoryModal.getAttribute('data-category');
        if (categoryName) {
            loadCategoryProducts(categoryName);
        }
    }
    
};

window.getAddButtonHTML = function(productId, isRelated = false, selectedSize = '') {
    // If no size specified, get default size for the product
    if (!selectedSize) {
        const product = productsData.find(p => p.id === productId);
        if (product) {
            if (product.sizes && product.sizes.length > 0) {
                selectedSize = product.sizes[0];
            } else if (product.weightPricing) {
                if (product.weightPricing.ml && product.weightPricing.ml.length > 0) {
                    selectedSize = `${product.weightPricing.ml[0].quantity}ml`;
                } else if (product.weightPricing.g && product.weightPricing.g.length > 0) {
                    selectedSize = `${product.weightPricing.g[0].quantity}g`;
                } else if (product.weightPricing.kg && product.weightPricing.kg.length > 0) {
                    selectedSize = `${product.weightPricing.kg[0].quantity}kg`;
                }
            }
        }
    }
    
    // Get total quantity for this product (all sizes combined)
    const totalQuantity = getTotalProductCartQuantity(productId);
    
    if (totalQuantity > 0) {
        // Check if product has size variants
        if (!productsData || productsData.length === 0) {
            console.warn('Products data not loaded, showing basic controls');
            return `
                <div class="quantity-controls">
                    <button class="quantity-btn" onclick="event.stopPropagation(); decreaseQuantity('${productId}', '${selectedSize}')">−</button>
                    <span class="quantity-display">${totalQuantity}</span>
                    <button class="quantity-btn" onclick="event.stopPropagation(); increaseQuantity('${productId}', '${selectedSize}', event)">+</button>
                </div>
            `;
        }
        const product = productsData.find(p => p.id === productId);
        const hasSizeVariants = checkProductHasSizeVariants(product);
        
        if (hasSizeVariants) {
            // If product has variants, show quantity controls that open size variant modal
            return `
                <div class="quantity-controls" onclick="event.stopPropagation(); openQuantityVariantModal('${productId}')">
                    <button class="quantity-btn">−</button>
                    <span class="quantity-display">${totalQuantity}</span>
                    <button class="quantity-btn">+</button>
                </div>
            `;
        } else {
            // Single variant, show normal quantity controls
            const cartItem = cartItems.find(item => item.id === productId);
            const quantity = cartItem ? cartItem.quantity : 0;
            return `
                <div class="quantity-controls">
                    <button class="quantity-btn" onclick="event.stopPropagation(); decreaseQuantity('${productId}', '${selectedSize}')">−</button>
                    <span class="quantity-display">${quantity}</span>
                    <button class="quantity-btn" onclick="event.stopPropagation(); increaseQuantity('${productId}', '${selectedSize}', event)">+</button>
                </div>
            `;
        }
    } else {
        const buttonClass = isRelated ? 'related-product-add-overlay' : 'product-add-overlay';
        return `<button class="${buttonClass}" onclick="event.stopPropagation(); handleAddToCart('${productId}')">ADD</button>`;
    }
};

// Handle Add to Cart - Check for size variants
window.handleAddToCart = function(productId) {
    const product = productsData.find(p => p.id === productId);
    if (!product) {
        showNotification('Product not found', 'error');
        return;
    }

    // Ensure cart floating box is visible when adding from related products and update images
    const floatingNotification = document.getElementById('floatingCartNotification');
    if (floatingNotification && cartItems.length > 0) {
        floatingNotification.classList.remove('hide');
        floatingNotification.classList.add('show');
        
        // Manually update images in floating cart
        const imagesContainer = document.getElementById('cartNotificationImages');
        if (imagesContainer) {
            imagesContainer.innerHTML = '';
            const recentItems = cartItems.slice(-3).reverse(); // Show last 3 items added
            
            recentItems.forEach(item => {
                const img = document.createElement('img');
                img.src = item.imageUrl;
                img.alt = item.name;
                img.className = 'cart-notification-image';
                img.onerror = function() {
                    this.src = 'placeholder.jpg';
                };
                imagesContainer.appendChild(img);
            });
        }
    }

    // Check if product has size variants
    const hasSizeVariants = checkProductHasSizeVariants(product);
    
    if (hasSizeVariants) {
        // Show size variant popup
        showSizeVariantModal(product);
    } else {
        // Get default size for the product
        let defaultSize = '';
        if (product.sizes && product.sizes.length > 0) {
            defaultSize = product.sizes[0];
        } else if (product.weightPricing) {
            if (product.weightPricing.ml && product.weightPricing.ml.length > 0) {
                defaultSize = `${product.weightPricing.ml[0].quantity}ml`;
            } else if (product.weightPricing.g && product.weightPricing.g.length > 0) {
                defaultSize = `${product.weightPricing.g[0].quantity}g`;
            } else if (product.weightPricing.kg && product.weightPricing.kg.length > 0) {
                defaultSize = `${product.weightPricing.kg[0].quantity}kg`;
            }
        }
        // Direct add to cart with default size
        addToCartWithQuantity(productId, defaultSize, 1);
    }
};

// Helper function to add pulse animation to quantity displays
function pulseQuantityDisplay(element) {
    if (element) {
        element.classList.remove('quantity-pulse');
        // Force reflow
        element.offsetHeight;
        element.classList.add('quantity-pulse');
        
        // Remove class after animation
        setTimeout(() => {
            element.classList.remove('quantity-pulse');
        }, 300);
    }
}

// Debounce mechanism for performance optimization
let updateButtonsTimeout;

// Update product buttons on all product cards
window.updateAllProductButtons = function(immediate = false) {
    if (immediate) {
        performButtonUpdate();
    } else {
        // Debounce rapid updates
        clearTimeout(updateButtonsTimeout);
        updateButtonsTimeout = setTimeout(performButtonUpdate, 50);
    }
};

function performButtonUpdate() {
    console.log('performButtonUpdate called');
    // Update main product grid buttons
    document.querySelectorAll('.product-add-overlay, .quantity-controls').forEach(element => {
        const productCard = element.closest('.product-card');
        if (productCard) {
            const productId = productCard.getAttribute('data-product-id');
            if (productId) {
                const buttonContainer = productCard.querySelector('.product-image-container');
                if (buttonContainer) {
                    // Remove existing button/controls
                    const existingButton = buttonContainer.querySelector('.product-add-overlay');
                    const existingControls = buttonContainer.querySelector('.quantity-controls');
                    if (existingButton) existingButton.remove();
                    if (existingControls) existingControls.remove();
                    
                    // Add updated button/controls
                    const newButtonHTML = getAddButtonHTML(productId, false);
                    buttonContainer.insertAdjacentHTML('beforeend', newButtonHTML);
                }
            }
        }
    });
    
    // Update related product buttons
    document.querySelectorAll('.related-product-add-overlay, .related-product-card .quantity-controls').forEach(element => {
        const relatedCard = element.closest('.related-product-card');
        if (relatedCard) {
            const productId = relatedCard.getAttribute("data-product-id");
            if (productId) {
                const buttonContainer = relatedCard.querySelector(".related-product-image-container");
                if (buttonContainer) {
                    // Remove existing button/controls
                    const existingButton = buttonContainer.querySelector(".related-product-add-overlay");
                    const existingControls = buttonContainer.querySelector(".quantity-controls");
                    if (existingButton) existingButton.remove();
                    if (existingControls) existingControls.remove();
                    
                    // Add updated button/controls
                    const newButtonHTML = getAddButtonHTML(productId, true);
                    buttonContainer.insertAdjacentHTML("beforeend", newButtonHTML);
    
    // Update category modal product buttons
    document.querySelectorAll(".category-product-add-overlay, .category-product-card .quantity-controls").forEach(element => {
        const categoryCard = element.closest(".category-product-card");
        if (categoryCard) {
            const productId = categoryCard.getAttribute("data-product-id");
            if (productId) {
                const buttonContainer = categoryCard.querySelector(".category-product-image-container");
                if (buttonContainer) {
                    // Remove existing button/controls
                    const existingButton = buttonContainer.querySelector(".category-product-add-overlay");
                    const existingControls = buttonContainer.querySelector(".quantity-controls");
                    if (existingButton) existingButton.remove();
                    if (existingControls) existingControls.remove();
                    
                    // Add updated button/controls
                    const newButtonHTML = getAddButtonHTML(productId, false);
                    buttonContainer.insertAdjacentHTML("beforeend", newButtonHTML);
                }
            }
        }
    });
                }
            }
        }
    });
}

// Dedicated function to update category modal buttons
function updateCategoryModalButtons() {
    console.log('updateCategoryModalButtons called');
    
    // Check if category modal is open
    const categoryModal = document.getElementById('categoryModal');
    if (!categoryModal || !categoryModal.classList.contains('open')) {
        return;
    }
    
    // Update all category product cards
    document.querySelectorAll('.category-product-card').forEach(categoryCard => {
        const productId = categoryCard.getAttribute('data-product-id');
        if (productId) {
            const buttonContainer = categoryCard.querySelector('.category-product-image-container');
            if (buttonContainer) {
                // Remove existing button/controls
                const existingButton = buttonContainer.querySelector('.product-add-overlay');
                const existingControls = buttonContainer.querySelector('.quantity-controls');
                if (existingButton) existingButton.remove();
                if (existingControls) existingControls.remove();
                
                // Add updated button/controls
                const newButtonHTML = getAddButtonHTML(productId, false);
                buttonContainer.insertAdjacentHTML('beforeend', newButtonHTML);
            }
        }
    });
}

// Check if product has size variants
function checkProductHasSizeVariants(product) {
    // Check for regular size pricing
    if (product.sizePricing && Object.keys(product.sizePricing).length > 0) {
        return true;
    }
    
    // Check for weight-based pricing
    if (product.weightPricing) {
        const hasWeightOptions = 
            (product.weightPricing.ml && product.weightPricing.ml.length > 0) ||
            (product.weightPricing.g && product.weightPricing.g.length > 0) ||
            (product.weightPricing.kg && product.weightPricing.kg.length > 0);
        return hasWeightOptions;
    }
    
    return false;
}

// Initialize variant quantities storage
window.variantQuantities = {};

// Get variant controls HTML based on cart state
function getVariantControlsHTML(productId, size, variantId, price) {
    // Check if this variant is already in cart
    const cartItem = cartItems.find(item => item.id === productId && item.selectedSize === size);
    
    if (cartItem && cartItem.quantity > 0) {
        // Show quantity controls if in cart
        return `
            <div class="size-variant-quantity-controls">
                <button class="size-variant-quantity-btn" onclick="event.stopPropagation(); decreaseVariantQuantity('${productId}', '${size}')">
                    −
                </button>
                <span class="size-variant-quantity-display" id="variant-qty-${variantId}">${cartItem.quantity}</span>
                <button class="size-variant-quantity-btn" onclick="event.stopPropagation(); increaseVariantQuantity('${productId}', '${size}')">
                    +
                </button>
            </div>
        `;
    } else {
        // Show ADD button if not in cart
        return `
            <button class="size-variant-add-to-cart" onclick="event.stopPropagation(); addVariantToCart('${productId}', '${size}', ${price})">
                ADD
            </button>
        `;
    }
}

// Show Size Variant Modal
window.showSizeVariantModal = function(product) {
    const modal = document.getElementById('sizeVariantModal');
    const title = document.getElementById('sizeVariantTitle');
    const body = document.getElementById('sizeVariantBody');
    
    // Store current product ID for later use
    modal.setAttribute('data-current-product-id', product.id);
    
    // Set title
    title.textContent = product.name;
    
    // Initialize variant quantities for this product
    window.variantQuantities[product.id] = {};
    
    // Generate size variants
    const variants = generateSizeVariants(product);
    
    if (variants.length === 0) {
        body.innerHTML = `
            <div class="size-variant-no-sizes">
                <p>No size variants available</p>
                <button class="size-variant-add-btn" onclick="addToCartWithQuantity('${product.id}', '', 1); closeSizeVariantModal();">Add to Cart</button>
            </div>
        `;
    } else {
        body.innerHTML = variants.map((variant, index) => {
            const variantId = `${product.id}-${variant.size}`;
            // Initialize quantity for this variant
            window.variantQuantities[product.id][variant.size] = 1;
            
            return `
                <div class="size-variant-item">
                    <div class="size-variant-info">
                        <img src="${product.imageUrl}" alt="${product.name}" class="size-variant-image" 
                             onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjZjNmNGY2Ii8+Cjx0ZXh0IHg9IjI1IiB5PSIyNSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEwIiBmaWxsPSIjOTk5YWEyIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Tm8gSW1hZ2U8L3RleHQ+Cjwvc3ZnPgo='">
                        <div class="size-variant-details">
                            <div class="size-variant-size">${variant.size}</div>
                            <div class="size-variant-price">
                                ₹${variant.price}
                                ${variant.originalPrice && variant.originalPrice > variant.price ? 
                                    `<span class="size-variant-original-price">₹${variant.originalPrice}</span>` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="size-variant-controls" id="variant-controls-${variantId}">
                        ${getVariantControlsHTML(product.id, variant.size, variantId, variant.price)}
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // Show modal with animation
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
    document.body.style.overflow = 'hidden';
};

// Increase variant quantity
window.increaseVariantQuantity = async function(productId, size) {
    // Find cart item
    const cartItem = cartItems.find(item => item.id === productId && item.selectedSize === size);
    
    if (cartItem) {
        // Increase quantity in cart (unlimited)
        cartItem.quantity += 1;
        console.log(`🔢 Variant quantity increased to: ${cartItem.quantity} for size ${size}`);
        
        // Update display
        const displayElement = document.getElementById(`variant-qty-${productId}-${size}`);
        if (displayElement) {
            displayElement.textContent = cartItem.quantity;
        }
        
        // Update cart UI
        updateCartCount();
        updateCartDisplayMain();
        
        // Product card will be updated when modal closes
        
        await saveCartToFirebase();
        
        console.log(`✅ Increased ${size} quantity to ${cartItem.quantity}`);
    }
};

// Decrease variant quantity
window.decreaseVariantQuantity = async function(productId, size) {
    // Find cart item
    const cartItem = cartItems.find(item => item.id === productId && item.selectedSize === size);
    
    if (cartItem) {
        if (cartItem.quantity > 1) {
            // Decrease quantity
            cartItem.quantity -= 1;
            
            // Update display
            const displayElement = document.getElementById(`variant-qty-${productId}-${size}`);
            if (displayElement) {
                displayElement.textContent = cartItem.quantity;
            }
            
            console.log(`Decreased ${size} quantity to ${cartItem.quantity}`);
        } else {
            // Remove from cart and convert back to ADD button
            const itemIndex = cartItems.findIndex(item => item.id === productId && item.selectedSize === size);
            if (itemIndex > -1) {
                cartItems.splice(itemIndex, 1);
            }
            
            // Convert back to ADD button
            const variantId = `${productId}-${size}`;
            const controlsContainer = document.getElementById(`variant-controls-${variantId}`);
            
            if (controlsContainer) {
                // Get product price for ADD button
                const product = productsData.find(p => p.id === productId);
                let price = product ? product.price : 0;
                
                // Check for size-specific pricing
                if (product && product.sizePricing && product.sizePricing[size]) {
                    price = product.sizePricing[size];
                    if (product.discount) {
                        price = price * (1 - product.discount / 100);
                    }
                }
                
                controlsContainer.innerHTML = `
                    <button class="size-variant-add-to-cart" onclick="event.stopPropagation(); addVariantToCart('${productId}', '${size}', ${price})">
                        ADD
                    </button>
                `;
            }
            
            console.log(`Removed ${size} from cart`);
        }
        
        // Update cart UI
        updateCartCount();
        updateCartDisplayMain();
        
        // Product card will be updated when modal closes
        
        await saveCartToFirebase();
    }
};

// Generate size variants for a product
function generateSizeVariants(product) {
    const variants = [];
    
    // Add regular size variants
    if (product.sizePricing) {
        Object.entries(product.sizePricing).forEach(([size, originalPrice]) => {
            const discount = product.discount || 0;
            const price = discount > 0 ? 
                Math.round((originalPrice - (originalPrice * discount / 100)) * 100) / 100 : 
                originalPrice;
            
            variants.push({
                size: size,
                price: price,
                originalPrice: originalPrice
            });
        });
    }
    
    // Add weight-based variants
    if (product.weightPricing) {
        ['ml', 'g', 'kg'].forEach(unit => {
            if (product.weightPricing[unit] && product.weightPricing[unit].length > 0) {
                product.weightPricing[unit].forEach(weightOption => {
                    const discount = product.discount || 0;
                    const price = discount > 0 ? 
                        Math.round((weightOption.price - (weightOption.price * discount / 100)) * 100) / 100 : 
                        weightOption.price;
                    
                    variants.push({
                        size: `${weightOption.quantity}${unit}`,
                        price: price,
                        originalPrice: weightOption.price
                    });
                });
            }
        });
    }
    
    return variants;
}

// Add variant to cart and convert ADD button to quantity controls
window.addVariantToCart = function(productId, size, price) {
    console.log(`Adding ${size} of product ${productId} to cart`);
    
    // Add to cart with quantity 1
    addToCartWithQuantity(productId, size, 1);
    
    // Update the controls for this variant
    const variantId = `${productId}-${size}`;
    const controlsContainer = document.getElementById(`variant-controls-${variantId}`);
    
    if (controlsContainer) {
        // Replace ADD button with quantity controls
        controlsContainer.innerHTML = `
            <div class="size-variant-quantity-controls">
                <button class="size-variant-quantity-btn" onclick="event.stopPropagation(); decreaseVariantQuantity('${productId}', '${size}')">
                    −
                </button>
                <span class="size-variant-quantity-display" id="variant-qty-${variantId}">1</span>
                <button class="size-variant-quantity-btn" onclick="event.stopPropagation(); increaseVariantQuantity('${productId}', '${size}')">
                    +
                </button>
            </div>
        `;
    }
    
    // Update product cards immediately
    updateAllProductButtons(true);
    
    // Don't close modal - let user continue adding other variants
};

// Close Size Variant Modal
window.closeSizeVariantModal = function(event) {
    if (event && event.target !== event.currentTarget) return;
    
    const modal = document.getElementById('sizeVariantModal');
    
    // Get current product ID and update its card
    const currentProductId = modal.getAttribute('data-current-product-id');
    if (currentProductId) {
        console.log('🔄 Refreshing product card on modal close for:', currentProductId);
        
        // Use the same refresh method as normal add to cart
        setTimeout(() => {
            console.log('🔄 Refreshing ALL product cards (same as add to cart)...');
            
            // Method 1: Update cart count and display
            updateCartCount();
            updateCartDisplayMain();
            
            // Method 2: Update ALL product cards (exactly like normal add to cart)
            updateAllProductButtons(true);
            
            // Method 3: Update floating cart notification
            updateFloatingCartNotification();
            
            console.log('✅ All product cards refreshed successfully!');
        }, 50);
    }
    
    // Remove show class for animation
    modal.classList.remove('show');
    
    // Hide modal after animation completes
    setTimeout(() => {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }, 300);
};

// Test function for size variants (for debugging)
window.testSizeVariants = function() {
    console.log('Testing size variants functionality...');
    
    // Create a test product with size variants
    const testProduct = {
        id: 'test-product',
        name: 'Test Product with Sizes',
        imageUrl: 'https://via.placeholder.com/200x200/fbbf24/ffffff?text=Test+Product',
        price: 100,
        originalPrice: 150,
        discount: 20,
        sizePricing: {
            'S': 100,
            'M': 120,
            'L': 140,
            'XL': 160
        },
        weightPricing: {
            ml: [
                { quantity: 100, price: 50 },
                { quantity: 250, price: 120 }
            ],
            g: [
                { quantity: 500, price: 200 },
                { quantity: 1000, price: 350 }
            ]
        }
    };
    
    console.log('Test product:', testProduct);
    console.log('Has size variants:', checkProductHasSizeVariants(testProduct));
    
    // Show the modal
    showSizeVariantModal(testProduct);
};

// Updated cart and order functions with quantity
window.addToCartWithQuantity = async function(productId, selectedSize = '', quantity = 1) {
    // Check if user is logged in
    if (!currentUser) {
        // User not logged in, show login modal
        document.getElementById('loginModal').style.display = 'flex';
        // Hide bottom navbar when modal opens
        const bottomNav = document.querySelector('.app-bottom-nav');
        if (bottomNav) {
            bottomNav.style.display = 'none';
        }
        return;
    }
    
    const product = productsData.find(p => p.id === productId);
    if (!product) {
        showNotification('Product not found!', 'error');
        return;
    }
    
    // For direct add to cart from product cards, use default values
    // Check for both modal and regular quantity inputs
    const quantityInput = document.getElementById(`modal-quantity-${productId}`) || document.getElementById(`quantity-${productId}`);
    if (quantityInput) {
        quantity = parseInt(quantityInput.value) || 1;
    }
    
    // Get selected size if available, otherwise use default
    // If selectedSize is already provided (from size variant modal), use it directly
    if (!selectedSize) {
        const selectedSizeInput = document.getElementById(`selected-size-${productId}`);
        
        // If no size input found (direct add from cards), use first available size or empty
        if (!selectedSizeInput) {
            if (product.sizes && product.sizes.length > 0) {
                selectedSize = product.sizes[0];
            } else if (product.weightPricing) {
                if (product.weightPricing.ml && product.weightPricing.ml.length > 0) {
                    selectedSize = `${product.weightPricing.ml[0].quantity}ml`;
                } else if (product.weightPricing.g && product.weightPricing.g.length > 0) {
                    selectedSize = `${product.weightPricing.g[0].quantity}g`;
                } else if (product.weightPricing.kg && product.weightPricing.kg.length > 0) {
                    selectedSize = `${product.weightPricing.kg[0].quantity}kg`;
                }
            }
        } else {
            selectedSize = selectedSizeInput.value;
            if (!selectedSize && ((product.sizes && product.sizes.length > 0) || (product.weightPricing && (product.weightPricing.ml.length > 0 || product.weightPricing.g.length > 0 || product.weightPricing.kg.length > 0)))) {
                showNotification('Please select a size/quantity before adding to cart.', 'warning');
                return;
            }
        }
    }
    
    if (product) {
        // Get size-specific price with discount application
        let originalPrice = product.originalPrice || product.price;
        let currentPrice = product.price; // base price
        let discount = product.discount || 0;
        
        if (selectedSize) {
            // Check if it's a regular size
            if (product.sizePricing && product.sizePricing[selectedSize]) {
                originalPrice = product.sizePricing[selectedSize];
                currentPrice = discount > 0 ? Math.round((originalPrice - (originalPrice * discount / 100)) * 100) / 100 : originalPrice;
            }
            // Check if it's a weight-based option
            else if (selectedSize.includes('-')) {
                const [unit, quantity] = selectedSize.split('-');
                const weightOptions = product.weightPricing[unit];
                const weightOption = weightOptions.find(item => item.quantity == quantity);
                
                if (weightOption) {
                    originalPrice = weightOption.price;
                    currentPrice = discount > 0 ? Math.round((originalPrice - (originalPrice * discount / 100)) * 100) / 100 : originalPrice;
                }
            }
        } else {
            // No size selected, use base price with discount
            currentPrice = discount > 0 ? Math.round((originalPrice - (originalPrice * discount / 100)) * 100) / 100 : originalPrice;
        }
        
        const existingItem = cartItems.find(item => item.id === productId && item.selectedSize === selectedSize);
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            cartItems.push({
                id: product.id,
                name: product.name,
                price: currentPrice, // This is now the discounted price
                originalPrice: originalPrice,
                discount: discount,
                imageUrl: product.imageUrl,
                quantity: quantity,
                selectedSize: selectedSize,
                category: product.category
            });
        }
        
        updateCartCount();
        await saveCartToFirebase();
        
        // Create flying star crystal animation
        createFlyingStarCrystal(productId);
        
        // Update floating cart notification
        updateFloatingCartNotification();
        
        // Force show floating cart after adding item and update images
        const floatingNotification = document.getElementById('floatingCartNotification');
        if (floatingNotification && cartItems.length > 0) {
            floatingNotification.classList.remove('hide');
            floatingNotification.classList.add('show');
            
            // Manually update images in floating cart
            const imagesContainer = document.getElementById('cartNotificationImages');
            if (imagesContainer) {
                imagesContainer.innerHTML = '';
                const recentItems = cartItems.slice(-3).reverse(); // Show last 3 items added
                
                recentItems.forEach(item => {
                    const img = document.createElement('img');
                    img.src = item.imageUrl;
                    img.alt = item.name;
                    img.className = 'cart-notification-image';
                    img.onerror = function() {
                        this.src = 'placeholder.jpg';
                    };
                    imagesContainer.appendChild(img);
                });
            }
        }
        
        const sizeText = selectedSize ? ` (${selectedSize})` : '';
        showNotification(`${quantity} x ${product.name}${sizeText} added to cart!`, 'success');
        
        // Update floating cart notification
        updateFloatingCartNotification();
        
        // Update all product buttons
        updateAllProductButtons(true);
        
        // Update category modal product buttons specifically
        updateCategoryModalButtons();
        
        // Create star crystal animation from the clicked button
        const clickedButton = event && event.target ? event.target : document.querySelector(`[onclick*="addToCartWithQuantity('${productId}')"]`);
        if (clickedButton) {
            createStarCrystalAnimation(clickedButton);
        }
        
        // Update button state after adding to cart
        updateProductModalButtons(productId);
    }
};

let orderItems = [];

// Flying Star Crystal Animation Function
window.createFlyingStarCrystal = function(productId) {
    const productElement = document.querySelector(`#cartBtn-${productId}`) ||
                         document.querySelector('.product-modal-buttons .btn-cart') ||
                         document.querySelector(`[data-product-id="${productId}"]`);
    
    if (!productElement) return;
    
    const rect = productElement.getBoundingClientRect();
    const startX = rect.left + rect.width / 2;
    const startY = rect.top + rect.height / 2;
    
    // Get cart notification position
    const cartNotification = document.getElementById('floatingCartNotification');
    const cartRect = cartNotification.getBoundingClientRect();
    const endX = cartRect.left + cartRect.width / 2;
    const endY = cartRect.top + cartRect.height / 2;
    
    // Check if it's from product modal (bigger yellow star)
    const isFromModal = productElement.classList.contains('btn-cart') || 
                       productElement.closest('.product-modal-buttons');
    
    // Create star crystal element
    const starCrystal = document.createElement('div');
    starCrystal.className = isFromModal ? 'flying-star-crystal yellow-star' : 'flying-star-crystal';
    starCrystal.innerHTML = isFromModal ? '⭐' : '✨';
    starCrystal.style.left = startX + 'px';
    starCrystal.style.top = startY + 'px';
    
    // Calculate animation path
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    
    document.body.appendChild(starCrystal);
    
    // Animate to cart with enhanced animation for modal
    setTimeout(() => {
        if (isFromModal) {
            // Big yellow star with enhanced animation
            starCrystal.style.transition = 'all 2s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            starCrystal.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(0.2) rotate(720deg)`;
            starCrystal.style.opacity = '0';
        } else {
            // Regular star animation
            starCrystal.style.transition = 'all 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            starCrystal.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(0.5) rotate(360deg)`;
            starCrystal.style.opacity = '0';
        }
    }, 50);
    
    // Remove element after animation
    setTimeout(() => {
        if (starCrystal.parentNode) {
            starCrystal.parentNode.removeChild(starCrystal);
        }
    }, isFromModal ? 2100 : 1600);
};

// Update Floating Cart Notification Function
window.updateFloatingCartNotification = function() {
    const notification = document.getElementById('floatingCartNotification');
    const countElement = document.getElementById('cartNotificationCount');
    const imagesContainer = document.getElementById('cartNotificationImages');
    
    if (!notification) return;
    
    // Check if we're in cart section
    const currentSection = document.querySelector('.app-section.active');
    const isInCartSection = currentSection && currentSection.id === 'cartSection';
    
    // Hide floating cart ONLY if cart is empty OR in cart section (not in any modal)
    if (cartItems.length === 0) {
        notification.classList.remove('show');
        notification.classList.add('hide');
        return;
    }
    
    // Hide only in cart section (not in modals)
    if (isInCartSection) {
        const productModal = document.getElementById('productModal');
        const isProductModalOpen = productModal && productModal.style.display === 'block';
        
        // Hide only if in cart section AND no modal is open
        if (!isProductModalOpen) {
            notification.classList.remove('show');
            notification.classList.add('hide');
            return;
        }
    }
    
    // Update count
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    countElement.textContent = totalItems === 1 ? '1 item' : `${totalItems} items`;

    // Update total amount
    const totalAmount = cartItems.reduce((sum, item) => Math.round((sum + (item.price * item.quantity)) * 100) / 100, 0);
    const totalElement = document.getElementById('cartNotificationTotal');
    if (totalElement) {
        totalElement.textContent = `₹${totalAmount}`;
    }
    
    // Update product images (show max 3 recent items)
    imagesContainer.innerHTML = '';
    const recentItems = cartItems.slice(-3).reverse(); // Show last 3 items added
    
    recentItems.forEach(item => {
        const img = document.createElement('img');
        img.src = item.imageUrl;
        img.alt = item.name;
        img.className = 'cart-notification-image';
        img.onerror = function() {
            this.src = 'placeholder.jpg';
        };
        imagesContainer.appendChild(img);
    });
    
    // Show notification - always visible except in cart section
    notification.classList.remove('hide');
    notification.classList.add('show');
};

// Redirect to Cart Function
window.redirectToCart = function() {
    setActiveTab('cart');
    const notification = document.getElementById('floatingCartNotification');
    notification.classList.remove('show');
};

// Custom notification system
function showNotification(message, type = 'success', duration = 4000) {
    const container = document.getElementById('notificationContainer');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    notification.innerHTML = `
        <button class="notification-close" onclick="this.parentElement.remove()">&times;</button>
        ${message}
    `;
    
    container.appendChild(notification);
    
    // Show notification with animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // Auto remove after duration
    setTimeout(() => {
        if (notification.parentElement) {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        }
    }, duration);
}

// Order function specifically for cart items (like checkout but for single item)
window.orderFromCart = async function(productId) {
    const product = productsData.find(p => p.id === productId);
    const cartItem = cartItems.find(item => item.id === productId);
    
    if (!product || !cartItem) {
        showNotification('Product not found in cart.', 'error');
        return;
    }
    
    // Reload user address data to ensure it's current
    await loadUserAddressFromFirebase();
    
    // Check if user has address saved with stricter validation
    if (!userAddressData || 
        !userAddressData.phone || 
        !userAddressData.address || 
        userAddressData.phone.trim() === '' || 
        userAddressData.address.trim() === '') {
        
        showNotification('❌ Order cannot be placed!<br><br>📍 Please add your delivery address first:<br>1. Go to Profile section<br>2. Click "Edit Address"<br>3. Fill phone number and address<br>4. Save and try ordering again', 'error', 8000);
        
        // Automatically switch to profile section
        setTimeout(async () => {
            await setActiveTab('profile');
        }, 1000);
        return;
    }
    
    // Use the cart item's price (which already has size-based pricing)
    const deliveryCharge = product.deliveryCharge || 0;
    const orderData = {
        productId: product.id,
        productName: product.name,
        productPrice: cartItem.price, // This is the discounted price
        originalPrice: cartItem.originalPrice || cartItem.price,
        discount: cartItem.discount || 0,
        productImage: product.imageUrl,
        productSize: cartItem.selectedSize || '',
        quantity: cartItem.quantity,
        deliveryCharge: deliveryCharge,
        totalAmount: Math.round(((cartItem.price * cartItem.quantity) + deliveryCharge) * 100) / 100, // Total with discounted price
        userPhone: userAddressData ? userAddressData.phone : 'Not provided',
        userAddress: userAddressData ? userAddressData.address : 'Not provided',
        orderDate: new Date().toLocaleDateString(),
        status: 'Pending',
        orderType: 'Single Item Order'
    };
    
    // Remove item from cart immediately for real-time effect
    const itemIndex = cartItems.findIndex(item => item.id === productId);
    if (itemIndex > -1) {
        cartItems.splice(itemIndex, 1);
        updateCartCount();
        updateCartDisplay();
        updateCartDisplayMain();
    }
    
    // Close modal immediately
    closeProductModal();
    
    try {
        // Save order to Firebase
        const orderId = await saveOrderToFirebase(orderData);
        
        if (orderId) {
            // Update cart in Firebase
            await saveCartToFirebase();
            
            // Refresh Orders section in real-time
            await loadOrdersDataFromFirebase();
            
            // Show success message
            showNotification(`Order placed successfully!<br><br>Product: ${product.name}<br>Quantity: ${cartItem.quantity}<br>Total: ₹${orderData.totalAmount}`, 'success');
            
            console.log('Order placed:', orderData);
        } else {
            // If order failed, add item back to cart
            cartItems.push(cartItem);
            updateCartCount();
            updateCartDisplay();
            updateCartDisplayMain();
            showNotification('Failed to place order. Please try again.', 'error');
        }
    } catch (error) {
        // If error, add item back to cart
        cartItems.push(cartItem);
        updateCartCount();
        updateCartDisplay();
        updateCartDisplayMain();
        console.error('Order error:', error);
        showNotification('Error placing order. Please try again.', 'error');
    }
};

window.orderNowWithQuantity = async function(productId) {
    const product = productsData.find(p => p.id === productId);
    // Check for both modal and regular quantity inputs
    const quantityInput = document.getElementById(`modal-quantity-${productId}`) || document.getElementById(`quantity-${productId}`);
    const quantity = parseInt(quantityInput.value) || 1;
    
    // Get selected size if available
    let selectedSize = '';
    const sizeSelect = document.getElementById(`size-${productId}`);
    if (sizeSelect && product.sizes && product.sizes.length > 0) {
        selectedSize = sizeSelect.value;
        if (!selectedSize) {
            showNotification('Please select a size before placing order.', 'warning');
            return;
        }
    }
    
    if (product) {
        // Reload user address data to ensure it's current
        await loadUserAddressFromFirebase();
        
        // Check if user has address saved with stricter validation
        if (!userAddressData || 
            !userAddressData.phone || 
            !userAddressData.address || 
            userAddressData.phone.trim() === '' || 
            userAddressData.address.trim() === '') {
            
            showNotification('❌ Order cannot be placed!<br><br>📍 Please add your delivery address first:<br>1. Go to Profile section<br>2. Click "Edit Address"<br>3. Fill phone number and address<br>4. Save and try ordering again', 'error', 8000);
            
            // Automatically switch to profile section
            setTimeout(() => {
                setActiveTab('profile');
            }, 1000);
            return;
        }
        
        // Get size-specific price
        let currentPrice = product.price; // base price
        if (selectedSize && product.sizePricing && product.sizePricing[selectedSize]) {
            currentPrice = product.sizePricing[selectedSize];
        }
        
        const deliveryCharge = product.deliveryCharge || 0;
        
        // Calculate discount information
        const originalPrice = product.price;
        const discount = product.discount || 0;
        
        const orderData = {
            productId: product.id,
            productName: product.name,
            productPrice: currentPrice,
            originalPrice: originalPrice,
            discount: discount,
            productImage: product.imageUrl,
            productSize: selectedSize,
            quantity: quantity,
            deliveryCharge: deliveryCharge,
            totalAmount: Math.round(((currentPrice * quantity) + deliveryCharge) * 100) / 100,
            userPhone: userAddressData.phone,
            userAddress: `${userAddressData.address}, ${userAddressData.city}, ${userAddressData.state} - ${userAddressData.pincode}${userAddressData.nearby ? ', Near ' + userAddressData.nearby : ''}`,
            orderDate: new Date().toLocaleDateString(),
            status: 'Pending'
        };
        
        const orderId = await saveOrderToFirebase(orderData);
        if (orderId) {
            showNotification(`Order placed successfully! 🎉<br>Order ID: ${orderId}<br>Total: ₹${orderData.totalAmount}`, 'success', 6000);
            closeProductModal();
        } else {
            showNotification('Error placing order. Please try again.', 'error');
        }
    }
};

// Close modal when clicking outside
document.addEventListener('click', function(event) {
    const modal = document.getElementById('productModal');
    if (event.target === modal) {
        closeProductModal();
    }
});

// Show all products when clicking outside categories
window.showAllProducts = function() {
    selectedCategory = '';
    updateProductsDisplay();
};

// Cart functionality - redirect to cart page
window.openCart = function() {
    setActiveTab('cart');
};

window.closeCart = function() {
    // No longer needed - cart sidebar removed
};

window.addToCart = async function(productId, event) {
    if (!currentUser) {
        showNotification('Please login or register to add items to cart! 🔐', 'warning', 4000);
        showLoginModal();
        return;
    }
    
    const product = productsData.find(p => p.id === productId);
    if (product) {
        const existingItem = cartItems.find(item => item.id === productId);
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cartItems.push({
                id: product.id,
                name: product.name,
                price: product.price,
                imageUrl: product.imageUrl,
                quantity: 1
            });
        }
        updateCartCount();
        updateCartDisplay();
        updateCartDisplayMain();
        await saveCartToFirebase();
        
        // Create star crystal animation from the clicked button
        const clickedButton = event && event.target ? event.target : document.querySelector(`[onclick*="addToCart('${productId}')"]`);
        if (clickedButton) {
            console.log('🌟 Creating star crystal animation from product card add button');
            createStarCrystalAnimation(clickedButton);
        }
        
        // Update floating cart notification
        updateFloatingCartNotification();
        
        // Update category modal buttons
        updateCategoryModalButtons();
        
        // showNotification(`${product.name} added to cart! 🛒`, 'success');
    }
};

// Cancel Order Function
window.cancelOrder = async function(orderId) {
    const result = await cancelOrderFromFirebase(orderId);
    
    if (result.success) {
        let message = 'Order cancelled successfully! ❌';
        
        // Add total amount refund info for online payments
        if (result.totalAmountRefunded > 0) {
            message += `<br>💳 ₹${result.totalAmountRefunded} added to your cashback wallet (Online payment refund)`;
        }
        
        // Add wallet refund info if applicable
        if (result.walletRefunded > 0) {
            message += `<br>💰 ₹${result.walletRefunded} refunded to your wallet`;
        }
        
        // Add cashback deduction info if applicable
        if (result.cashbackDeducted > 0) {
            message += `<br>📉 ₹${result.cashbackDeducted} earned cashback deducted`;
        }
        
        showNotification(message, 'success', 5000);
        loadOrdersDataFromFirebase(); // Refresh orders list
    } else {
        const errorMessage = result.message || 'Error cancelling order. Please try again.';
        showNotification(errorMessage, 'error', 3000);
    }
};




function updateCartCount() {
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    
    // Update bottom navbar cart count
    const cartCountBottom = document.getElementById('cartCountBottom');
    if (cartCountBottom) {
        cartCountBottom.textContent = totalItems;
        cartCountBottom.style.display = totalItems > 0 ? 'flex' : 'none';
    }
}

function updateCartDisplay() {
    const cartItemsContainer = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');
    const cartTotalAmount = document.getElementById('cartTotalAmount');
    
    // Check if elements exist before manipulating them
    if (!cartItemsContainer || !cartTotal || !cartTotalAmount) {
        console.log('Cart sidebar elements not found in DOM');
        return;
    }
    
    if (cartItems.length === 0) {
        cartItemsContainer.innerHTML = '<div class="cart-empty">🛒 Your cart is empty<br><small style="color: #999; font-size: 10px;">Browse our products and add items to see them here</small></div>';
        cartTotal.style.display = 'none';
        return;
    }
    
    cartItemsContainer.innerHTML = '';
    let total = 0;
    
    cartItems.forEach(item => {
        total += Math.round((item.price * item.quantity) * 100) / 100;
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <img src="${item.imageUrl}" alt="${item.name}" class="cart-item-image" onclick="openProductModalFromCart('${item.id}')" style="cursor: pointer;">
            <div class="cart-item-info" onclick="openProductModalFromCart('${item.id}')" style="cursor: pointer;">
                <div class="cart-item-name">${item.name}</div>
                <div class="product-rating" style="color: #fbbf24; font-size: 10px; margin: 2px 0;">
                    ${'⭐'.repeat(item.rating || 0)} ${item.rating ? `(${item.rating})` : ''}
                </div>
                <div style="color: #666; font-size: 10px; margin-top: 4px;">Size: ${item.selectedSize || 'N/A'}</div>
            </div>
            <div class="cart-item-controls">
                <div class="cart-quantity-controls">
                    <button class="quantity-btn" onclick="decreaseQuantity('${item.id}', '${item.selectedSize}')" ${item.quantity <= 1 ? 'disabled' : ''}>-</button>
                    <span class="quantity-display">${item.quantity}</span>
                    <button class="quantity-btn" onclick="increaseQuantity('${item.id}', '${item.selectedSize}', event)">+</button>
                </div>
                <button class="cart-item-remove" onclick="removeFromCart('${item.id}', '${item.selectedSize}')">Remove</button>
            </div>
        `;
        cartItemsContainer.appendChild(cartItem);
    });
    
    cartTotalAmount.textContent = `Total: ₹${Math.round(total * 100) / 100}`;
    cartTotal.style.display = 'block';
}

// Update cart display for main page section
function updateCartDisplayMain() {
    const cartItemsContainer = document.getElementById('cartItemsMain');
    const cartTotal = document.getElementById('cartTotalMain');
    const cartTotalAmount = document.getElementById('cartTotalAmountMain');
    
    // Check if elements exist before manipulating them
    if (!cartItemsContainer || !cartTotal || !cartTotalAmount) {
        console.log('Cart display elements not found in DOM');
        return;
    }
    
    if (cartItems.length === 0) {
        cartItemsContainer.innerHTML = '<div class="cart-empty-main">🛒 Your cart is empty<br>Add some products to get started!<br><small style="color: #999; font-size: 10px;">Browse our products and add items to see them here</small></div>';
        cartTotal.style.display = 'none';
        return;
    }
    
    cartItemsContainer.innerHTML = '';
    let total = 0;
    
    cartItems.forEach(item => {
        total += Math.round((item.price * item.quantity) * 100) / 100;
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item-main';
        cartItem.innerHTML = `
            <img src="${item.imageUrl}" alt="${item.name}" class="cart-item-image-main" onclick="openProductModalFromCart('${item.id}')">
            <div class="cart-item-info-main" onclick="openProductModalFromCart('${item.id}')">
                <div class="cart-item-name-main">${item.name}</div>
                <div class="product-rating" style="color: #fbbf24; font-size: 10px; margin: 2px 0;">
                    ${'⭐'.repeat(item.rating || 0)} ${item.rating ? `(${item.rating})` : ''}
                </div>
                <div style="color: #666; font-size: 13px; margin-top: 4px;">Size: ${item.selectedSize || 'N/A'}</div>
            </div>
            <div class="cart-item-controls-main">
                <div class="cart-quantity-controls-main">
                    <button class="quantity-btn-main" onclick="decreaseQuantity('${item.id}', '${item.selectedSize}')" ${item.quantity <= 1 ? 'disabled' : ''}>-</button>
                    <span class="quantity-display-main">${item.quantity}</span>
                    <button class="quantity-btn-main" onclick="increaseQuantity('${item.id}', '${item.selectedSize}', event)">+</button>
                </div>
                <button class="cart-item-remove-main" onclick="removeFromCart('${item.id}', '${item.selectedSize}')">Remove</button>
            </div>
        `;
        cartItemsContainer.appendChild(cartItem);
    });
    
    cartTotalAmount.textContent = `Total: ₹${Math.round(total * 100) / 100}`;
    cartTotal.style.display = 'block';
}

window.removeFromCart = async function(productId, size) {
    const removedItem = cartItems.find(item => item.id === productId && item.selectedSize === size);
    cartItems = cartItems.filter(item => !(item.id === productId && item.selectedSize === size));
    updateCartCount();
    updateCartDisplay();
    updateCartDisplayMain();
    await saveCartToFirebase();
    
    // Update floating cart notification
    updateFloatingCartNotification();
    
    // Update category modal buttons
    updateCategoryModalButtons();
    
    // Show removal notification
    if (removedItem) {
        // showNotification(`${removedItem.name} (${size}) removed from cart! 🗑️`, 'success');
    }
};


window.checkout = async function() {
    if (cartItems.length === 0) {
        showNotification('Your cart is empty! 🛒', 'warning');
        return;
    }
    
    // Reload user address data to ensure it's current
    await loadUserAddressFromFirebase();
    
    // Check if user has address saved with stricter validation
    if (!userAddressData || 
        !userAddressData.phone || 
        !userAddressData.address || 
        userAddressData.phone.trim() === '' || 
        userAddressData.address.trim() === '') {
        
        showNotification('❌ Order cannot be placed!<br><br>📍 Please add your delivery address first:<br>1. Go to Profile section<br>2. Click "Edit Address"<br>3. Fill phone number and address<br>4. Save and try ordering again', 'error', 8000);
        
        // Automatically switch to profile section
        setTimeout(async () => {
            await setActiveTab('profile');
        }, 1000);
        return;
    }
    
    const total = cartItems.reduce((sum, item) => {
        const product = productsData.find(p => p.id === item.id);
        const deliveryCharge = product ? (product.deliveryCharge || 0) : 0;
        return Math.round((sum + (item.price * item.quantity) + deliveryCharge) * 100) / 100;
    }, 0);
    
    // Create order for each cart item
    const orderPromises = cartItems.map(item => {
        const product = productsData.find(p => p.id === item.id);
        const deliveryCharge = product ? (product.deliveryCharge || 0) : 0;
        const orderData = {
            productId: item.id,
            productName: item.name,
            productPrice: item.price, // This is the discounted price
            originalPrice: item.originalPrice || item.price,
            discount: item.discount || 0,
            productImage: item.imageUrl,
            productSize: item.selectedSize || '',
            quantity: item.quantity,
            deliveryCharge: deliveryCharge,
            totalAmount: Math.round(((item.price * item.quantity) + deliveryCharge) * 100) / 100, // Total with discounted price
            userPhone: userAddressData.phone,
            userAddress: `${userAddressData.address}, ${userAddressData.city}, ${userAddressData.state} - ${userAddressData.pincode}${userAddressData.nearby ? ', Near ' + userAddressData.nearby : ''}`,
            orderDate: new Date().toLocaleDateString(),
            status: 'Pending',
            orderType: 'Cart Checkout'
        };
        return saveOrderToFirebase(orderData);
    });
    
    try {
        const orderIds = await Promise.all(orderPromises);
        const successfulOrders = orderIds.filter(id => id);
        
        if (successfulOrders.length === cartItems.length) {
            showNotification(`Checkout successful! 🎉<br>${successfulOrders.length} orders placed<br>Total amount: ₹${total}`, 'success', 6000);
            cartItems = [];
            updateCartCount();
            updateCartDisplay();
            updateCartDisplayMain();
            await saveCartToFirebase(); // Clear cart in Firebase
            
            // Refresh Orders section in real-time
            await loadOrdersDataFromFirebase();
            
            closeCart();
        } else {
            showNotification('Some orders failed to process. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Checkout error:', error);
        showNotification('Error during checkout. Please try again.', 'error');
    }
};

window.orderNow = async function(productId) {
    if (!currentUser) {
        showNotification('Please login or register to place orders! 🔐', 'warning', 4000);
        showLoginModal();
        return;
    }
    
    const product = productsData.find(p => p.id === productId);
    if (product) {
        // Reload user address data to ensure it's current
        await loadUserAddressFromFirebase();
        
        // Check if user has address saved with stricter validation
        if (!userAddressData || 
            !userAddressData.phone || 
            !userAddressData.address || 
            userAddressData.phone.trim() === '' || 
            userAddressData.address.trim() === '') {
            
            showNotification('❌ Order cannot be placed!<br><br>📍 Please add your delivery address first:<br>1. Go to Profile section<br>2. Click "Edit Address"<br>3. Fill phone number and address<br>4. Save and try ordering again', 'error', 8000);
            
            // Automatically switch to profile section
            setTimeout(() => {
                setActiveTab('profile');
            }, 1000);
            return;
        }
        
        const orderData = {
            productId: product.id,
            productName: product.name,
            productPrice: product.price,
            originalPrice: product.originalPrice || product.price,
            discount: product.discount || 0,
            productImage: product.imageUrl,
            quantity: 1,
            totalAmount: product.price,
            userPhone: userAddressData.phone,
            userAddress: `${userAddressData.address}, ${userAddressData.city}, ${userAddressData.state} - ${userAddressData.pincode}${userAddressData.nearby ? ', Near ' + userAddressData.nearby : ''}`,
            orderDate: new Date().toLocaleDateString(),
            status: 'Pending'
        };
        
        const orderId = await saveOrderToFirebase(orderData);
        if (orderId) {
            showNotification(`Order placed successfully! 🎉<br>Order ID: ${orderId}<br>Total: ₹${orderData.totalAmount}`, 'success', 6000);
        } else {
            showNotification('Error placing order. Please try again.', 'error');
        }
    }
};

// Check authentication before accessing protected features
window.checkAuthAndSetTab = function(tab) {
    console.log('checkAuthAndSetTab called with:', tab, 'currentUser:', currentUser);
    if (!currentUser) {
        showNotification('Please login or register to use app features! 🔐', 'warning', 4000);
        showLoginModal();
        return;
    }
    console.log('User authenticated, setting tab:', tab);
    setActiveTab(tab);
};

// App Navigation functionality
window.setActiveTab = async function(tab) {
    console.log('Setting active tab:', tab);
    
    // Add to navigation stack for proper back navigation
    pushToNavigationStack('section', { sectionName: tab });
    
    // Add to navigation history and browser history
    if (navigationHistory[currentHistoryIndex] !== tab) {
        navigationHistory.push(tab);
        currentHistoryIndex = navigationHistory.length - 1;
        history.pushState({section: tab}, '', `#${tab}`);
    }
    
    // Close category modal if open
    const categoryModal = document.getElementById('categoryModal');
    if (categoryModal && categoryModal.style.display !== 'none') {
        closeCategoryModal();
    }
    
    // Remove active class from all tabs
    document.querySelectorAll('.app-nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active class to clicked tab - find the correct nav item
    const navItems = document.querySelectorAll('.app-nav-item');
    navItems.forEach(item => {
        const label = item.querySelector('.app-nav-label');
        if (label && label.textContent.toLowerCase() === tab.toLowerCase()) {
            item.classList.add('active');
        }
    });
    
    // Hide all sections and IMMEDIATELY reset scroll positions
    document.querySelectorAll('.app-section').forEach(section => {
        section.classList.remove('active');
        section.scrollTop = 0;
        const scrollableContainers = section.querySelectorAll('.products-grid, .categories-grid, .event-products, .orders-container, .cart-items, .search-results');
        scrollableContainers.forEach(container => {
            container.scrollTop = 0;
        });
    });
    
    // IMMEDIATE scroll reset for body and document
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
    
    // Close all modals after section switching
    setTimeout(() => {
        closeProductModal();
        closeConfirmOrderModal();
        closeSidebar();
        closeCartModal();
    }, 50);
    
    // Show selected section and ensure scroll is at top
    switch(tab) {
        case 'home':
            const homeSection = document.getElementById('homeSection');
            homeSection.classList.add('active');
            homeSection.scrollTop = 0;
            document.body.scrollTop = 0;
            document.documentElement.scrollTop = 0;
            break;
            
            // Show floating cart notification if cart has items
            updateFloatingCartNotification();
        case 'search':
            const searchSection = document.getElementById('searchSection');
            searchSection.classList.add('active');
            searchSection.scrollTop = 0;
            document.body.scrollTop = 0;
            
            // Show floating cart notification if cart has items
            updateFloatingCartNotification();
            document.documentElement.scrollTop = 0;
            loadAllProductsInSearch();
            break;
        case 'categories':
            const categoriesSection = document.getElementById('categoriesSection');
            categoriesSection.classList.add('active');
            categoriesSection.scrollTop = 0;
            document.body.scrollTop = 0;
            document.documentElement.scrollTop = 0;
            
            // Load only category events (no categories grid)
            loadEventsOnCategoriesPage();
            
            // Show floating cart notification if cart has items
            updateFloatingCartNotification();
            break;
        case 'cart':
            const cartSection = document.getElementById('cartSection');
            cartSection.classList.add('active');
            cartSection.scrollTop = 0;
            document.body.scrollTop = 0;
            document.documentElement.scrollTop = 0;
            
            // Hide floating cart notification when entering cart section
            const floatingNotification = document.getElementById('floatingCartNotification');
            if (floatingNotification) {
                floatingNotification.classList.remove('show');
                floatingNotification.classList.add('hide');
            }
            // Add delay to ensure DOM is ready
            setTimeout(() => {
                loadCartFromFirebase();
                cartSection.querySelectorAll('.cart-items, .cart-content').forEach(container => {
                    container.scrollTop = 0;
                });
            }, 50);
            break;
        case 'orders':
            const ordersSection = document.getElementById('ordersSection');
            ordersSection.classList.add('active');
            ordersSection.scrollTop = 0;
            
            // Show floating cart notification if cart has items
            updateFloatingCartNotification();
            document.body.scrollTop = 0;
            document.documentElement.scrollTop = 0;
            loadOrdersDataFromFirebase();
            break;
        case 'profile':
            const profileSection = document.getElementById('profileSection');
            profileSection.classList.add('active');
            profileSection.scrollTop = 0;
            document.body.scrollTop = 0;
            
            // Show floating cart notification if cart has items
            updateFloatingCartNotification();
            document.documentElement.scrollTop = 0;
            updateProfileInfo();
            loadAddressInProfileSection();
            break;
    }
};

// Enhanced showSection with scroll reset functionality
window.showSection = function(tab) {
    // Update bottom navbar active states
    document.querySelectorAll('.app-nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active class to clicked item
    const activeItem = document.querySelector(`[onclick="showSection('${tab}')"]`);
    if (activeItem) {
        activeItem.classList.add('active');
    }
    
    // Hide all sections and reset their scroll positions
    document.querySelectorAll('.app-section').forEach(section => {
        section.classList.remove('active');
        // Reset scroll position to top when hiding section
        section.scrollTop = 0;
        
        // Also reset any scrollable containers within the section
        const scrollableContainers = section.querySelectorAll('.products-grid, .categories-grid, .event-products, .orders-container, .cart-items, .search-results');
        scrollableContainers.forEach(container => {
            container.scrollTop = 0;
        });
    });
    
    // Close all modals after section switching
    setTimeout(() => {
        closeProductModal();
        closeConfirmOrderModal();
        closeSidebar();
        closeCartModal();
    }, 50);
    
    // Update body class for navbar positioning
    if (tab === 'home') {
        document.body.classList.add('home-active');
    } else {
        document.body.classList.remove('home-active');
    }
    
    // Show selected section and force scroll to top
    switch(tab) {
        case 'home':
            const homeSection = document.getElementById('homeSection');
            homeSection.classList.add('active');
            // Immediate scroll reset
            homeSection.scrollTop = 0;
            document.body.scrollTop = 0;
            document.documentElement.scrollTop = 0;
            // Reset scroll for all scrollable containers in home section
            homeSection.querySelectorAll('.products-grid, .categories-grid, .event-products').forEach(container => {
                container.scrollTop = 0;
            });
            // Add to navigation history
            if (window.history && window.history.pushState) {
                window.history.pushState({section: 'home'}, 'Home', '#home');
            }
            break;
        case 'categories':
            const categoriesSection = document.getElementById('categoriesSection');
            categoriesSection.classList.add('active');
            loadCategoriesOnCategoriesPage();
            loadEventsOnCategoriesPage();
            // Immediate scroll reset
            categoriesSection.scrollTop = 0;
            document.body.scrollTop = 0;
            document.documentElement.scrollTop = 0;
            // Reset scroll for categories containers
            categoriesSection.querySelectorAll('.categories-main-grid, .category-events-container').forEach(container => {
                container.scrollTop = 0;
            });
            // Add to navigation history
            if (window.history && window.history.pushState) {
                window.history.pushState({section: 'categories'}, 'Categories', '#categories');
            }
            break;
        case 'search':
            const searchSection = document.getElementById('searchSection');
            searchSection.classList.add('active');
            loadAllProductsInSearch();
            // Immediate scroll reset
            searchSection.scrollTop = 0;
            document.body.scrollTop = 0;
            document.documentElement.scrollTop = 0;
            // Reset scroll for search results
            searchSection.querySelectorAll('.search-results, .products-grid').forEach(container => {
                container.scrollTop = 0;
            });
            // Setup search input listeners after section is active
            setTimeout(() => {
                setupSearchInputListeners();
            }, 100);
            // Add to navigation history
            if (window.history && window.history.pushState) {
                window.history.pushState({section: 'search'}, 'Search', '#search');
            }
            break;
        case 'cart':
            const cartSection = document.getElementById('cartSection');
            cartSection.classList.add('active');
            // Immediate scroll reset
            cartSection.scrollTop = 0;
            document.body.scrollTop = 0;
            document.documentElement.scrollTop = 0;
            // Load cart data with delay
            setTimeout(() => {
                loadCartFromFirebase();
                // Reset scroll for cart items after loading
                cartSection.querySelectorAll('.cart-items, .cart-content').forEach(container => {
                    container.scrollTop = 0;
                });
            }, 50);
            // Add to navigation history
            if (window.history && window.history.pushState) {
                window.history.pushState({section: 'cart'}, 'Cart', '#cart');
            }
            break;
        case 'orders':
            const ordersSection = document.getElementById('ordersSection');
            ordersSection.classList.add('active');
            loadOrdersDataFromFirebase();
            // Immediate scroll reset
            ordersSection.scrollTop = 0;
            document.body.scrollTop = 0;
            document.documentElement.scrollTop = 0;
            // Reset scroll for orders container
            ordersSection.querySelectorAll('.orders-container').forEach(container => {
                container.scrollTop = 0;
            });
            // Add to navigation history
            if (window.history && window.history.pushState) {
                window.history.pushState({section: 'orders'}, 'Orders', '#orders');
            }
            break;
        case 'profile':
            const profileSection = document.getElementById('profileSection');
            profileSection.classList.add('active');
            updateProfileInfo();
            loadAddressInProfileSection();
            // Immediate scroll reset
            profileSection.scrollTop = 0;
            document.body.scrollTop = 0;
            document.documentElement.scrollTop = 0;
            // Add to navigation history
            if (window.history && window.history.pushState) {
                window.history.pushState({section: 'profile'}, 'Profile', '#profile');
            }
            break;
    }
};

// Show section without adding to history (for back navigation)
window.showSectionWithoutHistory = function(tab) {
    // Update bottom navbar active states
    document.querySelectorAll('.app-nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active class to clicked item
    const activeItem = document.querySelector(`[onclick="showSection('${tab}')"]`);
    if (activeItem) {
        activeItem.classList.add('active');
    }
    
    // Hide all sections and reset their scroll positions
    document.querySelectorAll('.app-section').forEach(section => {
        section.classList.remove('active');
        section.scrollTop = 0;
        const scrollableContainers = section.querySelectorAll('.products-grid, .categories-grid, .event-products, .orders-container, .cart-items, .search-results');
        scrollableContainers.forEach(container => {
            container.scrollTop = 0;
        });
    });
    
    // Close all modals after section switching
    setTimeout(() => {
        closeProductModal();
        closeConfirmOrderModal();
        closeSidebar();
        closeCartModal();
    }, 50);
    
    // Update body class for navbar positioning
    if (tab === 'home') {
        document.body.classList.add('home-active');
    } else {
        document.body.classList.remove('home-active');
    }
    
    // Show selected section and force scroll to top
    switch(tab) {
        case 'home':
            const homeSection = document.getElementById('homeSection');
            homeSection.classList.add('active');
            setTimeout(() => {
                homeSection.scrollTop = 0;
                document.body.scrollTop = 0;
                document.documentElement.scrollTop = 0;
                homeSection.querySelectorAll('.products-grid, .categories-grid, .event-products').forEach(container => {
                    container.scrollTop = 0;
                });
            }, 10);
            break;
        case 'search':
            const searchSection = document.getElementById('searchSection');
            searchSection.classList.add('active');
            loadAllProductsInSearch();
            setTimeout(() => {
                searchSection.scrollTop = 0;
                document.body.scrollTop = 0;
                document.documentElement.scrollTop = 0;
                searchSection.querySelectorAll('.search-results, .products-grid').forEach(container => {
                    container.scrollTop = 0;
                });
            }, 10);
            break;
        case 'cart':
            const cartSection = document.getElementById('cartSection');
            cartSection.classList.add('active');
            setTimeout(() => {
                loadCartFromFirebase();
                cartSection.scrollTop = 0;
                document.body.scrollTop = 0;
                document.documentElement.scrollTop = 0;
                cartSection.querySelectorAll('.cart-items, .cart-content').forEach(container => {
                    container.scrollTop = 0;
                });
            }, 100);
            break;
        case 'orders':
            const ordersSection = document.getElementById('ordersSection');
            ordersSection.classList.add('active');
            loadOrdersDataFromFirebase();
            setTimeout(() => {
                ordersSection.scrollTop = 0;
                document.body.scrollTop = 0;
                document.documentElement.scrollTop = 0;
                ordersSection.querySelectorAll('.orders-container').forEach(container => {
                    container.scrollTop = 0;
                });
            }, 10);
            break;
        case 'profile':
            const profileSection = document.getElementById('profileSection');
            profileSection.classList.add('active');
            updateProfileInfo();
            loadAddressInProfileSection();
            setTimeout(() => {
                profileSection.scrollTop = 0;
                document.body.scrollTop = 0;
                document.documentElement.scrollTop = 0;
            }, 10);
            break;
    }
};

// Handle profile click with authentication check
window.handleProfileClick = function() {
    console.log('Profile icon clicked, currentUser:', currentUser);
    
    // Check authentication state using the correct Firebase auth reference
    let user = null;
    try {
if (typeof auth !== 'undefined' && auth) {
    user = auth.currentUser;
}
    } catch (error) {
console.log('Firebase auth not available, using currentUser variable');
    }
    
    console.log('Auth user:', user);
    
    if (!user && !currentUser) {
console.log('User not logged in, showing login modal');
// User not logged in, show login modal
document.getElementById('loginModal').style.display = 'flex';
// Hide bottom navbar when modal opens
const bottomNav = document.querySelector('.app-bottom-nav');
if (bottomNav) {
    bottomNav.style.display = 'none';
}
return;
    }
    
    console.log('User is logged in, opening profile section');
    // User is logged in, show profile section without adding to history
    showSectionWithoutHistory('profile');
    
    // Add a specific history entry that we can handle
    if (window.history && window.history.pushState) {
window.history.pushState({section: 'profile', fromProfile: true}, 'Profile', '#profile');
    }
};
window.handleProfileClick = function() {
    console.log('Profile icon clicked, currentUser:', currentUser);
    
    // Check authentication state using the correct Firebase auth reference
    let user = null;
    try {
        if (typeof auth !== 'undefined' && auth) {
            user = auth.currentUser;
        }
    } catch (error) {
        console.log('Firebase auth not available, using currentUser variable');
    }
    
    console.log('Auth user:', user);
    
    if (!user && !currentUser) {
        console.log('User not logged in, showing login modal');
        // User not logged in, show login modal
        document.getElementById('loginModal').style.display = 'flex';
        // Hide bottom navbar when modal opens
        const bottomNav = document.querySelector('.app-bottom-nav');
        if (bottomNav) {
            bottomNav.style.display = 'none';
        }
        return;
    }
    
    console.log('User is logged in, opening profile section');
    // User is logged in, show profile section without adding to history
    showSectionWithoutHistory('profile');
    
    // Add a specific history entry that we can handle
    if (window.history && window.history.pushState) {
        window.history.pushState({section: 'profile', fromProfile: true}, 'Profile', '#profile');
    }
};

// Handle order now with authentication check
window.handleOrderNow = function(productId) {
    if (!currentUser) {
        // User not logged in, show login modal
        document.getElementById('loginModal').style.display = 'flex';
        // Hide bottom navbar when modal opens
        const bottomNav = document.querySelector('.app-bottom-nav');
        if (bottomNav) {
            bottomNav.style.display = 'none';
        }
        return;
    }
    // User is logged in, proceed with order
    openConfirmOrderModal(productId);
};

// Handle order now from cart with pre-filled data
window.handleOrderNowFromCart = function(productId, selectedSize, quantity) {
    if (!currentUser) {
        // User not logged in, show login modal
        document.getElementById('loginModal').style.display = 'flex';
        // Hide bottom navbar when modal opens
        const bottomNav = document.querySelector('.app-bottom-nav');
        if (bottomNav) {
            bottomNav.style.display = 'none';
        }
        return;
    }
    
    // Close the current product modal first
    closeProductModal();
    
    // Get cart item data for proper pricing
    const cartItem = cartItems.find(item => item.id === productId && item.selectedSize === selectedSize);
    if (!cartItem) {
        showNotification('Cart item not found!', 'error');
        return;
    }
    
    // Set flag to indicate this order is from cart with pricing info
    window.orderFromCart = { 
        productId, 
        selectedSize, 
        quantity,
        cartPrice: cartItem.price,
        cartOriginalPrice: cartItem.originalPrice || cartItem.price,
        cartDiscount: cartItem.discount || 0
    };
    
    // Create temporary hidden inputs to simulate product modal state
    const tempContainer = document.createElement('div');
    tempContainer.style.display = 'none';
    tempContainer.innerHTML = `
        <input type="hidden" id="selected-size-${productId}" value="${selectedSize}">
        <input type="number" id="quantity-${productId}" value="${quantity}">
    `;
    document.body.appendChild(tempContainer);
    
    // Use the regular openConfirmOrderModal function
    setTimeout(() => {
        openConfirmOrderModal(productId);
        
        // Clean up temporary inputs after modal opens
        setTimeout(() => {
            if (tempContainer && tempContainer.parentNode) {
                tempContainer.parentNode.removeChild(tempContainer);
            }
        }, 500);
    }, 100);
};


// Redirect to search section when clicking home page search bar
window.redirectToSearch = function() {
    const searchInput = document.getElementById('mainSearchInput');
    const searchTerm = searchInput.value.trim();
    
    // Add to navigation stack for proper back navigation
    pushToNavigationStack('section', { sectionName: 'search' });
    
    // Switch to search section without adding to history (to avoid double entry)
    showSectionWithoutHistory('search');
    
    // Setup search input listeners after section is shown
    setTimeout(() => {
        setupSearchInputListeners();
    }, 100);
    
    // Reset search section scroll to top
    const searchSection = document.getElementById('searchSection');
    if (searchSection) {
        searchSection.scrollTop = 0;
    }
    
    // Also reset any scrollable containers within search section
    const searchProductsGrid = document.getElementById('searchProductsGrid');
    if (searchProductsGrid && searchProductsGrid.parentElement) {
        searchProductsGrid.parentElement.scrollTop = 0;
    }
    
    // If there's a search term, transfer it and search
    if (searchTerm) {
        const searchPageInput = document.getElementById('searchInput');
        if (searchPageInput) {
            searchPageInput.value = searchTerm;
            performSearch();
        }
    } else {
        // Load all products in search section
        loadAllProductsInSearch();
    }
};

// Handle keyup events on home page search bar
window.handleMainSearchKeyup = function(event) {
    if (event.key === 'Enter') {
        redirectToSearch();
    }
};

// Fuzzy Search Utility Functions
function levenshteinDistance(str1, str2) {
    const matrix = [];
    const len1 = str1.length;
    const len2 = str2.length;

    if (len1 === 0) return len2;
    if (len2 === 0) return len1;

    // Initialize matrix
    for (let i = 0; i <= len2; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= len1; j++) {
        matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= len2; i++) {
        for (let j = 1; j <= len1; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                );
            }
        }
    }
    return matrix[len2][len1];
}

function calculateSimilarity(str1, str2) {
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 1;
    const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
    return (maxLength - distance) / maxLength;
}

function soundex(str) {
    // Simple soundex implementation for phonetic matching
    str = str.toLowerCase().replace(/[^a-z]/g, '');
    if (!str) return '';
    
    const firstLetter = str[0];
    str = str.replace(/[hw]/g, '');
    str = str.replace(/[bfpv]/g, '1');
    str = str.replace(/[cgjkqsxz]/g, '2');
    str = str.replace(/[dt]/g, '3');
    str = str.replace(/[l]/g, '4');
    str = str.replace(/[mn]/g, '5');
    str = str.replace(/[r]/g, '6');
    str = str.replace(/[aeiouy]/g, '0');
    str = str.replace(/(.)\1+/g, '$1');
    str = str.replace(/0/g, '');
    
    return (firstLetter + str + '000').substring(0, 4);
}

function fuzzyMatch(searchTerm, targetText, threshold = 0.6) {
    if (!searchTerm || !targetText) return false;
    
    const search = searchTerm.toLowerCase().trim();
    const target = targetText.toLowerCase().trim();
    
    // Exact match
    if (target.includes(search)) return true;
    
    // Split search term into words for better matching
    const searchWords = search.split(/\s+/);
    const targetWords = target.split(/\s+/);
    
    // Check if any search word has good similarity with any target word
    for (const searchWord of searchWords) {
        for (const targetWord of targetWords) {
            // Direct similarity check
            if (calculateSimilarity(searchWord, targetWord) >= threshold) {
                return true;
            }
            
            // Phonetic matching for sound-alike words
            if (searchWord.length > 2 && targetWord.length > 2) {
                if (soundex(searchWord) === soundex(targetWord)) {
                    return true;
                }
            }
            
            // Partial matching for longer words
            if (searchWord.length >= 3 && targetWord.length >= 3) {
                if (targetWord.includes(searchWord) || searchWord.includes(targetWord)) {
                    return true;
                }
            }
        }
    }
    
    // Check overall similarity for short search terms
    if (search.length <= 4 && calculateSimilarity(search, target) >= 0.7) {
        return true;
    }
    
    return false;
}

// Normal/Exact search function - searches for exact matches and contains
function normalSearchProducts(products, searchTerm) {
    if (!searchTerm || searchTerm.trim() === '') return products;
    
    const search = searchTerm.toLowerCase().trim();
    const results = [];
    
    products.forEach(product => {
        let matched = false;
        let score = 0;
        
        // Exact match in product name (highest priority)
        if (product.name && product.name.toLowerCase() === search) {
            score += 100;
            matched = true;
        }
        // Contains in product name (high priority)
        else if (product.name && product.name.toLowerCase().includes(search)) {
            score += 50;
            matched = true;
        }
        
        // Exact match in description
        if (product.description && product.description.toLowerCase().includes(search)) {
            score += 20;
            matched = true;
        }
        
        // Exact match in category
        if (product.category && product.category.toLowerCase().includes(search)) {
            score += 15;
            matched = true;
        }
        
        // Keywords match (high priority)
        if (product.keywords && Array.isArray(product.keywords)) {
            product.keywords.forEach(keyword => {
                if (keyword.toLowerCase() === search) {
                    score += 40; // High score for exact keyword match
                    matched = true;
                } else if (keyword.toLowerCase().includes(search)) {
                    score += 25; // Medium score for partial keyword match
                    matched = true;
                }
            });
        }
        
        // Check subcategories
        if (product.subcategories && Array.isArray(product.subcategories)) {
            product.subcategories.forEach(subcat => {
                if (subcat && subcat.toLowerCase().includes(search)) {
                    score += 10;
                    matched = true;
                }
            });
        }
        
        if (matched) {
            results.push({ product, score });
        }
    });
    
    // Sort by score (highest first) and return products
    return results
        .sort((a, b) => b.score - a.score)
        .map(result => result.product);
}

function fuzzySearchProducts(products, searchTerm, threshold = 0.6) {
    if (!searchTerm || searchTerm.trim() === '') return products;
    
    const results = [];
    const search = searchTerm.toLowerCase().trim();
    
    // Score products based on relevance
    products.forEach(product => {
        let score = 0;
        let matched = false;
        
        // Check product name
        if (fuzzyMatch(search, product.name, threshold)) {
            score += 10;
            matched = true;
        }
        
        // Check description
        if (product.description && fuzzyMatch(search, product.description, threshold)) {
            score += 5;
            matched = true;
        }
        
        // Check category
        if (product.category && fuzzyMatch(search, product.category, threshold)) {
            score += 3;
            matched = true;
        }
        
        // Check keywords
        if (product.keywords && Array.isArray(product.keywords)) {
            product.keywords.forEach(keyword => {
                if (fuzzyMatch(search, keyword, threshold)) {
                    score += 8; // High score for keyword matches
                    matched = true;
                }
            });
        }
        
        // Check subcategories
        if (product.subcategories && Array.isArray(product.subcategories)) {
            product.subcategories.forEach(subcat => {
                if (fuzzyMatch(search, subcat, threshold)) {
                    score += 2;
                    matched = true;
                }
            });
        }
        
        if (matched) {
            results.push({ product, score });
        }
    });
    
    // Sort by score (highest first) and return products
    return results
        .sort((a, b) => b.score - a.score)
        .map(result => result.product);
}

// Search debounce timer for smooth performance
let searchTimeout;

// Auto scroll to top function
function autoScrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Add event listener for immediate scroll on typing
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            // Immediate scroll to top
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
});

// Refresh search section and scroll to top
function refreshSearchSection() {
    // Reset search section scroll to top - NOT page scroll
    const searchSection = document.getElementById('searchSection');
    if (searchSection) {
        searchSection.scrollTop = 0;
    }
    
    // Also reset any scrollable containers within search section
    const searchProductsGrid = document.getElementById('searchProductsGrid');
    if (searchProductsGrid && searchProductsGrid.parentElement) {
        searchProductsGrid.parentElement.scrollTop = 0;
    }
    
    // Clear search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
    }
    
    // Reload all products in search section
    loadAllProductsInSearch();
}

// Optimized search functionality
window.performSearch = function() {
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput.value.trim();
    
    // Clear previous timeout for smooth typing
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
    
    // Add small delay to prevent lag while typing
    searchTimeout = setTimeout(() => {
        if (searchTerm.length === 0) {
            loadAllProductsInSearch();
        } else {
            searchProductsInSection(searchTerm);
        }
    }, 200); // 200ms delay for smooth performance
};

// Optimized real-time search with debouncing
document.addEventListener('DOMContentLoaded', function() {
    setupSearchInputListeners();
});

// Setup search input listeners (can be called multiple times)
function setupSearchInputListeners() {
    const searchInput = document.getElementById('searchInput');
    console.log('Setting up search input listeners, input found:', !!searchInput);
    if (searchInput) {
        // Remove existing listeners to avoid duplicates
        searchInput.removeEventListener('focus', handleSearchInputFocus);
        searchInput.removeEventListener('input', handleSearchInputInput);
        searchInput.removeEventListener('click', handleSearchInputClick);
        
        // Add fresh listeners
        searchInput.addEventListener('focus', handleSearchInputFocus);
        searchInput.addEventListener('input', handleSearchInputInput);
        searchInput.addEventListener('click', handleSearchInputClick);
        console.log('Search input listeners attached successfully');
    } else {
        console.log('Search input not found, cannot attach listeners');
    }
}

// Search input event handlers
function handleSearchInputFocus() {
    console.log('Search input focused - resetting scroll');
    
    // Reset main page scroll
    window.scrollTo(0, 0);
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
    console.log('Window scroll reset to 0');
    
    // Reset search section scroll
    const searchSection = document.getElementById('searchSection');
    if (searchSection) {
        searchSection.scrollTop = 0;
        console.log('Search section scroll reset to 0');
    }
    
    // Reset search page container scroll
    const searchPage = document.querySelector('.search-page');
    if (searchPage) {
        searchPage.scrollTop = 0;
        console.log('Search page scroll reset to 0');
    }
    
    // Also reset search products grid scroll
    const searchProductsGrid = document.getElementById('searchProductsGrid');
    if (searchProductsGrid && searchProductsGrid.parentElement) {
        searchProductsGrid.parentElement.scrollTop = 0;
        console.log('Search products grid scroll reset to 0');
    }
}

function handleSearchInputInput() {
    performSearch(); // Use the debounced function
}

function handleSearchInputClick() {
    console.log('Search input clicked - resetting scroll');
    // Same as focus - reset scroll when clicked
    handleSearchInputFocus();
}

function loadAllProductsInSearch() {
    // Reset scroll to top when loading all products
    const searchSection = document.getElementById('searchSection');
    if (searchSection) {
        searchSection.scrollTop = 0;
    }
    
    const searchProductsGrid = document.getElementById('searchProductsGrid');
    if (!searchProductsGrid) return;
    
    // Use allProducts if productsData is not available
    const products = window.allProducts || productsData || [];
    
    // Use DocumentFragment for better performance
    const fragment = document.createDocumentFragment();
    
    products.forEach(product => {
        const productCard = createProductCard(product);
        fragment.appendChild(productCard);
    });
    
    // Single DOM update for smooth performance
    searchProductsGrid.innerHTML = '';
    searchProductsGrid.appendChild(fragment);
}

function searchProductsInSection(searchTerm) {
    // Reset scroll to top for fresh search experience
    const searchSection = document.getElementById('searchSection');
    if (searchSection) {
        searchSection.scrollTop = 0;
    }
    
    // Use allProducts if productsData is not available
    const products = window.allProducts || productsData || [];
    
    // First try normal/exact search
    let filteredProducts = normalSearchProducts(products, searchTerm);
    
    // If no results found with normal search, try fuzzy search
    if (filteredProducts.length === 0) {
        filteredProducts = fuzzySearchProducts(products, searchTerm, 0.6);
    }
    
    const searchProductsGrid = document.getElementById('searchProductsGrid');
    if (!searchProductsGrid) return;
    
    // Use DocumentFragment for better performance
    const fragment = document.createDocumentFragment();
    
    if (filteredProducts.length === 0) {
        const noResultsMsg = document.createElement('p');
        noResultsMsg.style.cssText = 'text-align: center; color: #666; grid-column: 1 / -1; padding: 40px;';
        noResultsMsg.textContent = `No products found for "${searchTerm}".`;
        fragment.appendChild(noResultsMsg);
    } else {
        // Create all product cards in fragment first
        filteredProducts.forEach(product => {
            const productCard = createProductCard(product);
            fragment.appendChild(productCard);
        });
    }
    
    // Single DOM update for better performance
    searchProductsGrid.innerHTML = '';
    searchProductsGrid.appendChild(fragment);
}

function createProductCard(product) {
    const productCard = document.createElement('div');
    productCard.className = "product-card";
        productCard.setAttribute("data-product-id", product.id);;
    productCard.onclick = () => openProductModal(product.id);
    
    // Create pricing display with discount
    const originalPrice = product.originalPrice;
    const currentPrice = product.price;
    const discount = product.discount;
    
    let priceHTML = '';
    if (originalPrice && originalPrice > currentPrice && discount > 0) {
        priceHTML = `
            <div class="product-price-container">
                <div class="special-price-label" style="color: #27ae60; font-size: 10px; font-weight: 600; margin-bottom: 2px;">Special price</div>
                <div class="price-row" style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                    <span class="current-price" style="color: #27ae60; font-size: 18px; font-weight: 700;">₹${currentPrice}</span>
                    <span class="original-price" style="color: #999; font-size: 14px; text-decoration: line-through;">₹${originalPrice}</span>
                    <span class="discount-badge" style="background: #27ae60; color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600;">${discount}% off</span>
                </div>
            </div>
        `;
    } else {
        priceHTML = `<div class="product-price" style="color: #27ae60; font-size: 18px; font-weight: 700;">₹${currentPrice}</div>`;
    }
    
    productCard.innerHTML = `
        <div class="product-image-container">
            <img src="${product.imageUrl}" alt="${product.name}" class="product-image" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDIwMCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTUwIiBmaWxsPSIjZjNmNGY2Ii8+Cjx0ZXh0IHg9IjEwMCIgeT0iNzUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OWFhMiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pgo8L3N2Zz4K'">
            <button class="product-heart-icon">❤️</button>
            ${getAddButtonHTML(product.id)}
        </div>
        <div class="product-info">
            ${(product.sizes && product.sizes.length > 0) || (product.weightPricing && (product.weightPricing.ml?.length > 0 || product.weightPricing.g?.length > 0 || product.weightPricing.kg?.length > 0)) ? `<div class="product-sizes" style="margin-bottom: 6px; display: flex; align-items: center; gap: 4px; flex-wrap: wrap;"><img src="mark.png" alt="Size" style="width: 20px; height: 20px; object-fit: contain;">${product.sizes ? product.sizes.map(size => `<span class="size-badge" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: 600; display: inline-block;">${size}</span>`).join('') : ''}${product.weightPricing ? [product.weightPricing.ml?.map(option => `<span class="size-badge" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: 600; display: inline-block;">${option.quantity}ml</span>`).join('') || '', product.weightPricing.g?.map(option => `<span class="size-badge" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: 600; display: inline-block;">${option.quantity}g</span>`).join('') || '', product.weightPricing.kg?.map(option => `<span class="size-badge" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: 600; display: inline-block;">${option.quantity}kg</span>`).join('') || ''].join('') : ''}</div>` : ''}
            <h3 class="product-name">${product.name}</h3>
            <div class="product-rating" style="color: #fbbf24; font-size: 14px; margin: 4px 0;">
                ${'⭐'.repeat(product.rating || 0)} ${product.rating ? `(${product.rating})` : ''}
            </div>
            ${priceHTML}
            <div class="product-buttons">
                <button class="btn-cart" onclick="event.stopPropagation(); openProductModal('${product.id}')">Add to Cart</button>
                <button class="btn-order" onclick="event.stopPropagation(); openProductModal('${product.id}')">Order Now</button>
            </div>
        </div>
    `;
    return productCard;
}

function updateProfileInfo() {
    if (currentUser) {
        const profileName = document.getElementById('profileName');
        const profileEmail = document.getElementById('profileEmail');
        const profileImage = document.getElementById('profileImage');
        
        if (profileName) profileName.textContent = currentUser.displayName || 'User';
        if (profileEmail) profileEmail.textContent = currentUser.email || 'user@email.com';
        if (profileImage) profileImage.src = currentUser.photoURL || '';
    }
}

// Scroll to Saved Addresses Section
window.scrollToSavedAddresses = function() {
    const savedAddressesSection = document.querySelector('.saved-addresses-section');
    if (savedAddressesSection) {
        savedAddressesSection.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }
}

// Tab switching function
window.switchOrderTab = function(tab) {
    const myOrdersTab = document.getElementById('myOrdersTab');
    const myRefundOrdersTab = document.getElementById('myRefundOrdersTab');
    const myOrdersContent = document.getElementById('myOrdersContent');
    const myRefundOrdersContent = document.getElementById('myRefundOrdersContent');
    
    if (tab === 'orders') {
        // Style active tab
        myOrdersTab.style.cssText = 'flex: 1; padding: 18px 24px; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; background: linear-gradient(135deg, #3498db, #2980b9); color: white; box-shadow: 0 2px 8px rgba(52,152,219,0.3);';
        myRefundOrdersTab.style.cssText = 'flex: 1; padding: 18px 24px; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; background: transparent; color: #666;';
        
        // Show/hide content
        myOrdersContent.style.display = 'block';
        myRefundOrdersContent.style.display = 'none';
        
        // Load regular orders
        loadRegularOrders();
    } else if (tab === 'refunds') {
        // Style active tab
        myRefundOrdersTab.style.cssText = 'flex: 1; padding: 18px 24px; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; background: linear-gradient(135deg, #dc3545, #c82333); color: white; box-shadow: 0 2px 8px rgba(220,53,69,0.3);';
        myOrdersTab.style.cssText = 'flex: 1; padding: 18px 24px; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; background: transparent; color: #666;';
        
        // Show/hide content
        myOrdersContent.style.display = 'none';
        myRefundOrdersContent.style.display = 'block';
        
        // Load refund orders
        loadRefundOrders();
    }
};

// Load regular orders (refundRequested = false or undefined)
async function loadRegularOrders() {
    const ordersContent = document.getElementById('myOrdersContent');
    const noOrdersMessage = document.getElementById('noOrdersMessage');
    
    try {
        const orders = await loadOrdersFromFirebase();
        // Filter out refund requested orders
        const regularOrders = orders.filter(order => !order.refundRequested);
        
        // Update global orders data for invoice functionality
        globalOrdersData = regularOrders;
        
        if (regularOrders.length === 0) {
            noOrdersMessage.style.display = 'block';
            // Clear existing orders
            const existingOrders = ordersContent.querySelectorAll('.order-item');
            existingOrders.forEach(order => order.remove());
            return;
        }
        
        noOrdersMessage.style.display = 'none';
        
        // Clear existing orders except the no orders message
        const existingOrders = ordersContent.querySelectorAll('.order-item');
        existingOrders.forEach(order => order.remove());
        
        regularOrders.forEach(order => {
            const orderElement = document.createElement('div');
            orderElement.className = 'order-item';
            orderElement.style.cssText = `
                background: white;
                border-radius: 12px;
                padding: 15px;
                margin-bottom: 15px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                border: 1px solid #e9ecef;
                transition: all 0.3s ease;
            `;
            
            // Add hover effects
            orderElement.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-2px)';
                this.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.15)';
            });
            orderElement.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0)';
                this.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
            });
            
            // Create order content (same as before)
            createOrderContent(orderElement, order);
            ordersContent.appendChild(orderElement);
        });
        
    } catch (error) {
        console.error('Error loading regular orders:', error);
        noOrdersMessage.style.display = 'block';
        noOrdersMessage.textContent = 'Error loading orders. Please try again.';
    }
}

// Load refund orders (refundRequested = true)
async function loadRefundOrders() {
    const refundOrdersContent = document.getElementById('myRefundOrdersContent');
    const noRefundOrdersMessage = document.getElementById('noRefundOrdersMessage');
    
    try {
        const orders = await loadOrdersFromFirebase();
        // Filter only refund requested orders
        const refundOrders = orders.filter(order => order.refundRequested === true);
        
        if (refundOrders.length === 0) {
            noRefundOrdersMessage.style.display = 'block';
            // Clear existing orders
            const existingOrders = refundOrdersContent.querySelectorAll('.order-item');
            existingOrders.forEach(order => order.remove());
            return;
        }
        
        noRefundOrdersMessage.style.display = 'none';
        
        // Clear existing orders except the no orders message
        const existingOrders = refundOrdersContent.querySelectorAll('.order-item');
        existingOrders.forEach(order => order.remove());
        
        refundOrders.forEach(order => {
            const orderElement = document.createElement('div');
            orderElement.className = 'order-item';
            orderElement.style.cssText = `
                background: linear-gradient(145deg, #fff8f8, #ffe8e8);
                border-radius: 12px;
                padding: 15px;
                margin-bottom: 15px;
                box-shadow: 0 2px 10px rgba(220, 53, 69, 0.1);
                border: 1px solid #f8d7da;
                transition: all 0.3s ease;
                position: relative;
            `;
            
            // Add refund badge
            const refundBadge = document.createElement('div');
            refundBadge.style.cssText = `
                position: absolute;
                top: -8px;
                right: -8px;
                background: linear-gradient(135deg, #dc3545, #c82333);
                color: white;
                padding: 6px 12px;
                border-radius: 0 12px 0 12px;
                font-size: 10px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                box-shadow: 0 2px 8px rgba(220,53,69,0.3);
                z-index: 2;
            `;
            refundBadge.textContent = '💰 REFUND REQUESTED';
            orderElement.appendChild(refundBadge);
            
            // Add hover effects
            orderElement.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-2px)';
                this.style.boxShadow = '0 4px 20px rgba(220, 53, 69, 0.2)';
            });
            orderElement.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0)';
                this.style.boxShadow = '0 2px 10px rgba(220, 53, 69, 0.1)';
            });
            
            // Create order content (same as before but with refund styling)
            createRefundOrderContent(orderElement, order);
            refundOrdersContent.appendChild(orderElement);
        });
        
    } catch (error) {
        console.error('Error loading refund orders:', error);
        noRefundOrdersMessage.style.display = 'block';
        noRefundOrdersMessage.textContent = 'Error loading refund orders. Please try again.';
    }
}

// Load and display orders from Firebase (updated to use new functions)
async function loadOrdersDataFromFirebase() {
    // Load regular orders by default
    await loadRegularOrders();
}

// Helper function to create order content for regular orders
function createOrderContent(orderElement, order) {
    orderElement.innerHTML = getOrderHTML(order);
    
    // Start countdown timer for completed/rejected/shipped orders
    if (order.status === 'Completed' || order.status === 'Rejected' || order.status === 'Shipped') {
        // Add a small delay to ensure DOM is ready
        setTimeout(() => {
            startCountdownTimer(order.id, order.completedAt || order.rejectedAt || order.shippedAt);
        }, 100);
    }
}

// Helper function to create refund order content
function createRefundOrderContent(orderElement, order) {
    orderElement.innerHTML = getOrderHTML(order, true);
}

// Helper function to get order HTML (shared between regular and refund orders)
function getOrderHTML(order, isRefund = false) {
    return `
                <!-- Top section: Image + Name/Description -->
                <div style="display: flex; gap: 12px; align-items: flex-start; margin-bottom: 15px;">
                    <div style="flex-shrink: 0;">
                        <img src="${order.productImage}" alt="${order.productName}" 
                             style="width: 70px; height: 70px; object-fit: contain; border-radius: 8px; background: #f8f9fa; border: 1px solid #e9ecef;"
                             onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzAiIGhlaWdodD0iNzAiIHZpZXdCb3g9IjAgMCA3MCA3MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjcwIiBoZWlnaHQ9IjcwIiBmaWxsPSIjRjhGOUZBIi8+CjxwYXRoIGQ9Ik0yNSAyNUg0NVY0NUgyNVYyNVoiIGZpbGw9IiNEREREREQiLz4KPC9zdmc+Cg=='">
                    </div>
                    <div style="flex: 1; min-width: 0;">
                        <h3 style="font-size: 16px; font-weight: 700; color: #2c3e50; margin: 0 0 5px 0; line-height: 1.3; word-break: break-word;">${order.productName}</h3>
                        ${(() => {
                            const product = productsData.find(p => p.id === order.productId);
                            const rating = product ? product.rating : 0;
                            return rating > 0 ? `<div style="color: #fbbf24; font-size: 10px; margin: 2px 0;">${'⭐'.repeat(rating)} (${rating})</div>` : '';
                        })()}
                        <div style="font-size: 10px; color: #666; margin-bottom: 3px;">Order ID: <span style="font-family: monospace; background: #f8f9fa; padding: 1px 4px; border-radius: 3px;">${order.id.substring(0, 12)}...</span></div>
                        <div style="font-size: 10px; color: #666;">📅 ${order.orderDate}</div>
                    </div>
                </div>
                
                <!-- Middle section: Half width for quantity/amount/size, Half width for total -->
                <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                    <div style="flex: 1; background: #f8f9fa; padding: 10px; border-radius: 6px;">
                        <div style="font-size: 13px; color: #666; margin-bottom: 3px;">Quantity: <strong>${order.quantity}</strong></div>
                        <div style="font-size: 13px; color: #666; margin-bottom: 3px;">Unit Price: ₹${order.productPrice}</div>
                        ${order.productSize ? `<div style="font-size: 13px; color: #666; margin-bottom: 3px;">Size: <strong>${order.productSize}</strong></div>` : ''}
                        ${order.deliveryCharge ? `<div style="font-size: 13px; color: #27ae60; font-weight: 600;">🚚 Delivery: ₹${order.deliveryCharge}</div>` : ''}
                        ${(() => {
                            const walletAmount = order.walletUsed || 0;
                            console.log(`Order ${order.id}: walletUsed = ${walletAmount}`);
                            // Show wallet info for all orders (even ₹0)
                            const bgColor = walletAmount > 0 ? 'rgba(142, 68, 173, 0.1)' : 'rgba(108, 117, 125, 0.1)';
                            const textColor = walletAmount > 0 ? '#8e44ad' : '#6c757d';
                            return `<div style="font-size: 13px; color: ${textColor}; font-weight: 600; background: ${bgColor}; padding: 6px; border-radius: 4px; margin: 2px 0;">💰 Wallet Applied: ₹${Math.round(walletAmount * 100) / 100}</div>`;
                        })()}
                        ${order.originalAmount && order.originalAmount !== order.totalAmount ? `<div style="font-size: 10px; color: #999;">Original Amount: ₹${order.originalAmount}</div>` : ''}
                    </div>
                    <div style="flex: 1; background: #e8f5e8; padding: 10px; border-radius: 6px; text-align: center; display: flex; flex-direction: column; justify-content: center;">
                        ${(() => {
                            // Get product data to check for discount
                            const product = productsData.find(p => p.id === order.productId);
                            const hasDiscount = product && product.discount && product.discount > 0;
                            const originalPrice = product ? product.originalPrice || product.price : order.productPrice;
                            const discountPercent = product ? product.discount : 0;
                            
                            if (hasDiscount && originalPrice > order.productPrice) {
                                const originalTotal = (originalPrice * order.quantity) + (order.deliveryCharge || 0);
                                return `
                                    <div style="font-size: 10px; color: #999; margin-bottom: 1px;">Original Total</div>
                                    <div style="font-size: 10px; color: #999; text-decoration: line-through; margin-bottom: 2px;">₹${originalTotal}</div>
                                    <div style="font-size: 10px; color: #27ae60; margin-bottom: 2px;">Final Amount</div>
                                    <div style="font-size: 18px; font-weight: 700; color: #27ae60;">₹${order.totalAmount}</div>
                                    <div style="background: #27ae60; color: white; font-size: 10px; padding: 2px 6px; border-radius: 8px; display: inline-block; margin-top: 3px;">${discountPercent}% OFF</div>
                                `;
                            } else {
                                return `
                                    <div style="font-size: 10px; color: #27ae60; margin-bottom: 2px;">Total Amount</div>
                                    <div style="font-size: 18px; font-weight: 700; color: #27ae60;">₹${order.totalAmount}</div>
                                `;
                            }
                        })()}
                    </div>
                </div>
                
                <!-- Status section -->
                <div style="width: 100%; margin-bottom: 15px; text-align: center;">
                    ${order.status === 'Rejected' ? `
                        <div style="display: inline-flex; align-items: center; gap: 10px; background: #f8d7da; color: #721c24; padding: 8px 20px; border-radius: 20px; font-size: 10px; font-weight: 600; text-transform: uppercase;">
                            <span>❌</span>
                            ${order.status}
                        </div>
                    ` : `
                        <img src="${order.status === 'Pending' ? 'pending.png' : (order.status === 'Shipped' ? 'shipped.png' : 'complete.png')}" 
                             alt="${order.status}" 
                             style="width: 100%; height: 60px; object-fit: contain; border-radius: 8px;"
                             onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjYwIiB2aWV3Qm94PSIwIDAgMjAwIDYwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjZjhmOWZhIi8+Cjx0ZXh0IHg9IjEwMCIgeT0iMzAiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzY2NiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPiR7b3JkZXIuc3RhdHVzfTwvdGV4dD4KPHN2Zz4K'">
                    `}
                </div>
                
                <!-- Delivery info -->
                <div style="background: #f0f8ff; padding: 10px; border-radius: 6px; margin-bottom: 15px; font-size: 10px; color: #666;">
                    <div style="font-weight: 600; margin-bottom: 5px; color: #2c3e50;">🚚 Delivery Information:</div>
                    <div style="margin-bottom: 3px;">📞 Phone: ${order.userPhone || 'Not provided'}</div>
                    <div style="margin-bottom: 3px;">📍 Address: ${order.userAddress || 'Not provided'}</div>
                    <div style="margin-bottom: 3px;">💳 Payment: ${(() => {
                        const method = order.paymentMethod || 'Not specified';
                        if (method === 'cod') return 'Cash on Delivery (COD)';
                        if (method === 'online') return '<span style="color: #27ae60; font-weight: 600;">Online Payment - Already Paid ✅</span>';
                        return method;
                    })()}</div>
                </div>
                
                <!-- Action buttons -->
                <div style="display: flex; gap: 10px; margin-top: 10px;">
                    <!-- Invoice button: Show for all orders -->
                    <button onclick="showInvoice('${order.id}')" 
                            style="flex: 1; background: linear-gradient(135deg, #3498db, #2980b9); color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(52, 152, 219, 0.3);"
                            onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 20px rgba(52, 152, 219, 0.4)'"
                            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(52, 152, 219, 0.3)'">
                        📄 Invoice
                    </button>
                    
                    <!-- Return button: Only show for Completed orders if product is returnable -->
                    ${(() => {
                        if (order.status === 'Completed' && !order.refundRequested) {
                            // Find the product to check if it's returnable
                            const product = productsData.find(p => p.id === order.productId);
                            const isReturnable = product ? (product.isReturnable !== false) : true; // Default to returnable if not specified
                            
                            if (isReturnable) {
                                return `
                                <div style="flex: 1; position: relative;">
                                    <button id="returnBtn-${order.id}" onclick="toggleReturnDropdown('${order.id}')" 
                                            style="width: 100%; background: linear-gradient(135deg, #f39c12, #e67e22); color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(243, 156, 18, 0.3);"
                                            onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 20px rgba(243, 156, 18, 0.4)'"
                                            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(243, 156, 18, 0.3)'">
                                        💰 Return ▼
                                    </button>
                                    
                                    <!-- Return Reason Dropdown -->
                                    <div id="returnDropdown-${order.id}" style="display: none; position: absolute; top: 100%; left: 0; right: 0; background: white; border: 2px solid #f39c12; border-radius: 8px; box-shadow: 0 8px 25px rgba(0,0,0,0.15); z-index: 1000; margin-top: 5px;">
                                        <div style="padding: 15px;">
                                            <div style="font-size: 14px; font-weight: 600; color: #333; margin-bottom: 10px;">
                                                📝 Return Reason:
                                            </div>
                                            <select id="returnReason-${order.id}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; margin-bottom: 12px;">
                                                <option value="">Select reason...</option>
                                                <option value="Defective Product">🔧 Defective Product</option>
                                                <option value="Wrong Item Delivered">📦 Wrong Item Delivered</option>
                                                <option value="Size Issue">📏 Size Issue</option>
                                                <option value="Quality Issue">⭐ Quality Issue</option>
                                                <option value="Not as Described">📝 Not as Described</option>
                                                <option value="Damaged in Transit">📦 Damaged in Transit</option>
                                                <option value="Changed Mind">💭 Changed Mind</option>
                                                <option value="Other">❓ Other</option>
                                            </select>
                                            
                                            <!-- Custom reason input (shows when "Other" is selected) -->
                                            <textarea id="customReason-${order.id}" placeholder="Please specify your reason..." 
                                                     style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; resize: vertical; min-height: 60px; margin-bottom: 12px; display: none;"></textarea>
                                            
                                            <div style="display: flex; gap: 6px; width: 100%; flex-wrap: wrap;">
                                                <button onclick="submitReturn('${order.id}')" 
                                                        style="flex: 1; min-width: 100px; max-width: 48%; background: linear-gradient(135deg, #27ae60, #2ecc71); color: white; border: none; padding: 8px 6px; border-radius: 6px; cursor: pointer; font-size: 11px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                                    ✅ Submit
                                                </button>
                                                <button onclick="toggleReturnDropdown('${order.id}')" 
                                                        style="flex: 1; min-width: 80px; max-width: 48%; background: #6c757d; color: white; border: none; padding: 8px 6px; border-radius: 6px; cursor: pointer; font-size: 11px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                                    ❌ Cancel
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                `;
                            }
                        }
                        return '';
                    })()}
                    
                    <!-- Cancel button: Only show for Pending orders -->
                    ${order.status === 'Pending' ? `
                    <button onclick="cancelOrder('${order.id}')" 
                            style="flex: 1; background: linear-gradient(135deg, #e74c3c, #c0392b); color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(231, 76, 60, 0.3);"
                            onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 20px rgba(231, 76, 60, 0.4)'"
                            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(231, 76, 60, 0.3)'">
                        ❌ Cancel Order
                    </button>
                    ` : ''}
                    
                    <!-- Track button: Only show for Shipped orders with admin location -->
                    ${order.status === 'Shipped' && order.adminLocation ? `
                    <button onclick="openAdminLocation('${order.adminLocation}')" 
                            style="flex: 1; background: linear-gradient(135deg, #4285f4, #3367d6); color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(66, 133, 244, 0.3);"
                            onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 20px rgba(66, 133, 244, 0.4)'"
                            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(66, 133, 244, 0.3)'">
                        🚚 Track
                    </button>
                    ` : ''}
                </div>
                
                <!-- Status display for non-pending orders -->
                ${order.status !== 'Pending' ? `
                <div style="margin-top: 10px;">
                ${order.status === 'Shipped' ? `
                    <div style="width: 100%; text-align: center; padding: 12px; background: linear-gradient(135deg, #d1ecf1, #bee5eb); border-radius: 8px; color: #0c5460; font-size: 14px; font-weight: 600; border: 1px solid #b8daff;">
                        🚚 Your Order is Shipped!<br>
                        <span style="font-size: 10px; font-weight: 400;">Your order will be delivered shortly</span>
                    </div>
                ` : order.status === 'Completed' ? `
                    <div style="width: 100%; text-align: center; padding: 12px; background: ${order.refundRequested ? '#fff3cd' : '#d4edda'}; border-radius: 8px; color: ${order.refundRequested ? '#856404' : '#155724'}; font-size: 14px; font-weight: 600;">
                        ${order.refundRequested ? '💰 Refund Initiated — we\'ll get back to you shortly' : '✅ Order Delivered Successfully!<br><span style="font-size: 10px; font-weight: 400;">Thank you for your order!</span>'}
                        ${!order.refundRequested ? '<br>⏰ Auto-delete in: <span id="countdown-' + order.id + '" style="color: #dc3545; font-weight: 600; font-family: monospace;">⏳ Calculating...</span>' : ''}
                    </div>
                ` : order.status === 'Rejected' ? `
                    <div style="width: 100%; text-align: center; padding: 12px; background: #f8d7da; border-radius: 8px; color: #721c24; font-size: 14px; font-weight: 600;">
                        ❌ Order Rejected<br>
                        <span style="font-size: 10px; font-weight: 400;">Sorry, your order was rejected</span><br>
                    ⏰ Auto-delete in: <span id="countdown-' + order.id + '" style="color: #dc3545; font-weight: 600; font-family: monospace;">⏳ Calculating...</span>
                    </div>
                ` : `
                    <div style="width: 100%; text-align: center; padding: 12px; background: #f8f9fa; border-radius: 8px; color: #666; font-size: 14px; font-weight: 600;">
                        ❌ Order Cancelled
                    </div>
                `}
                </div>
                ` : ''}
            `;
}

function searchProducts(searchTerm) {
    const filteredProducts = productsData.filter(product => 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.keywords && product.keywords.some(keyword => 
            keyword.toLowerCase().includes(searchTerm.toLowerCase())
        ))
    );
    
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) return;
    
    productsGrid.innerHTML = '';
    
    if (filteredProducts.length === 0) {
        productsGrid.innerHTML = `<p style="text-align: center; color: #666; grid-column: 1 / -1;">No products found for "${searchTerm}".</p>`;
        return;
    }
    
    filteredProducts.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = "product-card";
        productCard.setAttribute("data-product-id", product.id);;
        productCard.onclick = () => openProductModal(product.id);
        productCard.innerHTML = `
            <div class="product-image-container">
                <img src="${product.imageUrl}" alt="${product.name}" class="product-image" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDIwMCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTUwIiBmaWxsPSIjZjNmNGY2Ii8+Cjx0ZXh0IHg9IjEwMCIgeT0iNzUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OWFhMiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pgo8L3N2Zz4K'">
                <button class="product-heart-icon" onclick="event.stopPropagation(); openProductModal('${product.id}')">♡</button>
                ${getAddButtonHTML(product.id)}
            </div>
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <div class="product-rating" style="color: #fbbf24; font-size: 14px; margin: 4px 0;">
                    ${'⭐'.repeat(product.rating || 0)} ${product.rating ? `(${product.rating})` : ''}
                </div>
                <div class="product-price">₹${product.price}</div>
                <div class="product-buttons">
                    <button class="btn-cart" onclick="event.stopPropagation(); openProductModal('${product.id}')">Add to Cart</button>
                    <button class="btn-order" onclick="event.stopPropagation(); openProductModal('${product.id}')">Order Now</button>
                </div>
            </div>
        `;
        productsGrid.appendChild(productCard);
    });
}

// Check if user is admin (check both localStorage and Firebase)
async function isAdmin(email) {
    // First check localStorage for permanent admins
    if (adminUsers.includes(email)) {
        return true;
    }
    
    // Then check Firebase Firestore for dynamic admin status
    try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        let isFirebaseAdmin = false;
        
        usersSnapshot.forEach((userDoc) => {
            const userData = userDoc.data();
            if (userData.email === email && userData.isAdmin === true) {
                isFirebaseAdmin = true;
            }
        });
        
        return isFirebaseAdmin;
    } catch (error) {
        console.error('Error checking Firebase admin status:', error);
        return false;
    }
}

// Synchronous version for backward compatibility
function isAdminSync(email) {
    return adminUsers.includes(email);
}

// Check if user is delivery man (check Firebase)
async function isDeliveryMan(email) {
    try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        let isFirebaseDeliveryMan = false;
        
        usersSnapshot.forEach((userDoc) => {
            const userData = userDoc.data();
            if (userData.email === email && userData.isDeliveryMan === true) {
                isFirebaseDeliveryMan = true;
            }
        });
        
        return isFirebaseDeliveryMan;
    } catch (error) {
        console.error('Error checking Firebase delivery man status:', error);
        return false;
    }
}

// Toggle wishlist functionality for heart icon
function toggleWishlist(productId) {
    const heartIcon = event.target;
    if (heartIcon.textContent === '♡') {
        heartIcon.textContent = '♥';
        heartIcon.style.color = '#ef4444';
        console.log('Added to wishlist:', productId);
    } else {
        heartIcon.textContent = '♡';
        heartIcon.style.color = '#6b7280';
        console.log('Removed from wishlist:', productId);
    }
}

// Show/hide admin button based on user role
async function updateAdminVisibility(user) {
    const adminBtn = document.getElementById('adminBtn');
    if (adminBtn && user) {
        const userIsAdmin = await isAdmin(user.email);
        if (userIsAdmin) {
            adminBtn.style.display = 'block';
        } else {
            adminBtn.style.display = 'none';
        }
    } else if (adminBtn) {
        adminBtn.style.display = 'none';
    }
}

// Show/hide delivery orders button based on user role
async function updateDeliveryManVisibility(user) {
    const deliveryBtn = document.getElementById('deliveryBtn');
    if (deliveryBtn && user) {
        const userIsDeliveryMan = await isDeliveryMan(user.email);
        if (userIsDeliveryMan) {
            deliveryBtn.style.display = 'block';
        } else {
            deliveryBtn.style.display = 'none';
        }
    } else if (deliveryBtn) {
        deliveryBtn.style.display = 'none';
    }
}

// Add user to registered users list
function addRegisteredUser(user) {
    const existingUser = registeredUsers.find(u => u.email === user.email);
    if (!existingUser) {
        registeredUsers.push({
            name: user.displayName,
            email: user.email,
            isAdmin: isAdminSync(user.email)
        });
        saveData();
    }
}

// Admin Panel Functions
window.openAdminPanel = function() {
    document.getElementById('adminPanel').style.display = 'flex';
    
    // Immediately show orders tab and load data
    showTab('ordersAdmin');
    
    // Show loading state immediately
    const ordersList = document.getElementById('ordersList');
    if (ordersList) {
        ordersList.innerHTML = '<p style="text-align:center; color:#666; padding: 20px;">🔄 Loading orders...</p>';
    }
    
    loadAdminData();
    
    // Add to browser history for back button support
    history.pushState({modal: 'admin'}, '', '');
};

// Delivery Panel Functions
window.openDeliveryPanel = function() {
    document.getElementById('deliveryPanel').style.display = 'flex';
    
    // Immediately show orders tab and load orders
    showDeliveryTab('ordersDelivery');
    
    // Show loading state immediately
    const deliveryOrdersList = document.getElementById('deliveryOrdersList');
    if (deliveryOrdersList) {
        deliveryOrdersList.innerHTML = '<p style="text-align:center; color:#666; padding: 20px;">🔄 Loading orders...</p>';
    }
    
    loadDeliveryOrders();
    
    // Add to browser history for back button support
    history.pushState({modal: 'delivery'}, '', '');
};

window.closeDeliveryPanel = function() {
    document.getElementById('deliveryPanel').style.display = 'none';
    
    // Clean up real-time listener when closing panel
    if (deliveryOrdersListener) {
        deliveryOrdersListener();
        deliveryOrdersListener = null;
    }
};

window.closeAdminPanel = function() {
    document.getElementById('adminPanel').style.display = 'none';
};

// Handle device back button for modal closing
window.addEventListener('popstate', function(event) {
    // Check if any modal is open and close it
    const adminPanel = document.getElementById('adminPanel');
    const deliveryPanel = document.getElementById('deliveryPanel');
    
    if (adminPanel && adminPanel.style.display === 'flex') {
        closeAdminPanel();
    }
    
    if (deliveryPanel && deliveryPanel.style.display === 'flex') {
        closeDeliveryPanel();
    }
});

// Global variable for delivery orders
let allDeliveryOrders = [];

// Load delivery orders with real-time listener (same as admin orders)
let deliveryOrdersListener = null;

function loadDeliveryOrders() {
    try {
        const deliveryOrdersList = document.getElementById('deliveryOrdersList');
        if (!deliveryOrdersList) return;
        
        deliveryOrdersList.innerHTML = '<p style="text-align:center; color:#666; padding: 20px;">Loading orders...</p>';
        
        // Remove existing listener if any
        if (deliveryOrdersListener) {
            deliveryOrdersListener();
        }
        
        const ordersQuery = query(
            collection(db, 'orders'),
            where('status', 'in', ['Pending', 'Shipped', 'Delivered'])
        );
        
        // Set up real-time listener for automatic updates
        deliveryOrdersListener = onSnapshot(ordersQuery, (snapshot) => {
            allDeliveryOrders = [];
            snapshot.forEach(d => allDeliveryOrders.push({ id: d.id, ...d.data() }));

            // Sort newest first if createdAt exists
            allDeliveryOrders.sort((a, b) => {
                const aTime = a.createdAt && a.createdAt.toDate ? a.createdAt.toDate().getTime() : 0;
                const bTime = b.createdAt && b.createdAt.toDate ? b.createdAt.toDate().getTime() : 0;
                return bTime - aTime;
            });

            displayFilteredDeliveryOrders(allDeliveryOrders);
        }, (error) => {
            console.error('Error in delivery orders real-time listener:', error);
            const deliveryOrdersList = document.getElementById('deliveryOrdersList');
            if (deliveryOrdersList) deliveryOrdersList.innerHTML = '<p style="text-align:center; color:#e74c3c; padding: 20px;">Failed to load orders.</p>';
        });
        
    } catch (error) {
        console.error('Error setting up delivery orders listener:', error);
        const deliveryOrdersList = document.getElementById('deliveryOrdersList');
        if (deliveryOrdersList) deliveryOrdersList.innerHTML = '<p style="text-align:center; color:#e74c3c; padding: 20px;">Failed to load orders.</p>';
    }
}

// Display filtered delivery orders (same compact structure as admin)
function displayFilteredDeliveryOrders(orders) {
    const deliveryOrdersList = document.getElementById('deliveryOrdersList');
    if (!deliveryOrdersList) return;

    deliveryOrdersList.innerHTML = '';
    if (orders.length === 0) {
        deliveryOrdersList.innerHTML = '<p style="text-align:center; color:#666; padding: 20px;">No orders found.</p>';
        return;
    }

    orders.forEach(order => {
        const el = document.createElement('div');
        el.className = 'admin-item';
        el.style.cssText = `
            background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
            border: none;
            border-radius: 12px;
            padding: 12px;
            margin-bottom: 12px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.06);
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
            cursor: pointer;
        `;
        
        // Add hover effects
        el.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
            this.style.boxShadow = '0 8px 20px rgba(0,0,0,0.12)';
        });
        
        el.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 4px 15px rgba(0,0,0,0.06)';
        });
        
        el.innerHTML = `
            <div style="position: absolute; top: 0; left: 0; width: 100%; height: 3px; background: ${order.status === 'Pending' ? 'linear-gradient(90deg, #f39c12, #e67e22)' : order.status === 'Shipped' ? 'linear-gradient(90deg, #3498db, #2980b9)' : 'linear-gradient(90deg, #27ae60, #2ecc71)'};"></div>
            
            <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px;">
                <div style="position: relative;">
                    <img src="${order.productImage || ''}" alt="${order.productName || ''}" style="width: 40px; height: 40px; object-fit: contain; border-radius: 6px; background: linear-gradient(135deg, #f8f9fa, #e9ecef); border: 1px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.1);" onerror="this.style.display='none'">
                    <div style="position: absolute; top: -3px; right: -3px; background: ${order.status === 'Pending' ? '#f39c12' : order.status === 'Shipped' ? '#3498db' : '#27ae60'}; color: white; padding: 1px 3px; border-radius: 4px; font-size: 7px; font-weight: 600; box-shadow: 0 1px 3px rgba(0,0,0,0.2);">
                        ${order.status === 'Pending' ? '⏳' : order.status === 'Shipped' ? '🚚' : '✅'}
                    </div>
                </div>
                
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <h3 style="margin: 0; font-size: 13px; font-weight: 700; color: #2c3e50; line-height: 1.2;">${order.productName || 'Product'}</h3>
                        <span style="font-size: 9px; color: #95a5a6; background: rgba(149, 165, 166, 0.1); padding: 1px 4px; border-radius: 3px;">${order.status}</span>
                    </div>
                </div>
            </div>
            
            <div style="background: rgba(52, 152, 219, 0.08); border-radius: 8px; padding: 8px; margin-bottom: 6px; border-left: 3px solid #3498db;">
                <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <span style="color: #3498db; font-size: 11px;">📦</span>
                        <span style="font-size: 11px; color: #2c3e50; font-weight: 600;">Qty: ${order.quantity || 1}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <span style="color: #27ae60; font-size: 11px;">💰</span>
                        <span style="font-size: 10px; color: #27ae60; font-weight: 700;">₹${Math.round((order.totalAmount || 0) * 100) / 100}</span>
                    </div>
                    ${order.walletUsed > 0 ? `
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <span style="color: #f39c12; font-size: 11px;">💰</span>
                        <span style="font-size: 11px; color: #f39c12; font-weight: 600;">Wallet Applied: ₹${Math.round((order.walletUsed || 0) * 100) / 100}</span>
                    </div>
                    ` : ''}
                    ${order.originalAmount && order.originalAmount !== order.totalAmount ? `
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <span style="color: #95a5a6; font-size: 11px;">💸</span>
                        <span style="font-size: 10px; color: #95a5a6; text-decoration: line-through;">Original: ₹${Math.round((order.originalAmount || 0) * 100) / 100}</span>
                    </div>
                    ` : ''}
                </div>
                <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(52, 152, 219, 0.15);">
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <span style="color: #f39c12; font-size: 11px;">💳</span>
                        <span style="font-size: 11px; color: #2c3e50; font-weight: 500;">Payment: ${order.paymentMethod === 'cod' ? '💵 Cash on Delivery' : order.paymentMethod === 'online' ? '💳 Online Payment - Already Paid' : order.paymentMethod || 'Not specified'}</span>
                    </div>
                </div>
            </div>
            
            <div style="background: rgba(149, 165, 166, 0.08); border-radius: 6px; padding: 8px; margin-bottom: 6px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 11px;">
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <span style="color: #3498db;">👤</span>
                        <span style="color: #2c3e50; font-weight: 500;">${order.userName || 'N/A'}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <span style="color: #e74c3c;">📧</span>
                        <span style="color: #2c3e50; font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${order.userEmail || 'N/A'}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <span style="color: #27ae60;">📞</span>
                        <span style="color: #2c3e50; font-weight: 500;">${order.userPhone || 'N/A'}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <span style="color: #9b59b6;">📍</span>
                        <span style="color: #2c3e50; font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Location</span>
                    </div>
                </div>
                <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(149, 165, 166, 0.15);">
                    <div style="display: flex; align-items: flex-start; gap: 4px;">
                        <span style="color: #9b59b6; font-size: 10px; margin-top: 1px;">📍</span>
                        <span style="color: #2c3e50; font-size: 10px; line-height: 1.4; word-break: break-word;">${order.userAddress || 'Address not provided'}</span>
                    </div>
                </div>
            </div>
            
            <div style="background: rgba(52, 73, 94, 0.05); border-radius: 4px; padding: 4px; margin-bottom: 8px;">
                <div style="display: flex; align-items: center; gap: 3px;">
                    <span style="color: #34495e; font-size: 9px;">🆔</span>
                    <span style="font-family: 'Courier New', monospace; font-size: 8px; color: #34495e; background: rgba(52, 73, 94, 0.1); padding: 1px 4px; border-radius: 2px;">${order.id}</span>
                </div>
            </div>
            
            <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(149, 165, 166, 0.15);">
                <button class="btn-invoice" style="flex: 1; min-width: 70px; background: linear-gradient(135deg, #3498db, #2980b9); border: none; padding: 6px 8px; border-radius: 6px; color: white; font-size: 10px; font-weight: 600; box-shadow: 0 2px 6px rgba(52, 152, 219, 0.3); transition: all 0.2s ease; cursor: pointer;" onclick="showInvoice('${order.id}')" onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(52, 152, 219, 0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 6px rgba(52, 152, 219, 0.3)'">📄 Invoice</button>
                
                <button class="btn-location" style="flex: 1; min-width: 70px; background: linear-gradient(135deg, #4285f4, #1a73e8); border: none; padding: 6px 8px; border-radius: 6px; color: white; font-size: 10px; font-weight: 600; box-shadow: 0 2px 6px rgba(66, 133, 244, 0.3); transition: all 0.2s ease; cursor: pointer;" onclick="openUserLocation('${order.id}')" onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(66, 133, 244, 0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 6px rgba(66, 133, 244, 0.3)'">📍 Location</button>
                
                ${order.status === 'Pending' ? `
                <button class="btn-primary" style="flex: 1; min-width: 60px; background: linear-gradient(135deg, #f39c12, #e67e22); border: none; padding: 6px 8px; border-radius: 6px; color: white; font-size: 10px; font-weight: 600; box-shadow: 0 2px 6px rgba(243, 156, 18, 0.3); transition: all 0.2s ease; cursor: pointer;" onclick="adminShipOrder('${order.id}')" onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(243, 156, 18, 0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 6px rgba(243, 156, 18, 0.3)'">🚚 Ship</button>
                ` : ''}
                
                <button class="btn-success" style="flex: 1; min-width: 70px; background: linear-gradient(135deg, #27ae60, #2ecc71); border: none; padding: 6px 8px; border-radius: 6px; color: white; font-size: 10px; font-weight: 600; box-shadow: 0 2px 6px rgba(39, 174, 96, 0.3); transition: all 0.2s ease; cursor: pointer;" onclick="deliveryCompleteOrder('${order.id}')" onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(39, 174, 96, 0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 6px rgba(39, 174, 96, 0.3)'">✅ Complete</button>
                
                <button class="btn-danger" style="flex: 1; min-width: 60px; background: linear-gradient(135deg, #e74c3c, #c0392b); border: none; padding: 6px 8px; border-radius: 6px; color: white; font-size: 10px; font-weight: 600; box-shadow: 0 2px 6px rgba(231, 76, 60, 0.3); transition: all 0.2s ease; cursor: pointer;" onclick="adminRejectOrder('${order.id}')" onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(231, 76, 60, 0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 6px rgba(231, 76, 60, 0.3)'">❌ Reject</button>
            </div>
        `;
        deliveryOrdersList.appendChild(el);
    });
}

// Mark order as delivered by delivery man (same as adminCompleteOrder)
window.deliveryCompleteOrder = async function(orderId) {
    try {
        // Get order data first to check for cashback
        const orderDoc = await getDoc(doc(db, 'orders', orderId));
        const orderData = orderDoc.data();
        
        await updateDoc(doc(db, 'orders', orderId), { 
            status: 'Completed',
            completedAt: new Date(),
            deliveredBy: currentUser ? currentUser.email : 'Unknown'
        });
        
        // Transfer cashback from pending to earned if order has cashback
        if (orderData && orderData.cashbackAmount > 0 && orderData.userId) {
            console.log(`Transferring ₹${orderData.cashbackAmount} from pending to earned cashback for customer ${orderData.userId}`);
            await completeCashbackForOrder(orderId, orderData.cashbackAmount, orderData.userId);
            showNotification(`Order completed! Customer earned ₹${orderData.cashbackAmount} cashback ✅`, 'success');
        } else {
            showNotification('Order marked as Completed ✅', 'success');
        }
        
        // Schedule automatic deletion after 8 days
        scheduleOrderDeletion(orderId, 8 * 24 * 60 * 60 * 1000); // 8 days in milliseconds
        
        // Refresh delivery orders list immediately
        loadDeliveryOrders();
        
        // Also refresh admin orders if admin panel is open
        if (document.getElementById('adminPanel').style.display === 'flex') {
            loadPendingOrdersForAdmin();
        }
        // Also refresh user orders if currently viewing
        loadOrdersDataFromFirebase();
        
    } catch (error) {
        console.error('Error completing order:', error);
        showNotification('Failed to complete order', 'error');
    }
};

// Filter delivery orders
window.filterDeliveryOrders = function() {
    const statusFilter = document.getElementById('deliveryOrderStatusFilter').value;
    const searchTerm = document.getElementById('deliveryOrderSearchInput').value.toLowerCase();
    
    let filtered = allDeliveryOrders;
    
    // Filter by status
    if (statusFilter !== 'all') {
        filtered = filtered.filter(order => order.status === statusFilter);
    }
    
    // Filter by search term
    if (searchTerm) {
        filtered = filtered.filter(order => 
            (order.customerName && order.customerName.toLowerCase().includes(searchTerm)) ||
            (order.phone && order.phone.includes(searchTerm)) ||
            (order.productName && order.productName.toLowerCase().includes(searchTerm)) ||
            (order.id && order.id.toLowerCase().includes(searchTerm))
        );
    }
    
    displayFilteredDeliveryOrders(filtered);
};

// Search delivery orders
window.searchDeliveryOrders = function() {
    filterDeliveryOrders();
};

// Clear delivery filters
window.clearDeliveryFilters = function() {
    document.getElementById('deliveryOrderStatusFilter').value = 'all';
    document.getElementById('deliveryOrderSearchInput').value = '';
    displayFilteredDeliveryOrders(allDeliveryOrders);
};

// Show delivery tab function (same as admin showTab)
window.showDeliveryTab = function(tabName) {
    // Hide all tabs
    document.querySelectorAll('#deliveryPanel .tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('#deliveryPanel .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    const selectedTab = document.getElementById(tabName + 'Tab');
    const selectedBtn = document.querySelector(`#deliveryPanel .tab-btn[onclick="showDeliveryTab('${tabName}')"]`);
    
    if (selectedTab) selectedTab.classList.add('active');
    if (selectedBtn) selectedBtn.classList.add('active');
    
    // Load data for specific tabs
    if (tabName === 'ordersDelivery') {
        loadDeliveryOrders();
    }
};

window.showTab = function(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabName + 'Tab').classList.add('active');
    
    // Find and activate the correct button
    const targetBtn = document.querySelector(`#adminPanel .tab-btn[onclick*="showTab('${tabName}')"]`);
    if (targetBtn) {
        targetBtn.classList.add('active');
    } else if (typeof event !== 'undefined' && event && event.target) {
        event.target.classList.add('active');
    }
    
    if (tabName === 'slides') {
        loadSlidesData();
    } else if (tabName === 'categories') {
        loadCategoriesAdminData();
    } else if (tabName === 'products') {
        loadProductsAdminData();
        
        // Add search functionality for products
        const productSearchInput = document.getElementById('productSearchInput');
        if (productSearchInput) {
            productSearchInput.addEventListener('input', function() {
                loadProductsAdminData();
            });
        }
    } else if (tabName === 'users') {
        loadUsersData();
    } else if (tabName === 'events') {
        loadEventsData();
        loadEventProductSelection();
        
        // Add search functionality for event products
        const searchInput = document.getElementById('eventProductSearch');
        if (searchInput) {
            searchInput.addEventListener('input', function() {
                loadEventProductSelection(this.value);
            });
        }
    } else if (tabName === 'ordersAdmin') {
        loadPendingOrdersForAdmin();
    }
};

// Switch between Orders and Refund sections
window.switchOrderSection = function(section) {
    const ordersSection = document.getElementById('ordersSection');
    const refundSection = document.getElementById('refundSection');
    const ordersSwitch = document.getElementById('ordersSwitch');
    const refundSwitch = document.getElementById('refundSwitch');
    
    if (section === 'orders') {
        ordersSection.style.display = 'block';
        refundSection.style.display = 'none';
        ordersSwitch.style.background = '#007bff';
        ordersSwitch.style.color = 'white';
        ordersSwitch.style.border = 'none';
        refundSwitch.style.background = '#f8f9fa';
        refundSwitch.style.color = '#666';
        refundSwitch.style.border = '1px solid #ddd';
        loadPendingOrdersForAdmin();
    } else {
        ordersSection.style.display = 'none';
        refundSection.style.display = 'block';
        refundSwitch.style.background = '#007bff';
        refundSwitch.style.color = 'white';
        refundSwitch.style.border = 'none';
        ordersSwitch.style.background = '#f8f9fa';
        ordersSwitch.style.color = '#666';
        ordersSwitch.style.border = '1px solid #ddd';
        loadRefundRequests();
    }
};

// Toggle Return Dropdown Function
window.toggleReturnDropdown = function(orderId) {
    const dropdown = document.getElementById(`returnDropdown-${orderId}`);
    const isVisible = dropdown.style.display !== 'none';
    
    // Close all other dropdowns first
    document.querySelectorAll('[id^="returnDropdown-"]').forEach(dd => {
        dd.style.display = 'none';
    });
    
    // Toggle current dropdown
    dropdown.style.display = isVisible ? 'none' : 'block';
    
    // Add event listener for "Other" option
    const reasonSelect = document.getElementById(`returnReason-${orderId}`);
    const customReasonTextarea = document.getElementById(`customReason-${orderId}`);
    
    reasonSelect.onchange = function() {
        if (this.value === 'Other') {
            customReasonTextarea.style.display = 'block';
            customReasonTextarea.focus();
        } else {
            customReasonTextarea.style.display = 'none';
            customReasonTextarea.value = '';
        }
    };
};

// Submit Return with Reason Function
window.submitReturn = async function(orderId) {
    const reasonSelect = document.getElementById(`returnReason-${orderId}`);
    const customReasonTextarea = document.getElementById(`customReason-${orderId}`);
    
    let returnReason = reasonSelect.value;
    
    // Validation
    if (!returnReason) {
        showNotification('Please select a return reason', 'error');
        return;
    }
    
    // If "Other" is selected, use custom reason
    if (returnReason === 'Other') {
        const customReason = customReasonTextarea.value.trim();
        if (!customReason) {
            showNotification('Please specify your reason', 'error');
            customReasonTextarea.focus();
            return;
        }
        returnReason = `Other: ${customReason}`;
    }
    
    try {
        const orderRef = doc(db, 'orders', orderId);
        await updateDoc(orderRef, {
            refundRequested: true,
            refundRequestedAt: new Date(),
            returnReason: returnReason
        });
        
        showNotification('Return request submitted successfully! 💰', 'success');
        
        // Close dropdown
        document.getElementById(`returnDropdown-${orderId}`).style.display = 'none';
        
        // Refresh both order tabs to show the order moved to refund section
        loadRegularOrders(); // Refresh My Orders (order will be removed from here)
        loadRefundOrders();  // Refresh My Refund Orders (order will appear here)
        
        // Auto-switch to refund orders tab to show the user their refund request
        setTimeout(() => {
            switchOrderTab('refunds');
        }, 1000);
    } catch (error) {
        console.error('Error requesting return:', error);
        showNotification('Failed to submit return request', 'error');
    }
};

// Legacy Refund Request Function (keeping for compatibility)
window.requestRefund = async function(orderId) {
    try {
        const orderRef = doc(db, 'orders', orderId);
        await updateDoc(orderRef, {
            refundRequested: true,
            refundRequestedAt: new Date()
        });
        
        showNotification('Refund request submitted successfully! 💰', 'success');
        
        // Refresh both order tabs to show the order moved to refund section
        loadRegularOrders(); // Refresh My Orders (order will be removed from here)
        loadRefundOrders();  // Refresh My Refund Orders (order will appear here)
        
        // Auto-switch to refund orders tab to show the user their refund request
        setTimeout(() => {
            switchOrderTab('refunds');
        }, 1000);
    } catch (error) {
        console.error('Error requesting refund:', error);
        showNotification('Failed to submit refund request', 'error');
    }
};

// Load Refund Requests for Admin
window.loadRefundRequests = async function() {
    try {
        const refundsList = document.getElementById('adminRefundsList');
        if (!refundsList) {
            console.log('Admin refunds list element not found');
            return;
        }
        
        refundsList.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">Loading refund requests...</div>';
        
        console.log('Loading admin refund requests...');
        
        const ordersQuery = query(
            collection(db, 'orders'),
            where('refundRequested', '==', true),
            orderBy('refundRequestedAt', 'desc')
        );
        
        const querySnapshot = await getDocs(ordersQuery);
        console.log('Admin refund requests found:', querySnapshot.size);
        
        if (querySnapshot.empty) {
            refundsList.innerHTML = '<div style="text-align: center; padding: 40px; color: #666;"><h4>No Refund Requests</h4><p>All refund requests have been processed</p></div>';
            return;
        }
        
        refundsList.innerHTML = '';
        
        querySnapshot.forEach((doc) => {
            const order = { id: doc.id, ...doc.data() };
            const refundElement = document.createElement('div');
            refundElement.className = 'order-card';
            refundElement.style.cssText = 'background: linear-gradient(145deg, #ffffff, #f8f9fa); border: 1px solid #e9ecef; border-radius: 16px; padding: 20px; margin-bottom: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.08); transition: all 0.3s ease; position: relative; overflow: hidden;';
            
            // Add refund badge
            refundElement.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-2px)';
                this.style.boxShadow = '0 6px 25px rgba(0, 0, 0, 0.12)';
            });
            refundElement.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0)';
                this.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.08)';
            });
            
            refundElement.innerHTML = `
                <!-- Refund Badge -->
                <div style="position: absolute; top: -8px; right: -8px; background: linear-gradient(135deg, #dc3545, #c82333); color: white; padding: 8px 16px; border-radius: 0 16px 0 16px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 2px 8px rgba(220,53,69,0.3); z-index: 2;">
                    💰 REFUND REQUEST
                </div>
                
                <!-- Top section: Image + Name/Description -->
                <div style="display: flex; gap: 12px; align-items: flex-start; margin-bottom: 15px; margin-top: 12px;">
                    <div style="flex-shrink: 0;">
                        <img src="${order.productImage}" alt="${order.productName}" 
                             style="width: 70px; height: 70px; object-fit: contain; border-radius: 8px; background: #f8f9fa; border: 1px solid #e9ecef;"
                             onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzAiIGhlaWdodD0iNzAiIHZpZXdCb3g9IjAgMCA3MCA3MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjcwIiBoZWlnaHQ9IjcwIiBmaWxsPSIjRjhGOUZBIi8+CjxwYXRoIGQ9Ik0yNSAyNUg0NVY0NUgyNVYyNVoiIGZpbGw9IiNEREREREQiLz4KPC9zdmc+Cg=='">
                    </div>
                    <div style="flex: 1; min-width: 0;">
                        <h3 style="font-size: 16px; font-weight: 700; color: #2c3e50; margin: 0 0 5px 0; line-height: 1.3; word-break: break-word;">${order.productName}</h3>
                        ${(() => {
                            const product = productsData.find(p => p.id === order.productId);
                            const rating = product ? product.rating : 0;
                            return rating > 0 ? `<div style="color: #fbbf24; font-size: 10px; margin: 2px 0;">${'⭐'.repeat(rating)} (${rating})</div>` : '';
                        })()}
                        <div style="font-size: 10px; color: #666; margin-bottom: 3px;">Order ID: <span style="font-family: monospace; background: #f8f9fa; padding: 1px 4px; border-radius: 3px;">${order.id.substring(0, 12)}...</span></div>
                        <div style="font-size: 10px; color: #666;">📅 ${order.orderDate}</div>
                    </div>
                </div>
                
                <!-- Middle section: Half width for quantity/amount/size, Half width for total -->
                <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                    <div style="flex: 1; background: #f8f9fa; padding: 10px; border-radius: 6px;">
                        <div style="font-size: 13px; color: #666; margin-bottom: 3px;">Quantity: <strong>${order.quantity}</strong></div>
                        <div style="font-size: 13px; color: #666; margin-bottom: 3px;">Unit Price: ₹${order.productPrice}</div>
                        ${order.productSize ? `<div style="font-size: 13px; color: #666; margin-bottom: 3px;">Size: <strong>${order.productSize}</strong></div>` : ''}
                        ${order.deliveryCharge ? `<div style="font-size: 13px; color: #27ae60; font-weight: 600;">🚚 Delivery: ₹${order.deliveryCharge}</div>` : ''}
                        ${(() => {
                            const walletAmount = order.walletUsed || 0;
                            const bgColor = walletAmount > 0 ? 'rgba(142, 68, 173, 0.1)' : 'rgba(108, 117, 125, 0.1)';
                            const textColor = walletAmount > 0 ? '#8e44ad' : '#6c757d';
                            return `<div style="font-size: 13px; color: ${textColor}; font-weight: 600; background: ${bgColor}; padding: 6px; border-radius: 4px; margin: 2px 0;">💰 Wallet Applied: ₹${Math.round(walletAmount * 100) / 100}</div>`;
                        })()}
                        ${order.originalAmount && order.originalAmount !== order.totalAmount ? `<div style="font-size: 10px; color: #999;">Original Amount: ₹${order.originalAmount}</div>` : ''}
                    </div>
                    <div style="flex: 1; background: #ffe8e8; padding: 10px; border-radius: 6px; text-align: center; display: flex; flex-direction: column; justify-content: center; border: 2px solid #dc3545;">
                        <div style="font-size: 10px; color: #dc3545; margin-bottom: 2px; font-weight: 600;">💰 REFUND AMOUNT</div>
                        <div style="font-size: 18px; font-weight: 700; color: #dc3545;">₹${order.totalAmount}</div>
                        <div style="background: #dc3545; color: white; font-size: 10px; padding: 2px 6px; border-radius: 8px; display: inline-block; margin-top: 3px;">FULL REFUND</div>
                    </div>
                </div>
                
                <!-- Status section -->
                <div style="width: 100%; margin-bottom: 15px; text-align: center;">
                    <div style="display: inline-flex; align-items: center; gap: 10px; background: #fff3cd; color: #856404; padding: 8px 20px; border-radius: 20px; font-size: 10px; font-weight: 600; text-transform: uppercase; border: 2px solid #ffeaa7;">
                        <span>💰</span>
                        REFUND REQUESTED
                    </div>
                </div>
                
                <!-- Delivery info -->
                <div style="background: #f0f8ff; padding: 10px; border-radius: 6px; margin-bottom: 15px; font-size: 10px; color: #666;">
                    <div style="font-weight: 600; margin-bottom: 5px; color: #2c3e50;">🚚 Delivery Information:</div>
                    <div style="margin-bottom: 3px;">📞 Phone: ${order.userPhone || 'Not provided'}</div>
                    <div style="margin-bottom: 3px;">📍 Address: ${order.userAddress || 'Not provided'}</div>
                    <div style="margin-bottom: 3px;">💳 Payment: ${(() => {
                        const method = order.paymentMethod || 'Not specified';
                        if (method === 'cod') return 'Cash on Delivery (COD)';
                        if (method === 'online') return '<span style="color: #27ae60; font-weight: 600;">Online Payment - Already Paid ✅</span>';
                        return method;
                    })()}</div>
                </div>
                
                <!-- Return Reason -->
                ${order.returnReason ? `
                <div style="background: #fff3cd; padding: 12px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid #f39c12;">
                    <div style="font-weight: 600; margin-bottom: 5px; color: #856404; font-size: 13px;">📝 Return Reason:</div>
                    <div style="color: #856404; font-size: 10px; font-weight: 500; background: white; padding: 8px; border-radius: 4px; border: 1px solid #ffeaa7;">
                        ${order.returnReason}
                    </div>
                </div>
                ` : ''}
                
                <!-- Action buttons -->
                <div style="display: flex; gap: 10px; margin-top: 10px;">
                    <!-- Location button -->
                    <button onclick="openUserLocation('${order.id}')" 
                            style="flex: 1; background: linear-gradient(135deg, #4285f4, #1a73e8); color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(66, 133, 244, 0.3);"
                            onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 20px rgba(66, 133, 244, 0.4)'"
                            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(66, 133, 244, 0.3)'">
                        📍 Location
                    </button>
                    <!-- Complete Refund button -->
                    <button onclick="completeRefund('${order.id}')" 
                            style="flex: 1; background: linear-gradient(135deg, #dc3545, #c82333); color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(220, 53, 69, 0.3);"
                            onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 20px rgba(220, 53, 69, 0.4)'"
                            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(220, 53, 69, 0.3)'">
                        💰 Complete Refund & Remove Order
                    </button>
                </div>
            `;
            
            refundsList.appendChild(refundElement);
        });
        
    } catch (error) {
        console.error('Error loading refund requests:', error);
        document.getElementById('adminRefundsList').innerHTML = '<div style="text-align: center; padding: 20px; color: #e74c3c;">Error loading refund requests</div>';
    }
};

// Complete Refund Function
window.completeRefund = async function(orderId) {
    try {
        // First get the order data to extract user info and total amount
        const orderRef = doc(db, 'orders', orderId);
        const orderDoc = await getDoc(orderRef);
        
        if (!orderDoc.exists()) {
            showNotification('Order not found', 'error');
            return;
        }
        
        const orderData = orderDoc.data();
        const userId = orderData.userId;
        const totalAmount = orderData.totalAmount || 0;
        
        console.log(`Processing refund for order ${orderId}: ₹${totalAmount} to user ${userId}`);
        
        // Add refund amount to user's earned cashback wallet
        if (userId && totalAmount > 0) {
            const userRef = doc(db, 'users', userId);
            const userDoc = await getDoc(userRef);
            const currentEarned = userDoc.exists() ? (userDoc.data().earnedCashback || 0) : 0;
            const newEarned = Math.round((currentEarned + totalAmount) * 100) / 100;
            
            await setDoc(userRef, { 
                earnedCashback: newEarned 
            }, { merge: true });
            
            console.log(`Cashback wallet updated: ₹${currentEarned} → ₹${newEarned} (Added ₹${totalAmount})`);
            
            // If the refunded user is currently logged in, refresh their wallet display and show notification
            if (currentUser && currentUser.uid === userId) {
                loadWalletBalance();
                console.log('Refreshed wallet balance for current user');
                
                // Show user notification about cashback credit
                setTimeout(() => {
                    showNotification(`🎉 Great news! ₹${totalAmount} has been added to your cashback wallet!`, 'success');
                }, 2000);
            }
        }
        
        // Delete the order completely
        await deleteDoc(orderRef);
        
        showNotification(`Refund completed! ₹${totalAmount} added to customer's cashback wallet ✅`, 'success');
        loadRefundRequests(); // Refresh admin refund requests
        
        // Only refresh delivery refunds if the function exists and delivery panel is open
        if (typeof loadDeliveryRefundRequests === 'function') {
            loadDeliveryRefundRequests();
        }
        
        // Also refresh orders if orders section is visible
        if (document.getElementById('ordersSection').style.display !== 'none') {
            loadPendingOrdersForAdmin();
        }
        
        // Also refresh delivery orders if visible
        if (document.getElementById('deliveryOrdersSection').style.display !== 'none') {
            loadDeliveryOrders();
        }
        
        // Real-time update: Refresh user orders if user is currently viewing orders
        if (currentUser && document.getElementById('ordersSection').classList.contains('active')) {
            console.log('Refreshing user orders after refund completion');
            
            // Check which tab is currently active and refresh accordingly
            const myOrdersContent = document.getElementById('myOrdersContent');
            const myRefundOrdersContent = document.getElementById('myRefundOrdersContent');
            
            if (myOrdersContent && myOrdersContent.style.display !== 'none') {
                // User is viewing "My Orders" tab
                loadRegularOrders();
            }
            
            if (myRefundOrdersContent && myRefundOrdersContent.style.display !== 'none') {
                // User is viewing "My Refund Orders" tab - refresh it since order will be removed
                setTimeout(() => {
                    loadRefundOrders();
                }, 1000);
            }
            
            // If neither tab is explicitly hidden, default to refreshing regular orders
            if (!myRefundOrdersContent || myRefundOrdersContent.style.display === 'none') {
                loadRegularOrders();
            }
        }
        
    } catch (error) {
        console.error('Error completing refund:', error);
        showNotification('Failed to complete refund', 'error');
    }
};

// Switch function for delivery order section
window.switchDeliveryOrderSection = function(section) {
    const ordersSection = document.getElementById('deliveryOrdersSection');
    const refundSection = document.getElementById('deliveryRefundSection');
    const ordersSwitch = document.getElementById('deliveryOrdersSwitch');
    const refundSwitch = document.getElementById('deliveryRefundSwitch');
    
    if (section === 'orders') {
        ordersSection.style.display = 'block';
        refundSection.style.display = 'none';
        ordersSwitch.style.background = '#007bff';
        ordersSwitch.style.color = 'white';
        ordersSwitch.style.border = 'none';
        refundSwitch.style.background = '#f8f9fa';
        refundSwitch.style.color = '#666';
        refundSwitch.style.border = '1px solid #ddd';
        loadDeliveryOrders();
    } else if (section === 'refund') {
        ordersSection.style.display = 'none';
        refundSection.style.display = 'block';
        refundSwitch.style.background = '#007bff';
        refundSwitch.style.color = 'white';
        refundSwitch.style.border = 'none';
        ordersSwitch.style.background = '#f8f9fa';
        ordersSwitch.style.color = '#666';
        ordersSwitch.style.border = '1px solid #ddd';
        loadDeliveryRefundRequests();
    }
};

// Load Refund Requests for Delivery Panel
window.loadDeliveryRefundRequests = async function() {
    try {
        const refundsList = document.getElementById('deliveryRefundsList');
        if (!refundsList) {
            console.log('Delivery refunds list element not found');
            return;
        }
        
        refundsList.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">Loading refund requests...</div>';
        
        console.log('Loading delivery refund requests...');
        
        const ordersQuery = query(
            collection(db, 'orders'),
            where('refundRequested', '==', true),
            orderBy('refundRequestedAt', 'desc')
        );
        
        const querySnapshot = await getDocs(ordersQuery);
        console.log('Refund requests found:', querySnapshot.size);
        
        if (querySnapshot.empty) {
            refundsList.innerHTML = '<div style="text-align: center; padding: 40px; color: #666;"><h4>No Refund Requests</h4><p>All refund requests have been processed</p></div>';
            return;
        }
        
        refundsList.innerHTML = '';
        
        querySnapshot.forEach((doc) => {
            const order = { id: doc.id, ...doc.data() };
            const refundElement = document.createElement('div');
            refundElement.className = 'order-card';
            refundElement.style.cssText = 'background: linear-gradient(145deg, #ffffff, #f8f9fa); border: 1px solid #e9ecef; border-radius: 16px; padding: 20px; margin-bottom: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.08); transition: all 0.3s ease; position: relative; overflow: hidden;';
            
            // Add refund badge
            refundElement.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-2px)';
                this.style.boxShadow = '0 6px 25px rgba(0, 0, 0, 0.12)';
            });
            refundElement.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0)';
                this.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.08)';
            });
            
            refundElement.innerHTML = `
                <!-- Refund Badge -->
                <div style="position: absolute; top: -8px; right: -8px; background: linear-gradient(135deg, #17a2b8, #138496); color: white; padding: 8px 16px; border-radius: 0 16px 0 16px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 2px 8px rgba(23,162,184,0.3); z-index: 2;">
                    🚚 DELIVERY REFUND
                </div>
                
                <!-- Top section: Image + Name/Description -->
                <div style="display: flex; gap: 12px; align-items: flex-start; margin-bottom: 15px; margin-top: 12px;">
                    <div style="flex-shrink: 0;">
                        <img src="${order.productImage}" alt="${order.productName}" 
                             style="width: 70px; height: 70px; object-fit: contain; border-radius: 8px; background: #f8f9fa; border: 1px solid #e9ecef;"
                             onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzAiIGhlaWdodD0iNzAiIHZpZXdCb3g9IjAgMCA3MCA3MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjcwIiBoZWlnaHQ9IjcwIiBmaWxsPSIjRjhGOUZBIi8+CjxwYXRoIGQ9Ik0yNSAyNUg0NVY0NUgyNVYyNVoiIGZpbGw9IiNEREREREQiLz4KPC9zdmc+Cg=='">
                    </div>
                    <div style="flex: 1; min-width: 0;">
                        <h3 style="font-size: 16px; font-weight: 700; color: #2c3e50; margin: 0 0 5px 0; line-height: 1.3; word-break: break-word;">${order.productName}</h3>
                        ${(() => {
                            const product = productsData.find(p => p.id === order.productId);
                            const rating = product ? product.rating : 0;
                            return rating > 0 ? `<div style="color: #fbbf24; font-size: 10px; margin: 2px 0;">${'⭐'.repeat(rating)} (${rating})</div>` : '';
                        })()}
                        <div style="font-size: 10px; color: #666; margin-bottom: 3px;">Order ID: <span style="font-family: monospace; background: #f8f9fa; padding: 1px 4px; border-radius: 3px;">${order.id.substring(0, 12)}...</span></div>
                        <div style="font-size: 10px; color: #666;">📅 ${order.orderDate}</div>
                    </div>
                </div>
                
                <!-- Middle section: Half width for quantity/amount/size, Half width for total -->
                <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                    <div style="flex: 1; background: #f8f9fa; padding: 10px; border-radius: 6px;">
                        <div style="font-size: 13px; color: #666; margin-bottom: 3px;">Quantity: <strong>${order.quantity}</strong></div>
                        <div style="font-size: 13px; color: #666; margin-bottom: 3px;">Unit Price: ₹${order.productPrice}</div>
                        ${order.productSize ? `<div style="font-size: 13px; color: #666; margin-bottom: 3px;">Size: <strong>${order.productSize}</strong></div>` : ''}
                        ${order.deliveryCharge ? `<div style="font-size: 13px; color: #27ae60; font-weight: 600;">🚚 Delivery: ₹${order.deliveryCharge}</div>` : ''}
                        ${(() => {
                            const walletAmount = order.walletUsed || 0;
                            const bgColor = walletAmount > 0 ? 'rgba(142, 68, 173, 0.1)' : 'rgba(108, 117, 125, 0.1)';
                            const textColor = walletAmount > 0 ? '#8e44ad' : '#6c757d';
                            return `<div style="font-size: 13px; color: ${textColor}; font-weight: 600; background: ${bgColor}; padding: 6px; border-radius: 4px; margin: 2px 0;">💰 Wallet Applied: ₹${Math.round(walletAmount * 100) / 100}</div>`;
                        })()}
                        ${order.originalAmount && order.originalAmount !== order.totalAmount ? `<div style="font-size: 10px; color: #999;">Original Amount: ₹${order.originalAmount}</div>` : ''}
                    </div>
                    <div style="flex: 1; background: #e8f4fd; padding: 10px; border-radius: 6px; text-align: center; display: flex; flex-direction: column; justify-content: center; border: 2px solid #17a2b8;">
                        <div style="font-size: 10px; color: #17a2b8; margin-bottom: 2px; font-weight: 600;">🚚 REFUND AMOUNT</div>
                        <div style="font-size: 18px; font-weight: 700; color: #17a2b8;">₹${order.totalAmount}</div>
                        <div style="background: #17a2b8; color: white; font-size: 10px; padding: 2px 6px; border-radius: 8px; display: inline-block; margin-top: 3px;">FULL REFUND</div>
                    </div>
                </div>
                
                <!-- Status section -->
                <div style="width: 100%; margin-bottom: 15px; text-align: center;">
                    <div style="display: inline-flex; align-items: center; gap: 10px; background: #d1ecf1; color: #0c5460; padding: 8px 20px; border-radius: 20px; font-size: 10px; font-weight: 600; text-transform: uppercase; border: 2px solid #bee5eb;">
                        <span>🚚</span>
                        DELIVERY REFUND REQUESTED
                    </div>
                </div>
                
                <!-- Delivery info -->
                <div style="background: #f0f8ff; padding: 10px; border-radius: 6px; margin-bottom: 15px; font-size: 10px; color: #666;">
                    <div style="font-weight: 600; margin-bottom: 5px; color: #2c3e50;">🚚 Delivery Information:</div>
                    <div style="margin-bottom: 3px;">📞 Phone: ${order.userPhone || 'Not provided'}</div>
                    <div style="margin-bottom: 3px;">📍 Address: ${order.userAddress || 'Not provided'}</div>
                    <div style="margin-bottom: 3px;">💳 Payment: ${(() => {
                        const method = order.paymentMethod || 'Not specified';
                        if (method === 'cod') return 'Cash on Delivery (COD)';
                        if (method === 'online') return '<span style="color: #27ae60; font-weight: 600;">Online Payment - Already Paid ✅</span>';
                        return method;
                    })()}</div>
                </div>
                
                <!-- Return Reason -->
                ${order.returnReason ? `
                <div style="background: #fff3cd; padding: 12px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid #f39c12;">
                    <div style="font-weight: 600; margin-bottom: 5px; color: #856404; font-size: 13px;">📝 Return Reason:</div>
                    <div style="color: #856404; font-size: 10px; font-weight: 500; background: white; padding: 8px; border-radius: 4px; border: 1px solid #ffeaa7;">
                        ${order.returnReason}
                    </div>
                </div>
                ` : ''}
                
                <!-- Action buttons -->
                <div style="display: flex; gap: 10px; margin-top: 10px;">
                    <!-- Location button -->
                    <button onclick="openUserLocation('${order.id}')" 
                            style="flex: 1; background: linear-gradient(135deg, #4285f4, #1a73e8); color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(66, 133, 244, 0.3);"
                            onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 20px rgba(66, 133, 244, 0.4)'"
                            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(66, 133, 244, 0.3)'">
                        📍 Location
                    </button>
                    <!-- Complete Refund button -->
                    <button onclick="completeRefund('${order.id}')" 
                            style="flex: 1; background: linear-gradient(135deg, #17a2b8, #138496); color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(23, 162, 184, 0.3);"
                            onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 20px rgba(23, 162, 184, 0.4)'"
                            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(23, 162, 184, 0.3)'">
                        🚚 Complete Refund & Remove Order
                    </button>
                </div>
            `;
            
            refundsList.appendChild(refundElement);
        });
        
    } catch (error) {
        console.error('Error loading delivery refund requests:', error);
        document.getElementById('deliveryRefundsList').innerHTML = '<div style="text-align: center; padding: 20px; color: #e74c3c;">Error loading refund requests</div>';
    }
};

// Test function to check all orders and their refund status
window.testRefundData = async function() {
    try {
        console.log('=== TESTING REFUND DATA ===');
        
        // Get all orders
        const allOrdersQuery = query(collection(db, 'orders'));
        const allOrdersSnapshot = await getDocs(allOrdersQuery);
        
        console.log('Total orders in database:', allOrdersSnapshot.size);
        
        let refundRequestedCount = 0;
        allOrdersSnapshot.forEach((doc) => {
            const order = doc.data();
            console.log(`Order ${doc.id}:`, {
                status: order.status,
                refundRequested: order.refundRequested,
                refundRequestedAt: order.refundRequestedAt,
                customerEmail: order.customerEmail
            });
            
            if (order.refundRequested === true) {
                refundRequestedCount++;
            }
        });
        
        console.log('Orders with refundRequested=true:', refundRequestedCount);
        console.log('=== END TEST ===');
        
    } catch (error) {
        console.error('Error testing refund data:', error);
    }
};

// Slideshow Management
window.addSlide = async function() {
    const title = document.getElementById('slideTitle').value;
    const url = document.getElementById('slideUrl').value;
    
    if (!title || !url) {
        showNotification('Please fill in both title and URL', 'warning');
        return;
    }
    
    if (slidesData.length >= 5) {
        showNotification('Maximum 5 slides allowed', 'warning');
        return;
    }
    
    // Add to Firebase instead of localStorage
    const success = await addSlideToFirebase(title, url);
    if (success) {
        loadSlidesData();
        // Clear form
        document.getElementById('slideTitle').value = '';
        document.getElementById('slideUrl').value = '';
    } else {
        showNotification('Error adding slide. Please try again.', 'error');
    }
};

window.removeSlide = async function(slideId) {
    console.log('Attempting to remove slide with ID:', slideId);
    const success = await removeSlideFromFirebase(slideId);
    if (success) {
        loadSlidesData();
    } else {
        showNotification('Error removing slide. Please try again.', 'error');
    }
}

function loadSlidesData() {
    const slidesList = document.getElementById('slidesList');
    slidesList.innerHTML = '';
    
    slidesData.forEach((slide, index) => {
        const slideItem = document.createElement('div');
        slideItem.className = 'slide-item';
        slideItem.innerHTML = `
            <div class="slide-info">
                <div class="slide-title-admin">${slide.title}</div>
                <div class="slide-url">${slide.originalUrl || slide.url}</div>
                <small style="color: #999;">ID: ${slide.id}</small>
            </div>
            <div class="action-buttons">
                <button class="btn-danger" onclick="removeSlide('${slide.id}')">Remove</button>
            </div>
        `;
        slidesList.appendChild(slideItem);
    });
}

// Event Management
let eventsData = [];

// Template preview functionality
document.addEventListener('DOMContentLoaded', function() {
    const templateSelect = document.getElementById('eventTemplate');
    const templatePreview = document.getElementById('templatePreview');
    
    if (templateSelect && templatePreview) {
        templateSelect.addEventListener('change', function() {
            const selectedTemplate = this.value;
            const previews = {
                'template-1': '<strong>🎯 Modern Scroll:</strong> Smooth horizontal scrolling with 200px cards, perfect for showcasing products',
                'template-2': '<strong>📱 Smart Grid:</strong> Responsive grid that adapts to screen size, modern card spacing',
                'template-4': '<strong>💎 Compact Pro:</strong> Space-efficient 140px cards with premium styling and hover effects'
            };
            templatePreview.innerHTML = previews[selectedTemplate] || previews['template-1'];
        });
    }
});

// Toggle between product and category event forms
window.toggleEventForm = function() {
    const eventType = document.getElementById('eventType').value;
    const productForm = document.getElementById('productEventForm');
    const categoryForm = document.getElementById('categoryEventForm');
    
    // Get all other form elements
    const eventName = document.getElementById('eventName');
    const eventNameImage = document.getElementById('eventNameImage');
    const eventBackgroundImage = document.getElementById('eventBackgroundImage');
    const titleColorSection = document.querySelector('#eventTitleColor').parentElement;
    const templateSection = document.querySelector('#eventTemplate').parentElement;
    
    if (eventType === 'product') {
        // Show all form fields for product events
        productForm.style.display = 'block';
        categoryForm.style.display = 'none';
        eventName.style.display = 'block';
        eventNameImage.style.display = 'block';
        eventBackgroundImage.style.display = 'block';
        titleColorSection.style.display = 'block';
        templateSection.style.display = 'block';
        loadEventProductSelection();
    } else {
        // Show only category selection for category events
        productForm.style.display = 'none';
        categoryForm.style.display = 'block';
        eventName.style.display = 'none';
        eventNameImage.style.display = 'none';
        eventBackgroundImage.style.display = 'none';
        titleColorSection.style.display = 'none';
        templateSection.style.display = 'none';
        loadEventCategorySelection();
    }
};

// Load categories for event category selection
function loadEventCategorySelection() {
    const categorySelect = document.getElementById('eventCategorySelect');
    categorySelect.innerHTML = '<option value="">Choose a category...</option>';
    
    console.log('Loading categories for event selection:', categoriesData.length);
    
    if (categoriesData.length === 0) {
        // If categories not loaded yet, try to load them
        loadCategoriesFromFirebase().then(() => {
            console.log('Categories loaded, populating dropdown');
            loadEventCategorySelection();
        });
        return;
    }
    
    categoriesData.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        categorySelect.appendChild(option);
        console.log('Added category to dropdown:', category.name);
    });
}

window.addEvent = async function() {
    const eventType = document.getElementById('eventType').value;
    
    if (eventType === 'product') {
        // Product event validation and creation
        const eventName = document.getElementById('eventName').value.trim();
        const eventNameImage = document.getElementById('eventNameImage').value.trim();
        const backgroundImage = document.getElementById('eventBackgroundImage').value.trim();
        const selectedTemplate = document.getElementById('eventTemplate').value;
        const selectedTitleColor = document.getElementById('eventTitleColor').value;
        const selectedProducts = getSelectedEventProducts();
        
        if (!eventName || !backgroundImage || selectedProducts.length === 0) {
            showNotification('Please fill all fields and select at least one product', 'error');
            return;
        }
        
        const eventData = {
            name: eventName,
            nameImage: eventNameImage,
            backgroundImage: backgroundImage,
            template: selectedTemplate,
            titleColor: selectedTitleColor,
            type: eventType,
            products: selectedProducts,
            createdAt: new Date().toISOString()
        };
        
        console.log('Adding product event:', eventData);
        const success = await addEventToFirebase(eventData);
        if (success) {
            document.getElementById('eventName').value = '';
            document.getElementById('eventNameImage').value = '';
            document.getElementById('eventBackgroundImage').value = '';
            clearEventProductSelection();
            loadEventsData();
            loadEventsOnHomePage();
            showNotification('Product event added successfully!', 'success');
        } else {
            showNotification('Error adding event. Please try again.', 'error');
        }
        
    } else {
        // Category event validation and creation - only need category selection
        const selectedCategoryId = document.getElementById('eventCategorySelect').value;
        const selectedLocation = document.getElementById('categoryEventLocation').value;
        const customEventName = document.getElementById('categoryEventName').value.trim();
        
        if (!selectedCategoryId) {
            showNotification('Please select a category', 'error');
            return;
        }
        
        if (!customEventName) {
            showNotification('Please enter a custom event name', 'error');
            return;
        }
        
        const selectedCategory = categoriesData.find(cat => cat.id === selectedCategoryId);
        const eventData = {
            name: customEventName, // Use custom event name instead of category name
            nameImage: '',
            backgroundImage: 'transparent',
            template: 'template-1',
            titleColor: 'black',
            type: eventType,
            category: selectedCategory,
            location: selectedLocation, // Add location field
            createdAt: new Date().toISOString()
        };
        
        console.log('Adding category event:', eventData);
        const success = await addEventToFirebase(eventData);
        if (success) {
            document.getElementById('eventCategorySelect').value = '';
            document.getElementById('categoryEventLocation').value = 'home'; // Reset to default
            document.getElementById('categoryEventName').value = ''; // Clear custom event name
            loadEventsData();
            loadEventsOnHomePage();
            loadEventsOnCategoriesPage(); // Load events on categories page too
            showNotification('Category event added successfully!', 'success');
        } else {
            showNotification('Error adding event. Please try again.', 'error');
        }
    }
};

function getSelectedEventProducts() {
    const checkboxes = document.querySelectorAll('#eventProductSelection input[type="checkbox"]:checked');
    return Array.from(checkboxes).map(cb => {
        const productId = cb.value;
        return productsData.find(p => p.id === productId);
    }).filter(p => p);
}

function clearEventProductSelection() {
    const checkboxes = document.querySelectorAll('#eventProductSelection input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = false);
}

window.removeEvent = async function(eventId) {
    // Add confirmation dialog
    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
        return;
    }
    
    console.log('=== Starting Event Removal Process ===');
    console.log('Event ID to remove:', eventId);
    console.log('Type of eventId:', typeof eventId);
    console.log('Events before removal:', eventsData.map(e => ({id: e.id, name: e.name})));
    
    const success = await removeEventFromFirebase(eventId);
    if (success) {
        console.log('Event removal successful, refreshing admin panel');
        loadEventsData();
        loadEventsOnHomePage();
        showNotification('Event removed successfully!', 'success');
        console.log('=== Event Removal Process Complete ===');
    } else {
        console.error('Event removal failed');
        showNotification('Error removing event. Please try again.', 'error');
    }
};

window.editEvent = function(eventId) {
    const event = eventsData.find(e => e.id === eventId);
    if (!event) {
        showNotification('Event not found', 'error');
        return;
    }
    
    // Create edit modal
    const editModal = document.createElement('div');
    editModal.id = 'editEventModal';
    editModal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 10000;
        display: flex;
        justify-content: center;
        align-items: center;
    `;
    
    editModal.innerHTML = `
        <div style="background: white; border-radius: 15px; padding: 30px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin: 0; color: #1a202c; font-size: 20px;">✏️ Edit Event</h3>
                <button onclick="closeEditEventModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">×</button>
            </div>
            
            <div id="editEventForm">
                ${event.type === 'category' ? `
                    <!-- Category Event Edit Form -->
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #2c3e50;">Custom Event Name:</label>
                        <input type="text" id="editCategoryEventName" value="${event.name || ''}" placeholder="Enter custom event name" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #2c3e50;">Category:</label>
                        <select id="editEventCategorySelect" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                            <option value="">Choose a category...</option>
                        </select>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #2c3e50;">Display Location:</label>
                        <select id="editCategoryEventLocation" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                            <option value="home">🏠 Home Page Only</option>
                            <option value="categories">📂 Categories Section Only</option>
                            <option value="both">🌟 Both Home & Categories</option>
                        </select>
                    </div>
                ` : `
                    <!-- Product Event Edit Form -->
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #2c3e50;">Event Name:</label>
                        <input type="text" id="editEventName" value="${event.name || ''}" placeholder="Event Name" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #2c3e50;">Event Name Image URL:</label>
                        <input type="url" id="editEventNameImage" value="${event.nameImage || ''}" placeholder="Event Name Image URL" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #2c3e50;">Background Image URL:</label>
                        <input type="url" id="editEventBackgroundImage" value="${event.backgroundImage || ''}" placeholder="Background Image URL" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                    </div>
                    
                    <!-- Product Selection for Edit -->
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #2c3e50;">Select Products:</label>
                        <div id="editEventProductSelection" style="max-height: 300px; overflow-y: auto; border: 1px solid #ddd; border-radius: 5px; padding: 10px; background: #f8f9fa;">
                            <!-- Products will be loaded here -->
                        </div>
                    </div>
                `}
            </div>
            
            <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                <button onclick="closeEditEventModal()" style="background: #6b7280; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: 600;">Cancel</button>
                <button onclick="updateEvent('${eventId}')" style="background: #10b981; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: 600;">Update Event</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(editModal);
    
    // Load categories for category events
    if (event.type === 'category') {
        const categorySelect = document.getElementById('editEventCategorySelect');
        categoriesData.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            option.selected = event.category && event.category.id === category.id;
            categorySelect.appendChild(option);
        });
        
        document.getElementById('editCategoryEventLocation').value = event.location || 'home';
    } else {
        // Load products for product events
        loadEditEventProductSelection(event);
    }
};

function loadEditEventProductSelection(event) {
    const container = document.getElementById('editEventProductSelection');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!productsData || productsData.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">No products available</div>';
        return;
    }
    
    // Create search input
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search products...';
    searchInput.style.cssText = 'width: 100%; padding: 8px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 4px;';
    container.appendChild(searchInput);
    
    // Create products container
    const productsContainer = document.createElement('div');
    productsContainer.id = 'editProductsContainer';
    container.appendChild(productsContainer);
    
    // Function to render products
    function renderEditProducts(searchTerm = '') {
        productsContainer.innerHTML = '';
        
        const filteredProducts = productsData.filter(product => 
            product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (product.keywords && product.keywords.some(keyword => 
                keyword.toLowerCase().includes(searchTerm.toLowerCase())
            ))
        );
        
        if (filteredProducts.length === 0) {
            productsContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">No products found</div>';
            return;
        }
        
        filteredProducts.forEach(product => {
            const productItem = document.createElement('div');
            productItem.style.cssText = 'display: flex; align-items: center; padding: 8px; border-bottom: 1px solid #eee; background: white; margin-bottom: 5px; border-radius: 4px;';
            
            const isSelected = event.products && event.products.some(p => p.id === product.id);
            
            productItem.innerHTML = `
                <input type="checkbox" id="editProduct_${product.id}" value="${product.id}" ${isSelected ? 'checked' : ''} style="margin-right: 10px;">
                <img src="${product.imageUrl || product.image}" alt="${product.name}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px; margin-right: 10px;" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjZjNmNGY2Ii8+Cjx0ZXh0IHg9IjIwIiB5PSIyMCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjgiIGZpbGw9IiM5OTlhYTIiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD4KPC9zdmc+Cg==';">
                <div style="flex: 1;">
                    <div style="font-weight: 600; font-size: 14px; color: #2c3e50;">${product.name}</div>
                    <div style="font-size: 10px; color: #666;">₹${product.price} | ${product.category}</div>
                </div>
            `;
            
            productsContainer.appendChild(productItem);
        });
    }
    
    // Initial render
    renderEditProducts();
    
    // Search functionality
    searchInput.addEventListener('input', (e) => {
        renderEditProducts(e.target.value);
    });
}

window.closeEditEventModal = function() {
    const modal = document.getElementById('editEventModal');
    if (modal) {
        modal.remove();
    }
};

window.updateEvent = async function(eventId) {
    const event = eventsData.find(e => e.id === eventId);
    if (!event) {
        showNotification('Event not found', 'error');
        return;
    }
    
    let updatedEventData;
    
    if (event.type === 'category') {
        // Category event update
        const customEventName = document.getElementById('editCategoryEventName').value.trim();
        const selectedCategoryId = document.getElementById('editEventCategorySelect').value;
        const selectedLocation = document.getElementById('editCategoryEventLocation').value;
        
        if (!customEventName) {
            showNotification('Please enter a custom event name', 'error');
            return;
        }
        
        if (!selectedCategoryId) {
            showNotification('Please select a category', 'error');
            return;
        }
        
        const selectedCategory = categoriesData.find(cat => cat.id === selectedCategoryId);
        updatedEventData = {
            ...event,
            name: customEventName,
            category: selectedCategory,
            location: selectedLocation
        };
    } else {
        // Product event update
        const eventName = document.getElementById('editEventName').value.trim();
        const eventNameImage = document.getElementById('editEventNameImage').value.trim();
        const backgroundImage = document.getElementById('editEventBackgroundImage').value.trim();
        
        if (!eventName || !backgroundImage) {
            showNotification('Please fill all required fields', 'error');
            return;
        }
        
        // Get selected products
        const selectedProducts = [];
        const checkboxes = document.querySelectorAll('#editEventProductSelection input[type="checkbox"]:checked');
        checkboxes.forEach(checkbox => {
            const productId = checkbox.value;
            const product = productsData.find(p => p.id === productId);
            if (product) {
                selectedProducts.push(product);
            }
        });
        
        updatedEventData = {
            ...event,
            name: eventName,
            nameImage: eventNameImage,
            backgroundImage: backgroundImage,
            products: selectedProducts
        };
    }
    
    // Update in Firebase
    const success = await updateEventInFirebase(eventId, updatedEventData);
    if (success) {
        closeEditEventModal();
        loadEventsData();
        loadEventsOnHomePage();
        if (typeof loadEventsOnCategoriesPage === 'function') {
            loadEventsOnCategoriesPage();
        }
        showNotification('Event updated successfully!', 'success');
    } else {
        showNotification('Error updating event. Please try again.', 'error');
    }
};

async function updateEventInFirebase(eventId, eventData) {
    try {
        const eventRef = doc(db, 'events', eventId);
        await setDoc(eventRef, eventData, { merge: true });
        
        // Update local data
        const eventIndex = eventsData.findIndex(e => e.id === eventId);
        if (eventIndex !== -1) {
            eventsData[eventIndex] = { ...eventsData[eventIndex], ...eventData };
        }
        
        return true;
    } catch (error) {
        console.error('Error updating event:', error);
        return false;
    }
}

function loadEventsData() {
    const eventsList = document.getElementById('eventsList');
    eventsList.innerHTML = '';
    
    eventsData.forEach(event => {
        const eventItem = document.createElement('div');
        eventItem.className = 'event-item';
        eventItem.style.cssText = 'background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 10px; border: 1px solid #ddd;';
        
        let eventDetails = '';
        if (event.type === 'category' && event.category) {
            // Category event display - Show custom name prominently
            const subcategoriesCount = event.category.subcategories ? event.category.subcategories.length : 0;
            eventDetails = `
                <div style="font-weight: bold; font-size: 16px; margin-bottom: 5px; color: #2c3e50;">${event.name || 'Unnamed Event'}</div>
                <div style="font-size: 10px; color: #666; margin-bottom: 5px;">🏷️ Category: ${event.category.name}</div>
                <div style="font-size: 10px; color: #666; margin-bottom: 5px;">📋 Subcategories: ${subcategoriesCount}</div>
                <div style="font-size: 10px; color: #999;">📍 Location: ${event.location || 'home'}</div>
                <div style="font-size: 10px; color: #999;">ID: ${event.id}</div>
            `;
        } else {
            // Product event display
            const productsCount = event.products ? event.products.length : 0;
            eventDetails = `
                <div style="font-weight: bold; font-size: 16px; margin-bottom: 5px;">${event.name}</div>
                <div style="font-size: 10px; color: #666; margin-bottom: 5px;">📦 Products: ${productsCount}</div>
                <div style="font-size: 10px; color: #999;">ID: ${event.id}</div>
            `;
        }
        
        eventItem.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    ${eventDetails}
                </div>
                <div style="display: flex; gap: 8px;">
                    <button onclick="editEvent('${event.id}')" style="background: #28a745; color: white; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer; font-size: 10px; font-weight: 600;">✏️ Edit Event</button>
                    <button onclick="removeEvent('${event.id}')" style="background: #dc3545; color: white; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer; font-size: 10px; font-weight: 600;">🗑️ Remove</button>
                </div>
            </div>
        `;
        eventsList.appendChild(eventItem);
    });
}

function loadEventProductSelection(searchTerm = '') {
    const container = document.getElementById('eventProductSelection');
    container.innerHTML = '';
    
    // Filter products based on search term using fuzzy search
    const filteredProducts = searchTerm ? 
        fuzzySearchProducts(productsData, searchTerm, 0.6) : 
        productsData;
    
    // Create grid container
    const gridContainer = document.createElement('div');
    gridContainer.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; padding: 10px;';
    
    filteredProducts.forEach(product => {
        const productCard = document.createElement('div');
        productCard.style.cssText = `
            position: relative;
            background: white;
            border-radius: 15px;
            overflow: hidden;
            cursor: pointer;
            transition: all 0.2s ease;
            border: 2px solid #e5e7eb;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        `;
        
        productCard.innerHTML = `
            <div style="position: absolute; top: 8px; left: 8px; z-index: 10;">
                <input type="checkbox" value="${product.id}" style="transform: scale(1.3); cursor: pointer;" onclick="event.stopPropagation();">
            </div>
            <img src="${product.imageUrl}" style="width: 100%; height: 120px; object-fit: contain; background: #f8fafc;" 
                 onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDIwMCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTUwIiBmaWxsPSIjZjNmNGY2Ii8+Cjx0ZXh0IHg9IjEwMCIgeT0iNzUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OWFhMiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pgo8L3N2Zz4K'">
            <div style="padding: 12px;">
                <div style="font-weight: bold; font-size: 14px; margin-bottom: 4px; color: #1a202c; line-height: 1.3; height: 36px; overflow: hidden;">${product.name}</div>
                <div style="font-size: 13px; color: #059669; font-weight: bold; margin-bottom: 2px;">₹${product.price}</div>
                <div style="font-size: 11px; color: #666;">Category: ${product.category}</div>
            </div>
        `;
        
        // Add click handler to toggle checkbox
        productCard.addEventListener('click', function(e) {
            if (e.target.type !== 'checkbox') {
                const checkbox = productCard.querySelector('input[type="checkbox"]');
                checkbox.checked = !checkbox.checked;
                updateCardSelection(productCard, checkbox.checked);
            }
        });
        
        // Add hover effect
        productCard.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
            this.style.borderColor = '#3b82f6';
            this.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
        });
        productCard.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.borderColor = '#e5e7eb';
            this.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
        });
        
        gridContainer.appendChild(productCard);
    });
    
    container.appendChild(gridContainer);
}

function updateCardSelection(card, isSelected) {
    if (isSelected) {
        card.style.borderColor = '#10b981';
        card.style.backgroundColor = '#f0fdf4';
    } else {
        card.style.borderColor = '#e5e7eb';
        card.style.backgroundColor = 'white';
    }
}

// Load and display events on home page
function loadEventsOnHomePage() {
    const eventsSection = document.getElementById('eventsSection');
    
    // Store current scroll positions for all event product containers
    const eventScrollPositions = {};
    const existingEventProducts = eventsSection.querySelectorAll('.event-products');
    existingEventProducts.forEach((eventContainer, index) => {
        eventScrollPositions[index] = eventContainer.scrollLeft;
    });
    
    eventsSection.innerHTML = '';
    
    // Filter events that should appear on home page
    const homeEvents = eventsData.filter(event => {
        // Show product events on home page by default
        if (event.type === 'product') return true;
        
        // For category events, check location field
        if (event.type === 'category') {
            return !event.location || event.location === 'home' || event.location === 'both';
        }
        
        return true;
    });
    
    homeEvents.forEach(event => {
        const eventCard = document.createElement('div');
        eventCard.className = 'event-card';
        
        const eventContent = document.createElement('div');
        eventContent.className = 'event-content';
        
        const eventTitle = document.createElement('div');
        eventTitle.className = 'event-title';
        
        // Set background image only for product events
        if (event.type !== 'category' && event.backgroundImage && event.backgroundImage !== 'transparent') {
            eventCard.style.backgroundImage = `url('${event.backgroundImage}')`;
            eventCard.style.backgroundSize = 'cover';
            eventCard.style.backgroundPosition = 'center';
            eventCard.style.backgroundRepeat = 'no-repeat';
        }
        
        // Check if event has nameImage, if yes show image instead of text
        if (event.nameImage && event.nameImage.trim()) {
            const eventTitleImage = document.createElement('img');
            eventTitleImage.src = event.nameImage;
            eventTitleImage.alt = event.name;
            eventTitleImage.style.maxWidth = '100%';
            eventTitleImage.style.height = 'auto';
            eventTitleImage.style.maxHeight = '80px';
            eventTitleImage.style.objectFit = 'contain';
            eventTitle.appendChild(eventTitleImage);
        } else {
            // Fallback to text if no image provided
            eventTitle.textContent = event.name;
            // Apply selected title color only for text
            if (event.titleColor) {
                eventTitle.style.color = event.titleColor;
            }
        }
        
        // Handle different event types
        if (event.type === 'category' && event.category) {
            // Add category-event class for transparent background
            eventCard.classList.add('category-event');
            
            // Find the actual category from Firebase data to get real-time subcategories
            const actualCategory = categoriesData.find(cat => cat.name === event.category.name);
            
            // Skip this category event if the category doesn't exist in Firebase anymore
            if (!actualCategory) {
                return; // This will skip creating the event card for removed categories
            }
            
            // Category event display - no title text, just subcategories
            const categoryEventContainer = document.createElement('div');
            categoryEventContainer.className = 'category-event-container';
            
            // Category header with name and yellow arrow (left aligned)
            const categoryHeader = document.createElement('div');
            categoryHeader.className = 'category-event-header';
            categoryHeader.innerHTML = `
                <h3 class="category-event-title">${event.name || actualCategory.name}</h3>
                <span class="category-arrow">➜</span>
            `;
            categoryHeader.onclick = () => openCategoryModal(actualCategory.name);
            
            // Hide the event title for category events
            eventTitle.style.display = 'none';
            
            // Subcategories container
            const subcategoriesContainer = document.createElement('div');
            subcategoriesContainer.className = 'subcategories-container';
            
            // Use actual Firebase subcategories data
            if (actualCategory.subcategories && actualCategory.subcategories.length > 0) {
                // Split subcategories into two rows
                const midPoint = Math.ceil(actualCategory.subcategories.length / 2);
                const firstRowSubcategories = actualCategory.subcategories.slice(0, midPoint);
                const secondRowSubcategories = actualCategory.subcategories.slice(midPoint);
                
                // First row
                const firstRow = document.createElement('div');
                firstRow.className = 'subcategory-row';
                
                // Declare secondRow here so it's accessible later
                let secondRow = null;
                
                firstRowSubcategories.forEach(subcategory => {
                    const subcategoryCard = document.createElement('div');
                    subcategoryCard.className = 'subcategory-card';
                    
                    // Add image if available
                    if (subcategory.imageUrl) {
                        const subcategoryImage = document.createElement('img');
                        subcategoryImage.src = subcategory.imageUrl;
                        subcategoryImage.className = 'subcategory-image';
                        subcategoryImage.alt = subcategory.name;
                        subcategoryCard.appendChild(subcategoryImage);
                    }
                    
                    subcategoryCard.onclick = (e) => {
                        e.stopPropagation();
                        openCategoryModal(actualCategory.name, subcategory.name);
                    };
                    
                    // Create card container with name below
                    const cardContainer = document.createElement('div');
                    cardContainer.style.display = 'flex';
                    cardContainer.style.flexDirection = 'column';
                    cardContainer.style.alignItems = 'center';
                    
                    cardContainer.appendChild(subcategoryCard);
                    
                    // Add name below card
                    const subcategoryName = document.createElement('div');
                    subcategoryName.className = 'subcategory-name';
                    subcategoryName.textContent = subcategory.name;
                    cardContainer.appendChild(subcategoryName);
                    
                    firstRow.appendChild(cardContainer);
                });
                
                // Second row (if needed)
                if (secondRowSubcategories.length > 0) {
                    secondRow = document.createElement('div');
                    secondRow.className = 'subcategory-row';
                    secondRowSubcategories.forEach(subcategory => {
                        const subcategoryCard = document.createElement('div');
                        subcategoryCard.className = 'subcategory-card';
                        
                        // Add image if available
                        if (subcategory.imageUrl) {
                            const subcategoryImage = document.createElement('img');
                            subcategoryImage.src = subcategory.imageUrl;
                            subcategoryImage.className = 'subcategory-image';
                            subcategoryImage.alt = subcategory.name;
                            subcategoryCard.appendChild(subcategoryImage);
                        }
                        
                        subcategoryCard.onclick = (e) => {
                            e.stopPropagation();
                            openCategoryModal(actualCategory.name, subcategory.name);
                        };
                        
                        // Create card container with name below
                        const cardContainer = document.createElement('div');
                        cardContainer.style.display = 'flex';
                        cardContainer.style.flexDirection = 'column';
                        cardContainer.style.alignItems = 'center';
                        
                        cardContainer.appendChild(subcategoryCard);
                        
                        // Add name below card
                        const subcategoryName = document.createElement('div');
                        subcategoryName.className = 'subcategory-name';
                        subcategoryName.textContent = subcategory.name;
                        cardContainer.appendChild(subcategoryName);
                        
                        secondRow.appendChild(cardContainer);
                    });
                }
                
                subcategoriesContainer.appendChild(firstRow);
                if (secondRowSubcategories.length > 0) {
                    subcategoriesContainer.appendChild(secondRow);
                }
            }
            
            categoryEventContainer.appendChild(categoryHeader);
            categoryEventContainer.appendChild(subcategoriesContainer);
            eventContent.appendChild(categoryEventContainer);
            
        } else {
            // Product event display (existing logic)
            const eventProducts = document.createElement('div');
            eventProducts.className = `event-products ${event.template || 'template-1'}`;
            
            // Filter out products that no longer exist in productsData
            const validProducts = (event.products || []).filter(eventProduct => 
                productsData.some(existingProduct => existingProduct.id === eventProduct.id)
            );
            
            validProducts.forEach(product => {
                const productCard = createProductCard(product);
                eventProducts.appendChild(productCard);
            });
            
            eventContent.appendChild(eventProducts);
        }
        
        eventContent.insertBefore(eventTitle, eventContent.firstChild);
        eventCard.appendChild(eventContent);
        eventsSection.appendChild(eventCard);
    });
    
    // Restore scroll positions for event product containers after a brief delay
    setTimeout(() => {
        const newEventProducts = eventsSection.querySelectorAll('.event-products');
        newEventProducts.forEach((eventContainer, index) => {
            if (eventScrollPositions[index] !== undefined) {
                eventContainer.scrollLeft = eventScrollPositions[index];
            }
        });
    }, 50);
}

// Load and display events on categories page (exact same as home page)
function loadEventsOnCategoriesPage() {
    console.log('Loading events on categories page...');
    const categoryEventsContainer = document.getElementById('categoryEventsContainer');
    if (!categoryEventsContainer) {
        console.log('Category events container not found!');
        return;
    }
    
    categoryEventsContainer.innerHTML = '';
    
    // Filter events that should appear on categories page
    const categoryPageEvents = eventsData.filter(event => {
        // For category events, check location field
        if (event.type === 'category') {
            console.log('Category event found:', event.name, 'Location:', event.location);
            return event.location === 'categories' || event.location === 'both';
        }
        
        return false; // Only show category events on categories page
    });
    
    console.log('Filtered category page events:', categoryPageEvents.length);
    
    if (categoryPageEvents.length === 0) {
        categoryEventsContainer.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No category events to display</p>';
        return;
    }
    
    categoryPageEvents.forEach(event => {
        const eventCard = document.createElement('div');
        eventCard.className = 'event-card';
        
        const eventContent = document.createElement('div');
        eventContent.className = 'event-content';
        
        const eventTitle = document.createElement('div');
        eventTitle.className = 'event-title';
        
        // Set background image only for product events
        if (event.type !== 'category' && event.backgroundImage && event.backgroundImage !== 'transparent') {
            eventCard.style.backgroundImage = `url('${event.backgroundImage}')`;
            eventCard.style.backgroundSize = 'cover';
            eventCard.style.backgroundPosition = 'center';
            eventCard.style.backgroundRepeat = 'no-repeat';
        }
        
        // Check if event has nameImage, if yes show image instead of text
        if (event.nameImage && event.nameImage.trim()) {
            const eventTitleImage = document.createElement('img');
            eventTitleImage.src = event.nameImage;
            eventTitleImage.alt = event.name;
            eventTitleImage.style.maxWidth = '100%';
            eventTitleImage.style.height = 'auto';
            eventTitleImage.style.maxHeight = '80px';
            eventTitleImage.style.objectFit = 'contain';
            eventTitle.appendChild(eventTitleImage);
        } else {
            // Fallback to text if no image provided
            eventTitle.textContent = event.name;
            // Apply selected title color only for text
            if (event.titleColor) {
                eventTitle.style.color = event.titleColor;
            }
        }
        
        // Handle different event types
        if (event.type === 'category' && event.category) {
            // Add category-event class for transparent background
            eventCard.classList.add('category-event');
            
            // Find the actual category from Firebase data to get real-time subcategories
            const actualCategory = categoriesData.find(cat => cat.name === event.category.name);
            
            // Skip this category event if the category doesn't exist in Firebase anymore
            if (!actualCategory) {
                return; // This will skip creating the event card for removed categories
            }
            
            // Category event display - no title text, just subcategories
            const categoryEventContainer = document.createElement('div');
            categoryEventContainer.className = 'category-event-container';
            
            // Category header with name and yellow arrow (left aligned)
            const categoryHeader = document.createElement('div');
            categoryHeader.className = 'category-event-header';
            categoryHeader.innerHTML = `
                <h3 class="category-event-title">${event.name || actualCategory.name}</h3>
                <span class="category-arrow">➜</span>
            `;
            categoryHeader.onclick = () => openCategoryModal(actualCategory.name);
            
            // Hide the event title for category events
            eventTitle.style.display = 'none';
            
            // Subcategories container
            const subcategoriesContainer = document.createElement('div');
            subcategoriesContainer.className = 'subcategories-container';
            
            // Use actual Firebase subcategories data
            if (actualCategory.subcategories && actualCategory.subcategories.length > 0) {
                // Split subcategories into two rows
                const midPoint = Math.ceil(actualCategory.subcategories.length / 2);
                const firstRowSubcategories = actualCategory.subcategories.slice(0, midPoint);
                const secondRowSubcategories = actualCategory.subcategories.slice(midPoint);
                
                // First row
                const firstRow = document.createElement('div');
                firstRow.className = 'subcategory-row';
                
                // Declare secondRow here so it's accessible later
                let secondRow = null;
                
                firstRowSubcategories.forEach(subcategory => {
                    const subcategoryCard = document.createElement('div');
                    subcategoryCard.className = 'subcategory-card';
                    
                    // Add image if available
                    if (subcategory.imageUrl) {
                        const subcategoryImage = document.createElement('img');
                        subcategoryImage.src = subcategory.imageUrl;
                        subcategoryImage.className = 'subcategory-image';
                        subcategoryImage.alt = subcategory.name;
                        subcategoryCard.appendChild(subcategoryImage);
                    }
                    
                    subcategoryCard.onclick = (e) => {
                        e.stopPropagation();
                        openCategoryModal(actualCategory.name, subcategory.name);
                    };
                    
                    // Create card container with name below (same as home page)
                    const cardContainer = document.createElement('div');
                    cardContainer.style.display = 'flex';
                    cardContainer.style.flexDirection = 'column';
                    cardContainer.style.alignItems = 'center';
                    
                    cardContainer.appendChild(subcategoryCard);
                    
                    // Add name below card
                    const subcategoryName = document.createElement('div');
                    subcategoryName.className = 'subcategory-name';
                    subcategoryName.textContent = subcategory.name;
                    cardContainer.appendChild(subcategoryName);
                    
                    firstRow.appendChild(cardContainer);
                });
                
                subcategoriesContainer.appendChild(firstRow);
                
                // Second row (if there are subcategories for it)
                if (secondRowSubcategories.length > 0) {
                    secondRow = document.createElement('div');
                    secondRow.className = 'subcategory-row';
                    
                    secondRowSubcategories.forEach(subcategory => {
                        const subcategoryCard = document.createElement('div');
                        subcategoryCard.className = 'subcategory-card';
                        
                        // Add image if available
                        if (subcategory.imageUrl) {
                            const subcategoryImage = document.createElement('img');
                            subcategoryImage.src = subcategory.imageUrl;
                            subcategoryImage.className = 'subcategory-image';
                            subcategoryImage.alt = subcategory.name;
                            subcategoryCard.appendChild(subcategoryImage);
                        }
                        
                        subcategoryCard.onclick = (e) => {
                            e.stopPropagation();
                            openCategoryModal(actualCategory.name, subcategory.name);
                        };
                        
                        // Create card container with name below (same as home page)
                        const cardContainer = document.createElement('div');
                        cardContainer.style.display = 'flex';
                        cardContainer.style.flexDirection = 'column';
                        cardContainer.style.alignItems = 'center';
                        
                        cardContainer.appendChild(subcategoryCard);
                        
                        // Add name below card
                        const subcategoryName = document.createElement('div');
                        subcategoryName.className = 'subcategory-name';
                        subcategoryName.textContent = subcategory.name;
                        cardContainer.appendChild(subcategoryName);
                        
                        secondRow.appendChild(cardContainer);
                    });
                    
                    subcategoriesContainer.appendChild(secondRow);
                }
            }
            
            categoryEventContainer.appendChild(categoryHeader);
            categoryEventContainer.appendChild(subcategoriesContainer);
            eventContent.appendChild(categoryEventContainer);
        }
        
        eventContent.insertBefore(eventTitle, eventContent.firstChild);
        eventCard.appendChild(eventContent);
        categoryEventsContainer.appendChild(eventCard);
    });
}


// User Management
window.toggleAdmin = async function(email) {
    if (email === 'moghaeashu@gmail.com') {
        showNotification('Cannot modify permanent admin', 'warning');
        return;
    }
    
    try {
        // Check current admin status from Firestore
        let isCurrentlyAdmin = false;
        const usersSnapshot = await getDocs(collection(db, 'users'));
        let userDocId = null;
        
        usersSnapshot.forEach((userDoc) => {
            const userData = userDoc.data();
            if (userData.email === email) {
                isCurrentlyAdmin = userData.isAdmin === true;
                userDocId = userDoc.id;
            }
        });
        
        if (!userDocId) {
            showNotification('User not found', 'error');
            return;
        }
        
        // Update only Firebase Firestore - no localStorage
        await updateDoc(doc(db, 'users', userDocId), {
            isAdmin: !isCurrentlyAdmin
        });
        
        // Show success notification
        if (isCurrentlyAdmin) {
            showNotification(`Removed admin privileges from ${email}`, 'success');
        } else {
            showNotification(`Granted admin privileges to ${email}`, 'success');
        }
        
        // Reload users to reflect changes
        loadUsersData();
        
        // Update admin visibility for current user if they were affected
        if (currentUser && currentUser.email === email) {
            await updateAdminVisibility(currentUser);
        }
        
    } catch (error) {
        console.error('Error toggling admin status:', error);
        showNotification('Error updating admin status', 'error');
    }
};

// Delivery Man Management
window.toggleDeliveryMan = async function(email) {
    if (email === 'moghaeashu@gmail.com') {
        showNotification('Cannot modify permanent admin', 'warning');
        return;
    }
    
    try {
        // Check current delivery man status from Firestore
        let isCurrentlyDeliveryMan = false;
        const usersSnapshot = await getDocs(collection(db, 'users'));
        let userDocId = null;
        
        usersSnapshot.forEach((userDoc) => {
            const userData = userDoc.data();
            if (userData.email === email) {
                isCurrentlyDeliveryMan = userData.isDeliveryMan === true;
                userDocId = userDoc.id;
            }
        });
        
        if (!userDocId) {
            showNotification('User not found', 'error');
            return;
        }
        
        // Update Firebase Firestore
        await updateDoc(doc(db, 'users', userDocId), {
            isDeliveryMan: !isCurrentlyDeliveryMan
        });
        
        // Show success notification
        if (isCurrentlyDeliveryMan) {
            showNotification(`Removed delivery man privileges from ${email}`, 'success');
        } else {
            showNotification(`Granted delivery man privileges to ${email}`, 'success');
        }
        
        // Reload users to reflect changes
        loadUsersData();
        
        // Update navbar for current user if they were affected
        if (currentUser && currentUser.email === email) {
            await updateDeliveryManVisibility(currentUser);
        }
        
    } catch (error) {
        console.error('Error toggling delivery man status:', error);
        showNotification('Error updating delivery man status', 'error');
    }
};

async function loadUsersData() {
    const usersList = document.getElementById('usersList');
    usersList.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">Loading users...</div>';
    
    try {
        // Fetch all users from Firestore
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const allUsers = [];
        
        usersSnapshot.forEach((doc) => {
            const userData = doc.data();
            // Check admin status only from Firestore - no localStorage dependency
            const isPermanentAdmin = userData.email === 'moghaeashu@gmail.com';
            const isAdminFromFirestore = userData.isAdmin === true;
            
            allUsers.push({
                uid: doc.id,
                name: userData.name || userData.displayName || 'Unknown',
                email: userData.email,
                phone: userData.phone || 'N/A',
                createdAt: userData.createdAt,
                isAdmin: isPermanentAdmin || isAdminFromFirestore,
                isDeliveryMan: userData.isDeliveryMan === true
            });
        });
        
        // Clear loading message
        usersList.innerHTML = '';
        
        if (allUsers.length === 0) {
            usersList.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">No registered users found.</div>';
            return;
        }
        
        // Sort users by creation date (newest first)
        allUsers.sort((a, b) => {
            if (a.createdAt && b.createdAt) {
                return new Date(b.createdAt.seconds * 1000) - new Date(a.createdAt.seconds * 1000);
            }
            return 0;
        });
        
        allUsers.forEach(user => {
            const userItem = document.createElement('div');
            userItem.className = 'user-item';
            const isPermanentAdmin = user.email === 'moghaeashu@gmail.com';
            const joinDate = user.createdAt ? new Date(user.createdAt.seconds * 1000).toLocaleDateString() : 'Unknown';
            
            userItem.innerHTML = `
                <div class="user-info">
                    <div class="user-name">${user.name}${user.isAdmin ? '<span class="admin-badge">ADMIN</span>' : ''}${user.isDeliveryMan ? '<span class="delivery-badge">DELIVERY</span>' : ''}</div>
                    <div class="user-email">${user.email}</div>
                    <div class="user-details" style="font-size: 10px; color: #666; margin-top: 5px;">
                        Phone: ${user.phone} | Joined: ${joinDate}
                    </div>
                </div>
                <div class="action-buttons">
                    ${!isPermanentAdmin ? 
                        `<button class="${user.isAdmin ? 'btn-danger' : 'btn-success'}" onclick="toggleAdmin('${user.email}')">
                            ${user.isAdmin ? 'Remove Admin' : 'Make Admin'}
                        </button>
                        <button class="${user.isDeliveryMan ? 'btn-warning' : 'btn-info'}" onclick="toggleDeliveryMan('${user.email}')" style="margin-left: 8px;">
                            ${user.isDeliveryMan ? 'Remove Delivery Man' : 'Make Delivery Man'}
                        </button>` : 
                        '<span style="color: #f39c12; font-size: 10px;">Permanent Admin</span>'
                    }
                </div>
            `;
            usersList.appendChild(userItem);
        });
        
        console.log(`Loaded ${allUsers.length} users from Firestore`);
        
    } catch (error) {
        console.error('Error loading users from Firestore:', error);
        usersList.innerHTML = '<div style="text-align: center; padding: 20px; color: #e74c3c;">Error loading users. Please try again.</div>';
    }
}

function loadAdminData() {
    loadSlidesData();
    loadUsersData();
    loadPendingOrdersForAdmin(); // Load admin orders
    loadEventsFromFirebase().then(() => {
        loadEventsData();
    });
}

// Update slideshow with current data
function updateSlideshow() {
    console.log('Updating slideshow with', slidesData.length, 'slides');
    const slideshowContainer = document.querySelector('.slideshow-container');
    const dotsContainer = document.querySelector('.dots-container');
    
    if (!slideshowContainer || !dotsContainer) {
        console.error('Slideshow containers not found');
        return;
    }
    
    // Clear existing content
    slideshowContainer.innerHTML = '';
    dotsContainer.innerHTML = '';
    
    // If no slides, show empty message
    if (slidesData.length === 0) {
        slideshowContainer.innerHTML = '<div style="padding: 50px; text-align: center; color: #666;">No slides added yet. Admin can add slides through the admin panel.</div>';
        console.log('Showing empty state message');
        return;
    }
    
    // Create slides wrapper
    const slidesWrapper = document.createElement('div');
    slidesWrapper.className = 'slides-wrapper';
    
    // Add new slides
    slidesData.forEach((slide, index) => {
        console.log(`Adding slide ${index + 1}:`, slide.title, slide.url);
        const slideDiv = document.createElement('div');
        slideDiv.className = 'slides';
        
        slideDiv.innerHTML = `
            <img src="${slide.url}" 
                 alt="${slide.title}" 
                 style="width: 100%; height: 100%; object-fit: cover;"
                 onload="console.log('Image loaded successfully:', this.src)"
                 onerror="
                    console.error('Failed to load image:', this.src);
                    const fileId = '${slide.url}'.match(/\/d\/([a-zA-Z0-9_-]+)/);
                    if (fileId && fileId[1]) {
                        console.log('Trying alternative URL format...');
                        this.src = 'https://drive.google.com/uc?export=view&id=' + fileId[1];
                        this.onerror = function() {
                            console.log('Alternative format also failed, trying thumbnail...');
                            this.src = 'https://drive.google.com/thumbnail?id=' + fileId[1] + '&sz=w800-h400';
                            this.onerror = function() {
                                console.log('All formats failed, showing placeholder');
                                this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyMCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIE5vdCBGb3VuZDwvdGV4dD48L3N2Zz4=';
                            };
                        };
                    }
                 ">
        `;
        
        slidesWrapper.appendChild(slideDiv);
        
        // Add dot
        const dot = document.createElement('span');
        dot.className = 'dot';
        if (index === 0) dot.classList.add('active');
        dot.onclick = () => currentSlide(index + 1);
        dotsContainer.appendChild(dot);
    });
    
    // Add slides wrapper to container
    slideshowContainer.appendChild(slidesWrapper);
    
    
    // Reset slideshow
    slideIndex = 0;
    stopSlideshow();
    if (slidesData.length > 1) {
        startSlideshow();
    }
    
    console.log('Slideshow updated successfully');
}

// State-City mapping for Indian states
const stateCityMap = {
    "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Kurnool", "Rajahmundry", "Tirupati", "Kadapa", "Anantapur", "Eluru"],
    "Arunachal Pradesh": ["Itanagar", "Naharlagun", "Pasighat", "Tezpur", "Bomdila", "Ziro", "Along", "Changlang", "Tezu", "Khonsa"],
    "Assam": ["Guwahati", "Silchar", "Dibrugarh", "Jorhat", "Nagaon", "Tinsukia", "Tezpur", "Bongaigaon", "Karimganj", "Sivasagar"],
    "Bihar": ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Purnia", "Darbhanga", "Bihar Sharif", "Arrah", "Begusarai", "Katihar"],
    "Chhattisgarh": ["Raipur", "Bhilai", "Korba", "Bilaspur", "Durg", "Rajnandgaon", "Jagdalpur", "Raigarh", "Ambikapur", "Mahasamund"],
    "Goa": ["Panaji", "Margao", "Vasco da Gama", "Mapusa", "Ponda", "Bicholim", "Curchorem", "Sanquelim", "Cuncolim", "Quepem"],
    "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar", "Junagadh", "Gandhinagar", "Anand", "Navsari", "Morbi", "Mehsana", "Bharuch", "Vapi", "Palanpur", "Godhra", "Bhuj", "Porbandar", "Nadiad", "Surendranagar", "Gandhidham", "Veraval", "Mahesana", "Patan", "Botad", "Amreli", "Deesa", "Jetpur", "Kalol", "Dahod", "Botad", "Khambhat", "Mahuva", "Modasa", "Keshod", "Una", "Sidhpur", "Wankaner", "Limbdi", "Mandvi", "Thangadh", "Vyara", "Padra", "Lunawada", "Rajula", "Radhanpur", "Vijapur"],
    "Haryana": ["Faridabad", "Gurgaon", "Panipat", "Ambala", "Yamunanagar", "Rohtak", "Hisar", "Karnal", "Sonipat", "Panchkula"],
    "Himachal Pradesh": ["Shimla", "Dharamshala", "Solan", "Mandi", "Palampur", "Baddi", "Nahan", "Paonta Sahib", "Sundernagar", "Chamba"],
    "Jharkhand": ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro", "Deoghar", "Phusro", "Hazaribagh", "Giridih", "Ramgarh", "Medininagar"],
    "Karnataka": ["Bangalore", "Mysore", "Hubli", "Mangalore", "Belgaum", "Gulbarga", "Davanagere", "Bellary", "Bijapur", "Shimoga", "Tumkur", "Raichur", "Bidar", "Hospet", "Gadag", "Udupi", "Bhadravati", "Hassan", "Kolar", "Mandya", "Chikmagalur", "Karwar", "Ranebennuru", "Gangavati", "Chitradurga", "Puttur", "Koppal", "Bagalkot", "Haveri", "Sirsi", "Sindhanur", "Kampli", "Kushtagi", "Bunts", "Kundapura", "Bantwal", "Sullia", "Puttur", "Madikeri", "Kushalnagar", "Virajpet", "Somwarpet", "Chikkaballapur", "Doddaballapur", "Hoskote", "Anekal"],
    "Kerala": ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam", "Palakkad", "Alappuzha", "Malappuram", "Kannur", "Kasaragod"],
    "Madhya Pradesh": ["Bhopal", "Indore", "Gwalior", "Jabalpur", "Ujjain", "Sagar", "Dewas", "Satna", "Ratlam", "Rewa"],
    "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Thane", "Nashik", "Aurangabad", "Solapur", "Amravati", "Kolhapur", "Sangli", "Navi Mumbai", "Kalyan", "Vasai", "Virar", "Bhiwandi", "Ahmednagar", "Latur", "Dhule", "Akola", "Satara", "Chandrapur", "Jalgaon", "Parbhani", "Jalna", "Bhusawal", "Nanded", "Warangal", "Ichalkaranji", "Panvel", "Ambernath", "Malegaon", "Mira-Bhayandar", "Ulhasnagar", "Dombivli", "Raigad", "Baramati", "Osmanabad", "Beed", "Gondia", "Wardha", "Yavatmal", "Buldhana", "Washim", "Hingoli", "Gadchiroli", "Sindhudurg", "Ratnagiri"],
    "Manipur": ["Imphal", "Thoubal", "Bishnupur", "Churachandpur", "Kakching", "Ukhrul", "Senapati", "Tamenglong", "Jiribam", "Pherzawl"],
    "Meghalaya": ["Shillong", "Tura", "Jowai", "Nongpoh", "Baghmara", "Ampati", "Resubelpara", "Nongstoin", "Mawkyrwat", "Williamnagar"],
    "Mizoram": ["Aizawl", "Lunglei", "Saiha", "Champhai", "Kolasib", "Serchhip", "Mamit", "Lawngtlai", "Saitual", "Khawzawl"],
    "Nagaland": ["Kohima", "Dimapur", "Mokokchung", "Tuensang", "Wokha", "Zunheboto", "Phek", "Kiphire", "Longleng", "Peren"],
    "Odisha": ["Bhubaneswar", "Cuttack", "Rourkela", "Berhampur", "Sambalpur", "Puri", "Balasore", "Bhadrak", "Baripada", "Jharsuguda"],
    "Punjab": ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda", "Mohali", "Firozpur", "Batala", "Pathankot", "Moga"],
    "Rajasthan": ["Jaipur", "Jodhpur", "Kota", "Bikaner", "Ajmer", "Udaipur", "Bhilwara", "Alwar", "Bharatpur", "Sikar", "Tonk", "Sawai Madhopur", "Pali", "Barmer", "Jhunjhunu", "Dausa", "Churu", "Ganganagar", "Hanumangarh", "Jaisalmer", "Jalore", "Jhalawar", "Karauli", "Nagaur", "Pratapgarh", "Rajsamand", "Sirohi", "Dungarpur", "Banswara", "Bundi", "Chittorgarh", "Dholpur", "Mount Abu", "Pushkar", "Mandawa", "Neemrana", "Kishangarh", "Makrana", "Didwana", "Ratangarh", "Sujangarh", "Taranagar", "Nokha", "Dungargarh", "Bikaner", "Deshnoke"],
    "Sikkim": ["Gangtok", "Namchi", "Geyzing", "Mangan", "Jorethang", "Nayabazar", "Rangpo", "Singtam", "Rabongla", "Gyalshing"],
    "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tirunelveli", "Tiruppur", "Vellore", "Erode", "Thoothukkudi", "Dindigul", "Thanjavur", "Ranipet", "Sivakasi", "Karur", "Udhagamandalam", "Hosur", "Nagercoil", "Kanchipuram", "Kumarakonam", "Pudukkottai", "Ambur", "Pallavaram", "Tambaram", "Avadi", "Tiruvottiyur", "Tiruchengode", "Pollachi", "Rajapalayam", "Gudiyatham", "Vaniyambadi", "Ambattur", "Manachanallur", "Kovilpatti", "Tindivanam", "Tiruvannamalai", "Pollachi", "Karaikudi", "Kumbakonam", "Mayiladuthurai", "Cuddalore", "Chidambaram", "Tiruvarur", "Ramanathapuram", "Virudhunagar", "Aruppukkottai", "Sivaganga"],
    "Telangana": ["Hyderabad", "Warangal", "Nizamabad", "Khammam", "Karimnagar", "Ramagundam", "Mahbubnagar", "Nalgonda", "Adilabad", "Suryapet"],
    "Tripura": ["Agartala", "Dharmanagar", "Udaipur", "Kailashahar", "Belonia", "Khowai", "Pratapgarh", "Ranir Bazar", "Sonamura", "Amarpur"],
    "Uttar Pradesh": ["Lucknow", "Kanpur", "Ghaziabad", "Agra", "Varanasi", "Meerut", "Allahabad", "Bareilly", "Aligarh", "Moradabad", "Saharanpur", "Gorakhpur", "Noida", "Firozabad", "Jhansi", "Muzaffarnagar", "Mathura", "Budaun", "Rampur", "Shahjahanpur", "Farrukhabad", "Mau", "Hapur", "Etawah", "Mirzapur", "Bulandshahr", "Sambhal", "Amroha", "Hardoi", "Fatehpur", "Raebareli", "Orai", "Sitapur", "Bahraich", "Modinagar", "Unnao", "Jaunpur", "Lakhimpur", "Hathras", "Banda", "Pilibhit", "Barabanki", "Khurja", "Gonda", "Mainpuri", "Lalitpur", "Etah", "Deoria", "Ujhani", "Ghazipur", "Sultanpur", "Azamgarh", "Bijnor", "Sahaswan", "Basti", "Chandausi", "Akbarpur", "Ballia", "Tanda", "Greater Noida", "Shikohabad", "Shamli", "Awagarh", "Kasganj"],
    "Uttarakhand": ["Dehradun", "Haridwar", "Roorkee", "Haldwani", "Rudrapur", "Kashipur", "Rishikesh", "Kotdwar", "Ramnagar", "Manglaur"],
    "West Bengal": ["Kolkata", "Howrah", "Durgapur", "Asansol", "Siliguri", "Malda", "Bardhaman", "Baharampur", "Habra", "Kharagpur"],
    "Delhi": ["New Delhi", "Delhi Cantonment", "Narela", "Najafgarh", "Alipur", "Mehrauli", "Karol Bagh", "Dwarka", "Rohini", "Janakpuri"],
    "Jammu and Kashmir": ["Srinagar", "Jammu", "Baramulla", "Anantnag", "Sopore", "KathuaUdhampur", "Punch", "Rajauri", "Kupwara"],
    "Ladakh": ["Leh", "Kargil", "Nubra", "Zanskar", "Drass", "Khaltse", "Nyoma", "Durbuk", "Tangtse", "Chushul"],
    "Puducherry": ["Puducherry", "Karaikal", "Yanam", "Mahe", "Villianur", "Ariyankuppam", "Mannadipet", "Bahour", "Nettapakkam", "Kirumampakkam"],
    "Chandigarh": ["Chandigarh"],
    "Andaman and Nicobar Islands": ["Port Blair", "Bamboo Flat", "Garacharma", "Dignabad", "Ferrargunj", "Rangat", "Mayabunder", "Diglipur", "Car Nicobar", "Nancowry"],
    "Dadra and Nagar Haveli and Daman and Diu": ["Daman", "Diu", "Silvassa", "Naroli", "Dadra", "Nagar Haveli", "Khanvel", "Samarvarni", "Dudhani", "Kilvani"],
    "Lakshadweep": ["Kavaratti", "Agatti", "Minicoy", "Amini", "Andrott", "Kalpeni", "Kadmat", "Kiltan", "Chetlat", "Bitra"]
};



window.openTermsModal = function() {
    console.log('Opening Terms Modal');
    document.getElementById('termsModal').style.display = 'flex';
}

window.closeTermsModal = function() {
    console.log('Closing Terms Modal');
    document.getElementById('termsModal').style.display = 'none';
}

window.openFAQModal = function() {
    console.log('Opening FAQ Modal');
    document.getElementById('faqModal').style.display = 'flex';
}

window.closeFAQModal = function() {
    console.log('Closing FAQ Modal');
    document.getElementById('faqModal').style.display = 'none';
}

window.closeSidebar = function() {
    // No longer needed - cart sidebar removed
};

window.openPrivacyModal = function() {
    console.log('Opening Privacy Modal');
    document.getElementById('privacyModal').style.display = 'flex';
}

// Open Privacy Modal in specific section
window.openPrivacyModalInSection = function(sectionName) {
    console.log('Opening Privacy Modal in section:', sectionName);
    
    // Create modal HTML content
    const modalContent = `
        <div class="login-modal" style="display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); z-index: 3000; justify-content: center; align-items: center;">
            <div class="login-container" style="display: flex; position: relative; max-width: 600px; width: 90%; max-height: 85vh; overflow-y: auto; background: white; border-radius: 12px;">
                <button onclick="closePrivacyModalInSection()" style="position: absolute; top: 10px; right: 15px; background: none; border: none; font-size: 24px; cursor: pointer; color: #666; z-index: 1;">×</button>
                
                <div class="logo-section">
                    <h1 style="color: #1f2937; font-weight: 700;">Ficokart</h1>
                    <h2>Privacy Policy</h2>
                    <p>Data protection and privacy</p>
                </div>

                <div class="auth-form" style="display: block !important; padding: 10px; text-align: left; font-size: 10px; height: 100%; overflow-y: auto;">
                    <div style="color: #2c3e50; line-height: 1.3; padding-bottom: 20px;">
                        <p style="margin-bottom: 8px; font-weight: 600; font-size: 13px;">🔒 Privacy Policy for Ficokart</p>
                        <p style="margin-bottom: 8px; font-size: 11px;">Last Updated: October 2024</p>
                        <p style="margin-bottom: 8px; font-size: 11px;">Ficokart ("we", "our", "us") respects your privacy and is committed to protecting your personal information. This Privacy Policy explains how we collect, use, store, and protect your data when you use our mobile application and services.</p>
                        
                        <div style="margin-bottom: 8px; padding: 8px; background: #f8f9fa; border-radius: 5px; border-left: 3px solid #27ae60;">
                            <h5 style="color: #27ae60; margin: 0 0 3px 0; font-size: 10px;">1. Information We Collect</h5>
                            <p style="margin: 0; font-size: 11px;">We may collect:<br>
                            • Personal Information: Name, email address, phone number, and shipping address (when you place an order).<br>
                            • Usage Data: App activity, browsing behavior, and device information to improve the user experience.</p>
                        </div>
                        
                        <div style="margin-bottom: 8px; padding: 8px; background: #f8f9fa; border-radius: 5px; border-left: 3px solid #f59e0b;">
                            <h5 style="color: #3498db; margin: 0 0 3px 0; font-size: 10px;">2. How We Use Your Information</h5>
                            <p style="margin: 0; font-size: 11px;">We use your information to:<br>
                            • Process and deliver your orders.<br>
                            • Provide customer support.<br>
                            • Improve our services and app experience.<br>
                            • Send updates, offers, and promotions (only if you allow).</p>
                        </div>
                        
                        <div style="margin-bottom: 8px; padding: 8px; background: #f8f9fa; border-radius: 5px; border-left: 3px solid #e74c3c;">
                            <h5 style="color: #e74c3c; margin: 0 0 3px 0; font-size: 10px;">3. Sharing of Information</h5>
                            <p style="margin: 0; font-size: 11px;">• We do not sell, rent, or trade your personal information.<br>
                            • We may share limited data with delivery partners to fulfill your order.<br>
                            • We may disclose information if required by law.</p>
                        </div>
                        
                        <div style="margin-bottom: 8px; padding: 8px; background: #f8f9fa; border-radius: 5px; border-left: 3px solid #f39c12;">
                            <h5 style="color: #f39c12; margin: 0 0 3px 0; font-size: 10px;">4. Data Security</h5>
                            <p style="margin: 0; font-size: 11px;">We take reasonable measures to protect your data against unauthorized access, loss, or misuse. However, no method is 100% secure.</p>
                        </div>
                        
                        <div style="margin-bottom: 8px; padding: 8px; background: #f8f9fa; border-radius: 5px; border-left: 3px solid #9b59b6;">
                            <h5 style="color: #9b59b6; margin: 0 0 3px 0; font-size: 10px;">5. Cookies & Tracking</h5>
                            <p style="margin: 0; font-size: 11px;">We may use cookies or similar technologies to improve app functionality. You can disable them in your device settings.</p>
                        </div>
                        
                        <div style="margin-bottom: 8px; padding: 8px; background: #f8f9fa; border-radius: 5px; border-left: 3px solid #1abc9c;">
                            <h5 style="color: #1abc9c; margin: 0 0 3px 0; font-size: 10px;">6. Your Rights</h5>
                            <p style="margin: 0; font-size: 11px;">You can:<br>
                            • Access or update your account details anytime.<br>
                            • Request account deletion by contacting us.<br>
                            • Opt out of promotional messages.</p>
                        </div>
                        
                        <div style="margin-bottom: 8px; padding: 8px; background: #f8f9fa; border-radius: 5px; border-left: 3px solid #34495e;">
                            <h5 style="color: #34495e; margin: 0 0 3px 0; font-size: 10px;">7. Third-Party Links</h5>
                            <p style="margin: 0; font-size: 11px;">Our app may contain links to third-party websites. We are not responsible for their privacy practices.</p>
                        </div>
                        
                        <div style="margin-bottom: 8px; padding: 8px; background: #f8f9fa; border-radius: 5px; border-left: 3px solid #e67e22;">
                            <h5 style="color: #e67e22; margin: 0 0 3px 0; font-size: 10px;">8. Policy Updates</h5>
                            <p style="margin: 0; font-size: 11px;">We may update this Privacy Policy from time to time. Changes will be posted in the app.</p>
                        </div>
                        
                        <div style="margin-bottom: 8px; padding: 8px; background: #f8f9fa; border-radius: 5px; border-left: 3px solid #8e44ad;">
                            <h5 style="color: #8e44ad; margin: 0 0 3px 0; font-size: 10px;">9. App Permissions Explained</h5>
                            <p style="margin: 0; font-size: 11px;">• Location Access: To provide accurate delivery addresses and location-based services.<br>• Storage Access: To save your preferences, cart items, and app data locally.<br>• Camera Access: Optional - for profile pictures and product reviews.<br>• Notification Access: To send order updates, delivery notifications, and promotional offers.<br>• Internet Access: Essential for app functionality, product browsing, and order processing.</p>
                        </div>
                        
                        <div style="margin-bottom: 8px; padding: 8px; background: #f8f9fa; border-radius: 5px; border-left: 3px solid #2c3e50;">
                            <h5 style="color: #2c3e50; margin: 0 0 3px 0; font-size: 10px;">10. Data Retention</h5>
                            <p style="margin: 0; font-size: 11px;">• Account data: Retained until account deletion.<br>• Order history: Kept for 7 years for legal compliance.<br>• Usage data: Anonymized after 2 years.<br>• Payment information: Not stored on our servers.</p>
                        </div>
                        
                        <div style="margin-bottom: 8px; padding: 8px; background: #f8f9fa; border-radius: 5px; border-left: 3px solid #d35400;">
                            <h5 style="color: #d35400; margin: 0 0 3px 0; font-size: 10px;">11. Children's Privacy</h5>
                            <p style="margin: 0; font-size: 11px;">Our app is not intended for children under 13. We do not knowingly collect personal information from children under 13. If you are a parent and believe your child has provided us with personal information, please contact us.</p>
                        </div>
                        
                        <div style="margin-bottom: 8px; padding: 8px; background: #f8f9fa; border-radius: 5px; border-left: 3px solid #16a085;">
                            <h5 style="color: #16a085; margin: 0 0 3px 0; font-size: 10px;">12. International Data Transfers</h5>
                            <p style="margin: 0; font-size: 11px;">Your data is primarily stored and processed in India. If data is transferred internationally, we ensure appropriate safeguards are in place.</p>
                        </div>
                        
                        <div style="margin-bottom: 8px; padding: 8px; background: #f8f9fa; border-radius: 5px; border-left: 3px solid #c0392b;">
                            <h5 style="color: #c0392b; margin: 0 0 3px 0; font-size: 10px;">13. Contact Us</h5>
                            <p style="margin: 0; font-size: 11px;">For privacy-related questions or concerns:<br>• Email: moghaeashu@gmail.com<br>• Phone: +91 7000842463<br>• Address: India<br>• Response time: Within 48 hours</p>
                        </div>
                        
                        <p style="margin-top: 10px; font-size: 10px; color: #7f8c8d; text-align: center;">Last updated: October 2024<br>Ficokart - Committed to Your Privacy<br>Made in India 🇮🇳</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove any existing section privacy modal
    const existingModal = document.getElementById('sectionPrivacyModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Create and append new modal
    const modalDiv = document.createElement('div');
    modalDiv.id = 'sectionPrivacyModal';
    modalDiv.innerHTML = modalContent;
    document.body.appendChild(modalDiv);
}

// Close section-specific privacy modal
window.closePrivacyModalInSection = function() {
    console.log('Closing Section Privacy Modal');
    const modal = document.getElementById('sectionPrivacyModal');
    if (modal) {
        modal.remove();
    }
}

window.closePrivacyModal = function() {
    console.log('Closing Privacy Modal');
    document.getElementById('privacyModal').style.display = 'none';
}

window.copyContactNumber = function() {
    const contactNumber = '+91 8218864803';
    navigator.clipboard.writeText(contactNumber).then(() => {
        showNotification('Contact number copied! 📋', 'success');
    }).catch(err => {
        console.error('Failed to copy: ', err);
        showNotification('Failed to copy number', 'error');
    });
}

// Function to load user address in modal
async function loadUserAddressInModal() {
    try {
        await loadUserAddressFromFirebase();
        
        if (userAddressData) {
            // Fill form fields with saved data
            document.getElementById('userPhone').value = userAddressData.phone || '';
            document.getElementById('userState').value = userAddressData.state || '';
            document.getElementById('userCity').value = userAddressData.city || '';
            document.getElementById('userAddress').value = userAddressData.address || '';
            document.getElementById('userPincode').value = userAddressData.pincode || '';
            document.getElementById('userNearby').value = userAddressData.nearby || '';
            
            // Update city options based on selected state
            if (userAddressData.state) {
                updateCityOptions(userAddressData.state);
                // Set city after options are populated
                setTimeout(() => {
                    document.getElementById('userCity').value = userAddressData.city || '';
                }, 100);
            }
            
            // Show current address display
            document.getElementById('displayState').textContent = userAddressData.state || 'Not set';
            document.getElementById('displayCity').textContent = userAddressData.city || 'Not set';
            document.getElementById('displayAddress').textContent = userAddressData.address || 'Not set';
            document.getElementById('displayPincode').textContent = userAddressData.pincode || 'Not set';
            document.getElementById('displayPhone').textContent = userAddressData.phone || 'Not set';
            document.getElementById('displayNearby').textContent = userAddressData.nearby || 'Not set';
            
            // Display Google Maps link
            const googleMapsContainer = document.getElementById('displayGoogleMapsContainer');
            if (googleMapsContainer) {
                if (userAddressData.googleMapsLink) {
                    googleMapsContainer.innerHTML = `
                        <div style="background: white; padding: 10px; border-radius: 6px; border-left: 3px solid #4285f4;">
                            <div style="font-size: 10px; color: #666; margin-bottom: 2px;">GOOGLE MAPS LOCATION</div>
                            <a href="${userAddressData.googleMapsLink}" target="_blank" style="color: #4285f4; text-decoration: none; font-weight: 600; font-size: 10px; display: flex; align-items: center; gap: 5px;">
                                📍 View on Google Maps
                                <span style="font-size: 10px;">↗</span>
                            </a>
                        </div>
                    `;
                } else {
                    googleMapsContainer.innerHTML = `
                        <div style="background: white; padding: 10px; border-radius: 6px; border-left: 3px solid #e74c3c;">
                            <div style="font-size: 10px; color: #666; margin-bottom: 2px;">GOOGLE MAPS LOCATION</div>
                            <div style="color: #e74c3c; font-weight: 600; font-size: 10px;">Not provided</div>
                        </div>
                    `;
                }
            }
            
            document.getElementById('currentAddressDisplay').style.display = 'block';
        } else {
            // Hide current address display if no data
            document.getElementById('currentAddressDisplay').style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading address in modal:', error);
        document.getElementById('currentAddressDisplay').style.display = 'none';
    }
}

// Function to load address in profile section
async function loadAddressInProfileSection() {
    try {
        await loadUserAddressFromFirebase();
        
        // Also load saved addresses from Firebase
        await loadSavedAddresses();
        
        // Check if elements exist before updating
        const stateEl = document.getElementById('profileDisplayState');
        const cityEl = document.getElementById('profileDisplayCity');
        const pincodeEl = document.getElementById('profileDisplayPincode');
        const addressEl = document.getElementById('profileDisplayAddress');
        const nearbyEl = document.getElementById('profileDisplayNearby');
        const displayEl = document.getElementById('profileAddressDisplay');
        
        if (!stateEl || !cityEl || !pincodeEl || !addressEl || !nearbyEl || !displayEl) {
            console.log('Profile address elements not found, skipping update');
            return;
        }
        
        if (userAddressData) {
            // Show address details in profile section (without phone)
            stateEl.textContent = userAddressData.state || 'Not set';
            cityEl.textContent = userAddressData.city || 'Not set';
            pincodeEl.textContent = userAddressData.pincode || 'Not set';
            addressEl.textContent = userAddressData.address || 'Not set';
            nearbyEl.textContent = userAddressData.nearby || 'Not set';
            
            // displayEl.style.display = 'block'; // Hidden as per user request
        } else {
            // Hide address display if no data
            displayEl.style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading address in profile section:', error);
        const displayEl = document.getElementById('profileAddressDisplay');
        if (displayEl) {
            displayEl.style.display = 'none';
        }
    }
}

window.saveUserAddress = async function() {
    const phone = document.getElementById('userPhone').value.trim();
    const state = document.getElementById('userState').value.trim();
    const city = document.getElementById('userCity').value.trim();
    const address = document.getElementById('userAddress').value.trim();
    const pincode = document.getElementById('userPincode').value.trim();
    const nearby = document.getElementById('userNearby').value.trim();
    
    // Validation
    if (!phone || !state || !city || !address || !pincode) {
        showNotification('Please fill in all required fields (Phone, State, City, Address, Pincode)', 'warning');
        return;
    }
    
    // Validate phone number format (10 digits)
    if (!/^\d{10}$/.test(phone)) {
        showNotification('Please enter a valid 10-digit phone number', 'warning');
        return;
    }
    
    // Validate pincode format (6 digits)
    if (!/^\d{6}$/.test(pincode)) {
        showNotification('Please enter a valid 6-digit pincode', 'warning');
        return;
    }
    
    const googleMapsLink = document.getElementById('userGoogleMapsLink').value.trim();
    
    // Validate Google Maps link
    if (!googleMapsLink) {
        showNotification('Please provide Google Maps location link', 'warning');
        return;
    }
    
    // Basic validation for Google Maps URL (flexible validation for all Google Maps formats)
    const isValidGoogleMapsLink = googleMapsLink.includes('maps.google.com') || 
                                googleMapsLink.includes('google.com/maps') || 
                                googleMapsLink.includes('goo.gl') || 
                                googleMapsLink.includes('maps.app.goo.gl') ||
                                googleMapsLink.includes('maps.app');
    
    if (!isValidGoogleMapsLink) {
        showNotification('Please enter a valid Google Maps link', 'warning');
        return;
    }
    
    const addressData = {
        phone: phone,
        state: state,
        city: city,
        address: address,
        pincode: pincode,
        nearby: nearby,
        googleMapsLink: googleMapsLink
    };
    
    const success = await saveUserAddressToFirebase(addressData);
    if (success) {
        userAddressData = addressData;
        showNotification('Address saved successfully! 📍', 'success');
        displayCurrentAddress();
        // Update profile section address display only if profile is active
        setTimeout(() => {
            loadAddressInProfileSection();
        }, 100);
    } else {
        showNotification('Error saving address. Please try again.', 'error');
    }
};

function loadCurrentAddress() {
    if (userAddressData) {
        const stateSelect = document.getElementById('userState');
        const citySelect = document.getElementById('userCity');
        
        document.getElementById('userPhone').value = userAddressData.phone || '';
        stateSelect.value = userAddressData.state || '';
        
        // Load cities for the selected state
        if (userAddressData.state) {
            updateCityOptions(userAddressData.state);
            citySelect.value = userAddressData.city || '';
        }
        
        document.getElementById('userAddress').value = userAddressData.address || '';
        document.getElementById('userPincode').value = userAddressData.pincode || '';
        document.getElementById('userNearby').value = userAddressData.nearby || '';
        document.getElementById('userGoogleMapsLink').value = userAddressData.googleMapsLink || '';
        displayCurrentAddress();
    }
}

// Update city options based on selected state
function updateCityOptions(selectedState) {
    const citySelect = document.getElementById('userCity');
    citySelect.innerHTML = '<option value="">Select City</option>';
    
    if (selectedState && stateCityMap[selectedState]) {
        stateCityMap[selectedState].forEach(city => {
            const option = document.createElement('option');
            option.value = city;
            option.textContent = city;
            citySelect.appendChild(option);
        });
    }
}

function displayCurrentAddress() {
    const displayDiv = document.getElementById('currentAddressDisplay');
    const displayPhone = document.getElementById('displayPhone');
    const displayState = document.getElementById('displayState');
    const displayCity = document.getElementById('displayCity');
    const displayAddress = document.getElementById('displayAddress');
    const displayPincode = document.getElementById('displayPincode');
    const displayNearby = document.getElementById('displayNearby');

    // Profile address display
    const profileDisplayDiv = document.getElementById('profileAddressDisplay');
    const profileDisplayPhone = document.getElementById('profileDisplayPhone');
    const profileDisplayState = document.getElementById('profileDisplayState');
    const profileDisplayCity = document.getElementById('profileDisplayCity');
    const profileDisplayAddress = document.getElementById('profileDisplayAddress');
    const profileDisplayPincode = document.getElementById('profileDisplayPincode');
    const profileDisplayNearby = document.getElementById('profileDisplayNearby');

    if (userAddressData && (userAddressData.phone || userAddressData.state || userAddressData.city || userAddressData.address)) {
        // Modal display
        if (displayDiv) {
            displayDiv.style.display = 'block';
            if (displayPhone) displayPhone.textContent = `Phone: ${userAddressData.phone || 'Not provided'}`;
            if (displayState) displayState.textContent = `State: ${userAddressData.state || 'Not provided'}`;
            if (displayCity) displayCity.textContent = `City: ${userAddressData.city || 'Not provided'}`;
            if (displayAddress) displayAddress.textContent = `Address: ${userAddressData.address || 'Not provided'}`;
            if (displayPincode) displayPincode.textContent = `Pincode: ${userAddressData.pincode || 'Not provided'}`;
            if (displayNearby) displayNearby.textContent = `Nearby: ${userAddressData.nearby || 'Not provided'}`;
        }

        // Profile display
        if (profileDisplayDiv) {
            profileDisplayDiv.style.display = 'block';
            if (profileDisplayPhone) profileDisplayPhone.textContent = userAddressData.phone || 'Not provided';
            if (profileDisplayState) profileDisplayState.textContent = userAddressData.state || 'Not provided';
            if (profileDisplayCity) profileDisplayCity.textContent = userAddressData.city || 'Not provided';
            if (profileDisplayAddress) profileDisplayAddress.textContent = userAddressData.address || 'Not provided';
            if (profileDisplayPincode) profileDisplayPincode.textContent = userAddressData.pincode || 'Not provided';
            if (profileDisplayNearby) profileDisplayNearby.textContent = userAddressData.nearby || 'Not provided';
            
            // Display Google Maps link in profile section
            const profileGoogleMapsContainer = document.getElementById('profileGoogleMapsContainer');
            if (profileGoogleMapsContainer) {
                if (userAddressData.googleMapsLink) {
                    profileGoogleMapsContainer.innerHTML = `
                        <div style="background: white; padding: 12px; border-radius: 8px; border-left: 3px solid #4285f4;">
                            <div style="font-size: 10px; color: #666; margin-bottom: 3px;">GOOGLE MAPS LOCATION</div>
                            <a href="${userAddressData.googleMapsLink}" target="_blank" style="color: #4285f4; text-decoration: none; font-weight: 600; font-size: 13px; display: flex; align-items: center; gap: 8px;">
                                📍 View on Google Maps
                                <span style="font-size: 10px;">↗</span>
                            </a>
                        </div>
                    `;
                } else {
                    profileGoogleMapsContainer.innerHTML = `
                        <div style="background: white; padding: 12px; border-radius: 8px; border-left: 3px solid #e74c3c;">
                            <div style="font-size: 10px; color: #666; margin-bottom: 3px;">GOOGLE MAPS LOCATION</div>
                            <div style="color: #e74c3c; font-weight: 600; font-size: 13px;">Not provided</div>
                        </div>
                    `;
                }
            }
        }
    } else {
        if (displayDiv) displayDiv.style.display = 'none';
        if (profileDisplayDiv) profileDisplayDiv.style.display = 'none';
    }
}

// Navigation history for back button functionality
let navigationHistory = ['home'];
let currentHistoryIndex = 0;

// Navigation Stack - Complete step-by-step navigation system
let navigationStack = [];
let isNavigatingInternally = false;

// Navigation Stack Management
function pushToNavigationStack(type, data = {}) {
    const navigationItem = {
        type: type,
        data: data,
        timestamp: Date.now()
    };
    navigationStack.push(navigationItem);
    console.log('Navigation Stack Push:', type, navigationStack.length);
    
    // Add to browser history
    history.pushState({
        navigationType: type,
        navigationData: data,
        stackLength: navigationStack.length
    }, '', '');
}

function popFromNavigationStack() {
    if (navigationStack.length > 0) {
        const item = navigationStack.pop();
        console.log('Navigation Stack Pop:', item.type, navigationStack.length);
        return item;
    }
    return null;
}

function clearNavigationStack() {
    navigationStack = [];
    console.log('Navigation Stack Cleared');
}

// Single unified back button handler
window.addEventListener('popstate', function(event) {
    console.log('Back button pressed, stack length:', navigationStack.length);
    
    // Prevent default browser navigation
    event.preventDefault();
    
    // If navigation stack is empty, stay on current page
    if (navigationStack.length === 0) {
        console.log('Navigation stack empty, staying on current page');
        history.pushState({}, '', '');
        return;
    }

    // Get the last navigation item and close it
    const lastNavigation = popFromNavigationStack();
    if (!lastNavigation) {
        console.log('No navigation item to close');
        return;
    }

    console.log('Closing navigation item:', lastNavigation.type);
    
    // Close the appropriate modal/section based on type
    switch(lastNavigation.type) {
        case 'product-modal':
            // Check if there are more product modals in the stack after removing current one
            const remainingProductModals = navigationStack.filter(item => item.type === 'product-modal');
            if (remainingProductModals.length > 0) {
                // Get the previous product (last one in remaining stack)
                const previousProduct = remainingProductModals[remainingProductModals.length - 1];
                // Don't add to navigation stack when going back (to avoid infinite loop)
                const product = productsData.find(p => p.id === previousProduct.data.productId);
                if (product) {
                    // Directly update the modal content without adding to navigation stack
                    const modal = document.getElementById('productModal');
                    const modalBody = document.getElementById('productModalBody');
                    
                    // Update modal with previous product content (without adding to navigation stack)
                    updateProductModalContent(previousProduct.data.productId);
                }
            } else {
                // No more product modals, close completely
                closeProductModalInternal();
            }
            break;
        case 'category-modal':
            closeCategoryModalInternal();
            break;
        case 'confirm-order-modal':
        case 'confirm-order-all-modal':
            closeConfirmOrderModalInternal();
            break;
        case 'cart-modal':
            closeCartModalInternal();
            break;
        case 'invoice-modal':
            closeInvoiceModalInternal();
            break;
        case 'location-modal':
            closeLocationModalInternal();
            break;
        case 'login-modal':
            closeLoginModalInternal();
            break;
        case 'address-map-modal':
            closeAddressMapModalInternal();
            break;
        case 'section':
            // Navigate back to previous section by checking navigation stack
            let previousSection = 'home'; // default fallback
            
            // Look for the previous section in the navigation stack
            for (let i = navigationStack.length - 1; i >= 0; i--) {
                if (navigationStack[i].type === 'section') {
                    previousSection = navigationStack[i].data.sectionName;
                    break;
                }
            }
            
            setActiveTabWithoutHistory(previousSection);
            break;
        default:
            console.log('Unknown navigation type:', lastNavigation.type);
    }
});

// Internal modal close functions (without navigation stack manipulation)
function closeProductModalInternal() {
    document.getElementById('productModal').style.display = 'none';
    document.body.style.overflow = 'auto';
    
    // Show floating cart notification when closing product modal (unless in cart section or cart modal is open)
    const currentTab = document.querySelector('.tab-btn.active')?.getAttribute('data-tab');
    const cartModal = document.getElementById('cartModal');
    const isCartModalOpen = cartModal && cartModal.style.display === 'block';
    
    if (currentTab !== 'cart' && !isCartModalOpen) {
        setTimeout(() => {
            updateFloatingCartNotification();
        }, 100);
    }
}


function closeConfirmOrderModalInternal() {
    document.getElementById('confirmOrderModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

function closeCartModalInternal() {
    const cartModal = document.getElementById('cartModal');
    if (cartModal) {
        cartModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

function closeInvoiceModalInternal() {
    const modal = document.getElementById('invoiceModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

function closeLocationModalInternal() {
    document.getElementById('locationModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

function closeLoginModalInternal() {
    document.getElementById('loginModal').style.display = 'none';
    document.body.style.overflow = 'auto';
    // Show bottom navbar when modal closes
    const bottomNav = document.querySelector('.app-bottom-nav');
    if (bottomNav) {
        bottomNav.style.display = 'flex';
    }
}

function closeAddressMapModalInternal() {
    const modal = document.getElementById('addressMapModal');
    if (modal) {
        modal.classList.remove('active');
        
        // Clear phone input
        document.getElementById('addressPhoneInput').value = '';
        
        // Destroy map to prevent memory leaks
        if (addressMap) {
            addressMap.remove();
            addressMap = null;
        }
    }
}

// Set active tab without adding to history (for back navigation)
async function setActiveTabWithoutHistory(tab) {
    console.log('Setting active tab without history:', tab);
    
    // Close all modals first
    setTimeout(() => {
        closeProductModal();
        closeConfirmOrderModal();
        closeSidebar();
        closeCartModal();
    }, 50);
    
    // Remove active class from all tabs
    document.querySelectorAll('.app-nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active class to clicked tab
    const navItems = document.querySelectorAll('.app-nav-item');
    navItems.forEach(item => {
        const label = item.querySelector('.app-nav-label');
        if (label && label.textContent.toLowerCase() === tab.toLowerCase()) {
            item.classList.add('active');
        }
    });
    
    // Hide all sections and IMMEDIATELY reset scroll positions
    document.querySelectorAll('.app-section').forEach(section => {
        section.classList.remove('active');
        section.scrollTop = 0;
        const scrollableContainers = section.querySelectorAll('.products-grid, .categories-grid, .event-products, .orders-container, .cart-items, .search-results');
        scrollableContainers.forEach(container => {
            container.scrollTop = 0;
        });
    });
    
    // IMMEDIATE scroll reset for body and document
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
    
    // Show selected section and ensure scroll is at top
    switch(tab) {
        case 'home':
            const homeSection = document.getElementById('homeSection');
            homeSection.classList.add('active');
            homeSection.scrollTop = 0;
            document.body.scrollTop = 0;
            document.documentElement.scrollTop = 0;
            break;
        case 'search':
            const searchSection = document.getElementById('searchSection');
            searchSection.classList.add('active');
            searchSection.scrollTop = 0;
            document.body.scrollTop = 0;
            document.documentElement.scrollTop = 0;
            loadAllProductsInSearch();
            break;
        case 'categories':
            const categoriesSection = document.getElementById('categoriesSection');
            categoriesSection.classList.add('active');
            categoriesSection.scrollTop = 0;
            document.body.scrollTop = 0;
            document.documentElement.scrollTop = 0;
            
            // Load only category events (no categories grid)
            loadEventsOnCategoriesPage();
            break;
        case 'cart':
            const cartSection = document.getElementById('cartSection');
            cartSection.classList.add('active');
            cartSection.scrollTop = 0;
            document.body.scrollTop = 0;
            document.documentElement.scrollTop = 0;
            
            // Hide floating cart notification when entering cart section
            const floatingNotification = document.getElementById('floatingCartNotification');
            if (floatingNotification) {
                floatingNotification.classList.remove('show');
                floatingNotification.classList.add('hide');
            }
            // Add delay to ensure DOM is ready
            setTimeout(() => {
                loadCartFromFirebase();
                cartSection.querySelectorAll('.cart-items, .cart-content').forEach(container => {
                    container.scrollTop = 0;
                });
            }, 50);
            break;
        case 'orders':
            const ordersSection = document.getElementById('ordersSection');
            ordersSection.classList.add('active');
            ordersSection.scrollTop = 0;
            document.body.scrollTop = 0;
            document.documentElement.scrollTop = 0;
            loadOrdersDataFromFirebase();
            break;
        case 'profile':
            const profileSection = document.getElementById('profileSection');
            profileSection.classList.add('active');
            profileSection.scrollTop = 0;
            document.body.scrollTop = 0;
            document.documentElement.scrollTop = 0;
            updateProfileInfo();
            loadAddressInProfileSection();
            break;
    }
}

// Cart functionality and form handlers
document.addEventListener('DOMContentLoaded', async function() {
    // Set initial navbar state - home page has scrollable navbar
    document.body.classList.add('home-active');
    
    // Initialize history state to prevent app exit - push multiple entries
    if (window.history && window.history.pushState) {
        // Push initial home state
        window.history.replaceState({section: 'home', initial: true}, 'Home', '#home');
        // Push additional state to create history buffer
        window.history.pushState({section: 'home', buffer: true}, 'Home', '#home');
    }
    
    // Load data with performance optimization
    loadData(); // Non-blocking load
    
    // Initialize pull-to-refresh functionality
    initializePullToRefresh();
    
    // Load cart data immediately when app opens
    await loadCartFromFirebase();
    
    // Show floating cart notification after cart is loaded
    setTimeout(() => {
        updateFloatingCartNotification();
    }, 500);
    
    // Load events from Firebase and display on home page (after products are loaded)
    setTimeout(async () => {
        try {
            await loadEventsFromFirebase();
            console.log('Events loaded from Firebase:', eventsData.length);
            // Wait for products to be loaded before displaying events
            await waitForProductsToLoad();
            console.log('Products loaded, now displaying events');
            loadEventsOnHomePage();
            console.log('Events displayed on home page');
        } catch (error) {
            console.error('Error loading events:', error);
        }
    }, 300);
    
    // Add event listener for state selection
    const stateSelect = document.getElementById('userState');
    if (stateSelect) {
        stateSelect.addEventListener('change', function() {
            const selectedState = this.value;
            updateCityOptions(selectedState);
        });
    }
    
    const cartBtn = document.querySelector('.cart-btn');
    if (cartBtn) {
        cartBtn.addEventListener('click', function() {
            showNotification('Cart functionality is already implemented! 🛒', 'info');
        });
    }
    
    // Add form event listeners
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const emailOrPhone = document.getElementById('loginEmailOrPhone').value.trim();
            const password = document.getElementById('loginPassword').value;
            
            if (!emailOrPhone || !password) {
                showNotification('Please fill in all fields', 'error');
                return;
            }
            
            await loginWithEmailOrPhone(emailOrPhone, password);
        });
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const name = document.getElementById('registerName').value.trim();
            const email = document.getElementById('registerEmail').value.trim();
            const phone = document.getElementById('registerPhone').value.trim();
            const password = document.getElementById('registerPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            // Validation
            if (!name || !email || !phone || !password || !confirmPassword) {
                showNotification('Please fill in all fields', 'error');
                return;
            }
            
            if (password.length < 6) {
                showNotification('Password must be at least 6 characters', 'error');
                return;
            }
            
            if (password !== confirmPassword) {
                showNotification('Passwords do not match', 'error');
                return;
            }
            
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showNotification('Please enter a valid email address', 'error');
                return;
            }
            
            const phoneRegex = /^[0-9]{10}$/;
            if (!phoneRegex.test(phone)) {
                showNotification('Please enter a valid 10-digit phone number', 'error');
                return;
            }
            
            // Call the main Firebase registration function
            registerWithEmailAndPhone(name, email, phone, password);
        });
    }
    
    // Initialize slideshow when page loads
    setTimeout(() => {
        updateSlideshow();
        
        // Show floating cart notification if cart has items on app load
        // Show floating cart notification immediately on app load
        // Force show cart notification if cart has items
        setTimeout(() => {
            const notification = document.getElementById('floatingCartNotification');
            if (notification && cartItems && cartItems.length > 0) {
                notification.classList.remove('hide');
                notification.classList.add('show');
            }
        }, 2000);
        updateFloatingCartNotification();
        // Also try again after a delay in case cart data loads later
        setTimeout(() => updateFloatingCartNotification(), 1000);
        
        // Console message for size variant testing
        console.log('🛒 Size Variant Feature Added!');
        console.log('📱 How it works:');
        console.log('   • Products without size variants → Direct add to cart');
        console.log('   • Products with size variants → Size selection popup');
        console.log('🧪 Test with: testSizeVariants()');
    }, 500);
}); // Close DOMContentLoaded function

// Global orders data
let globalOrdersData = [];

// Invoice Modal Functions
window.showInvoice = async function(orderId) {
    // Add to navigation stack
    pushToNavigationStack('invoice-modal', { orderId: orderId });
    let order = null;
    
    // First, check if order exists in admin orders (for admin panel)
    if (allAdminOrders && allAdminOrders.length > 0) {
        order = allAdminOrders.find(o => o.id === orderId);
    }
    
    // If not found in admin orders, check global orders (for user orders)
    if (!order && globalOrdersData && globalOrdersData.length > 0) {
        order = globalOrdersData.find(o => o.id === orderId);
    }
    
    // If still not found, try to load from Firebase directly
    if (!order) {
        try {
            console.log('Order not found in cache, loading from Firebase...');
            const orderDoc = await getDoc(doc(db, 'orders', orderId));
            if (orderDoc.exists()) {
                order = { id: orderDoc.id, ...orderDoc.data() };
            } else {
                alert('Order not found in database');
                return;
            }
        } catch (error) {
            console.error('Error loading order from Firebase:', error);
            alert('Error loading order data');
            return;
        }
    }
    
    const invoiceModal = document.getElementById('invoiceModal');
    const invoiceContent = document.getElementById('invoiceContent');
    const printBtn = document.getElementById('printInvoiceBtn');
    
    // Generate invoice content
    invoiceContent.innerHTML = generateInvoiceHTML(order);
    
    // Show print button only on desktop (screen width > 768px)
    if (window.innerWidth > 768) {
        printBtn.style.display = 'block';
    } else {
        printBtn.style.display = 'none';
    }
    
    // Show modal
    invoiceModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
};

function closeUserLocationModalInternal() {
    const modal = document.getElementById('userLocationModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

window.closeInvoiceModal = function() {
    closeInvoiceModalInternal();
};

// Wallet Functions
window.openWalletModal = function() {
    document.getElementById('walletModal').style.display = 'flex';
    loadWalletBalance();
};

window.closeWalletModal = function() {
    document.getElementById('walletModal').style.display = 'none';
};

async function loadWalletBalance() {
    console.log('loadWalletBalance called');
    if (!currentUser) {
        console.log('No currentUser in loadWalletBalance');
        return;
    }
    try {
        const userRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            const earnedCashback = userData.earnedCashback || 0;
            const pendingCashback = userData.pendingCashback || 0;
            
            console.log('Loaded cashback - Earned:', earnedCashback, 'Pending:', pendingCashback);
            
            // Update Earned cashback (rounded to 2 decimal places)
            const earnedElement = document.getElementById('earnedCashback');
            if (earnedElement) {
                const roundedEarned = Math.round(earnedCashback * 100) / 100;
                earnedElement.textContent = `₹${roundedEarned}`;
            }
            
            // Update Pending cashback (rounded to 2 decimal places)
            const pendingElement = document.getElementById('pendingCashback');
            if (pendingElement) {
                const roundedPending = Math.round(pendingCashback * 100) / 100;
                pendingElement.textContent = `₹${roundedPending}`;
            }
            
            console.log('Wallet cashback updated in UI');
        } else {
            // Initialize with 0 values
            document.getElementById('earnedCashback').textContent = '₹0';
            document.getElementById('pendingCashback').textContent = '₹0';
        }
    } catch (error) {
        console.error('Error loading wallet balance:', error);
        document.getElementById('earnedCashback').textContent = '₹0';
        document.getElementById('pendingCashback').textContent = '₹0';
    }
}

async function addCashbackForOrder(orderAmount) {
    console.log('addCashbackForOrder called with amount:', orderAmount);
    console.log('currentUser:', currentUser);
    
    if (!currentUser) {
        console.log('No current user, skipping cashback');
        return;
    }
    
    const cashbackAmount = Math.round((orderAmount * 7) / 100);
    console.log('Calculated cashback amount:', cashbackAmount);
    
    if (cashbackAmount > 0) {
        console.log('Showing cashback reward card');
        // Show cashback reward card with celebration
        showCashbackReward(cashbackAmount);
    } else {
        console.log('No cashback earned (amount too low)');
    }
}

// Show cashback reward card with animations
function showCashbackReward(amount) {
    console.log('showCashbackReward called with amount:', amount);
    
    const card = document.getElementById('cashbackRewardCard');
    const amountElement = document.getElementById('cashbackAmount');
    
    console.log('Card element:', card);
    console.log('Amount element:', amountElement);
    
    if (card && amountElement) {
        amountElement.textContent = `₹${amount}`;
        card.style.display = 'flex';
        console.log('Cashback card displayed');
        
        // Start celebration crystals
        startCelebrationCrystals();
        
        // Store amount for collection
        window.pendingCashback = amount;
    } else {
        console.error('Card or amount element not found!');
    }
}

// Collect cashback and add to wallet
async function collectCashback() {
    console.log('collectCashback called');
    console.log('currentUser:', currentUser);
    console.log('pendingCashback:', window.pendingCashback);
    
    if (!currentUser || !window.pendingCashback) {
        console.log('Missing currentUser or pendingCashback, returning');
        return;
    }
    
    const amount = window.pendingCashback;
    console.log('Collecting cashback amount:', amount);
    
    try {
        console.log('Cashback already added to pending during order placement');
        console.log('Collect button just shows celebration animation');
        
        // Start flying stars animation
        startFlyingStarsAnimation();
        
        // Update wallet balance display
        console.log('Reloading wallet balance display...');
        loadWalletBalance();
        
        // Show success notification
        setTimeout(() => {
            showNotification(`₹${amount} cashback collected! 💰`, 'success', 3000);
            closeCashbackReward();
        }, 1500);
        
    } catch (error) {
        console.error('Error collecting cashback:', error);
        showNotification('Error collecting cashback. Please try again.', 'error', 3000);
    }
}

// Close cashback reward card
function closeCashbackReward() {
    const card = document.getElementById('cashbackRewardCard');
    if (card) {
        card.style.display = 'none';
        window.pendingCashback = null;
    }
}

// Make collectCashback globally accessible
window.collectCashback = collectCashback;

// Move pending cashback to earned when order is completed
async function completeCashbackForOrder(orderId, cashbackAmount, customerUserId = null) {
    if (!cashbackAmount) return;
    
    try {
        // Use provided customerUserId or fallback to currentUser (for backward compatibility)
        const userId = customerUserId || (currentUser ? currentUser.uid : null);
        if (!userId) {
            console.error('No user ID provided for cashback completion');
            return;
        }
        
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            const currentPending = userData.pendingCashback || 0;
            const currentEarned = userData.earnedCashback || 0;
            
            // Move from pending to earned (with proper rounding to avoid floating point errors)
            const newPending = Math.max(0, Math.round((currentPending - cashbackAmount) * 100) / 100);
            const newEarned = Math.round((currentEarned + cashbackAmount) * 100) / 100;
            
            await setDoc(userRef, {
                pendingCashback: newPending,
                earnedCashback: newEarned
            }, { merge: true });
            
            console.log(`✅ Cashback completed for user ${userId}: ₹${cashbackAmount} moved to earned`);
            
            // Only refresh UI if it's the current user's cashback
            if (currentUser && userId === currentUser.uid) {
                loadWalletBalance(); // Refresh UI
            }
        }
    } catch (error) {
        console.error('Error completing cashback:', error);
    }
}

// Remove pending cashback when order is cancelled
async function cancelCashbackForOrder(orderId, cashbackAmount, customerUserId = null) {
    if (!cashbackAmount) return;
    
    try {
        // Use provided customerUserId or fallback to currentUser (for backward compatibility)
        const userId = customerUserId || (currentUser ? currentUser.uid : null);
        if (!userId) {
            console.error('No user ID provided for cashback cancellation');
            return;
        }
        
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            const currentPending = userData.pendingCashback || 0;
            
            // Remove from pending (with proper rounding to avoid floating point errors)
            const newPending = Math.max(0, Math.round((currentPending - cashbackAmount) * 100) / 100);
            
            await setDoc(userRef, {
                pendingCashback: newPending
            }, { merge: true });
            
            console.log(`❌ Cashback cancelled for user ${userId}: ₹${cashbackAmount} removed from pending`);
            
            // Only refresh UI if it's the current user's cashback
            if (currentUser && userId === currentUser.uid) {
                loadWalletBalance(); // Refresh UI
            }
        }
    } catch (error) {
        console.error('Error cancelling cashback:', error);
    }
}

// Make functions globally accessible
window.completeCashbackForOrder = completeCashbackForOrder;
window.cancelCashbackForOrder = cancelCashbackForOrder;

// Test cashback calculations (for debugging)
window.testCashbackCalculation = function(amount) {
    const cashback = Math.round((amount * 7) / 100);
    console.log(`Order Amount: ₹${amount} → Cashback: ₹${cashback} (7%)`);
    console.log(`Examples:`);
    console.log(`₹100 → ₹${Math.round((100 * 7) / 100)}`);
    console.log(`₹500 → ₹${Math.round((500 * 7) / 100)}`);
    console.log(`₹1000 → ₹${Math.round((1000 * 7) / 100)}`);
    console.log(`₹1500 → ₹${Math.round((1500 * 7) / 100)}`);
    return cashback;
};

// Test cashback flow (for debugging)
window.testCashbackFlow = async function() {
    if (!currentUser) {
        console.log('❌ Please login first');
        return;
    }
    
    console.log('🧪 Testing Cashback Flow:');
    console.log('1. Order placement → Cashback added to pending');
    console.log('2. Collect button → Only animation, no duplicate addition');
    console.log('3. Check wallet → Should show correct pending amount');
    
    const userRef = doc(db, 'users', currentUser.uid);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
        const data = userDoc.data();
        console.log('✅ Current Pending Cashback:', data.pendingCashback || 0);
        console.log('✅ Current Earned Cashback:', data.earnedCashback || 0);
        console.log('❌ Old Wallet Balance (should be ignored):', data.walletBalance || 0);
    }
};

// Test Firebase field usage (for debugging)
window.testFirebaseFields = async function() {
    if (!currentUser) {
        console.log('❌ Please login first');
        return;
    }
    
    console.log('🔍 Checking Firebase Field Usage:');
    console.log('✅ pendingCashback - Used for pending rewards');
    console.log('✅ earnedCashback - Used for available wallet balance');
    console.log('❌ walletBalance - Old field, should not be used');
    
    const userRef = doc(db, 'users', currentUser.uid);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
        const data = userDoc.data();
        console.log('\n📊 Current Values:');
        console.log('pendingCashback:', data.pendingCashback || 0);
        console.log('earnedCashback:', data.earnedCashback || 0);
        if (data.walletBalance) {
            console.log('⚠️ walletBalance (old):', data.walletBalance);
        }
    }
};

// Test cashback transfer manually (for debugging)
window.testCashbackTransfer = async function(amount = 35) {
    if (!currentUser) {
        console.log('❌ Please login first');
        return;
    }
    
    console.log(`🧪 Testing Cashback Transfer: ₹${amount}`);
    console.log('Before transfer:');
    await testFirebaseFields();
    
    console.log('\n🔄 Transferring cashback...');
    await completeCashbackForOrder('test-order-id', amount);
    
    console.log('\nAfter transfer:');
    await testFirebaseFields();
};

// Test admin completing order (should not affect admin's cashback)
window.testAdminComplete = async function() {
    console.log('🔧 Testing Admin Complete Order:');
    console.log('✅ Admin completes order → Customer gets cashback (not admin)');
    console.log('✅ Admin rejects order → Customer loses pending cashback (not admin)');
    console.log('✅ Functions now use customer userId from order data');
    console.log('\n📋 Usage:');
    console.log('- completeCashbackForOrder(orderId, amount, customerUserId)');
    console.log('- cancelCashbackForOrder(orderId, amount, customerUserId)');
};

// Global variables for wallet application
let appliedWalletAmount = 0;
let originalOrderAmount = 0;

// Apply wallet balance to order
window.applyWalletBalance = async function(orderAmount) {
    if (!currentUser) {
        showNotification('Please login to use wallet', 'error');
        return;
    }

    try {
        // Get current earned cashback (available to use)
        const userRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userRef);
        const earnedCashback = userDoc.exists() ? (userDoc.data().earnedCashback || 0) : 0;

        if (earnedCashback <= 0) {
            showNotification('No earned cashback available to use', 'warning');
            return;
        }

        // Calculate amount to apply (with proper rounding)
        const amountToApply = Math.round(Math.min(earnedCashback, orderAmount) * 100) / 100;
        appliedWalletAmount = amountToApply;
        originalOrderAmount = orderAmount;

        // Calculate actual final total after sequential wallet distribution
        let simulatedRemainingWallet = amountToApply;
        let actualFinalTotal = 0;
        
        // Get cart items for simulation
        const cartItems = JSON.parse(localStorage.getItem('cart')) || [];
        
        if (cartItems.length > 0) {
            // Simulate sequential wallet application to get actual total
            cartItems.forEach((item, index) => {
                const product = productsData.find(p => p.id === item.id);
                const deliveryCharge = product ? (product.deliveryCharge || 0) : 0;
                const itemSubtotal = Math.round((item.price * item.quantity) * 100) / 100;
                const itemTotal = Math.round((itemSubtotal + deliveryCharge) * 100) / 100;
                
                let itemWalletAmount = 0;
                if (simulatedRemainingWallet > 0) {
                    itemWalletAmount = Math.round(Math.min(simulatedRemainingWallet, itemTotal) * 100) / 100;
                    simulatedRemainingWallet = Math.round((simulatedRemainingWallet - itemWalletAmount) * 100) / 100;
                    
                    console.log(`Simulation - Item ${index + 1}: Total ₹${itemTotal}, Wallet applied ₹${itemWalletAmount}, Remaining wallet ₹${simulatedRemainingWallet}`);
                }
                
                const finalItemAmount = Math.round(Math.max(0, itemTotal - itemWalletAmount) * 100) / 100;
                actualFinalTotal += finalItemAmount;
                
                console.log(`Simulation - Item ${index + 1} final amount: ₹${finalItemAmount}`);
            });
            
            actualFinalTotal = Math.round(actualFinalTotal * 100) / 100;
        } else {
            // Single item case
            actualFinalTotal = Math.round((orderAmount - amountToApply) * 100) / 100;
        }
        
        // Update UI with actual calculated total
        updateOrderTotalDisplay();
        showWalletAppliedInfo(amountToApply);
        
        console.log(`Wallet applied: ₹${amountToApply}, Actual final total: ₹${actualFinalTotal}`);

        showNotification(`₹${amountToApply} wallet balance applied!`, 'success');

    } catch (error) {
        console.error('Error applying wallet:', error);
        showNotification('Error applying wallet balance', 'error');
    }
};

// Remove applied wallet balance
window.removeWalletBalance = function() {
    if (appliedWalletAmount > 0) {
        const removedAmount = appliedWalletAmount;
        appliedWalletAmount = 0;
        updateOrderTotalDisplay();
        hideWalletAppliedInfo();
        showNotification(`₹${removedAmount} wallet balance removed`, 'info');
    }
};

// Update order total display after wallet apply/remove
function updateOrderTotalDisplay() {
    const finalTotalElement = document.getElementById('finalTotalAmount');
    const confirmButton = document.querySelector('.btn-order');
    const confirmAllBtn = document.getElementById('confirmAllOrdersBtn');
    
    if (finalTotalElement) {
        let finalAmount;
        
        if (appliedWalletAmount > 0) {
            // Calculate actual final amount using sequential wallet distribution
            let simulatedRemainingWallet = appliedWalletAmount;
            let actualFinalTotal = 0;
            
            const cartItems = JSON.parse(localStorage.getItem('cart')) || [];
            
            if (cartItems.length > 0) {
                // Multi-item case: simulate sequential distribution
                cartItems.forEach(item => {
                    const product = productsData.find(p => p.id === item.id);
                    const deliveryCharge = product ? (product.deliveryCharge || 0) : 0;
                    const itemSubtotal = Math.round((item.price * item.quantity) * 100) / 100;
                    const itemTotal = Math.round((itemSubtotal + deliveryCharge) * 100) / 100;
                    
                    let itemWalletAmount = 0;
                    if (simulatedRemainingWallet > 0) {
                        itemWalletAmount = Math.round(Math.min(simulatedRemainingWallet, itemTotal) * 100) / 100;
                        simulatedRemainingWallet = Math.round((simulatedRemainingWallet - itemWalletAmount) * 100) / 100;
                    }
                    
                    const finalItemAmount = Math.round(Math.max(0, itemTotal - itemWalletAmount) * 100) / 100;
                    actualFinalTotal += finalItemAmount;
                });
                
                finalAmount = Math.round(actualFinalTotal * 100) / 100;
            } else {
                // Single item case
                finalAmount = Math.round((originalOrderAmount - appliedWalletAmount) * 100) / 100;
            }
        } else {
            finalAmount = originalOrderAmount;
        }
            
        finalTotalElement.innerHTML = finalAmount === 0 ? 
            '<span style="color: #27ae60; font-weight: 700;">Total: FREE! 🎉</span>' : 
            `Total: ₹${Math.round(finalAmount * 100) / 100}`;
            
        // Hide/Show payment methods based on final amount
        const onlinePaymentOption = document.getElementById('onlinePaymentOption');
        const codPaymentOption = document.getElementById('codPaymentOption');
        const onlinePaymentOptionCart = document.getElementById('onlinePaymentOptionCart');
        const codPaymentOptionCart = document.getElementById('codPaymentOptionCart');
        
        // Handle single product modal payment options
        if (onlinePaymentOption) {
            if (finalAmount === 0) {
                // Hide Pay Online option when amount is zero
                onlinePaymentOption.style.display = 'none';
                // Auto-select COD when online payment is hidden
                const codOption = document.querySelector('input[name="paymentMethod"][value="cod"]');
                if (codOption && codPaymentOption) {
                    codOption.checked = true;
                    // Trigger the selection styling
                    selectPaymentMethod('cod', codPaymentOption);
                }
            } else {
                // Show Pay Online option when amount is greater than zero
                onlinePaymentOption.style.display = 'flex';
            }
        }
        
        // Handle cart modal payment options
        if (onlinePaymentOptionCart) {
            if (finalAmount === 0) {
                // Hide Pay Online option when amount is zero
                onlinePaymentOptionCart.style.display = 'none';
                // Auto-select COD when online payment is hidden
                const codOptionCart = document.querySelector('#codPaymentOptionCart input[name="paymentMethod"][value="cod"]');
                if (codOptionCart && codPaymentOptionCart) {
                    codOptionCart.checked = true;
                    // Trigger the selection styling
                    selectPaymentMethod('cod', codPaymentOptionCart);
                }
            } else {
                // Show Pay Online option when amount is greater than zero
                onlinePaymentOptionCart.style.display = 'flex';
            }
        }
    }
    
    // Update confirm button amount
    if (confirmButton) {
        let finalAmount;
        
        if (appliedWalletAmount > 0) {
            const cartItems = JSON.parse(localStorage.getItem('cart')) || [];
            if (cartItems.length > 0) {
                // Calculate actual final amount for multi-item case
                let simulatedRemainingWallet = appliedWalletAmount;
                let actualFinalTotal = 0;
                
                cartItems.forEach(item => {
                    const product = productsData.find(p => p.id === item.id);
                    const deliveryCharge = product ? (product.deliveryCharge || 0) : 0;
                    const itemSubtotal = Math.round((item.price * item.quantity) * 100) / 100;
                    const itemTotal = Math.round((itemSubtotal + deliveryCharge) * 100) / 100;
                    
                    let itemWalletAmount = 0;
                    if (simulatedRemainingWallet > 0) {
                        itemWalletAmount = Math.round(Math.min(simulatedRemainingWallet, itemTotal) * 100) / 100;
                        simulatedRemainingWallet = Math.round((simulatedRemainingWallet - itemWalletAmount) * 100) / 100;
                    }
                    
                    const finalItemAmount = Math.round(Math.max(0, itemTotal - itemWalletAmount) * 100) / 100;
                    actualFinalTotal += finalItemAmount;
                });
                
                finalAmount = Math.round(actualFinalTotal * 100) / 100;
            } else {
                finalAmount = Math.round((originalOrderAmount - appliedWalletAmount) * 100) / 100;
            }
        } else {
            finalAmount = originalOrderAmount;
        }
            
        const buttonText = finalAmount === 0 ? 
            'Confirm Order - FREE! 🎉' : 
            'Confirm Order';
        confirmButton.innerHTML = buttonText;
    }
    
    // Update confirm all orders button amount (for cart checkout)
    if (confirmAllBtn) {
        let finalAmount;
        
        if (appliedWalletAmount > 0) {
            const cartItems = JSON.parse(localStorage.getItem('cart')) || [];
            if (cartItems.length > 0) {
                // Calculate actual final amount for multi-item case
                let simulatedRemainingWallet = appliedWalletAmount;
                let actualFinalTotal = 0;
                
                cartItems.forEach(item => {
                    const product = productsData.find(p => p.id === item.id);
                    const deliveryCharge = product ? (product.deliveryCharge || 0) : 0;
                    const itemSubtotal = Math.round((item.price * item.quantity) * 100) / 100;
                    const itemTotal = Math.round((itemSubtotal + deliveryCharge) * 100) / 100;
                    
                    let itemWalletAmount = 0;
                    if (simulatedRemainingWallet > 0) {
                        itemWalletAmount = Math.round(Math.min(simulatedRemainingWallet, itemTotal) * 100) / 100;
                        simulatedRemainingWallet = Math.round((simulatedRemainingWallet - itemWalletAmount) * 100) / 100;
                    }
                    
                    const finalItemAmount = Math.round(Math.max(0, itemTotal - itemWalletAmount) * 100) / 100;
                    actualFinalTotal += finalItemAmount;
                });
                
                finalAmount = Math.round(actualFinalTotal * 100) / 100;
            } else {
                finalAmount = Math.round((originalOrderAmount - appliedWalletAmount) * 100) / 100;
            }
        } else {
            finalAmount = originalOrderAmount;
        }
            
        const buttonText = finalAmount === 0 ? 
            'Confirm All Orders - FREE! 🎉' : 
            'Confirm All Orders';
        confirmAllBtn.innerHTML = buttonText;
    }
}

function showWalletAppliedInfo(amount) {
    const appliedInfo = document.getElementById('walletAppliedInfo');
    const appliedAmountSpan = document.getElementById('appliedWalletAmount');
    const applyBtn = document.getElementById('applyWalletBtn');
    
    if (appliedInfo && appliedAmountSpan && applyBtn) {
        const roundedAmount = Math.round(amount * 100) / 100;
        appliedAmountSpan.textContent = `₹${roundedAmount}`;
        appliedInfo.style.display = 'block';
        applyBtn.style.display = 'none';
    }
}

// Hide wallet applied info
function hideWalletAppliedInfo() {
    const appliedInfo = document.getElementById('walletAppliedInfo');
    const applyBtn = document.getElementById('applyWalletBtn');
    
    if (appliedInfo && applyBtn) {
        appliedInfo.style.display = 'none';
        applyBtn.style.display = 'block';
    }
}

// Load and display earned cashback balance in modal
async function loadWalletBalanceInModal() {
    if (!currentUser) return;
    
    try {
        const userRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userRef);
        const earnedCashback = userDoc.exists() ? (userDoc.data().earnedCashback || 0) : 0;
        
        const balanceElement = document.getElementById('availableWalletBalance');
        if (balanceElement) {
            const roundedEarned = Math.round(earnedCashback * 100) / 100;
            balanceElement.textContent = `₹${roundedEarned}`;
        }
        
        console.log('Available earned cashback for wallet use:', earnedCashback);
    } catch (error) {
        console.error('Error loading earned cashback balance:', error);
    }
}

// Get wallet section HTML template
function getWalletSectionHTML(totalAmount) {
    return `
        <!-- Cashback Wallet Section -->
        <div id="cashbackWalletSection" style="margin-bottom: 20px; padding: 15px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; color: white;">
            <h4 style="margin: 0 0 15px 0; color: white; display: flex; align-items: center; gap: 8px;">
                💰 Apply Cashback Wallet
            </h4>
            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
                <div style="flex: 1;">
                    <div style="font-size: 14px; margin-bottom: 5px;">Available Balance: <span id="availableWalletBalance">₹0</span></div>
                    <div style="font-size: 10px; opacity: 0.9;">Apply wallet balance to reduce order amount</div>
                </div>
                <button id="applyWalletBtn" onclick="applyWalletBalance(${totalAmount})" 
                        style="background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3); padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 10px; transition: all 0.3s ease;"
                        onmouseover="this.style.background='rgba(255,255,255,0.3)'"
                        onmouseout="this.style.background='rgba(255,255,255,0.2)'">
                    Apply Wallet
                </button>
            </div>
            <div id="walletAppliedInfo" style="display: none; background: rgba(255,255,255,0.1); padding: 10px; border-radius: 6px; font-size: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span>💳 Wallet Applied: <span id="appliedWalletAmount">₹0</span></span>
                    <button onclick="removeWalletBalance()" style="background: none; border: none; color: white; cursor: pointer; font-size: 16px;">✕</button>
                </div>
            </div>
        </div>
    `;
}

// Start celebration crystals falling animation
function startCelebrationCrystals() {
    const crystals = ['💎', '✨', '⭐', '🌟', '💫', '🔮'];
    
    for (let i = 0; i < 20; i++) {
        setTimeout(() => {
            const crystal = document.createElement('div');
            crystal.textContent = crystals[Math.floor(Math.random() * crystals.length)];
            crystal.style.cssText = `
                position: fixed;
                top: -50px;
                left: ${Math.random() * 100}vw;
                font-size: 24px;
                z-index: 25000;
                pointer-events: none;
                animation: crystalFall 3s linear forwards;
            `;
            document.body.appendChild(crystal);
            
            setTimeout(() => crystal.remove(), 3000);
        }, i * 150);
    }
}

// Start flying stars animation to profile
function startFlyingStarsAnimation() {
    const profileBtn = document.getElementById('profileBtn');
    if (!profileBtn) return;
    
    const profileRect = profileBtn.getBoundingClientRect();
    const collectBtn = document.getElementById('collectCashbackBtn');
    const collectRect = collectBtn.getBoundingClientRect();
    
    const targetX = profileRect.left + profileRect.width/2 - collectRect.left - collectRect.width/2;
    const targetY = profileRect.top + profileRect.height/2 - collectRect.top - collectRect.height/2;
    
    for (let i = 0; i < 8; i++) {
        setTimeout(() => {
            const star = document.createElement('div');
            star.textContent = '⭐';
            star.style.cssText = `
                position: fixed;
                left: ${collectRect.left + collectRect.width/2}px;
                top: ${collectRect.top + collectRect.height/2}px;
                font-size: 20px;
                z-index: 25000;
                pointer-events: none;
                --target-x: ${targetX}px;
                --target-y: ${targetY}px;
                animation: starFlyToProfile 1.5s ease-out forwards;
            `;
            document.body.appendChild(star);
            
            setTimeout(() => star.remove(), 1500);
        }, i * 100);
    }
}

window.closeUserLocationModal = function() {
    closeUserLocationModalInternal();
};

window.closeCartModal = function() {
    const cartModal = document.getElementById('cartModal');
    if (cartModal) {
        closeCartModalInternal();
    }
};

window.closeLocationModal = function() {
    closeLocationModalInternal();
};

window.closeLoginModal = function() {
    closeLoginModalInternal();
};

window.printInvoice = function() {
    const printContent = document.getElementById('invoiceContent').innerHTML;
    const originalContent = document.body.innerHTML;
    
    document.body.innerHTML = `
        <div style="padding: 20px; font-family: Arial, sans-serif;">
            ${printContent}
        </div>
    `;
    
    window.print();
    location.reload();
};

function generateInvoiceHTML(order) {
    // Fix date handling - use current date if timestamp is invalid
    let orderDate;
    try {
        if (order.timestamp) {
            orderDate = new Date(order.timestamp).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } else {
            orderDate = new Date().toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    } catch (error) {
        orderDate = new Date().toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    let itemsHTML = '';
    let totalAmount = 0;
    
    // Handle different order data structures
    const orderItems = order.items || order.products || [];
    
    if (orderItems.length === 0) {
        // If no items array, try to create from single product data
        if (order.productName || order.name) {
            const singleItem = {
                name: order.productName || order.name || 'Product',
                price: order.productPrice || order.price || order.totalAmount || 0,
                quantity: order.quantity || 1,
                image: order.productImage || order.image || null,
                productSize: order.productSize || null
            };
            orderItems.push(singleItem);
        }
    }
    
    orderItems.forEach(item => {
        const itemPrice = item.price || item.productPrice || 0; // This is the discounted price
        const itemQuantity = item.quantity || 1;
        const itemTotal = itemPrice * itemQuantity; // Total with discounted price
        totalAmount += itemTotal;
        
        // Get product data to get original price and discount
        const productData = productsData.find(p => p.id === (item.productId || item.id));
        const originalPrice = (item.originalPrice || (productData ? productData.originalPrice : null) || (productData ? productData.price : itemPrice));
        const discount = (item.discount || (productData ? productData.discount : 0));
        const rating = productData ? productData.rating : 0;
        
        // Handle product image with better fallback
        let productImageHTML = '';
        const productImage = item.image || item.productImage;
        
        if (productImage && productImage !== 'null' && productImage !== '') {
            productImageHTML = `<img src="${productImage}" alt="Product" style="width: 30px; height: 30px; border-radius: 4px; object-fit: cover; margin-right: 8px;" onerror="this.style.display='none'">`;
        }
        
        // Create price display with discount information
        let priceDisplay = '';
        if (originalPrice > itemPrice && discount > 0) {
            priceDisplay = `
                <div style="text-align: center;">
                    <div style="font-size: 10px; color: #999; margin-bottom: 1px;">Cut Price</div>
                    <div style="color: #999; font-size: 11px; text-decoration: line-through; margin-bottom: 2px;">₹${originalPrice}</div>
                    <div style="font-size: 11px; color: #27ae60; font-weight: 600; margin-bottom: 1px;">Special Price</div>
                    <div style="color: #27ae60; font-weight: 700;">₹${itemPrice}</div>
                    <div style="background: #27ae60; color: white; padding: 2px 4px; border-radius: 3px; font-size: 10px; display: inline-block; margin-top: 2px;">${discount}% off</div>
                </div>
            `;
        } else {
            priceDisplay = `₹${itemPrice}`;
        }
        
        itemsHTML += `
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: left; font-size: 13px;">
                    <div style="display: flex; align-items: center;">
                        ${productImageHTML}
                        <div>
                            <div>${item.name || item.productName || 'Product'}</div>
                            ${rating > 0 ? `<div style="color: #fbbf24; font-size: 11px; margin: 1px 0;">${'⭐'.repeat(rating)} (${rating})</div>` : ''}
                            ${item.productSize ? `<div style="color: #666; font-size: 11px;">Size: ${item.productSize}</div>` : ''}
                            ${originalPrice > itemPrice && discount > 0 ? `<div style="color: #27ae60; font-size: 10px; font-weight: 600;">💰 Saved: ₹${(originalPrice - itemPrice) * itemQuantity}</div>` : ''}
                        </div>
                    </div>
                </td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center; font-size: 13px;">₹${itemPrice}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center; font-size: 13px;">${itemQuantity}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; font-weight: 600; font-size: 13px; color: #27ae60;">₹${itemTotal}</td>
            </tr>
        `;
    });
    
    // Fallback to order total if items calculation fails
    if (totalAmount === 0 && order.totalAmount) {
        totalAmount = order.totalAmount;
    }
    
    // Use the same delivery charge field as shown in order card
    let deliveryCharges = 'FREE';
    let deliveryAmount = 0;
    
    // Delivery charge should be applied once per order, not per quantity
    if (order.deliveryCharge && order.deliveryCharge !== 'FREE' && order.deliveryCharge !== 0) {
        deliveryAmount = parseFloat(order.deliveryCharge);
        deliveryCharges = deliveryAmount;
    }
    
    // Calculate total discount and original amount
    let totalDiscount = 0;
    let originalTotal = 0;
    
    orderItems.forEach(item => {
        const itemPrice = item.price || item.productPrice || 0;
        const itemQuantity = item.quantity || 1;
        
        // Try to get product data from the order first, then from productsData
        let productData = null;
        let originalPrice = itemPrice;
        let discount = 0;
        
        // Check if order has the product data stored
        if (order.productId) {
            productData = productsData.find(p => p.id === order.productId);
        } else if (item.productId || item.id) {
            productData = productsData.find(p => p.id === (item.productId || item.id));
        }
        
        // Get original price and discount from multiple sources
        if (order.originalPrice && order.discount) {
            // From order data directly
            originalPrice = order.originalPrice;
            discount = order.discount;
        } else if (item.originalPrice && item.discount) {
            // From item data
            originalPrice = item.originalPrice;
            discount = item.discount;
        } else if (productData && productData.originalPrice && productData.discount) {
            // From product data
            originalPrice = productData.originalPrice;
            discount = productData.discount;
        } else if (productData && productData.price && productData.discount) {
            // Fallback to product price as original
            originalPrice = productData.price;
            discount = productData.discount;
        }
        
        if (originalPrice > itemPrice && discount > 0) {
            totalDiscount += (originalPrice - itemPrice) * itemQuantity;
            originalTotal += originalPrice * itemQuantity;
        } else {
            originalTotal += itemPrice * itemQuantity;
        }
    });
    
    // Calculate wallet deduction and final total
    const walletUsed = order.walletUsed || 0;
    const originalOrderAmount = order.originalAmount || (totalAmount + deliveryAmount);
    const finalTotal = (totalAmount + deliveryAmount) - walletUsed;
    
    return `
        <div style="background: white; padding: 20px; max-width: 600px; margin: 0 auto;">
            <!-- Header with Logo -->
            <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #3498db; padding-bottom: 15px;">
                <img src="logo.png" alt="Ficokart Logo" style="height: 50px; width: auto; margin-bottom: 10px;" onerror="this.style.display='none'">
                <h1 style="color: #2c3e50; margin: 0; font-size: 24px; font-weight: 700;">INVOICE BILL</h1>
                <p style="color: #7f8c8d; margin: 5px 0 0 0; font-size: 14px;">Ficokart E-commerce</p>
            </div>
            
            <!-- Invoice Details -->
            <div style="display: flex; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap;">
                <div style="flex: 1; width: 90vw;">
                    <h3 style="color: #2c3e50; margin: 0 0 8px 0; font-size: 16px;">Invoice Details</h3>
                    <p style="margin: 3px 0; color: #555; font-size: 13px;"><strong>Invoice #:</strong> INV-${order.id.substring(0, 8).toUpperCase()}</p>
                    <p style="margin: 3px 0; color: #555; font-size: 13px;"><strong>Order ID:</strong> ${order.id}</p>
                    <p style="margin: 3px 0; color: #555; font-size: 13px;"><strong>Date:</strong> ${orderDate}</p>
                </div>
                
                <div style="flex: 1; width: 90vw; text-align: right;">
                    <h3 style="color: #2c3e50; margin: 0 0 8px 0; font-size: 16px;">Customer Details</h3>
                    <p style="margin: 3px 0; color: #555; font-size: 13px;"><strong>Name:</strong> ${order.userName || 'N/A'}</p>
                    <p style="margin: 3px 0; color: #555; font-size: 13px;"><strong>Email:</strong> ${order.userEmail || 'N/A'}</p>
                    <p style="margin: 3px 0; color: #555; font-size: 13px;"><strong>Phone:</strong> ${order.userPhone || 'N/A'}</p>
                    <p style="margin: 3px 0; color: #555; font-size: 13px;"><strong>Address:</strong> ${order.userAddress || 'N/A'}</p>
                    <p style="margin: 3px 0; color: #555; font-size: 13px;"><strong>Payment:</strong> ${(() => {
                        const method = order.paymentMethod || 'Not specified';
                        if (method === 'cod') return 'Cash on Delivery (COD)';
                        if (method === 'online') return 'Online Payment';
                        return method;
                    })()}</p>
                </div>
            </div>
            
            <!-- Items Table -->
            <div style="margin-bottom: 20px;">
                <h3 style="color: #2c3e50; margin: 0 0 10px 0; font-size: 16px;">Order Items</h3>
                <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd; border-radius: 6px; overflow: hidden;">
                    <thead>
                        <tr style="background: #f8f9fa;">
                            <th style="padding: 10px; text-align: left; color: #2c3e50; font-weight: 600; border-bottom: 1px solid #ddd; font-size: 13px;">Item</th>
                            <th style="padding: 10px; text-align: center; color: #2c3e50; font-weight: 600; border-bottom: 1px solid #ddd; font-size: 13px;">Price</th>
                            <th style="padding: 10px; text-align: center; color: #2c3e50; font-weight: 600; border-bottom: 1px solid #ddd; font-size: 13px;">Qty</th>
                            <th style="padding: 10px; text-align: right; color: #2c3e50; font-weight: 600; border-bottom: 1px solid #ddd; font-size: 13px;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHTML}
                    </tbody>
                </table>
            </div>
            
            <!-- Total Section -->
            <div style="text-align: right; margin-bottom: 20px;">
                <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; display: inline-block; width: 90vw;">
                    ${totalDiscount > 0 ? `
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span style="color: #555; font-size: 13px;">Original Total:</span>
                            <span style="font-weight: 600; color: #999; font-size: 13px; text-decoration: line-through;">₹${originalTotal + deliveryAmount}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span style="color: #27ae60; font-size: 13px;">Discount:</span>
                            <span style="font-weight: 600; color: #27ae60; font-size: 13px;">-₹${totalDiscount}</span>
                        </div>
                    ` : ''}
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="color: #555; font-size: 13px;">Subtotal:</span>
                        <span style="font-weight: 600; color: #2c3e50; font-size: 13px;">₹${totalAmount}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="color: #555; font-size: 13px;">Delivery Charges:</span>
                        <span style="font-weight: 600; color: #27ae60; font-size: 13px;">${deliveryCharges === 'FREE' ? 'FREE' : '₹' + deliveryCharges}</span>
                    </div>
                    ${totalDiscount > 0 ? `
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #27ae60;">
                            <span style="font-size: 10px; font-weight: 600;">💰 You Saved:</span>
                            <span style="font-size: 10px; font-weight: 600;">₹${totalDiscount}</span>
                        </div>
                    ` : ''}
                    ${walletUsed > 0 ? `
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span style="color: #555; font-size: 13px;">Subtotal:</span>
                            <span style="font-weight: 600; color: #555; font-size: 13px;">₹${totalAmount + deliveryAmount}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #8e44ad;">
                            <span style="font-size: 13px; font-weight: 600;">💰 Wallet Applied:</span>
                            <span style="font-size: 13px; font-weight: 600;">-₹${walletUsed}</span>
                        </div>
                    ` : ''}
                    <div style="display: flex; justify-content: space-between; padding-top: 8px; border-top: 1px solid #3498db;">
                        <span style="font-size: 10px; font-weight: 700; color: #2c3e50;">Grand Total:</span>
                        <span style="font-size: 10px; font-weight: 700; color: #27ae60;">₹${finalTotal}</span>
                    </div>
                </div>
            </div>
            
            <!-- Footer -->
            <div style="text-align: center; padding-top: 15px; border-top: 1px solid #ecf0f1; color: #7f8c8d;">
                <p style="margin: 3px 0; font-size: 10px;">Thank you for shopping with Ficokart!</p>
                <p style="margin: 3px 0; font-size: 11px;">For any queries, contact us at support@ficokart.com</p>
                <p style="margin: 10px 0 0 0; font-size: 9px; color: #bdc3c7;">This is a computer generated invoice and does not require signature.</p>
            </div>
        </div>
    `;
}

// Location Auto-fill Functions
let currentLocationData = {
    latitude: null,
    longitude: null,
    address: '',
    googleMapsLink: ''
};

// Get current location using geolocation API
window.getCurrentLocation = async function() {
    const getLocationBtn = document.getElementById('getLocationBtn');
    const locationStatus = document.getElementById('locationStatus');
    const autoFilledAddress = document.getElementById('autoFilledAddress');
    const googleMapsLinkContainer = document.getElementById('googleMapsLinkContainer');

    // Check if geolocation is supported
    if (!navigator.geolocation) {
        alert('Geolocation is not supported by this browser.');
        return;
    }

    // Update button state
    getLocationBtn.disabled = true;
    getLocationBtn.innerHTML = '📍 Getting Location...';
    locationStatus.textContent = 'Requesting location permission...';
    locationStatus.style.color = '#f59e0b';

    try {
        // Get current position
        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            });
        });

        const { latitude, longitude } = position.coords;
        currentLocationData.latitude = latitude;
        currentLocationData.longitude = longitude;

        locationStatus.textContent = 'Location found! Fetching address...';
        locationStatus.style.color = '#28a745';

        // Fetch address using Nominatim API
        await fetchAddressFromCoordinates(latitude, longitude);

    } catch (error) {
        console.error('Geolocation error:', error);
        let errorMessage = 'Failed to get location. ';
        
        switch(error.code) {
            case error.PERMISSION_DENIED:
                errorMessage += 'Location access denied by user.';
                break;
            case error.POSITION_UNAVAILABLE:
                errorMessage += 'Location information unavailable.';
                break;
            case error.TIMEOUT:
                errorMessage += 'Location request timed out.';
                break;
            default:
                errorMessage += 'Unknown error occurred.';
                break;
        }
        
        alert(errorMessage);
        locationStatus.textContent = 'Location access failed';
        locationStatus.style.color = '#e74c3c';
    } finally {
        // Reset button state
        getLocationBtn.disabled = false;
        getLocationBtn.innerHTML = '📍 Get Location';
    }
};

// Fetch address from coordinates using Nominatim API
async function fetchAddressFromCoordinates(latitude, longitude) {
    const locationStatus = document.getElementById('locationStatus');
    const autoFilledAddress = document.getElementById('autoFilledAddress');
    const googleMapsLinkContainer = document.getElementById('googleMapsLinkContainer');

    try {
        const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1&email=ficokart@example.com`;
        
        const response = await fetch(nominatimUrl, {
            headers: {
                'User-Agent': 'Ficokart E-commerce App'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data && data.display_name) {
            // Format the address
            const address = data.display_name;
            currentLocationData.address = address;
            
            // Generate Google Maps link
            const googleMapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
            currentLocationData.googleMapsLink = googleMapsLink;

            // Display the address
            autoFilledAddress.value = address;
            autoFilledAddress.style.display = 'block';
            
            // Show Google Maps button
            googleMapsLinkContainer.style.display = 'block';
            
            // Update status
            locationStatus.textContent = 'Address found successfully!';
            locationStatus.style.color = '#28a745';

            // Auto-fill the main address field if it's empty
            const userAddressField = document.getElementById('userAddress');
            if (userAddressField && !userAddressField.value.trim()) {
                userAddressField.value = address;
            }

            // Auto-fill Google Maps link field (always update with current location)
            const googleMapsLinkField = document.getElementById('userGoogleMapsLink');
            if (googleMapsLinkField) {
                googleMapsLinkField.value = googleMapsLink;
                // Trigger input event to ensure any validation is updated
                googleMapsLinkField.dispatchEvent(new Event('input', { bubbles: true }));
                
                // Update status to show link was set
                locationStatus.textContent = 'Google Maps link auto-filled successfully!';
                locationStatus.style.color = '#28a745';
            }

            // Try to extract city, state, pincode from the address data
            if (data.address) {
                const addressComponents = data.address;
                
                // Auto-fill city
                const cityField = document.getElementById('userCity');
                if (cityField && !cityField.value && (addressComponents.city || addressComponents.town || addressComponents.village)) {
                    const cityValue = addressComponents.city || addressComponents.town || addressComponents.village;
                    // Check if city option exists in dropdown
                    const cityOption = Array.from(cityField.options).find(option => 
                        option.text.toLowerCase().includes(cityValue.toLowerCase())
                    );
                    if (cityOption) {
                        cityField.value = cityOption.value;
                    }
                }

                // Auto-fill state
                const stateField = document.getElementById('userState');
                if (stateField && !stateField.value && addressComponents.state) {
                    // Check if state option exists in dropdown
                    const stateOption = Array.from(stateField.options).find(option => 
                        option.text.toLowerCase().includes(addressComponents.state.toLowerCase())
                    );
                    if (stateOption) {
                        stateField.value = stateOption.value;
                    }
                }

                // Auto-fill pincode
                const pincodeField = document.getElementById('userPincode');
                if (pincodeField && !pincodeField.value && addressComponents.postcode) {
                    pincodeField.value = addressComponents.postcode;
                }
            }

        } else {
            throw new Error('No address found for the given coordinates');
        }

    } catch (error) {
        console.error('Address fetch error:', error);
        alert('Failed to fetch address from location. Please try again or enter address manually.');
        locationStatus.textContent = 'Address fetch failed';
        locationStatus.style.color = '#e74c3c';
    }
}

// Open Google Maps with current location
window.openGoogleMapsLocation = function() {
    if (currentLocationData.googleMapsLink) {
        window.open(currentLocationData.googleMapsLink, '_blank');
    } else {
        alert('No location data available. Please get your location first.');
    }
};

// Address Management System
let addressMap = null;
let savedAddressesList = [];
let currentMapCenter = { lat: 28.6139, lng: 77.2090 }; // Default: Delhi

// Open Address Map Modal
window.openAddressMapModal = function() {
    // Close address popup if it's open
    closeAddressPopup();
    
    // Clear address name input and hide container
    const addressNameInput = document.getElementById('addressNameInput');
    const addressNameContainer = document.getElementById('addressNameContainer');
    if (addressNameInput) addressNameInput.value = '';
    if (addressNameContainer) addressNameContainer.style.display = 'none';
    
    // Add to navigation stack
    pushToNavigationStack('address-map-modal');
    
    const modal = document.getElementById('addressMapModal');
    modal.classList.add('active');
    
    // Initialize map after modal is visible
    setTimeout(() => {
        initializeAddressMap();
        // Load initial address preview
        setTimeout(() => {
            updateLiveAddressPreview(currentMapCenter.lat, currentMapCenter.lng);
        }, 1000);
    }, 100);
};

// Close Address Map Modal
window.closeAddressMapModal = function() {
    // Stop live tracking if active
    if (window.isLiveTracking) {
        stopLiveTracking();
    }
    
    // Clear address name input
    const addressNameInput = document.getElementById('addressNameInput');
    const addressNameContainer = document.getElementById('addressNameContainer');
    if (addressNameInput) addressNameInput.value = '';
    if (addressNameContainer) addressNameContainer.style.display = 'none';
    
    // Remove from navigation stack
    popFromNavigationStack();
    
    const modal = document.getElementById('addressMapModal');
    modal.classList.remove('active');
    
    // Destroy map to prevent memory leaks
    if (addressMap) {
        addressMap.remove();
        addressMap = null;
    }
};

// Initialize Leaflet Map with Satellite View
function initializeAddressMap() {
    if (addressMap) {
        addressMap.remove();
    }

    // Create map centered on Delhi with zoom level up to 20
    addressMap = L.map('addressMap', {
        maxZoom: 20, // Maximum zoom level 20
        minZoom: 2
    }).setView([currentMapCenter.lat, currentMapCenter.lng], 13);

    // Define different tile layers
    const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 20
    });

    const hybridLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
        attribution: '© Google',
        maxZoom: 20,
        errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        crossOrigin: true
    });

    // Add street labels overlay for hybrid view
    const labelsLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
        attribution: '',
        maxZoom: 20
    });

    // Add default street layer
    streetLayer.addTo(addressMap);

    // No need for red dot marker - using only center pin (📍) for location selection

    // Create layer control
    const baseLayers = {
        "🗺️ Street": streetLayer,
        "🌍 Hybrid": L.layerGroup([hybridLayer, labelsLayer])
    };

    // Add layer control to map
    L.control.layers(baseLayers, null, {
        position: 'topright',
        collapsed: false
    }).addTo(addressMap);

    // Add custom map type buttons at bottom left
    const mapTypeControl = L.control({ position: 'bottomleft' });
    mapTypeControl.onAdd = function() {
        const div = L.DomUtil.create('div', 'map-type-control');
        div.innerHTML = `
            <div style="background: rgba(255, 255, 255, 0.95); border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); padding: 10px; display: flex; flex-direction: row; gap: 8px; backdrop-filter: blur(10px);">
                <button onclick="switchMapType('street')" id="streetBtn" style="background: #4285f4; color: white; border: none; padding: 12px 16px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; min-width: 80px;">🗺️ Street</button>
                <button onclick="switchMapType('hybrid')" id="hybridBtn" style="background: #ea4335; color: white; border: none; padding: 12px 16px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; min-width: 80px;">🌍 Hybrid</button>
            </div>
        `;
        return div;
    };
    mapTypeControl.addTo(addressMap);

    // Store layers globally for switching
    window.mapLayers = {
        street: streetLayer,
        hybrid: L.layerGroup([hybridLayer, labelsLayer])
    };

    // Store current active layer
    window.currentMapType = 'street';
    
    // Live tracking state
    window.isLiveTracking = false;
    window.liveTrackingWatchId = null;

    // Update coordinates and center pin when map is moved
    addressMap.on('moveend', function() {
        const center = addressMap.getCenter();
        currentMapCenter = {
            lat: center.lat,
            lng: center.lng
        };
        
        // If user manually moved map, stop live tracking
        if (window.isLiveTracking && !window.programmaticMove) {
            stopLiveTracking();
        }
        
        // Reset programmatic move flag
        window.programmaticMove = false;
        
        // Center pin (📍) is CSS-based and stays in center automatically
        
        // Update live address preview (debounced)
        clearTimeout(window.addressUpdateTimeout);
        window.addressUpdateTimeout = setTimeout(async () => {
            await updateLiveAddressPreview(center.lat, center.lng);
        }, 1000); // Wait 1 second after user stops moving map
    });

    // Track zoom level and show ultra zoom indicator
    addressMap.on('zoomend', function() {
        const zoomLevel = addressMap.getZoom();
        const zoomLevelSpan = document.getElementById('zoomLevel');
        const ultraZoomIndicator = document.getElementById('ultraZoomIndicator');
        
        if (zoomLevelSpan) {
            zoomLevelSpan.textContent = zoomLevel;
        }
        
        // Show ultra zoom indicator for zoom levels 18 and above
        if (ultraZoomIndicator) {
            if (zoomLevel >= 18) {
                ultraZoomIndicator.classList.add('show');
                setTimeout(() => {
                    ultraZoomIndicator.classList.remove('show');
                }, 3000); // Hide after 3 seconds
            }
        }
    });

    // Try to get user's current location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;
                
                // Update map center to user's location with higher zoom
                addressMap.setView([userLat, userLng], 18);
                currentMapCenter = { lat: userLat, lng: userLng };
            },
            function(error) {
                console.log('Geolocation error:', error);
                // Keep default Delhi location
            }
        );
    }

    // Restore opacity
    if (mapContainer) {
        mapContainer.style.opacity = '1';
    }

    // Add resize handler to maintain map height
    const handleResize = () => {
        if (addressMap) {
            // Force map container to maintain 400px height
            const mapContainer = document.querySelector('.address-map-container');
            if (mapContainer) {
                mapContainer.style.height = '400px';
                mapContainer.style.minHeight = '400px';
                mapContainer.style.maxHeight = '400px';
            }
            
            // Invalidate map size to redraw properly
            setTimeout(() => {
                addressMap.invalidateSize();
            }, 100);
        }
    };

    // Listen for viewport changes (including keyboard show/hide)
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    // Also handle visual viewport changes (for mobile keyboards)
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', handleResize);
    }
}

// Live Address Preview Function
window.updateLiveAddressPreview = async function(lat, lng, isCurrentLocation = false) {
    const addressPreview = document.getElementById('liveAddressPreview');
    const addressNameContainer = document.getElementById('addressNameContainer');
    if (!addressPreview) return;

    try {
        addressPreview.innerHTML = '<div style="color: #666; font-style: italic;">🔍 Getting address...</div>';
        
        const address = await reverseGeocode(lat, lng);
        addressPreview.innerHTML = `
            <div style="color: #333; font-size: 14px; line-height: 1.4;">
                <strong>📍 ${isCurrentLocation ? 'Current Location:' : 'Selected Location:'}</strong><br>
                ${address}
            </div>
        `;
        
        // Show address name input only for manual location selection (not current location)
        if (addressNameContainer) {
            if (isCurrentLocation) {
                addressNameContainer.style.display = 'none';
                // Clear the input when using current location
                const nameInput = document.getElementById('addressNameInput');
                if (nameInput) nameInput.value = '';
            } else {
                addressNameContainer.style.display = 'block';
                // Focus on input for better UX
                setTimeout(() => {
                    const nameInput = document.getElementById('addressNameInput');
                    if (nameInput && !nameInput.value) {
                        nameInput.focus();
                    }
                }, 500);
            }
        }
        
    } catch (error) {
        addressPreview.innerHTML = '<div style="color: #999; font-style: italic;">📍 Move map to select location</div>';
        // Hide address name input on error
        if (addressNameContainer) {
            addressNameContainer.style.display = 'none';
        }
    }
};

// Improved Switch Map Type Function - No White Screen
window.switchMapType = function(type) {
    if (!window.mapLayers || !window.mapLayers[type] || window.currentMapType === type) return;

    const newLayer = window.mapLayers[type];
    const oldLayer = window.mapLayers[window.currentMapType];

    // Add new layer first (prevents white screen)
    newLayer.addTo(addressMap);

    // Wait a moment for tiles to start loading, then remove old layer
    setTimeout(() => {
        if (oldLayer && addressMap.hasLayer(oldLayer)) {
            addressMap.removeLayer(oldLayer);
        }
        
        // Update current type
        window.currentMapType = type;
        
        // Update button styles
        document.getElementById('streetBtn').style.background = type === 'street' ? '#1a73e8' : '#4285f4';
        document.getElementById('hybridBtn').style.background = type === 'hybrid' ? '#c5221f' : '#ea4335';

        // Show notification
        const typeNames = {
            'street': '🗺️ Street View',
            'hybrid': '🌍 Hybrid View'
        };
        showNotification(`Switched to ${typeNames[type]}`, 'success', 1500);
    }, 200); // Short delay to ensure tiles start loading
};

// Stop live tracking function
window.stopLiveTracking = function() {
    if (window.liveTrackingWatchId) {
        navigator.geolocation.clearWatch(window.liveTrackingWatchId);
        window.liveTrackingWatchId = null;
    }
    window.isLiveTracking = false;
    
    // Update button text
    const btn = document.getElementById('currentLocationBtn');
    if (btn) {
        btn.innerHTML = '📍 Use Current Location';
        btn.style.background = 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)';
    }
    
    // Reset pin to normal mode
    const pin = document.querySelector('.map-center-pin');
    if (pin) {
        pin.classList.remove('live-tracking');
    }
    
    // Hide live tracking indicator
    const indicator = document.getElementById('liveTrackingIndicator');
    if (indicator) {
        indicator.classList.remove('show');
    }
    
    showNotification('📍 Live tracking stopped', 'info', 2000);
};

// Use Current Location in Map Modal
window.useCurrentLocationInMap = function() {
    if (!navigator.geolocation) {
        showNotification('❌ Geolocation is not supported by this browser', 'error');
        return;
    }

    const btn = document.getElementById('currentLocationBtn');
    
    // If already tracking, stop it
    if (window.isLiveTracking) {
        stopLiveTracking();
        return;
    }

    // Show loading state on button
    btn.innerHTML = '🔄 Getting Location...';
    btn.disabled = true;

    showNotification('📍 Starting live location tracking...', 'info', 3000);

    // Start live tracking
    window.liveTrackingWatchId = navigator.geolocation.watchPosition(
        function(position) {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;
            
            // Update map center and coordinates
            currentMapCenter = { lat: userLat, lng: userLng };
            
            // Set programmatic move flag to prevent stopping tracking
            window.programmaticMove = true;
            
            // Move map to user's location
            if (addressMap) {
                addressMap.setView([userLat, userLng], 18); // Higher zoom for live tracking
                
                // Update live address preview
                setTimeout(() => {
                    updateLiveAddressPreview(userLat, userLng, true);
                }, 300);
            }
            
            // Update tracking state and button
            if (!window.isLiveTracking) {
                window.isLiveTracking = true;
                btn.innerHTML = '🔴 Stop Live Tracking';
                btn.style.background = 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)';
                btn.disabled = false;
                
                // Update pin to live tracking mode
                const pin = document.querySelector('.map-center-pin');
                if (pin) {
                    pin.classList.add('live-tracking');
                }
                
                // Show live tracking indicator
                const indicator = document.getElementById('liveTrackingIndicator');
                if (indicator) {
                    indicator.classList.add('show');
                }
                
                showNotification('🎯 Live tracking active! Move around to see real-time updates', 'success', 4000);
            }
        },
        function(error) {
            console.error('Geolocation error:', error);
            let errorMessage = 'Unable to get your location';
            
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage = 'Location access denied. Please enable location permissions.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage = 'Location information is unavailable.';
                    break;
                case error.TIMEOUT:
                    errorMessage = 'Location request timed out.';
                    break;
            }
            
            // Stop tracking and restore button
            stopLiveTracking();
            btn.disabled = false;
            
            showNotification(`❌ ${errorMessage}`, 'error', 5000);
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 1000 // Allow 1 second old location for smoother tracking
        }
    );
};

// Save New Address
window.saveNewAddress = async function() {
    try {
        // Check if address name input is visible and validate
        const addressNameContainer = document.getElementById('addressNameContainer');
        const addressNameInput = document.getElementById('addressNameInput');
        
        // If address name container is visible, name is required
        if (addressNameContainer && addressNameContainer.style.display !== 'none') {
            const customName = addressNameInput ? addressNameInput.value.trim() : '';
            if (!customName) {
                showNotification('❌ Please enter an address name for easy identification', 'error', 4000);
                if (addressNameInput) {
                    addressNameInput.focus();
                    addressNameInput.style.borderColor = '#dc3545';
                    setTimeout(() => {
                        addressNameInput.style.borderColor = '#ced4da';
                    }, 3000);
                }
                return;
            }
        }
        
        // Show loading state
        const saveBtn = document.querySelector('.address-save-btn');
        const originalText = saveBtn.textContent;
        saveBtn.textContent = 'Saving...';
        saveBtn.disabled = true;

        // Get user's phone number from Firebase
        let userPhone = '';
        if (currentUser) {
            const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
            if (userDoc.exists()) {
                userPhone = userDoc.data().phone || '';
            }
        }

        // Get address from coordinates using Nominatim
        const address = await reverseGeocode(currentMapCenter.lat, currentMapCenter.lng);
        
        // Get custom address name if provided
        const customName = addressNameInput ? addressNameInput.value.trim() : '';
        
        // Use custom name if provided, otherwise use the geocoded address
        const finalAddress = customName ? `${customName}: ${address}` : address;
        
        // Generate Google Maps link
        const googleMapsLink = `https://maps.google.com/?q=${currentMapCenter.lat},${currentMapCenter.lng}`;

        // Create address object
        const newAddress = {
            id: Date.now().toString(),
            phone: userPhone,
            address: finalAddress,
            customName: customName, // Store custom name separately for future reference
            originalAddress: address, // Store original geocoded address
            lat: currentMapCenter.lat,
            lng: currentMapCenter.lng,
            googleMapsLink: googleMapsLink,
            createdAt: new Date().toISOString()
        };

        // Add to saved addresses list
        savedAddressesList.push(newAddress);
        console.log('Address added to list, new length:', savedAddressesList.length);
        console.log('New address:', newAddress);

        // Save to Firebase
        if (currentUser) {
            try {
                // First check if user document exists
                const userDocRef = doc(db, 'users', currentUser.uid);
                const userDoc = await getDoc(userDocRef);
                
                if (userDoc.exists()) {
                    // Update existing document
                    await updateDoc(userDocRef, {
                        addresses: savedAddressesList
                    });
                } else {
                    // Create new document with addresses
                    await setDoc(userDocRef, {
                        addresses: savedAddressesList,
                        email: currentUser.email,
                        createdAt: new Date().toISOString()
                    });
                }
                console.log('Address saved to Firebase successfully');
            } catch (firebaseError) {
                console.error('Firebase save error:', firebaseError);
                throw firebaseError;
            }
        }

        // Update UI
        displaySavedAddresses();
        
        // **REAL-TIME UPDATE**: Update home page address display
        updateHomeAddressDisplay();
        
        // Also refresh confirm order modal if it's open
        if (document.getElementById('savedAddressesContainer')) {
            loadSavedAddressesInConfirmModal();
        }

        // Show success message
        showNotification('Address saved successfully! 📍', 'success');

        // Close modal
        closeAddressMapModal();

    } catch (error) {
        console.error('Error saving address:', error);
        showNotification('Error saving address. Please try again.', 'error');
    } finally {
        // Reset button state
        const saveBtn = document.querySelector('.address-save-btn');
        saveBtn.textContent = 'Save Address';
        saveBtn.disabled = false;
    }
};

// Delete Address Function
window.deleteAddress = async function(addressId) {
    if (!currentUser) {
        showNotification('Please login to delete addresses', 'warning');
        return;
    }

    // Direct delete without confirmation

    try {
        // Remove from local array
        savedAddressesList = savedAddressesList.filter(address => address.id !== addressId);

        // Update Firebase
        await updateDoc(doc(db, 'users', currentUser.uid), {
            addresses: savedAddressesList
        });

        // Update UI
        displaySavedAddresses();
        
        // **REAL-TIME UPDATE**: Update home page address display
        updateHomeAddressDisplay();
        
        // Also update modal if it's open
        if (document.getElementById('savedAddressesContainer')) {
            loadSavedAddressesInConfirmModal();
        }

        showNotification('Address deleted successfully! 🗑️', 'success');
    } catch (error) {
        console.error('Error deleting address:', error);
        showNotification('Error deleting address. Please try again.', 'error');
    }
};

// Reverse Geocoding using Nominatim
async function reverseGeocode(lat, lng) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
        const data = await response.json();
        
        if (data && data.display_name) {
            return data.display_name;
        } else {
            return `Location: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        }
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        return `Location: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
}

// Display Saved Addresses
function displaySavedAddresses() {
    const addressesList = document.getElementById('savedAddresses');
    console.log('displaySavedAddresses called, element found:', !!addressesList);
    console.log('savedAddressesList length:', savedAddressesList.length);
    
    if (!addressesList) {
        console.error('savedAddresses element not found!');
        return;
    }
    
    if (savedAddressesList.length === 0) {
        addressesList.innerHTML = '<li style="text-align: center; color: #666; padding: 20px; font-style: italic;">No saved addresses yet. Add your first address!</li>';
        return;
    }

    // Reverse the array to show latest addresses first
    const reversedAddresses = [...savedAddressesList].reverse();
    
    addressesList.innerHTML = reversedAddresses.map((address, index) => `
        <li class="address-item">
            <div class="address-phone">
                📱 ${address.phone} ${address.isCurrentLocation ? '<span style="background: #10b981; color: white; padding: 2px 6px; border-radius: 10px; font-size: 10px; margin-left: 8px;">📍 CURRENT LOCATION</span>' : ''}
            </div>
            <div class="address-text">
                ${address.address}
            </div>
            <div class="address-coordinates">
                📍 ${address.lat.toFixed(6)}, ${address.lng.toFixed(6)}
            </div>
            <div style="display: flex; gap: 10px; align-items: center; margin-top: 8px;">
                <a href="${address.googleMapsLink}" target="_blank" class="address-maps-link">
                    🗺️ View on Google Maps
                </a>
                <button onclick="deleteAddress('${address.id}')" style="background: #ef4444; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 10px; cursor: pointer; transition: all 0.3s ease;" onmouseover="this.style.background='#dc2626'" onmouseout="this.style.background='#ef4444'">
                    🗑️ Delete
                </button>
            </div>
        </li>
    `).join('');
}

// Load Saved Addresses from Firebase
async function loadSavedAddresses() {
    if (!currentUser) {
        savedAddressesList = [];
        displaySavedAddresses();
        return;
    }

    try {
        console.log('Loading addresses for user:', currentUser.uid);
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists() && userDoc.data().addresses) {
            savedAddressesList = userDoc.data().addresses;
            console.log('Loaded addresses:', savedAddressesList.length);
        } else {
            savedAddressesList = [];
            console.log('No addresses found, initializing empty array');
        }
        displaySavedAddresses();
    } catch (error) {
        console.error('Error loading saved addresses from Firebase:', error);
        savedAddressesList = [];
        displaySavedAddresses();
    }
}

// Clear selected address to force manual selection
async function clearSelectedAddressForOrder() {
    try {
        if (!currentUser) return;
        
        console.log('🔄 Clearing previously selected address to force manual selection');
        
        // Clear from Firebase
        await updateDoc(doc(db, 'users', currentUser.uid), {
            selectedAddressId: null
        });
        
        // Clear from localStorage
        localStorage.removeItem('selectedDeliveryAddress');
        
        console.log('✅ Address selection cleared - user must manually select');
    } catch (error) {
        console.error('Error clearing selected address:', error);
    }
}

// Load Saved Addresses in Confirm Order Modal
async function loadSavedAddressesInConfirmModal() {
    const container = document.getElementById('savedAddressesContainer');
    if (!container) {
        console.log('savedAddressesContainer not found');
        return;
    }
    
    // Clear any previously selected address to force fresh selection
    localStorage.removeItem('selectedDeliveryAddress');
    console.log('Cleared previously selected address - user must select again');
    
    try {
        let addresses = [];
        if (currentUser) {
            console.log('Loading addresses for confirm modal, user:', currentUser.uid);
            const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
            if (userDoc.exists() && userDoc.data().addresses) {
                addresses = userDoc.data().addresses;
                console.log('Found addresses for modal:', addresses.length);
            } else {
                console.log('No addresses found in Firebase for modal');
            }
        } else {
            console.log('No current user for modal');
        }
        
        if (addresses.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 30px 20px; color: #666; background: #f8f9fa; border-radius: 12px; border: 2px dashed #ddd;">
                    <div style="font-size: 48px; margin-bottom: 16px;">📍</div>
                    <h3 style="margin: 0 0 8px 0; color: #333;">No Saved Addresses</h3>
                    <p style="margin: 0; font-size: 14px;">Add your first delivery address to get started</p>
                </div>
                
                <!-- Use Current Location Button -->
                <div style="margin-top: 16px; text-align: center;">
                    <button onclick="useCurrentLocationFromConfirmModal()" style="background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; padding: 12px 24px; border-radius: 25px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(16, 185, 129, 0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(16, 185, 129, 0.3)'">
                        🎯 Use Current Location
                    </button>
                </div>
            `;
            return;
        }
        
        // Reverse addresses to show latest first
        const reversedAddresses = [...addresses].reverse();
        
        container.innerHTML = reversedAddresses.map((address, index) => {
            // Calculate original index (since we reversed the array)
            const originalIndex = addresses.length - 1 - index;
            return `
            <div class="confirm-address-item" style="background: white; border: 2px solid #e5e7eb; border-radius: 12px; padding: 16px; margin-bottom: 12px; cursor: pointer; transition: all 0.3s ease;" onclick="selectAddressForOrder(${originalIndex})" onmouseover="this.style.borderColor='#fbbf24'; this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='#e5e7eb'; this.style.transform='translateY(0)'">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="width: 20px; height: 20px; border: 2px solid #fbbf24; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                            <div style="width: 8px; height: 8px; background: #fbbf24; border-radius: 8px; opacity: 0;" class="address-selector"></div>
                        </div>
                        <div style="font-weight: 600; color: #2c3e50; font-size: 16px;">📍 Address ${index + 1} ${address.isCurrentLocation ? '<span style="background: #10b981; color: white; padding: 2px 6px; border-radius: 10px; font-size: 10px; margin-left: 8px;">📍 CURRENT LOCATION</span>' : ''}</div>
                    </div>
                    <div style="font-size: 10px; color: #666;">📱 ${address.phone}</div>
                </div>
                <div style="color: #666; font-size: 14px; line-height: 1.4; margin-left: 28px;">
                    ${address.address}
                </div>
                ${address.googleMapsLink ? `
                    <div style="margin-top: 8px; margin-left: 28px;">
                        <a href="${address.googleMapsLink}" target="_blank" style="color: #4285f4; text-decoration: none; font-size: 10px; display: inline-flex; align-items: center; gap: 4px;">
                            🗺️ View on Google Maps
                        </a>
                    </div>
                ` : ''}
            </div>
        `;
        }).join('') + `
        
        <!-- Use Current Location Button -->
        <div style="margin-top: 16px; text-align: center;">
            <button onclick="useCurrentLocationFromConfirmModal()" style="background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; padding: 12px 24px; border-radius: 25px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(16, 185, 129, 0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(16, 185, 129, 0.3)'">
                🎯 Use Current Location
            </button>
        </div>
        `;
        
    } catch (error) {
        console.error('Error loading saved addresses in confirm modal:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #e74c3c; background: #fef2f2; border-radius: 8px;">
                Error loading addresses. Please try again.
            </div>
        `;
    }
}

// Select Address for Order
window.selectAddressForOrder = async function(originalIndex) {
    try {
        if (!currentUser) return;
        
        // Get addresses from Firebase (for confirm modal)
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        let addresses = [];
        if (userDoc.exists() && userDoc.data().addresses) {
            addresses = userDoc.data().addresses;
        }
        
        // Fallback to savedAddressesList if available
        if (addresses.length === 0 && savedAddressesList && savedAddressesList.length > 0) {
            addresses = savedAddressesList;
        }
        
        if (addresses.length === 0 || originalIndex >= addresses.length || originalIndex < 0) return;
        
        const selectedAddress = addresses[originalIndex];
        console.log('Selected address:', selectedAddress.address, 'Original Index:', originalIndex, 'Display Index:', addresses.length - 1 - originalIndex);
        
        // Store selected address ID in Firebase
        await updateDoc(doc(db, 'users', currentUser.uid), {
            selectedAddressId: selectedAddress.id
        });
        
        // Calculate display index (since addresses are shown in reverse order)
        const displayIndex = addresses.length - 1 - originalIndex;
        
        // Update visual selection
        document.querySelectorAll('.address-selector').forEach((selector, i) => {
            if (i === displayIndex) {
                selector.style.opacity = '1';
                selector.parentElement.parentElement.parentElement.style.borderColor = '#fbbf24';
                selector.parentElement.parentElement.parentElement.style.background = '#fffbeb';
            } else {
                selector.style.opacity = '0';
                selector.parentElement.parentElement.parentElement.style.borderColor = '#e5e7eb';
                selector.parentElement.parentElement.parentElement.style.background = 'white';
            }
        });
        
        // Update home address display
        updateHomeAddressDisplay();
        
        // Reload user address data to reflect the selected address
        await loadUserAddressFromFirebase();
        
        showNotification('Address selected for delivery! 📍', 'success');
    } catch (error) {
        console.error('Error selecting address:', error);
        showNotification('Error selecting address', 'error');
    }
}

// Use Current Location Function
window.useCurrentLocation = function() {
    console.log('useCurrentLocation called');
    
    if (!currentUser) {
        console.log('No current user found');
        showNotification('Please login first to add address', 'error');
        return;
    }

    if (!navigator.geolocation) {
        console.log('Geolocation not supported');
        showNotification('Geolocation is not supported by this browser', 'error');
        return;
    }

    // Show loading notification
    console.log('Starting geolocation...');
    showNotification('🔄 Getting your location...', 'info', 3000);

    navigator.geolocation.getCurrentPosition(
        async function(position) {
            console.log('Geolocation success:', position);
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;
            
            // Store coordinates temporarily
            window.tempLocationCoords = { lat: userLat, lng: userLng };
            console.log('Temp coords stored:', window.tempLocationCoords);
            
            try {
                // Directly save with registered phone number
                console.log('Calling saveCurrentLocationWithRegisteredPhone...');
                await saveCurrentLocationWithRegisteredPhone();
                console.log('Save function completed successfully');
                
                showNotification('✅ Current location saved successfully!', 'success');
            } catch (error) {
                console.error('Error in saveCurrentLocationWithRegisteredPhone:', error);
                showNotification('❌ Error saving location: ' + error.message, 'error');
            }
        },
        function(error) {
            console.error('Geolocation error:', error);
            let errorMessage = 'Unable to get your location';
            
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage = 'Location access denied. Please enable location permissions.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage = 'Location information unavailable.';
                    break;
                case error.TIMEOUT:
                    errorMessage = 'Location request timed out.';
                    break;
            }
            
            showNotification(errorMessage, 'error');
        },
        {
            enableHighAccuracy: true,
            timeout: 30000,
            maximumAge: 0
        }
    );
};

// Save current location with registered phone number
window.saveCurrentLocationWithRegisteredPhone = async function() {
    console.log('saveCurrentLocationWithRegisteredPhone called');
    console.log('tempLocationCoords:', window.tempLocationCoords);
    
    if (!window.tempLocationCoords) {
        console.log('No temp location coords found');
        showNotification('❌ Location data not found. Please try again.', 'error');
        return;
    }

    try {
        console.log('Getting user phone from Firebase...');
        // Get user's phone number from Firebase
        let userPhone = '';
        if (currentUser) {
            console.log('Current user exists:', currentUser.uid);
            const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
            if (userDoc.exists()) {
                userPhone = userDoc.data().phone || '';
                console.log('User phone retrieved:', userPhone);
            } else {
                console.log('User document does not exist');
            }
        } else {
            console.log('No current user');
        }

        showNotification('📍 Saving your address...', 'info', 3000);
        
        const { lat, lng } = window.tempLocationCoords;
        
        // Get address from coordinates using reverse geocoding
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
        const data = await response.json();
        
        const fullAddress = data.display_name || `Location: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        const googleMapsLink = `https://maps.google.com/?q=${lat},${lng}`;
        
        // Create new address object
        const newAddress = {
            id: Date.now().toString(),
            phone: userPhone,
            address: fullAddress,
            lat: lat,
            lng: lng,
            googleMapsLink: googleMapsLink,
            createdAt: new Date().toISOString(),
            isCurrentLocation: true
        };

        // Get current addresses from Firebase
        const userRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userRef);
        let addresses = [];
        
        if (userDoc.exists() && userDoc.data().addresses) {
            addresses = userDoc.data().addresses;
        }
        
        // Remove any previous current location addresses
        addresses = addresses.filter(addr => !addr.isCurrentLocation);
        
        // Add new current location address
        addresses.push(newAddress);
        
        // Save to Firebase
        await setDoc(userRef, { addresses: addresses }, { merge: true });
        
        // Update local list
        savedAddressesList = addresses;
        
        // Clear temp coordinates
        window.tempLocationCoords = null;
        
        // Reload address data
        await loadUserAddressFromFirebase();
        
        // **REAL-TIME UPDATE**: Refresh confirm modal immediately
        if (document.getElementById('savedAddressesContainer')) {
            await loadSavedAddressesInConfirmModal();
            console.log('✅ Confirm modal updated with new current location');
            
            // Auto-select the new current location address (it will be at index 0 after reverse)
            setTimeout(() => {
                const firstAddressSelector = document.querySelector('.address-selector');
                if (firstAddressSelector) {
                    // Since addresses are reversed, the new current location will be at display index 0
                    // But we need to pass the original index (which is addresses.length - 1)
                    const originalIndex = addresses.length - 1;
                    selectAddressForOrder(originalIndex);
                }
            }, 100);
        }
        
        // Also update profile section if visible
        displaySavedAddresses();
        
        // **REAL-TIME UPDATE**: Update home page address display
        updateHomeAddressDisplay();
        
        // Close any open modals
        closeAddressPopup();
        
        showNotification('✅ Current location saved successfully!', 'success');
        
    } catch (error) {
        console.error('Error saving current location:', error);
        showNotification('❌ Error saving address. Please try again.', 'error');
    } finally {
        // Clear temp coordinates
        window.tempLocationCoords = null;
    }
};

// Save current location with phone number
window.saveCurrentLocationWithPhone = async function() {
    // Check both possible input fields
    let phoneInput = document.getElementById('currentLocationPhoneInput');
    if (!phoneInput || !phoneInput.offsetParent) {
        // If current location input is not visible, check the old phone input
        phoneInput = document.getElementById('phoneInputField');
    }
    
    if (!phoneInput) {
        showNotification('❌ Phone input field not found', 'error');
        return;
    }
    
    const phone = phoneInput.value.trim();
    
    // Validate phone number
    if (!phone) {
        showNotification('❌ Please enter your phone number', 'error');
        phoneInput.focus();
        return;
    }
    
    if (!/^\d{10}$/.test(phone)) {
        showNotification('❌ Please enter a valid 10-digit phone number', 'error');
        phoneInput.focus();
        return;
    }

    if (!window.tempLocationCoords) {
        showNotification('❌ Location data not found. Please try again.', 'error');
        
        // Close appropriate modal
        const currentLocationModal = document.getElementById('currentLocationPhoneModal');
        const oldPhoneModal = document.getElementById('phoneInputModal');
        
        if (currentLocationModal && currentLocationModal.style.display !== 'none') {
            closeCurrentLocationPhoneModal();
        } else if (oldPhoneModal && oldPhoneModal.style.display !== 'none') {
            closePhoneInputModal();
        }
        return;
    }

    try {
        showNotification('📍 Saving your address...', 'info', 3000);
        
        const { lat, lng } = window.tempLocationCoords;
        
        // Get address from coordinates using reverse geocoding
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
        const data = await response.json();
        
        const fullAddress = data.display_name || `Location: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        const googleMapsLink = `https://maps.google.com/?q=${lat},${lng}`;
        
        // Create new address object
        const newAddress = {
            id: Date.now().toString(),
            phone: phone,
            address: fullAddress,
            lat: lat,
            lng: lng,
            googleMapsLink: googleMapsLink,
            createdAt: new Date().toISOString(),
            isCurrentLocation: true  // Mark as current location address
        };

        // Save to Firebase
        const userRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userRef);
        let addresses = [];
        
        if (userDoc.exists() && userDoc.data().addresses) {
            addresses = userDoc.data().addresses;
        }
        
        // Remove any previous current location addresses
        addresses = addresses.filter(addr => !addr.isCurrentLocation);
        
        // Add new current location address
        addresses.push(newAddress);
        await setDoc(userRef, { 
            addresses: addresses,
            selectedAddressId: newAddress.id  // Set as selected address
        }, { merge: true });
        
        // Update display
        updateHomeAddressDisplay();
        
        // Refresh saved addresses list if it's open
        if (typeof loadSavedAddresses === 'function') {
            loadSavedAddresses();
        }
        
        // Refresh confirm modal addresses if it's open
        if (typeof loadSavedAddressesInConfirmModal === 'function') {
            loadSavedAddressesInConfirmModal();
        }
        
        // Reload user address data to reflect the new selected address
        await loadUserAddressFromFirebase();
        
        // Close appropriate modals
        const currentLocationModal = document.getElementById('currentLocationPhoneModal');
        const oldPhoneModal = document.getElementById('phoneInputModal');
        
        if (currentLocationModal && currentLocationModal.style.display !== 'none') {
            closeCurrentLocationPhoneModal();
        } else if (oldPhoneModal && oldPhoneModal.style.display !== 'none') {
            closePhoneInputModal();
        }
        
        closeAddressPopup();
        
        showNotification('✅ Current location saved as delivery address! 📍', 'success', 4000);
        
        // Clear temp coordinates
        window.tempLocationCoords = null;
        
    } catch (error) {
        console.error('Error saving address:', error);
        showNotification('❌ Error saving address. Please try again.', 'error');
    }
};

// Use current location from confirm order modal
window.useCurrentLocationFromConfirmModal = function() {
    if (navigator.geolocation) {
        showNotification('📍 Getting your current location...', 'info', 3000);
        
        navigator.geolocation.getCurrentPosition(
            async function(position) {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                // Store coordinates temporarily
                window.tempLocationCoords = { lat, lng };
                
                // Directly save with registered phone number
                await saveCurrentLocationWithRegisteredPhone();
                
                showNotification('✅ Current location saved successfully!', 'success', 3000);
            },
            function(error) {
                console.error('Geolocation error:', error);
                let errorMessage = '❌ Unable to get your location. ';
                
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage += 'Please allow location access and try again.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage += 'Location information is unavailable.';
                        break;
                    case error.TIMEOUT:
                        errorMessage += 'Location request timed out.';
                        break;
                    default:
                        errorMessage += 'An unknown error occurred.';
                        break;
                }
                
                showNotification(errorMessage, 'error', 5000);
            },
            {
                enableHighAccuracy: true,
                timeout: 30000,
                maximumAge: 0
            }
        );
    } else {
        showNotification('❌ Geolocation is not supported by this browser.', 'error');
        return;
    }
};



// Function to select an address
window.selectAddress = async function(index) {
    try {
        if (!currentUser) return;
        
        const selectedAddress = savedAddressesList[index];
        
        // Store selected address ID in Firebase
        await updateDoc(doc(db, 'users', currentUser.uid), {
            selectedAddressId: selectedAddress.id
        });
        
        // Update home address display
        updateHomeAddressDisplay();
        
        // Reload user address data to reflect the selected address
        await loadUserAddressFromFirebase();
        
        // Show success message
        showNotification('Address selected for delivery! 📍', 'success');
        
        // Close modal
    } catch (error) {
        console.error('Error selecting address:', error);
        showNotification('Error selecting address', 'error');
    }
};


// Override the existing saveNewAddress function to close map modal and refresh address modal
const originalSaveNewAddress = window.saveNewAddress;
window.saveNewAddress = function() {
    originalSaveNewAddress().then(() => {
        // Close map modal
        closeAddressMapModal();
        
        
        showNotification('New address added successfully! 📍', 'success');
    }).catch((error) => {
        console.error('Error saving address:', error);
        showNotification('Error saving address. Please try again.', 'error');
    });
};


// Initialize address management when page loads
document.addEventListener('DOMContentLoaded', function() {
    loadSavedAddresses();
    updateHomeAddressDisplay();
});

// Navbar Address Section Functions
function updateHomeAddressDisplay() {
    const navAddressText = document.getElementById('navAddressText');
    const navAddressText2 = document.getElementById('navAddressText2');
    if (!navAddressText) return;

    if (!currentUser) {
        // User not logged in
        navAddressText.textContent = 'Not Set';
        if (navAddressText2) navAddressText2.textContent = 'Not Set';
        return;
    }

    // Get user data from Firebase
    getDoc(doc(db, 'users', currentUser.uid)).then(userDoc => {
        if (userDoc.exists()) {
            const userData = userDoc.data();
            const userAddresses = userData.addresses || [];
            const selectedAddressId = userData.selectedAddressId;
            
            if (userAddresses.length > 0) {
                // Check if user has selected address
                if (selectedAddressId) {
                    const selectedAddress = userAddresses.find(addr => addr.id === selectedAddressId);
                    if (selectedAddress) {
                        // Show truncated address for navbar
                        const shortAddress = selectedAddress.address.length > 25 
                            ? selectedAddress.address.substring(0, 25) + '...' 
                            : selectedAddress.address;
                        navAddressText.textContent = shortAddress;
                        if (navAddressText2) navAddressText2.textContent = shortAddress;
                        return;
                    }
                }
                
                // User has addresses but none selected - show last saved address
                const lastAddress = userAddresses[userAddresses.length - 1]; // Get last added address
                const shortAddress = lastAddress.address.length > 25 
                    ? lastAddress.address.substring(0, 25) + '...' 
                    : lastAddress.address;
                navAddressText.textContent = shortAddress;
                if (navAddressText2) navAddressText2.textContent = shortAddress;
                
                // Auto-select this address as default
                setDoc(doc(db, 'users', currentUser.uid), { 
                    selectedAddressId: lastAddress.id 
                }, { merge: true });
            } else {
                // User has no addresses
                navAddressText.textContent = 'Add Address';
                if (navAddressText2) navAddressText2.textContent = 'Add Address';
            }
        } else {
            // User document doesn't exist
            navAddressText.textContent = 'Add Address';
            if (navAddressText2) navAddressText2.textContent = 'Add Address';
        }
    }).catch(error => {
        console.error('Error fetching user data:', error);
        navAddressText.textContent = 'Add Address';
        if (navAddressText2) navAddressText2.textContent = 'Add Address';
    });
}

// Open address popup modal
window.openAddressPopup = function() {
    const modal = document.getElementById('addressPopupModal');
    const buttonsContainer = document.getElementById('addressPopupButtons');
    
    if (!currentUser) {
        // Non-login user button
        buttonsContainer.innerHTML = `
            <button class="address-popup-btn login" onclick="openLoginFromAddressPopup()">
                🔐 Sign in to add address
            </button>
        `;
    } else {
        // Logged-in user buttons
        buttonsContainer.innerHTML = `
            <button class="address-popup-btn primary" onclick="openAddressMapModal()">
                📍 Custom Address
            </button>
            <button class="address-popup-btn secondary" onclick="useCurrentLocation()">
                🎯 Use Current Location
            </button>
        `;
    }
    
    modal.style.display = 'flex';
};

// Close address popup modal
window.closeAddressPopup = function(event) {
    if (event && event.target !== event.currentTarget) return;
    const modal = document.getElementById('addressPopupModal');
    modal.style.display = 'none';
};

// Open login modal from address popup
window.openLoginFromAddressPopup = function() {
    console.log('Opening login modal from address popup');
    closeAddressPopup();
    showLoginModal();
};

// Open register modal from address popup  
window.openRegisterFromAddressPopup = function() {
    closeAddressPopup();
    showRegisterModal();
};

// Pull-to-refresh functionality
function initializePullToRefresh() {
    const container = document.getElementById('searchCategoriesContainer');
    const indicator = document.getElementById('refreshIndicator');
    const loader = document.getElementById('refreshLoader');
    
    if (!container || !indicator || !loader) return;
    
    let startY = 0;
    let currentY = 0;
    let isRefreshing = false;
    let isPulling = false;
    
    // Touch start
    container.addEventListener('touchstart', function(e) {
        if (isRefreshing) return;
        
        // Only trigger if user is at the top of the page
        if (window.scrollY <= 0) {
            startY = e.touches[0].clientY;
            isPulling = true;
        }
    }, { passive: true });
    
    // Touch move
    container.addEventListener('touchmove', function(e) {
        if (!isPulling || isRefreshing) return;
        
        currentY = e.touches[0].clientY;
        const pullDistance = currentY - startY;
        
        // Only allow pulling down
        if (pullDistance > 0 && window.scrollY <= 0) {
            e.preventDefault();
            
            // Show indicator when pulled enough
            if (pullDistance > 50) {
                indicator.classList.add('show');
                indicator.textContent = '🔄 Release to refresh';
                container.style.transform = `translateY(${Math.min(pullDistance * 0.3, 30)}px)`;
            } else {
                indicator.classList.remove('show');
                indicator.textContent = '🔄 Pull to refresh';
                container.style.transform = `translateY(${pullDistance * 0.3}px)`;
            }
        }
    }, { passive: false });
    
    // Touch end
    container.addEventListener('touchend', function(e) {
        if (!isPulling || isRefreshing) return;
        
        const pullDistance = currentY - startY;
        
        // Trigger refresh if pulled enough
        if (pullDistance > 50 && window.scrollY <= 0) {
            triggerAppRefresh();
        } else {
            // Reset position
            container.style.transform = 'translateY(0)';
            indicator.classList.remove('show');
        }
        
        isPulling = false;
        startY = 0;
        currentY = 0;
    }, { passive: true });
    
    // Trigger app refresh
    function triggerAppRefresh() {
        if (isRefreshing) return;
        
        isRefreshing = true;
        container.classList.add('refreshing');
        indicator.textContent = '🔄 Refreshing...';
        indicator.classList.add('show');
        
        // Show center loader after small delay
        setTimeout(() => {
            indicator.classList.remove('show');
            loader.classList.add('show');
        }, 300);
        
        // Simulate refresh process with 2 second loader
        setTimeout(() => {
            // Refresh app data
            refreshAppData();
            
            // Hide loader and reset UI
            setTimeout(() => {
                loader.classList.remove('show');
                container.style.transform = 'translateY(0)';
                container.classList.remove('refreshing');
                indicator.textContent = '🔄 Pull to refresh';
                isRefreshing = false;
                
                // Show success message
                showNotification('App refreshed successfully! ✨', 'success');
            }, 200);
        }, 2000);
    }
    
    // Refresh app data
    function refreshAppData() {
        try {
            // Reload products data
            loadData();
            
            // Reload cart data
            loadCartFromFirebase();
            
            // Reload events data
            loadEventsFromFirebase().then(() => {
                loadEventsOnHomePage();
            });
            
            // Reset search
            const searchInput = document.getElementById('mainSearchInput');
            if (searchInput) {
                searchInput.value = '';
            }
            
            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
            
            console.log('App data refreshed successfully');
        } catch (error) {
            console.error('Error refreshing app data:', error);
        }
    }
}

// Register form submit handler function
window.registerSubmitHandler = function() {
    // 1. Get form values from input IDs
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const phone = document.getElementById('registerPhone').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // 2. Password Match Validation
    if (password !== confirmPassword) {
        // showNotification is assumed to be an existing function for error messages
        showNotification('Passwords do not match.', 'error');
        return;
    }
    
    // 3. Phone Number Validation (Assuming a 10-digit numeric phone number)
    // Check if phone number is exactly 10 digits and is a number
    if (phone.length !== 10 || isNaN(phone)) {
        showNotification('Please enter a valid 10-digit phone number.', 'error');
        return;
    }

    // 4. Call the main Firebase registration function
    // Assuming 'registerWithEmailAndPhone' is the function that handles Firebase logic
    registerWithEmailAndPhone(name, email, phone, password);
};

// ==================== RAZORPAY PAYMENT INTEGRATION ====================

// Razorpay configuration
const RAZORPAY_KEY_ID = 'rzp_live_RTb7EbgEAXUdn1';
const RAZORPAY_KEY_SECRET = 'gDb3Sf0Qo6EW7AZTlIS8zJgc';

// Global variables for payment processing
let currentOrderData = null;
let currentPaymentAmount = 0;

// Open Razorpay payment modal
window.openRazorpayModal = function(orderData, amount) {
    currentOrderData = orderData;
    // Round amount to 2 decimal places to avoid precision issues
    currentPaymentAmount = Math.round(amount * 100) / 100;
    
    document.getElementById('razorpayAmount').textContent = `₹${currentPaymentAmount}`;
    document.getElementById('razorpayPaymentModal').style.display = 'flex';
    
    // Add history state for back button handling
    history.pushState({razorpayOpen: true}, '', window.location.href);
    
    // Remove any existing listener first to avoid duplicates
    window.removeEventListener('popstate', handleRazorpayBackButton);
    // Add back button event listener
    window.addEventListener('popstate', handleRazorpayBackButton, true);
};

// Close Razorpay payment modal
window.closeRazorpayModal = function() {
    document.getElementById('razorpayPaymentModal').style.display = 'none';
    currentOrderData = null;
    currentPaymentAmount = 0;
    
    // Remove back button event listener
    window.removeEventListener('popstate', handleRazorpayBackButton);
};

// Handle device back button when Razorpay is open
function handleRazorpayBackButton(event) {
    // Check if Razorpay modal is open
    const razorpayModal = document.getElementById('razorpayPaymentModal');
    if (razorpayModal && razorpayModal.style.display === 'flex') {
        // Prevent default back navigation
        event.preventDefault();
        event.stopPropagation();
        
        // Close Razorpay modal first
        closeRazorpayModal();
        
        // Show cancellation message
        showNotification('Payment cancelled', 'warning');
        
        // Return to previous state
        return false;
    }
}

// Initiate Razorpay payment
window.initiateRazorpayPayment = function() {
    if (!currentOrderData || !currentPaymentAmount) {
        showNotification('Payment data not found. Please try again.', 'error');
        return;
    }

    // Check if this is for all cart items
    const isCartPayment = window.allCartOrdersData && window.allCartOrdersData.length > 0;
    
    // Debug logging for amount precision
    console.log('Razorpay Payment Debug:');
    console.log('Original amount:', currentPaymentAmount);
    console.log('Amount in paise (before rounding):', currentPaymentAmount * 100);
    console.log('Amount in paise (after rounding):', Math.round(currentPaymentAmount * 100));

    const options = {
        key: RAZORPAY_KEY_ID,
        amount: Math.round(currentPaymentAmount * 100), // Amount in paise (multiply by 100 and round to avoid decimal issues)
        currency: 'INR',
        name: 'Ficokart',
        description: `Order for ${currentOrderData.productName}`,
        image: 'logo.png',
        order_id: '', // This should be generated from your backend for production
        handler: function(response) {
            // Payment successful
            console.log('Payment successful:', response);
            if (isCartPayment) {
                handlePaymentSuccessForAllCartItems(response);
            } else {
                handlePaymentSuccess(response);
            }
        },
        prefill: {
            name: currentUser?.displayName || 'Customer',
            email: currentUser?.email || '',
            contact: currentOrderData.userPhone || ''
        },
        notes: {
            order_id: isCartPayment ? 'cart_order' : currentOrderData.productId,
            product_name: currentOrderData.productName
        },
        theme: {
            color: '#f59e0b'
        },
        modal: {
            ondismiss: function() {
                // Payment cancelled
                console.log('Payment cancelled by user');
                showNotification('Payment cancelled', 'warning');
                closeRazorpayModal();
            }
        }
    };

    const rzp = new Razorpay(options);
    
    rzp.on('payment.failed', function(response) {
        // Payment failed
        console.log('Payment failed:', response.error);
        showNotification(`Payment failed: ${response.error.description}`, 'error');
        closeRazorpayModal();
    });

    rzp.open();
    
    // Additional back button handling for Razorpay gateway itself
    // This ensures that when Razorpay opens, back button closes it first
    setTimeout(() => {
        // Add another history state specifically for Razorpay gateway
        history.pushState({razorpayGateway: true}, '', '');
    }, 500);
};

// Handle successful payment
async function handlePaymentSuccess(paymentResponse) {
    try {
        console.log('Processing payment success for order data:', currentOrderData);
        console.log('Payment response:', paymentResponse);
        
        // Validate currentOrderData exists
        if (!currentOrderData) {
            throw new Error('Order data not found');
        }
        
        // Add payment details to order data
        currentOrderData.paymentId = paymentResponse.razorpay_payment_id;
        currentOrderData.paymentSignature = paymentResponse.razorpay_signature;
        currentOrderData.paymentStatus = 'paid';
        currentOrderData.paymentDate = new Date().toISOString();
        
        console.log('Updated order data with payment details:', currentOrderData);
        
        // Save order to Firebase
        const orderId = await saveOrderToFirebase(currentOrderData);
        
        if (orderId) {
            // Check if this order was from cart and remove item
            if (window.orderFromCart && window.orderFromCart.productId === currentOrderData.productId) {
                removeFromCart(window.orderFromCart.productId, window.orderFromCart.selectedSize);
                showNotification(`✅ Payment Successful! 🎉<br>Order ID: ${orderId}<br>Total: ₹${currentPaymentAmount}<br>Payment ID: ${paymentResponse.razorpay_payment_id}<br>Item removed from cart.`, 'success', 8000);
                // Clear the cart flag
                window.orderFromCart = null;
            } else {
                showNotification(`✅ Payment Successful! 🎉<br>Order ID: ${orderId}<br>Total: ₹${currentPaymentAmount}<br>Payment ID: ${paymentResponse.razorpay_payment_id}`, 'success', 8000);
            }
            
            closeRazorpayModal();
            closeConfirmOrderModal();
            closeProductModal();
        } else {
            showNotification('Payment successful but error saving order. Please contact support.', 'error');
        }
    } catch (error) {
        console.error('Error handling payment success:', error);
        showNotification('Payment successful but error processing order. Please contact support.', 'error');
    }
}

// Handle successful payment for all cart items
async function handlePaymentSuccessForAllCartItems(paymentResponse) {
    try {
        // Use the stored order data from global variable
        if (!window.allCartOrdersData || window.allCartOrdersData.length === 0) {
            showNotification('Payment successful but order data not found. Please contact support.', 'error');
            return;
        }

        // Add payment details to all order data
        const updatedOrdersData = window.allCartOrdersData.map(orderData => ({
            ...orderData,
            paymentId: paymentResponse.razorpay_payment_id,
            paymentSignature: paymentResponse.razorpay_signature,
            paymentStatus: 'paid',
            paymentDate: new Date().toISOString()
        }));

        // Save all orders to Firebase
        const orderPromises = updatedOrdersData.map(orderData => {
            return saveOrderToFirebase(orderData, true); // Pass flag to skip individual cashback
        });

        const orderIds = await Promise.all(orderPromises);
        const successfulOrders = orderIds.filter(id => id !== null);

        if (successfulOrders.length > 0) {
            // Calculate combined cashback for all orders (based on original amount before wallet deduction)
            const originalTotalAmount = window.allCartOrdersData.reduce((sum, order) => sum + order.originalAmount, 0);
            const combinedCashbackPerHundred = Math.floor(Math.random() * 6) + 4; // Random between 4-9
            const combinedCashbackAmount = Math.round((originalTotalAmount * combinedCashbackPerHundred) / 100 * 100) / 100;
            
            // Update each order with proportional cashback
            if (combinedCashbackAmount > 0) {
                const cashbackPromises = successfulOrders.map(async (orderId, index) => {
                    const orderData = window.allCartOrdersData[index];
                    const proportionalCashback = Math.round(((orderData.originalAmount / originalTotalAmount) * combinedCashbackAmount) * 100) / 100;
                    
                    if (proportionalCashback > 0) {
                        const orderRef = doc(db, 'orders', orderId);
                        await setDoc(orderRef, {
                            cashbackAmount: proportionalCashback,
                            cashbackStatus: 'pending'
                        }, { merge: true });
                    }
                });
                
                await Promise.all(cashbackPromises);
                
                // Add combined cashback to pending wallet
                const userRef = doc(db, 'users', currentUser.uid);
                const userDoc = await getDoc(userRef);
                const currentPending = userDoc.exists() ? (userDoc.data().pendingCashback || 0) : 0;
                
                await setDoc(userRef, {
                    pendingCashback: Math.round((currentPending + combinedCashbackAmount) * 100) / 100
                }, { merge: true });
                
                // Show combined cashback notification
                setTimeout(() => {
                    showCashbackReward(combinedCashbackAmount);
                }, 1000);
            }

            // Clear cart
            cartItems.length = 0;
            localStorage.setItem('cartItems', JSON.stringify(cartItems));
            await saveCartToFirebase(); // Save empty cart to Firebase
            updateCartCount();
            updateCartDisplay();
            updateCartDisplayMain();
            updateFloatingCartNotification();

            const walletUsed = window.allCartOrdersData.reduce((sum, order) => sum + (order.walletUsed || 0), 0);
            const walletMessage = walletUsed > 0 ? `<br>💳 Wallet used: ₹${Math.round(walletUsed * 100) / 100}` : '';
            const cashbackMessage = combinedCashbackAmount > 0 ? `<br>💰 Cashback: ₹${Math.round(combinedCashbackAmount * 100) / 100} added to pending wallet!` : '';

            showNotification(`✅ Payment Successful! 🎉<br>${successfulOrders.length} orders placed<br>Total: ₹${currentPaymentAmount}<br>Payment ID: ${paymentResponse.razorpay_payment_id}${walletMessage}${cashbackMessage}`, 'success', 8000);
            
            closeRazorpayModal();
            closeConfirmOrderModal();
            
            // Clear global variables
            window.allCartOrdersData = null;
            window.allCartTotalAmount = 0;
            
            // Switch to orders tab to show the new orders
            setTimeout(async () => {
                await setActiveTab('profile');
                loadUserOrders();
            }, 2000);
        } else {
            showNotification('Payment successful but error saving orders. Please contact support.', 'error');
        }
    } catch (error) {
        console.error('Error handling payment success for all cart items:', error);
        showNotification('Payment successful but error processing orders. Please contact support.', 'error');
    }
}

