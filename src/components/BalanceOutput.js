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
  //let balance = [];
  const { accounts = [], journalEntries = [], userInput } = state;

  // Convert account numbers to numbers and handle *
  const startAcc = Number(userInput.startAccount) || -Infinity;
  const endAcc = Number(userInput.endAccount) || Infinity;
  console.log(startAcc + " " + endAcc);

  // Filter Journals by account range
  const filteredJournalsByAcc = journalEntries.filter(journalEntries => {
    const jourAccNum = Number(journalEntries.ACCOUNT);
    return jourAccNum >= startAcc && jourAccNum <= endAcc;
  });
  console.log(filteredJournalsByAcc);

  // Handle * for dates
  const startDate = Number(userInput.startPeriod) || -Infinity;
  const endDate = Number(userInput.endPeriod) || Infinity;
  console.log(startDate + " " + endDate);
  
  // Filter Journals by date
  const filteredJournalsByDate = filteredJournalsByAcc.filter(filteredJournalsByAcc => {
    const jourAccNumDate = Number(filteredJournalsByAcc.PERIOD);
    return jourAccNumDate >= startDate && jourAccNumDate <= endDate;
  });
  console.log(filteredJournalsByDate);

  // Add description to journals
  const accountLabelMap = accounts.reduce((map, acc) => {
    map[acc.ACCOUNT] = acc.LABEL;
    return map;
  }, {});
  console.log(accountLabelMap);
  
  // Map journals to add DESCRIPTION field
  const journalsWithDescription = filteredJournalsByDate.map(entry => ({
    ...entry,
    DESCRIPTION: accountLabelMap[entry.ACCOUNT] || "Unknown Account"
  }));
  console.log(journalsWithDescription);

  const balance = journalsWithDescription.map(({ PERIOD, DEBIT, CREDIT, ...rest }) => ({
    ...rest,
    DEBIT,
    CREDIT,
    BALANCE: DEBIT - CREDIT
  }));
  
  console.log(balance);
  console.log("//////PROCESS TERMINATED//////");

  const totalCredit = balance.reduce((acc, entry) => acc + entry.CREDIT, 0);
  const totalDebit = balance.reduce((acc, entry) => acc + entry.DEBIT, 0);
  return { balance, totalCredit, totalDebit, userInput: state.userInput
  };
})(BalanceOutput);