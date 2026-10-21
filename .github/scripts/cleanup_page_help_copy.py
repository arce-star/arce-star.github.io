from pathlib import Path
p=Path('assets/js/complex-page-help.js')
s=p.read_text(encoding='utf-8')
repls={
"画面亮度是连续细胞状态，不是生/死二值。":"画面亮度表示连续细胞状态，状态取连续值。",
"三维轨迹形成 attractor（吸引子），不是普通闭合周期轨道。":"三维轨迹长期停留在 attractor（吸引子）上，轨迹通常不闭合。",
"真正复杂的结构集中在黑色集合的边界附近，滚轮或点击边界继续放大。":"细节最丰富的结构集中在黑色集合的边界附近，滚轮或点击边界继续放大。",
"XY 自旋不是 ±1，而是平面上的连续方向。":"XY 自旋取平面上的连续方向。",
"这是二维离散映射，不是很多独立粒子。":"图中的点来自同一条二维离散映射轨迹。",
"新节点不是均匀随机连接，而是更容易连接到已经度数高的节点。":"新节点连接到已有节点的概率随对方 degree（度数）增大。",
"title:'这里看的是可激发介质，不是单个神经元'":"title:'这里看二维可激发介质'",
}
for a,b in repls.items():
    s=s.replace(a,b)
p.write_text(s,encoding='utf-8')
print('page-help copy cleanup complete')
