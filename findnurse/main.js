const fs = require('fs');
const path = require('path');

// API配置
const API_BASE = 'http://test.vssh.top/api/rest';
const CACHE_DIR = path.join(__dirname, 'cache');
const HEADERS = {
  "accept": "application/json, text/plain, */*",
  "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,en-US;q=0.7",
  "content-type": "application/json;charset=UTF-8",
  "proxy-connection": "keep-alive",
  "cookie": "SESSION=MmExNmYwMGUtNTcxZi00MTZiLWIyOTMtODY1Y2FlNjYyNTBh; account=H37021106950; password=",
  "Referer": "http://test.vssh.top/"
};

/**
 * 初始化缓存目录
 */
function initCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    console.log(`✓ 缓存目录已创建: ${CACHE_DIR}`);
  }
}

/**
 * 生成缓存文件名
 * @param {Object} patient 病人对象
 * @returns {string} 缓存文件路径
 */
function getCacheFilePath(patient) {
  const filename = `patient_${patient.ckh001}_${patient.aac002}.json`;
  return path.join(CACHE_DIR, filename);
}

/**
 * 从缓存读取病人详情
 * @param {Object} patient 病人对象
 * @returns {Object|null} 缓存的病人详情，如果不存在返回null
 */
function readFromCache(patient) {
  try {
    const cacheFile = getCacheFilePath(patient);
    if (fs.existsSync(cacheFile)) {
      const data = fs.readFileSync(cacheFile, 'utf8');
      const cached = JSON.parse(data);
      console.log(`  📦 从缓存读取: ${patient.aac003}`);
      return cached.data;
    }
  } catch (error) {
    console.error(`  ⚠️  读取缓存失败 (${patient.aac003}):`, error.message);
  }
  return null;
}

/**
 * 将病人详情写入缓存
 * @param {Object} patient 病人对象
 * @param {Object} detail 病人详情数据
 */
function writeToCache(patient, detail) {
  try {
    initCacheDir();
    const cacheFile = getCacheFilePath(patient);
    const cacheData = {
      cachedAt: new Date().toISOString(),
      patient: {
        ckh001: patient.ckh001,
        aac002: patient.aac002,
        aac003: patient.aac003,
        ckh002: patient.ckh002
      },
      data: detail
    };
    fs.writeFileSync(cacheFile, JSON.stringify(cacheData, null, 2), 'utf8');
    console.log(`  💾 已缓存: ${patient.aac003}`);
  } catch (error) {
    console.error(`  ⚠️  写入缓存失败 (${patient.aac003}):`, error.message);
  }
}

/**
 * 清空所有缓存文件
 * @returns {number} 删除的文件数量
 */
function clearCache() {
  let count = 0;
  try {
    if (fs.existsSync(CACHE_DIR)) {
      const files = fs.readdirSync(CACHE_DIR);
      files.forEach(file => {
        if (file.endsWith('.json')) {
          fs.unlinkSync(path.join(CACHE_DIR, file));
          count++;
        }
      });
      console.log(`✓ 已清空 ${count} 个缓存文件`);
    }
  } catch (error) {
    console.error('清空缓存失败:', error.message);
  }
  return count;
}

/**
 * 获取缓存统计信息
 * @returns {Object} 缓存统计
 */
function getCacheStats() {
  const stats = {
    exists: false,
    count: 0,
    totalSize: 0,
    files: []
  };
  
  try {
    if (fs.existsSync(CACHE_DIR)) {
      stats.exists = true;
      const files = fs.readdirSync(CACHE_DIR);
      files.forEach(file => {
        if (file.endsWith('.json')) {
          const filePath = path.join(CACHE_DIR, file);
          const stat = fs.statSync(filePath);
          stats.count++;
          stats.totalSize += stat.size;
          stats.files.push({
            name: file,
            size: stat.size,
            modifiedAt: stat.mtime
          });
        }
      });
    }
  } catch (error) {
    console.error('获取缓存统计失败:', error.message);
  }
  
  return stats;
}

/**
 * 获取所有护理员列表
 * @returns {Promise<Array>} 护理员列表
 */
