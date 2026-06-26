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
    { id:2, num:25, title:'K 个一组翻转链表', diff:'hard', cat:'链表', tags:'递归,迭代', link:'https://leetcode.cn/problems/reverse-nodes-in-k-group/' },
    { id:3, num:21, title:'合并两个有序链表', diff:'easy', cat:'链表', tags:'归并', link:'https://leetcode.cn/problems/merge-two-sorted-lists/' },
    { id:4, num:141, title:'环形链表 I + II', diff:'medium', cat:'链表', tags:'快慢指针,Floyd', link:'https://leetcode.cn/problems/linked-list-cycle/' },
    { id:5, num:146, title:'LRU 缓存', diff:'medium', cat:'链表', tags:'哈希表,双向链表', link:'https://leetcode.cn/problems/lru-cache/' },
    { id:6, num:236, title:'二叉树的最近公共祖先', diff:'medium', cat:'二叉树', tags:'后序递归', link:'https://leetcode.cn/problems/lowest-common-ancestor-of-a-binary-tree/' },
    { id:7, num:124, title:'二叉树中的最大路径和', diff:'hard', cat:'二叉树', tags:'后序DFS', link:'https://leetcode.cn/problems/binary-tree-maximum-path-sum/' },
    { id:8, num:102, title:'二叉树的层序遍历', diff:'medium', cat:'二叉树', tags:'BFS', link:'https://leetcode.cn/problems/binary-tree-level-order-traversal/' },
    { id:9, num:110, title:'平衡二叉树', diff:'easy', cat:'二叉树', tags:'自底向上', link:'https://leetcode.cn/problems/balanced-binary-tree/' },
    { id:10, num:297, title:'二叉树的序列化与反序列化', diff:'hard', cat:'二叉树', tags:'BFS,DFS', link:'https://leetcode.cn/problems/serialize-and-deserialize-binary-tree/' },
    { id:11, num:121, title:'买卖股票的最佳时机', diff:'easy', cat:'动态规划', tags:'贪心,DP', link:'https://leetcode.cn/problems/best-time-to-buy-and-sell-stock/' },
    { id:12, num:300, title:'最长递增子序列', diff:'medium', cat:'动态规划', tags:'DP,贪心二分', link:'https://leetcode.cn/problems/longest-increasing-subsequence/' },
    { id:13, num:322, title:'零钱兑换', diff:'medium', cat:'动态规划', tags:'完全背包', link:'https://leetcode.cn/problems/coin-change/' },
    { id:14, num:72, title:'编辑距离', diff:'medium', cat:'动态规划', tags:'二维DP', link:'https://leetcode.cn/problems/edit-distance/' },
    { id:15, num:53, title:'最大子数组和', diff:'medium', cat:'动态规划', tags:'Kadane', link:'https://leetcode.cn/problems/maximum-subarray/' },
    { id:16, num:152, title:'乘积最大子数组', diff:'medium', cat:'动态规划', tags:'最大最小', link:'https://leetcode.cn/problems/maximum-product-subarray/' },
    { id:17, num:139, title:'单词拆分', diff:'medium', cat:'动态规划', tags:'DP,哈希', link:'https://leetcode.cn/problems/word-break/' },
    { id:18, num:3, title:'无重复字符的最长子串', diff:'medium', cat:'双指针', tags:'滑动窗口', link:'https://leetcode.cn/problems/longest-substring-without-repeating-characters/' },
    { id:19, num:15, title:'三数之和', diff:'medium', cat:'双指针', tags:'排序,去重', link:'https://leetcode.cn/problems/3sum/' },
    { id:20, num:42, title:'接雨水', diff:'hard', cat:'双指针', tags:'双指针,单调栈', link:'https://leetcode.cn/problems/trapping-rain-water/' },
    { id:21, num:88, title:'合并两个有序数组', diff:'easy', cat:'双指针', tags:'逆序双指针', link:'https://leetcode.cn/problems/merge-sorted-array/' },
    { id:22, num:5, title:'最长回文子串', diff:'medium', cat:'双指针', tags:'中心扩散,DP', link:'https://leetcode.cn/problems/longest-palindromic-substring/' },
    { id:23, num:33, title:'搜索旋转排序数组', diff:'medium', cat:'二分', tags:'二分变体', link:'https://leetcode.cn/problems/search-in-rotated-sorted-array/' },
    { id:24, num:34, title:'在排序数组中查找元素的第一个和最后一个位置', diff:'medium', cat:'二分', tags:'二分边界', link:'https://leetcode.cn/problems/find-first-and-last-position-of-element-in-sorted-array/' },
    { id:25, num:69, title:'x 的平方根', diff:'easy', cat:'二分', tags:'二分,牛顿', link:'https://leetcode.cn/problems/sqrtx/' },
    { id:26, num:20, title:'有效的括号', diff:'easy', cat:'栈', tags:'栈基础', link:'https://leetcode.cn/problems/valid-parentheses/' },
    { id:27, num:215, title:'数组中的第K个最大元素', diff:'medium', cat:'栈/堆', tags:'快速选择,堆', link:'https://leetcode.cn/problems/kth-largest-element-in-an-array/' },
    { id:28, num:155, title:'最小栈', diff:'medium', cat:'栈', tags:'辅助栈', link:'https://leetcode.cn/problems/min-stack/' },
    { id:29, num:200, title:'岛屿数量', diff:'medium', cat:'图/DFS', tags:'DFS,BFS', link:'https://leetcode.cn/problems/number-of-islands/' },
    { id:30, num:46, title:'全排列', diff:'medium', cat:'回溯', tags:'回溯模板', link:'https://leetcode.cn/problems/permutations/' }
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
    const p = problems.find(x => x.id === id);
    const content = area.value;
    // Copy to clipboard as a workaround
    navigator.clipboard.writeText(content).then(() => {
      alert('代码已复制到剪贴板。请手动提交到 GitHub 仓库的 leetcode/' + p.num + '-' + p.title + '.js');
    });
  }

  function init() {
    renderProblem(1);
  }

  return { init, save, syncToGitHub };
})();
