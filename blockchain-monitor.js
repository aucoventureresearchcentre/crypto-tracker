/**
 * 加密货币交易监控系统
 * 用于监控和追踪加密货币转账，对大额转账发出警报，并追踪资金流向
 */

class BlockchainMonitor {
    constructor(options = {}) {
        // 配置选项
        this.options = {
            alertThreshold: 500000, // 警报阈值，默认500000
            refreshInterval: 30, // 刷新间隔（秒）
            apiKey: options.apiKey || null,
            apiEndpoint: options.apiEndpoint || 'https://api.blockchain.info',
            ...options
        };
        
        // 初始化状态
        this.isMonitoring = false;
        this.monitoredWallets = new Map(); // 监控的钱包地址
        this.trackedTransactions = new Map(); // 追踪的交易
        this.alerts = []; // 警报列表
        this.eventListeners = {
            'alert': [],
            'transaction': [],
            'walletUpdate': [],
            'error': []
        };
        
        // 初始化API连接器
        this.apiConnector = new BlockchainAPIConnector({
            apiKey: this.options.apiKey,
            endpoint: this.options.apiEndpoint
        });
    }
    
    /**
     * 开始监控
     * @returns {Promise<boolean>} 是否成功启动监控
     */
    async startMonitoring() {
        if (this.isMonitoring) {
            return true; // 已经在监控中
        }
        
        try {
            // 测试API连接
            await this.apiConnector.testConnection();
            
            // 设置定时器，定期检查交易
            this.monitoringInterval = setInterval(() => {
                this._checkTransactions().catch(error => {
                    this._emitEvent('error', {
                        message: '检查交易时出错',
                        error: error
                    });
                });
            }, this.options.refreshInterval * 1000);
            
            this.isMonitoring = true;
            return true;
        } catch (error) {
            this._emitEvent('error', {
                message: '启动监控失败',
                error: error
            });
            return false;
        }
    }
    