async function getAllNurses() {
  const response = await fetch(`${API_BASE}/sys/kh34/queryKH34List`, {
    headers: HEADERS,
    body: JSON.stringify({ "ckf020": "H37021106950" }),
    method: "POST"
  });
  return await response.json();
}

/**
 * 获取病人列表
 * @param {number} pageNum 页码
 * @param {number} pageSize 每页数量
 * @returns {Promise<Object>} 病人列表分页数据
 */
async function getPatientList(pageNum = 1, pageSize = 1000) {
  const response = await fetch(`${API_BASE}/nursing/kh01/selectPlanAlreadyMade`, {
    headers: HEADERS,
    body: JSON.stringify({
      "ckh004": "01",
      "cka025": 370284,
      "aaa027": "",
      "ckh005": "H37021106950",
      "deptName": "黄岛远保康诊所",
      "aac002": "",
      "aac003": "",
      "ckh003": "",
      "ckg066": "",
      "ckh280": "",
      "ckh079": "",
      "ckh101": "",
      "ckf181": "",
      "pageNum": pageNum,
      "pageSize": pageSize,
      "isOver": false
    }),
    method: "POST"
  });
  return await response.json();
}

/**
 * 获取病人详情（带缓存功能）
 * @param {Object} patient 病人对象
 * @param {boolean} useCache 是否使用缓存，默认为true
 * @returns {Promise<Object>} 病人详情
 */
async function getPatientDetail(patient, useCache = true) {
  // 尝试从缓存读取
  if (useCache) {
    const cached = readFromCache(patient);
    if (cached) {
      return cached;
    }
  }
  
  // 从API获取数据
  console.log(`  🌐 从API获取: ${patient.aac003}`);
  const response = await fetch(`${API_BASE}/nursing/kh01/checkInDetail`, {
    headers: HEADERS,
    body: JSON.stringify({
      "ckh002": patient.ckh002,
      "ckg161": patient.ckg161,
      "ckh001": patient.ckh001,
      "aac002": patient.aac002,
      "aac003": patient.aac003
    }),
    method: "POST"
  });
  const detail = await response.json();
  
  // 写入缓存
  if (useCache) {
    writeToCache(patient, detail);
  }
  
  return detail;
}

/**
 * 根据护理员名字查找他们负责的病人
 * @param {Array<string>} nurseNames 护理员名字数组
 * @param {boolean} useCache 是否使用缓存，默认为true
 * @returns {Promise<Object>} 查询结果，包含每个护理员及其负责的病人列表
 */
