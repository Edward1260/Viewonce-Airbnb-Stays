import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.CUSTOMER, UserRole.HOST, UserRole.SUPPORT)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  async sendMessage(
    @Req() req,
    @Body() body: { message: string; context?: any },
  ) {
    try {
      const response = await this.aiService.handleChatMessage(req.user, body);
      return {
        success: true,
        data: {
          response,
          timestamp: new Date(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to process chat message',
        message: error.message,
      };
    }
  }

  @Get('chat/history/:sessionId')
  async getChatHistory(@Param('sessionId') sessionId: string) {
    try {
      const history = await this.aiService.getChatHistory(sessionId);
      return {
        success: true,
        data: history,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to retrieve chat history',
        message: error.message,
      };
    }
  }

  @Get('chat/sessions')
  async getAllSessions() {
    try {
      const sessions = await this.aiService.getAllSessions();
      return {
        success: true,
        data: sessions,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to retrieve chat sessions',
        message: error.message,
      };
    }
  }

  @Get('analytics/insights')
  async getAnalyticsInsights() {
    try {
      const insights = await this.aiService.generateAnalyticsInsights();
      return {
        success: true,
        data: insights,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to generate analytics insights',
        message: error.message,
      };
    }
  }

  @Get('automation/rules')
  async getAutomationRules() {
    try {
      const rules = await this.aiService.getAutomationRules();
      return {
        success: true,
        data: rules,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to retrieve automation rules',
        message: error.message,
      };
    }
  }

  @Post('automation/rules')
  async createAutomationRule(@Body() rule: any) {
    try {
      const newRule = await this.aiService.createAutomationRule(rule);
      return {
        success: true,
        data: newRule,
        message: 'Automation rule created successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to create automation rule',
        message: error.message,
      };
    }
  }

  @Put('automation/rules/:id')
  async updateAutomationRule(@Param('id') id: string, @Body() updates: any) {
    try {
      const updatedRule = await this.aiService.updateAutomationRule(id, updates);
      if (!updatedRule) {
        return {
          success: false,
          error: 'Automation rule not found',
        };
      }
      return {
        success: true,
        data: updatedRule,
        message: 'Automation rule updated successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to update automation rule',
        message: error.message,
      };
    }
  }

  @Delete('automation/rules/:id')
  async deleteAutomationRule(@Param('id') id: string) {
    try {
      const deleted = await this.aiService.deleteAutomationRule(id);
      if (!deleted) {
        return {
          success: false,
          error: 'Automation rule not found',
        };
      }
      return {
        success: true,
        message: 'Automation rule deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to delete automation rule',
        message: error.message,
      };
    }
  }

  @Get('reports/saved')
  async getSavedReports() {
    try {
      const reports = await this.aiService.getSavedReports();
      return {
        success: true,
        data: reports,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to retrieve saved reports',
        message: error.message,
      };
    }
  }

  @Post('reports/save')
  async saveReport(@Body() body: { name: string; type: string; data: any }) {
    try {
      const report = await this.aiService.saveReport(body.name, body.type, body.data);
      return {
        success: true,
        data: report,
        message: 'Report saved successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to save report',
        message: error.message,
      };
    }
  }

  @Post('automation/execute')
  async executeAutomationRules(@Body() data: any) {
    try {
      const actions = await this.aiService.executeAutomationRules(data);
      return {
        success: true,
        data: actions,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to execute automation rules',
        message: error.message,
      };
    }
  }

  @Post('colors/generate')
  async generateColorScheme(@Body() body: { theme?: string; style?: string; baseColor?: string }) {
    try {
      const colorScheme = await this.aiService.generateColorScheme(body.theme, body.style, body.baseColor);
      return {
        success: true,
        data: colorScheme,
        message: 'Color scheme generated successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to generate color scheme',
        message: error.message,
      };
    }
  }
}
