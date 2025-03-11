/**
 * 加密货币交易警报系统
 * 用于监控大额交易并发出警报
 */

class AlertSystem {
    constructor(options = {}) {
        // 配置选项
        this.options = {
            alertThreshold: 500000, // 警报阈值，默认500000
            notificationDuration: 10000, // 通知显示时间（毫秒）
            enableSoundAlerts: true, // 是否启用声音警报
            enableDesktopNotifications: true, // 是否启用桌面通知
            enableEmailAlerts: false, // 是否启用邮件警报
            emailRecipients: [], // 邮件接收者
            ...options
        };
        
        // 初始化状态
        this.alerts = [];
        this.activeNotifications = [];
        this.eventListeners = {
            'newAlert': [],
            'alertStatusChanged': [],
            'alertResolved': []
        };
        
        // 初始化UI元素
        this._initializeUI();
        
        // 请求通知权限
        if (this.options.enableDesktopNotifications && 'Notification' in window) {
            Notification.requestPermission();
        }
    }
    
    /**
     * 初始化UI元素
     * @private
     */
    _initializeUI() {
        // 创建警报容器
        this.alertContainer = document.createElement('div');
        this.alertContainer.className = 'alert-container';
        document.body.appendChild(this.alertContainer);
        
        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            .alert-container {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                gap: 10px;
                max-width: 400px;
            }
            
            .alert-notification {
                background-color: #e74c3c;
                color: white;
                padding: 15px 20px;
                border-radius: 4px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
                display: flex;
                flex-direction: column;
                opacity: 0;
                transform: translateY(20px);
                transition: opacity 0.3s, transform 0.3s;
                cursor: pointer;
            }
            
            .alert-notification.show {
                opacity: 1;
                transform: translateY(0);
            }
            
            .alert-notification .alert-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 5px;
            }
            
            .alert-notification .alert-title {
                font-weight: bold;
                font-size: 16px;
            }
            
            .alert-notification .alert-close {
                background: none;
                border: none;
                color: white;
                font-size: 18px;
                cursor: pointer;
                padding: 0 5px;
            }
            
            .alert-notification .alert-content {
                margin-bottom: 5px;
            }
            
            .alert-notification .alert-time {
                font-size: 12px;
                opacity: 0.8;
                align-self: flex-end;
            }
            
            .alert-notification .alert-actions {
                display: flex;
                gap: 10px;
                margin-top: 10px;
            }
            
            .alert-notification .alert-button {
                background-color: rgba(255, 255, 255, 0.2);
                border: none;
                color: white;
                padding: 5px 10px;
                border-radius: 3px;
                cursor: pointer;
                font-size: 12px;
            }
            
            .alert-notification .alert-button:hover {
                background-color: rgba(255, 255, 255, 0.3);
            }
            
            .alert-badge {
                position: fixed;
                top: 10px;
                right: 10px;
                background-color: #e74c3c;
                color: white;
                border-radius: 50%;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: bold;
                z-index: 9999;
                opacity: 0;
                transform: scale(0);
                transition: opacity 0.3s, transform 0.3s;
            }
            
            .alert-badge.show {
                opacity: 1;
                transform: scale(1);
            }
            
            @keyframes alert-pulse {
                0% { box-shadow: 0 0 0 0 rgba(231, 76, 60, 0.7); }
                70% { box-shadow: 0 0 0 10px rgba(231, 76, 60, 0); }
                100% { box-shadow: 0 0 0 0 rgba(231, 76, 60, 0); }
            }
            
