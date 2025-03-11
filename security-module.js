/**
 * 加密货币监控系统安全模块
 * 用于保护系统免受黑客攻击与入侵
 */

class SecurityModule {
    constructor(options = {}) {
        // 配置选项
        this.options = {
            enableCSRFProtection: true, // 启用CSRF保护
            enableXSSProtection: true, // 启用XSS保护
            enableRateLimiting: true, // 启用速率限制
            maxRequestsPerMinute: 60, // 每分钟最大请求数
            enableIPBlocking: true, // 启用IP封禁
            maxFailedAttempts: 5, // 最大失败尝试次数
            blockDuration: 30 * 60 * 1000, // 封禁时长（毫秒）
            enableAuditLogging: true, // 启用审计日志
            sensitiveActions: ['login', 'updateSettings', 'addWallet', 'removeWallet'], // 敏感操作列表
            ...options
        };
        
        // 初始化状态
        this.csrfTokens = new Map(); // CSRF令牌
        this.requestCounts = new Map(); // 请求计数
        this.failedAttempts = new Map(); // 失败尝试
        this.blockedIPs = new Map(); // 被封禁的IP
        this.auditLogs = []; // 审计日志
        this.eventListeners = {
            'securityViolation': [],
            'ipBlocked': [],
            'rateLimitExceeded': [],
            'sensitiveAction': []
        };
        
        // 初始化安全措施
        this._initializeSecurity();
    }
    
    /**
     * 初始化安全措施
     * @private
     */
    _initializeSecurity() {
        // 添加安全相关的元标签
        this._addSecurityMetaTags();
        
        // 添加安全相关的HTTP头
        this._addSecurityHeaders();
        
        // 初始化CSRF保护
        if (this.options.enableCSRFProtection) {
            this._initializeCSRFProtection();
        }
        
        // 初始化XSS保护
        if (this.options.enableXSSProtection) {
            this._initializeXSSProtection();
        }
        
        // 定期清理过期数据
        setInterval(() => this._cleanupExpiredData(), 5 * 60 * 1000); // 每5分钟清理一次
    }
    
    /**
     * 添加安全相关的元标签
     * @private
     */
    _addSecurityMetaTags() {
        // 添加CSP元标签
        const cspMeta = document.createElement('meta');
        cspMeta.httpEquiv = 'Content-Security-Policy';
        cspMeta.content = "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data: https:; connect-src 'self' https://api.blockchain.info;";
        document.head.appendChild(cspMeta);
        
        // 添加XSS保护元标签
        const xssMeta = document.createElement('meta');
        xssMeta.httpEquiv = 'X-XSS-Protection';
        xssMeta.content = '1; mode=block';
        document.head.appendChild(xssMeta);
        
        // 添加点击劫持保护元标签
        const frameMeta = document.createElement('meta');
        frameMeta.httpEquiv = 'X-Frame-Options';
        frameMeta.content = 'DENY';
        document.head.appendChild(frameMeta);
    }
    
    /**
     * 添加安全相关的HTTP头
     * @private
     */
    _addSecurityHeaders() {
        // 在实际应用中，这些头应该在服务器端设置
        // 这里仅作为参考
        const securityHeaders = {
            'Content-Security-Policy': "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data: https:; connect-src 'self' https://api.blockchain.info;",
            'X-XSS-Protection': '1; mode=block',
            'X-Frame-Options': 'DENY',
            'X-Content-Type-Options': 'nosniff',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
        };
        
        console.log('建议在服务器端设置以下安全头：', securityHeaders);
    }
    
    /**
     * 初始化CSRF保护
     * @private
     */
    _initializeCSRFProtection() {
        // 生成CSRF令牌
        const csrfToken = this._generateRandomToken();
        
        // 存储令牌
        this.csrfTokens.set('default', {
            token: csrfToken,
            expires: Date.now() + 24 * 60 * 60 * 1000 // 24小时后过期
        });
        
        // 添加CSRF令牌到表单
        document.addEventListener('DOMContentLoaded', () => {
            const forms = document.querySelectorAll('form');
            forms.forEach(form => {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = 'csrf_token';
                input.value = csrfToken;
                form.appendChild(input);
            });
        });
        
        // 拦截表单提交
        document.addEventListener('submit', (event) => {
            const form = event.target;
            const tokenInput = form.querySelector('input[name="csrf_token"]');
            
            if (!tokenInput || !this._validateCSRFToken(tokenInput.value)) {
                event.preventDefault();
                this._handleSecurityViolation('CSRF', {
                    action: 'form_submit',
                    form: form.action,
                    ip: this._getClientIP()
                });
                alert('安全错误：无效的请求令牌。请刷新页面后重试。');
            }
        });
        
        // 拦截AJAX请求
        const originalXHROpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method, url) {
            this.addEventListener('readystatechange', function() {
                if (this.readyState === 1) {
                    this.setRequestHeader('X-CSRF-Token', csrfToken);
                }
            });
            originalXHROpen.apply(this, arguments);
        };
        
