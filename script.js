// DOM 元素加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 导航菜单功能
    const navLinks = document.querySelectorAll('nav ul li a');
    const sections = document.querySelectorAll('section');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // 移除所有活跃状态
            navLinks.forEach(item => item.classList.remove('active'));
            sections.forEach(item => item.classList.remove('active'));
            
            // 添加当前活跃状态
            this.classList.add('active');
            
            // 显示对应的部分
            const targetId = this.getAttribute('href').substring(1);
            document.getElementById(targetId).classList.add('active');
        });
    });
    
    // 初始化图表
    initializeCharts();
    
    // 模拟实时数据更新
    simulateRealTimeData();
    
    // 添加表单提交事件处理
    setupFormHandlers();
    
    // 添加交互功能
    setupInteractions();
});

// 初始化图表
function initializeCharts() {
    const ctx = document.getElementById('transactionChart').getContext('2d');
    
    // 交易金额分布图表
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['0-10k', '10k-50k', '50k-100k', '100k-500k', '500k-1M', '1M+'],
            datasets: [{
                label: '交易数量',
                data: [120, 85, 42, 18, 7, 3],
                backgroundColor: [
                    'rgba(52, 152, 219, 0.5)',
                    'rgba(52, 152, 219, 0.5)',
                    'rgba(52, 152, 219, 0.5)',
                    'rgba(52, 152, 219, 0.5)',
                    'rgba(243, 156, 18, 0.5)',
                    'rgba(231, 76, 60, 0.5)'
                ],
                borderColor: [
                    'rgba(52, 152, 219, 1)',
                    'rgba(52, 152, 219, 1)',
                    'rgba(52, 152, 219, 1)',
                    'rgba(52, 152, 219, 1)',
                    'rgba(243, 156, 18, 1)',
                    'rgba(231, 76, 60, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '交易数量'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: '交易金额范围'
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `交易数量: ${context.raw}`;
                        }
                    }
                },
                legend: {
                    display: false
                }
            }
        }
    });
}

// 模拟实时数据更新
function simulateRealTimeData() {
    // 模拟新交易
    setInterval(() => {
        // 随机生成新交易数据
        const currencies = ['BTC', 'ETH', 'USDT'];
        const amounts = [
            Math.floor(Math.random() * 100000) + 1000,
            Math.floor(Math.random() * 200000) + 5000,
            Math.floor(Math.random() * 1000000) + 10000
        ];
        
        // 随机选择一种货币和金额
        const currencyIndex = Math.floor(Math.random() * currencies.length);
        const currency = currencies[currencyIndex];
        const amount = amounts[currencyIndex];
        
        // 检查是否需要触发警报
        if (amount > 500000) {
            createAlert(currency, amount);
        }
        
        // 更新交易计数
        updateTransactionCount();
        
    }, 60000); // 每分钟更新一次
}

// 创建新警报
function createAlert(currency, amount) {
    // 获取当前时间
    const now = new Date();
    const timeString = now.toLocaleString('zh-CN');
    
    // 创建警报元素
    const alertElement = document.createElement('div');
    alertElement.className = 'alert-notification';
    alertElement.innerHTML = `
        <strong>新警报!</strong> 检测到大额转账: ${amount.toLocaleString()} ${currency}
        <span class="alert-time">${timeString}</span>
        <button class="alert-close">&times;</button>
    `;
    
    // 添加到页面
    document.body.appendChild(alertElement);
    
    // 显示警报
    setTimeout(() => {
        alertElement.classList.add('show');
    }, 100);
    
    // 添加关闭按钮功能
    alertElement.querySelector('.alert-close').addEventListener('click', function() {
        alertElement.classList.remove('show');
        setTimeout(() => {
            alertElement.remove();
        }, 300);
    });
    
    // 自动关闭
    setTimeout(() => {
        alertElement.classList.remove('show');
        setTimeout(() => {
            alertElement.remove();
        }, 300);
    }, 10000);
    
    // 更新警报计数
    updateAlertCount();
}

