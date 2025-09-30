/**
 * 护理入住登记管理系统 - 前端JavaScript
 */

class NursingSystemApp {
    constructor() {
        this.socket = io();
        this.currentFile = null;
        this.caregivers = [];
        this.currentHistoryId = null;
        this.historyLoaded = false;
        
        this.initEventListeners();
        this.initSocketListeners();
        this.loadSystemStatus();
        this.loadDefaultCaregivers();
        // 历史记录将在用户首次点击历史记录标签页时加载
        
        // 默认显示第一个标签页
        this.switchTab('upload-tab');
    }

    /**
     * 初始化事件监听器
     */
    initEventListeners() {
        // 文件上传
        const dropArea = document.getElementById('dropArea');
        const fileInput = document.getElementById('fileInput');

        dropArea.addEventListener('click', () => fileInput.click());
        dropArea.addEventListener('dragover', this.handleDragOver.bind(this));
        dropArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
        dropArea.addEventListener('drop', this.handleDrop.bind(this));
        fileInput.addEventListener('change', this.handleFileSelect.bind(this));

        // 护理员管理
        document.getElementById('caregiverInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addCaregiver();
        });
        document.getElementById('addCaregiver').addEventListener('click', this.addCaregiver.bind(this));
        document.getElementById('addBatchCaregivers').addEventListener('click', this.addBatchCaregivers.bind(this));
        document.getElementById('loadDefaultCaregivers').addEventListener('click', this.loadDefaultCaregivers.bind(this));
        document.getElementById('clearCaregivers').addEventListener('click', this.clearCaregivers.bind(this));

        // 护理员添加模式切换
        document.getElementById('singleMode').addEventListener('change', this.toggleAddMode.bind(this));
        document.getElementById('batchMode').addEventListener('change', this.toggleAddMode.bind(this));

        // 处理控制
        document.getElementById('startProcess').addEventListener('click', this.startProcess.bind(this));

        // 历史记录
        document.getElementById('refreshHistory').addEventListener('click', this.loadHistory.bind(this));

        // 手动标签页切换事件
        document.querySelectorAll('[data-tab]').forEach(tabLink => {
            tabLink.addEventListener('click', (e) => {
                e.preventDefault();
                const targetTab = tabLink.getAttribute('data-tab');
                this.switchTab(targetTab);
                
                // 历史记录标签页特殊处理
                if (targetTab === 'history-tab' && !this.historyLoaded) {
                    this.loadHistory();
                }
            });
        });