    /**
     * 停止监控
     */
    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        this.isMonitoring = false;
    }
    
    /**
     * 添加要监控的钱包地址
     * @param {string} address 钱包地址
     * @param {string} name 钱包名称（可选）
     * @param {string} currency 货币类型（BTC, ETH, USDT等）
     * @returns {boolean} 是否成功添加
     */
    addWallet(address, name = '', currency = 'BTC') {
        if (!this._validateAddress(address, currency)) {
            this._emitEvent('error', {
                message: '无效的钱包地址',
                address: address,
                currency: currency
            });
            return false;
        }
        
        this.monitoredWallets.set(address, {
            name: name || address.substring(0, 8) + '...',
            address: address,
            currency: currency,
            balance: 0,
            lastChecked: null,
            transactions: []
        });
        
        // 立即获取钱包余额
        this._updateWalletBalance(address).catch(error => {
            this._emitEvent('error', {
                message: '获取钱包余额失败',
                address: address,
                error: error
            });
        });
        
        return true;
    }
    
    /**
     * 移除监控的钱包
     * @param {string} address 钱包地址
     * @returns {boolean} 是否成功移除
     */
    removeWallet(address) {
        return this.monitoredWallets.delete(address);
    }
    
    /**
     * 获取所有监控的钱包
     * @returns {Array} 钱包列表
     */
    getMonitoredWallets() {
        return Array.from(this.monitoredWallets.values());
    }
    
    /**
     * 获取所有警报
     * @param {Object} filters 过滤条件
     * @returns {Array} 警报列表
     */
    getAlerts(filters = {}) {
        let filteredAlerts = [...this.alerts];
        
        // 应用过滤器
        if (filters.type) {
            filteredAlerts = filteredAlerts.filter(alert => alert.type === filters.type);
        }
        
        if (filters.status) {
            filteredAlerts = filteredAlerts.filter(alert => alert.status === filters.status);
        }
        
        if (filters.fromDate) {
            const fromDate = new Date(filters.fromDate);
            filteredAlerts = filteredAlerts.filter(alert => new Date(alert.time) >= fromDate);
        }
        
        if (filters.toDate) {
            const toDate = new Date(filters.toDate);
            filteredAlerts = filteredAlerts.filter(alert => new Date(alert.time) <= toDate);
        }
        
        // 排序（默认按时间降序）
        filteredAlerts.sort((a, b) => new Date(b.time) - new Date(a.time));
        
        return filteredAlerts;
    }
    
    /**
     * 获取交易历史
     * @param {Object} filters 过滤条件
     * @returns {Array} 交易列表
     */
    getTransactions(filters = {}) {
        let transactions = [];
        
        // 收集所有钱包的交易
        for (const wallet of this.monitoredWallets.values()) {
            transactions = transactions.concat(wallet.transactions.map(tx => ({
                ...tx,
                walletAddress: wallet.address,
                walletName: wallet.name,
                currency: wallet.currency
            })));
        }
        
        // 应用过滤器
        if (filters.currency) {
            transactions = transactions.filter(tx => tx.currency === filters.currency);
        }
        
        if (filters.fromDate) {
            const fromDate = new Date(filters.fromDate);
            transactions = transactions.filter(tx => new Date(tx.time) >= fromDate);
        }
        
        if (filters.toDate) {
            const toDate = new Date(filters.toDate);
            transactions = transactions.filter(tx => new Date(tx.time) <= toDate);
        }
        
        if (filters.minAmount) {
            transactions = transactions.filter(tx => tx.amount >= filters.minAmount);
        }
        
        // 排序（默认按时间降序）
        transactions.sort((a, b) => new Date(b.time) - new Date(a.time));
        
        return transactions;
    }
    
    /**
     * 追踪特定交易
     * @param {string} txHash 交易哈希
     * @returns {Promise<Object>} 追踪结果
     */
    async trackTransaction(txHash) {
        try {
            // 获取交易详情
            const txDetails = await this.apiConnector.getTransactionDetails(txHash);
            
            // 添加到追踪列表
            this.trackedTransactions.set(txHash, {
                ...txDetails,
                trackingStarted: new Date().toISOString(),
                subsequentTransactions: []
            });
            
            // 检查是否是大额交易
            if (txDetails.amount >= this.options.alertThreshold) {
                this._createAlert({
                    type: '大额转账',
                    txHash: txHash,
                    from: txDetails.from,
                    to: txDetails.to,
                    amount: txDetails.amount,
                    currency: txDetails.currency,
                    time: txDetails.time,
                    status: '追踪中'
                });
            }
            
            // 开始追踪后续交易
            this._trackSubsequentTransactions(txHash, txDetails.to);
            
            return this.trackedTransactions.get(txHash);
        } catch (error) {
            this._emitEvent('error', {
                message: '追踪交易失败',
                txHash: txHash,
                error: error
            });
            throw error;
        }
    }
    
    /**
     * 更新警报状态
     * @param {string} alertId 警报ID
     * @param {string} status 新状态
     * @param {string} resolution 解决方案（可选）
     * @returns {boolean} 是否成功更新
     */
    updateAlertStatus(alertId, status, resolution = '') {
        const alertIndex = this.alerts.findIndex(alert => alert.id === alertId);
        if (alertIndex === -1) {
            return false;
        }
        
        this.alerts[alertIndex] = {
            ...this.alerts[alertIndex],
            status: status,
            resolution: resolution,
            updatedAt: new Date().toISOString()
        };
        
        return true;
    }
    
    /**
     * 添加事件监听器
     * @param {string} event 事件名称 ('alert', 'transaction', 'walletUpdate', 'error')
     * @param {Function} callback 回调函数
     */
    on(event, callback) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].push(callback);
        }
    }
    
    /**
     * 移除事件监听器
     * @param {string} event 事件名称
     * @param {Function} callback 回调函数
     */
    off(event, callback) {
        if (this.eventListeners[event]) {
            this.eventListeners[event] = this.eventListeners[event]
                .filter(listener => listener !== callback);
        }
    }
    
    /**
     * 设置警报阈值
     * @param {number} threshold 新的阈值
     */
    setAlertThreshold(threshold) {
        this.options.alertThreshold = threshold;
    }
    
    /**
     * 设置刷新间隔
     * @param {number} seconds 间隔秒数
     */
    setRefreshInterval(seconds) {
        this.options.refreshInterval = seconds;
        
        // 如果正在监控，重新启动定时器
        if (this.isMonitoring) {
            this.stopMonitoring();
            this.startMonitoring();
        }
    }
    
    /**
     * 验证钱包地址
     * @private
     * @param {string} address 钱包地址
     * @param {string} currency 货币类型
     * @returns {boolean} 是否有效
     */
    _validateAddress(address, currency) {
        // 简单验证，实际应用中应使用更严格的验证
        if (!address || typeof address !== 'string') {
            return false;
        }
        
        // 根据不同货币类型验证地址格式
        switch (currency.toUpperCase()) {
            case 'BTC':
                // 比特币地址通常以1、3或bc1开头
                return /^(1|3|bc1)[a-zA-Z0-9]{25,42}$/.test(address);
            case 'ETH':
                // 以太坊地址通常以0x开头，后跟40个十六进制字符
                return /^0x[a-fA-F0-9]{40}$/.test(address);
            case 'USDT':
                // USDT可能在不同链上，这里简化处理
                return /^(0x[a-fA-F0-9]{40}|1|3|bc1[a-zA-Z0-9]{25,42})$/.test(address);
            default:
                // 其他货币简单验证
                return address.length >= 26 && address.length <= 42;
        }
    }
    
    /**
     * 更新钱包余额
     * @private
     * @param {string} address 钱包地址
     */
    async _updateWalletBalance(address) {
        const wallet = this.monitoredWallets.get(address);
        if (!wallet) {
            return;
        }
        
        try {
            const balanceInfo = await this.apiConnector.getWalletBalance(address, wallet.currency);
            
            // 更新钱包信息
            this.monitoredWallets.set(address, {
                ...wallet,
                balance: balanceInfo.balance,
                lastChecked: new Date().toISOString()
            });
            
            this._emitEvent('walletUpdate', {
                address: address,
                balance: balanceInfo.balance,
                previousBalance: wallet.balance
            });
            
            return balanceInfo.balance;
        } catch (error) {
            this._emitEvent('error', {
                message: '更新钱包余额失败',
                address: address,
                error: error
            });
            throw error;
        }
    }
    
    /**
     * 检查新交易
     * @private
     */
    async _checkTransactions() {
        for (const [address, wallet] of this.monitoredWallets.entries()) {
            try {
                // 获取最新交易
                const transactions = await this.apiConnector.getRecentTransactions(address, wallet.currency);
                
                // 过滤出新交易
                const existingTxHashes = new Set(wallet.transactions.map(tx => tx.hash));
                const newTransactions = transactions.filter(tx => !existingTxHashes.has(tx.hash));
                
                if (newTransactions.length > 0) {
                    // 更新钱包交易列表
                    const updatedWallet = {
                        ...wallet,
                        transactions: [...newTransactions, ...wallet.transactions]
                    };
                    this.monitoredWallets.set(address, updatedWallet);
                    
                    // 检查大额交易
                    for (const tx of newTransactions) {
                        this._emitEvent('transaction', {
                            ...tx,
                            walletAddress: address,
                            walletName: wallet.name,
                            currency: wallet.currency
                        });
                        
                        if (tx.amount >= this.options.alertThreshold) {
                            this._createAlert({
                                type: '大额转账',
                                txHash: tx.hash,
                                from: tx.from,
                                to: tx.to,
                                amount: tx.amount,
                                currency: wallet.currency,
                                time: tx.time,
                                status: '追踪中'
                            });
                            
                            // 自动开始追踪
                            this.trackTransaction(tx.hash).catch(error => {
                                console.error('自动追踪交易失败:', error);
                            });
                        }
                        
                        // 检查分散转出模式
                        this._checkSplitTransactionPattern(address);
                    }
                }
                
                // 更新钱包余额
                await this._updateWalletBalance(address);
                
            } catch (error) {
                this._emitEvent('error', {
                    message: '检查钱包交易失败',
                    address: address,
                    error: error
                });
            }
        }
    }
    
    /**
     * 检查分散转出模式
     * @private
     * @param {string} address 钱包地址
     */
    _checkSplitTransactionPattern(address) {
        const wallet = this.monitoredWallets.get(address);
        if (!wallet || wallet.transactions.length < 3) {
            return;
        }
        
        // 获取最近24小时的交易
        const oneDayAgo = new Date();
        oneDayAgo.setHours(oneDayAgo.getHours() - 24);
        
        const recentTxs = wallet.transactions.filter(tx => 
            new Date(tx.time) >= oneDayAgo && tx.direction === 'out'
        );
        
        if (recentTxs.length < 3) {
            return;
        }
        
        // 计算总转出金额
        const totalAmount = recentTxs.reduce((sum, tx) => sum + tx.amount, 0);
        
        // 检查是否有多个不同的接收地址
        const uniqueReceivers = new Set(recentTxs.map(tx => tx.to));
        
        // 如果总金额超过阈值且有多个不同接收地址，创建分散转出警报
        if (totalAmount >= this.options.alertThreshold && uniqueReceivers.size >= 3) {
            this._createAlert({
                type: '分散转出',
                from: address,
                to: Array.from(uniqueReceivers),
                amount: totalAmount,
                currency: wallet.currency,
                time: new Date().toISOString(),
                status: '追踪中',
                relatedTxs: recentTxs.map(tx => tx.hash)
            });
        }
    }
    
    /**
     * 追踪后续交易
     * @private
     * @param {string} originalTxHash 原始交易哈希
     * @param {string} targetAddress 目标地址
     */
    async _trackSubsequentTransactions(originalTxHash, targetAddress) {
        const trackedTx = this.trackedTransactions.get(originalTxHash);
        if (!trackedTx) {
            return;
        }
        
        try {
            // 获取目标地址的后续交易
            const subsequentTxs = await this.apiConnector.getRecentTransactions(targetAddress);
            
            // 过滤出新的后续交易
            const existingSubTxHashes = new Set(trackedTx.subsequentTransactions.map(tx => tx.hash));
            const newSubsequentTxs = subsequentTxs.filter(tx => 
                !existingSubTxHashes.has(tx.hash) && 
                tx.direction === 'out' && 
                new Date(tx.time) > new Date(trackedTx.time)
            );
            
            if (newSubsequentTxs.length > 0) {
                // 更新追踪信息
                this.trackedTransactions.set(originalTxHash, {
                    ...trackedTx,
                    subsequentTransactions: [...newSubsequentTxs, ...trackedTx.subsequentTransactions]
                });
                
                // 检查是否有分散转出模式
                const uniqueReceivers = new Set(newSubsequentTxs.map(tx => tx.to));
                if (uniqueReceivers.size >= 3) {
                    // 更新原始警报
                    const alertIndex = this.alerts.findIndex(alert => 
                        alert.txHash === originalTxHash || 
                        (alert.relatedTxs && alert.relatedTxs.includes(originalTxHash))
                    );
                    
                    if (alertIndex !== -1) {
                        this.alerts[alertIndex] = {
                            ...this.alerts[alertIndex],
                            type: this.alerts[alertIndex].type + ' + 分散转出',
                            status: '高风险',
                            updatedAt: new Date().toISOString()
                        };
                        
                        this._emitEvent('alert', {
                            ...this.alerts[alertIndex],
                            message: '检测到资金分散转出模式'
                        });
                    }
                }
                
                // 递归追踪新的目标地址
                for (const subTx of newSubsequentTxs) {
                    this._trackSubsequentTransactions(originalTxHash, subTx.to);
                }
            }
        } catch (error) {
            this._emitEvent('error', {
                message: '追踪后续交易失败',
                originalTxHash: originalTxHash,
                targetAddress: targetAddress,
                error: error
            });
        }
    }
    
    /**
     * 创建警报
     * @private
     * @param {Object} alertData 警报数据
     */
    _createAlert(alertData) {
        const alert = {
            id: 'alert_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
            ...alertData,
            createdAt: new Date().toISOString()
        };
        
        this.alerts.unshift(alert);
        
        // 限制警报数量，防止内存溢出
        if (this.alerts.length > 1000) {
            this.alerts = this.alerts.slice(0, 1000);
        }
        
        this._emitEvent('alert', alert);
        
        return alert;
    }
    
    /**
     * 触发事件
     * @private
     * @param {string} event 事件名称
     * @param {Object} data 事件数据
     */
    _emitEvent(event, data) {
        if (this.eventListeners[event]) {
            for (const callback of this.eventListeners[event]) {
                try {
                    callback(data);
                } catch (error) {
                    console.error('事件处理器错误:', error);
                }
            }
        }
    }
}

