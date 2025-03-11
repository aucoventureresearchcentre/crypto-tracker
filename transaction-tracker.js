/**
 * 加密货币交易追踪系统
 * 用于追踪加密货币转账的去向，监控资金是否被分散转出
 */

class TransactionTracker {
    constructor(options = {}) {
        // 配置选项
        this.options = {
            maxTrackingDepth: 5, // 最大追踪深度
            trackingInterval: 60, // 追踪间隔（秒）
            autoTrackLargeTransactions: true, // 自动追踪大额交易
            largeTransactionThreshold: 500000, // 大额交易阈值
            trackSplitTransactions: true, // 追踪分散转出
            minSplitCount: 3, // 最小分散数量
            ...options
        };
        
        // 初始化状态
        this.trackedTransactions = new Map(); // 追踪的交易
        this.trackingJobs = new Map(); // 追踪任务
        this.eventListeners = {
            'transactionTracked': [],
            'fundsSplit': [],
            'trackingComplete': [],
            'error': []
        };
        
        // 初始化API连接器
        this.apiConnector = options.apiConnector || new BlockchainAPIConnector();
    }
    
    /**
     * 开始追踪交易
     * @param {string} txHash 交易哈希
     * @param {Object} options 追踪选项
     * @returns {Promise<Object>} 追踪结果
     */
    async trackTransaction(txHash, options = {}) {
        // 合并选项
        const trackingOptions = {
            ...this.options,
            ...options
        };
        
        try {
            // 检查是否已在追踪
            if (this.trackedTransactions.has(txHash)) {
                return this.trackedTransactions.get(txHash);
            }
            
            // 获取交易详情
            const txDetails = await this.apiConnector.getTransactionDetails(txHash);
            
            // 创建追踪记录
            const trackingRecord = {
                originalTransaction: txDetails,
                trackingStarted: new Date().toISOString(),
                trackingDepth: 0,
                subsequentTransactions: [],
                flowMap: this._createInitialFlowMap(txDetails),
                status: '追踪中',
                lastUpdated: new Date().toISOString()
            };
            
            // 添加到追踪列表
            this.trackedTransactions.set(txHash, trackingRecord);
            
            // 触发事件
            this._emitEvent('transactionTracked', {
                txHash: txHash,
                transaction: trackingRecord
            });
            
            // 开始追踪
            this._startTrackingJob(txHash, trackingOptions);
            
            return trackingRecord;
        } catch (error) {
            this._emitEvent('error', {
                message: '开始追踪交易失败',
                txHash: txHash,
                error: error
            });
            throw error;
        }
    }
    
    /**
     * 停止追踪交易
     * @param {string} txHash 交易哈希
     * @returns {boolean} 是否成功停止
     */
    stopTracking(txHash) {
        // 检查是否在追踪
        if (!this.trackingJobs.has(txHash)) {
            return false;
        }
        
        // 清除定时器
        clearInterval(this.trackingJobs.get(txHash));
        this.trackingJobs.delete(txHash);
        
        // 更新状态
        if (this.trackedTransactions.has(txHash)) {
            const trackingRecord = this.trackedTransactions.get(txHash);
            trackingRecord.status = '已停止追踪';
            trackingRecord.lastUpdated = new Date().toISOString();
            this.trackedTransactions.set(txHash, trackingRecord);
        }
        
        return true;
    }
    
    /**
     * 获取追踪记录
     * @param {string} txHash 交易哈希
     * @returns {Object|null} 追踪记录
     */
    getTrackingRecord(txHash) {
        return this.trackedTransactions.get(txHash) || null;
    }
    
    /**
     * 获取所有追踪记录
     * @returns {Array} 追踪记录列表
     */
    getAllTrackingRecords() {
        return Array.from(this.trackedTransactions.values());
    }
    
    /**
     * 生成资金流向图数据
     * @param {string} txHash 交易哈希
     * @returns {Object|null} 流向图数据
     */
    generateFlowMapData(txHash) {
        const record = this.trackedTransactions.get(txHash);
        if (!record) {
            return null;
        }
        
        return record.flowMap;
    }
    
    /**
     * 检测分散转出模式
     * @param {string} txHash 交易哈希
     * @returns {Object|null} 分散转出信息
     */
    detectSplitPattern(txHash) {
        const record = this.trackedTransactions.get(txHash);
        if (!record) {
            return null;
        }
        
        // 获取所有直接后续交易
        const directSubsequent = record.subsequentTransactions.filter(tx => 
            tx.fromAddress === record.originalTransaction.to
        );
        
        // 检查是否有足够的分散交易
        if (directSubsequent.length >= this.options.minSplitCount) {
            // 计算总金额
            const totalAmount = directSubsequent.reduce((sum, tx) => sum + tx.amount, 0);
            
            // 获取唯一接收地址
            const uniqueReceivers = new Set(directSubsequent.map(tx => tx.to));
            
            // 如果接收地址数量足够多，认为是分散转出
            if (uniqueReceivers.size >= this.options.minSplitCount) {
                return {
                    originalTxHash: txHash,
                    splitTransactions: directSubsequent,
                    totalAmount: totalAmount,
                    receiverCount: uniqueReceivers.size,
                    receivers: Array.from(uniqueReceivers),
                    detectedAt: new Date().toISOString()
                };
            }
        }
        
        return null;
    }
    
