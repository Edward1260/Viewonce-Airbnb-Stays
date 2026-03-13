// Luxury AI Dashboard for Host Dashboard - Simple Version
// Add this script to host-dashboard-upgraded.html and call renderAIDashboardView(container)

// Inject CSS styles
function injectLuxuryStyles() {
    if (document.getElementById('luxury-ai-styles')) return;
    
    var style = document.createElement('style');
    style.id = 'luxury-ai-styles';
    style.type = 'text/css';
    style.innerHTML = 
        '.luxury-ai-container { max-width: 1400px; margin: 0 auto; }' +
        '.ai-hero { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f172a 100%); border-radius: 24px; padding: 40px; margin-bottom: 30px; border: 1px solid rgba(251, 191, 36, 0.2); box-shadow: 0 0 40px rgba(251, 191, 36, 0.1); }' +
        '.ai-hero-title { font-size: 2.5rem; font-weight: 700; background: linear-gradient(135deg, #fbbf24, #f59e0b); -webkit-background-clip: text; -webkit-text-fill-color: transparent; color: #fbbf24; display: flex; align-items: center; gap: 15px; }' +
        '.ai-hero-subtitle { color: rgba(255, 255, 255, 0.7); font-size: 1.1rem; margin-top: 10px; }' +
        '.ai-stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }' +
        '.ai-stat-card { background: linear-gradient(135deg, rgba(26, 26, 46, 0.9), rgba(22, 33, 62, 0.9)); border: 1px solid rgba(251, 191, 36, 0.3); border-radius: 20px; padding: 24px; position: relative; transition: all 0.4s; }' +
        '.ai-stat-card:hover { transform: translateY(-5px); box-shadow: 0 20px 40px rgba(0,0,0,0.4), 0 0 30px rgba(251, 191, 36, 0.2); }' +
        '.ai-stat-icon { width: 50px; height: 50px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; margin-bottom: 15px; }' +
        '.ai-stat-icon.gold { background: linear-gradient(135deg, #fbbf24, #f59e0b); color: #1a1a2e; }' +
        '.ai-stat-icon.purple { background: linear-gradient(135deg, #8b5cf6, #6366f1); color: white; }' +
        '.ai-stat-icon.cyan { background: linear-gradient(135deg, #06b6d4, #0891b2); color: white; }' +
        '.ai-stat-icon.pink { background: linear-gradient(135deg, #ec4899, #db2777); color: white; }' +
        '.ai-stat-value { font-size: 2rem; font-weight: 700; color: white; margin-bottom: 5px; }' +
        '.ai-stat-label { color: rgba(255, 255, 255, 0.6); font-size: 0.9rem; }' +
        '.ai-stat-trend { position: absolute; top: 20px; right: 20px; padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; }' +
        '.ai-stat-trend.up { background: rgba(16, 185, 129, 0.2); color: #10b981; }' +
        '.ai-prediction-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }' +
        '.ai-prediction-card { background: linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(6, 182, 212, 0.1)); border: 1px solid rgba(6, 182, 212, 0.3); border-radius: 20px; padding: 24px; text-align: center; }' +
        '.ai-prediction-value { font-size: 2.5rem; font-weight: 700; color: #06b6d4; margin-bottom: 5px; }' +
        '.ai-prediction-label { color: rgba(255, 255, 255, 0.7); font-size: 0.9rem; }' +
        '.ai-prediction-trend { display: inline-flex; align-items: center; gap: 5px; padding: 4px 12px; background: rgba(16, 185, 129, 0.2); border-radius: 20px; font-size: 0.8rem; color: #10b981; margin-top: 10px; }' +
        '.ai-insights-panel { background: linear-gradient(135deg, rgba(26, 26, 46, 0.9), rgba(22, 33, 62, 0.9)); border: 1px solid rgba(6, 182, 212, 0.3); border-radius: 24px; padding: 30px; margin-bottom: 30px; }' +
        '.ai-insights-title { font-size: 1.5rem; font-weight: 700; color: white; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }' +
        '.ai-insight-item { display: flex; align-items: flex-start; gap: 15px; padding: 15px; background: rgba(255, 255, 255, 0.05); border-radius: 14px; margin-bottom: 12px; }' +
        '.ai-insight-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }' +
        '.ai-insight-content h4 { color: white; font-weight: 600; margin-bottom: 5px; }' +
        '.ai-insight-content p { color: rgba(255, 255, 255, 0.6); font-size: 0.9rem; line-height: 1.5; }' +
        '.ai-chart-section { background: linear-gradient(135deg, rgba(26, 26, 46, 0.9), rgba(22, 33, 62, 0.9)); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 24px; padding: 30px; margin-bottom: 30px; }' +
        '.ai-chart-title { font-size: 1.3rem; font-weight: 700; color: white; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }' +
        '.ai-chart-container { height: 200px; position: relative; background: rgba(0, 0, 0, 0.2); border-radius: 16px; padding: 20px; }' +
        '.ai-mini-chart { display: flex; align-items: flex-end; justify-content: space-between; height: 100%; gap: 8px; }' +
        '.ai-chart-bar { flex: 1; background: linear-gradient(to top, rgba(139, 92, 246, 0.6), rgba(6, 182, 212, 0.6)); border-radius: 8px 8px 0 0; min-height: 20px; }' +
        '@media (max-width: 768px) { .ai-hero-title { font-size: 1.8rem; } .ai-stats-grid { grid-template-columns: 1fr; } }';
    
    document.head.appendChild(style);
}

