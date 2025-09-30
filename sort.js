var nurseObjs = [{ id: 1, count: 0 },{ id: 3, count: 2 },{ id: 4, count: 1 }]; // 护士对象
// var doctorObjs = [{ id: 2, count: 2 }]; // 医生对象
// var caregiverObjs = [{ id: 3, count: 3 }]; // 护理员对象

/**
 * 对数组排序，根据对象的 count 值排序
 * @param {Array<{id: string, count: number}>} array - 要排序的数组
 * @returns {Array<{id: string, count: number}>} 排序后的数组
 */
function sortByCount(array) {
    return array.sort((a, b) => a.count - b.count);
}

// 示例使用
nurseObjs = sortByCount(nurseObjs);

console.log("Sorted nurseObjs:", nurseObjs);