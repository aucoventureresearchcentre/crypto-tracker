# Cryptocurrency Transaction Monitoring System

A comprehensive system for monitoring cryptocurrency transactions, detecting large transfers, tracking fund movements, and implementing security measures against hackers.

## Features

- **Real-time Transaction Monitoring**: Monitor cryptocurrency transactions across multiple wallets and blockchains
- **Large Transaction Alerts**: Automatic alerts for transactions exceeding 500,000 units
- **Fund Movement Tracking**: Track where funds go and detect suspicious patterns like split transactions
- **Security Measures**: Protection against hackers and unauthorized access
- **Interactive Dashboard**: Visual representation of transaction data and alerts
- **Multi-wallet Support**: Monitor multiple cryptocurrency wallets simultaneously

## Getting Started

### Prerequisites

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection

### Installation

1. Clone the repository:
```bash
git clone https://github.com/aucoventureresearchcentre/crypto-tracker.git
```

2. Navigate to the project directory:
```bash
cd crypto-tracker
```

3. Open the `index.html` file in your web browser or serve it using a local web server.

## Usage

### Dashboard

The dashboard provides an overview of your monitored wallets, recent transactions, and active alerts. From here, you can:

- View the number of active alerts
- See the count of monitored wallets
- Check today's transaction count
- View the system status

### Alerts

The alerts section displays all detected suspicious activities:

- Large transactions (over 500,000 units)
- Split transaction patterns
- Suspicious addresses

Each alert includes:
- Transaction amount
- Source and destination addresses
- Transaction hash
- Current tracking status

### Transactions

The transactions section allows you to:

- View all monitored transactions
- Filter by currency, date, or amount
- Search for specific transactions
- Sort by various criteria

### Wallets

The wallets section lets you:

- Add new wallets to monitor
- View wallet balances
- Check recent transactions for each wallet
- Configure alert settings for individual wallets

### Settings

In the settings section, you can configure:

- Alert thresholds
- Notification preferences
- Security settings
- API connections

## Security Features

The system includes multiple security measures:

- CSRF protection
- XSS prevention
- Rate limiting
- IP blocking for suspicious activities
- Secure data storage
- Audit logging

## API Integration

The system can connect to various blockchain APIs to fetch real-time transaction data. Currently supported:

- Bitcoin blockchain
- Ethereum blockchain
- USDT transactions

## Development

### Project Structure

```
crypto-tracker/
├── css/
│   └── styles.css
├── js/
│   ├── script.js
│   ├── blockchain-monitor.js
│   ├── alert-system.js
│   ├── transaction-tracker.js
│   └── security-module.js
└── index.html
```

### Technologies Used

- HTML5
- CSS3
- JavaScript (ES6+)
- Web Crypto API
- Chart.js for data visualization

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Blockchain API providers
- Open source security libraries
- Cryptocurrency community for feedback and suggestions
