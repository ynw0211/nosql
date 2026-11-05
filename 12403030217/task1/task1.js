// ==================================================
// task1.js - MongoDB课程信息查询与维护
// 学号：12403030217 | S=17 | A=2
// ==================================================
const SID = "12403030217";
const examDB = db.getSiblingDB("exam_" + SID);

// ===================== 初始化代码（单独执行，业务验证时请勿重复执行） =====================
function initCourses() {
    examDB.courses.deleteMany({});
    examDB.courses.insertMany([
        {
            _id: "COURSE-" + SID + "-01",
            title: "NoSQL数据库",
            teacher: "张老师",
            status: "OPEN",
            chapters: [
                { chapterId: "CH01", title: "MongoDB基础", hours: 2 },
                { chapterId: "CH02", title: "Redis基础", hours: 2 }
            ]
        },
        {
            _id: "COURSE-" + SID + "-02",
            title: "数据库原理",
            teacher: "张老师",
            status: "CLOSED",
            chapters: [
                { chapterId: "CH01", title: "关系模型", hours: 2 }
            ]
        },
        {
            _id: "COURSE-" + SID + "-03",
            title: "机器学习",
            teacher: "李老师",
            status: "OPEN",
            chapters: [
                { chapterId: "CH01", title: "分类", hours: 2 },
                { chapterId: "CH02", title: "聚类", hours: 2 }
            ]
        }
    ]);
    print("✅ courses集合初始化完成");
}

// ===================== 1. 查询课程 =====================
function queryCourses() {
    print("\n===== 第1小题：查询张老师OPEN状态课程 =====");
    let result = examDB.courses.find(
        { teacher: "张老师", status: "OPEN" },
        {
            _id: 1,
            title: 1,
            chapterCount: { $size: "$chapters" }
        }
    ).toArray();
    printjson(result);
    return result;
}

// ===================== 2. 修改章节标题（局部更新） =====================
function updateChapterTitle() {
    print("\n===== 第2小题：修改CH02章节标题 =====");
    let updateRet = examDB.courses.updateOne(
        { _id: "COURSE-" + SID + "-01" },
        { $set: { "chapters.$[ch].title": "Redis基础与应用-17" } },
        { arrayFilters: [{ "ch.chapterId": "CH02" }] }
    );
    print("更新返回结果：");
    printjson(updateRet);
    print("\n更新后完整课程文档：");
    let doc = examDB.courses.findOne({ _id: "COURSE-" + SID + "-01" });
    printjson(doc);
    return updateRet;
}

// ===================== 3. 增加章节并防止重复 =====================
function addChapterNoRepeat() {
    print("\n===== 第3小题：新增CH03，连续执行两次 =====");
    const newChapter = { chapterId: "CH03", title: "Redis高级操作", hours: 4 }; // 2+A=4

    print("第1次执行新增：");
    let ret1 = examDB.courses.updateOne(
        { _id: "COURSE-" + SID + "-01" },
        { $addToSet: { chapters: newChapter } }
    );
    printjson(ret1);

    print("第2次执行新增：");
    let ret2 = examDB.courses.updateOne(
        { _id: "COURSE-" + SID + "-01" },
        { $addToSet: { chapters: newChapter } }
    );
    printjson(ret2);
    print("👉 第二次modifiedCount为0，说明未重复插入章节");
    return [ret1, ret2];
}

// ===================== 4. 验证与解释 =====================
function verifyResult() {
    print("\n===== 第4小题：核验结果 =====");
    let doc = examDB.courses.findOne({ _id: "COURSE-" + SID + "-01" });

    let ch02 = doc.chapters.find(x => x.chapterId === "CH02");
    print("(1) 修改后CH02标题：" + ch02.title);

    let ch03Arr = doc.chapters.filter(x => x.chapterId === "CH03");
    print("(2) 两次新增后CH03数量：" + ch03Arr.length);

    print("(3) 最终章节总数：" + doc.chapters.length);

    print("(4) teacher=" + doc.teacher + "，status=" + doc.status + "，均保持原值");

    print("\n为什么适合局部更新，不宜替换整个文档：");
    print("1. 仅修改指定字段/数组元素，无需读取完整文档再写回，减少网络传输开销；");
    print("2. 避免并发场景下覆盖其他客户端对文档其他字段的修改；");
    print("3. 减少文档重写开销，降低数据库写压力；");
    print("4. 单条更新操作具备原子性，整体替换文档易产生数据丢失风险。");
}

/* 执行命令（mongosh中依次输入）：
load("task1.js")
initCourses();
queryCourses();
updateChapterTitle();
addChapterNoRepeat();
verifyResult();
*/
