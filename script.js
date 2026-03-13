// Signup form state management
let signupFormState = {
    role: '',
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false
};

// Initialize signup form state
function initializeSignupState() {
    signupFormState = {
        role: document.getElementById('signup-role')?.value || '',
        name: document.getElementById('signup-name')?.value || '',
        email: document.getElementById('signup-email')?.value || '',
        phone: document.getElementById('signup-phone')?.value || '',
        password: document.getElementById('signup-password')?.value || '',
        confirmPassword: document.getElementById('signup-confirm-password')?.value || '',
        agreeTerms: document.getElementById('agree-terms')?.checked || false
    };
}

// Update signup form state
function updateSignupState(field, value) {
    signupFormState[field] = value;
}

// Get current signup form data
function getSignupFormData() {
    return { ...signupFormState };
}

// Dashboard redirection map
const dashboardMap = {
    'customer': 'customer-dashboard.html',
    'host': 'host-dashboard.html',
    'admin': 'admin-dashboard.html'
};

window.handleLogin = async function() {
    const errorDiv = document.getElementById('login-error');
    const loginBtn = document.querySelector('.login-btn');
    const originalBtnHTML = loginBtn ? loginBtn.innerHTML : 'Login';

    // Reset UI
    if (errorDiv) {
        errorDiv.innerHTML = '';
        errorDiv.className = 'error-message';
    }
    if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.innerHTML = `<span class="animate-spin btn-spinner"></span> Logging In...`;
    }

    const restoreButton = () => {
        if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.innerHTML = originalBtnHTML;
        }
    };

    try {
        // Get form data
        const email = document.getElementById('login-email') ? document.getElementById('login-email').value.trim().toLowerCase() : '';
        const password = document.getElementById('login-password') ? document.getElementById('login-password').value : '';

        // Validation
        let errors = [];
        if (!email) errors.push('Email is required.');
        if (!password) errors.push('Password is required.');

        if (errors.length > 0) {
            throw new Error(errors.join('<br>'));
        }

        const data = await api.login({ email, password });

        // Validate the response data
        if (!data || !data.user || !data.user.role) {
            throw new Error("Login failed: Invalid response from server.");
        }

        // Show success message
        if (errorDiv) {
            errorDiv.className = 'success-message';
            errorDiv.innerHTML = 'Login successful! Redirecting...';
        }

        // Store tokens and user
        localStorage.setItem('token', data.token);
        localStorage.setItem('refreshToken', data.refreshToken);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('isLoggedIn', 'true');

        // Update store
        if (typeof store !== 'undefined') {
            store.setState({user: data.user});
        }

        // Record terms acceptance
        try {
            await api.acceptTerms('login');
        } catch (error) {
            // Terms acceptance failed, but continue with login
            console.warn('Terms acceptance failed:', error);
        }

        // Redirect directly to appropriate dashboard based on role
        window.location.href = dashboardMap[data.user.role] || 'welcome.html';

    } catch (error) {
        let errorMessage = error.message;
        if (errorMessage.includes('Network error') || errorMessage.includes('Failed to fetch')) {
            errorMessage += '<br><small><b>Hint:</b> Is the backend server running on port 3001?</small>';
        }
        if (errorDiv) errorDiv.innerHTML = errorMessage;
        if (!errorDiv || errorDiv.style.display === 'none') {
             alert('Login Error: ' + error.message);
        }
        restoreButton();
    }
};

