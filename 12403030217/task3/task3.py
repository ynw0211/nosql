import redis
import time

# 配置
SID = "12403030217"
prefix = f"exam:{SID}"
# 本地redis连接
r = redis.Redis(host="127.0.0.1", port=6379, decode_responses=True)

print("===== 1.学生信息维护 Hash =====")
stu_key = f"{prefix}:student"
# (1)创建hash
r.hset(stu_key, mapping={
    "studentId": SID,
    "name": "张三",
    "className": "大数据管理2班",
    "courseId": f"COURSE-{SID}-01",
    "status": "learning"
})
# (2)修改status为completed
r.hset(stu_key, "status", "completed")
# (3)单独读取name、status
res_hmget = r.hmget(stu_key, ["name", "status"])
print(f"读取name、status: {res_hmget}")
# (4)输出完整hash
full_hash = r.hgetall(stu_key)
print(f"完整Hash全部字段：{full_hash}\n")

print("===== 2.已完成章节记录 Set =====")
ch_key = f"{prefix}:finished_chapter"
r.delete(ch_key)  #初始化清空
submit_list = ["CH01", "CH02", "CH02", "CH03"]
for ch in submit_list:
    r.sadd(ch_key, ch)
    cnt = r.scard(ch_key)
    print(f"提交 {ch}，当前已完成章节数量：{cnt}")

all_ch = r.smembers(ch_key)
print(f"最终全部章节：{all_ch}")
print(f"CH02 是否完成：{r.sismember(ch_key,'CH02')}")
print(f"CH04 是否完成：{r.sismember(ch_key,'CH04')}\n")

print("=====3.成绩排行榜 Sorted Set(zset) =====")
z_key = f"{prefix}:score_rank"
r.delete(z_key)
my_member = f"Student:{SID}"
#初始化zset
r.zadd(z_key, {
    my_member: 72,
    "demo:01": 85,
    "demo:02": 90,
    "demo:03": 60,
    "demo:04": 80
})
#(1)分数从高到低前3名
top3_1 = r.zrange(z_key, 0, 2, desc=True, withscores=True)
print(f"(1)加分前 前3名：{top3_1}")
#(2)本人分数增加20
r.zincrby(z_key, 20, my_member)
#(3)再次输出前3
top3_2 = r.zrange(z_key, 0, 2, desc=True, withscores=True)
print(f"(3)加分后 前3名：{top3_2}")
#(4)查询更新后的分数、名次（降序，+1转为第X名）
my_score = r.zscore(z_key, my_member)
rank_zero = r.zrank(z_key, my_member, desc=True)
my_rank = rank_zero + 1
print(f"(4)本人更新后分数：{my_score}，名次：第{my_rank}名\n")

print("=====4.会话生命周期 String =====")
sess_key = f"{prefix}:session"
r.setex(sess_key, 5, "mysession‑abc‑217")
val = r.get(sess_key)
ttl1 = r.ttl(sess_key)
print(f"创建后，键值={val}，TTL={ttl1}秒")
print("等待6秒……")
time.sleep(6)
exist = r.exists(sess_key)
ttl2 = r.ttl(sess_key)
print(f"sleep6s后，键是否存在:{exist}，TTL={ttl2}")
if exist == 0:
    print("过期验证：通过，会话键已经过期销毁\n")
else:
    print("过期验证：不通过\n")

print("=====5.数据类型核验 =====")
t1 = r.type(stu_key)
t2 = r.type(ch_key)
t3 = r.type(z_key)
t4 = r.type(sess_key)
print(f"{stu_key} 类型：{t1}，选型理由：Hash适合存储对象多字段，支持部分字段读写，无需序列化整个对象。")
print(f"{ch_key} 类型：{t2}，选型理由：Set自带去重，适合记录不重复的已完成章节，快速判断成员是否存在。")
print(f"{z_key} 类型：{t3}，选型理由：Sorted‑Set支持按分数排序，直接实现排行榜与名次查询。")
print(f"{sess_key} 类型：{t4}，选型理由：String存储简单会话标识，原生支持设置TTL实现自动过期。")