// 更新交易计数
function updateTransactionCount() {
    const transactionCountElement = document.querySelector('.transaction-count');
    if (transactionCountElement) {
        let count = parseInt(transactionCountElement.textContent);
        transactionCountElement.textContent = count + 1;
    }
}

// 更新警报计数
function updateAlertCount() {
    const alertCountElement = document.querySelector('.alert-count');
    if (alertCountElement) {
        let count = parseInt(alertCountElement.textContent);
        alertCountElement.textContent = count + 1;
    }
}

// 设置表单处理
function setupFormHandlers() {
    // 获取所有表单
    const forms = document.querySelectorAll('.settings-form');
    
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // 显示保存成功消息
            showNotification('设置已保存');
            
            // 在实际应用中，这里会发送数据到服务器
        });
    });
}

// 显示通知
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// 设置交互功能
function setupInteractions() {
    // 添加表格行点击事件
    const tableRows = document.querySelectorAll('tbody tr');
    tableRows.forEach(row => {
        row.addEventListener('click', function() {
            // 在实际应用中，这里会显示详细信息
            const cells = this.querySelectorAll('td');
            if (cells.length > 0) {
                const transactionId = cells[1].textContent;
                showNotification(`查看交易详情: ${transactionId}`);
            }
        });
    });
    
    // 添加警报项点击事件
    const alertItems = document.querySelectorAll('.alert-item');
    alertItems.forEach(item => {
        const detailsBtn = item.querySelector('.btn');
        if (detailsBtn) {
            detailsBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                const alertType = item.querySelector('.alert-type').textContent;
                showNotification(`查看警报详情: ${alertType}`);
            });
        }
    });
    
    // 添加钱包卡片点击事件
    const walletCards = document.querySelectorAll('.wallet-card');
    walletCards.forEach(card => {
        const btns = card.querySelectorAll('.btn');
        btns.forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                showNotification(`${this.textContent}操作已执行`);
            });
        });
    });
    
    // 添加搜索功能
    const searchBoxes = document.querySelectorAll('.search-box');
    searchBoxes.forEach(box => {
        const input = box.querySelector('input');
        const button = box.querySelector('button');
        
        if (input && button) {
            button.addEventListener('click', function() {
                const searchTerm = input.value.trim();
                if (searchTerm) {
                    showNotification(`搜索: ${searchTerm}`);
                    // 在实际应用中，这里会执行搜索逻辑
                }
            });
            
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    const searchTerm = input.value.trim();
                    if (searchTerm) {
                        showNotification(`搜索: ${searchTerm}`);
                        // 在实际应用中，这里会执行搜索逻辑
                    }
                }
            });
        }
    });
}

// 添加通知样式
const style = document.createElement('style');
style.textContent = `
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: #2ecc71;
        color: white;
        padding: 12px 20px;
        border-radius: 4px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        z-index: 1000;
        opacity: 0;
        transform: translateY(-20px);
        transition: opacity 0.3s, transform 0.3s;
    }
    
    .notification.show {
        opacity: 1;
        transform: translateY(0);
    }
    
    .alert-notification {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background-color: #e74c3c;
        color: white;
        padding: 15px 20px;
        border-radius: 4px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
        z-index: 1000;
        opacity: 0;
        transform: translateY(20px);
        transition: opacity 0.3s, transform 0.3s;
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-width: 300px;
    }
    
    .alert-notification.show {
        opacity: 1;
        transform: translateY(0);
    }
    
    .alert-time {
        font-size: 0.8rem;
        margin: 0 10px;
    }
    
    .alert-close {
        background: none;
        border: none;
        color: white;
        font-size: 1.2rem;
        cursor: pointer;
        padding: 0 5px;
    }
`;

document.head.appendChild(style);

