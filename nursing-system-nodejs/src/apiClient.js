/**
 * API客户端类
 * 负责所有与服务器的HTTP通信
 */
import fetch from 'node-fetch';

export class ApiClient {
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
        this.baseUrl = config.get('api.baseUrl');
        this.timeout = config.get('api.timeout', 30000);
        this.headers = config.getApiHeaders();
    }

    /**
     * 通用HTTP请求方法
     * @param {string} url - 请求URL
     * @param {Object} options - 请求选项
     * @returns {Promise<Object>} 响应数据
     */
    async request(url, options = {}) {
        const requestOptions = {
            method: 'GET',
            headers: this.headers,
            timeout: this.timeout,
            ...options
        };

        if (requestOptions.body && typeof requestOptions.body === 'object') {
            requestOptions.body = JSON.stringify(requestOptions.body);
        }

        try {
            this.logger.debug(`API请求: ${requestOptions.method} ${url}`);
            
            const response = await fetch(url, requestOptions);
            
            if (!response.ok) {
                const errorText = await response.text();
                const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
                error.status = response.status;
                error.responseBody = errorText;
                throw error;
            }

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            } else {
                return await response.text();
            }

        } catch (error) {
            // 记录详细的错误信息，包括HTTP响应体
            let errorMessage = `API请求失败 ${url}: ${error.message}`;
            
            if (error.responseBody) {
                try {
                    // 尝试解析JSON响应体
                    const responseData = JSON.parse(error.responseBody);
                    if (responseData.message) {
                        errorMessage += ` | 服务器消息: ${responseData.message}`;
                    } else if (responseData.error) {
                        errorMessage += ` | 服务器错误: ${responseData.error}`;
                    } else {
                        errorMessage += ` | 响应体: ${error.responseBody}`;
                    }
                } catch (parseError) {
                    // 如果不是JSON，直接记录响应体文本
                    errorMessage += ` | 响应体: ${error.responseBody}`;
                }
            }
            
            this.logger.error(errorMessage);
            throw error;
        }
    }

    /**
     * GET请求
     * @param {string} endpoint - API端点
     * @returns {Promise<Object>} 响应数据
     */
    async get(endpoint) {
        const url = `${this.baseUrl}${endpoint}`;
        return this.request(url, { method: 'GET' });
    }

    /**
     * POST请求
     * @param {string} endpoint - API端点
     * @param {Object} data - 请求数据
     * @returns {Promise<Object>} 响应数据
     */
    async post(endpoint, data = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        return this.request(url, {
            method: 'POST',
            body: data
        });
    }

    /**
     * 根据用户名获取用户信息
     * @param {string} username - 用户名
     * @returns {Promise<Object|null>} 用户信息
     */
    async getUserInfo(username) {
        const payload = {
            ckh004: "01",
            cka025: 370284,
            aaa027: "",
            ckh005: "H37021106950",
            deptName: "黄岛远保康诊所",
            aac002: "",
            aac003: username,
            ckh003: "",
            ckg066: "",
            ckh280: "",
            ckh079: "",
            ckh101: "",
            ckf181: "",
            pageNum: 1,
            pageSize: 10,
            isOver: true
        };

        try {
            const data = await this.post('/nursing/kh01/selectPlanAlreadyMade', payload);
            
            if (data && data.list && data.list.length > 0) {
                this.logger.debug(`获取用户信息成功: ${username}`);
                return data.list[0];
            } else {
                this.logger.warn(`未找到用户信息: ${username}`);
                return null;
            }
        } catch (error) {
            let errorMsg = `获取用户信息失败: ${username} - ${error.message}`;
            if (error.responseBody) {
                errorMsg += ` | 响应体: ${error.responseBody}`;
            }
            this.logger.error(errorMsg);
            throw error;
        }
    }

    /**
     * 获取数据库时间
     * @returns {Promise<string>} 时间字符串
     */
    async getDatabaseTime() {
        try {
            const time = await this.get('/sys/getDatabaseTime/getTime');
            this.logger.debug(`获取数据库时间: ${time}`);
            return time;
        } catch (error) {
            let errorMsg = `获取数据库时间失败: ${error.message}`;
            if (error.responseBody) {
                errorMsg += ` | 响应体: ${error.responseBody}`;
            }
            this.logger.error(errorMsg);
            throw error;
        }
    }

    /**
     * 查询护理分类
     * @param {string} ckh003 - 入住类型
     * @param {string} ckh057 - 分类代码
     * @returns {Promise<Array>} 护理分类列表
     */
    async queryNursingCategory(ckh003 = "01", ckh057 = "04") {
        const payload = { ckh003, ckh057 };

        try {
            const data = await this.post('/nursing/kh18/queryKH18', payload);
            this.logger.debug(`查询护理分类成功，获得 ${data?.length || 0} 条记录`);
            return data || [];
        } catch (error) {
            let errorMsg = `查询护理分类失败: ${error.message}`;
            if (error.responseBody) {
                errorMsg += ` | 响应体: ${error.responseBody}`;
            }
            this.logger.error(errorMsg);
            throw error;
        }
    }

    /**
     * 查询护理分类列表
     * @param {number} ckh059 - 护理等级
     * @returns {Promise<Array>} 护理项目列表
     */
    async queryNursingClassifyList(ckh059) {
        const payload = { ckh059 };

        try {
            const data = await this.post('/nursing/kh18/queryKH20ClassifyList', payload);
            this.logger.debug(`查询护理项目成功，获得 ${data?.length || 0} 个项目`);
            return data || [];
        } catch (error) {
            let errorMsg = `查询护理项目失败: ${error.message}`;
            if (error.responseBody) {
                errorMsg += ` | 响应体: ${error.responseBody}`;
            }
            this.logger.error(errorMsg);
            throw error;
        }
    }

    /**
     * 查询人员列表
     * @param {string} ckf020 - 机构代码
     * @returns {Promise<Array>} 人员列表
     */
    async queryPersonnelList(ckf020 = "H37021106950") {
        const payload = { ckf020 };

        try {
            const data = await this.post('/sys/kh34/queryKH34List', payload);
            this.logger.debug(`查询人员列表成功，获得 ${data?.length || 0} 人`);
            return data || [];
        } catch (error) {
            let errorMsg = `查询人员列表失败: ${error.message}`;
            if (error.responseBody) {
                errorMsg += ` | 响应体: ${error.responseBody}`;
            }
            this.logger.error(errorMsg);
            throw error;
        }
    }

    /**
     * 提交护理入住登记
     * @param {Object} checkinData - 登记数据
     * @returns {Promise<{success: boolean, response: string}>} 提交结果
     */
    async submitNursingCheckin(checkinData) {
        try {
            this.logger.debug(`提交护理入住登记: ${checkinData.aac003}`);
            
            const response = await this.post('/nursing/kh01/checkIn', checkinData);
            
            if (typeof response === 'string' && response.includes("本次业务办理成功")) {
                this.logger.debug(`登记成功: ${checkinData.aac003}`);
                return { success: true, response };
            } else {
                this.logger.warn(`登记失败: ${checkinData.aac003} - ${response}`);
                return { success: false, response };
            }

        } catch (error) {
            // 构建详细的错误消息
            let errorMsg = `提交登记异常: ${checkinData.aac003} - ${error.message}`;
            let detailedResponse = error.message;
            
            // 记录详细的HTTP响应体
            if (error.responseBody) {
                try {
                    // 尝试解析JSON响应体
                    const responseData = JSON.parse(error.responseBody);
                    if (responseData.message) {
                        detailedResponse = responseData.message;
                        errorMsg += ` | 服务器消息: ${responseData.message}`;
                    } else if (responseData.error) {
                        detailedResponse = responseData.error;
                        errorMsg += ` | 服务器错误: ${responseData.error}`;
                    } else {
                        detailedResponse = error.responseBody;
                        errorMsg += ` | 响应体: ${error.responseBody}`;
                    }
                } catch (parseError) {
                    // 如果不是JSON，直接记录响应体文本
                    detailedResponse = error.responseBody;
                    errorMsg += ` | 响应体: ${error.responseBody}`;
                }
                
                // 检查特定错误类型
                if (error.responseBody.includes("责任护士负责人数已达")) {
                    error.errorType = 'NURSE_LIMIT_REACHED';
                } else if (error.responseBody.includes("责任医师负责人数已达")) {
                    error.errorType = 'DOCTOR_LIMIT_REACHED';
                } else if (error.responseBody.includes("护理员负责人数已达")) {
                    error.errorType = 'CAREGIVER_LIMIT_REACHED';
                }
            }
            
            this.logger.error(errorMsg);
            return { success: false, response: detailedResponse, error };
        }
    }

    /**
     * 批量查询API（可用于优化性能）
     * @param {Array} requests - 请求列表 [{method, endpoint, data}]
     * @returns {Promise<Array>} 响应列表
     */
    async batchRequest(requests) {
        const promises = requests.map(req => {
            if (req.method === 'GET') {
                return this.get(req.endpoint);
            } else {
                return this.post(req.endpoint, req.data);
            }
        });

        try {
            const results = await Promise.allSettled(promises);
            return results.map((result, index) => ({
                success: result.status === 'fulfilled',
                data: result.status === 'fulfilled' ? result.value : null,
                error: result.status === 'rejected' ? result.reason : null,
                request: requests[index]
            }));
        } catch (error) {
            this.logger.error(`批量请求失败: ${error.message}`);
            throw error;
        }
    }

    /**
     * 健康检查
     * @returns {Promise<boolean>} API是否可用
     */
    async healthCheck() {
        try {
            await this.getDatabaseTime();
            this.logger.info('API健康检查通过');
            return true;
        } catch (error) {
            let errorMsg = `API健康检查失败: ${error.message}`;
            if (error.responseBody) {
                errorMsg += ` | 响应体: ${error.responseBody}`;
            }
            this.logger.error(errorMsg);
            return false;
        }
    }
}
