// 力扣题解 — 30题精刷 (Python + 详细注释)
const LeetCodeUI = (() => {
  const DIFF = { easy:'🟢 简单', medium:'🟡 中等', hard:'🔴 困难' };
  const problems = [
    // ========== 链表 ==========
    { id:1, num:206, title:'反转链表', diff:'easy', cat:'链表', tags:'迭代,递归', link:'https://leetcode.cn/problems/reverse-linked-list/',
      desc:'给你单链表的头节点 head，请你反转链表，并返回反转后的链表。',
      thought:'【迭代法】用三个指针 prev/curr/next 遍历链表。每次将 curr.next 指向 prev（翻转指针方向），然后三个指针同步右移。循环结束时 prev 指向原链表的最后一个节点（新头）。时间复杂度 O(n)，空间 O(1)。\n\n【递归法】递推到最后一个节点（新头），归时翻转 next 指针（head.next.next = head），并断开原指针（head.next = None）。递归深度 = 链表长度，空间 O(n)。\n\n面试要点：两种方法都必须能手写。迭代更省空间，递归更显递归思维。',
      code: `# 迭代法 — O(n)时间 O(1)空间
class Solution:
    def reverseList(self, head: ListNode) -> ListNode:
        prev = None       # 前驱节点，初始为None（新链表的尾部）
        curr = head       # 当前节点，从头开始遍历

        while curr:
            nxt = curr.next   # 暂存下一个节点，防止断链
            curr.next = prev  # 核心：翻转指针方向
            prev = curr       # prev前移
            curr = nxt        # curr前移

        # 循环结束时 curr=None, prev=原链表尾节点(新头)
        return prev

# 递归法 — O(n)时间 O(n)栈空间
class Solution:
    def reverseList(self, head: ListNode) -> ListNode:
        # 递归终止：空链表或只有一个节点
        if not head or not head.next:
            return head

        # 递：一直走到最后一个节点
        new_head = self.reverseList(head.next)

        # 归：翻转指针
        head.next.next = head   # 让下一个节点指向自己
        head.next = None        # 断开自己原来的指针

        return new_head  # new_head始终是原链表尾节点`
    },
    { id:2, num:25, title:'K 个一组翻转链表', diff:'hard', cat:'链表', tags:'递归,迭代', link:'https://leetcode.cn/problems/reverse-nodes-in-k-group/',
      desc:'给你链表的头节点 head，每 k 个节点一组进行翻转，请你返回修改后的链表。如果节点总数不是 k 的整数倍，最后剩余的节点保持原有顺序。',
      thought:'【核心思路】先把"翻转链表前N个节点"或"翻转区间[a,b)"抽象成子函数，然后每k个一组调用。\n\n【递归法】1. 找到第k+1个节点b（不足k个直接返回head）。2. 翻转[a, b)区间内的k个节点。3. 翻转后a变成尾节点，递归处理b及之后的部分，把结果连接到a.next。\n\n【关键技巧】翻转区间[a, b)：b是开区间，不参与翻转。与LC206的区别：LC206翻转整个链表(b=None)。\n\n字节招牌题，必须做到闭眼写bug-free。',
      code: `class Solution:
    def reverseKGroup(self, head: ListNode, k: int) -> ListNode:
        # 1. 找到第k+1个节点（开区间右端点）
        #    不足k个直接返回head（保持原序）
        b = head
        for _ in range(k):
            if not b:          # 不足k个
                return head    # 不翻转，原样返回
            b = b.next

        # 2. 翻转 [head, b) 区间内的k个节点
        #    reverse(a, b) 返回翻转后的新头
        new_head = self.reverse(head, b)

        # 3. head现在是翻转后的尾节点
        #    递归处理 b 及之后的链表，连接在 head 后面
        head.next = self.reverseKGroup(b, k)

        return new_head

    # 翻转区间 [a, b)，b是开区间(不参与翻转)
    # 类似LC206但翻转范围不是到None而是到b
    def reverse(self, a: ListNode, b: ListNode) -> ListNode:
        prev, curr = None, a
        while curr != b:           # 注意：不是 while curr
            nxt = curr.next        # 暂存下一个
            curr.next = prev       # 翻转指针
            prev = curr
            curr = nxt
        return prev                # prev即新区间头`
    },
    { id:3, num:21, title:'合并两个有序链表', diff:'easy', cat:'链表', tags:'归并', link:'https://leetcode.cn/problems/merge-two-sorted-lists/',
      desc:'将两个升序链表合并为一个新的升序链表并返回。',
      thought:'【归并思想】虚拟头节点(dummy)简化边界处理。双指针p1/p2分别遍历两个链表，每次取较小的节点接到结果链表尾部。最后把剩余的非空链表直接接上。\n\n【复杂度】O(m+n)时间，O(1)空间（只改变指针，不创建新节点）。\n\n【递归版】也可用递归：merge(l1, l2) = 较小的节点 + merge(较小节点.next, 另一个链表)。递归版更简洁但空间O(m+n)。',
      code: `# 迭代法（推荐）— O(m+n)时间 O(1)空间
class Solution:
    def mergeTwoLists(self, l1: ListNode, l2: ListNode) -> ListNode:
        dummy = ListNode(-1)  # 虚拟头节点，避免处理空链表边界
        cur = dummy           # cur始终指向结果链表的尾部

        while l1 and l2:      # 两个链表都有节点时
            if l1.val < l2.val:
                cur.next = l1
                l1 = l1.next
            else:
                cur.next = l2
                l2 = l2.next
            cur = cur.next    # 尾部指针后移

        # 把剩余的非空链表直接接上
        cur.next = l1 if l1 else l2

        return dummy.next     # 虚拟头的下一个即真正的头节点`
    },
    { id:4, num:141, title:'环形链表 I + II', diff:'medium', cat:'链表', tags:'快慢指针,Floyd', link:'https://leetcode.cn/problems/linked-list-cycle/',
      desc:'I: 判断链表是否有环。II: 若有环，返回环的入口节点。',
      thought:'【Floyd判圈（龟兔赛跑）】快指针fast每次走2步，慢指针slow每次走1步。若fast走到None则无环；若fast和slow相遇则有环。\n\n【找环入口 — 数学原理】设head到环入口距离=a，环入口到相遇点距离=b，相遇点到环入口距离=c。相遇时slow走了a+b，fast走了a+b+n(b+c)。由fast=2*slow可得 a=c+(n-1)(b+c)，即从head走到环入口恰好等于从相遇点走c（即走到环入口）加上若干整圈。因此：相遇后一个指针回head，两指针同步每次走1步，再次相遇点即环入口。\n\n【记忆技巧】相遇后，slow回head，两人同步走，再见即是入口。',
      code: `# I — 判断是否有环 O(n)时间 O(1)空间
class Solution:
    def hasCycle(self, head: ListNode) -> bool:
        slow = fast = head
        while fast and fast.next:   # fast每次走两步，需检查fast.next是否存在
            slow = slow.next        # 慢指针走一步
            fast = fast.next.next   # 快指针走两步
            if slow == fast:        # 相遇 = 有环
                return True
        return False               # fast走到None = 无环


# II — 找环入口 O(n)时间 O(1)空间
class Solution:
    def detectCycle(self, head: ListNode) -> ListNode:
        slow = fast = head
        # 第一步：判断是否有环，同时找到相遇点
        while fast and fast.next:
            slow = slow.next
            fast = fast.next.next
            if slow == fast:        # 相遇
                # 第二步：找环入口
                slow = head         # slow回到起点
                while slow != fast: # 两人同步走，再次相遇即入口
                    slow = slow.next
                    fast = fast.next
                return slow
        return None                 # 无环`
    },
    { id:5, num:146, title:'LRU 缓存', diff:'medium', cat:'链表', tags:'哈希表,双向链表', link:'https://leetcode.cn/problems/lru-cache/',
      desc:'设计LRU缓存。get(key)获取值（不存在返回-1），put(key,value)插入或更新。容量满时淘汰最久未使用的。O(1)时间。',
      thought:'【数据结构选择】哈希表(dict)实现O(1)查找；双向链表维护访问顺序，实现O(1)的节点移动和删除。\n\n【关键设计】1. 虚拟头节点(dummy head)和虚拟尾节点(dummy tail)简化边界处理；2. 每次get/put将节点移到链表头部（标记为"最近使用"）；3. put时若容量超限，删除链表尾部节点（最久未使用）。\n\n【Python实现技巧】可以直接用collections.OrderedDict，但面试通常要求手写双向链表。',
      code: `class ListNode:
    """双向链表节点"""
    def __init__(self, key=0, val=0):
        self.key = key
        self.val = val
        self.prev = None
        self.next = None


class LRUCache:
    def __init__(self, capacity: int):
        self.cap = capacity
        self.cache = {}           # key -> ListNode 的映射
        # 虚拟头尾节点 — 始终在两端，简化边界逻辑
        self.head = ListNode()    # 头部 = 最近使用
        self.tail = ListNode()    # 尾部 = 最久未使用
        self.head.next = self.tail
        self.tail.prev = self.head

    def _remove(self, node: ListNode):
        """从双向链表中删除node（O(1)）"""
        node.prev.next = node.next
        node.next.prev = node.prev

    def _add_to_head(self, node: ListNode):
        """将node插入到头部（O(1)）"""
        node.next = self.head.next
        node.prev = self.head
        self.head.next.prev = node
        self.head.next = node

    def _move_to_head(self, node: ListNode):
        """将已存在的node移到头部（O(1)）"""
        self._remove(node)
        self._add_to_head(node)

    def get(self, key: int) -> int:
        if key not in self.cache:
            return -1
        node = self.cache[key]
        self._move_to_head(node)  # 标记为最近使用
        return node.val

    def put(self, key: int, value: int) -> None:
        if key in self.cache:
            # key已存在 — 更新值并移到头部
            node = self.cache[key]
            node.val = value
            self._move_to_head(node)
        else:
            # key不存在 — 创建新节点
            node = ListNode(key, value)
            self.cache[key] = node
            self._add_to_head(node)
            # 容量超限 — 删除尾部（最久未使用）
            if len(self.cache) > self.cap:
                removed = self.tail.prev   # 尾部前一个节点即最久未使用
                self._remove(removed)
                del self.cache[removed.key]`
    },
    // ========== 二叉树 ==========
    { id:6, num:236, title:'二叉树的最近公共祖先', diff:'medium', cat:'二叉树', tags:'后序递归', link:'https://leetcode.cn/problems/lowest-common-ancestor-of-a-binary-tree/',
      desc:'给定一个二叉树, 找到该树中两个指定节点的最近公共祖先（LCA）。',
      thought:'【后序遍历（自底向上）】核心逻辑：1. 若root是p或q，直接返回root（找到了一个目标）；2. 递归左右子树，若左右都返回非空→当前root就是LCA；3. 若只有一边返回非空→继续向上传递该结果。\n\n【为什么正确】后序遍历保证"先处理子树再处理根"。当左右各找到一个目标节点时，当前节点就是两个目标节点在树中的"分叉点"即LCA。\n\n【扩展】若是BST，可利用BST的有序性质：LCA的值一定在p.val和q.val之间，只需一次遍历。',
      code: `class Solution:
    def lowestCommonAncestor(self, root: 'TreeNode', p: 'TreeNode', q: 'TreeNode') -> 'TreeNode':
        # 递归终止条件
        if not root or root == p or root == q:
            return root

        # 后序遍历：先递归左右子树
        left = self.lowestCommonAncestor(root.left, p, q)
        right = self.lowestCommonAncestor(root.right, p, q)

        # 左右各找到一个 → 当前root就是LCA
        if left and right:
            return root

        # 只有一边找到 → 向上传递
        return left if left else right
        # 两边都没找到 → 返回None（隐式）`
    },
    { id:7, num:124, title:'二叉树中的最大路径和', diff:'hard', cat:'二叉树', tags:'后序DFS', link:'https://leetcode.cn/problems/binary-tree-maximum-path-sum/',
      desc:'路径定义为从任意节点出发沿父子连接到达任意节点的序列，同一节点最多出现一次。路径至少包含一个节点。求最大路径和。',
      thought:'【后序DFS + 全局变量】每个节点计算两个值：1."单边最大贡献"=root.val + max(0, left_gain, right_gain)，即从该节点出发向下的一条不折返路径的最大和（用于向上传递）；2."经过该节点的最大路径"=root.val + max(0,left_gain) + max(0,right_gain)，即左右都走的折返路径（用于更新全局最大值）。\n\n【关键】单边贡献只选左或右中较大的（不能分叉），但全局最大值可以同时包含左右（路径可以在这里拐弯）。\n\n【初始化全局最大为负无穷】因为节点值可能全为负数，需要正确处理。',
      code: `class Solution:
    def maxPathSum(self, root: TreeNode) -> int:
        self.max_sum = float('-inf')  # 全局最大，初始化为负无穷

        def dfs(node):
            """返回以node为起点向下的一条不折返路径的最大和"""
            if not node:
                return 0

            # 递归左右子树 — 如果贡献为负则舍去（取0）
            left_gain = max(0, dfs(node.left))
            right_gain = max(0, dfs(node.right))

            # 经过node的折返路径（左右都走）— 更新全局最大值
            cur_path_sum = node.val + left_gain + right_gain
            self.max_sum = max(self.max_sum, cur_path_sum)

            # 返回单边最大贡献（供上层使用，不能折返）
            return node.val + max(left_gain, right_gain)

        dfs(root)
        return self.max_sum`
    },
    { id:8, num:102, title:'二叉树的层序遍历', diff:'medium', cat:'二叉树', tags:'BFS', link:'https://leetcode.cn/problems/binary-tree-level-order-traversal/',
      desc:'返回二叉树的层序遍历结果（按层输出二维数组）。',
      thought:'【BFS模板题】用队列(deque)逐层处理。关键技巧：每次处理一层前记录当前队列长度level_size，循环level_size次取出该层所有节点，同时把它们的子节点入队。\n\n【Python技巧】用collections.deque实现O(1)的popleft。也可以用list+pop(0)但时间复杂度O(n)。',
      code: `from collections import deque

class Solution:
    def levelOrder(self, root: TreeNode) -> List[List[int]]:
        if not root:
            return []

        result = []
        queue = deque([root])   # 初始化队列

        while queue:
            level_size = len(queue)  # 当前层的节点数
            level = []               # 存储当前层的值

            for _ in range(level_size):
                node = queue.popleft()   # 队首出队 O(1)
                level.append(node.val)
                # 子节点入队
                if node.left:
                    queue.append(node.left)
                if node.right:
                    queue.append(node.right)

            result.append(level)

        return result`
    },
    { id:9, num:110, title:'平衡二叉树', diff:'easy', cat:'二叉树', tags:'自底向上', link:'https://leetcode.cn/problems/balanced-binary-tree/',
      desc:'判断二叉树是否是高度平衡的（每个节点的左右子树高度差绝对值不超过1）。',
      thought:'【自底向上求高度】递归同时做两件事：1.计算当前节点的高度（如果平衡）；2.判断是否平衡（如果不平衡则返回-1标记）。\n\n【为什么不用自顶向下】自顶向下会重复计算子树高度（每个节点被遍历多次），O(n²)。自底向上每个节点只访问一次，O(n)。\n\n【返回值设计】若子树平衡返回其高度，若不平衡返回-1。这样父节点看到-1就知道已经不平衡了，直接向上传递。',
      code: `class Solution:
    def isBalanced(self, root: TreeNode) -> bool:
        def height(node):
            """若平衡返回高度，不平衡返回-1"""
            if not node:
                return 0

            left_h = height(node.left)
            if left_h == -1:       # 左子树已经不平衡
                return -1

            right_h = height(node.right)
            if right_h == -1:      # 右子树已经不平衡
                return -1

            if abs(left_h - right_h) > 1:  # 当前节点不平衡
                return -1

            return max(left_h, right_h) + 1  # 返回高度

        return height(root) != -1`
    },
    { id:10, num:297, title:'二叉树的序列化与反序列化', diff:'hard', cat:'二叉树', tags:'BFS,DFS', link:'https://leetcode.cn/problems/serialize-and-deserialize-binary-tree/',
      desc:'设计算法序列化和反序列化二叉树。不限制序列化格式。',
      thought:'【BFS层序法】序列化：用队列层序遍历，空节点输出"null"。反序列化：同样用队列逐层构建。第一个元素是根，然后每两个元素是一对左右子节点。\n\n【关键细节】1.序列化后去掉末尾多余的null（优化输出长度）；2.反序列化时用索引i遍历数组，每处理一个节点i+2（取左右子节点）。\n\n【DFS前序法】更简洁——递归序列化，遇到None输出特殊标记；反序列化用迭代器逐个消费。',
      code: `from collections import deque

class Codec:
    def serialize(self, root):
        """BFS层序 → 字符串 "[1,2,3,null,null,4,5]" """
        if not root:
            return "[]"

        result = []
        queue = deque([root])

        while queue:
            node = queue.popleft()
            if node:
                result.append(str(node.val))
                queue.append(node.left)   # 即使是None也入队
                queue.append(node.right)
            else:
                result.append("null")

        # 去掉末尾多余的null
        while result and result[-1] == "null":
            result.pop()

        return "[" + ",".join(result) + "]"

    def deserialize(self, data):
        """字符串 → 二叉树"""
        vals = data[1:-1]  # 去掉首尾的[]
        if not vals:
            return None

        nodes = vals.split(",")
        root = TreeNode(int(nodes[0]))
        queue = deque([root])
        i = 1  # 从第二个元素开始

        while queue and i < len(nodes):
            node = queue.popleft()

            # 左子节点
            if i < len(nodes) and nodes[i] != "null":
                node.left = TreeNode(int(nodes[i]))
                queue.append(node.left)
            i += 1

            # 右子节点
            if i < len(nodes) and nodes[i] != "null":
                node.right = TreeNode(int(nodes[i]))
                queue.append(node.right)
            i += 1

        return root`
    },
    // ========== 动态规划 ==========
    { id:11, num:121, title:'买卖股票的最佳时机', diff:'easy', cat:'动态规划', tags:'贪心,DP', link:'https://leetcode.cn/problems/best-time-to-buy-and-sell-stock/',
      desc:'给定数组prices表示每天股价。只能买卖一次，求最大利润。',
      thought:'【贪心（最优）】遍历过程中维护两个变量：1.min_price = 到当前为止的最低价格；2.max_profit = 当天卖出的利润（price - min_price）的最大值。一次遍历O(n)时间O(1)空间。\n\n【DP视角】dp[i] = 前i天的最大利润 = max(dp[i-1], prices[i]-min_price)。本质上和贪心等价，只是多了DP数组的空间。\n\n【为什么贪心正确】因为只能买卖一次，最佳策略就是在历史最低点买入，在之后的最高点卖出。',
      code: `class Solution:
    def maxProfit(self, prices: List[int]) -> int:
        min_price = float('inf')  # 到当前为止的最低价格
        max_profit = 0            # 最大利润

        for price in prices:
            # 更新最低买入价
            min_price = min(min_price, price)
            # 计算当天卖出的利润，更新最大值
            max_profit = max(max_profit, price - min_price)

        return max_profit`
    },
    { id:12, num:300, title:'最长递增子序列', diff:'medium', cat:'动态规划', tags:'DP,贪心二分', link:'https://leetcode.cn/problems/longest-increasing-subsequence/',
      desc:'求数组中最长严格递增子序列的长度（子序列不要求连续）。',
      thought:'【解法1 — DP O(n²)】dp[i] = 以nums[i]结尾的LIS长度。遍历j<i, 若nums[j]<nums[i]则dp[i]=max(dp[i], dp[j]+1)。\n\n【解法2 — 贪心+二分 O(nlogn)（最优）】维护tails数组，tails[k]表示长度为k+1的递增子序列的最小末尾元素。遍历nums：若num>tails[-1]则追加；否则二分查找tails中第一个>=num的位置并替换。最终tails的长度即LIS长度。\n\n【贪心二分的直觉】我们希望递增子序列的末尾尽可能小，这样后面才有更多机会扩展。替换操作相当于"虽然目前这个长度的子序列末尾大了点，但我找到了更小的末尾"。',
      code: `# 贪心+二分 O(nlogn)（面试推荐）
import bisect

class Solution:
    def lengthOfLIS(self, nums: List[int]) -> int:
        tails = []  # tails[k] = 长度为k+1的子序列的最小末尾

        for num in nums:
            # 二分查找 tails 中第一个 >= num 的位置
            idx = bisect.bisect_left(tails, num)

            if idx == len(tails):
                # num比所有tails都大，可以扩展LIS
                tails.append(num)
            else:
                # 替换：用更小的值作为该长度子序列的末尾
                tails[idx] = num

        return len(tails)


# DP O(n²)（基础版本，理解用）
class Solution:
    def lengthOfLIS(self, nums: List[int]) -> int:
        n = len(nums)
        dp = [1] * n  # dp[i] = 以nums[i]结尾的LIS长度

        for i in range(n):
            for j in range(i):
                if nums[j] < nums[i]:
                    dp[i] = max(dp[i], dp[j] + 1)

        return max(dp)`
    },
    { id:13, num:322, title:'零钱兑换', diff:'medium', cat:'动态规划', tags:'完全背包', link:'https://leetcode.cn/problems/coin-change/',
      desc:'给定不同面额硬币coins和总金额amount，计算凑成总金额的最少硬币数。无法凑出返回-1。',
      thought:'【完全背包DP】dp[i] = 凑成金额i所需的最少硬币数。初始dp[0]=0，其余为float(\'inf\')。\n\n外层遍历每种硬币coin，内层遍历金额i从coin到amount：dp[i] = min(dp[i], dp[i-coin] + 1)。\n\n【为什么内层正序】因为每种硬币可以无限使用（完全背包），正序遍历允许同一硬币被多次使用。若只能使用一次（01背包），则内层需要倒序。\n\n【无法凑出判断】最终dp[amount]若仍为inf，说明无法凑出，返回-1。',
      code: `class Solution:
    def coinChange(self, coins: List[int], amount: int) -> int:
        # dp[i] = 凑成金额 i 所需的最少硬币数
        dp = [float('inf')] * (amount + 1)
        dp[0] = 0  # 金额0需要0个硬币

        for coin in coins:                    # 遍历每种硬币
            for i in range(coin, amount + 1): # 完全背包：正序遍历
                dp[i] = min(dp[i], dp[i - coin] + 1)

        return dp[amount] if dp[amount] != float('inf') else -1`
    },
    { id:14, num:72, title:'编辑距离', diff:'medium', cat:'动态规划', tags:'二维DP', link:'https://leetcode.cn/problems/edit-distance/',
      desc:'给定两个单词word1和word2，求将word1转换成word2的最少操作数（插入/删除/替换）。',
      thought:'【经典二维DP】dp[i][j] = word1前i个字符转成word2前j个字符的最小编辑距离。\n\n状态转移：\n- 若word1[i-1]==word2[j-1]：dp[i][j]=dp[i-1][j-1]（无需操作）\n- 否则：dp[i][j]=1+min(插入,删除,替换)\n  - 插入：dp[i][j-1]（在word1[i]后插入，匹配word2[j]）\n  - 删除：dp[i-1][j]（删除word1[i]）\n  - 替换：dp[i-1][j-1]（替换word1[i]为word2[j]）\n\n初始化：dp[i][0]=i（全部删除），dp[0][j]=j（全部插入）。',
      code: `class Solution:
    def minDistance(self, word1: str, word2: str) -> int:
        m, n = len(word1), len(word2)
        # dp[i][j] = word1[:i] → word2[:j] 的最小编辑距离
        dp = [[0] * (n + 1) for _ in range(m + 1)]

        # 初始化：一个串为空时，只能全插入/全删除
        for i in range(m + 1):
            dp[i][0] = i  # word1[:i] → "" 需要i次删除
        for j in range(n + 1):
            dp[0][j] = j  # "" → word2[:j] 需要j次插入

        # 状态转移
        for i in range(1, m + 1):
            for j in range(1, n + 1):
                if word1[i-1] == word2[j-1]:
                    # 字符相同，无需操作
                    dp[i][j] = dp[i-1][j-1]
                else:
                    # 三种操作取最小 + 1
                    dp[i][j] = 1 + min(
                        dp[i-1][j],    # 删除 word1[i-1]
                        dp[i][j-1],    # 插入 word2[j-1]
                        dp[i-1][j-1]   # 替换 word1[i-1] → word2[j-1]
                    )

        return dp[m][n]`
    },
    { id:15, num:53, title:'最大子数组和', diff:'medium', cat:'动态规划', tags:'Kadane', link:'https://leetcode.cn/problems/maximum-subarray/',
      desc:'给定整数数组，求具有最大和的连续子数组，返回其最大和。',
      thought:'【Kadane算法 O(n) O(1)】核心思想：以每个位置结尾的最大子数组和，要么"延续前面的子数组"，要么"重新开始"。\n\ndp[i]定义：以nums[i]结尾的最大子数组和。\n转移：dp[i] = max(nums[i], dp[i-1]+nums[i])\n即：要么自己单独成段，要么接上前面的最大和。\n\n空间优化：只需要cur变量维护dp[i-1]，不需要整个dp数组。\n\n【理解关键】"前面的累积和如果是负数，那还不如不要"。',
      code: `class Solution:
    def maxSubArray(self, nums: List[int]) -> int:
        cur_sum = nums[0]   # 以当前位置结尾的最大和
        max_sum = nums[0]   # 全局最大和

        for i in range(1, len(nums)):
            # 要么接上前面，要么重新开始
            cur_sum = max(nums[i], cur_sum + nums[i])
            max_sum = max(max_sum, cur_sum)

        return max_sum`
    },
    { id:16, num:152, title:'乘积最大子数组', diff:'medium', cat:'动态规划', tags:'最大最小', link:'https://leetcode.cn/problems/maximum-product-subarray/',
      desc:'给定整数数组，求乘积最大的连续子数组的乘积。',
      thought:'【与LC53的区别】乘积有"负数反转"特性——一个很大的负数乘以另一个负数可能变成很大的正数。因此需要同时维护"以当前位置结尾的最大乘积"和"最小乘积"。\n\n转移：\n- cur_max = max(num, cur_max*num, cur_min*num)\n- cur_min = min(num, cur_max*num, cur_min*num)\n\n技巧：遇到负数时先交换cur_max和cur_min，因为负数会让最大值变最小值，反之亦然。',
      code: `class Solution:
    def maxProduct(self, nums: List[int]) -> int:
        cur_max = cur_min = ans = nums[0]

        for i in range(1, len(nums)):
            num = nums[i]
            # 遇到负数，最大变最小
            if num < 0:
                cur_max, cur_min = cur_min, cur_max

            # 更新
            cur_max = max(num, cur_max * num)
            cur_min = min(num, cur_min * num)
            ans = max(ans, cur_max)

        return ans`
    },
    { id:17, num:139, title:'单词拆分', diff:'medium', cat:'动态规划', tags:'DP,哈希', link:'https://leetcode.cn/problems/word-break/',
      desc:'给定字符串s和字典wordDict，判断能否用字典中的单词拼接出s（单词可重复使用）。',
      thought:'【区间DP】dp[i]表示s[0:i]能否被拆分。初始化dp[0]=True（空前缀可拆分）。\n\n对于每个位置i，遍历j∈[0,i)，若dp[j]为True且s[j:i]在字典中，则dp[i]=True并break。\n\n【优化1】内层j从i-1往前遍历到max(0, i-max_len)，其中max_len是字典中最长单词的长度。\n\n【优化2】用set存储字典实现O(1)查找。',
      code: `class Solution:
    def wordBreak(self, s: str, wordDict: List[str]) -> bool:
        word_set = set(wordDict)       # O(1)查找
        max_len = max((len(w) for w in word_set), default=0)  # 最长单词长度
        n = len(s)
        dp = [False] * (n + 1)
        dp[0] = True  # 空前缀可拆分

        for i in range(1, n + 1):
            # j从i-1往前，但不超过max_len（优化）
            start = max(0, i - max_len)
            for j in range(i - 1, start - 1, -1):
                if dp[j] and s[j:i] in word_set:
                    dp[i] = True
                    break  # 找到一种拆分即可

        return dp[n]`
    },
    // ========== 双指针/滑动窗口 ==========
    { id:18, num:3, title:'无重复字符的最长子串', diff:'medium', cat:'双指针', tags:'滑动窗口', link:'https://leetcode.cn/problems/longest-substring-without-repeating-characters/',
      desc:'给定字符串s，找出不含重复字符的最长子串的长度。',
      thought:'【滑动窗口】维护窗口[left, right]内的字符不重复。右指针right不断右移扩展窗口，用哈希表记录每个字符最后出现的位置。当遇到重复字符时，左指针left跳到重复字符的下一个位置（即left = max(left, map[char]+1)）。窗口长度=right-left+1。\n\n【时间复杂度】O(n)，每个字符被访问两次（left和right各一次）。\n\n【为什么是max(left, ...)】left不能回退——如果重复字符出现在当前left的左边，不能把left往回拉。',
      code: `class Solution:
    def lengthOfLongestSubstring(self, s: str) -> int:
        # char_map记录每个字符最后出现的位置
        char_map = {}
        left = 0          # 窗口左边界
        max_len = 0       # 最长无重复子串长度

        for right, ch in enumerate(s):
            # 如果ch在窗口内出现过，left跳到重复字符的下一个位置
            if ch in char_map:
                left = max(left, char_map[ch] + 1)

            # 更新ch的最新位置
            char_map[ch] = right

            # 更新最大长度
            max_len = max(max_len, right - left + 1)

        return max_len`
    },
    { id:19, num:15, title:'三数之和', diff:'medium', cat:'双指针', tags:'排序,去重', link:'https://leetcode.cn/problems/3sum/',
      desc:'判断是否存在三元组和为0，返回所有不重复的三元组。',
      thought:'【排序+双指针】先把数组排序。固定第一个数nums[i]，问题转化为在i右侧找两数之和=-nums[i]（即LC167两数之和II）。\n\n【去重是关键】1.外层：若nums[i]==nums[i-1]则跳过（避免固定重复的第一个数）；2.内层：找到一组解后，左右指针跳过所有重复值。\n\n【剪枝】若nums[i]>0，由于数组已排序，i右侧都是正数，不可能和为0，直接break。',
      code: `class Solution:
    def threeSum(self, nums: List[int]) -> List[List[int]]:
        nums.sort()  # 排序是双指针的前提
        n = len(nums)
        result = []

        for i in range(n - 2):
            # 剪枝：最小的数都>0，不可能和为0
            if nums[i] > 0:
                break
            # 去重：跳过重复的第一个数
            if i > 0 and nums[i] == nums[i - 1]:
                continue

            left, right = i + 1, n - 1
            while left < right:
                total = nums[i] + nums[left] + nums[right]

                if total == 0:
                    result.append([nums[i], nums[left], nums[right]])
                    # 去重：跳过重复的left和right
                    while left < right and nums[left] == nums[left + 1]:
                        left += 1
                    while left < right and nums[right] == nums[right - 1]:
                        right -= 1
                    left += 1
                    right -= 1
                elif total < 0:
                    left += 1   # 和太小，left右移增大
                else:
                    right -= 1  # 和太大，right左移减小

        return result`
    },
    { id:20, num:42, title:'接雨水', diff:'hard', cat:'双指针', tags:'双指针,单调栈', link:'https://leetcode.cn/problems/trapping-rain-water/',
      desc:'给定柱子高度数组height，计算下雨后能接多少雨水。',
      thought:'【双指针法（最优）O(n) O(1)】核心公式：每个位置的雨水量 = min(左边最高, 右边最高) - 当前高度。\n\n用leftMax和rightMax分别记录左右两边的最大高度。哪边的max小就移动哪边的指针：\n- 若leftMax < rightMax：处理left位置（因为左边是短板），雨水量=leftMax-height[left]，left++\n- 否则：处理right位置，雨水量=rightMax-height[right]，right--\n\n【为什么正确】一个位置的雨水量由较短的挡板决定。我们总是处理较短挡板那一侧，因为较长挡板不会限制该侧的蓄水量。\n\n【单调栈法】也可用递减栈，遇到比栈顶高的柱子就弹栈计算水量，但空间O(n)且不易理解。',
      code: `class Solution:
    def trap(self, height: List[int]) -> int:
        if not height:
            return 0

        left, right = 0, len(height) - 1
        left_max = right_max = 0  # 左右两侧的最高柱子
        water = 0

        while left < right:
            # 更新左右最高
            left_max = max(left_max, height[left])
            right_max = max(right_max, height[right])

            # 哪边是短板就处理哪边
            if left_max < right_max:
                # 左边是短板：left处的雨水量 = left_max - height[left]
                water += left_max - height[left]
                left += 1
            else:
                # 右边是短板：right处的雨水量 = right_max - height[right]
                water += right_max - height[right]
                right -= 1

        return water`
    },
    { id:21, num:88, title:'合并两个有序数组', diff:'easy', cat:'双指针', tags:'逆序双指针', link:'https://leetcode.cn/problems/merge-sorted-array/',
      desc:'nums1长度为m+n，前m个元素有序。nums2长度为n且有序。原地合并到nums1中。',
      thought:'【逆序双指针】从nums1的末尾(m+n-1)开始向前填充，避免覆盖nums1中尚未处理的元素。\n\np指向填充位置，p1指向nums1[m-1]，p2指向nums2[n-1]。每次取max(nums1[p1], nums2[p2])放入p位置。\n\n【为什么逆序】如果正序填充，nums1中的元素可能在合并过程中被覆盖。逆序保证不会覆盖尚未处理的元素。',
      code: `class Solution:
    def merge(self, nums1: List[int], m: int, nums2: List[int], n: int) -> None:
        """
        原地合并，不要返回任何值
        """
        # 从末尾开始填充
        p = m + n - 1      # nums1的填充位置
        p1 = m - 1         # nums1有效元素的末尾
        p2 = n - 1         # nums2的末尾

        # 只要nums2还有元素需要合并
        while p2 >= 0:
            if p1 >= 0 and nums1[p1] > nums2[p2]:
                nums1[p] = nums1[p1]  # nums1的元素更大
                p1 -= 1
            else:
                nums1[p] = nums2[p2]  # nums2的元素更大
                p2 -= 1
            p -= 1`
    },
    { id:22, num:5, title:'最长回文子串', diff:'medium', cat:'双指针', tags:'中心扩散,DP', link:'https://leetcode.cn/problems/longest-palindromic-substring/',
      desc:'给定字符串s，找到其中最长的回文子串。',
      thought:'【中心扩散法 O(n²) O(1)】每个字符（和每两个字符之间）作为回文中心，向两边扩展直到不再是回文。奇数长度回文中心是单个字符，偶数长度回文中心是两个字符之间。共2n-1个中心。\n\n【DP法 O(n²) O(n²)】dp[i][j]表示s[i:j+1]是否回文。dp[i][j] = (s[i]==s[j]) and dp[i+1][j-1]。但空间复杂度和实现复杂度都高于中心扩散。\n\n【Manacher算法 O(n)】面试几乎不要求，了解即可。',
      code: `class Solution:
    def longestPalindrome(self, s: str) -> str:
        n = len(s)
        start = 0     # 最长回文子串的起始位置
        max_len = 0   # 最长回文子串的长度

        def expand_around_center(left: int, right: int) -> int:
            """从中心向两边扩展，返回回文长度"""
            while left >= 0 and right < n and s[left] == s[right]:
                left -= 1
                right += 1
            # 退出循环时 left 和 right 已经多走了一步
            return right - left - 1

        for i in range(n):
            # 奇数长度回文（中心是单个字符）
            len1 = expand_around_center(i, i)
            # 偶数长度回文（中心是两个字符之间）
            len2 = expand_around_center(i, i + 1)

            cur_max = max(len1, len2)
            if cur_max > max_len:
                max_len = cur_max
                # 从中心位置反推起始位置
                start = i - (cur_max - 1) // 2

        return s[start:start + max_len]`
    },
    // ========== 二分查找 ==========
    { id:23, num:33, title:'搜索旋转排序数组', diff:'medium', cat:'二分', tags:'二分变体', link:'https://leetcode.cn/problems/search-in-rotated-sorted-array/',
      desc:'升序数组在某点旋转，给定target返回下标（不存在返回-1）。O(logn)。',
      thought:'【二分变体】每次取mid，关键判断"哪半边是有序的"：\n- 若nums[l] <= nums[mid] → 左半有序。此时若target在[nums[l], nums[mid])内→搜左半；否则搜右半。\n- 否则 → 右半有序。若target在(nums[mid], nums[r]]内→搜右半；否则搜左半。\n\n【注意】nums[l] <= nums[mid]的等号处理——当l==mid时（只有两个元素的特殊情况）。\n\n【复杂度】O(logn)时间 O(1)空间。字节面试极高频题。',
      code: `class Solution:
    def search(self, nums: List[int], target: int) -> int:
        l, r = 0, len(nums) - 1

        while l <= r:
            mid = (l + r) // 2

            if nums[mid] == target:
                return mid

            # 判断哪半边有序
            if nums[l] <= nums[mid]:  # 左半有序
                if nums[l] <= target < nums[mid]:
                    r = mid - 1       # target在左半
                else:
                    l = mid + 1       # target在右半
            else:                      # 右半有序
                if nums[mid] < target <= nums[r]:
                    l = mid + 1       # target在右半
                else:
                    r = mid - 1       # target在左半

        return -1`
    },
    { id:24, num:34, title:'在排序数组中查找元素的第一个和最后一个位置', diff:'medium', cat:'二分', tags:'二分边界', link:'https://leetcode.cn/problems/find-first-and-last-position-of-element-in-sorted-array/',
      desc:'在升序数组nums中找target的开始和结束位置。O(logn)。',
      thought:'【两次二分】1.找左边界即第一个>=target的位置；2.找右边界即第一个>target的位置-1。\n\n【二分边界模板】找第一个>=target：while l < r，mid=(l+r)//2，若nums[mid]>=target则r=mid，否则l=mid+1。最终l=r=第一个满足条件的位置。\n\n【为什么用<而非<=】while l<r 保证退出时l==r，避免了死循环。当r=mid时不会丢解（mid可能是答案）。',
      code: `class Solution:
    def searchRange(self, nums: List[int], target: int) -> List[int]:
        def find_first(nums, target):
            """找第一个 >= target 的位置"""
            l, r = 0, len(nums)
            while l < r:
                mid = (l + r) // 2
                if nums[mid] >= target:
                    r = mid        # mid可能是答案，保留
                else:
                    l = mid + 1    # mid不可能是答案
            return l  # 返回第一个 >= target 的位置

        left = find_first(nums, target)
        # 检查是否真的找到了target
        if left == len(nums) or nums[left] != target:
            return [-1, -1]

        # 右边界 = 第一个 > target 的位置 - 1
        right = find_first(nums, target + 1) - 1
        return [left, right]`
    },
    { id:25, num:69, title:'x 的平方根', diff:'easy', cat:'二分', tags:'二分,牛顿', link:'https://leetcode.cn/problems/sqrtx/',
      desc:'计算x的算术平方根，只保留整数部分。',
      thought:'【二分查找 O(logx)】在[0, x]中二分查找最大的mid满足mid²<=x。注意mid*mid可能溢出（Python不用担心，但其他语言需要用long）。\n\n【牛顿迭代 O(logx) 收敛极快】公式：x_{n+1} = (x_n + a/x_n) / 2。从x开始迭代，直到x_n² <= a。收敛速度是指数级的。',
      code: `# 二分查找
class Solution:
    def mySqrt(self, x: int) -> int:
        l, r = 0, x
        ans = 0
        while l <= r:
            mid = (l + r) // 2
            if mid * mid <= x:
                ans = mid      # 记录当前满足条件的最大值
                l = mid + 1    # 尝试更大的
            else:
                r = mid - 1    # mid太大
        return ans


# 牛顿迭代（更优雅）
class Solution:
    def mySqrt(self, x: int) -> int:
        if x == 0:
            return 0
        cur = x
        while True:
            nxt = (cur + x / cur) / 2  # 牛顿迭代公式
            if abs(cur - nxt) < 1e-7:  # 收敛判断
                return int(nxt)
            cur = nxt`
    },
    // ========== 栈/堆/设计 ==========
    { id:26, num:20, title:'有效的括号', diff:'easy', cat:'栈', tags:'栈基础', link:'https://leetcode.cn/problems/valid-parentheses/',
      desc:'判断只包含()[]{}的字符串是否有效。左括号必须用同类型右括号闭合，且顺序正确。',
      thought:'【栈经典题】遍历字符串：遇到左括号→入栈；遇到右括号→检查栈顶是否匹配。最后栈空则有效。\n\n【Python技巧】用字典存右括号→左括号的映射，遇到右括号时pop栈顶比较。若栈已空（右括号多余左括号）或栈顶不匹配→返回False。',
      code: `class Solution:
    def isValid(self, s: str) -> bool:
        stack = []
        # 右括号 → 左括号 的映射
        mapping = {')': '(', '}': '{', ']': '['}

        for ch in s:
            if ch not in mapping:
                # 左括号 → 入栈
                stack.append(ch)
            else:
                # 右括号 → 检查栈顶是否匹配
                if not stack or stack.pop() != mapping[ch]:
                    return False

        # 栈为空说明所有括号都匹配
        return len(stack) == 0`
    },
    { id:27, num:215, title:'数组中的第K个最大元素', diff:'medium', cat:'栈/堆', tags:'快速选择,堆', link:'https://leetcode.cn/problems/kth-largest-element-in-an-array/',
      desc:'返回数组中第k个最大的元素（不是第k个不同的元素）。',
      thought:'【解法1 — 快速选择 O(n)平均】基于快排partition。每次选择pivot，partition后pivot的位置就是它在排序中的正确位置。若pivot位置恰好是n-k，则返回。否则根据位置大小递归左半或右半。\n\n【解法2 — 小根堆 O(nlogk)】维护大小为k的小根堆，堆顶即第k大。Python的heapq是最小堆。\n\n【选择建议】快速选择O(n)但最坏O(n²)；堆法稳定O(nlogk)但面试写快速选择更能展示对快排的理解。',
      code: `# 快速选择 O(n)平均（面试推荐）
import random

class Solution:
    def findKthLargest(self, nums: List[int], k: int) -> int:
        target = len(nums) - k  # 第k大 = 排序后下标为 n-k

        def quick_select(l: int, r: int) -> int:
            # 随机选择pivot（避免最坏情况）
            pivot_idx = random.randint(l, r)
            nums[pivot_idx], nums[r] = nums[r], nums[pivot_idx]

            pivot = nums[r]
            p = l  # p指向"下一个小元素应该放的位置"

            for i in range(l, r):
                if nums[i] <= pivot:
                    nums[i], nums[p] = nums[p], nums[i]
                    p += 1

            nums[p], nums[r] = nums[r], nums[p]  # pivot归位

            if p == target:
                return nums[p]
            elif p < target:
                return quick_select(p + 1, r)  # 目标在右边
            else:
                return quick_select(l, p - 1)  # 目标在左边

        return quick_select(0, len(nums) - 1)


# 小根堆 O(nlogk)（简洁但非最优）
import heapq

class Solution:
    def findKthLargest(self, nums: List[int], k: int) -> int:
        heap = []
        for num in nums:
            heapq.heappush(heap, num)
            if len(heap) > k:
                heapq.heappop(heap)  # 保持堆大小为k
        return heap[0]  # 堆顶即第k大`
    },
    { id:28, num:155, title:'最小栈', diff:'medium', cat:'栈', tags:'辅助栈', link:'https://leetcode.cn/problems/min-stack/',
      desc:'设计一个栈支持push/pop/top/getMin操作，getMin要求O(1)。',
      thought:'【辅助栈】用两个栈：主栈存数据，辅助栈(min_stack)存"当前栈状态下的最小值"。\n\npush(x)时：主栈直接压入；若x<=min_stack栈顶（或min_stack为空），则同时压入min_stack。\npop()时：主栈弹出；若弹出的值等于min_stack栈顶，则min_stack也弹出。\n\n【为什么是<=而非<】考虑压入重复最小值的情况：若用<，弹出第一个最小值后min_stack会错误地丢失该最小值。',
      code: `class MinStack:
    def __init__(self):
        self.stack = []      # 主栈
        self.min_stack = []  # 辅助栈 — 存"当前栈状态下的最小值"

    def push(self, val: int) -> None:
        self.stack.append(val)
        # 若辅助栈为空 或 val <= 当前最小值 → 压入辅助栈
        if not self.min_stack or val <= self.min_stack[-1]:
            self.min_stack.append(val)

    def pop(self) -> None:
        val = self.stack.pop()
        # 若弹出的值就是当前最小值 → 辅助栈同步弹出
        if val == self.min_stack[-1]:
            self.min_stack.pop()

    def top(self) -> int:
        return self.stack[-1]

    def getMin(self) -> int:
        return self.min_stack[-1]  # 辅助栈栈顶即当前最小值`
    },
    // ========== 图 / DFS / 回溯 ==========
    { id:29, num:200, title:'岛屿数量', diff:'medium', cat:'图/DFS', tags:'DFS,BFS', link:'https://leetcode.cn/problems/number-of-islands/',
      desc:'二维网格中1为陆地0为水，相邻陆地（水平/垂直）组成岛屿。求岛屿数量。',
      thought:'【DFS洪水填充】遍历每个格子，遇到1就岛屿计数+1，然后DFS递归地把相连的所有1标记为0（沉岛/访问过）。这样每个岛屿只被计数一次。\n\n【BFS也可】用队列实现，本质一样。DFS代码更简洁。\n\n【复杂度】O(mn)时间，每个格子最多被访问一次。DFS递归深度最坏O(mn)，可能导致栈溢出，此时可改用BFS。',
      code: `class Solution:
    def numIslands(self, grid: List[List[str]]) -> int:
        if not grid:
            return 0

        m, n = len(grid), len(grid[0])
        count = 0

        def dfs(i: int, j: int):
            """把(i,j)及其相连的所有陆地沉为水域"""
            # 越界或已经是水域 → 返回
            if i < 0 or i >= m or j < 0 or j >= n or grid[i][j] == '0':
                return

            grid[i][j] = '0'  # 沉岛（标记已访问）

            # 向四个方向递归
            dfs(i + 1, j)  # 下
            dfs(i - 1, j)  # 上
            dfs(i, j + 1)  # 右
            dfs(i, j - 1)  # 左

        for i in range(m):
            for j in range(n):
                if grid[i][j] == '1':
                    count += 1    # 发现新岛屿
                    dfs(i, j)     # 沉没整个岛屿

        return count`
    },
    { id:30, num:46, title:'全排列', diff:'medium', cat:'回溯', tags:'回溯模板', link:'https://leetcode.cn/problems/permutations/',
      desc:'给定不含重复数字的数组，返回所有可能的全排列。',
      thought:'【回溯模板题】回溯三要素：1.路径(path)：已选的数字列表；2.选择列表：还未选的数字（通过used数组标记）；3.终止条件：path长度==nums长度。\n\n【关键点】1.用used布尔数组标记已选元素，避免重复选择；2.递归进入下一层前做选择(path.append+used[i]=True)，递归返回后撤销选择(path.pop()+used[i]=False)；3.结果收集时需要path的拷贝(list(path)或path[:])。\n\n【复杂度】O(n*n!)时间（n!种排列，每种O(n)复制），O(n)递归栈空间。',
      code: `class Solution:
    def permute(self, nums: List[int]) -> List[List[int]]:
        result = []
        used = [False] * len(nums)  # 标记哪些数字已经被选

        def backtrack(path: List[int]):
            # 终止条件：已经选完所有数字
            if len(path) == len(nums):
                result.append(path[:])  # 拷贝当前路径
                return

            # 遍历所有选择
            for i in range(len(nums)):
                if used[i]:        # 已经选过的跳过
                    continue

                # 做选择
                path.append(nums[i])
                used[i] = True

                backtrack(path)    # 递归进入下一层

                # 撤销选择（回溯的精髓）
                path.pop()
                used[i] = False

        backtrack([])
        return result`
    }
  ];

  function getCodeKey(id) { return '_lc_code_' + id; }

  function renderNav(activeId) {
    const nav = document.getElementById('lc-nav');
    nav.innerHTML = '';
    problems.forEach(p => {
      const tag = document.createElement('span');
      tag.className = 'lc-tag lc-' + p.diff;
      if (p.id === activeId) tag.classList.add('active');
      tag.textContent = p.num + '. ' + p.title;
      tag.addEventListener('click', () => renderProblem(p.id));
      nav.appendChild(tag);
    });
  }

  function renderProblem(id) {
    renderNav(id);
    const p = problems.find(x => x.id === id);
    if (!p) return;
    const container = document.getElementById('lc-content');
    const savedCode = localStorage.getItem(getCodeKey(id)) || '';

    let html = '<div class="lc-problem">';
    html += '<h3>' + p.num + '. ' + p.title + '</h3>';
    html += '<div class="lc-meta">';
    html += '<span class="lc-difficulty ' + p.diff + '">' + DIFF[p.diff] + '</span>';
    html += '<span class="lc-tag-label">' + p.cat + '</span>';
    html += '<span class="lc-tag-label">' + p.tags + '</span>';
    html += '<a href="' + p.link + '" target="_blank" style="font-size:0.8rem;color:var(--blue);">LeetCode ↗</a>';
    html += '</div>';

    if (p.desc) {
      html += '<div class="cv-section"><div class="cv-section-title">题目描述</div><p>' + p.desc + '</p></div>';
      html += '<div class="cv-section"><div class="cv-section-title">解题思路</div><p style="white-space:pre-line">' + p.thought + '</p></div>';
      html += '<div class="cv-section"><div class="cv-section-title">代码</div>';
      const code = savedCode || p.code;
      if (Auth.isLoggedIn()) {
        html += '<div class="lc-code-block editable"><textarea id="lc-code-area" style="min-height:400px">' + code.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</textarea></div>';
        html += '<button class="lc-save-btn show" onclick="LeetCodeUI.save(' + id + ')">💾 保存</button>';
        html += '<button class="lc-sync-btn show" onclick="LeetCodeUI.syncToGitHub(' + id + ')">⬆ 同步到 GitHub</button>';
      } else {
        html += '<pre class="lc-code-block">' + code.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</pre>';
        html += '<p style="font-size:0.75rem;color:#999;">🔒 登录后可编辑代码并同步到 GitHub</p>';
      }
      html += '</div>';
    } else {
      html += '<div style="padding:30px;text-align:center;color:#ccc;"><p style="font-size:3rem;">📝</p><p>题解整理中，即将更新</p></div>';
    }

    html += '</div>';
    container.innerHTML = html;
  }

  function save(id) {
    const area = document.getElementById('lc-code-area');
    if (!area) return;
    localStorage.setItem(getCodeKey(id), area.value);
    alert('已保存到本地浏览器');
  }

  function syncToGitHub(id) {
    const area = document.getElementById('lc-code-area');
    if (!area) return;
    navigator.clipboard.writeText(area.value).then(() => {
      alert('代码已复制到剪贴板。请手动提交到 GitHub。');
    });
  }

  function init() {
    renderProblem(1);
  }

  return { init, save, syncToGitHub };
})();