// 模拟区块链API连接
class BlockchainAPI {
    constructor() {
        this.connected = false;
        this.wallets = [
            {
                name: "主要比特币钱包",
                address: "0x7a23b6f8c9d1e0a4b5c6d7e8f9a0b1c2d3e4f5a6",
                balance: 1250000,
                currency: "BTC"
            },
            {
                name: "以太坊储备钱包",
                address: "0x3f67a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2",
                balance: 2800000,
                currency: "ETH"
            },
            {
                name: "USDT储备钱包",
                address: "0x2d91e0f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2",
                balance: 5500000,
                currency: "USDT"
            }
        ];
        
        this.transactions = [
            {
                time: "2025-03-11 08:42:15",
                hash: "0xf7e6d5c4b3a2918273645a6b7c8d9e0f1a2b3c4d",
                from: "0x7a23b6f8c9d1e0a4b5c6d7e8f9a0b1c2d3e4f5a6",
                to: "0x9b45c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6",
                currency: "BTC",
                amount: 750000,
                status: "警报"
            },
            {
                time: "2025-03-11 08:30:42",
                hash: "0xa2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1",
                from: "0x5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4",
                to: "0x1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0",
                currency: "ETH",
                amount: 320000,
                status: "正常"
            }
        ];
        
        this.alerts = [
            {
                time: "2025-03-11 08:42:15",
                type: "大额转账",
                amount: 750000,
                currency: "BTC",
                from: "0x7a23b6f8c9d1e0a4b5c6d7e8f9a0b1c2d3e4f5a6",
                to: "0x9b45c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6",
                status: "追踪中"
            },
            {
                time: "2025-03-11 07:30:22",
                type: "分散转出",
                amount: 520000,
                currency: "ETH",
                from: "0x3f67a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2",
                to: "多个地址",
                status: "已锁定"
            }
        ];
    }
    
    // 连接到API
    connect() {
        return new Promise((resolve) => {
            setTimeout(() => {
                this.connected = true;
                resolve(true);
            }, 1000);
        });
    }
    
    // 获取钱包信息
    getWallets() {
        if (!this.connected) {
            throw new Error("API未连接");
        }
        return this.wallets;
    }
    
    // 获取交易
    getTransactions() {
        if (!this.connected) {
            throw new Error("API未连接");
        }
        return this.transactions;
    }
    
    // 获取警报
    getAlerts() {
        if (!this.connected) {
            throw new Error("API未连接");
        }
        return this.alerts;
    }
    
    // 监控交易
    monitorTransactions(callback) {
        if (!this.connected) {
            throw new Error("API未连接");
        }
        
        // 模拟实时交易监控
        setInterval(() => {
            // 生成随机交易
            const currencies = ["BTC", "ETH", "USDT"];
            const currencyIndex = Math.floor(Math.random() * currencies.length);
            const currency = currencies[currencyIndex];
            
            // 随机金额，有10%的概率生成大额交易
            let amount;
            if (Math.random() < 0.1) {
                amount = Math.floor(Math.random() * 1000000) + 500000;
            } else {
                amount = Math.floor(Math.random() * 400000) + 1000;
            }
            
            // 生成随机地址
            const from = "0x" + Math.random().toString(16).substring(2, 42);
            const to = "0x" + Math.random().toString(16).substring(2, 42);
            
            // 创建交易对象
            const transaction = {
                time: new Date().toLocaleString("zh-CN"),
                hash: "0x" + Math.random().toString(16).substring(2, 42),
                from: from,
                to: to,
                currency: currency,
                amount: amount,
                status: amount > 500000 ? "警报" : "正常"
            };
            
            // 添加到交易列表
            this.transactions.unshift(transaction);
            
            // 如果是大额交易，创建警报
            if (amount > 500000) {
                const alert = {
                    time: transaction.time,
                    type: "大额转账",
                    amount: amount,
                    currency: currency,
                    from: from,
                    to: to,
                    status: "追踪中"
                };
                
                this.alerts.unshift(alert);
                
                // 调用回调函数
                if (callback) {
                    callback(alert);
                }
            }
            
        }, 30000); // 每30秒生成一个新交易
    }
}

// 初始化API
const api = new BlockchainAPI();

// 连接API并开始监控
api.connect().then(() => {
    console.log("已连接到区块链API");
    
    // 开始监控交易
    api.monitorTransactions((alert) => {
        // 创建新警报通知
        createAlert(alert.currency, alert.amount);
    });
});