            .alert-pulse {
                animation: alert-pulse 1.5s infinite;
            }
        `;
        document.head.appendChild(style);
        
        // 创建警报徽章
        this.alertBadge = document.createElement('div');
        this.alertBadge.className = 'alert-badge';
        this.alertBadge.textContent = '0';
        document.body.appendChild(this.alertBadge);
        
        // 创建警报音效
        this.alertSound = new Audio();
        this.alertSound.src = 'data:audio/wav;base64,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n319A9l+pRafbX0D2X6lFp9tfgPYfqUWn21+A9h+pRafbn8D136lFp9ufwPXfqUWn26AA9Z+pRafb4AD1n6lFp9vgQPVfqUWn3CBA9V9pRafcIID1H2lFp9wggPUfaUWn3GDA9N9pRafcYMD032lFp9xhAPSfaUWn3KEA9J9pRafcoUD0XylFp9yhQPRfKUWn3OGA9B8pRafcYYD0HylF59xhwPPfKUXn3GHA898pRefcogDznylF59yiAPOfKUXn3KJA818pRefcokDzXylF59ziwPMfKUXn3OLA8x7pRefcYwDy3ulF59xjAPLeqUXn3GNA8p6pRefcY0DynqlF59xjgPJeqUXn3GOA8l6pRefcY8DyHqlF59xjwPIeqUXn3GQA8d6pRefcZADx3mlF59xkQPGeaUXn3GRA8Z5pRefcZIDxXmlF59xkgPFeaUXn3GTA8R5pRefcZMDxHmlF59xlAPDeKUXn3GUA8N4pRefcZUDwnilF59xlQPCeKUXn3GWA8F4pRefcZYDwXilF59xlwPAeKUXn3GXA8B3pRefcZgDv3elF59xmAO/d6UXn3GZA753pRefcZkDvnelF59xmgO9d6UXn3GaA713pRefcZsDvHelF59xmwO8dqUXn3GcA7x2pRefcZwDu3alF59xnQO7dqUXn3GdA7p2pRefcZ4DunalF59xngO5dqUXn3GfA7l2pRefcZ8DuHalF59xoAO4daUXn3GgA7d1pRefcaEDt3WlF59xoQO2daUXn3GiA7Z1pRefcaIDtXWlF59xowO1daUXn3GjA7R1pRefcaQDtHWlF59xpAOzdaUXn3GlA7N0pRefcaUDsnSlF59xpgOydKUXn3GmA7F0pRefcacDsXSlF59xpwOwdKUXn3GoA7B0pRefcagDr3SlF59xqQOvdKUXn3GpA650pRefcaoDrnOlF59xqgOtc6UXn3GrA61zpRefcasDrHOlF59xrAOsc6UXn3GsA6tzpRefca0Dq3OlF59xrQOqc6UXn3GuA6pzpRefca4DqXOlF59xrwOpc6UXn3GvA6hypRefcbADqHKlF59xsAOncqUXn3GxA6dypRefcbEDpnKlF59xsgOmcqUXn3GyA6VypRefcbMDpXKlF59xswOkcqUXn3G0A6RxpRefcbQDo3GlF59xtQOjcaUXn3G1A6JxpRefcbYDonGlF59xtgOhcaUXn3G3A6FxpRefcbcDoHGlF59xuAOgcaUXn3G4A59xpRefcbkDn3ClF59xuQOecKUXn3G6A55wpRefcboDnXClF59xuwOdcKUXn3G7A5xwpRefcbwDnHClF59xvAObcKUXn3G9A5twpRefcb0DmnClF59xvgOacKUXn3G+A5lwpRefcb8DmXClF59xvwOYb6UXn3HAA5hvpRefccADl2+lF59xwQOXb6UXn3HBA5ZvpRefccIDlm+lF59xwgOVb6UXn3HDA5VvpRefccMDlG+lF59xxAOUb6UXn3HEA5NvpRefccUDk2+lF59xxQOSb6UXn3HGA5JupRefccYDkW6lF59xxwORbqUXn3HHA5BupRefccgDkG6lF59xyAOPbqUXn3HJA49upRefcckDjm6lF59xygOObqUXn3HKA41upRefccsDjW6lF59xywOMbqUXn3HMA4xupRefccwDi26lF59xzQOLbqUXn3HNA4pupRefcc4Di26lF59xzgOJbqUXn3HPA4lupRefcc8DiG2lF59x0AOIbaUXn3HQA4dtpRefcdEDh22lF59x0QOGbaUXn3HSA4ZtpRefcdIDhW2lF59x0wOFbaUXn3HTA4RtpRefcdQDhG2lF59x1AODbaUXn3HVA4NtpRefcdUDgm2lF59x1gOCbaUXn3HWA4FtpRefcdcDgW2lF59x1wOAbaUXn3HYA4BtpRefcdgDf22lF59x2QN/baUXn3HZA35tpRefcdoDfm2lF59x2gN9baUXn3HbA31tpRefcdsDfG2lF59x3AN8baUXn3HcA3ttpRefcd0De22lF59x3QN6baUXn3HeA3ptpRefcd4DeW2lF59x3wN5baUXn3HfA3htpRefceADeG2lF59x4AN3baUXn3HhA3dtpRefceEDdm2lF59x4gN2baUXn3HiA3VtpRefceMDdW2lF59x4wN0baUXn3HkA3RtpRefceQDc22lF59x5QNzbaUXn3HlA3JtpRefceYDcm2lF59x5gNxbaUXn3HnA3FtpRefcecDcG2lF59x6ANwbaUXn3HoA29tpRefcekDb22lF59x6QNubaUXn3HqA25tpRefceoDbaUYn3HrA21lGJ9x6wNsZRifcewDbGUYn3HsA2tlGJ9x7QNrZRifce0DamUYn3HuA2plGJ9x7gNpZRifce8DaWUYn3HvA2hlGJ9x8ANnZRifcfADZ2UYn3HxA2ZlGJ9x8QNlZRifcfIDZWUYn3HyA2RlGJ9x8wNkZRifcfMDY2UYn3H0A2NlGJ9x9ANiZRifcfUDYmUYn3H1A2FlGJ9x9gNhZRifcfYDYGUYn3H3A2BlGJ9x9wNfZRifcfgDX2UYn3H4A15lGJ9x+QNeZRifcfkDXWUYn3H6A11lGJ9x+gNcZRifcfsDXGUYn3H7A1tlGJ9x/ANbZRifcfwDWmUYn3H9A1plGJ9x/QNZZRifcf4DWWUYn3H+A1hlGJ9x/wNYZRifcf8DV2UYn3IBA1dlGJ9yAQNWZRifcgIDVmUYn3ICA1VlGJ9yAwNVZRifcgMDVGUYn3IEA1RlGJ9yBANTZRifcgUDU2UYn3IFA1JlGJ9yBgNSZRifcgYDUWUYn3IHA1FlGJ9yBwNQZRifcggDUGUYn3IIA09lGJ9yCQNPZRifcgkDTmUYn3IKA05lGJ9yCgNNZRifcgsDTWUYn3ILA0xlGJ9yDANMZRifcgwDS2UYn3INA0tlGJ9yDQNKZRifcg4DSmUYn3IOA0llGJ9yDwNJZRifcg8DSGUYn3IQA0hlGJ9yEANHZRifchEDR2UYn3IRA0ZlGJ9yEgNGZRifchIDRWUYn3ITA0VlGJ9yEwNEZRifchQDRGUYn3IUA0NlGJ9yFQNDZRifchUDQmUYn3IWA0JlGJ9yFgNBZRifchcDQWUYn3IXA0BlGJ9yGANAZRifchgDP2UYn3IZAz9lGJ9yGQM+ZRifchoD';
        
        // 加载完成后设置音量
        this.alertSound.addEventListener('canplaythrough', () => {
            this.alertSound.volume = 0.5;
        });
    }
    
    /**
     * 设置警报阈值
     * @param {number} threshold 新的阈值
     */
    setAlertThreshold(threshold) {
        this.options.alertThreshold = threshold;
    }
    
    /**
     * 启用或禁用声音警报
     * @param {boolean} enable 是否启用
     */
    enableSoundAlerts(enable) {
        this.options.enableSoundAlerts = enable;
    }
    
    /**
     * 启用或禁用桌面通知
     * @param {boolean} enable 是否启用
     */
    enableDesktopNotifications(enable) {
        this.options.enableDesktopNotifications = enable;
        
        if (enable && 'Notification' in window && Notification.permission !== 'granted') {
            Notification.requestPermission();
        }
    }
    
    /**
     * 启用或禁用邮件警报
     * @param {boolean} enable 是否启用
     * @param {Array} recipients 邮件接收者列表
     */
    enableEmailAlerts(enable, recipients = []) {
        this.options.enableEmailAlerts = enable;
        if (recipients.length > 0) {
            this.options.emailRecipients = recipients;
        }
    }
    
    /**
     * 创建新警报
     * @param {Object} alertData 警报数据
     * @returns {Object} 创建的警报对象
     */
    createAlert(alertData) {
        const alert = {
            id: 'alert_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
            time: new Date().toISOString(),
            status: '新警报',
            ...alertData
        };
        
        // 添加到警报列表
        this.alerts.unshift(alert);
        
        // 限制警报数量，防止内存溢出
        if (this.alerts.length > 100) {
            this.alerts = this.alerts.slice(0, 100);
        }
        
        // 触发警报通知
        this._triggerAlertNotification(alert);
        
        // 触发事件
        this._triggerEvent('newAlert', alert);
        
        return alert;
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
        
        const oldStatus = this.alerts[alertIndex].status;
        
        this.alerts[alertIndex] = {
            ...this.alerts[alertIndex],
            status: status,
            resolution: resolution,
            updatedAt: new Date().toISOString()
        };
        
        // 触发事件
        this._triggerEvent('alertStatusChanged', {
            alert: this.alerts[alertIndex],
            oldStatus: oldStatus,
            newStatus: status
        });
        
        // 如果状态为已解决，触发解决事件
        if (status === '已解决') {
            this._triggerEvent('alertResolved', this.alerts[alertIndex]);
        }
        
        return true;
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
     * 获取活跃警报数量
     * @returns {number} 活跃警报数量
     */
    getActiveAlertCount() {
        return this.alerts.filter(alert => alert.status !== '已解决').length;
    }
    
    /**
     * 添加事件监听器
     * @param {string} event 事件名称 ('newAlert', 'alertStatusChanged', 'alertResolved')
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
     * 触发警报通知
     * @private
     * @param {Object} alert 警报对象
     */
    _triggerAlertNotification(alert) {
        // 更新警报徽章
        const activeCount = this.getActiveAlertCount();
        this.alertBadge.textContent = activeCount;
        this.alertBadge.classList.add('show');
        this.alertBadge.classList.add('alert-pulse');
        
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = 'alert-notification';
        notification.innerHTML = `
            <div class="alert-header">
                <span class="alert-title">${alert.type || '警报'}</span>
                <button class="alert-close">&times;</button>
            </div>
            <div class="alert-content">
                ${this._formatAlertContent(alert)}
            </div>
            <span class="alert-time">${this._formatTime(alert.time)}</span>
            <div class="alert-actions">
                <button class="alert-button view-details">查看详情</button>
                <button class="alert-button track-funds">追踪资金</button>
            </div>
        `;
        
        // 添加到容器
        this.alertContainer.appendChild(notification);
        
        // 显示通知
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        // 添加关闭按钮功能
        notification.querySelector('.alert-close').addEventListener('click', (e) => {
            e.stopPropagation();
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        });
        
        // 添加查看详情按钮功能
        notification.querySelector('.view-details').addEventListener('click', (e) => {
            e.stopPropagation();
            // 在实际应用中，这里会打开详情页面
            console.log('查看警报详情:', alert);
            
            // 模拟打开警报详情
            if (typeof window.showAlertDetails === 'function') {
                window.showAlertDetails(alert.id);
            }
        });
        
        // 添加追踪资金按钮功能
        notification.querySelector('.track-funds').addEventListener('click', (e) => {
            e.stopPropagation();
            // 在实际应用中，这里会打开追踪页面
            console.log('追踪资金:', alert);
            
            // 模拟打开追踪页面
            if (typeof window.trackTransaction === 'function') {
                window.trackTransaction(alert.txHash);
            }
        });
        
        // 点击通知打开详情
        notification.addEventListener('click', () => {
            // 在实际应用中，这里会打开详情页面
            console.log('查看警报详情:', alert);
            
            // 模拟打开警报详情
            if (typeof window.showAlertDetails === 'function') {
                window.showAlertDetails(alert.id);
            }
        });
        
        // 自动关闭
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, this.options.notificationDuration);
        
        // 播放声音
        if (this.options.enableSoundAlerts) {
            this.alertSound.currentTime = 0;
            this.alertSound.play().catch(error => {
                console.warn('无法播放警报声音:', error);
            });
        }
        
        // 发送桌面通知
        if (this.options.enableDesktopNotifications && 'Notification' in window && Notification.permission === 'granted') {
            const title = `${alert.type || '警报'}: ${this._formatAlertTitle(alert)}`;
            const options = {
                body: this._formatAlertContent(alert),
                icon: '/favicon.ico', // 实际应用中应使用适当的图标
                tag: alert.id,
                requireInteraction: true
            };
            
            const desktopNotification = new Notification(title, options);
            
            desktopNotification.onclick = () => {
                window.focus();
                if (typeof window.showAlertDetails === 'function') {
                    window.showAlertDetails(alert.id);
                }
            };
        }
        
        // 发送邮件警报
        if (this.options.enableEmailAlerts && this.options.emailRecipients.length > 0) {
            this._sendEmailAlert(alert);
        }
    }
    
    /**
     * 格式化警报标题
     * @private
     * @param {Object} alert 警报对象
     * @returns {string} 格式化后的标题
     */
    _formatAlertTitle(alert) {
        if (alert.type === '大额转账') {
            return `检测到${alert.amount.toLocaleString()} ${alert.currency}的大额转账`;
        } else if (alert.type === '分散转出') {
            return `检测到${alert.amount.toLocaleString()} ${alert.currency}的分散转出`;
        } else {
            return `新警报: ${alert.type || '未知类型'}`;
        }
    }
    
    /**
     * 格式化警报内容
     * @private
     * @param {Object} alert 警报对象
     * @returns {string} 格式化后的内容
     */
    _formatAlertContent(alert) {
        let content = '';
        
        if (alert.type === '大额转账') {
            content = `
                <strong>金额:</strong> ${alert.amount.toLocaleString()} ${alert.currency}<br>
                <strong>来源:</strong> ${this._formatAddress(alert.from)}<br>
                <strong>目标:</strong> ${this._formatAddress(alert.to)}
            `;
        } else if (alert.type === '分散转出') {
            content = `
                <strong>金额:</strong> ${alert.amount.toLocaleString()} ${alert.currency}<br>
                <strong>来源:</strong> ${this._formatAddress(alert.from)}<br>
                <strong>目标:</strong> 多个地址 (${Array.isArray(alert.to) ? alert.to.length : '多个'})
            `;
        } else {
            content = `
                <strong>类型:</strong> ${alert.type || '未知'}<br>
                <strong>状态:</strong> ${alert.status || '未知'}
            `;
            
            if (alert.amount) {
                content += `<br><strong>金额:</strong> ${alert.amount.toLocaleString()} ${alert.currency || ''}`;
            }
        }
        
        return content;
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
     * 格式化时间
     * @private
     * @param {string} time ISO时间字符串
     * @returns {string} 格式化后的时间
     */
    _formatTime(time) {
        if (!time) return '';
        
        const date = new Date(time);
        return date.toLocaleString('zh-CN');
    }
    
    /**
     * 发送邮件警报
     * @private
     * @param {Object} alert 警报对象
     */
    _sendEmailAlert(alert) {
        // 在实际应用中，这里会调用邮件发送API
        console.log('发送邮件警报:', {
            recipients: this.options.emailRecipients,
            subject: `[警报] ${this._formatAlertTitle(alert)}`,
            body: this._formatAlertContent(alert)
        });
    }
    
    /**
     * 触发事件
     * @private
     * @param {string} event 事件名称
     * @param {Object} data 事件数据
     */
    _triggerEvent(event, data) {
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

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AlertSystem };
}