async function findPatientsByNurseNames(nurseNames, useCache = true) {
  try {
    console.log('正在获取护理员列表...');
    // 1. 获取所有护理员
    const allNurses = await getAllNurses();
    
    // 2. 根据名字筛选目标护理员，提取护理员ID (ckh174)
    const targetNurses = allNurses.filter(nurse => {
      // 从 aac003 中提取姓名（格式: "宋艳洁-370224197006037021(护理员)"）
      const name = nurse.aac003.split('-')[0];
      return nurseNames.includes(name);
    });
    
    if (targetNurses.length === 0) {
      console.log('未找到匹配的护理员');
      return { nurses: [], notFound: nurseNames };
    }
    
    // 创建护理员ID到护理员信息的映射
    const nurseMap = {};
    targetNurses.forEach(nurse => {
      const name = nurse.aac003.split('-')[0];
      nurseMap[nurse.ckh174] = {
        id: nurse.ckh174,
        name: name,
        fullName: nurse.aac003,
        idCard: nurse.aac002,
        phone: nurse.aae005,
        patients: []
      };
    });
    
    console.log(`找到 ${targetNurses.length} 个匹配的护理员:`, Object.values(nurseMap).map(n => n.name).join(', '));
    console.log('正在获取病人列表...');
    
    // 3. 获取所有病人列表
    const patientData = await getPatientList();
    const patients = patientData.list || [];
    
    console.log(`共找到 ${patients.length} 个病人，正在查询详情...`);
    
    // 4. 遍历病人列表，获取详情并匹配护理员
    let processedCount = 0;
    let cacheHits = 0;
    let apiCalls = 0;
    
    // 初始化缓存目录
    if (useCache) {
      initCacheDir();
    }
    
    for (const patient of patients) {
      try {
        // 检查是否命中缓存
        const wasCached = useCache && readFromCache(patient) !== null;
        if (wasCached) cacheHits++;
        
        const detail = await getPatientDetail(patient, useCache);
        
        if (!wasCached && useCache) apiCalls++;
        processedCount++;
        
        // 获取病人的护理员ID (kh15DTO.ckh600)
        const nurseId = detail.kh15DTO?.ckh600;
        
        if (nurseId && nurseMap[nurseId]) {
          // 找到匹配的护理员，添加病人信息
          nurseMap[nurseId].patients.push({
            orderNo: patient.ckh002,
            name: patient.aac003,
            idCard: patient.aac002,
            address: detail.assessOrderDTO?.appointedAddress || '',
            contactName: detail.assessOrderDTO?.contactName || '',
            contactPhone: detail.assessOrderDTO?.contactPhone || '',
            assessedLevel: patient.assessedLevel,
            grantTime: detail.assessOrderDTO?.grantTime || '',
            orgName: patient.orgName
          });
        }
        
        // 每处理10个病人显示进度
        if (processedCount % 10 === 0) {
          console.log(`已处理 ${processedCount}/${patients.length} 个病人...`);
        }
        
        // 添加延迟避免请求过快
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`获取病人 ${patient.aac003} 详情失败:`, error.message);
      }
    }
    
    console.log('查询完成！');
    
    // 5. 整理结果
    const result = {
      nurses: Object.values(nurseMap),
      summary: {
        totalNurses: targetNurses.length,
        totalPatients: patients.length,
        processedPatients: processedCount,
        cacheEnabled: useCache
      }
    };
    
    if (useCache) {
      result.summary.cacheHits = cacheHits;
      result.summary.apiCalls = apiCalls;
      result.summary.cacheHitRate = patients.length > 0 
        ? ((cacheHits / patients.length) * 100).toFixed(2) + '%' 
        : '0%';
    }
    
    // 找出未匹配的护理员名字
    const foundNames = Object.values(nurseMap).map(n => n.name);
    const notFoundNames = nurseNames.filter(name => !foundNames.includes(name));
    if (notFoundNames.length > 0) {
      result.notFound = notFoundNames;
    }
    
    return result;
    
  } catch (error) {
    console.error('查询失败:', error);
    throw error;
  }
}

/**
 * 生成唯一的输出文件名（含时间戳）
 * @returns {string} 文件路径
 */
function generateOutputFileName() {
  const timestamp = new Date().toISOString()
    .replace(/T/, '_')
    .replace(/:/g, '-')
    .replace(/\..+/, '');
  const filename = `result_${timestamp}.txt`;
  return path.join(__dirname, filename);
}

/**
 * 格式化输出结果（同时输出到文件和控制台）
 * @param {Object} result 查询结果
 */