    /**
     * 添加事件监听器
     * @param {string} event 事件名称 ('transactionTracked', 'fundsSplit', 'trackingComplete', 'error')
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
     * 创建初始流向图
     * @private
     * @param {Object} transaction 交易详情
     * @returns {Object} 流向图数据
     */
    _createInitialFlowMap(transaction) {
        return {
            nodes: [
                {
                    id: transaction.from,
                    label: this._formatAddress(transaction.from),
                    type: 'source',
                    value: transaction.amount
                },
                {
                    id: transaction.to,
                    label: this._formatAddress(transaction.to),
                    type: 'target',
                    value: transaction.amount
                }
            ],
            edges: [
                {
                    id: transaction.hash,
                    source: transaction.from,
                    target: transaction.to,
                    value: transaction.amount,
                    label: `${transaction.amount} ${transaction.currency || 'units'}`
                }
            ]
        };
    }
    
    /**
     * 开始追踪任务
     * @private
     * @param {string} txHash 交易哈希
     * @param {Object} options 追踪选项
     */
    _startTrackingJob(txHash, options) {
        // 如果已有追踪任务，先停止
        if (this.trackingJobs.has(txHash)) {
            clearInterval(this.trackingJobs.get(txHash));
        }
        
        // 立即执行一次追踪
        this._trackNextLevel(txHash, options).catch(error => {
            this._emitEvent('error', {
                message: '追踪交易失败',
                txHash: txHash,
                error: error
            });
        });
        
        // 设置定时追踪
        const intervalId = setInterval(() => {
            this._trackNextLevel(txHash, options).catch(error => {
                this._emitEvent('error', {
                    message: '追踪交易失败',
                    txHash: txHash,
                    error: error
                });
            });
        }, options.trackingInterval * 1000);
        
        // 保存任务ID
        this.trackingJobs.set(txHash, intervalId);
    }
    
    /**
     * 追踪下一级交易
     * @private
     * @param {string} txHash 交易哈希
     * @param {Object} options 追踪选项
     */
    async _trackNextLevel(txHash, options) {
        const record = this.trackedTransactions.get(txHash);
        if (!record) {
            return;
        }
        
        // 检查是否达到最大深度
        if (record.trackingDepth >= options.maxTrackingDepth) {
            // 更新状态为完成
            record.status = '追踪完成';
            record.lastUpdated = new Date().toISOString();
            this.trackedTransactions.set(txHash, record);
            
            // 停止追踪
            this.stopTracking(txHash);
            
            // 触发完成事件
            this._emitEvent('trackingComplete', {
                txHash: txHash,
                record: record
            });
            
            return;
        }
        
        // 获取需要追踪的地址列表
        const addressesToTrack = this._getAddressesToTrack(record);
        
        // 追踪每个地址的后续交易
        for (const address of addressesToTrack) {
            try {
                // 获取地址的最新交易
                const transactions = await this.apiConnector.getRecentTransactions(address);
                
                // 过滤出新的后续交易
                const existingTxHashes = new Set(record.subsequentTransactions.map(tx => tx.hash));
                const newTransactions = transactions.filter(tx => 
                    !existingTxHashes.has(tx.hash) && 
                    tx.from === address && 
                    new Date(tx.time) > new Date(record.trackingStarted)
                );
                
                if (newTransactions.length > 0) {
                    // 更新追踪记录
                    record.subsequentTransactions = [...record.subsequentTransactions, ...newTransactions];
                    record.trackingDepth += 1;
                    record.lastUpdated = new Date().toISOString();
                    
                    // 更新流向图
                    this._updateFlowMap(record, newTransactions);
                    
                    // 检查分散转出模式
                    if (options.trackSplitTransactions && address === record.originalTransaction.to) {
                        const splitPattern = this.detectSplitPattern(txHash);
                        if (splitPattern) {
                            // 触发分散转出事件
                            this._emitEvent('fundsSplit', splitPattern);
                        }
                    }
                    
                    // 保存更新后的记录
                    this.trackedTransactions.set(txHash, record);
                    
                    // 如果启用了自动追踪大额交易
                    if (options.autoTrackLargeTransactions) {
                        // 查找大额后续交易
                        const largeTransactions = newTransactions.filter(tx => 
                            tx.amount >= options.largeTransactionThreshold
                        );
                        
                        // 自动追踪大额交易
                        for (const tx of largeTransactions) {
                            this.trackTransaction(tx.hash, options).catch(error => {
                                console.error('自动追踪大额交易失败:', error);
                            });
                        }
                    }
                }
            } catch (error) {
                this._emitEvent('error', {
                    message: '追踪地址交易失败',
                    address: address,
                    txHash: txHash,
                    error: error
                });
            }
        }
    }
    