        // 拦截Fetch请求
        const originalFetch = window.fetch;
        window.fetch = function(url, options = {}) {
            if (!options.headers) {
                options.headers = {};
            }
            
            if (options.headers instanceof Headers) {
                options.headers.append('X-CSRF-Token', csrfToken);
            } else {
                options.headers['X-CSRF-Token'] = csrfToken;
            }
            
            return originalFetch.call(this, url, options);
        };
    }
    
    /**
     * 初始化XSS保护
     * @private
     */
    _initializeXSSProtection() {
        // 重写innerHTML和outerHTML
        this._secureProperty(Element.prototype, 'innerHTML', this._sanitizeHTML.bind(this));
        this._secureProperty(Element.prototype, 'outerHTML', this._sanitizeHTML.bind(this));
        
        // 重写document.write和document.writeln
        this._secureMethod(Document.prototype, 'write', this._sanitizeHTML.bind(this));
        this._secureMethod(Document.prototype, 'writeln', this._sanitizeHTML.bind(this));
        
        // 重写insertAdjacentHTML
        this._secureMethod(Element.prototype, 'insertAdjacentHTML', (position, html) => {
            return [position, this._sanitizeHTML(html)];
        });
    }
    
    /**
     * 安全地重写对象属性
     * @private
     * @param {Object} object 目标对象
     * @param {string} property 属性名
     * @param {Function} sanitizer 净化函数
     */
    _secureProperty(object, property, sanitizer) {
        const descriptor = Object.getOwnPropertyDescriptor(object, property);
        if (!descriptor || !descriptor.set) return;
        
        const originalSetter = descriptor.set;
        
        Object.defineProperty(object, property, {
            ...descriptor,
            set: function(value) {
                originalSetter.call(this, sanitizer(value));
            }
        });
    }
    
    /**
     * 安全地重写对象方法
     * @private
     * @param {Object} object 目标对象
     * @param {string} method 方法名
     * @param {Function} sanitizer 净化函数
     */
    _secureMethod(object, method, sanitizer) {
        const originalMethod = object[method];
        
        object[method] = function() {
            let args = Array.from(arguments);
            
            if (typeof sanitizer === 'function') {
                if (args.length === 1) {
                    args[0] = sanitizer(args[0]);
                } else {
                    const result = sanitizer.apply(null, args);
                    if (Array.isArray(result)) {
                        args = result;
                    }
                }
            }
            
            return originalMethod.apply(this, args);
        };
    }
    
    /**
     * 净化HTML内容
     * @private
     * @param {string} html HTML内容
     * @returns {string} 净化后的HTML
     */
    _sanitizeHTML(html) {
        if (typeof html !== 'string') return html;
        
        // 创建一个简单的HTML净化器
        const sanitizer = {
            // 允许的标签
            allowedTags: ['a', 'b', 'br', 'div', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'i', 'li', 'ol', 'p', 'span', 'strong', 'table', 'tbody', 'td', 'th', 'thead', 'tr', 'ul'],
            
            // 允许的属性
            allowedAttributes: {
                'a': ['href', 'target', 'rel'],
                'div': ['class', 'id'],
                'span': ['class', 'id'],
                'table': ['class', 'id'],
                'td': ['colspan', 'rowspan'],
                'th': ['colspan', 'rowspan']
            },
            
            // 净化HTML
            sanitize: function(html) {
                const temp = document.createElement('div');
                temp.innerHTML = html;
                
                // 递归净化节点
                this._sanitizeNode(temp);
                
                return temp.innerHTML;
            },
            
            // 净化节点
            _sanitizeNode: function(node) {
                const childNodes = Array.from(node.childNodes);
                
                for (const child of childNodes) {
                    if (child.nodeType === Node.ELEMENT_NODE) {
                        const tagName = child.tagName.toLowerCase();
                        
                        // 检查标签是否允许
                        if (!this.allowedTags.includes(tagName)) {
                            node.removeChild(child);
                            continue;
                        }
                        
                        // 检查属性是否允许
                        const allowedAttrs = this.allowedAttributes[tagName] || [];
                        const attributes = Array.from(child.attributes);
                        
                        for (const attr of attributes) {
                            if (!allowedAttrs.includes(attr.name)) {
                                child.removeAttribute(attr.name);
                            }
                            
                            // 特殊处理href属性
                            if (attr.name === 'href') {
                                const value = attr.value.trim().toLowerCase();
                                if (value.startsWith('javascript:') || value.startsWith('data:')) {
                                    child.removeAttribute(attr.name);
                                }
                            }
                        }
                        
                        // 递归处理子节点
                        this._sanitizeNode(child);
                    }
                }
            }
        };
        
        return sanitizer.sanitize(html);
    }
    
    /**
     * 生成随机令牌
     * @private
     * @returns {string} 随机令牌
     */
    _generateRandomToken() {
        const array = new Uint8Array(32);
        window.crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }
    
    /**
     * 验证CSRF令牌
     * @private
     * @param {string} token 令牌
     * @returns {boolean} 是否有效
     */
    _validateCSRFToken(token) {
        const tokenData = this.csrfTokens.get('default');
        if (!tokenData) return false;
        
        // 检查令牌是否过期
        if (Date.now() > tokenData.expires) {
            this.csrfTokens.delete('default');
            return false;
        }
        
        return tokenData.token === token;
    }
    
    /**
     * 获取客户端IP
     * @private
     * @returns {string} 客户端IP
     */
    _getClientIP() {
        // 在实际应用中，这应该从服务器端获取
        // 这里返回一个占位符
        return '127.0.0.1';
    }
    
    /**
     * 清理过期数据
     * @private
     */
    _cleanupExpiredData() {
        const now = Date.now();
        
        // 清理过期的CSRF令牌
        for (const [key, data] of this.csrfTokens.entries()) {
            if (now > data.expires) {
                this.csrfTokens.delete(key);
            }
        }
        
        // 清理过期的请求计数
        for (const [ip, data] of this.requestCounts.entries()) {
            if (now > data.expires) {
                this.requestCounts.delete(ip);
            }
        }
        
        // 清理过期的失败尝试
        for (const [ip, data] of this.failedAttempts.entries()) {
            if (now > data.expires) {
                this.failedAttempts.delete(ip);
            }
        }
        
        // 清理过期的IP封禁
        for (const [ip, data] of this.blockedIPs.entries()) {
            if (now > data.expires) {
                this.blockedIPs.delete(ip);
                this._emitEvent('ipUnblocked', { ip: ip });
            }
        }
    }
    
    /**
     * 处理请求
     * @param {string} ip 客户端IP
     * @param {string} action 操作类型
     * @param {Object} data 请求数据
     * @returns {boolean} 是否允许请求
     */
    handleRequest(ip, action, data = {}) {
        // 检查IP是否被封禁
        if (this.options.enableIPBlocking && this._isIPBlocked(ip)) {
            this._emitEvent('securityViolation', {
                type: 'BLOCKED_IP',
                ip: ip,
                action: action,
                data: data
            });
            return false;
        }
        
        // 检查请求速率
        if (this.options.enableRateLimiting && !this._checkRateLimit(ip)) {
            this._emitEvent('rateLimitExceeded', {
                ip: ip,
                action: action,
                data: data
            });
            return false;
        }
        
        // 记录敏感操作
        if (this.options.enableAuditLogging && this.options.sensitiveActions.includes(action)) {
            this._logAuditEvent(ip, action, data);
            this._emitEvent('sensitiveAction', {
                ip: ip,
                action: action,
                data: data
            });
        }
        
        return true;
    }
    
    /**
     * 检查IP是否被封禁
     * @private
     * @param {string} ip 客户端IP
     * @returns {boolean} 是否被封禁
     */
    _isIPBlocked(ip) {
        const blockData = this.blockedIPs.get(ip);
        if (!blockData) return false;
        
        // 检查封禁是否过期
        if (Date.now() > blockData.expires) {
            this.blockedIPs.delete(ip);
            return false;
        }
        
        return true;
    }
    
    /**
     * 检查请求速率
     * @private
     * @param {string} ip 客户端IP
     * @returns {boolean} 是否允许请求
     */
    _checkRateLimit(ip) {
        const now = Date.now();
        const requestData = this.requestCounts.get(ip);
        
        if (!requestData) {
            // 首次请求
            this.requestCounts.set(ip, {
                count: 1,
                firstRequest: now,
                expires: now + 60000 // 1分钟后过期
            });
            return true;
        }
        
        // 检查是否过期
        if (now > requestData.expires) {
            // 重置计数
            this.requestCounts.set(ip, {
                count: 1,
                firstRequest: now,
                expires: now + 60000
            });
            return true;
        }
        
        // 增加计数
        requestData.count += 1;
        
        // 检查是否超过限制
        if (requestData.count > this.options.maxRequestsPerMinute) {
            return false;
        }
        
        return true;
    }
    
    /**
     * 记录失败尝试
     * @param {string} ip 客户端IP
     * @param {string} action 操作类型
     * @param {Object} data 相关数据
     * @returns {boolean} 是否被封禁
     */
    recordFailedAttempt(ip, action, data = {}) {
        const now = Date.now();
        const attemptData = this.failedAttempts.get(ip);
        
        if (!attemptData) {
            // 首次失败
            this.failedAttempts.set(ip, {
                count: 1,
                firstAttempt: now,
                expires: now + 30 * 60000 // 30分钟后过期
            });
            return false;
        }
        
        // 检查是否过期
        if (now > attemptData.expires) {
            // 重置计数
            this.failedAttempts.set(ip, {
                count: 1,
                firstAttempt: now,
                expires: now + 30 * 60000
            });
            return false;
        }
        
        // 增加计数
        attemptData.count += 1;
        
        // 检查是否超过限制
        if (attemptData.count >= this.options.maxFailedAttempts) {
            // 封禁IP
            this._blockIP(ip, action, data);
            return true;
        }
        
        return false;
    }
    
    /**
     * 封禁IP
     * @private
     * @param {string} ip 客户端IP
     * @param {string} reason 封禁原因
     * @param {Object} data 相关数据
     */
    _blockIP(ip, reason, data = {}) {
        const now = Date.now();
        
        this.blockedIPs.set(ip, {
            reason: reason,
            blockedAt: now,
            expires: now + this.options.blockDuration,
            data: data
        });
        
        this._emitEvent('ipBlocked', {
            ip: ip,
            reason: reason,
            duration: this.options.blockDuration / 1000,
            data: data
        });
        
        // 记录审计日志
        this._logAuditEvent(ip, 'ip_blocked', {
            reason: reason,
            duration: this.options.blockDuration / 1000,
            ...data
        });
    }
    
    /**
     * 记录审计事件
     * @private
     * @param {string} ip 客户端IP
     * @param {string} action 操作类型
     * @param {Object} data 相关数据
     */
    _logAuditEvent(ip, action, data = {}) {
        const event = {
            timestamp: new Date().toISOString(),
            ip: ip,
            action: action,
            data: data
        };
        
        this.auditLogs.push(event);
        
        // 限制日志大小
        if (this.auditLogs.length > 1000) {
            this.auditLogs = this.auditLogs.slice(-1000);
        }
        
        // 在实际应用中，这里应该将日志发送到服务器
        console.log('审计日志:', event);
    }
    
    /**
     * 处理安全违规
     * @private
     * @param {string} type 违规类型
     * @param {Object} data 相关数据
     */
    _handleSecurityViolation(type, data = {}) {
        const ip = data.ip || this._getClientIP();
        
        // 记录审计日志
        this._logAuditEvent(ip, 'security_violation', {
            type: type,
            ...data
        });
        
        // 触发事件
        this._emitEvent('securityViolation', {
            type: type,
            ip: ip,
            ...data
        });
        
        // 记录失败尝试
        this.recordFailedAttempt(ip, 'security_violation', {
            type: type,
            ...data
        });
    }
    
    /**
     * 获取审计日志
     * @param {Object} filters 过滤条件
     * @returns {Array} 审计日志
     */
    getAuditLogs(filters = {}) {
        let filteredLogs = [...this.auditLogs];
        
        // 应用过滤器
        if (filters.action) {
            filteredLogs = filteredLogs.filter(log => log.action === filters.action);
        }
        
        if (filters.ip) {
            filteredLogs = filteredLogs.filter(log => log.ip === filters.ip);
        }
        
        if (filters.fromDate) {
            const fromDate = new Date(filters.fromDate);
            filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) >= fromDate);
        }
        
        if (filters.toDate) {
            const toDate = new Date(filters.toDate);
            filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) <= toDate);
        }
        
        // 排序（默认按时间降序）
        filteredLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        return filteredLogs;
    }
    
    /**
     * 获取被封禁的IP
     * @returns {Array} 被封禁的IP列表
     */
    getBlockedIPs() {
        const now = Date.now();
        const blockedList = [];
        
        for (const [ip, data] of this.blockedIPs.entries()) {
            if (now <= data.expires) {
                blockedList.push({
                    ip: ip,
                    reason: data.reason,
                    blockedAt: new Date(data.blockedAt).toISOString(),
                    expiresAt: new Date(data.expires).toISOString(),
                    remainingTime: Math.round((data.expires - now) / 1000)
                });
            }
        }
        
        return blockedList;
    }
    
    /**
     * 手动解除IP封禁
     * @param {string} ip 客户端IP
     * @returns {boolean} 是否成功解除
     */
    unblockIP(ip) {
        if (!this.blockedIPs.has(ip)) {
            return false;
        }
        
        this.blockedIPs.delete(ip);
        
        // 记录审计日志
        this._logAuditEvent('system', 'ip_unblocked', { ip: ip });
        
        // 触发事件
        this._emitEvent('ipUnblocked', { ip: ip });
        
        return true;
    }
    
    /**
     * 添加事件监听器
     * @param {string} event 事件名称 ('securityViolation', 'ipBlocked', 'rateLimitExceeded', 'sensitiveAction')
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
 * 数据加密工具
 * 用于加密敏感数据
 */