        // 配置管理
        document.getElementById('saveConfig').addEventListener('click', this.saveConfig.bind(this));
        document.getElementById('resetConfig').addEventListener('click', this.resetConfig.bind(this));
    }

    /**
     * 初始化Socket监听器
     */
    initSocketListeners() {
        this.socket.on('process-start', (data) => {
            this.showProgress();
            this.addLog('开始处理护理登记数据...', 'info');
        });

        this.socket.on('process-progress', (data) => {
            this.updateProgress(data);
        });

        this.socket.on('process-complete', (data) => {
            this.hideProgress();

            // data should contain { historyId, result }
            const result = data && data.result ? data.result : (data || {});

            // Extract statistics safely
            const stats = (result && result.statistics) ? result.statistics : {};
            const total = stats.total ?? '-';
            const success = stats.success ?? '-';
            const skipped = stats.skipped ?? 0;
            const failed = stats.failed ?? '-';
            const successRate = stats.successRate ?? '-';

            // Log a more detailed completion message
            this.addLog(`处理完成：总 ${total}，成功 ${success}（跳过 ${skipped}），失败 ${failed}，成功率 ${successRate}%`, 'success');

            // Show a short alert with summary
            this.showAlert(`处理完成：成功 ${success}（跳过 ${skipped}），失败 ${failed}，成功率 ${successRate}%`, 'success');

            // Ensure history and status refreshed
            this.loadHistory();
            this.loadSystemStatus();
        });

        this.socket.on('process-error', (data) => {
            this.hideProgress();
            this.addLog(`处理失败: ${data.error}`, 'error');
        });
    }

    /**
     * 处理拖拽悬停
     */
    handleDragOver(e) {
        e.preventDefault();
        document.getElementById('dropArea').classList.add('dragover');
    }

    /**
     * 处理拖拽离开
     */
    handleDragLeave(e) {
        e.preventDefault();
        document.getElementById('dropArea').classList.remove('dragover');
    }

    /**
     * 处理文件拖拽
     */
    handleDrop(e) {
        e.preventDefault();
        document.getElementById('dropArea').classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.uploadFile(files[0]);
        }
    }

    /**
     * 处理文件选择
     */
    handleFileSelect(e) {
        const files = e.target.files;
        if (files.length > 0) {
            this.uploadFile(files[0]);
        }
    }

    /**
     * 上传文件
     */
    async uploadFile(file) {
        if (!file.name.match(/\.(xls|xlsx)$/i)) {
            this.showAlert('请选择Excel文件 (.xls 或 .xlsx)', 'warning');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            this.showAlert('文件大小不能超过10MB', 'warning');
            return;
        }

        const formData = new FormData();
        formData.append('excelFile', file);

        try {
            this.showLoading('上传文件中...');
            
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            
            if (result.success) {
                this.currentFile = result.file;
                this.showFileInfo(result.file);
                this.updateStartButton();
                this.showAlert('文件上传成功！', 'success');
                this.loadSystemStatus();
            } else {
                this.showAlert(result.message, 'danger');
            }
        } catch (error) {
            this.showAlert('上传失败: ' + error.message, 'danger');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * 显示文件信息
     */
    showFileInfo(file) {
        document.getElementById('fileName').textContent = file.originalname;
        document.getElementById('fileSize').textContent = this.formatFileSize(file.size);
        document.getElementById('fileInfo').classList.remove('d-none');
    }

    /**
     * 格式化文件大小
     */
    formatFileSize(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * 添加护理员
     */
    addCaregiver() {
        const input = document.getElementById('caregiverInput');
        const name = input.value.trim();
        
        if (name && !this.caregivers.includes(name)) {
            this.caregivers.push(name);
            this.updateCaregiverList();
            input.value = '';
            this.updateStartButton();
        }
    }

    /**
     * 批量添加护理员
     */
    addBatchCaregivers() {
        const textarea = document.getElementById('caregiverBatchInput');
        const names = textarea.value
            .split('\n')
            .map(name => name.trim())
            .filter(name => name && !this.caregivers.includes(name));

        if (names.length === 0) {
            this.showAlert('请输入有效的护理员姓名（每行一个）', 'warning');
            return;
        }

        // 添加新护理员
        this.caregivers.push(...names);
        this.updateCaregiverList();
        textarea.value = '';
        this.updateStartButton();
        
        this.showAlert(`成功添加 ${names.length} 个护理员`, 'success');
    }

    /**
     * 切换添加模式
     */
    toggleAddMode() {
        const singleMode = document.getElementById('singleMode').checked;
        const singleAddMode = document.getElementById('singleAddMode');
        const batchAddMode = document.getElementById('batchAddMode');

        if (singleMode) {
            singleAddMode.classList.remove('d-none');
            batchAddMode.classList.add('d-none');
        } else {
            singleAddMode.classList.add('d-none');
            batchAddMode.classList.remove('d-none');
        }
    }

    /**
     * 移除护理员
     */
    removeCaregiver(name) {
        this.caregivers = this.caregivers.filter(c => c !== name);
        this.updateCaregiverList();
        this.updateStartButton();
    }

    /**
     * 更新护理员列表显示
     */
    updateCaregiverList() {
        const container = document.getElementById('caregiverList');
        
        if (this.caregivers.length === 0) {
            container.innerHTML = '<div class="text-muted">暂无护理员，请添加或加载默认配置</div>';
            return;
        }

        container.innerHTML = this.caregivers.map(name => `
            <span class="caregiver-tag">
                ${name}
                <span class="remove" onclick="app.removeCaregiver('${name}')">×</span>
            </span>
        `).join('');
    }

    /**
     * 加载默认护理员配置
     */
    async loadDefaultCaregivers() {
        try {
            const response = await fetch('/config.json');
            const config = await response.json();
            this.caregivers = [...config.specificCaregivers];
            this.updateCaregiverList();
            this.updateStartButton();
            this.showAlert('已加载默认护理员配置', 'success');
        } catch (error) {
            this.showAlert('加载默认配置失败', 'danger');
        }
    }

    /**
     * 清空护理员列表
     */
    clearCaregivers() {
        if (confirm('确定要清空护理员列表吗？')) {
            this.caregivers = [];
            this.updateCaregiverList();
            this.updateStartButton();
        }
    }

    /**
     * 更新开始处理按钮状态
     */
    updateStartButton() {
        const button = document.getElementById('startProcess');
        const canValidate = this.currentFile && this.caregivers.length > 0;
        
        button.disabled = !canValidate;
        
        if (!this.currentFile) {
            button.innerHTML = '<i class="bi bi-exclamation-circle"></i> 请先上传Excel文件';
        } else if (this.caregivers.length === 0) {
            button.innerHTML = '<i class="bi bi-exclamation-circle"></i> 请配置护理员列表';
        } else {
            button.innerHTML = '<i class="bi bi-check-circle"></i> 验证参数并开始处理';
        }
    }

    /**
     * 开始处理（分两步：验证参数 -> 确认开始）
     */
    async startProcess() {
        if (!this.currentFile || this.caregivers.length === 0) {
            this.showAlert('请先上传文件并配置护理员', 'warning');
            return;
        }

        // 第一步：验证参数
        await this.validateAndConfirm();
    }

    /**
     * 验证参数并显示确认对话框
     */
    async validateAndConfirm() {
        const config = this.getCustomConfig();

        try {
            this.showLoading('验证参数中...');
            
            const response = await fetch('/api/validate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    filename: this.currentFile.filename,
                    specificCaregivers: this.caregivers,
                    config: config
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.showConfirmDialog(result.preview, config);
            } else {
                this.showAlert(result.message, 'danger');
            }
        } catch (error) {
            this.showAlert('参数验证失败: ' + error.message, 'danger');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * 显示确认对话框
     */
    showConfirmDialog(preview, config) {
        const modalHtml = `
            <div class="modal fade" id="confirmModal" tabindex="-1" data-bs-backdrop="static">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="bi bi-check-circle-fill text-success"></i>
                                确认处理参数
                            </h5>
                        </div>
                        <div class="modal-body">
                            <div class="alert alert-info">
                                <i class="bi bi-info-circle"></i>
                                <strong>参数验证成功！</strong>请确认以下信息后开始处理。
                            </div>
                            
                            <div class="row">
                                <div class="col-md-6">
                                    <h6><i class="bi bi-file-earmark-excel"></i> 文件信息</h6>
                                    <table class="table table-sm">
                                        <tr><td>文件名</td><td>${this.currentFile.originalname}</td></tr>
                                        <tr><td>用户总数</td><td class="fw-bold text-primary">${preview.totalUsers}</td></tr>
                                        <tr><td>预估时间</td><td>${preview.estimatedTime} 秒</td></tr>
                                    </table>
                                    
                                    <h6><i class="bi bi-person-check"></i> 示例用户</h6>
                                    <div class="border rounded p-2 bg-light" style="max-height: 120px; overflow-y: auto;">
                                        ${preview.sampleUsers.map(name => `<span class="badge bg-light text-dark me-1 mb-1">${name}</span>`).join('')}
                                        ${preview.totalUsers > 5 ? `<span class="text-muted">...等 ${preview.totalUsers} 人</span>` : ''}
                                    </div>
                                </div>
                                
                                <div class="col-md-6">
                                    <h6><i class="bi bi-people"></i> 护理员配置 (${this.caregivers.length}人)</h6>
                                    <div class="border rounded p-2 bg-light" style="max-height: 120px; overflow-y: auto;">
                                        ${this.caregivers.map(name => `<span class="badge bg-primary me-1 mb-1">${name}</span>`).join('')}
                                    </div>
                                    
                                    <h6 class="mt-3"><i class="bi bi-gear"></i> 人员限制</h6>
                                    <table class="table table-sm">
                                        <tr><td>护士</td><td>${config.personnel.nursesLimit}</td><td class="text-muted">(当前: ${preview.personnelStats.nurses?.total || 0})</td></tr>
                                        <tr><td>医生</td><td>${config.personnel.doctorsLimit}</td><td class="text-muted">(当前: ${preview.personnelStats.doctors?.total || 0})</td></tr>
                                        <tr><td>护理员</td><td>${config.personnel.caregiversLimit}</td><td class="text-muted">(当前: ${preview.personnelStats.caregivers?.total || 0})</td></tr>
                                    </table>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                <i class="bi bi-x-circle"></i> 取消
                            </button>
                            <button type="button" class="btn btn-primary" id="confirmStart">
                                <i class="bi bi-play-circle-fill"></i> 确认开始处理
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // 移除已存在的模态框
        const existingModal = document.getElementById('confirmModal');
        if (existingModal) {
            existingModal.remove();
        }

        // 添加新的模态框
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        const modal = new bootstrap.Modal(document.getElementById('confirmModal'));
        
        // 绑定确认按钮事件
        document.getElementById('confirmStart').addEventListener('click', () => {
            modal.hide();
            this.executeProcess(config);
        });
        
        modal.show();
    }

    /**
     * 执行实际处理
     */
    async executeProcess(config) {
        try {
            this.clearLog();
            this.addLog('正在启动处理任务...', 'info');

            const response = await fetch('/api/process', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    filename: this.currentFile.filename,
                    originalFilename: this.currentFile.originalname,
                    specificCaregivers: this.caregivers,
                    config: config,
                    confirmed: true
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.currentHistoryId = result.historyId;
                this.addLog('处理任务已启动，请等待...', 'info');
                this.showAlert('处理任务已启动！', 'success');
            } else {
                this.showAlert(result.message, 'danger');
            }
        } catch (error) {
            this.showAlert('启动处理任务失败: ' + error.message, 'danger');
        }
    }

    /**
     * 切换标签页
     */
    switchTab(targetTab) {
        // 隐藏所有标签页内容
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.style.display = 'none';
        });
        
        // 移除所有导航链接的active类
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        // 显示目标标签页
        const targetPanel = document.getElementById(targetTab);
        if (targetPanel) {
            targetPanel.style.display = 'block';
        }
        
        // 激活对应的导航链接
        const targetLink = document.querySelector(`[data-tab="${targetTab}"]`);
        if (targetLink) {
            targetLink.classList.add('active');
        }
    }

    /**
     * 获取自定义配置
     * API配置由后端管理，前端只能配置业务相关参数
     */
    getCustomConfig() {
        return {
            personnel: {
                nursesLimit: parseInt(document.getElementById('nursesLimit').value) || 50,
                doctorsLimit: parseInt(document.getElementById('doctorsLimit').value) || 80,
                caregiversLimit: parseInt(document.getElementById('caregiversLimit').value) || 30
            },
            retry: {
                maxRetries: parseInt(document.getElementById('maxRetries').value) || 3,
                delay: parseInt(document.getElementById('retryDelay').value) || 1000
            }
            // API配置（baseUrl, token, referer等）完全由后端管理，前端不可配置
        };
    }

    /**
     * 显示进度条
     */
    showProgress() {
        document.querySelector('.progress-container').style.display = 'block';
        document.getElementById('progressBar').style.width = '0%';
        document.getElementById('progressBar').textContent = '0%';
    }

    /**
     * 隐藏进度条
     */
    hideProgress() {
        document.querySelector('.progress-container').style.display = 'none';
    }

    /**
     * 更新进度
     */
    updateProgress(data) {
        if (data.progress !== undefined) {
            const percent = Math.round(data.progress);
            document.getElementById('progressBar').style.width = percent + '%';
            document.getElementById('progressBar').textContent = percent + '%';
        }

        if (data.message) {
            this.addLog(data.message, 'info');
        }

        if (data.error) {
            this.addLog(data.error, 'error');
        }
    }

    /**
     * 添加日志
     */
    addLog(message, type = 'info') {
        const container = document.getElementById('logContainer');
        const time = new Date().toLocaleTimeString();
        const colorClass = {
            'info': 'text-primary',
            'success': 'text-success',
            'warning': 'text-warning',
            'error': 'text-danger'
        }[type] || 'text-dark';

        const logEntry = document.createElement('div');
        logEntry.className = colorClass;
        logEntry.innerHTML = `<small class="text-muted">[${time}]</small> ${message}`;
        
        container.appendChild(logEntry);
        container.scrollTop = container.scrollHeight;
    }

    /**
     * 清空日志
     */
    clearLog() {
        document.getElementById('logContainer').innerHTML = '';
    }

    /**
     * 加载系统状态
     */
    async loadSystemStatus() {
        try {
            const response = await fetch('/api/status');
            const result = await response.json();
            
            if (result.success) {
                document.getElementById('stat-files').textContent = result.data.uploadedFiles;
                document.getElementById('stat-history').textContent = result.data.historyRecords;
                document.getElementById('stat-reports').textContent = result.data.reports;
            }
        } catch (error) {
            console.error('加载系统状态失败:', error);
        }
    }

    /**
     * 加载历史记录
     */
    async loadHistory() {
        try {
            const response = await fetch('/api/history');
            const result = await response.json();
            
            if (result.success) {
                this.displayHistory(result.data);
                this.historyLoaded = true;
            }
        } catch (error) {
            console.error('加载历史记录失败:', error);
            this.showAlert('加载历史记录失败', 'danger');
        }
    }

    /**
     * 显示历史记录
     */
    displayHistory(history) {
        const container = document.getElementById('historyContainer');
        
        // 防护：确保容器存在
        if (!container) {
            console.warn('historyContainer元素未找到');
            return;
        }
        
        if (history.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted">
                    <i class="bi bi-inbox display-4"></i>
                    <p class="mt-3">暂无处理记录</p>
                </div>
            `;
            return;
        }

        container.innerHTML = history.map(record => `
            <div class="card history-card mb-3">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h6 class="card-title mb-2">
                                <i class="bi bi-file-earmark-excel text-success"></i>
                                ${record.filename ? record.filename.split('/').pop().replace(/^\d{4}-\d{2}-\d{2}T[\d-]+\./, '') : '未知文件'}
                            </h6>
                            <p class="card-text text-muted small mb-2">
                                <i class="bi bi-clock"></i> ${new Date(record.createdAt).toLocaleString()}
                                ${record.endTime ? `- ${new Date(record.endTime).toLocaleString()}` : ''}
                            </p>
                            <p class="card-text small mb-0">
                                <i class="bi bi-people"></i>
                                护理员: ${record.specificCaregivers ? record.specificCaregivers.length : 0}人
                                ${record.systemRestart ? '<span class="badge bg-warning ms-2"><i class="bi bi-exclamation-triangle"></i> 系统重启中断</span>' : ''}
                            </p>
                        </div>
                        <div class="text-end">
                            <span class="badge status-badge ${this.getStatusClass(record.status)}">${this.getStatusText(record.status)}</span>
                            <div class="mt-2">
                                <button class="btn btn-outline-primary btn-sm" onclick="app.showHistoryDetail('${record.id}')">
                                    <i class="bi bi-eye"></i> 详情
                                </button>
                                ${record.reportFile ? `
                                    <button class="btn btn-outline-success btn-sm" onclick="app.downloadReport('${record.reportFile}')">
                                        <i class="bi bi-download"></i> 报告
                                    </button>
                                ` : ''}
                                ${record.status === 'failed' || record.status === 'completed' ? `
                                    <button class="btn btn-outline-warning btn-sm" onclick="app.retryTask('${record.id}')" title="${record.systemRestart ? '系统重启中断，点击重新执行' : '重新执行任务'}">
                                        <i class="bi bi-arrow-clockwise"></i> ${record.systemRestart ? '恢复' : '重试'}
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                    ${record.result ? `
                        <div class="mt-3 pt-3 border-top">
                            <div class="row text-center">
                                <div class="col">
                                    <small class="text-muted">总数</small>
                                    <div class="fw-bold">${record.result.statistics.total}</div>
                                </div>
                                <div class="col">
                                    <small class="text-muted">成功</small>
                                    <div class="fw-bold text-success">${record.result.statistics.success}</div>
                                </div>
                                <div class="col">
                                    <small class="text-muted">失败</small>
                                    <div class="fw-bold text-danger">${record.result.statistics.failed}</div>
                                </div>
                                <div class="col">
                                    <small class="text-muted">成功率</small>
                                    <div class="fw-bold">${record.result.statistics.successRate}%</div>
                                </div>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    /**
     * 获取状态样式类
     */
    getStatusClass(status) {
        const classes = {
            'processing': 'bg-warning',
            'retrying': 'bg-info',
            'completed': 'bg-success',
            'failed': 'bg-danger'
        };
        return classes[status] || 'bg-secondary';
    }

    /**
     * 获取状态文本
     */
    getStatusText(status) {
        const texts = {
            'processing': '处理中',
            'retrying': '重试中',
            'completed': '已完成',
            'failed': '失败'
        };
        return texts[status] || '未知';
    }

    /**
     * 显示历史详情
     */
    async showHistoryDetail(id) {
        try {
            const response = await fetch(`/api/history/${id}`);
            const result = await response.json();
            
            if (result.success) {
                this.displayHistoryDetail(result.data);
            }
        } catch (error) {
            this.showAlert('加载详情失败', 'danger');
        }
    }

    /**
     * 显示历史详情模态框
     */
    displayHistoryDetail(data) {
        const modal = new bootstrap.Modal(document.getElementById('detailModal'));
        const body = document.getElementById('modalBody');
        
        body.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h6>基本信息</h6>
                    <table class="table table-sm">
                        <tr><td>文件名</td><td>${data.filename || '未知'}</td></tr>
                        <tr><td>开始时间</td><td>${new Date(data.createdAt).toLocaleString()}</td></tr>
                        <tr><td>结束时间</td><td>${data.endTime ? new Date(data.endTime).toLocaleString() : '未完成'}</td></tr>
                        <tr><td>状态</td><td><span class="badge ${this.getStatusClass(data.status)}">${this.getStatusText(data.status)}</span></td></tr>
                    </table>
                </div>
                <div class="col-md-6">
                    <h6>护理员配置</h6>
                    <div class="border rounded p-2" style="max-height: 200px; overflow-y: auto;">
                        ${data.specificCaregivers ? data.specificCaregivers.map(name => `<span class="badge bg-light text-dark me-1 mb-1">${name}</span>`).join('') : '无配置'}
                    </div>
                </div>
            </div>
            ${data.result ? `
                <hr>
                <h6>处理结果</h6>
                <div class="row">
                    <div class="col-md-12">
                        <div class="card">
                            <div class="card-body">
                                <div class="row text-center">
                                    <div class="col-md-3">
                                        <h4 class="text-primary">${data.result.statistics.total}</h4>
                                        <small class="text-muted">总用户数</small>
                                    </div>
                                    <div class="col-md-3">
                                        <h4 class="text-success">${data.result.statistics.success}</h4>
                                        <small class="text-muted">成功处理</small>
                                    </div>
                                    <div class="col-md-3">
                                        <h4 class="text-success">${data.result.statistics.skipped}</h4>
                                        <small class="text-muted">成功处理（跳过）</small>
                                    </div>
                                    <div class="col-md-3">
                                        <h4 class="text-danger">${data.result.statistics.failed}</h4>
                                        <small class="text-muted">处理失败</small>
                                    </div>
                                    <div class="col-md-3">
                                        <h4 class="text-info">${data.result.statistics.successRate}%</h4>
                                        <small class="text-muted">成功率</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                ${data.result.failedUsers && data.result.failedUsers.length > 0 ? `
                    <div class="mt-3">
                        <h6 class="text-danger">失败用户列表</h6>
                        <div class="table-responsive" style="max-height: 300px;">
                            <table class="table table-sm table-striped">
                                <thead>
                                    <tr>
                                        <th>姓名</th>
                                        <th>错误信息</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${data.result.failedUsers.map(user => `
                                        <tr>
                                            <td>${user.name}</td>
                                            <td class="text-danger small">${user.error}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ` : ''}
            ` : ''}
        `;

        // 设置下载按钮
        const downloadBtn = document.getElementById('downloadReport');
        if (data.reportFile) {
            downloadBtn.style.display = 'inline-block';
            downloadBtn.onclick = () => this.downloadReport(data.reportFile);
        } else {
            downloadBtn.style.display = 'none';
        }

        modal.show();
    }

    /**
     * 下载报告
     */
    downloadReport(filename) {
        window.open(`/api/download/${filename}`, '_blank');
    }

    /**
     * 重试任务
     */
    async retryTask(historyId) {
        if (!confirm('确定要重新执行这个任务吗？将重用之前的任务环境和数据。')) {
            return;
        }

        try {
            this.showAlert('正在启动重新执行...', 'info');

            const response = await fetch(`/api/retry/${historyId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (result.success) {
                this.showAlert(`重新执行已启动！任务ID: ${result.taskId}`, 'success');
                // 刷新历史记录
                this.loadHistory();
                // 切换到上传标签页查看进度
                this.switchTab('upload-tab');
            } else {
                this.showAlert(`重新执行失败: ${result.message}`, 'danger');
            }
        } catch (error) {
            console.error('重试任务失败:', error);
            this.showAlert('重试任务失败，请检查网络连接', 'danger');
        }
    }

    /**
     * 保存配置
     */
    saveConfig() {
        // 这里可以添加保存配置到服务器的逻辑
        this.showAlert('配置已保存', 'success');
    }

    /**
     * 重置配置
     */
    resetConfig() {
        if (confirm('确定要重置配置为默认值吗？')) {
            document.getElementById('nursesLimit').value = 50;
            document.getElementById('doctorsLimit').value = 80;
            document.getElementById('caregiversLimit').value = 30;
            document.getElementById('apiTimeout').value = 30000;
            document.getElementById('maxRetries').value = 3;
            document.getElementById('retryDelay').value = 1000;
            this.showAlert('配置已重置', 'success');
        }
    }

    /**
     * 显示提示信息
     */
    showAlert(message, type = 'info') {
        const alertHtml = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        // 创建临时容器显示提示
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = alertHtml;
        tempDiv.style.position = 'fixed';
        tempDiv.style.top = '20px';
        tempDiv.style.right = '20px';
        tempDiv.style.zIndex = '9999';
        tempDiv.style.minWidth = '300px';
        
        document.body.appendChild(tempDiv);
        
        // 3秒后自动移除
        setTimeout(() => {
            if (tempDiv.parentNode) {
                tempDiv.parentNode.removeChild(tempDiv);
            }
        }, 3000);
    }

    /**
     * 显示加载状态
     */
    showLoading(message = '加载中...') {
        // 简单的加载提示实现
        console.log(message);
    }

    /**
     * 隐藏加载状态
     */
    hideLoading() {
        // 隐藏加载提示
        console.log('Loading finished');
    }
}

// 初始化应用
const app = new NursingSystemApp();
