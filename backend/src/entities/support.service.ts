import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupportTicket, TicketStatus } from '../entities/support-ticket.entity';
import { TicketComment } from '../entities/ticket-comment.entity';
import { User, UserRole } from '../entities/user.entity';

@Injectable()
export class SupportService {
  constructor(
    @InjectRepository(SupportTicket)
    private ticketRepository: Repository<SupportTicket>,
    @InjectRepository(TicketComment)
    private commentRepository: Repository<TicketComment>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findAll(filters: any): Promise<SupportTicket[]> {
    const query = this.ticketRepository.createQueryBuilder('ticket');

    if (filters.userId) {
      query.andWhere('ticket.userId = :userId', { userId: filters.userId });
    }

    if (filters.status) {
      query.andWhere('ticket.status = :status', { status: filters.status });
    }

    if (filters.priority) {
      query.andWhere('ticket.priority = :priority', { priority: filters.priority });
    }

    return query.orderBy('ticket.createdAt', 'DESC').getMany();
  }

  async findOne(id: string): Promise<SupportTicket> {
    const ticket = await this.ticketRepository.findOne({ where: { id }, relations: ['comments', 'comments.author'] });
    if (!ticket) {
      throw new NotFoundException(`Support ticket with ID ${id} not found`);
    }
    return ticket;
  }

  async create(data: any): Promise<SupportTicket> {
    const ticket = this.ticketRepository.create(data);
    return this.ticketRepository.save(ticket);
  }

  async update(id: string, data: any): Promise<SupportTicket> {
    await this.findOne(id);
    await this.ticketRepository.update(id, data);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const ticket = await this.findOne(id);
    await this.ticketRepository.remove(ticket);
  }

  async addComment(ticketId: string, authorId: string, data: { content: string, isInternal?: boolean }): Promise<TicketComment> {
    await this.findOne(ticketId); // Ensure ticket exists
    const comment = this.commentRepository.create({
      ...data,
      ticketId,
      authorId,
    });
    return this.commentRepository.save(comment);
  }

  async getStats(): Promise<any> {
    const total = await this.ticketRepository.count();
    const openCount = await this.ticketRepository.count({ where: { status: TicketStatus.OPEN } });
    const resolvedCount = await this.ticketRepository.count({ where: { status: TicketStatus.RESOLVED } });
    
    return {
      activeTickets: openCount,
      resolutionRate: total > 0 ? Math.round((resolvedCount / total) * 100) : 0,
      avgResponseTime: 24, // Placeholder for future logic
      customerSatisfaction: 4.8, // Placeholder for review aggregation
    };
  }

  async proposeHostPhoneUpdate(userId: string, phone: string, supportId: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId, role: UserRole.HOST } });
    if (!user) {
      throw new NotFoundException(`Host with ID ${userId} not found`);
    }

    // Maker-Checker: Store the update as pending instead of applying it immediately
    // We assume the User entity has been extended with these tracking fields
    (user as any).pendingPhoneUpdate = phone;
    (user as any).phoneUpdateRequestedBy = supportId;

    return this.userRepository.save(user);
  }
}