class EncryptionUtil {
    /**
     * 生成随机密钥
     * @returns {Promise<CryptoKey>} 生成的密钥
     */
    static async generateKey() {
        return window.crypto.subtle.generateKey(
            {
                name: 'AES-GCM',
                length: 256
            },
            true,
            ['encrypt', 'decrypt']
        );
    }
    
    /**
     * 导出密钥
     * @param {CryptoKey} key 密钥
     * @returns {Promise<string>} 导出的密钥（Base64编码）
     */
    static async exportKey(key) {
        const exported = await window.crypto.subtle.exportKey('raw', key);
        return this._arrayBufferToBase64(exported);
    }
    
    /**
     * 导入密钥
     * @param {string} keyData Base64编码的密钥
     * @returns {Promise<CryptoKey>} 导入的密钥
     */
    static async importKey(keyData) {
        const keyBuffer = this._base64ToArrayBuffer(keyData);
        
        return window.crypto.subtle.importKey(
            'raw',
            keyBuffer,
            {
                name: 'AES-GCM',
                length: 256
            },
            true,
            ['encrypt', 'decrypt']
        );
    }
    
    /**
     * 加密数据
     * @param {CryptoKey} key 密钥
     * @param {string} data 要加密的数据
     * @returns {Promise<Object>} 加密结果，包含iv和密文
     */
    static async encrypt(key, data) {
        // 生成初始化向量
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        
        // 转换数据为ArrayBuffer
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);
        
