import redis
import time

SID = "12403030217"
prefix = f"exam:{SID}"
N = 1217
Q = 100

r = redis.Redis(host="127.0.0.1", port=6379, decode_responses=True)

# =========方案甲：逐条写入，无pipeline=========
print("开始方案甲：逐条写入……")
start_a = time.time()
for i in range(1, N+1):
    key = f"{prefix}:seq:{i}"
    val = f"value-{SID}-{i}"
    r.set(key, val)
end_a = time.time()
ms_a = (end_a - start_a)*1000

# =========方案乙：Pipeline，非事务，每批最多Q=100=========
print("开始方案乙：Pipeline分批写入……")
start_b = time.time()
batch_count = 0
last_batch_size = 0
for offset in range(0, N, Q):
    pl = r.pipeline(transaction=False)  #题目要求普通pipeline，关闭事务
    batch_count +=1
    end_idx = min(offset + Q, N)
    for i in range(offset+1, end_idx+1):
        key = f"{prefix}:pipe:{i}"
        val = f"value-{SID}-{i}"
        pl.set(key, val)
    last_batch_size = end_idx - offset
    pl.execute()  #一批全部发送，等待全部返回再下一批
end_b = time.time()
ms_b = (end_b - start_b)*1000

#输出表格数据
print("\n====性能统计结果====")
print(f"命令总数: {N}")
print(f"Pipeline批次数: {batch_count}")
print(f"最后一批数量: {last_batch_size}")
print(f"方案甲耗时(ms): {ms_a:.2f}")
print(f"方案乙耗时(ms): {ms_b:.2f}")

#核验数据完整性
ok_seq = all(r.get(f"{prefix}:seq:{i}") == f"value-{SID}-{i}" for i in range(1,N+1))
ok_pipe = all(r.get(f"{prefix}:pipe:{i}") == f"value-{SID}-{i}" for i in range(1,N+1))
print(f"\n数据完整性校验，seq全部正确:{ok_seq}, pipe全部正确:{ok_pipe}")

print("\n问题简答：")
print("1. Pipeline（方案乙）一般会更快。")
print("2. 如果差异很小甚至Pipeline更慢的可能原因：")
print("   ①本地Redis，网络往返RTT几乎为0，pipeline减少网络往返收益不明显；")
print("   ②批次大小设置过小，批处理开销抵消收益；")
print("   ③CPU成为瓶颈，循环构造命令占用大量CPU时间；")
print("   ④数据量太小，总耗时基数很小，测量误差影响结果。")
