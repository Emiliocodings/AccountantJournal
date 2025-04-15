import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

class BalanceOutput extends Component {
  render() {
    const { balance, totalCredit, totalDebit, userInput } = this.props;
    const utils = require('../utils');

    if (!balance || balance.length === 0) {
      // Return empty data in appropriate format
      if (userInput.format === 'CSV') {
        const emptyData = [{
          ACCOUNT: '',
          DESCRIPTION: 'No data found for the specified criteria',
          DEBIT: 0,
          CREDIT: 0,
          BALANCE: 0
        }];
        const csvContent = utils.toCSV(emptyData);
        return <pre>{csvContent}</pre>;
      }
      return null;
    }

    switch (userInput.format) {
      case 'CSV':
        const csvContent = utils.toCSV(balance);
        return <pre>{csvContent}</pre>;
      
      case 'HTML':
        return (
          <div className='output'>
            <p>
              Total Debit: {totalDebit} Total Credit: {totalCredit}
              <br />
              Balance from account {userInput.startAccount || '*'}
              {' '}
              to {userInput.endAccount || '*'}
              {' '}
              from period {utils.dateToString(userInput.startPeriod)}
              {' '}
              to {utils.dateToString(userInput.endPeriod)}
            </p>
            <table className="table">
              <thead>
                <tr>
                  <th>ACCOUNT</th>
                  <th>DESCRIPTION</th>
                  <th>DEBIT</th>
                  <th>CREDIT</th>
                  <th>BALANCE</th>
                </tr>
              </thead>
              <tbody>
                {balance.map((entry, i) => (
                  <tr key={i}>
                    <th scope="row">{entry.ACCOUNT}</th>
                    <td>{entry.DESCRIPTION}</td>
                    <td>{entry.DEBIT}</td>
                    <td>{entry.CREDIT}</td>
                    <td>{entry.BALANCE}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      
      default:
        return null;
    }
  }
}

BalanceOutput.propTypes = {
  balance: PropTypes.arrayOf(
    PropTypes.shape({
      ACCOUNT: PropTypes.number.isRequired,
      DESCRIPTION: PropTypes.string.isRequired,
      DEBIT: PropTypes.number.isRequired,
      CREDIT: PropTypes.number.isRequired,
      BALANCE: PropTypes.number.isRequired
    })
  ).isRequired,
  totalCredit: PropTypes.number.isRequired,
  totalDebit: PropTypes.number.isRequired,
  userInput: PropTypes.shape({
    startAccount: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    endAccount: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    startPeriod: PropTypes.string,
    endPeriod: PropTypes.string,
    format: PropTypes.string
  }).isRequired
};

export default connect(state => {
  let balance = [];
  
  const { accounts, journalEntries: journals, userInput } = state;
  
  if (!accounts || !journals || !userInput.format) {
    return { 
      balance: [], 
      totalCredit: 0, 
      totalDebit: 0, 
      userInput 
    };
  }

  // Import utils for date formatting
  const utils = require('../utils');

  // Helper functions for wildcard handling
  const isWildcard = value => !value || value === '*';
  
  const getAccountRange = () => {
    const accountNumbers = accounts.map(a => parseInt(a.ACCOUNT, 10));
    return {
      min: Math.min(...accountNumbers),
      max: Math.max(...accountNumbers)
    };
  };

  const getPeriodRange = () => {
    const periods = journals.map(j => utils.dateToString(j.PERIOD)).sort();
    return {
      earliest: periods[0],
      latest: periods[periods.length - 1]
    };
  };

  // Convert date to period string (MMM-YY format)
  const dateToPeriodString = (date) => {
    if (!date || isWildcard(date)) return '*';
    return utils.dateToString(date);
  };

  // Determine actual ranges based on wildcards
  const accountRange = getAccountRange();
  const periodRange = getPeriodRange();

  // Set effective ranges
  const effectiveStartAccount = isWildcard(userInput.startAccount) 
    ? accountRange.min 
    : parseInt(userInput.startAccount, 10);

  const effectiveEndAccount = isWildcard(userInput.endAccount)
    ? accountRange.max
    : parseInt(userInput.endAccount, 10);

  // Convert dates to period strings
  const effectiveStartPeriod = isWildcard(userInput.startPeriod)
    ? periodRange.earliest
    : dateToPeriodString(userInput.startPeriod);

  const effectiveEndPeriod = isWildcard(userInput.endPeriod)
    ? periodRange.latest
    : dateToPeriodString(userInput.endPeriod);

  // Create accounts lookup map
  const accountsMap = new Map(
    accounts.map(account => [parseInt(account.ACCOUNT, 10), account.LABEL])
  );

  // Filter journals by date and account range
  const filteredJournals = journals.filter(journal => {
    const accountNum = parseInt(journal.ACCOUNT, 10);
    
    // Skip if account doesn't exist in accounts dataset
    if (!accountsMap.has(accountNum)) {
      return false;
    }

    // Check account range
    const inAccountRange = accountNum >= effectiveStartAccount && accountNum <= effectiveEndAccount;

    if (!inAccountRange) {
      return false;
    }

    // Convert journal period to string format for comparison
    const journalPeriod = utils.dateToString(journal.PERIOD);
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

    // Helper function to compare periods
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

    // Check if period is within range
    let inPeriodRange = true;

    // Check start period
    if (!isWildcard(effectiveStartPeriod)) {
      inPeriodRange = inPeriodRange && (comparePeriods(journalPeriod, effectiveStartPeriod) >= 0);
    }

    // Check end period
    if (!isWildcard(effectiveEndPeriod)) {
      inPeriodRange = inPeriodRange && (comparePeriods(journalPeriod, effectiveEndPeriod) <= 0);
    }
    const include = inAccountRange && inPeriodRange;
    return include;
  });

  // Group and sum by account
  const accountTotals = new Map();

  filteredJournals.forEach(journal => {
    const accountNum = parseInt(journal.ACCOUNT, 10);
    if (!accountTotals.has(accountNum)) {
      accountTotals.set(accountNum, {
        ACCOUNT: accountNum,
        DESCRIPTION: accountsMap.get(accountNum),
        DEBIT: 0,
        CREDIT: 0,
        BALANCE: 0
      });
    }

    const account = accountTotals.get(accountNum);
    account.DEBIT += Number(journal.DEBIT) || 0;
    account.CREDIT += Number(journal.CREDIT) || 0;
    account.BALANCE = account.DEBIT - account.CREDIT;
  });

  // Convert to array and sort by account number
  balance = Array.from(accountTotals.values())
    .sort((a, b) => a.ACCOUNT - b.ACCOUNT);

  const totalCredit = balance.reduce((acc, entry) => acc + entry.CREDIT, 0);
  const totalDebit = balance.reduce((acc, entry) => acc + entry.DEBIT, 0);
  
  // If balance is empty, return an array with a single empty record for CSV
  if (balance.length === 0 && userInput.format === 'CSV') {
    balance = [{
      ACCOUNT: '',
      DESCRIPTION: 'No data found for the specified criteria',
      DEBIT: 0,
      CREDIT: 0,
      BALANCE: 0
    }];
  }
  
  return { 
    balance, 
    totalCredit, 
    totalDebit, 
    userInput: {
      ...userInput,
      startPeriod: dateToPeriodString(userInput.startPeriod),
      endPeriod: dateToPeriodString(userInput.endPeriod)
    }
  };
})(BalanceOutput);