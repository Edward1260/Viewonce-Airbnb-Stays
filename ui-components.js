// UI Components Library for ViewOnce Airbnb
// Provides common UI elements: loading states, toasts, modals, etc.

// ==================== Toast Notifications ====================
class ToastManager {
    constructor() {
        this.container = null;
        this.init();
    }

    init() {
        // Create toast container if it doesn't exist
        if (!document.getElementById('toast-container')) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 10px;
            `;
            document.body.appendChild(this.container);
        } else {
            this.container = document.getElementById('toast-container');
        }
    }

    show(message, type = 'info', duration = 4000) {
        const toast = document.createElement('div');
        
        // Toast styles based on type
        const colors = {
            success: { bg: '#10B981', icon: 'fa-check-circle' },
            error: { bg: '#EF4444', icon: 'fa-times-circle' },
            warning: { bg: '#F59E0B', icon: 'fa-exclamation-circle' },
            info: { bg: '#3B82F6', icon: 'fa-info-circle' }
        };
        
        const color = colors[type] || colors.info;
        
        toast.style.cssText = `
            background: ${color.bg};
            color: white;
            padding: 14px 20px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            gap: 10px;
            min-width: 280px;
            animation: slideInRight 0.3s ease;
            font-weight: 500;
        `;
        
        toast.innerHTML = `
            <i class="fas ${color.icon}"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.remove()" style="background:none;border:none;color:white;cursor:pointer;margin-left:auto;font-size:18px;">×</button>
        `;
        
        this.container.appendChild(toast);
        
        // Auto remove after duration
        setTimeout(() => {
            if (toast.parentElement) {
                toast.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => toast.remove(), 300);
            }
        }, duration);
        
        return toast;
    }

    success(message, duration) { return this.show(message, 'success', duration); }
    error(message, duration) { return this.show(message, 'error', duration); }
    warning(message, duration) { return this.show(message, 'warning', duration); }
    info(message, duration) { return this.show(message, 'info', duration); }
}

// Global toast instance
const toast = new ToastManager();

// ==================== Loading Spinner ====================
function createSpinner(size = 'md') {
    const sizes = { sm: '24px', md: '40px', lg: '60px' };
    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';
    spinner.style.cssText = `
        width: ${sizes[size] || sizes.md};
        height: ${sizes[size] || sizes.md};
        border: 3px solid #f3f3f3;
        border-top: 3px solid #FF5A5F;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 20px auto;
    `;
    return spinner;
}

// ==================== Skeleton Loader ====================
function createSkeleton(type = 'text', width = '100%') {
    const skeleton = document.createElement('div');
    skeleton.className = 'skeleton';
    
    const styles = {
        text: `height: 16px; width: ${width}; border-radius: 4px;`,
        avatar: `width: 48px; height: 48px; border-radius: 50%;`,
        image: `width: ${width}; height: 200px; border-radius: 12px;`,
        card: `width: ${width}; height: 150px; border-radius: 12px;`
    };
    
    skeleton.style.cssText = `
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
        ${styles[type] || styles.text}
    `;
    
    return skeleton;
}

function createSkeletonLoader(count = 3, type = 'text') {
    const container = document.createElement('div');
    container.className = 'skeleton-loader';
    
    for (let i = 0; i < count; i++) {
        container.appendChild(createSkeleton(type));
    }
    
    return container;
}

// ==================== Empty State ====================
function createEmptyState(icon, title, message, actionText = null, actionClick = null) {
    const state = document.createElement('div');
    state.className = 'empty-state';
    state.style.cssText = `
        text-align: center;
        padding: 60px 20px;
        color: #767676;
    `;
    
    let actionButton = '';
    if (actionText && actionClick) {
        actionButton = `<button onclick="${actionClick}" class="btn-primary" style="margin-top:20px;">${actionText}</button>`;
    }
    
    state.innerHTML = `
        <i class="fas ${icon}" style="font-size: 48px; color: #ddd; margin-bottom: 20px;"></i>
        <h3 style="font-size: 18px; font-weight: 600; color: #484848; margin-bottom: 10px;">${title}</h3>
        <p style="font-size: 14px; margin-bottom: 20px;">${message}</p>
        ${actionButton}
    `;
    
    return state;
}

// ==================== Modal Manager ====================
class ModalManager {
    constructor() {
        this.modals = new Map();
    }

    create(id, options = {}) {
        const modal = document.createElement('div');
        modal.id = id;
        modal.className = 'modal-backdrop';
        modal.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.5);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            padding: 20px;
        `;
        
        const content = document.createElement('div');
        content.className = 'modal-content';
        content.style.cssText = `
            background: white;
            border-radius: 20px;
            padding: 30px;
            max-width: ${options.width || '500px'};
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
            position: relative;
        `;
        
        if (options.title) {
            const header = document.createElement('div');
            header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;';
            header.innerHTML = `
                <h2 style="font-size:20px;font-weight:700;">${options.title}</h2>
                <button onclick="modalManager.close('${id}')" style="background:none;border:none;font-size:24px;cursor:pointer;color:#767676;">×</button>
            `;
            content.appendChild(header);
        }
        
        const body = document.createElement('div');
        body.id = `${id}-body`;
        content.appendChild(body);
        
        modal.appendChild(content);
        document.body.appendChild(modal);
        
        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.close(id);
        });
        
        this.modals.set(id, { modal, content: body });
        return body;
    }

    open(id) {
        const modal = this.modals.get(id);
        if (modal) {
            modal.modal.style.display = 'flex';
        }
    }

    close(id) {
        const modal = this.modals.get(id);
        if (modal) {
            modal.modal.style.display = 'none';
        }
    }

    getBody(id) {
        return this.modals.get(id)?.content;
    }
}

