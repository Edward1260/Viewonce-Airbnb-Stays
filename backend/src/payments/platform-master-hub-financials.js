/**
 * Platform Master Hub - Financial Analytics Component
 * Handles the visual breakdown of Revenue (Commissions vs Subscriptions)
 */

(function() {
    // 1. Define the Financial Dashboard Logic
    window.masterFinancials = {
        stats: null,
        chart: null,
        trendChart: null,
        filters: {
            startDate: '',
            endDate: ''
        },

        /**
         * Initialize the dashboard and fetch data
         */
        init: async function(filters = {}) {
            const container = document.getElementById('master-financial-overview');
            if (!container) return;

            // Render skeleton/loading state
            if (!this.stats) container.innerHTML = '<div class="loading-spinner">Loading Financial Intelligence...</div>';

            try {
                this.filters = { ...this.filters, ...filters };
                this.stats = await window.api.getMasterFinancialStats(this.filters);
                this.render();
            } catch (error) {
                console.error('Master Financial Fetch Failed:', error);
                container.innerHTML = `<div class="alert error">Failed to load financial data: ${error.message}</div>`;
            }
        },

        /**
         * Render the data into the UI
         */
        render: function() {
            const container = document.getElementById('master-financial-overview');
            if (!this.stats || !container) return;

            const { revenueBreakdown, marketMetrics } = this.stats;

            container.innerHTML = `
                <div class="financial-controls glassmorphism">
                    <div class="date-picker-group">
                        <label>Period:</label>
                        <input type="date" id="statsStartDate" value="${this.filters.startDate || ''}">
                        <span>to</span>
                        <input type="date" id="statsEndDate" value="${this.filters.endDate || ''}">
                        <=iiv>
                    </div>
                </div>
                <div class="financial-grid">
                    <!-- Key Metrics -->
                    <div class="metrics-sidebar">
                        <div class="metric-card glassmorphism">
                            <label>Total Platform Earnings</label>
                            <div class="value">Ksh ${revenueBreakdown.totalPlatformEarnings.toLocaleString()}</div>
                        </div>
                        <div class="metric-card glassmorphism">
                            <label>Gross Booking Volume</label>
                            <div class="value">Ksh ${marketMetrics.grossBookingVolume.toLocaleString()}</div>
                        </div>
                        <div class="metric-card glassmorphism">
                            <label>Avg Booking Value</label>
                            <div class="value">Ksh ${marketMetrics.averageBookingValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                        </div>
                        <div class="metric-card glassmorphism">
                            <label>New Host Signups</label>
                            <div class="value">${marketMetrics.newHostSignups.toLocaleString()}</div>
                        </div>
                        <div class="metric-card glassmorphism">
                            <label>Platform Take Rate</label>
                            <div class="value">${marketMetrics.platformTakeRate.toFixed(2)}%</div>
                        </div>
                        <div class="metric-card glassmorphism">
                            <label>Revenue Growth (MoM)</label>
                            <div class="value ${revenueBreakdown.momGrowth >= 0 ? 'trend-up' : 'trend-down'}">
                                ${revenueBreakdown.momGrowth >= 0 ? '▲' : '▼'} ${Math.abs(revenueBreakdown.momGrowth).toFixed(1)}%
                            </div>
                        </div>
                        <div class="metric-card glassmorphism">
                            <label>Host Growth (MoM)</label>
                            <div class="value ${revenueBreakdown.hostGrowth >= 0 ? 'trend-up' : 'trend-down'}">
                                ${revenueBreakdown.hostGrowth >= 0 ? '▲' : '▼'} ${Math.abs(revenueBreakdown.hostGrowth).toFixed(1)}%
                            </div>
                        </div>
                    </div>

                    <div class="charts-area">
                        <div class="chart-container glassmorphism">
                            <h3>Revenue Breakdown</h3>
                            <canvas id="revenueBreakdownChart"></canvas>
                            <div class="chart-legend">
                                <div class="legend-item">
                                    <span class="dot commission"></span>
                                    <span>8% Booking Commissions: <strong>Ksh ${revenueBreakdown.commissionRevenue.toLocaleString()}</strong></span>
                                </div>
                                <div class="legend-item">
                                    <span class="dot subscription"></span>
                                    <span>Subscription Income: <strong>Ksh ${revenueBreakdown.subscriptionRevenue.toLocaleString()}</strong></span>
                                </div>
                            </div>
                        </div>
                        <div class="chart-container glassmorphism trend-chart-container">
                            <h3>Gross Booking Volume Trend (6M)</h3>
                            <canvas id="gbvTrendChart"></canvas>
                        </div>
                    </div>
                </div>
            `;

            this.initChart(revenueBreakdown);
            this.initTrendChart(marketMetrics.gbvTrend);
        },

        /**
         * Update filters and re-fetch
         */
        updateFilters: function() {
            const startDate = document.getElementById('statsStartDate').value;
            const endDate = document.getElementById('statsEndDate').value;
            this.init({
                startDate,
                endDate
            });
        },

        /**
         * Generate and download CSV report
         */
        exportToCSV: function() {
            if (!this.stats) return;
            const { revenueBreakdown, marketMetrics } = this.stats;
            
            let csvContent = "data:text/csv;charset=utf-8,";
            csvContent += "Metric,Value\n";
            csvContent += `Total Platform Earnings,${revenueBreakdown.totalPlatformEarnings}\n`;
            csvContent += `Commission Revenue,${revenueBreakdown.commissionRevenue}\n`;
            csvContent += `Subscription Revenue,${revenueBreakdown.subscriptionRevenue}\n`;
            csvContent += `Revenue Growth (MoM),${revenueBreakdown.momGrowth.toFixed(2)}%\n`;
            csvContent += `Gross Booking Volume,${marketMetrics.grossBookingVolume}\n`;
            csvContent += `Avg Booking Value,${marketMetrics.averageBookingValue}\n`;
            csvContent += `New Host Signups,${marketMetrics.newHostSignups}\n`;
            csvContent += `Host Growth (MoM),${revenueBreakdown.hostGrowth.toFixed(2)}%\n`;
            csvContent += `Platform Take Rate,${marketMetrics.platformTakeRate.toFixed(2)}%\n`;
            
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `master_hub_report_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        },

        /**
         * Initialize Chart.js
         */
        initChart: function(data) {
            const ctx = document.getElementById('revenueBreakdownChart').getContext('2d');
            
            // Cleanup existing chart instance if any
            if (this.chart) this.chart.destroy();

            this.chart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Booking Commissions', 'Subscriptions'],
                    datasets: [{
                        data: [data.commissionRevenue, data.subscriptionRevenue],
                        backgroundColor: ['#CC9AA1', '#333333'],
                        borderWidth: 0,
                        hoverOffset: 10
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    cutout: '70%'
                }
            });
        },

        /**
         * Initialize Line Chart for Trends
         */
        initTrendChart: function(trendData) {
            const ctx = document.getElementById('gbvTrendChart').getContext('2d');
            if (this.trendChart) this.trendChart.destroy();

            this.trendChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: trendData.map(d => d.month),
                    datasets: [{
                        label: 'Gross Volume (Ksh)',
                        data: trendData.map(d => d.value),
                        borderColor: '#CC9AA1',
                        backgroundColor: 'rgba(204, 154, 161, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { 
                            beginAtZero: true, 
                            ticks: { callback: value => 'Ksh ' + (value / 1000) + 'k' } 
                        }
                    }
                }
            });
        }
    };

    // 2. Inject Required CSS
    const style = document.createElement('style');
    style.textContent = `
        #master-financial-overview { margin-top: 20px; }
        .financial-controls { padding: 15px 25px; border-radius: 15px; margin-bottom: 20px; }
        .date-picker-group { display: flex; align-items: center; gap: 15px; }
        .date-picker-group label { font-weight: bold; color: #CC9AA1; }
        .date-picker-group input { background: rgba(255,255,255,0.05); border: 1px solid rgba(204, 154, 161, 0.3); color: white; padding: 5px 10px; border-radius: 5px; outline: none; }
        .btn-small { padding: 5px 15px !important; font-size: 12px !important; }

        .financial-grid { display: grid; grid-template-columns: 300px 1fr; gap: 20px; }
        .metrics-sidebar { display: flex; flex-direction: column; gap: 15px; }
        .metric-card { padding: 20px; border-radius: 12px; }
        .metric-card label { font-size: 12px; text-transform: uppercase; color: var(--muted); letter-spacing: 1px; }
        .metric-card .value { font-size: 24px; font-weight: bold; margin-top: 5px; color: #CC9AA1; }
        .metric-card .value.trend-up { color: #10B981; }
        .metric-card .value.trend-down { color: #EF4444; }
        
        .charts-area { display: flex; flex-direction: column; gap: 20px; }
        .chart-container { padding: 25px; border-radius: 15px; position: relative; height: 400px; display: flex; flex-direction: column; }
        .chart-container h3 { margin-bottom: 20px; font-family: 'Playfair Display', serif; }
        .chart-container canvas { flex-grow: 1; max-height: 250px; }
        .trend-chart-container { height: 350px; }
        
        .chart-legend { margin-top: 20px; display: flex; flex-direction: column; gap: 10px; }
        .legend-item { display: flex; align-items: center; gap: 10px; font-size: 14px; }
        .dot { width: 12px; height: 12px; border-radius: 50%; }
        .dot.commission { background: #CC9AA1; }
        .dot.subscription { background: #333333; }
    `;
    document.head.appendChild(style);

    // 3. Auto-init when DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
        if (window.location.pathname.includes('platform-master-hub')) {
            window.masterFinancials.init();
        }
    });
})();