    /**
     * 获取需要追踪的地址列表
     * @private
     * @param {Object} record 追踪记录
     * @returns {Array} 地址列表
     */
    _getAddressesToTrack(record) {
        const addresses = new Set();
        
        // 添加原始交易的接收地址
        addresses.add(record.originalTransaction.to);
        
        // 添加后续交易的接收地址
        for (const tx of record.subsequentTransactions) {
            addresses.add(tx.to);
        }
        
        return Array.from(addresses);
    }
    
    /**
     * 更新流向图
     * @private
     * @param {Object} record 追踪记录
     * @param {Array} newTransactions 新交易列表
     */
    _updateFlowMap(record, newTransactions) {
        const flowMap = record.flowMap;
        
        // 处理每个新交易
        for (const tx of newTransactions) {
            // 检查节点是否已存在
            const sourceExists = flowMap.nodes.some(node => node.id === tx.from);
            const targetExists = flowMap.nodes.some(node => node.id === tx.to);
            
            // 添加源节点（如果不存在）
            if (!sourceExists) {
                flowMap.nodes.push({
                    id: tx.from,
                    label: this._formatAddress(tx.from),
                    type: 'intermediate',
                    value: tx.amount
                });
            }
            
            // 添加目标节点（如果不存在）
            if (!targetExists) {
                flowMap.nodes.push({
                    id: tx.to,
                    label: this._formatAddress(tx.to),
                    type: 'destination',
                    value: tx.amount
                });
            }
            
            // 添加边
            flowMap.edges.push({
                id: tx.hash,
                source: tx.from,
                target: tx.to,
                value: tx.amount,
                label: `${tx.amount} ${tx.currency || 'units'}`
            });
        }
    }
    
