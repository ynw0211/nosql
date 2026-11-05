// ==================================================
// task2.js - MongoDB原子扣减与事务验证
// 学号：12403030217 | Stock=7 | Buy=3
// ==================================================
const SID = "12403030217";
const examDB = db.getSiblingDB("exam_" + SID);
const Stock = 7;
const Buy = 3;

// ===================== 环境重置函数（每个场景前独立调用） =====================
function resetEnv(initStock) {
    examDB.inventory.deleteOne({ _id: "BOOK-" + SID });
    examDB.inventory.insertOne({
        _id: "BOOK-" + SID,
        title: "NoSQL数据库教材",
        stock: initStock
    });
    examDB.orders.deleteMany({});
}

// ===================== 1. 单文档原子扣减 =====================
function atomicDeduct() {
    print("\n===== 第1小题：单文档原子扣减 =====");
    let updateRes = examDB.inventory.updateOne(
        {
            _id: "BOOK-" + SID,
            stock: { $gte: Buy }
        },
        { $inc: { stock: -Buy } }
    );
    printjson(updateRes);
    return updateRes;
}

// ===================== 2. 判断操作结果 =====================
function judgeResult(updateRes) {
    print("\n===== 第2小题：操作结果判断 =====");
    if (updateRes.modifiedCount === 1) {
        print("(1) 扣减成功");
        return "success";
    } else if (updateRes.matchedCount === 0) {
        print("(2) 库存不足或教材不存在");
        return "not_enough";
    } else {
        print("(3) 数据库执行异常");
        return "error";
    }
}

// ===================== 3. 事务订购函数 =====================
async function buyBook(requestId, forceError = false) {
    const session = db.getMongo().startSession();
    session.startTransaction();
    try {
        // 原子扣减库存
        let invRet = examDB.inventory.updateOne(
            { _id: "BOOK-" + SID, stock: { $gte: Buy } },
            { $inc: { stock: -Buy } },
            { session: session }
        );

        if (invRet.modifiedCount !== 1) {
            await session.abortTransaction();
            session.endSession();
            return { ok: false, msg: "库存不足" };
        }

        // 强制异常测试点
        if (forceError) {
            throw new Error("force error test rollback");
        }

        // 插入订单
        await examDB.orders.insertOne(
            {
                _id: requestId,
                bookId: "BOOK-" + SID,
                studentId: SID,
                quantity: Buy
            },
            { session: session }
        );

        await session.commitTransaction();
        session.endSession();
        return { ok: true, msg: "订购成功" };

    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        return { ok: false, msg: "异常回滚:" + err.message };
    }
}