const modalManager = new ModalManager();

// ==================== Confirmation Dialog ====================
async function confirmDialog(options) {
    return new Promise((resolve) => {
        const { title = 'Confirm', message, confirmText = 'Confirm', cancelText = 'Cancel', type = 'warning' } = options;
        
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10001;
            padding: 20px;
        `;
        
        const colors = {
            warning: '#F59E0B',
            danger: '#EF4444',
            info: '#3B82F6',
            success: '#10B981'
        };
        
        modal.innerHTML = `
            <div style="background:white;border-radius:16px;padding:30px;max-width:400px;width:100%;text-align:center;">
                <div style="width:60px;height:60px;margin:0 auto 20px;background:${colors[type]}20;border-radius:50%;display:flex;align-items:center;justify-content:center;">
                    <i class="fas fa-${type === 'danger' ? 'exclamation-triangle' : 'question-circle'}" style="font-size:28px;color:${colors[type]};"></i>
                </div>
                <h3 style="font-size:20px;font-weight:700;margin-bottom:10px;">${title}</h3>
                <p style="color:#767676;margin-bottom:25px;">${message}</p>
                <div style="display:flex;gap:10px;justify-content:center;">
                    <button id="cancel-btn" style="padding:12px 24px;border:2px solid #ddd;background:white;border-radius:12px;font-weight:600;cursor:pointer;">${cancelText}</button>
                    <button id="confirm-btn" style="padding:12px 24px;border:none;background:${colors[type]};color:white;border-radius:12px;font-weight:600;cursor:pointer;">${confirmText}</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        document.getElementById('cancel-btn').onclick = () => {
            modal.remove();
            resolve(false);
        };
        
        document.getElementById('confirm-btn').onclick = () => {
            modal.remove();
            resolve(true);
        };
    });
}

// ==================== Form Validation ====================
const Validation = {
    required: (value) => value && value.trim() !== '' ? null : 'This field is required',
    
    email: (value) => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(value) ? null : 'Please enter a valid email address';
    },
    
    phone: (value) => {
        const regex = /^254[0-9]{9}$/;
        return regex.test(value) ? null : 'Please enter a valid phone number (e.g., 254712345678)';
    },
    
    minLength: (min) => (value) => {
        return value && value.length >= min ? null : `Must be at least ${min} characters`;
    },
    
    maxLength: (max) => (value) => {
        return value && value.length <= max ? null : `Must be no more than ${max} characters`;
    },
    
    number: (value) => {
        return !isNaN(value) && parseFloat(value) > 0 ? null : 'Please enter a valid number';
    },
    
    positiveNumber: (value) => {
        return parseFloat(value) > 0 ? null : 'Must be a positive number';
    },
    
    validateForm(formId, rules) {
        const form = document.getElementById(formId);
        if (!form) return false;
        
        let isValid = true;
        const errors = {};
        
        for (const [fieldName, fieldRules] of Object.entries(rules)) {
            const field = form.querySelector(`[name="${fieldName}"]`);
            if (!field) continue;
            
            for (const rule of fieldRules) {
                const error = rule(field.value);
                if (error) {
                    isValid = false;
                    errors[fieldName] = error;
                    break;
                }
            }
        }
        
        // Show errors
        for (const [fieldName, error] of Object.entries(errors)) {
            const field = form.querySelector(`[name="${fieldName}"]`);
            const errorEl = field.parentElement.querySelector('.error-message');
            
            if (errorEl) {
                errorEl.textContent = error;
                errorEl.style.display = 'block';
            } else {
                const newError = document.createElement('div');
                newError.className = 'error-message';
                newError.style.cssText = 'color:#EF4444;font-size:12px;margin-top:4px;';
                newError.textContent = error;
                field.parentElement.appendChild(newError);
            }
            
            field.style.borderColor = '#EF4444';
            
            field.addEventListener('input', () => {
                field.style.borderColor = '';
                const err = field.parentElement.querySelector('.error-message');
                if (err) err.remove();
            }, { once: true });
        }
        
        return isValid;
    }
};

// ==================== Format Helpers ====================
const Format = {
    currency: (amount, currency = 'KSh ') => {
        return currency + parseFloat(amount).toLocaleString();
    },
    
    date: (date, format = 'short') => {
        const d = new Date(date);
        if (format === 'short') {
            return d.toLocaleDateString();
        } else if (format === 'long') {
            return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        } else if (format === 'time') {
            return d.toLocaleTimeString();
        }
        return d.toLocaleString();
    },
    
    relativeTime: (date) => {
        const now = new Date();
        const d = new Date(date);
        const diff = now - d;
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes} min ago`;
        if (hours < 24) return `${hours} hours ago`;
        if (days < 7) return `${days} days ago`;
        
        return d.toLocaleDateString();
    },
    
    truncate: (str, length = 50) => {
        if (str.length <= length) return str;
        return str.substring(0, length) + '...';
    },
    
    phone: (phone) => {
        if (!phone) return '';
        // Format as 2547***1234
        if (phone.length >= 10) {
            return phone.substring(0, 3) + '***' + phone.substring(phone.length - 4);
        }
        return phone;
    }
};

// ==================== Add CSS Animations ====================
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
    
    @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
    }
    
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
    
    .fade-in { animation: fadeIn 0.3s ease; }
    .fade-out { animation: fadeOut 0.3s ease; }
`;
document.head.appendChild(style);

// Export for use in other files
if (typeof window !== 'undefined') {
    window.uiComponents = {
        toast,
        createSpinner,
        createSkeleton,
        createSkeletonLoader,
        createEmptyState,
        modalManager,
        confirmDialog,
        Validation,
        Format
    };
}