    /**
     * 格式化地址
     * @private
     * @param {string} address 地址
     * @returns {string} 格式化后的地址
     */
    _formatAddress(address) {
        if (!address) return '未知';
        if (address.length <= 12) return address;
        return address.substring(0, 6) + '...' + address.substring(address.length - 6);
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
 * 交易可视化工具
 * 用于可视化展示交易流向图
 */
class TransactionVisualizer {
    constructor(options = {}) {
        this.options = {
            container: null, // 容器元素
            width: 800,
            height: 600,
            nodeSize: 30,
            fontSize: 12,
            ...options
        };
        
        // 检查是否有容器
        if (!this.options.container) {
            throw new Error('必须提供容器元素');
        }
        
        // 初始化可视化
        this._initializeVisualization();
    }
    
    /**
     * 初始化可视化
     * @private
     */
    _initializeVisualization() {
        // 在实际应用中，这里会初始化可视化库（如D3.js、Vis.js等）
        // 这里使用简化的实现
        
        // 创建SVG容器
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg.setAttribute('width', this.options.width);
        this.svg.setAttribute('height', this.options.height);
        this.svg.style.border = '1px solid #ddd';
        this.svg.style.borderRadius = '4px';
        this.svg.style.background = '#f9f9f9';
        
        // 添加到容器
        this.options.container.appendChild(this.svg);
        
        // 添加说明
        const legend = document.createElement('div');
        legend.className = 'flow-legend';
        legend.innerHTML = `
            <div class="legend-item">
                <span class="legend-color source"></span>
                <span class="legend-label">来源地址</span>
            </div>
            <div class="legend-item">
                <span class="legend-color intermediate"></span>
                <span class="legend-label">中间地址</span>
            </div>
            <div class="legend-item">
                <span class="legend-color destination"></span>
                <span class="legend-label">目标地址</span>
            </div>
        `;
        
        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            .flow-legend {
                display: flex;
                gap: 20px;
                margin-top: 10px;
                font-size: 12px;
            }
            
            .legend-item {
                display: flex;
                align-items: center;
                gap: 5px;
            }
            
            .legend-color {
                width: 12px;
                height: 12px;
                border-radius: 50%;
            }
            
            .legend-color.source {
                background-color: #3498db;
            }
            
            .legend-color.intermediate {
                background-color: #f39c12;
            }
            
            .legend-color.destination {
                background-color: #e74c3c;
            }
        `;
        document.head.appendChild(style);
        
        // 添加到容器
        this.options.container.appendChild(legend);
    }
    
    /**
     * 渲染流向图
     * @param {Object} flowMapData 流向图数据
     */
    renderFlowMap(flowMapData) {
        // 清空SVG
        while (this.svg.firstChild) {
            this.svg.removeChild(this.svg.firstChild);
        }
        
        if (!flowMapData || !flowMapData.nodes || !flowMapData.edges) {
            return;
        }
        
        // 在实际应用中，这里会使用可视化库渲染图形
        // 这里使用简化的实现
        
        // 创建简单的力导向布局
        const nodes = this._createSimpleLayout(flowMapData);
        
        // 绘制边
        for (const edge of flowMapData.edges) {
            const sourceNode = nodes.find(n => n.id === edge.source);
            const targetNode = nodes.find(n => n.id === edge.target);
            
            if (sourceNode && targetNode) {
                // 创建线条
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', sourceNode.x);
                line.setAttribute('y1', sourceNode.y);
                line.setAttribute('x2', targetNode.x);
                line.setAttribute('y2', targetNode.y);
                line.setAttribute('stroke', '#999');
                line.setAttribute('stroke-width', '2');
                
                // 添加到SVG
                this.svg.appendChild(line);
                
                // 添加标签
                const labelX = (sourceNode.x + targetNode.x) / 2;
                const labelY = (sourceNode.y + targetNode.y) / 2 - 10;
                
                const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                text.setAttribute('x', labelX);
                text.setAttribute('y', labelY);
                text.setAttribute('text-anchor', 'middle');
                text.setAttribute('font-size', this.options.fontSize);
                text.textContent = edge.label;
                
                // 添加到SVG
                this.svg.appendChild(text);
            }
        }
        
        // 绘制节点
        for (const node of nodes) {
            // 确定节点颜色
            let color;
            switch (node.type) {
                case 'source':
                    color = '#3498db'; // 蓝色
                    break;
                case 'intermediate':
                    color = '#f39c12'; // 橙色
                    break;
                case 'destination':
                    color = '#e74c3c'; // 红色
                    break;
                default:
                    color = '#95a5a6'; // 灰色
            }
            
            // 创建圆形
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', node.x);
            circle.setAttribute('cy', node.y);
            circle.setAttribute('r', this.options.nodeSize);
            circle.setAttribute('fill', color);
            
            // 添加到SVG
            this.svg.appendChild(circle);
            
            // 添加标签
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', node.x);
            text.setAttribute('y', node.y + this.options.nodeSize + 15);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('font-size', this.options.fontSize);
            text.textContent = node.label;
            
            // 添加到SVG
            this.svg.appendChild(text);
        }
    }
    
    /**
     * 创建简单布局
     * @private
     * @param {Object} flowMapData 流向图数据
     * @returns {Array} 带有位置信息的节点
     */
    _createSimpleLayout(flowMapData) {
        const nodes = JSON.parse(JSON.stringify(flowMapData.nodes));
        
        // 计算层级
        const levels = this._calculateLevels(flowMapData);
        
        // 为每个节点分配位置
        for (const node of nodes) {
            const level = levels[node.id] || 0;
            const levelNodes = nodes.filter(n => (levels[n.id] || 0) === level);
            const levelIndex = levelNodes.indexOf(node);
            
            // 计算位置
            const levelWidth = this.options.width * 0.8;
            const levelHeight = this.options.height * 0.8;
            const levelCount = Math.max(1, Object.values(levels).filter(l => l === level).length);
            const maxLevel = Math.max(1, ...Object.values(levels));
            
            node.x = this.options.width * 0.1 + (levelWidth * level) / maxLevel;
            node.y = this.options.height * 0.1 + (levelHeight * levelIndex) / levelCount;
        }
        
        return nodes;
    }
    
    /**
     * 计算节点层级
     * @private
     * @param {Object} flowMapData 流向图数据
     * @returns {Object} 节点层级映射
     */
    _calculateLevels(flowMapData) {
        const levels = {};
        const visited = new Set();
        
        // 找到源节点
        const sourceNodes = flowMapData.nodes.filter(node => node.type === 'source');
        
        // 从源节点开始计算层级
        for (const sourceNode of sourceNodes) {
            levels[sourceNode.id] = 0;
            visited.add(sourceNode.id);
        }
        
        // 广度优先搜索计算层级
        let changed = true;
        while (changed) {
            changed = false;
            
            for (const edge of flowMapData.edges) {
                if (visited.has(edge.source) && !visited.has(edge.target)) {
                    levels[edge.target] = (levels[edge.source] || 0) + 1;
                    visited.add(edge.target);
                    changed = true;
                }
            }
        }
        
        return levels;
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TransactionTracker, TransactionVisualizer };
}