/**
 * 区块链API连接器
 * 负责与区块链API通信
 */
class BlockchainAPIConnector {
    constructor(options = {}) {
        this.options = {
            apiKey: options.apiKey || null,
            endpoint: options.endpoint || 'https://api.blockchain.info',
            ...options
        };
        
        // 模拟数据（实际应用中应连接真实API）
        this.simulatedData = {
            wallets: {
                // 比特币钱包
                '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa': {
                    balance: 1250000,
                    currency: 'BTC'
                },
                // 以太坊钱包
                '0x742d35Cc6634C0532925a3b844Bc454e4438f44e': {
                    balance: 2800000,
                    currency: 'ETH'
                },
                // USDT钱包
                '0x5754284f345afc66a98fbb0a0afe71e0f007b949': {
                    balance: 5500000,
                    currency: 'USDT'
                }
            },
            transactions: [
                {
                    hash: '0xf7e6d5c4b3a2918273645a6b7c8d9e0f1a2b3c4d',
                    from: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
                    to: '1HLoD9E4SDFFPDiYfNYnkBLQ85Y51J3Zb1',
                    amount: 750000,
                    time: '2025-03-11T08:42:15Z',
                    direction: 'out',
                    confirmations: 3,
                    fee: 0.0005
                },
                {
                    hash: '0xa2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1',
                    from: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
                    to: '0x8c3f27c50e2b3bfc5a8d8b8f0fe9b1d3c4e5f6a7',
                    amount: 320000,
                    time: '2025-03-11T08:30:42Z',
                    direction: 'out',
                    confirmations: 5,
                    fee: 0.002
                },
                {
                    hash: '0xc4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3',
                    from: '0x5754284f345afc66a98fbb0a0afe71e0f007b949',
                    to: '0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0',
                    amount: 450000,
                    time: '2025-03-11T08:15:37Z',
                    direction: 'out',
                    confirmations: 8,
                    fee: 0.001
                }
            ]
        };
    }
    