window.handleSignup = async function() {
    const errorDiv = document.getElementById('signup-error');
    const signupBtn = document.querySelector('.signup-btn');
    const originalBtnHTML = signupBtn ? signupBtn.innerHTML : 'Create Account';

    // Reset UI
    if (errorDiv) {
        errorDiv.innerHTML = '';
        errorDiv.className = 'error-message'; // Ensure it's styled as an error message initially
    }
    if (signupBtn) {
        signupBtn.disabled = true;
        signupBtn.innerHTML = `<span class="animate-spin btn-spinner"></span> Signing Up...`;
    }

    // A helper to restore the button
    const restoreButton = () => {
        if (signupBtn) {
            signupBtn.disabled = false;
            signupBtn.innerHTML = originalBtnHTML;
        }
    };

    try {
        // Get form data from state
        // Console log removed
        const formData = getSignupFormData();
        const role = formData.role;
        const name = formData.name.trim();
        const email = formData.email.trim().toLowerCase();
        const phone = formData.phone.trim();
        const password = formData.password;
        const confirmPassword = formData.confirmPassword;
        const agreeTerms = formData.agreeTerms;

        // Validation
        let errors = [];
        if (!role) errors.push('Role is required.');
        if (!name) errors.push('Full name is required.');
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (role === 'customer' && !email) errors.push('Email is required.');
        else if (email && !emailRegex.test(email)) errors.push('Invalid email format.');
        
        if (!password) errors.push('Password is required.');
        if (!confirmPassword) errors.push('Confirm password is required.');
        if (password !== confirmPassword) errors.push('Passwords do not match.');
        if (!agreeTerms) errors.push('You must agree to the Terms & Conditions.');
        if (role === 'host' && !phone) errors.push('Phone number is required for hosts.');

        if (errors.length > 0) {
            // Use throw new Error to jump to catch block for consistent error handling
            throw new Error(errors.join('<br>'));
        }

        // Split name into firstName and lastName
        const nameParts = name.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        const signupData = { email, password, firstName, lastName, phone, role };

        // Console log removed

        const data = await api.signup(signupData);

        // Validate the response data
        if (!data || !data.user || !data.user.role) {
            throw new Error("Signup failed: Invalid response from server.");
        }

        // --- Success ---
        if (errorDiv) {
            errorDiv.className = 'success-message';
            errorDiv.innerHTML = 'Sign up successful! Redirecting...';
        }

        // Store tokens and user
        localStorage.setItem('token', data.token);
        localStorage.setItem('refreshToken', data.refreshToken);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('isLoggedIn', 'true');

        // Redirect to appropriate dashboard based on role
        setTimeout(() => {
            window.location.href = dashboardMap[data.user.role] || 'welcome.html';
        }, 1500);

    } catch (error) {
        let errorMessage = error.message;
        if (errorMessage.includes('Network error') || errorMessage.includes('Failed to fetch')) {
            errorMessage += '<br><small><b>Hint:</b> Is the backend server running on port 3001?</small>';
        }
        if (errorDiv) errorDiv.innerHTML = errorMessage;
        if (!errorDiv || errorDiv.style.display === 'none') {
             alert('Signup Error: ' + error.message);
        }
        restoreButton(); // Restore button on any error
    }
};

