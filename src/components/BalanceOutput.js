import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import * as utils from '../utils';

class BalanceOutput extends Component {
  render() {
    if (!this.props.userInput.format) {
      return null;
    }

    return (
      <div className='output'>
        <p>
          Total Debit: {this.props.totalDebit} Total Credit: {this.props.totalCredit}
          <br />
          Balance from account {this.props.userInput.startAccount || '*'}
          {' '}
          to {this.props.userInput.endAccount || '*'}
          {' '}
          from period {utils.dateToString(this.props.userInput.startPeriod)}
          {' '}
          to {utils.dateToString(this.props.userInput.endPeriod)}
        </p>
        {this.props.userInput.format === 'CSV' ? (
          <pre>{utils.toCSV(this.props.balance)}</pre>
        ) : null}
        {this.props.userInput.format === 'HTML' ? (
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
              {this.props.balance.map((entry, i) => (
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
        ) : null}
      </div>
    );
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
    startAccount: PropTypes.number,
    endAccount: PropTypes.number,
    startPeriod: PropTypes.date,
    endPeriod: PropTypes.date,
    format: PropTypes.string
  }).isRequired
};

export default connect(state => {
  let balance = [];
  
  const { accounts, journalEntries: journals, userInput } = state;
  
  if (!accounts || !journals || !userInput.format) {
    return { balance, totalCredit: 0, totalDebit: 0, userInput };
  }

  // Create accounts lookup map
  const accountsMap = new Map(
    accounts.map(account => [account.ACCOUNT, account.LABEL])
  );
  console.log('Accounts Map:', Object.fromEntries(accountsMap));

  // First filter journals by date and account range
  const filteredJournals = journals.filter(journal => {
    const accountNum = journal.ACCOUNT;
    
    // Skip if account doesn't exist in accounts dataset
    if (!accountsMap.has(accountNum)) {
      return false;
    }

    const startAccount = isNaN(userInput.startAccount) ? -Infinity : userInput.startAccount;
    const endAccount = isNaN(userInput.endAccount) ? Infinity : userInput.endAccount;
    
    // Check account range
    if (accountNum < startAccount || accountNum > endAccount) {
      return false;
    }

    // Check date range
    const journalDate = journal.PERIOD;
    const startDate = userInput.startPeriod;
    const endDate = userInput.endPeriod;
    
    return (!startDate || isNaN(startDate.valueOf()) || journalDate >= startDate) &&
           (!endDate || isNaN(endDate.valueOf()) || journalDate <= endDate);
  });

  console.log('Filtered Journals:', filteredJournals);

  // Group and sum by account
  const accountTotals = new Map();

  filteredJournals.forEach(journal => {
    const accountNum = journal.ACCOUNT;
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

  console.log('Final balance array:', balance);

  const totalCredit = balance.reduce((acc, entry) => acc + entry.CREDIT, 0);
  const totalDebit = balance.reduce((acc, entry) => acc + entry.DEBIT, 0);
  
  return { balance, totalCredit, totalDebit, userInput };
})(BalanceOutput);