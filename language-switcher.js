/**
 * 语言切换模块
 * Language Switching Module
 */

class LanguageSwitcher {
    constructor() {
        this.currentLanguage = 'zh'; // 默认语言为中文 (Default language is Chinese)
        this.translations = {
            zh: {}, // 中文翻译 (Chinese translations)
            en: {}  // 英文翻译 (English translations)
        };
        
        // 初始化翻译数据 (Initialize translation data)
        this._initTranslations();
        
        // 添加语言切换按钮 (Add language switch button)
        this._addLanguageSwitchButton();
        
        // 应用当前语言 (Apply current language)
        this.applyLanguage(this.currentLanguage);
        
        console.log("Language Switcher initialized");
    }
    
    /**
     * 初始化翻译数据
     * Initialize translation data
     * @private
     */
    _initTranslations() {
        // 中文翻译 (Chinese translations)
        this.translations.zh = {
            // 导航 (Navigation)
            'nav_dashboard': '仪表盘',
            'nav_alerts': '警报',
            'nav_transactions': '交易',
            'nav_wallets': '钱包',
            'nav_settings': '设置',
            
            // 仪表盘 (Dashboard)
            'dashboard_title': '仪表盘',
            'active_alerts': '活跃警报',
            'monitored_wallets': '监控钱包',
            'todays_transactions': '今日交易',
            'system_status': '系统状态',
            'transaction_distribution': '交易金额分布',
            'recent_alerts': '最近警报',
            'view_details': '查看详情',
            'manage_wallets': '管理钱包',
            'online': '在线',
            
            // 表格标题 (Table headers)
            'time': '时间',
            'type': '类型',
            'amount': '金额',
            'source': '来源',
            'destination': '目标',
            'status': '状态',
            
            // 警报类型 (Alert types)
            'large_transaction': '大额转账',
            'split_transaction': '分散转出',
            
            // 状态 (Status)
            'tracking': '追踪中',
            'locked': '已锁定',
            'resolved': '已解决',
            
            // 页面标题 (Page title)
            'page_title': '加密货币交易监控系统',
            
            // 语言切换 (Language switching)
            'switch_to_english': 'Switch to English',
            'switch_to_chinese': '切换到中文'
        };
        
        // 英文翻译 (English translations)
        this.translations.en = {
            // Navigation
            'nav_dashboard': 'Dashboard',
            'nav_alerts': 'Alerts',
            'nav_transactions': 'Transactions',
            'nav_wallets': 'Wallets',
            'nav_settings': 'Settings',
            
            // Dashboard
            'dashboard_title': 'Dashboard',
            'active_alerts': 'Active Alerts',
            'monitored_wallets': 'Monitored Wallets',
            'todays_transactions': 'Today\'s Transactions',
            'system_status': 'System Status',
            'transaction_distribution': 'Transaction Amount Distribution',
            'recent_alerts': 'Recent Alerts',
            'view_details': 'View Details',
            'manage_wallets': 'Manage Wallets',
            'online': 'Online',
            
            // Table headers
            'time': 'Time',
            'type': 'Type',
            'amount': 'Amount',
            'source': 'Source',
            'destination': 'Destination',
            'status': 'Status',
            
            // Alert types
            'large_transaction': 'Large Transaction',
            'split_transaction': 'Split Transaction',
            
            // Status
            'tracking': 'Tracking',
            'locked': 'Locked',
            'resolved': 'Resolved',
            
            // Page title
            'page_title': 'Cryptocurrency Transaction Monitoring System',
            
            // Language switching
            'switch_to_english': 'Switch to English',
            'switch_to_chinese': '切换到中文'
        };
    }
    