// ===================== 4. 系统测试（4个场景） =====================
async function runAllCases() {
    // ---------- T1 正常订购 ----------
    print("\n======================");
    print("(1) 场景编号: T1");
    print("(2) 初始库存: " + Stock);
    print("(3) 购买数量: " + Buy);
    resetEnv(Stock);

    let succ = 0, fail = 0;
    let ret = await buyBook("T1-REQ-001", false);
    if (ret.ok) succ++; else fail++;

    let finalStock = examDB.inventory.findOne({ _id: "BOOK-" + SID }).stock;
    let orderCount = examDB.orders.countDocuments({});

    let expSucc = 1, expFail = 0, expStock = Stock - Buy, expOrder = 1;
    let pass = (succ === expSucc) && (fail === expFail) && (finalStock === expStock) && (orderCount === expOrder);

    print("(4) 成功次数: " + succ);
    print("(5) 失败次数: " + fail);
    print("(6) 最终库存: " + finalStock);
    print("(7) 最终订单数量: " + orderCount);
    print("(8) 是否通过核验: " + (pass ? "是" : "否"));
    print("======================");

    // ---------- T2 库存不足 ----------
    print("\n======================");
    let initT2 = Buy - 1;
    print("(1) 场景编号: T2");
    print("(2) 初始库存: " + initT2);
    print("(3) 购买数量: " + Buy);
    resetEnv(initT2);

    succ = 0; fail = 0;
    ret = await buyBook("T2-REQ-001", false);
    if (ret.ok) succ++; else fail++;

    finalStock = examDB.inventory.findOne({ _id: "BOOK-" + SID }).stock;
    orderCount = examDB.orders.countDocuments({});

    expSucc = 0; expFail = 1; expStock = initT2; expOrder = 0;
    pass = (succ === expSucc) && (fail === expFail) && (finalStock === expStock) && (orderCount === expOrder);

    print("(4) 成功次数: " + succ);
    print("(5) 失败次数: " + fail);
    print("(6) 最终库存: " + finalStock);
    print("(7) 最终订单数量: " + orderCount);
    print("(8) 是否通过核验: " + (pass ? "是" : "否"));
    print("======================");

    // ---------- T3 中途异常回滚 ----------
    print("\n======================");
    print("(1) 场景编号: T3");
    print("(2) 初始库存: " + Stock);
    print("(3) 购买数量: " + Buy);
    resetEnv(Stock);

    succ = 0; fail = 0;
    ret = await buyBook("T3-REQ-001", true);
    if (ret.ok) succ++; else fail++;

    finalStock = examDB.inventory.findOne({ _id: "BOOK-" + SID }).stock;
    orderCount = examDB.orders.countDocuments({});

    expSucc = 0; expFail = 1; expStock = Stock; expOrder = 0;
    pass = (succ === expSucc) && (fail === expFail) && (finalStock === expStock) && (orderCount === expOrder);

    print("(4) 成功次数: " + succ);
    print("(5) 失败次数: " + fail);
    print("(6) 最终库存: " + finalStock);
    print("(7) 最终订单数量: " + orderCount);
    print("(8) 是否通过核验: " + (pass ? "是" : "否"));
    print("======================");

    // ---------- T4 连续购买 ----------
    print("\n======================");
    let runTimes = Math.floor(Stock / Buy) + 1;
    print("(1) 场景编号: T4");
    print("(2) 初始库存: " + Stock);
    print("(3) 购买数量: " + Buy);
    resetEnv(Stock);

    succ = 0; fail = 0;
    for (let i = 1; i <= runTimes; i++) {
        ret = await buyBook("T4-REQ-00" + i, false);
        if (ret.ok) succ++; else fail++;
    }

    finalStock = examDB.inventory.findOne({ _id: "BOOK-" + SID }).stock;
    orderCount = examDB.orders.countDocuments({});

    let maxCanBuy = Math.floor(Stock / Buy);
    expSucc = maxCanBuy; expFail = runTimes - maxCanBuy;
    expStock = Stock - maxCanBuy * Buy;
    expOrder = maxCanBuy;
    pass = (succ === expSucc) && (fail === expFail) && (finalStock === expStock) && (orderCount === expOrder);

    print("(4) 成功次数: " + succ);
    print("(5) 失败次数: " + fail);
    print("(6) 最终库存: " + finalStock);
    print("(7) 最终订单数量: " + orderCount);
    print("(8) 是否通过核验: " + (pass ? "是" : "否"));
    print("======================");
}

// ===================== 5. 结果解释 =====================
function explainResult() {
    print("\n===== 第5小题：结果解释 =====");
    print("(1) 为什么单次扣减具有原子性，仍然需要事务？");
    print("    单文档原子扣减仅能保证inventory集合单个文档操作的原子性；");
    print("    本业务涉及inventory库存、orders订单两个集合的跨文档操作，");
    print("    必须通过事务保证两个操作同时成功或同时回滚，避免出现库存扣减成功但订单丢失的数据不一致。");
    print("\n(2) forceError测试验证了什么？");
    print("    模拟库存扣减完成、订单插入前的业务异常，验证MongoDB事务的回滚能力；");
    print("    确认异常发生后，库存会恢复原值，不会生成订单，保证数据一致性。");
}

/* 执行命令（mongosh中依次输入）：
load("task2.js")

// 单独测试原子扣减+判断
resetEnv(Stock);
let res = atomicDeduct();
judgeResult(res);

// 运行全部4个测试场景
runAllCases();

// 查看结果解释
explainResult();
*/