function printResult(result) {
  const outputFile = generateOutputFileName();
  let output = '\n========== 查询结果 ==========\n\n';
  
  console.log('\n========== 查询结果 ==========\n');
  
  if (result.notFound && result.notFound.length > 0) {
    const notFoundText = `⚠️  未找到的护理员: ${result.notFound.join(', ')}\n\n`;
    output += notFoundText;
    console.log('⚠️  未找到的护理员:', result.notFound.join(', '));
    console.log('');
  }
  
  result.nurses.forEach((nurse, index) => {
    const nurseTitle = `${index + 1}. 护理员: ${nurse.name}`;
    output += nurseTitle + '\n';
    console.log(nurseTitle);
    
    const nurseInfo = `   身份证: ${nurse.idCard}\n   电话: ${nurse.phone}\n   负责病人数: ${nurse.patients.length}\n`;
    output += nurseInfo;
    console.log(`   身份证: ${nurse.idCard}`);
    console.log(`   电话: ${nurse.phone}`);
    console.log(`   负责病人数: ${nurse.patients.length}\n`);
    
    if (nurse.patients.length > 0) {
      nurse.patients.forEach((patient, pIndex) => {
        const patientTitle = `   ${pIndex + 1}) ${patient.name} (${patient.idCard})`;
        output += patientTitle + '\n';
        console.log(patientTitle);
        
        const patientInfo = `      订单号: ${patient.orderNo}\n      失能等级: ${patient.assessedLevel}\n      联系人: ${patient.contactName} (${patient.contactPhone})\n      地址: ${patient.address}\n      机构: ${patient.orgName}\n      授予时间: ${patient.grantTime}\n\n`;
        output += patientInfo;
        console.log(`      订单号: ${patient.orderNo}`);
        console.log(`      失能等级: ${patient.assessedLevel}`);
        console.log(`      联系人: ${patient.contactName} (${patient.contactPhone})`);
        console.log(`      地址: ${patient.address}`);
        console.log(`      机构: ${patient.orgName}`);
        console.log(`      授予时间: ${patient.grantTime}`);
        console.log('');
      });
    } else {
      const emptyText = '   暂无负责的病人\n\n';
      output += emptyText;
      console.log('   暂无负责的病人\n');
    }
  });
  
  output += '========== 统计信息 ==========\n';
  output += `查询的护理员数: ${result.summary.totalNurses}\n`;
  output += `总病人数: ${result.summary.totalPatients}\n`;
  output += `已处理病人数: ${result.summary.processedPatients}\n`;
  
  console.log('========== 统计信息 ==========');
  console.log(`查询的护理员数: ${result.summary.totalNurses}`);
  console.log(`总病人数: ${result.summary.totalPatients}`);
  console.log(`已处理病人数: ${result.summary.processedPatients}`);
  
  if (result.summary.cacheEnabled) {
    const cacheText = `\n缓存使用情况:\n  缓存命中: ${result.summary.cacheHits}\n  API调用: ${result.summary.apiCalls}\n  命中率: ${result.summary.cacheHitRate}\n`;
    output += cacheText;
    console.log(`\n缓存使用情况:`);
    console.log(`  缓存命中: ${result.summary.cacheHits}`);
    console.log(`  API调用: ${result.summary.apiCalls}`);
    console.log(`  命中率: ${result.summary.cacheHitRate}`);
  }
  
  output += '==============================\n';
  console.log('==============================\n');
  
  // 写入文件
  try {
    fs.writeFileSync(outputFile, output, 'utf8');
    console.log(`✓ 结果已保存到: ${outputFile}`);
  } catch (error) {
    console.error(`✗ 保存文件失败: ${error.message}`);
  }
}

// ========== 使用示例 ==========

// 示例1: 查询单个护理员（使用缓存，默认）
async function example1() {
  console.log('示例1: 查询单个护理员（使用缓存）');
  const result = await findPatientsByNurseNames(['宋艳洁'], true);
  printResult(result);
}

// 示例2: 查询多个护理员（强制从API获取，不使用缓存）
async function example2() {
  console.log('示例2: 查询多个护理员（不使用缓存）');
  const result = await findPatientsByNurseNames(['宋艳洁', '张三', '李四'], false);
  printResult(result);
}

// 示例3: 仅获取数据，不打印
async function example3() {
  const result = await findPatientsByNurseNames(['宋艳洁']);
  // 可以自己处理 result 数据
  console.log('查询结果:', JSON.stringify(result, null, 2));
}

// 示例4: 查看缓存统计
async function example4() {
  console.log('示例4: 查看缓存统计');
  const stats = getCacheStats();
  console.log('缓存统计:', stats);
  console.log(`缓存文件数: ${stats.count}`);
  console.log(`总大小: ${(stats.totalSize / 1024).toFixed(2)} KB`);
}

// 示例5: 清空缓存
async function example5() {
  console.log('示例5: 清空缓存');
  const count = clearCache();
  console.log(`已删除 ${count} 个缓存文件`);
}

// ========== 导出函数 ==========
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    findPatientsByNurseNames,
    printResult,
    generateOutputFileName,
    getAllNurses,
    getPatientList,
    getPatientDetail,
    clearCache,
    getCacheStats,
    initCacheDir
  };
}

// ========== 主函数：取消注释以运行 ==========

(async () => {
  try {
    // 在这里输入要查询的护理员名字
    const nurseNames = ['倪晓光', '于永香', '营亮平'];
    const result = await findPatientsByNurseNames(nurseNames);
    printResult(result);
  } catch (error) {
    console.error('执行失败:', error);
  }
})();

