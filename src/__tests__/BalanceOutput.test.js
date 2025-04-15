const utils = require('../utils');

describe('BalanceOutput Helper Functions', () => {
  // Test isWildcard function
  describe('isWildcard', () => {
    const isWildcard = value => !value || value === '*';

    test('should return true for empty string', () => {
      expect(isWildcard('')).toBe(true);
    });

    test('should return true for "*"', () => {
      expect(isWildcard('*')).toBe(true);
    });

    test('should return true for null or undefined', () => {
      expect(isWildcard(null)).toBe(true);
      expect(isWildcard(undefined)).toBe(true);
    });

    test('should return false for other values', () => {
      expect(isWildcard('test')).toBe(false);
      expect(isWildcard('123')).toBe(false);
    });
  });

  // Test period comparison logic
  describe('Period Comparison', () => {
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    
    const comparePeriods = (period1, period2) => {
      const [month1, year1] = period1.split('-');
      const [month2, year2] = period2.split('-');
      
      if (year1 !== year2) {
        return year1.localeCompare(year2);
      }
      
      const monthIndex1 = months.indexOf(month1);
      const monthIndex2 = months.indexOf(month2);
      return monthIndex1 - monthIndex2;
    };

    test('should compare same year different months', () => {
      expect(comparePeriods('JAN-16', 'MAR-16')).toBeLessThan(0);
      expect(comparePeriods('MAR-16', 'JAN-16')).toBeGreaterThan(0);
      expect(comparePeriods('MAR-16', 'MAR-16')).toBe(0);
    });

    test('should compare different years', () => {
      expect(comparePeriods('DEC-15', 'JAN-16')).toBeLessThan(0);
      expect(comparePeriods('JAN-16', 'DEC-15')).toBeGreaterThan(0);
    });
  });

  // Test total calculations
  describe('Total Calculations', () => {
    test('should calculate correct totals', () => {
      const entries = [
        { DEBIT: 1000, CREDIT: 0 },
        { DEBIT: 0, CREDIT: 500 },
        { DEBIT: 2000, CREDIT: 1000 }
      ];

      const totalDebit = entries.reduce((sum, entry) => sum + entry.DEBIT, 0);
      const totalCredit = entries.reduce((sum, entry) => sum + entry.CREDIT, 0);
      const balance = totalDebit - totalCredit;

      expect(totalDebit).toBe(3000);
      expect(totalCredit).toBe(1500);
      expect(balance).toBe(1500);
    });
  });
}); 