    /**
     * 测试API连接
     * @returns {Promise<boolean>} 连接是否成功
     */
    async testConnection() {
        // 模拟API连接测试
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(true);
            }, 500);
        });
    }
    
    /**
     * 获取钱包余额
     * @param {string} address 钱包地址
     * @param {string} currency 货币类型
     * @returns {Promise<Object>} 余额信息
     */
    async getWalletBalance(address, currency = 'BTC') {
        // 模拟API调用
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // 检查模拟数据中是否有该钱包
                if (this.simulatedData.wallets[address]) {
                    resolve({
                        address: address,
                        balance: this.simulatedData.wallets[address].balance,
                        currency: this.simulatedData.wallets[address].currency || currency
                    });
                } else {
                    // 生成随机余额
                    const randomBalance = Math.floor(Math.random() * 1000000) + 10000;
                    
                    // 添加到模拟数据
                    this.simulatedData.wallets[address] = {
                        balance: randomBalance,
                        currency: currency
                    };
                    
                    resolve({
                        address: address,
                        balance: randomBalance,
                        currency: currency
                    });
                }
            }, 300);
        });
    }
    
    /**
     * 获取最近交易
     * @param {string} address 钱包地址
     * @param {string} currency 货币类型
     * @returns {Promise<Array>} 交易列表
     */
    async getRecentTransactions(address, currency = 'BTC') {
        // 模拟API调用
        return new Promise((resolve) => {
            setTimeout(() => {
                // 过滤与该地址相关的交易
                const relatedTxs = this.simulatedData.transactions.filter(tx => 
                    tx.from === address || tx.to === address
                );
                
                // 如果没有相关交易，生成一些随机交易
                if (relatedTxs.length === 0) {
                    const randomTxs = [];
                    const txCount = Math.floor(Math.random() * 3) + 1; // 1-3个随机交易
                    
                    for (let i = 0; i < txCount; i++) {
                        const isOutgoing = Math.random() > 0.5;
                        const randomAmount = Math.floor(Math.random() * 100000) + 1000;
                        const randomAddress = '0x' + Math.random().toString(16).substring(2, 42);
                        
                        randomTxs.push({
                            hash: '0x' + Math.random().toString(16).substring(2, 42),
                            from: isOutgoing ? address : randomAddress,
                            to: isOutgoing ? randomAddress : address,
                            amount: randomAmount,
                            time: new Date(Date.now() - Math.random() * 86400000).toISOString(), // 过去24小时内
                            direction: isOutgoing ? 'out' : 'in',
                            confirmations: Math.floor(Math.random() * 10) + 1,
                            fee: parseFloat((Math.random() * 0.01).toFixed(4))
                        });
                    }
                    
                    // 添加到模拟数据
                    this.simulatedData.transactions = [...randomTxs, ...this.simulatedData.transactions];
                    
                    resolve(randomTxs);
                } else {
                    resolve(relatedTxs);
                }
            }, 500);
        });
    }
    
    /**
     * 获取交易详情
     * @param {string} txHash 交易哈希
     * @returns {Promise<Object>} 交易详情
     */
    async getTransactionDetails(txHash) {
        // 模拟API调用
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // 查找交易
                const tx = this.simulatedData.transactions.find(t => t.hash === txHash);
                
                if (tx) {
                    resolve({
                        ...tx,
                        blockHeight: 700000 + Math.floor(Math.random() * 1000),
                        blockTime: tx.time,
                        status: 'confirmed'
                    });
                } else {
                    // 生成随机交易详情
                    const randomFrom = '0x' + Math.random().toString(16).substring(2, 42);
                    const randomTo = '0x' + Math.random().toString(16).substring(2, 42);
                    const randomAmount = Math.floor(Math.random() * 1000000) + 1000;
                    const randomTime = new Date(Date.now() - Math.random() * 86400000).toISOString();
                    
                    const newTx = {
                        hash: txHash,
                        from: randomFrom,
                        to: randomTo,
                        amount: randomAmount,
                        time: randomTime,
                        direction: 'out',
                        confirmations: Math.floor(Math.random() * 10) + 1,
                        fee: parseFloat((Math.random() * 0.01).toFixed(4)),
                        blockHeight: 700000 + Math.floor(Math.random() * 1000),
                        blockTime: randomTime,
                        status: 'confirmed'
                    };
                    
                    // 添加到模拟数据
                    this.simulatedData.transactions.push(newTx);
                    
                    resolve(newTx);
                }
            }, 400);
        });
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BlockchainMonitor, BlockchainAPIConnector };
}
