// Function to initialize login/signup functionality
function initializeAuth() {
    // Tab switching functionality
    const loginTab = document.getElementById('login-tab');
    const signupTab = document.getElementById('signup-tab');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const formCard = document.querySelector('.form-card');
    const switchToSignup = document.getElementById('switch-to-signup');
    const switchToLogin = document.getElementById('switch-to-login');

    if (!loginTab || !signupTab || !loginForm || !signupForm) {
        return; // Elements not found, skip initialization
    }

    function switchToLoginMode() {
        loginTab.classList.add('active');
        signupTab.classList.remove('active');
        loginForm.classList.add('active');
        signupForm.classList.remove('active');
        formCard.classList.remove('magenta-wave');
        formCard.classList.add('emerald-wave');
        setTimeout(() => formCard.classList.remove('emerald-wave'), 600);
    }

    function switchToSignupMode() {
        signupTab.classList.add('active');
        loginTab.classList.remove('active');
        signupForm.classList.add('active');
        loginForm.classList.remove('active');
        formCard.classList.remove('emerald-wave');
        formCard.classList.add('magenta-wave');
        setTimeout(() => formCard.classList.remove('magenta-wave'), 600);
    }

    loginTab.addEventListener('click', switchToLoginMode);
    signupTab.addEventListener('click', switchToSignupMode);
    switchToSignup.addEventListener('click', function(e) {
        e.preventDefault();
        switchToSignupMode();
    });
    switchToLogin.addEventListener('click', function(e) {
        e.preventDefault();
        switchToLoginMode();
    });

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
            alert(`${provider} login would be implemented here`);
        });
    });

    // Form submission (placeholder functionality)
    const loginFormElement = document.getElementById('login-form');
    const signupFormElement = document.getElementById('signup-form');

    // Global functions for onclick
    window.handleLogin = function() {
        const errorDiv = document.getElementById('login-error');
        errorDiv.innerHTML = '';

        // Get form data
        const formData = new FormData(loginFormElement);
        const data = Object.fromEntries(formData);

        // Validation
        let errors = [];
        const email = data.email.toLowerCase();
        const password = data.password;

        if (!email) errors.push('Email is required.');
        if (!password) errors.push('Password is required.');

        let role = '';
        if (email.endsWith('@gmail.com')) {
            role = 'customer';
        } else if (email.endsWith('@view1s@gmail.com')) {
            role = 'host';
        } else if (email.endsWith('@viewad@gmail.com')) {
            role = 'admin';
        } else {
            errors.push('Invalid email domain.');
        }

        if (errors.length > 0) {
            errorDiv.innerHTML = errors.join('<br>');
            return;
        }

        console.log('Login data:', data);
        alert('Login submitted! Check console for data.');

        // Use API object for backend call
        api.login(data)
        .then(result => {
            console.log('Login result:', result);
            // Store user data and token
            store.login({
                profile: result.user,
                token: result.token
            });
            localStorage.setItem('userRole', role);
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('token', result.token);
            localStorage.setItem('refreshToken', result.refreshToken);
            alert('Login successful!');
            if (role === 'customer') {
                window.location.href = 'customer-dashboard.html';
            } else if (role === 'host') {
                window.location.href = 'host-dashboard.html';
            } else if (role === 'admin') {
                window.location.href = 'admin-dashboard.html';
            }
        })
        .catch(error => {
            console.error('Login failed:', error);
            errorDiv.innerHTML = 'Login failed. Please check your credentials and try again.';
        });
    };

    window.handleSignup = function() {
        const errorDiv = document.getElementById('signup-error');
        errorDiv.innerHTML = '';

        // Get form data directly from inputs
        const name = document.getElementById('signup-name').value.trim();
        const email = document.getElementById('signup-email').value.trim().toLowerCase();
        const phone = document.getElementById('signup-phone').value.trim();
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('signup-confirm-password').value;
        const agreeTerms = document.getElementById('agree-terms').checked;

        // Validation
        let errors = [];
        if (!name) errors.push('Full name is required.');
        if (!email) errors.push('Email is required.');
        if (!password) errors.push('Password is required.');
        if (!confirmPassword) errors.push('Confirm password is required.');
        if (password !== confirmPassword) errors.push('Passwords do not match.');
        if (!agreeTerms) errors.push('You must agree to the Terms & Conditions.');

        let role = '';
        if (email.endsWith('@gmail.com')) {
            role = 'customer';
            if (!phone) errors.push('Phone number is required for customers.');
        } else if (email.endsWith('@view1s@gmail.com')) {
            role = 'host';
            if (!phone) errors.push('Phone number is required for hosts.');
        } else if (email.endsWith('@viewad@gmail.com')) {
            role = 'admin';
            // Phone optional for admins
        } else {
            errors.push('Email must end with @gmail.com (Customer), @view1s@gmail.com (Host), or @viewad@gmail.com (Admin).');
        }

        if (errors.length > 0) {
            errorDiv.innerHTML = errors.join('<br>');
            return;
        }

        const data = { name, email, phone, password };

        console.log('Sign up data:', data);

        // Use API object for backend call
        api.signup(data)
        .then(result => {
            console.log('Signup result:', result);
            // Store user data and token
            store.login({
                profile: result.user,
                token: result.token
            });
            localStorage.setItem('userRole', role);
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('token', result.token);
            localStorage.setItem('refreshToken', result.refreshToken);
            alert('Sign up successful!');
            if (role === 'customer') {
                window.location.href = 'customer-dashboard.html';
            } else if (role === 'host') {
                window.location.href = 'host-dashboard.html';
            } else if (role === 'admin') {
                window.location.href = 'admin-dashboard.html';
            }
        })
        .catch(error => {
            console.error('Signup failed:', error);
            errorDiv.innerHTML = 'Signup failed. Please check your details and try again.';
        });
    };

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
document.addEventListener('DOMContentLoaded', initializeAuth);

// Also initialize immediately in case the script is loaded dynamically
initializeAuth();
