import { createBooking } from '../../src/controllers/booking.controller';
import { ProviderModel, matchesServiceCategory } from '../../src/models/provider.model';
import { NotificationModel } from '../../src/models/notification.model';
import { BookingModel } from '../../src/models/booking.model';
import { getPool } from '../../src/config/database';

jest.mock('../../src/models/provider.model');
jest.mock('../../src/models/notification.model');
jest.mock('../../src/models/booking.model');
jest.mock('../../src/config/database');

describe('createBooking Notification Filtering', () => {
  let mockIo: any;
  let mockReq: any;
  let mockRes: any;
  let loggedOutputs: string[] = [];
  let originalLog: any;
  let originalError: any;

  beforeEach(() => {
    jest.clearAllMocks();
    loggedOutputs = [];
    originalLog = console.log;
    originalError = console.error;
    
    console.log = jest.fn((...args) => {
      loggedOutputs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
    });
    console.error = jest.fn((...args) => {
      loggedOutputs.push("[ERROR] " + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
    });

    // Use the actual matchesServiceCategory helper implementation in tests
    const { matchesServiceCategory: actualMatchesServiceCategory } = jest.requireActual('../../src/models/provider.model');
    (matchesServiceCategory as jest.Mock).mockImplementation(actualMatchesServiceCategory);
    
    mockIo = {
      emit: jest.fn(),
    };

    mockReq = {
      body: {
        customer_id: 'customer-123',
        service_id: 'electrician',
        address: '123 Main St',
        lat: 13.0827,
        lng: 80.2707,
      },
      app: {
        locals: {
          io: mockIo,
        },
      },
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  afterEach(() => {
    console.log = originalLog;
    console.error = originalError;
  });

  it('should only notify providers that match Electrician category, are online, verified, and in radius', async () => {
    // 1. Mock services database query to return 'Electrician' label for 'electrician' service ID
    const mockQuery = jest.fn().mockImplementation((queryText, values) => {
      if (queryText.includes('SELECT label FROM services')) {
        return Promise.resolve({ rows: [{ label: 'Electrician' }] });
      }
      return Promise.resolve({ rows: [] });
    });
    
    (getPool as jest.Mock).mockReturnValue({
      query: mockQuery,
    });

    // 2. Mock candidate providers returned by findByServiceId
    const mockProviders = [
      {
        id: 'prov-electrician-ok',
        user_id: 'user-electrician-ok',
        name: 'Arjun (Electrician OK)',
        serviceCategory: ['Electrician'],
        is_online: true,
        is_verified: true,
        serviceRadius: 20,
        lat: 13.0827,
        lng: 80.2707 + 0.05, // ~5.5 KM away
      },
      {
        id: 'prov-plumber-wrong',
        user_id: 'user-plumber-wrong',
        name: 'Suresh (Plumber)',
        serviceCategory: ['Plumber'],
        is_online: true,
        is_verified: true,
        serviceRadius: 20,
        lat: 13.0827,
        lng: 80.2707 + 0.01, // ~1.1 KM away
      },
      {
        id: 'prov-electrician-offline',
        user_id: 'user-electrician-offline',
        name: 'Deepak (Offline)',
        serviceCategory: ['Electrician'],
        is_online: false,
        is_verified: true,
        serviceRadius: 20,
        lat: 13.0827,
        lng: 80.2707 + 0.01,
      },
      {
        id: 'prov-electrician-far',
        user_id: 'user-electrician-far',
        name: 'Rajesh (Too Far)',
        serviceCategory: ['Electrician'],
        is_online: true,
        is_verified: true,
        serviceRadius: 10,
        lat: 13.0827,
        lng: 80.2707 + 0.2, // ~22 KM away
      },
      {
        id: 'prov-electrician-unverified',
        user_id: 'user-electrician-unverified',
        name: 'Nirmal (Unverified)',
        serviceCategory: ['Electrician'],
        is_online: true,
        is_verified: false,
        serviceRadius: 20,
        lat: 13.0827,
        lng: 80.2707 + 0.01,
      }
    ].map((p: any) => {
      return {
        ...p,
        serviceCategory: p.serviceCategory,
        isOnline: p.is_online,
        serviceRadius: p.serviceRadius,
        latitude: p.lat,
        longitude: p.lng
      };
    });

    (ProviderModel.findByServiceId as jest.Mock).mockResolvedValue(mockProviders);

    // 3. Mock BookingModel.create
    (BookingModel.create as jest.Mock).mockResolvedValue({
      id: 'booking-789',
      customer_id: 'customer-123',
      service_id: 'electrician',
      address: '123 Main St',
      scheduled_at: new Date().toISOString(),
    });

    // 4. Invoke createBooking
    await createBooking(mockReq, mockRes);

    // Output all logged items to console so they are visible in test run outputs
    originalLog("\n--- SIMULATED DEBUG LOG OUTPUT ---");
    loggedOutputs.forEach(out => originalLog(out));
    originalLog("----------------------------------\n");

    // 5. Assertions
    // Only 'prov-electrician-ok' should be notified
    expect(NotificationModel.create).toHaveBeenCalledTimes(1);
    expect(NotificationModel.create).toHaveBeenCalledWith({
      user_id: 'user-electrician-ok',
      title: 'New Job Request',
      message: expect.stringContaining('electrician'),
      type: 'booking',
    });

    const logOutput = loggedOutputs.join('\n');

    expect(logOutput).toContain('Requested Service Category:\nElectrician');
    expect(logOutput).toContain('Provider ID:\nprov-electrician-ok');
    expect(logOutput).toContain('Notification Decision:\nACCEPTED');

    expect(logOutput).toContain('Provider ID:\nprov-plumber-wrong');
    expect(logOutput).toContain('Notification Decision:\nREJECTED (Category mismatch)');

    expect(logOutput).toContain('Provider ID:\nprov-electrician-offline');
    expect(logOutput).toContain('Notification Decision:\nREJECTED (Offline)');

    expect(logOutput).toContain('Provider ID:\nprov-electrician-far');
    expect(logOutput).toContain('Notification Decision:\nREJECTED (Outside radius)');

    expect(logOutput).toContain('Provider ID:\nprov-electrician-unverified');
    expect(logOutput).toContain('Notification Decision:\nREJECTED (Unverified)');
  });
});
