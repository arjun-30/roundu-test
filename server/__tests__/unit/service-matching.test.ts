import { mapProvider, matchesServiceCategory } from '../../src/models/provider.model';
import { getDistanceKm } from '../../src/utils/locationHelper';

describe('Service Category Matching & Provider Filtering Logic', () => {
  
  describe('matchesServiceCategory Helper', () => {
    it('should match category as a single string (case-insensitively)', () => {
      expect(matchesServiceCategory('Electrician', 'electrician')).toBe(true);
      expect(matchesServiceCategory('Electrician', 'Electrician')).toBe(true);
      expect(matchesServiceCategory('Electrician', 'Plumber')).toBe(false);
    });

    it('should match category from an array of categories (case-insensitively)', () => {
      const categories = ['Plumber', 'Electrician', 'AC Repair'];
      expect(matchesServiceCategory(categories, 'electrician')).toBe(true);
      expect(matchesServiceCategory(categories, 'AC Repair')).toBe(true);
      expect(matchesServiceCategory(categories, 'Painter')).toBe(false);
    });

    it('should return false for null or undefined categories', () => {
      expect(matchesServiceCategory(null, 'electrician')).toBe(false);
      expect(matchesServiceCategory(undefined, 'electrician')).toBe(false);
    });
  });

  describe('mapProvider Helper', () => {
    it('should map database snake_case fields to camelCase properties', () => {
      const dbRow = {
        id: 'provider-123',
        user_id: 'user-123',
        is_online: true,
        service_radius: 15,
        lat: 13.0827,
        lng: 80.2707,
        service_category: ['Electrician', 'AC Repair'],
        is_verified: true
      };

      const provider = mapProvider(dbRow);

      expect(provider.id).toBe('provider-123');
      expect(provider.serviceCategory).toEqual(['Electrician', 'AC Repair']);
      expect(provider.isOnline).toBe(true);
      expect(provider.serviceRadius).toBe(15);
      expect(provider.latitude).toBe(13.0827);
      expect(provider.longitude).toBe(80.2707);
    });
  });

  describe('Filtering Criteria Test Cases', () => {
    // Provider list representing various states
    const providers = [
      {
        id: 'A',
        service_category: ['Electrician'],
        is_online: true,
        service_radius: 20,
        lat: 13.0827, // Customer is at 13.0827, 80.2707
        lng: 80.2707 + 0.09, // ~9.8 KM away
        is_verified: true
      },
      {
        id: 'B',
        service_category: ['Electrician'],
        is_online: true,
        service_radius: 20,
        lat: 13.0827,
        lng: 80.2707 + 0.16, // ~17.5 KM away
        is_verified: true
      },
      {
        id: 'C',
        service_category: ['Plumber'],
        is_online: true,
        service_radius: 20,
        lat: 13.0827,
        lng: 80.2707 + 0.04, // ~4.4 KM away
        is_verified: true
      },
      {
        id: 'D',
        service_category: ['AC Repair'],
        is_online: true,
        service_radius: 20,
        lat: 13.0827,
        lng: 80.2707 + 0.018, // ~2.0 KM away
        is_verified: true
      },
      {
        id: 'E',
        service_category: ['Electrician'],
        is_online: false, // Offline
        service_radius: 20,
        lat: 13.0827,
        lng: 80.2707 + 0.027, // ~3.0 KM away
        is_verified: true
      },
      {
        id: 'F',
        service_category: ['Electrician'],
        is_online: true,
        service_radius: 20,
        lat: 13.0827,
        lng: 80.2707 + 0.23, // ~25 KM away
        is_verified: true
      }
    ].map(mapProvider);

    const customerCoords = { lat: 13.0827, lng: 80.2707 };

    const filterProvidersForRequest = (service: string) => {
      return providers.filter(p => {
        // Calculate distance
        let dist = 0;
        if (p.latitude != null && p.longitude != null) {
          dist = getDistanceKm(customerCoords, { lat: p.latitude, lng: p.longitude });
        }
        
        const matchesCategory = matchesServiceCategory(p.serviceCategory, service);
        const isOnline = p.isOnline === true;
        const isApproved = p.is_verified === true;
        const inRadius = dist <= p.serviceRadius;

        return matchesCategory && isOnline && isApproved && inRadius;
      });
    };

    it('Test 1: Customer requests Electrician -> should only notify Electricians A and B', () => {
      const results = filterProvidersForRequest('Electrician');
      const ids = results.map(r => r.id);
      expect(ids).toContain('A');
      expect(ids).toContain('B');
      expect(ids).not.toContain('C'); // Plumber
      expect(ids).not.toContain('D'); // AC Repair
      expect(ids).not.toContain('E'); // Offline
      expect(ids).not.toContain('F'); // Too far (25 KM)
      expect(results.length).toBe(2);
    });

    it('Test 2: Customer requests Plumber -> should only notify Plumber C', () => {
      const results = filterProvidersForRequest('Plumber');
      const ids = results.map(r => r.id);
      expect(ids).toContain('C');
      expect(results.length).toBe(1);
    });

    it('Test 3: Customer requests AC Repair -> should only notify AC Repair provider D', () => {
      const results = filterProvidersForRequest('AC Repair');
      const ids = results.map(r => r.id);
      expect(ids).toContain('D');
      expect(results.length).toBe(1);
    });

    it('Test 4: Wrong category provider never receives notification', () => {
      const results = filterProvidersForRequest('Painter');
      expect(results.length).toBe(0);
    });

    it('Test 5: Correct category but outside 20 KM -> should filter out provider F', () => {
      const results = filterProvidersForRequest('Electrician');
      const ids = results.map(r => r.id);
      expect(ids).not.toContain('F');
    });

    it('Test 6: Correct category but offline -> should filter out provider E', () => {
      const results = filterProvidersForRequest('Electrician');
      const ids = results.map(r => r.id);
      expect(ids).not.toContain('E');
    });
  });
});