// Render AI Dashboard View
function renderAIDashboardView(container) {
    injectLuxuryStyles();
    
    var html = '';
    html += '<div class="luxury-ai-container">';
    
    // Hero Section
    html += '<div class="ai-hero">';
    html += '<h1 class="ai-hero-title"><i class="fas fa-robot"></i> AI Analytics Dashboard</h1>';
    html += '<p class="ai-hero-subtitle">Powered by ViewOnce AI - Get intelligent insights for your properties</p>';
    html += '</div>';
    
    // Stats Grid
    html += '<div class="ai-stats-grid">';
    html += '<div class="ai-stat-card"><span class="ai-stat-trend up">+12%</span><div class="ai-stat-icon gold"><i class="fas fa-dollar-sign"></i></div><div class="ai-stat-value">KSh 245K</div><div class="ai-stat-label">Total Revenue</div></div>';
    html += '<div class="ai-stat-card"><span class="ai-stat-trend up">+8%</span><div class="ai-stat-icon purple"><i class="fas fa-calendar-check"></i></div><div class="ai-stat-value">48</div><div class="ai-stat-label">Total Bookings</div></div>';
    html += '<div class="ai-stat-card"><span class="ai-stat-trend up">+5%</span><div class="ai-stat-icon cyan"><i class="fas fa-percentage"></i></div><div class="ai-stat-value">78%</div><div class="ai-stat-label">Occupancy Rate</div></div>';
    html += '<div class="ai-stat-card"><span class="ai-stat-trend up">+0.3</span><div class="ai-stat-icon pink"><i class="fas fa-star"></i></div><div class="ai-stat-value">4.8</div><div class="ai-stat-label">Avg Rating</div></div>';
    html += '</div>';
    
    // Prediction Grid
    html += '<div class="ai-prediction-grid">';
    html += '<div class="ai-prediction-card"><div class="ai-prediction-value">+15%</div><div class="ai-prediction-label">Next Month Revenue</div><div class="ai-prediction-trend"><i class="fas fa-arrow-up"></i> Predicted</div></div>';
    html += '<div class="ai-prediction-card"><div class="ai-prediction-value">92%</div><div class="ai-prediction-label">Booking Probability</div><div class="ai-prediction-trend"><i class="fas fa-chart-line"></i> High</div></div>';
    html += '<div class="ai-prediction-card"><div class="ai-prediction-value">KSh 8.5K</div><div class="ai-prediction-label">Avg Nightly Rate</div><div class="ai-prediction-trend"><i class="fas fa-tags"></i> Optimized</div></div>';
    html += '</div>';
    
    // Insights Panel
    html += '<div class="ai-insights-panel">';
    html += '<h2 class="ai-insights-title"><i class="fas fa-lightbulb" style="color: #06b6d4;"></i> AI Insights</h2>';
    html += '<div class="ai-insight-item"><div class="ai-insight-icon" style="background: linear-gradient(135deg, #10b981, #059669);"><i class="fas fa-chart-line" style="color: white;"></i></div><div class="ai-insight-content"><h4>Revenue Optimization</h4><p>Based on current demand, we recommend increasing your weekend prices by 15% to maximize revenue.</p></div></div>';
    html += '<div class="ai-insight-item"><div class="ai-insight-icon" style="background: linear-gradient(135deg, #8b5cf6, #6366f1);"><i class="fas fa-users" style="color: white;"></i></div><div class="ai-insight-content"><h4>Guest Behavior</h4><p>70% of your bookings come from repeat guests. Consider creating a loyalty program.</p></div></div>';
    html += '<div class="ai-insight-item"><div class="ai-insight-icon" style="background: linear-gradient(135deg, #06b6d4, #0891b2);"><i class="fas fa-calendar" style="color: white;"></i></div><div class="ai-insight-content"><h4>Booking Forecast</h4><p>High demand expected next month. Ensure your calendar is up to date for maximum visibility.</p></div></div>';
    html += '</div>';
    
    // Chart Section
    html += '<div class="ai-chart-section">';
    html += '<h2 class="ai-chart-title"><i class="fas fa-chart-bar" style="color: #8b5cf6;"></i> Revenue Analytics</h2>';
    html += '<div class="ai-chart-container"><div class="ai-mini-chart">';
    html += '<div class="ai-chart-bar" style="height: 45%;"></div>';
    html += '<div class="ai-chart-bar" style="height: 65%;"></div>';
    html += '<div class="ai-chart-bar" style="height: 55%;"></div>';
    html += '<div class="ai-chart-bar" style="height: 80%;"></div>';
    html += '<div class="ai-chart-bar" style="height: 70%;"></div>';
    html += '<div class="ai-chart-bar" style="height: 90%;"></div>';
    html += '<div class="ai-chart-bar" style="height: 75%;"></div>';
    html += '</div></div>';
    html += '</div>';
    
    html += '</div>';
    
    container.innerHTML = html;
}

// Make function globally available
window.renderAIDashboardView = renderAIDashboardView;
