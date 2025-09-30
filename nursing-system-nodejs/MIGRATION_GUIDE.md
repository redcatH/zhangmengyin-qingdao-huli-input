# 从原系统迁移到Node.js重构版本指南

## 📋 迁移概述

本指南将帮助你从原来的单文件系统平滑迁移到新的模块化Node.js系统。

## 🎯 迁移前准备

### 1. 备份原系统数据
```bash
# 在原系统目录中备份重要文件
copy "入住表（刘毅用）9月.xls" backup\
copy nurseObjs.json backup\
copy doctorObjs.json backup\
copy caregiverObjs.json backup\
copy successfulUsers.json backup\
copy error.log backup\
```

### 2. 确认环境要求
- ✅ Node.js 16.0+ 已安装
- ✅ npm 包管理器可用
- ✅ 原系统数据文件完整

## 🚀 迁移步骤

### 步骤1: 复制数据文件到新系统
```bash
# 将以下文件从原目录复制到 nursing-system-nodejs 目录
入住表（刘毅用）9月.xls      → nursing-system-nodejs\
nurseObjs.json               → nursing-system-nodejs\
doctorObjs.json              → nursing-system-nodejs\
caregiverObjs.json           → nursing-system-nodejs\
successfulUsers.json         → nursing-system-nodejs\
```

### 步骤2: 配置迁移
原系统的硬编码配置已经预设在新系统的 `config.json` 中：

```json
{
  "api": {
    "baseUrl": "http://test.vssh.top/api/rest",
    "token": "SESSION=ZTVlOTgxYWUtMzQ3Mi00ZjA4LWJjMzgtZGYyZmZjMmUzYWJk",
    "referer": "http://10.78.226.94:8080/"
  },
  "files": {
    "excelFile": "入住表（刘毅用）9月.xls"
  },
  "personnel": {
    "nursesLimit": 50,
    "doctorsLimit": 80,
    "caregiversLimit": 30
  },
  "specificCaregivers": [
    "张梅", "卢秀萍", "刘建贞", "刘同花", "刘同秀", "刘岩",
    "刘俊伟", "薛红", "薛光艳", "刘艳华", "薛玉英", "郎庆芳",
    "郭爱辉", "泮瑞英", "王甜甜", "于永香", "倪晓光", "营亮平",
    "王洁", "张本文", "刘香", "殷玉庆"
  ]
}
```

### 步骤3: 首次运行
```bash
# 进入新系统目录
cd nursing-system-nodejs

# 运行一键安装和启动脚本
run.bat
```

## 🔍 功能对比验证

### 原系统功能
- [x] Excel文件读取
- [x] 用户信息获取
- [x] 护理分类查询
- [x] 人员分配管理
- [x] 入住登记提交
- [x] 错误处理和重试
- [x] 成功用户记录

### 新系统增强功能
- [x] **所有原功能保持不变**
- [x] ✨ 模块化架构
- [x] ✨ 外部配置文件
- [x] ✨ 结构化日志
- [x] ✨ 系统预检查
- [x] ✨ 详细处理报告
- [x] ✨ 实时进度显示
- [x] ✨ 人员状态监控
- [x] ✨ 一键运行脚本

## 📊 数据兼容性

### JSON数据文件格式
新系统完全兼容原系统的JSON数据格式：

```json
// nurseObjs.json, doctorObjs.json, caregiverObjs.json
[
  {
    "id": "人员ID",
    "count": 已分配数量
  }
]

// successfulUsers.json
[
  "用户名1",
  "用户名2"
]
```

### Excel文件格式
支持原系统的Excel文件格式：
- 第1列：序号（可选）
- 第2列：姓名
- 第3列：护理类型（家护（失能）/家护（门诊慢特病））
- 第4列：切开气管（是/否）

## 🔧 配置调整指南

### 如果你的原系统有不同配置：

1. **API地址不同**
   ```json
   {
     "api": {
       "baseUrl": "你的API地址",
       "token": "你的Token"
     }
   }
   ```

2. **文件名不同**
   ```json
   {
     "files": {
       "excelFile": "你的Excel文件名.xls"
     }
   }
   ```

3. **人员限制不同**
   ```json
   {
     "personnel": {
       "nursesLimit": 你的护士限制,
       "doctorsLimit": 你的医生限制,
       "caregiversLimit": 你的护理员限制
     }
   }
   ```

4. **护理员名单不同**
   ```json
   {
     "specificCaregivers": [
       "你的护理员1",
       "你的护理员2"
     ]
   }
   ```

## 🚨 迁移注意事项

### 1. 数据完整性检查
迁移前确保以下文件存在且格式正确：
- ✅ Excel输入文件
- ✅ 人员JSON数据文件（如果有）
- ✅ 成功用户记录文件（如果有）

### 2. 配置验证
- ✅ API Token是否有效
- ✅ Excel文件路径是否正确
- ✅ 护理员名单是否完整

### 3. 权限检查
- ✅ 文件读写权限
- ✅ 网络访问权限
- ✅ Node.js执行权限

## 📈 性能对比

| 指标 | 原系统 | 新系统 | 提升 |
|------|--------|--------|------|
| 启动时间 | 即时 | ~2秒 | 增加预检查 |
| 处理速度 | 基准 | 相同 | 无差异 |
| 错误处理 | 基础 | 智能 | 显著提升 |
| 日志质量 | 简单 | 详细 | 显著提升 |
| 用户体验 | 基础 | 优秀 | 显著提升 |

## 🔄 回滚方案

如果需要回滚到原系统：

1. **保留原系统文件**
   - 原main.js文件保持不变
   - 数据文件已备份

2. **停止新系统**
   ```bash
   # 如果新系统正在运行，按Ctrl+C停止
   ```

3. **恢复数据**
   ```bash
   # 如果需要，从backup目录恢复数据
   copy backup\*.json .\
   ```

4. **运行原系统**
   ```bash
   node main.js
   ```

## 📋 迁移检手清单

### 迁移前
- [ ] 备份原系统所有数据文件
- [ ] 确认Node.js环境就绪
- [ ] 记录原系统的特殊配置

### 迁移中
- [ ] 复制数据文件到新系统目录
- [ ] 根据实际情况调整config.json
- [ ] 运行新系统验证功能

### 迁移后
- [ ] 验证数据文件正确加载
- [ ] 测试几个用户的处理流程
- [ ] 检查日志输出是否正常
- [ ] 确认人员统计数据正确

## 🆘 迁移问题解决

### 常见问题

1. **找不到Excel文件**
   - 检查文件是否在nursing-system-nodejs目录中
   - 确认config.json中的文件名是否正确

2. **人员数据丢失**
   - 确认JSON数据文件已复制到新目录
   - 检查文件格式是否正确

3. **处理结果不一致**
   - 对比config.json与原代码中的参数
   - 检查护理员名单是否完整

4. **性能问题**
   - 确认网络连接稳定
   - 检查系统资源使用情况

### 获取帮助
如果遇到问题：
1. 查看error.log文件
2. 检查README.md中的故障排除部分
3. 对比原系统和新系统的配置差异

## 🎉 迁移完成

迁移完成后，你将获得：
- ✅ 更好的代码结构和可维护性
- ✅ 详细的日志和错误信息
- ✅ 实时的处理进度显示
- ✅ 自动生成的处理报告
- ✅ 灵活的配置管理
- ✅ 优秀的用户体验

同时保持：
- ✅ 所有原有功能
- ✅ 相同的处理逻辑
- ✅ 兼容的数据格式
- ✅ 一致的处理结果

---

**恭喜！** 你已经成功迁移到更强大、更易维护的Node.js重构版本！