    /**
     * 添加语言切换按钮
     * Add language switch button
     * @private
     */
    _addLanguageSwitchButton() {
        // 创建语言切换按钮容器 (Create language switch button container)
        const languageSwitchContainer = document.createElement('div');
        languageSwitchContainer.className = 'language-switch';
        languageSwitchContainer.style.position = 'absolute';
        languageSwitchContainer.style.top = '10px';
        languageSwitchContainer.style.right = '20px';
        languageSwitchContainer.style.zIndex = '1000';
        
        // 创建语言切换按钮 (Create language switch button)
        const languageSwitchButton = document.createElement('button');
        languageSwitchButton.id = 'language-switch-button';
        languageSwitchButton.className = 'btn btn-sm btn-outline-light';
        languageSwitchButton.style.padding = '5px 10px';
        languageSwitchButton.style.backgroundColor = '#3498db';
        languageSwitchButton.style.color = 'white';
        languageSwitchButton.style.border = 'none';
        languageSwitchButton.style.borderRadius = '4px';
        languageSwitchButton.style.cursor = 'pointer';
        languageSwitchButton.textContent = this.translations[this.currentLanguage]['switch_to_english'];
        
        // 添加点击事件 (Add click event)
        languageSwitchButton.addEventListener('click', () => {
            console.log("Language switch button clicked");
            this.toggleLanguage();
        });
        
        // 将按钮添加到容器 (Add button to container)
        languageSwitchContainer.appendChild(languageSwitchButton);
        
        // 将容器添加到页面 (Add container to page)
        document.body.appendChild(languageSwitchContainer);
    }
    
    /**
     * 切换语言
     * Toggle language
     */
    toggleLanguage() {
        // 切换语言 (Toggle language)
        this.currentLanguage = this.currentLanguage === 'zh' ? 'en' : 'zh';
        console.log("Language toggled to: " + this.currentLanguage);
        
        // 应用新语言 (Apply new language)
        this.applyLanguage(this.currentLanguage);
        
        // 保存语言偏好到本地存储 (Save language preference to local storage)
        localStorage.setItem('preferred_language', this.currentLanguage);
    }
    
    /**
     * 应用语言
     * Apply language
     * @param {string} language 语言代码 (Language code)
     */
    applyLanguage(language) {
        console.log("Applying language: " + language);
        
        // 更新页面标题 (Update page title)
        document.title = this.translations[language]['page_title'];
        
        // 更新主标题 (Update main heading)
        const mainHeading = document.querySelector('h1');
        if (mainHeading) {
            mainHeading.textContent = this.translations[language]['page_title'];
        }
        
        // 更新所有带有data-i18n属性的元素 (Update all elements with data-i18n attribute)
        const i18nElements = document.querySelectorAll('[data-i18n]');
        i18nElements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (key && this.translations[language][key]) {
                element.textContent = this.translations[language][key];
            }
        });
        
        // 更新语言切换按钮文本 (Update language switch button text)
        const languageSwitchButton = document.getElementById('language-switch-button');
        if (languageSwitchButton) {
            languageSwitchButton.textContent = language === 'zh' ? 
                this.translations[language]['switch_to_english'] : 
                this.translations[language]['switch_to_chinese'];
        }
    }
}

// 当DOM加载完成时初始化语言切换器 (Initialize language switcher when DOM is loaded)
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM loaded, initializing language switcher");
    // 检查是否已经存在语言切换器实例 (Check if language switcher instance already exists)
    if (!window.languageSwitcher) {
        window.languageSwitcher = new LanguageSwitcher();
        
        // 检查本地存储中的语言偏好 (Check language preference in local storage)
        const preferredLanguage = localStorage.getItem('preferred_language');
        if (preferredLanguage && preferredLanguage !== window.languageSwitcher.currentLanguage) {
            window.languageSwitcher.currentLanguage = preferredLanguage;
            window.languageSwitcher.applyLanguage(preferredLanguage);
        }
    }
});

// 立即执行初始化 (Immediate initialization)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log("DOM loaded (immediate check), initializing language switcher");
        if (!window.languageSwitcher) {
            window.languageSwitcher = new LanguageSwitcher();
        }
    });
} else {
    console.log("DOM already loaded, initializing language switcher immediately");
    if (!window.languageSwitcher) {
        window.languageSwitcher = new LanguageSwitcher();
    }
}