        // 加密
        const encryptedBuffer = await window.crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv: iv
            },
            key,
            dataBuffer
        );
        
        // 返回结果
        return {
            iv: this._arrayBufferToBase64(iv),
            ciphertext: this._arrayBufferToBase64(encryptedBuffer)
        };
    }
    
    /**
     * 解密数据
     * @param {CryptoKey} key 密钥
     * @param {string} iv Base64编码的初始化向量
     * @param {string} ciphertext Base64编码的密文
     * @returns {Promise<string>} 解密后的数据
     */
    static async decrypt(key, iv, ciphertext) {
        // 转换iv和密文为ArrayBuffer
        const ivBuffer = this._base64ToArrayBuffer(iv);
        const ciphertextBuffer = this._base64ToArrayBuffer(ciphertext);
        
        // 解密
        const decryptedBuffer = await window.crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv: ivBuffer
            },
            key,
            ciphertextBuffer
        );
        
        // 转换结果为字符串
        const decoder = new TextDecoder();
        return decoder.decode(decryptedBuffer);
    }
    
    /**
     * 哈希数据
     * @param {string} data 要哈希的数据
     * @returns {Promise<string>} 哈希结果（Base64编码）
     */
    static async hash(data) {
        // 转换数据为ArrayBuffer
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);
        
        // 计算哈希
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer);
        
        // 返回Base64编码的哈希
        return this._arrayBufferToBase64(hashBuffer);
    }
    
    /**
     * 将ArrayBuffer转换为Base64字符串
     * @private
     * @param {ArrayBuffer} buffer ArrayBuffer
     * @returns {string} Base64字符串
     */
    static _arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        
        return window.btoa(binary);
    }
    
    /**
     * 将Base64字符串转换为ArrayBuffer
     * @private
     * @param {string} base64 Base64字符串
     * @returns {ArrayBuffer} ArrayBuffer
     */
    static _base64ToArrayBuffer(base64) {
        const binaryString = window.atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        return bytes.buffer;
    }
}