// Function to initialize login/signup functionality
function initializeAuth(initialForm) {
    // Console log removed

    // Form elements
    const loginFormElement = document.getElementById('login-form');
    const signupFormElement = document.getElementById('signup-form');

    // Check if it's the flip card page
    const card = document.getElementById('card');
    if (card) {
        // Flip card page
        if (initialForm === 'signup') {
            flipCard();
        }
        // Skip the tab logic and proceed to attach event listeners
    } else {
        // Tab switching functionality
        const loginTab = document.getElementById('login-tab');
        const signupTab = document.getElementById('signup-tab');
        const loginForm = document.getElementById('login-form');
        const signupForm = document.getElementById('signup-form');
        const formCard = document.querySelector('.form-card');
        const switchToSignup = document.getElementById('switch-to-signup');
        const switchToLogin = document.getElementById('switch-to-login');

    // Only initialize tabs if all elements exist
    if (loginTab && signupTab && loginForm && signupForm) {
        // Console log removed
        function switchToLoginMode() {
            loginTab.classList.add('active');
            signupTab.classList.remove('active');
            loginForm.classList.add('active');
            signupForm.classList.remove('active');
            if (formCard) {
                formCard.classList.remove('magenta-wave');
                formCard.classList.add('emerald-wave');
                setTimeout(() => formCard.classList.remove('emerald-wave'), 600);
            }
        }

        function switchToSignupMode() {
            signupTab.classList.add('active');
            loginTab.classList.remove('active');
            signupForm.classList.add('active');
            loginForm.classList.remove('active');
            if (formCard) {
                formCard.classList.remove('emerald-wave');
                formCard.classList.add('magenta-wave');
                setTimeout(() => formCard.classList.remove('magenta-wave'), 600);
            }
        }

        loginTab.addEventListener('click', switchToLoginMode);
        signupTab.addEventListener('click', switchToSignupMode);
        
        if (switchToSignup) {
            switchToSignup.addEventListener('click', function(e) {
                e.preventDefault();
                switchToSignupMode();
            });
        }
        
        if (switchToLogin) {
            switchToLogin.addEventListener('click', function(e) {
                e.preventDefault();
                switchToLoginMode();
            });
        }

        // Show the correct form based on the route
        if (initialForm === 'signup') {
            switchToSignupMode();
        } else {
            switchToLoginMode(); // Default to login
        }
    } else {
        // Console log removed
    }
    }

    // Password toggle functionality
    const toggleButtons = document.querySelectorAll('.toggle-password');

    toggleButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const targetInput = document.getElementById(targetId);
            const eyeIcon = this.querySelector('.eye-icon');

            if (targetInput.type === 'password') {
                targetInput.type = 'text';
                eyeIcon.textContent = '🙈';
            } else {
                targetInput.type = 'password';
                eyeIcon.textContent = '👁️';
            }
        });
    });

    // Social login buttons (placeholder functionality)
    const socialButtons = document.querySelectorAll('.social-btn');

    socialButtons.forEach(button => {
        button.addEventListener('click', function() {
            const provider = this.classList.contains('google-btn') ? 'Google' :
                           this.classList.contains('facebook-btn') ? 'Facebook' : 'Apple';
            const notificationDiv = this.closest('form').querySelector('#social-notification');
            if (notificationDiv) {
                notificationDiv.innerHTML = `${provider} login would be implemented here. Please use email and password for now.`;
            }
        });
    });

    // Real-time validation
    const loginEmail = document.getElementById('login-email');
    const loginPassword = document.getElementById('login-password');
    const loginError = document.getElementById('login-error');

    const signupName = document.getElementById('signup-name');
    const signupEmail = document.getElementById('signup-email');
    const signupPhone = document.getElementById('signup-phone');
    const signupPassword = document.getElementById('signup-password');
    const signupConfirm = document.getElementById('signup-confirm-password');
    const signupError = document.getElementById('signup-error');

    // Helper to clear error on focus
    const clearErrorOnFocus = (input, errorDiv) => {
        input.addEventListener('focus', () => {
            if (errorDiv) errorDiv.innerHTML = '';
        });
    };

    // Login validation
    if (loginEmail) {
        loginEmail.addEventListener('blur', () => {
            if (!loginEmail.value.trim()) {
                if (loginError) loginError.innerHTML = 'Email is required.';
            }
        });
        clearErrorOnFocus(loginEmail, loginError);
    }

    if (loginPassword) {
        loginPassword.addEventListener('blur', () => {
            if (!loginPassword.value) {
                if (loginError) loginError.innerHTML = 'Password is required.';
            }
        });
        clearErrorOnFocus(loginPassword, loginError);
    }

    // Role selection logic
    const signupRole = document.getElementById('signup-role');
    const emailGroup = document.getElementById('email-group');

    if (signupRole && emailGroup) {
        signupRole.addEventListener('change', function() {
            const role = this.value;
            if (role === 'customer') {
                emailGroup.style.display = 'block';
            } else {
                emailGroup.style.display = 'none';
                document.getElementById('signup-email').value = '';
            }
        });
        // Initial state
        if (signupRole.value === 'customer') {
            emailGroup.style.display = 'block';
        } else {
            emailGroup.style.display = 'none';
        }
    }

    // Phone group logic
    const phoneGroup = document.getElementById('phone-group');
    if (signupRole && phoneGroup) {
        signupRole.addEventListener('change', function() {
            const role = this.value;
            updateSignupState('role', role);
            if (role === 'host') {
                phoneGroup.style.display = 'block';
            } else {
                phoneGroup.style.display = 'none';
                document.getElementById('signup-phone').value = '';
                updateSignupState('phone', '');
            }
        });
        // Initial state
        const initialRole = signupRole.value;
        if (initialRole === 'host') {
            phoneGroup.style.display = 'block';
        } else {
            phoneGroup.style.display = 'none';
        }
    }

    // Signup validation
    if (signupName) {
        signupName.addEventListener('blur', () => {
            if (!signupName.value.trim()) {
                if (signupError) signupError.innerHTML = 'Full name is required.';
            }
        });
        clearErrorOnFocus(signupName, signupError);
    }

    if (signupEmail) {
        signupEmail.addEventListener('blur', () => {
            if (!signupEmail.value.trim()) {
                if (signupError) signupError.innerHTML = 'Email is required.';
            } else if (!signupEmail.value.includes('@')) {
                if (signupError) signupError.innerHTML = 'Please enter a valid email address.';
            }
        });
        clearErrorOnFocus(signupEmail, signupError);
    }

    if (signupPhone) {
        signupPhone.addEventListener('blur', () => {
            const role = document.getElementById('signup-role').value;
            if (!signupPhone.value.trim() && role === 'host') {
                if (signupError) signupError.innerHTML = 'Phone number is required for hosts.';
            }
        });
        clearErrorOnFocus(signupPhone, signupError);
    }

    if (signupPassword) {
        signupPassword.addEventListener('blur', () => {
            if (!signupPassword.value) {
                if (signupError) signupError.innerHTML = 'Password is required.';
            } else if (signupPassword.value.length < 6) {
                if (signupError) signupError.innerHTML = 'Password must be at least 6 characters long.';
            }
        });
        clearErrorOnFocus(signupPassword, signupError);
    }

    if (signupConfirm) {
        signupConfirm.addEventListener('blur', () => {
            if (!signupConfirm.value) {
                if (signupError) signupError.innerHTML = 'Confirm password is required.';
            } else if (signupConfirm.value !== signupPassword.value) {
                if (signupError) signupError.innerHTML = 'Passwords do not match.';
            }
        });
        clearErrorOnFocus(signupConfirm, signupError);
    }

    // Input listeners to update state
    if (signupName) {
        signupName.addEventListener('input', function() {
            updateSignupState('name', this.value);
        });
    }

    if (signupEmail) {
        signupEmail.addEventListener('input', function() {
            updateSignupState('email', this.value);
        });
    }

    if (signupPhone) {
        signupPhone.addEventListener('input', function() {
            updateSignupState('phone', this.value);
        });
    }

    if (signupPassword) {
        signupPassword.addEventListener('input', function() {
            updateSignupState('password', this.value);
        });
    }

    if (signupConfirm) {
        signupConfirm.addEventListener('input', function() {
            updateSignupState('confirmPassword', this.value);
        });
    }

    const agreeTermsInput = document.getElementById('agree-terms');
    if (agreeTermsInput) {
        agreeTermsInput.addEventListener('change', function() {
            updateSignupState('agreeTerms', this.checked);
        });
    }

    // Button click handlers
    const loginBtn = document.querySelector('.login-btn');
    if (loginBtn) {
        // Console log removed
        loginBtn.addEventListener('click', function(e) {
            // Console log removed
            e.preventDefault();
            handleLogin();
        });
    } else {
        // Console log removed
    }

    const signupBtn = document.querySelector('.signup-btn');
    if (signupBtn) {
        // Console log removed
        signupBtn.addEventListener('click', function(e) {
            // Console log removed
            e.preventDefault();
            handleSignup();
        });
    } else {
        // Console log removed
    }

    // Form submission (fallback for enter key)
    if (loginFormElement) {
        loginFormElement.addEventListener('submit', function(e) {
            e.preventDefault();
            handleLogin();
        });
    }

    if (signupFormElement) {
        signupFormElement.addEventListener('submit', function(e) {
            e.preventDefault();
            handleSignup();
        });
    }



    // Add smooth transitions for input focus
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.style.transform = 'scale(1.02)';
        });

        input.addEventListener('blur', function() {
            this.parentElement.style.transform = 'scale(1)';
        });
    });
}

// Initialize on DOMContentLoaded for initial page
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAuth);
} else {
    initializeAuth();
}
