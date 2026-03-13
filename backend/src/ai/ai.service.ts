import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Booking } from '../entities/booking.entity';
import { Property } from '../entities/property.entity';
import { AuditLog } from '../entities/audit-log.entity';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sessionId: string;
}

interface AutomationRule {
  id: string;
  name: string;
  description: string;
  conditions: any;
  actions: any;
  active: boolean;
  createdAt: Date;
}

interface SavedReport {
  id: string;
  name: string;
  type: string;
  data: any;
  createdAt: Date;
}

interface IntentClassification {
  intent: 'analytics' | 'user_control' | 'booking_override' | 'refund_review' | 'report_export' | 'system_monitoring' | 'general_inquiry';
  confidence: number;
  entities: Record<string, any>;
  required_backend_action?: string;
  clarification_needed: boolean;
}

interface AIStructuredResponse {
  intent: IntentClassification;
  response: string;
  data?: any;
  actions?: string[];
  audit_log_entry?: {
    action: string;
    details: any;
    user_id: string;
    timestamp: Date;
  };
}

@Injectable()
export class AiService {
  private chatHistory: Map<string, ChatMessage[]> = new Map();
  private automationRules: AutomationRule[] = [];
  private savedReports: SavedReport[] = [];

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(Property)
    private propertyRepository: Repository<Property>,
  ) {
    this.initializeDefaultRules();
  }

  private initializeDefaultRules() {
    this.automationRules = [
      {
        id: '1',
        name: 'High-Value Booking Alert',
        description: 'Notify admin for bookings over Ksh 50,000',
        conditions: { bookingValue: { gt: 50000 } },
        actions: { notifyAdmin: true, priority: 'high' },
        active: true,
        createdAt: new Date(),
      },
      {
        id: '2',
        name: 'Fraud Detection',
        description: 'Flag suspicious booking patterns',
        conditions: { suspiciousActivity: true },
        actions: { flagBooking: true, requireReview: true },
        active: true,
        createdAt: new Date(),
      },
      {
        id: '3',
        name: 'Low Occupancy Alert',
        description: 'Alert for properties with low occupancy',
        conditions: { occupancyRate: { lt: 30 } },
        actions: { notifyHost: true, suggestPromotion: true },
        active: false,
        createdAt: new Date(),
      },
    ];
  }

  async processChatMessage(message: string, sessionId: string, userId: string): Promise<AIStructuredResponse> {
    // Store user message
    const userMessage: ChatMessage = {
      id: this.generateId(),
      role: 'user',
      content: message,
      timestamp: new Date(),
      sessionId,
    };

    if (!this.chatHistory.has(sessionId)) {
      this.chatHistory.set(sessionId, []);
    }
    this.chatHistory.get(sessionId)!.push(userMessage);

    // Classify intent and generate structured response
    const structuredResponse = await this.generateStructuredAIResponse(message, userId);

    // Store AI response
    const aiMessage: ChatMessage = {
      id: this.generateId(),
      role: 'assistant',
      content: structuredResponse.response,
      timestamp: new Date(),
      sessionId,
    };
    this.chatHistory.get(sessionId)!.push(aiMessage);

    // Log audit entry if action was taken
    if (structuredResponse.audit_log_entry) {
      await this.logAuditEntry(structuredResponse.audit_log_entry);
    }

    return structuredResponse;
  }

  async getChatHistory(sessionId: string): Promise<ChatMessage[]> {
    return this.chatHistory.get(sessionId) || [];
  }

  async getAllSessions(): Promise<string[]> {
    return Array.from(this.chatHistory.keys());
  }

  async generateAnalyticsInsights(): Promise<any> {
    const totalUsers = await this.userRepository.count();
    const totalBookings = await this.bookingRepository.count();
    const totalProperties = await this.propertyRepository.count();

    const revenueResult = await this.bookingRepository
      .createQueryBuilder('booking')
      .select('SUM(booking.totalPrice)', 'total')
      .where('booking.status = :status', { status: 'completed' })
      .getRawOne();

    const insights = {
      summary: {
        totalUsers,
        totalBookings,
        totalProperties,
        totalRevenue: parseFloat(revenueResult?.total || 0),
      },
      trends: {
        userGrowth: await this.calculateGrowthRate('users'),
        bookingGrowth: await this.calculateGrowthRate('bookings'),
        revenueGrowth: await this.calculateGrowthRate('revenue'),
      },
      predictions: {
        nextMonthRevenue: await this.predictRevenue(),
        occupancyTrend: await this.predictOccupancy(),
        demandHotspots: await this.identifyDemandHotspots(),
      },
      recommendations: [
        'Increase marketing spend in high-demand areas',
        'Optimize pricing for underperforming properties',
        'Enhance host onboarding process',
      ],
    };

    return insights;
  }

  async getAutomationRules(): Promise<AutomationRule[]> {
    return this.automationRules;
  }

  async createAutomationRule(rule: Omit<AutomationRule, 'id' | 'createdAt'>): Promise<AutomationRule> {
    const newRule: AutomationRule = {
      ...rule,
      id: this.generateId(),
      createdAt: new Date(),
    };
    this.automationRules.push(newRule);
    return newRule;
  }

  async updateAutomationRule(id: string, updates: Partial<AutomationRule>): Promise<AutomationRule | null> {
    const index = this.automationRules.findIndex(rule => rule.id === id);
    if (index === -1) return null;

    this.automationRules[index] = { ...this.automationRules[index], ...updates };
    return this.automationRules[index];
  }

  async deleteAutomationRule(id: string): Promise<boolean> {
    const index = this.automationRules.findIndex(rule => rule.id === id);
    if (index === -1) return false;

    this.automationRules.splice(index, 1);
    return true;
  }

  async getSavedReports(): Promise<SavedReport[]> {
    return this.savedReports;
  }

  async saveReport(name: string, type: string, data: any): Promise<SavedReport> {
    const report: SavedReport = {
      id: this.generateId(),
      name,
      type,
      data,
      createdAt: new Date(),
    };
    this.savedReports.push(report);
    return report;
  }

  async executeAutomationRules(data: any): Promise<any[]> {
    const triggeredActions = [];

    for (const rule of this.automationRules) {
      if (!rule.active) continue;

      if (this.evaluateConditions(rule.conditions, data)) {
        triggeredActions.push({
          ruleId: rule.id,
          ruleName: rule.name,
          actions: rule.actions,
        });
      }
    }

    return triggeredActions;
  }

  private async generateAIResponse(message: string, userId: string): Promise<string> {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('dashboard') || lowerMessage.includes('overview')) {
      const stats = await this.getQuickStats();
      return `Here's your current dashboard overview:\n\n• Total Users: ${stats.users}\n• Active Bookings: ${stats.bookings}\n• Total Revenue: Ksh ${stats.revenue.toLocaleString()}\n• System Health: ${stats.health}%\n\nIs there anything specific you'd like me to analyze or help you with?`;
    }

    if (lowerMessage.includes('analytics') || lowerMessage.includes('insights')) {
      const insights = await this.generateAnalyticsInsights();
      return `Based on current data, here are key insights:\n\n📈 Revenue Growth: ${insights.trends.revenueGrowth}%\n👥 User Growth: ${insights.trends.userGrowth}%\n🏠 Properties: ${insights.summary.totalProperties}\n\nNext month revenue prediction: Ksh ${insights.predictions.nextMonthRevenue.toLocaleString()}\n\nWould you like me to generate a detailed report?`;
    }

    if (lowerMessage.includes('automation') || lowerMessage.includes('rules')) {
      const rules = await this.getAutomationRules();
      const activeRules = rules.filter(r => r.active);
      return `You have ${activeRules.length} active automation rules:\n\n${activeRules.map(r => `• ${r.name}: ${r.description}`).join('\n')}\n\nWould you like me to create a new rule or modify existing ones?`;
    }

    if (lowerMessage.includes('help') || lowerMessage.includes('what can you do')) {
      return `I'm your AI Executive Assistant. I can help with:\n\n🤖 Chat & Analysis\n• Real-time dashboard insights\n• Predictive analytics\n• Performance monitoring\n\n⚙️ Automation\n• Create smart rules\n• Monitor system health\n• Alert management\n\n📊 Reports\n• Generate executive summaries\n• Save custom reports\n• Trend analysis\n\n💬 Just ask me anything about your platform!`;
    }

    // Default response
    return `I understand you're asking about "${message}". As your AI Executive Assistant, I can provide insights on user analytics, booking trends, revenue forecasting, automation rules, and system performance. What specific area would you like me to focus on?`;
  }

  private async getQuickStats(): Promise<any> {
    const users = await this.userRepository.count();
    const bookings = await this.bookingRepository.count({ where: { status: 'active' } });
    const revenueResult = await this.bookingRepository
      .createQueryBuilder('booking')
      .select('SUM(booking.totalPrice)', 'total')
      .where('booking.status = :status', { status: 'completed' })
      .getRawOne();

    return {
      users,
      bookings,
      revenue: parseFloat(revenueResult?.total || 0),
      health: 98, // Mock health score
    };
  }

  private async calculateGrowthRate(metric: string): Promise<number> {
    // Simplified growth calculation - in production, compare with previous period
    return Math.random() * 20 + 5; // Random growth between 5-25%
  }

  private async predictRevenue(): Promise<number> {
    const currentRevenue = await this.getQuickStats();
    const growthRate = await this.calculateGrowthRate('revenue');
    return currentRevenue.revenue * (1 + growthRate / 100);
  }

  private async predictOccupancy(): Promise<string> {
    return 'Increasing - expect 15% growth next quarter';
  }

  private async identifyDemandHotspots(): Promise<string[]> {
    return ['Nairobi CBD', 'Mombasa Beachfront', 'Kilimani'];
  }

  private evaluateConditions(conditions: any, data: any): boolean {
    // Simple condition evaluation - in production, use a proper rule engine
    for (const [key, value] of Object.entries(conditions)) {
      if (typeof value === 'object' && value !== null) {
        const operator = Object.keys(value)[0];
        const threshold = (value as any)[operator];

        switch (operator) {
          case 'gt':
            if (!(data[key] > threshold)) return false;
            break;
          case 'lt':
            if (!(data[key] < threshold)) return false;
            break;
          case 'eq':
            if (data[key] !== threshold) return false;
            break;
        }
      } else {
        if (data[key] !== value) return false;
      }
    }
    return true;
  }

  private async generateStructuredAIResponse(message: string, userId: string): Promise<AIStructuredResponse> {
    // Classify the intent of the message
    const intent = await this.classifyIntent(message);

    // If confidence is too low, request clarification
    if (intent.clarification_needed) {
      return {
        intent,
        response: `I need clarification on your request. Could you please provide more specific details about what you'd like me to help you with? My confidence in understanding your request is only ${intent.confidence.toFixed(1)}%.`,
        actions: ['request_clarification']
      };
    }

    // Generate response based on intent
    const response = await this.generateIntentBasedResponse(intent, message, userId);

    return response;
  }

  private async classifyIntent(message: string): Promise<IntentClassification> {
    const lowerMessage = message.toLowerCase();

    // Analytics intent
    if (lowerMessage.includes('analytics') || lowerMessage.includes('insights') ||
        lowerMessage.includes('report') || lowerMessage.includes('dashboard') ||
        lowerMessage.includes('overview') || lowerMessage.includes('statistics')) {
      return {
        intent: 'analytics',
        confidence: 0.95,
        entities: this.extractAnalyticsEntities(message),
        clarification_needed: false
      };
    }

    // User control intent
    if (lowerMessage.includes('user') || lowerMessage.includes('customer') ||
        lowerMessage.includes('account') || lowerMessage.includes('profile') ||
        lowerMessage.includes('ban') || lowerMessage.includes('suspend')) {
      return {
        intent: 'user_control',
        confidence: 0.90,
        entities: this.extractUserEntities(message),
        required_backend_action: 'user_management',
        clarification_needed: false
      };
    }

    // Booking override intent
    if (lowerMessage.includes('booking') || lowerMessage.includes('reservation') ||
        lowerMessage.includes('cancel') || lowerMessage.includes('modify') ||
        lowerMessage.includes('override')) {
      return {
        intent: 'booking_override',
        confidence: 0.88,
        entities: this.extractBookingEntities(message),
        required_backend_action: 'booking_management',
        clarification_needed: false
      };
    }

    // Refund review intent
    if (lowerMessage.includes('refund') || lowerMessage.includes('payment') ||
        lowerMessage.includes('chargeback') || lowerMessage.includes('money back')) {
      return {
        intent: 'refund_review',
        confidence: 0.92,
        entities: this.extractRefundEntities(message),
        required_backend_action: 'refund_processing',
        clarification_needed: false
      };
    }

    // Report export intent
    if (lowerMessage.includes('export') || lowerMessage.includes('download') ||
        lowerMessage.includes('csv') || lowerMessage.includes('pdf') ||
        lowerMessage.includes('save report')) {
      return {
        intent: 'report_export',
        confidence: 0.85,
        entities: this.extractReportEntities(message),
        required_backend_action: 'report_generation',
        clarification_needed: false
      };
    }

    // System monitoring intent
    if (lowerMessage.includes('system') || lowerMessage.includes('health') ||
        lowerMessage.includes('performance') || lowerMessage.includes('monitor') ||
        lowerMessage.includes('status')) {
      return {
        intent: 'system_monitoring',
        confidence: 0.90,
        entities: this.extractSystemEntities(message),
        clarification_needed: false
      };
    }

    // General inquiry - low confidence
    return {
      intent: 'general_inquiry',
      confidence: 0.60,
      entities: {},
      clarification_needed: true
    };
  }

  private extractAnalyticsEntities(message: string): Record<string, any> {
    const entities: Record<string, any> = {};
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('revenue') || lowerMessage.includes('sales')) {
      entities.metric = 'revenue';
    }
    if (lowerMessage.includes('users') || lowerMessage.includes('customers')) {
      entities.metric = 'users';
    }
    if (lowerMessage.includes('bookings') || lowerMessage.includes('reservations')) {
      entities.metric = 'bookings';
    }

    return entities;
  }

  private extractUserEntities(message: string): Record<string, any> {
    const entities: Record<string, any> = {};
    // Extract user IDs, emails, etc. from message
    const emailMatch = message.match(/[\w.-]+@[\w.-]+\.\w+/);
    if (emailMatch) {
      entities.email = emailMatch[0];
    }
    return entities;
  }

  private extractBookingEntities(message: string): Record<string, any> {
    const entities: Record<string, any> = {};
    // Extract booking IDs, dates, etc.
    const idMatch = message.match(/booking[#\s]*(\d+)/i);
    if (idMatch) {
      entities.bookingId = idMatch[1];
    }
    return entities;
  }

  private extractRefundEntities(message: string): Record<string, any> {
    const entities: Record<string, any> = {};
    // Extract amounts, booking references, etc.
    const amountMatch = message.match(/(\d+(?:\.\d{2})?)/);
    if (amountMatch) {
      entities.amount = parseFloat(amountMatch[0]);
    }
    return entities;
  }

  private extractReportEntities(message: string): Record<string, any> {
    const entities: Record<string, any> = {};
    if (message.toLowerCase().includes('csv')) {
      entities.format = 'csv';
    } else if (message.toLowerCase().includes('pdf')) {
      entities.format = 'pdf';
    }
    return entities;
  }

  private extractSystemEntities(message: string): Record<string, any> {
    return {}; // System monitoring doesn't need specific entities
  }

  private async generateIntentBasedResponse(
    intent: IntentClassification,
    message: string,
    userId: string
  ): Promise<AIStructuredResponse> {
    const baseResponse: AIStructuredResponse = {
      intent,
      response: '',
      data: {},
      actions: []
    };

    switch (intent.intent) {
      case 'analytics':
        const analyticsData = await this.generateAnalyticsInsights();
        baseResponse.response = `Here's your analytics overview:\n\n📊 **Summary**\n• Total Users: ${analyticsData.summary.totalUsers}\n• Total Bookings: ${analyticsData.summary.totalBookings}\n• Total Revenue: Ksh ${analyticsData.summary.totalRevenue.toLocaleString()}\n\n📈 **Trends**\n• User Growth: ${analyticsData.trends.userGrowth.toFixed(1)}%\n• Booking Growth: ${analyticsData.trends.bookingGrowth.toFixed(1)}%\n• Revenue Growth: ${analyticsData.trends.revenueGrowth.toFixed(1)}%\n\n🔮 **Predictions**\n• Next Month Revenue: Ksh ${analyticsData.predictions.nextMonthRevenue.toLocaleString()}`;
        baseResponse.data = analyticsData;
        break;

      case 'user_control':
        baseResponse.response = `I understand you want to manage user accounts. For security reasons, I cannot directly modify user data. Please use the admin panel's user management section to make changes. Would you like me to guide you to the relevant section?`;
        baseResponse.actions = ['redirect_to_user_management'];
        break;

      case 'booking_override':
        baseResponse.response = `For booking modifications, I need to route this through our secure booking management system. Please provide the booking ID and I'll help you navigate to the appropriate admin section.`;
        baseResponse.actions = ['request_booking_details', 'redirect_to_booking_management'];
        break;

      case 'refund_review':
        baseResponse.response = `Refund requests require careful review. I'll help you initiate the refund process through our secure financial system. Please provide the booking reference and amount.`;
        baseResponse.actions = ['request_refund_details', 'redirect_to_payouts'];
        baseResponse.audit_log_entry = {
          action: 'refund_inquiry',
          details: { message, userId },
          user_id: userId,
          timestamp: new Date()
        };
        break;

      case 'report_export':
        const reportData = await this.generateAnalyticsInsights();
        const report = await this.saveReport(`AI Generated Report - ${new Date().toISOString()}`, 'analytics', reportData);
        baseResponse.response = `I've generated and saved a comprehensive analytics report. You can download it from the Reports section. The report includes real-time data on users, bookings, revenue, and predictions.`;
        baseResponse.data = { reportId: report.id };
        baseResponse.actions = ['redirect_to_reports'];
        break;

      case 'system_monitoring':
        const systemStats = await this.getSystemHealth();
        baseResponse.response = `System Status: ${systemStats.overall}\n\n🔧 **Performance Metrics**\n• CPU Usage: ${systemStats.cpu}%\n• Memory Usage: ${systemStats.memory}%\n• Response Time: ${systemStats.responseTime}ms\n• Active Connections: ${systemStats.connections}\n\n🔔 **Active Alerts**\n${systemStats.alerts.map((alert: any) => `• ${alert.message}`).join('\n')}`;
        baseResponse.data = systemStats;
        break;

      default:
        baseResponse.response = `I'm your secure AI Operations Assistant. I can help with:\n\n📊 **Analytics** - Dashboard insights and reports\n👥 **User Management** - Account controls and monitoring\n🏨 **Booking Oversight** - Reservation management\n💰 **Financial Operations** - Refunds and payouts\n📈 **System Monitoring** - Performance and health\n\nWhat would you like to focus on?`;
    }

    return baseResponse;
  }

  private async getSystemHealth(): Promise<any> {
    // Mock system health data - in production, integrate with monitoring service
    return {
      overall: 'Healthy',
      cpu: 45,
      memory: 62,
      responseTime: 120,
      connections: 156,
      alerts: [
        { level: 'info', message: 'Scheduled maintenance in 2 hours' },
        { level: 'warning', message: 'High memory usage on server-2' }
      ]
    };
  }

  private async logAuditEntry(entry: { action: string; details: any; user_id: string; timestamp: Date }): Promise<void> {
    // In production, this would save to audit log database
    Logger.log(`AUDIT: ${entry.action} by ${entry.user_id} at ${entry.timestamp.toISOString()}`, 'AIService');
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  async generateColorScheme(theme: string, style: string, baseColor: string): Promise<any> {
    // Generate a color scheme based on theme, style, and base color
    const colorSchemes: Record<string, any> = {
      luxury: {
        primary: '#D4AF37',
        secondary: '#1A1A1A',
        accent: '#C0C0C0',
        background: '#0A0A0A',
        text: '#FFFFFF'
      },
      modern: {
        primary: '#3B82F6',
        secondary: '#1E293B',
        accent: '#06B6D4',
        background: '#F8FAFC',
        text: '#0F172A'
      },
      nature: {
        primary: '#22C55E',
        secondary: '#14532D',
        accent: '#84CC16',
        background: '#F0FDF4',
        text: '#052E16'
      },
      beach: {
        primary: '#0EA5E9',
        secondary: '#164E63',
        accent: '#FCD34D',
        background: '#F0F9FF',
        text: '#0C4A6E'
      },
      default: {
        primary: baseColor || '#6366F1',
        secondary: '#4F46E5',
        accent: '#8B5CF6',
        background: '#FFFFFF',
        text: '#1F2937'
      }
    };

    return colorSchemes[theme] || colorSchemes.default;
  }
}