/**
 * 安全存储工具
 * 用于安全地存储敏感数据
 */
class SecureStorage {
    constructor() {
        this.encryptionKey = null;
        this.initialized = false;
    }
    
    /**
     * 初始化安全存储
     * @returns {Promise<boolean>} 是否成功初始化
     */
    async initialize() {
        try {
            // 检查是否已初始化
            if (this.initialized) {
                return true;
            }
            
            // 检查是否有保存的密钥
            let keyData = localStorage.getItem('secure_storage_key');
            
            if (!keyData) {
                // 生成新密钥
                const key = await EncryptionUtil.generateKey();
                keyData = await EncryptionUtil.exportKey(key);
                
                // 保存密钥
                localStorage.setItem('secure_storage_key', keyData);
            }
            
            // 导入密钥
            this.encryptionKey = await EncryptionUtil.importKey(keyData);
            this.initialized = true;
            
            return true;
        } catch (error) {
            console.error('初始化安全存储失败:', error);
            return false;
        }
    }
    
    /**
     * 安全地存储数据
     * @param {string} key 键
     * @param {any} value 值
     * @returns {Promise<boolean>} 是否成功存储
     */
    async setItem(key, value) {
        try {
            // 确保已初始化
            if (!this.initialized) {
                await this.initialize();
            }
            
            // 转换值为字符串
            const valueStr = JSON.stringify(value);
            
            // 加密数据
            const encrypted = await EncryptionUtil.encrypt(this.encryptionKey, valueStr);
            
            // 存储加密数据
            localStorage.setItem(`secure_${key}`, JSON.stringify(encrypted));
            
            return true;
        } catch (error) {
            console.error('安全存储数据失败:', error);
            return false;
        }
    }
    
