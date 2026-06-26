// 力扣题解 — 30题精刷
const LeetCodeUI = (() => {
  const DIFF = { easy:'🟢 简单', medium:'🟡 中等', hard:'🔴 困难' };
  const problems = [
    { id:1, num:206, title:'反转链表', diff:'easy', cat:'链表', tags:'迭代,递归', link:'https://leetcode.cn/problems/reverse-linked-list/',
      desc:'给你单链表的头节点 head，请你反转链表，并返回反转后的链表。',
      thought:'迭代：用 prev/curr/next 三指针逐个翻转指针方向，O(n)时间 O(1)空间。递归：递到最后一个节点作为新头，归时翻转 next 指针，O(n)时间 O(n)栈空间。两种解法都必须能手写。',
      code: `// 迭代
var reverseList = function(head) {
    let prev = null, curr = head;
    while (curr) {
        let next = curr.next;
        curr.next = prev;
        prev = curr;
        curr = next;
    }
    return prev;
};

// 递归
var reverseList = function(head) {
    if (!head || !head.next) return head;
    let newHead = reverseList(head.next);
    head.next.next = head;
    head.next = null;
    return newHead;
};`
    },
    { id:2, num:25, title:'K 个一组翻转链表', diff:'hard', cat:'链表', tags:'递归,迭代', link:'https://leetcode.cn/problems/reverse-nodes-in-k-group/',
      desc:'给你链表的头节点 head，每 k 个节点一组进行翻转，请你返回修改后的链表。如果节点总数不是 k 的整数倍，最后剩余的节点保持原有顺序。',
      thought:'先实现一个翻转区间 [a,b) 的子函数（与LC206完全相同）。然后遍历链表，每 k 个一组调用翻转，用递归或迭代连接各组。关键：翻转后 a 变成尾，需要连接下一组的头。O(n)时间 O(1)空间（迭代版）。字节面试必考题，必须闭眼写出。',
      code: `// 翻转区间 [a, b)
var reverse = function(a, b) {
    let prev = null, curr = a;
    while (curr !== b) {
        let next = curr.next;
        curr.next = prev;
        prev = curr;
        curr = next;
    }
    return prev;
};

var reverseKGroup = function(head, k) {
    if (!head) return null;
    let a = head, b = head;
    for (let i = 0; i < k; i++) {
        if (!b) return head; // 不足 k 个，不翻转
        b = b.next;
    }
    let newHead = reverse(a, b);
    a.next = reverseKGroup(b, k); // a 是翻转后的尾，连接下一组
    return newHead;
};`
    },
    { id:3, num:21, title:'合并两个有序链表', diff:'easy', cat:'链表', tags:'归并', link:'https://leetcode.cn/problems/merge-two-sorted-lists/',
      desc:'将两个升序链表合并为一个新的升序链表并返回。新链表是通过拼接给定的两个链表的所有节点组成的。',
      thought:'归并排序的合并阶段。用虚拟头节点 dummy，双指针分别遍历两个链表，每次取较小的节点接到结果链表上。最后把剩余的链表直接接上。O(m+n)时间 O(1)空间。',
      code: `var mergeTwoLists = function(l1, l2) {
    let dummy = new ListNode(-1), p = dummy;
    while (l1 && l2) {
        if (l1.val < l2.val) { p.next = l1; l1 = l1.next; }
        else { p.next = l2; l2 = l2.next; }
        p = p.next;
    }
    p.next = l1 || l2;
    return dummy.next;
};`
    },
    { id:4, num:141, title:'环形链表 I + II', diff:'medium', cat:'链表', tags:'快慢指针,Floyd', link:'https://leetcode.cn/problems/linked-list-cycle/',
      desc:'I: 判断链表是否有环。II: 若有环，返回环的入口节点。',
      thought:'Floyd 判圈算法（龟兔赛跑）：快指针每次走两步，慢指针走一步。若相遇则有环。找入口：相遇后，一个指针回到 head，两个指针同步每次走一步，再次相遇处就是环入口。数学证明：head 到入口 = 相遇点到入口。',
      code: `// I — 判断是否有环
var hasCycle = function(head) {
    let slow = head, fast = head;
    while (fast && fast.next) {
        slow = slow.next;
        fast = fast.next.next;
        if (slow === fast) return true;
    }
    return false;
};

// II — 找环入口
var detectCycle = function(head) {
    let slow = head, fast = head;
    while (fast && fast.next) {
        slow = slow.next;
        fast = fast.next.next;
        if (slow === fast) {
            slow = head;
            while (slow !== fast) { slow = slow.next; fast = fast.next; }
            return slow;
        }
    }
    return null;
};`
    },
    { id:5, num:146, title:'LRU 缓存', diff:'medium', cat:'链表', tags:'哈希表,双向链表', link:'https://leetcode.cn/problems/lru-cache/',
      desc:'设计一个 LRU (最近最少使用) 缓存。支持 get(key) 和 put(key, value) 操作，O(1) 时间复杂度。',
      thought:'哈希表 + 双向链表。哈希表实现 O(1) 查找，双向链表维护访问顺序。每次 get/put 将节点移到链表头部。put 时若超出容量，删除链表尾部节点。使用 dummy head 和 dummy tail 简化边界处理。',
      code: `var LRUCache = function(capacity) {
    this.cap = capacity;
    this.map = new Map();
    this.head = { next: null, prev: null };
    this.tail = { next: null, prev: null };
    this.head.next = this.tail;
    this.tail.prev = this.head;
};
LRUCache.prototype.get = function(key) {
    if (!this.map.has(key)) return -1;
    let node = this.map.get(key);
    this._remove(node);
    this._addToHead(node);
    return node.val;
};
LRUCache.prototype.put = function(key, value) {
    if (this.map.has(key)) this._remove(this.map.get(key));
    let node = { key, val: value };
    this._addToHead(node);
    this.map.set(key, node);
    if (this.map.size > this.cap) {
        let tail = this.tail.prev;
        this._remove(tail);
        this.map.delete(tail.key);
    }
};
LRUCache.prototype._remove = function(node) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
};
LRUCache.prototype._addToHead = function(node) {
    node.next = this.head.next;
    node.prev = this.head;
    this.head.next.prev = node;
    this.head.next = node;
};`
    },
    { id:6, num:236, title:'二叉树的最近公共祖先', diff:'medium', cat:'二叉树', tags:'后序递归', link:'https://leetcode.cn/problems/lowest-common-ancestor-of-a-binary-tree/',
      desc:'给定一个二叉树, 找到该树中两个指定节点的最近公共祖先。',
      thought:'后序遍历（自底向上）。若当前节点是 p 或 q，返回当前节点。递归左右子树，若左右都返回非空 → 当前节点就是 LCA；若只有一边返回非空 → 继续向上传递。O(n)时间 O(h)空间。',
      code: `var lowestCommonAncestor = function(root, p, q) {
    if (!root || root === p || root === q) return root;
    let left = lowestCommonAncestor(root.left, p, q);
    let right = lowestCommonAncestor(root.right, p, q);
    if (left && right) return root;
    return left || right;
};`
    },
    { id:7, num:124, title:'二叉树中的最大路径和', diff:'hard', cat:'二叉树', tags:'后序DFS', link:'https://leetcode.cn/problems/binary-tree-maximum-path-sum/',
      desc:'路径被定义为一条从树中任意节点出发，沿父节点-子节点连接，达到任意节点的序列。同一个节点在一条路径中最多出现一次。路径至少包含一个节点。求最大路径和。',
      thought:'后序 DFS。每个节点计算"以该节点为根的单边最大贡献值" = root.val + max(0, left, right)。同时更新全局最大值 = max(全局, root.val + max(0,left) + max(0,right))。单边贡献只选左或右中较大的（因为路径不能分叉），但全局最大值可以同时包含左右（路径在根处分叉）。',
      code: `var maxPathSum = function(root) {
    let maxSum = -Infinity;
    function dfs(node) {
        if (!node) return 0;
        let left = Math.max(0, dfs(node.left));
        let right = Math.max(0, dfs(node.right));
        maxSum = Math.max(maxSum, node.val + left + right);
        return node.val + Math.max(left, right);
    }
    dfs(root);
    return maxSum;
};`
    },
    { id:8, num:102, title:'二叉树的层序遍历', diff:'medium', cat:'二叉树', tags:'BFS', link:'https://leetcode.cn/problems/binary-tree-level-order-traversal/',
      desc:'给你二叉树的根节点 root，返回其节点值的层序遍历（即逐层地，从左到右访问所有节点）。',
      thought:'BFS 队列模板。每次处理一层：先记录当前队列长度 len，循环 len 次取出该层所有节点，同时将其子节点入队。O(n)时间 O(n)空间。',
      code: `var levelOrder = function(root) {
    if (!root) return [];
    let res = [], queue = [root];
    while (queue.length) {
        let len = queue.length, level = [];
        for (let i = 0; i < len; i++) {
            let node = queue.shift();
            level.push(node.val);
            if (node.left) queue.push(node.left);
            if (node.right) queue.push(node.right);
        }
        res.push(level);
    }
    return res;
};`
    },
    { id:9, num:110, title:'平衡二叉树', diff:'easy', cat:'二叉树', tags:'自底向上', link:'https://leetcode.cn/problems/balanced-binary-tree/',
      desc:'给定一个二叉树，判断它是否是高度平衡的二叉树（每个节点的左右子树高度差的绝对值不超过 1）。',
      thought:'自底向上求高度。若子树不平衡返回 -1。若左右子树高度差 > 1 返回 -1。最终检查返回值是否 >= 0。O(n)时间，避免了自顶向下的重复计算。',
      code: `var isBalanced = function(root) {
    function height(node) {
        if (!node) return 0;
        let left = height(node.left);
        if (left === -1) return -1;
        let right = height(node.right);
        if (right === -1) return -1;
        return Math.abs(left - right) <= 1 ? Math.max(left, right) + 1 : -1;
    }
    return height(root) !== -1;
};`
    },
    { id:10, num:297, title:'二叉树的序列化与反序列化', diff:'hard', cat:'二叉树', tags:'BFS,DFS', link:'https://leetcode.cn/problems/serialize-and-deserialize-binary-tree/',
      desc:'设计一个算法来序列化和反序列化二叉树。不限制序列化格式，只要可以反序列化回原树即可。',
      thought:'BFS 层序序列化：空节点用 "null" 标记。反序列化时同样用队列逐层构建。也可以用前序 DFS（更简洁）。核心是统一空节点的表示方式。',
      code: `// BFS 层序
var serialize = function(root) {
    if (!root) return "[]";
    let res = [], queue = [root];
    while (queue.length) {
        let node = queue.shift();
        if (node) { res.push(node.val); queue.push(node.left); queue.push(node.right); }
        else res.push("null");
    }
    while (res[res.length-1] === "null") res.pop();
    return JSON.stringify(res);
};

var deserialize = function(data) {
    let arr = JSON.parse(data);
    if (!arr.length) return null;
    let root = new TreeNode(arr[0]), queue = [root], i = 1;
    while (queue.length && i < arr.length) {
        let node = queue.shift();
        if (arr[i] !== "null") { node.left = new TreeNode(arr[i]); queue.push(node.left); }
        i++;
        if (i < arr.length && arr[i] !== "null") { node.right = new TreeNode(arr[i]); queue.push(node.right); }
        i++;
    }
    return root;
};`
    },
    { id:11, num:121, title:'买卖股票的最佳时机', diff:'easy', cat:'动态规划', tags:'贪心,DP', link:'https://leetcode.cn/problems/best-time-to-buy-and-sell-stock/',
      desc:'给定一个数组 prices，prices[i] 是股票第 i 天的价格。你只能选择某一天买入，并在未来的某一天卖出。求最大利润。',
      thought:'贪心：遍历过程中维护"到当前为止的最低价格"，每天计算"当天卖出的利润 = 当天价格 - 最低价格"，更新最大利润。等价于一维 DP：dp[i] = 前 i 天最大利润 = max(dp[i-1], prices[i] - minPrice)。',
      code: `var maxProfit = function(prices) {
    let minPrice = Infinity, maxProfit = 0;
    for (let price of prices) {
        minPrice = Math.min(minPrice, price);
        maxProfit = Math.max(maxProfit, price - minPrice);
    }
    return maxProfit;
};`
    },
    { id:12, num:300, title:'最长递增子序列', diff:'medium', cat:'动态规划', tags:'DP,贪心二分', link:'https://leetcode.cn/problems/longest-increasing-subsequence/',
      desc:'给你一个整数数组 nums，找到其中最长严格递增子序列的长度。子序列不要求连续。',
      thought:'解法 1：DP O(n²)。dp[i]=以 nums[i] 结尾的 LIS 长度，遍历 j<i 更新。解法 2：贪心+二分 O(nlogn)。维护 tails 数组，tails[k]=长度为 k+1 的 IS 的最小末尾。遍历 nums，二分查找 tails 中第一个 >= num 的位置替换之。',
      code: `// O(nlogn) 贪心+二分
var lengthOfLIS = function(nums) {
    let tails = [];
    for (let num of nums) {
        let l = 0, r = tails.length;
        while (l < r) {
            let mid = (l + r) >> 1;
            if (tails[mid] >= num) r = mid;
            else l = mid + 1;
        }
        if (l === tails.length) tails.push(num);
        else tails[l] = num;
    }
    return tails.length;
};`
    },
    { id:13, num:322, title:'零钱兑换', diff:'medium', cat:'动态规划', tags:'完全背包', link:'https://leetcode.cn/problems/coin-change/',
      desc:'给你一个整数数组 coins 表示不同面额的硬币，和一个整数 amount 表示总金额。计算凑成总金额所需的最少硬币个数。如果无法凑出，返回 -1。',
      thought:'完全背包 DP。dp[i] = 凑成金额 i 所需的最少硬币数。初始化 dp[0]=0，其余为 Infinity。遍历每种硬币，dp[i] = min(dp[i], dp[i-coin]+1)。字节超高频题。',
      code: `var coinChange = function(coins, amount) {
    let dp = Array(amount + 1).fill(Infinity);
    dp[0] = 0;
    for (let coin of coins) {
        for (let i = coin; i <= amount; i++) {
            dp[i] = Math.min(dp[i], dp[i - coin] + 1);
        }
    }
    return dp[amount] === Infinity ? -1 : dp[amount];
};`
    },
    { id:14, num:72, title:'编辑距离', diff:'medium', cat:'动态规划', tags:'二维DP', link:'https://leetcode.cn/problems/edit-distance/',
      desc:'给你两个单词 word1 和 word2，请返回将 word1 转换成 word2 所使用的最少操作数。操作包括：插入、删除、替换。',
      thought:'经典二维 DP。dp[i][j] = word1[0..i) 转成 word2[0..j) 的最小编辑距离。若 word1[i-1]==word2[j-1]：dp[i][j]=dp[i-1][j-1]；否则 dp[i][j]=1+min(插入,删除,替换)。插入=dp[i][j-1]，删除=dp[i-1][j]，替换=dp[i-1][j-1]。',
      code: `var minDistance = function(word1, word2) {
    let m = word1.length, n = word2.length;
    let dp = Array.from({length: m+1}, () => Array(n+1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (word1[i-1] === word2[j-1]) dp[i][j] = dp[i-1][j-1];
            else dp[i][j] = 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
        }
    }
    return dp[m][n];
};`
    },
    { id:15, num:53, title:'最大子数组和', diff:'medium', cat:'动态规划', tags:'Kadane', link:'https://leetcode.cn/problems/maximum-subarray/',
      desc:'给你一个整数数组 nums，请你找出一个具有最大和的连续子数组（子数组最少包含一个元素），返回其最大和。',
      thought:'Kadane 算法。dp[i]=以 nums[i] 结尾的最大子数组和=max(nums[i], dp[i-1]+nums[i])。空间优化：只需要一个变量 cur 维护当前值。O(n)时间 O(1)空间。',
      code: `var maxSubArray = function(nums) {
    let cur = nums[0], max = nums[0];
    for (let i = 1; i < nums.length; i++) {
        cur = Math.max(nums[i], cur + nums[i]);
        max = Math.max(max, cur);
    }
    return max;
};`
    },
    { id:16, num:152, title:'乘积最大子数组', diff:'medium', cat:'动态规划', tags:'最大最小', link:'https://leetcode.cn/problems/maximum-product-subarray/',
      desc:'给你一个整数数组 nums，请你找出数组中乘积最大的非空连续子数组，返回该子数组的乘积。',
      thought:'与 LC53 不同，乘积需要考虑负数反转。维护两个变量：curMax 和 curMin，分别记录以当前位置结尾的最大乘积和最小乘积。遇到负数时交换 curMax 和 curMin。',
      code: `var maxProduct = function(nums) {
    let curMax = nums[0], curMin = nums[0], res = nums[0];
    for (let i = 1; i < nums.length; i++) {
        if (nums[i] < 0) [curMax, curMin] = [curMin, curMax];
        curMax = Math.max(nums[i], curMax * nums[i]);
        curMin = Math.min(nums[i], curMin * nums[i]);
        res = Math.max(res, curMax);
    }
    return res;
};`
    },
    { id:17, num:139, title:'单词拆分', diff:'medium', cat:'动态规划', tags:'DP,哈希', link:'https://leetcode.cn/problems/word-break/',
      desc:'给你一个字符串 s 和一个字符串列表 wordDict 作为字典。判断是否可以利用字典中出现的单词拼接出 s。单词可以重复使用。',
      thought:'DP：dp[i] = s[0..i) 能否被拆分。dp[0]=true。对于每个 i，遍历 j∈[0,i)，若 dp[j] 为 true 且 s[j,i) 在字典中，则 dp[i]=true。O(n²)时间，O(n)空间。用 Set 存字典实现 O(1) 查找。',
      code: `var wordBreak = function(s, wordDict) {
    let set = new Set(wordDict), dp = Array(s.length + 1).fill(false);
    dp[0] = true;
    for (let i = 1; i <= s.length; i++) {
        for (let j = 0; j < i; j++) {
            if (dp[j] && set.has(s.slice(j, i))) { dp[i] = true; break; }
        }
    }
    return dp[s.length];
};`
    },
    { id:18, num:3, title:'无重复字符的最长子串', diff:'medium', cat:'双指针', tags:'滑动窗口', link:'https://leetcode.cn/problems/longest-substring-without-repeating-characters/',
      desc:'给定一个字符串 s，请你找出其中不含有重复字符的最长子串的长度。',
      thought:'滑动窗口。右指针不断右移，用 Set/Map 记录窗口内字符。遇到重复时，左指针跳到重复字符的下一个位置。O(n)时间 O(k)空间（k 为字符集大小）。字节第一高频题。',
      code: `var lengthOfLongestSubstring = function(s) {
    let map = new Map(), left = 0, maxLen = 0;
    for (let right = 0; right < s.length; right++) {
        if (map.has(s[right])) left = Math.max(left, map.get(s[right]) + 1);
        map.set(s[right], right);
        maxLen = Math.max(maxLen, right - left + 1);
    }
    return maxLen;
};`
    },
    { id:19, num:15, title:'三数之和', diff:'medium', cat:'双指针', tags:'排序,去重', link:'https://leetcode.cn/problems/3sum/',
      desc:'给你一个整数数组 nums，判断是否存在三元组 [nums[i], nums[j], nums[k]] 满足 i!=j!=k 且和为 0。返回所有和为 0 且不重复的三元组。',
      thought:'排序 + 双指针。固定第一个数 nums[i]，在 i 右侧用双指针找两数之和 = -nums[i]。关键在去重：i 和 left/right 都要跳过重复值。O(n²)时间。',
      code: `var threeSum = function(nums) {
    nums.sort((a,b) => a-b);
    let res = [], n = nums.length;
    for (let i = 0; i < n - 2; i++) {
        if (nums[i] > 0) break;
        if (i > 0 && nums[i] === nums[i-1]) continue;
        let left = i + 1, right = n - 1;
        while (left < right) {
            let sum = nums[i] + nums[left] + nums[right];
            if (sum === 0) {
                res.push([nums[i], nums[left], nums[right]]);
                while (left < right && nums[left] === nums[left+1]) left++;
                while (left < right && nums[right] === nums[right-1]) right--;
                left++; right--;
            } else if (sum < 0) left++;
            else right--;
        }
    }
    return res;
};`
    },
    { id:20, num:42, title:'接雨水', diff:'hard', cat:'双指针', tags:'双指针,单调栈', link:'https://leetcode.cn/problems/trapping-rain-water/',
      desc:'给定 n 个非负整数表示每个宽度为 1 的柱子的高度图，计算按此排列的柱子，下雨之后能接多少雨水。',
      thought:'双指针法（最优）：每个位置的雨水量 = min(左边最高, 右边最高) - 当前高度。用 leftMax 和 rightMax 分别记录左右的最大值。哪边小就移动哪边。O(n)时间 O(1)空间。',
      code: `var trap = function(height) {
    let left = 0, right = height.length - 1;
    let leftMax = 0, rightMax = 0, res = 0;
    while (left < right) {
        leftMax = Math.max(leftMax, height[left]);
        rightMax = Math.max(rightMax, height[right]);
        if (leftMax < rightMax) { res += leftMax - height[left]; left++; }
        else { res += rightMax - height[right]; right--; }
    }
    return res;
};`
    },
    { id:21, num:88, title:'合并两个有序数组', diff:'easy', cat:'双指针', tags:'逆序双指针', link:'https://leetcode.cn/problems/merge-sorted-array/',
      desc:'给你两个按非递减顺序排列的整数数组 nums1 和 nums2，另有两个整数 m 和 n 分别表示 nums1 和 nums2 中的元素数目。请你合并 nums2 到 nums1 中，使合并后的数组同样按非递减顺序排列。nums1 长度 = m+n。',
      thought:'逆序双指针。从 nums1 的末尾（m+n-1）向前填充，比较 nums1[m-1] 和 nums2[n-1]，取大者放入末尾。优势：不需要额外空间，不会覆盖 nums1 中未被处理的元素。O(m+n)时间 O(1)空间。',
      code: `var merge = function(nums1, m, nums2, n) {
    let p = m + n - 1, i = m - 1, j = n - 1;
    while (j >= 0) {
        if (i >= 0 && nums1[i] > nums2[j]) nums1[p--] = nums1[i--];
        else nums1[p--] = nums2[j--];
    }
};`
    },
    { id:22, num:5, title:'最长回文子串', diff:'medium', cat:'双指针', tags:'中心扩散,DP', link:'https://leetcode.cn/problems/longest-palindromic-substring/',
      desc:'给你一个字符串 s，找到 s 中最长的回文子串。',
      thought:'中心扩散法：每个字符（和每两个字符之间）作为中心，向两边扩展直到不是回文。共 2n-1 个中心。O(n²)时间 O(1)空间。优于 DP 的 O(n²) 时间和空间。',
      code: `var longestPalindrome = function(s) {
    let start = 0, maxLen = 0;
    function expand(l, r) {
        while (l >= 0 && r < s.length && s[l] === s[r]) { l--; r++; }
        return r - l - 1;
    }
    for (let i = 0; i < s.length; i++) {
        let len1 = expand(i, i);     // 奇数长度
        let len2 = expand(i, i + 1); // 偶数长度
        let len = Math.max(len1, len2);
        if (len > maxLen) { maxLen = len; start = i - ((len - 1) >> 1); }
    }
    return s.substring(start, start + maxLen);
};`
    },
    { id:23, num:33, title:'搜索旋转排序数组', diff:'medium', cat:'二分', tags:'二分变体', link:'https://leetcode.cn/problems/search-in-rotated-sorted-array/',
      desc:'整数数组 nums 按升序排列，在某个未知位置旋转。给定 target，若存在返回下标否则 -1。O(logn)。',
      thought:'二分变体。每次取 mid，判断哪半边有序。若左半有序且 target 在左半范围内 → 搜索左半；否则搜索右半。同理处理右半有序情况。字节极高频。',
      code: `var search = function(nums, target) {
    let l = 0, r = nums.length - 1;
    while (l <= r) {
        let mid = (l + r) >> 1;
        if (nums[mid] === target) return mid;
        if (nums[l] <= nums[mid]) { // 左半有序
            if (nums[l] <= target && target < nums[mid]) r = mid - 1;
            else l = mid + 1;
        } else { // 右半有序
            if (nums[mid] < target && target <= nums[r]) l = mid + 1;
            else r = mid - 1;
        }
    }
    return -1;
};`
    },
    { id:24, num:34, title:'在排序数组中查找元素的第一个和最后一个位置', diff:'medium', cat:'二分', tags:'二分边界', link:'https://leetcode.cn/problems/find-first-and-last-position-of-element-in-sorted-array/',
      desc:'给定一个升序数组 nums 和目标值 target，找出 target 在数组中的开始位置和结束位置。不存在返回 [-1,-1]。O(logn)。',
      thought:'两次二分：第一次找左边界（第一个 >= target），第二次找右边界（第一个 > target 的位置 - 1）。左边界：nums[mid] >= target 时 r=mid，否则 l=mid+1。',
      code: `var searchRange = function(nums, target) {
    function findFirst() {
        let l = 0, r = nums.length;
        while (l < r) {
            let mid = (l + r) >> 1;
            if (nums[mid] >= target) r = mid;
            else l = mid + 1;
        }
        return l;
    }
    let left = findFirst();
    if (left === nums.length || nums[left] !== target) return [-1, -1];
    // 右边界 = 第一个 > target 的位置 - 1 = findFirst(target+1) - 1
    let right = (() => { let l=0, r=nums.length; while(l<r){let m=(l+r)>>1; if(nums[m]>target)r=m;else l=m+1;} return l-1; })();
    return [left, right];
};`
    },
    { id:25, num:69, title:'x 的平方根', diff:'easy', cat:'二分', tags:'二分,牛顿', link:'https://leetcode.cn/problems/sqrtx/',
      desc:'给你一个非负整数 x，计算并返回 x 的算术平方根。结果只保留整数部分。',
      thought:'二分查找：在 [0, x] 中找最大的 mid 满足 mid² <= x。O(logx)。牛顿迭代法：x_{n+1} = (x_n + a/x_n)/2，收敛极快。',
      code: `// 二分
var mySqrt = function(x) {
    let l = 0, r = x, ans = 0;
    while (l <= r) {
        let mid = (l + r) >> 1;
        if (mid * mid <= x) { ans = mid; l = mid + 1; }
        else r = mid - 1;
    }
    return ans;
};

// 牛顿迭代
var mySqrt = function(x) {
    if (x === 0) return 0;
    let xn = x;
    while (true) {
        let next = (xn + x / xn) / 2;
        if (Math.abs(xn - next) < 1e-6) return Math.floor(next);
        xn = next;
    }
};`
    },
    { id:26, num:20, title:'有效的括号', diff:'easy', cat:'栈', tags:'栈基础', link:'https://leetcode.cn/problems/valid-parentheses/',
      desc:'给定一个只包括 ( ) { } [ ] 的字符串 s，判断字符串是否有效。有效需满足：左括号必须用相同类型的右括号闭合，且左括号必须以正确的顺序闭合。',
      thought:'栈经典题。遇到左括号压栈，遇到右括号检查栈顶是否匹配。最后栈为空则有效。用 Map 存括号对应关系。',
      code: `var isValid = function(s) {
    let stack = [], map = {')': '(', '}': '{', ']': '['};
    for (let c of s) {
        if (!map[c]) stack.push(c);
        else if (stack.pop() !== map[c]) return false;
    }
    return stack.length === 0;
};`
    },
    { id:27, num:215, title:'数组中的第K个最大元素', diff:'medium', cat:'栈/堆', tags:'快速选择,堆', link:'https://leetcode.cn/problems/kth-largest-element-in-an-array/',
      desc:'给定整数数组 nums 和整数 k，请返回数组中第 k 个最大的元素。',
      thought:'解法1：快速选择 O(n)平均。基于快排 partition，每次确定 pivot 位置，若 pivot 恰好是 n-k 则返回。解法2：小根堆 O(nlogk)。维护大小为 k 的小根堆，遍历完堆顶就是第 k 大。',
      code: `// 快速选择 O(n)
var findKthLargest = function(nums, k) {
    let target = nums.length - k;
    function quickSelect(l, r) {
        let pivot = nums[r], p = l;
        for (let i = l; i < r; i++) {
            if (nums[i] <= pivot) { [nums[i], nums[p]] = [nums[p], nums[i]]; p++; }
        }
        [nums[p], nums[r]] = [nums[r], nums[p]];
        if (p === target) return nums[p];
        return p < target ? quickSelect(p+1, r) : quickSelect(l, p-1);
    }
    return quickSelect(0, nums.length - 1);
};`
    },
    { id:28, num:155, title:'最小栈', diff:'medium', cat:'栈', tags:'辅助栈', link:'https://leetcode.cn/problems/min-stack/',
      desc:'设计一个支持 push、pop、top 操作，并能在常数时间内检索到最小元素的栈。',
      thought:'辅助栈。主栈正常存数据，辅助栈（minStack）存"当前栈状态下的最小值"。push 时，若 x <= minStack 栈顶（或 minStack 为空），则同时压入 minStack。pop 时若主栈栈顶 == minStack 栈顶，则同步弹出。',
      code: `var MinStack = function() { this.stack = []; this.minStack = []; };
MinStack.prototype.push = function(x) {
    this.stack.push(x);
    if (!this.minStack.length || x <= this.minStack[this.minStack.length-1])
        this.minStack.push(x);
};
MinStack.prototype.pop = function() {
    if (this.stack.pop() === this.minStack[this.minStack.length-1])
        this.minStack.pop();
};
MinStack.prototype.top = function() { return this.stack[this.stack.length-1]; };
MinStack.prototype.getMin = function() { return this.minStack[this.minStack.length-1]; };`
    },
    { id:29, num:200, title:'岛屿数量', diff:'medium', cat:'图/DFS', tags:'DFS,BFS', link:'https://leetcode.cn/problems/number-of-islands/',
      desc:'给你一个由 1(陆地) 和 0(水) 组成的二维网格，请你计算网格中岛屿的数量。岛屿总是被水包围，每座岛屿由水平/垂直相邻的陆地连接形成。',
      thought:'DFS 洪水填充。遍历每个格子，遇到 1 就岛屿计数 +1，然后 DFS 把相连的 1 全部标记为 0（沉岛）。O(mn)时间。BFS 也可，用队列。',
      code: `var numIslands = function(grid) {
    let count = 0, m = grid.length, n = grid[0].length;
    function dfs(i, j) {
        if (i < 0 || i >= m || j < 0 || j >= n || grid[i][j] === '0') return;
        grid[i][j] = '0';
        dfs(i+1, j); dfs(i-1, j); dfs(i, j+1); dfs(i, j-1);
    }
    for (let i = 0; i < m; i++)
        for (let j = 0; j < n; j++)
            if (grid[i][j] === '1') { count++; dfs(i, j); }
    return count;
};`
    },
    { id:30, num:46, title:'全排列', diff:'medium', cat:'回溯', tags:'回溯模板', link:'https://leetcode.cn/problems/permutations/',
      desc:'给定一个不含重复数字的数组 nums，返回其所有可能的全排列。',
      thought:'回溯模板。用 used 数组标记已选元素，path 维护当前路径。递归到底（path.length === nums.length）时把 path 的拷贝加入结果。回溯时撤销选择。O(n*n!)时间。',
      code: `var permute = function(nums) {
    let res = [], used = Array(nums.length).fill(false);
    function backtrack(path) {
        if (path.length === nums.length) { res.push([...path]); return; }
        for (let i = 0; i < nums.length; i++) {
            if (used[i]) continue;
            path.push(nums[i]); used[i] = true;
            backtrack(path);
            path.pop(); used[i] = false;
        }
    }
    backtrack([]);
    return res;
};`
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
      html += '<div class="cv-section"><div class="cv-section-title">解题思路</div><p>' + p.thought + '</p></div>';
      html += '<div class="cv-section"><div class="cv-section-title">代码</div>';
      const code = savedCode || p.code;
      if (Auth.isLoggedIn()) {
        html += '<div class="lc-code-block editable"><textarea id="lc-code-area">' + code.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</textarea></div>';
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
