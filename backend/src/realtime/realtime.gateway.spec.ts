import { Test, TestingModule } from '@nestjs/testing';
import { RealtimeGateway } from './realtime.gateway';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';

describe('RealtimeGateway', () => {
  let gateway: RealtimeGateway;
  let jwtService: JwtService;
  let mockServer: Partial<Server>;

  beforeEach(async () => {
    // Mock Socket.IO Server
    mockServer = {
      to: jest.fn().mockReturnThis(), // Allow chaining .to().emit()
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RealtimeGateway,
        {
          provide: JwtService,
          useValue: {
            verify: jest.fn(),
          },
        },
      ],
    }).compile();

    gateway = module.get<RealtimeGateway>(RealtimeGateway);
    jwtService = module.get<JwtService>(JwtService);
    
    // Manually inject the mocked server since @WebSocketServer() doesn't auto-populate in unit tests
    gateway.server = mockServer as Server;
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleConnection', () => {
    let mockClient: Partial<Socket>;

    beforeEach(() => {
      mockClient = {
        handshake: {
          auth: {},
          query: {},
          headers: {},
          time: '',
          address: '',
          xdomain: false,
          secure: false,
          issued: 0,
          url: '',
        },
        join: jest.fn(),
      } as unknown as Socket;
    });

    it('should join user room if valid token provided in auth', async () => {
      mockClient.handshake.auth = { token: 'valid_token' };
      (jwtService.verify as jest.Mock).mockReturnValue({ sub: 'user_123' });

      await gateway.handleConnection(mockClient as Socket);

      expect(jwtService.verify).toHaveBeenCalledWith('valid_token');
      expect(mockClient.join).toHaveBeenCalledWith('user_123');
    });

    it('should join user room if valid token provided in query', async () => {
      mockClient.handshake.query = { token: 'valid_token' };
      (jwtService.verify as jest.Mock).mockReturnValue({ sub: 'user_456' });

      await gateway.handleConnection(mockClient as Socket);

      expect(jwtService.verify).toHaveBeenCalledWith('valid_token');
      expect(mockClient.join).toHaveBeenCalledWith('user_456');
    });

    it('should do nothing if token is missing', async () => {
      await gateway.handleConnection(mockClient as Socket);
      expect(jwtService.verify).not.toHaveBeenCalled();
      expect(mockClient.join).not.toHaveBeenCalled();
    });

    it('should do nothing if token is invalid (verify throws)', async () => {
      mockClient.handshake.auth = { token: 'invalid_token' };
      (jwtService.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      await gateway.handleConnection(mockClient as Socket);

      expect(jwtService.verify).toHaveBeenCalledWith('invalid_token');
      expect(mockClient.join).not.toHaveBeenCalled();
    });
  });

  describe('sendBookingUpdateToUser', () => {
    it('should emit bookingUpdate event to specific user room', () => {
      const userId = 'user_123';
      const data = { status: 'confirmed' };

      gateway.sendBookingUpdateToUser(userId, data);

      // Check that server.to(userId) was called
      expect(gateway.server.to).toHaveBeenCalledWith(userId);
      // Check that .emit() was called on the result of .to()
      expect(mockServer.emit).toHaveBeenCalledWith('bookingUpdate', data);
    });
  });
});