    /**
     * 安全地获取数据
     * @param {string} key 键
     * @returns {Promise<any>} 获取的值
     */
    async getItem(key) {
        try {
            // 确保已初始化
            if (!this.initialized) {
                await this.initialize();
            }
            
            // 获取加密数据
            const encryptedData = localStorage.getItem(`secure_${key}`);
            if (!encryptedData) {
                return null;
            }
            
            // 解析加密数据
            const { iv, ciphertext } = JSON.parse(encryptedData);
            
            // 解密数据
            const decrypted = await EncryptionUtil.decrypt(this.encryptionKey, iv, ciphertext);
            
            // 解析值
            return JSON.parse(decrypted);
        } catch (error) {
            console.error('安全获取数据失败:', error);
            return null;
        }
    }
    
    /**
     * 安全地删除数据
     * @param {string} key 键
     * @returns {boolean} 是否成功删除
     */
    removeItem(key) {
        try {
            localStorage.removeItem(`secure_${key}`);
            return true;
        } catch (error) {
            console.error('安全删除数据失败:', error);
            return false;
        }
    }
    
    /**
     * 清除所有安全存储的数据
     * @returns {boolean} 是否成功清除
     */
    clear() {
        try {
            // 获取所有键
            const keys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('secure_')) {
                    keys.push(key);
                }
            }
            
            // 删除所有键
            for (const key of keys) {
                localStorage.removeItem(key);
            }
            
            return true;
        } catch (error) {
            console.error('清除安全存储失败:', error);
            return false;
        }
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SecurityModule, EncryptionUtil, SecureStorage };
}
