---
tags:
  - CS
  - Linux
  - 操作系统
  - 课程笔记
date: 2026-06-25
---

# Linux 操作系统

> 基于内核官方文档（kernel.org）、Debian/Ubuntu 官方文档、《The Linux Command Line》（Shotts）、鸟哥的 Linux 私房菜、《Understanding Linux: The Kernel Perspective》（Likic, 2025）等资料的系统性整理笔记。

**Linux** 是一个类 Unix 的、开源的单内核操作系统内核，最初由 Linus Torvalds 于 1991 年发布。广义的 "Linux" 指基于该内核、搭配 GNU 工具链和各类应用软件构成的完整操作系统发行版（distribution）。其核心设计哲学可归纳为三条：一切皆文件、由小型单一目的程序通过管道组合完成复杂任务、配置数据以纯文本形式存储。

---

## 内核架构

### 单内核与模块化

Linux 采用**单内核**（Monolithic Kernel）架构——进程调度、内存管理、文件系统、设备驱动和网络协议栈均在同一个内核地址空间中运行。这与微内核（如 Minix、seL4）将驱动和文件系统移入用户空间的设计形成对比。

单内核的优势在于**性能**——内核组件间的函数调用无上下文切换开销。为弥补单内核在灵活性和可维护性上的不足，Linux 引入了**可加载内核模块**（Loadable Kernel Module, LKM，`.ko` 文件），允许在运行时动态加载和卸载驱动、文件系统支持等，无需重新编译或重启内核。

### 内核空间与用户空间

CPU 的**特权级别**（x86 的 Ring 0/3）将系统划分为两个隔离区域：

| 区域 | CPU 权限 | 访问范围 | 运行内容 |
|------|:---:|------|------|
| **内核空间** | Ring 0（最高） | 全部硬件、全部内存 | 内核代码、驱动、中断处理 |
| **用户空间** | Ring 3（最低） | 受限的虚拟地址空间 | 应用程序、Shell、守护进程 |

用户空间程序只能通过**系统调用**（System Call）请求内核服务。系统调用是用户空间与内核空间之间的唯一合法接口——它构成了 Linux 安全模型的硬件级根基。Linux 内核提供约 300 多个系统调用，涵盖文件操作（`open`, `read`, `write`, `close`）、进程管理（`fork`, `execve`, `wait`, `exit`）、内存管理（`mmap`, `brk`）、网络通信（`socket`, `bind`, `listen`, `accept`）等。

### 内核核心子系统

```
┌─────────────────────────────────────────────┐
│              用户空间（应用程序）              │
├─────────────────────────────────────────────┤
│              系统调用接口 (SCI)               │
├──────┬──────┬───────┬───────┬──────┬────────┤
│进程管理│内存管理│文件系统│设备驱动│网络栈│中断处理 │
│(调度器)│(VM)  │(VFS)  │(LDM)  │(TCP/IP)│      │
├──────┴──────┴───────┴───────┴──────┴────────┤
│              硬件抽象层 (HAL)                 │
└─────────────────────────────────────────────┘
```

---

## 进程管理

### 进程与线程

**进程**（Process）是程序的运行实例，拥有独立的虚拟地址空间、文件描述符表和信号处理器。每个进程由一个唯一的**进程 ID**（PID）标识。

**线程**（Thread）是进程内的执行流。Linux 中线程以**轻量级进程**（Light-Weight Process, LWP）的形式实现——clone() 系统调用可指定资源共享程度（完全共享地址空间 = 线程，不完全共享 = fork 出的子进程）。

### 进程创建：fork—exec 模型

Linux 中创建新进程的唯一方式是**克隆**现有进程：

1. `fork()` 创建调用进程的近乎完全复制（子进程获得父进程地址空间的写时复制副本、文件描述符的副本、独立的 PID）
2. 子进程中 `fork()` 返回 0，父进程中返回子进程 PID——通过此返回值区分执行路径
3. 若需运行不同程序，子进程调用 `execve()` 族函数，以新程序的代码和数据**完全替换**当前地址空间
4. 父进程通过 `wait()` / `waitpid()` 回收子进程的终止状态

**写时复制**（Copy-on-Write, COW）：fork 之后父子进程共享物理内存页，仅当任一方尝试写入时才复制该页。此优化使 fork 的开销远小于完整的地址空间拷贝。

### 进程状态

| 状态 | 符号 | 含义 |
|------|:---:|------|
| **运行** (Running) | `R` | 正在 CPU 执行或位于运行队列等待调度 |
| **可中断睡眠** | `S` | 等待某事件（I/O 完成、信号），可被信号唤醒 |
| **不可中断睡眠** | `D` | 等待不可中断的事件（通常是磁盘 I/O），不响应信号 |
| **停止** | `T` | 被 SIGSTOP / SIGTSTP 暂停 |
| **僵尸** | `Z` | 进程已终止但父进程尚未调用 wait() 回收——占据进程表项但不消耗其他资源 |

### 调度器

Linux 的**完全公平调度器**（Completely Fair Scheduler, CFS）自内核 2.6.23 起为默认调度器。CFS 不以固定时间片运作，而是为每个进程维护一个**虚拟运行时间**（vruntime）——记录进程在 CPU 上的加权运行时间。调度器总是选择 vruntime 最小的进程执行，从而在宏观上保证各进程获得的 CPU 时间与其优先级权重成比例。

**nice 值**（-20 至 +19，默认 0）影响权重分配：nice 值越低（越"不友好"），权重越高，获得更多 CPU 份额。

### 进程间通信 (IPC)

| 机制 | 特点 | 典型用途 |
|------|------|---------|
| **信号 (Signal)** | 异步通知机制；传递整数信号编号 | SIGKILL(9) 强制终止、SIGTERM(15) 优雅终止 |
| **管道 (Pipe)** | 单向字节流；`\|` 运算符连接 | `cat file \| grep pattern \| wc -l` |
| **命名管道 (FIFO)** | 管道的文件系统可见版本，无亲缘关系的进程可用 | 守护进程间的数据交换 |
| **共享内存** | 最快的 IPC——多进程直接映射同一物理内存区域 | 高性能数据共享 |
| **消息队列** | 结构化消息的异步传输，按类型接收 | 任务分发系统 |
| **信号量** | 计数器型同步原语 | 限流、资源池管理 |
| **套接字 (Socket)** | 本地（Unix Domain）或网络通信 | 网络服务、本地 C/S |

---

## 内存管理

### 虚拟内存

每个 Linux 进程拥有独立的 4GB（32 位）或 128TB（64 位，实际受限于硬件）**虚拟地址空间**。虚拟地址通过 CPU 的**内存管理单元**（MMU）和内核维护的**页表**被转译为物理地址。

虚拟内存的核心益处：
1. **隔离**：一个进程无法访问另一个进程的内存
2. **按需分页**：页面仅在初次被访问时才从磁盘（可执行文件或 swap）加载
3. **内存过量分配**（Overcommit）：内核允许分配超过物理内存总量的虚拟内存——依赖大多数分配的内存不会被实际使用的事实

### 页与交换

物理内存被分割为固定大小的**页**（通常 4KB，也支持 2MB 大页和 1GB 巨页）。当物理内存紧张时，**页面回收**机制将不活跃的匿名页（进程堆/栈）移至**交换区**（swap）释放物理页供活跃进程使用。

### 关键命令与信息源

```bash
free -h              # 物理内存和 swap 的使用概览
vmstat 1             # 每秒输出内存、swap、I/O、CPU 的统计数据
cat /proc/meminfo    # 内核维护的详细内存统计
cat /proc/PID/maps   # 特定进程的内存映射
```

---

## 文件系统

### 虚拟文件系统 (VFS)

Linux 通过**虚拟文件系统**（Virtual File System, VFS）层抽象了底层的具体文件系统实现。VFS 定义了一组通用对象模型（superblock、inode、dentry、file），所有具体文件系统（ext4、XFS、btrfs、NFS、procfs）必须提供对这些对象的实现。

这一设计使得 Linux 能够同时挂载数十种不同文件系统，用户空间程序通过统一的 `open/read/write/close` 接口操作文件，无须感知底层文件系统的差异。

### inode

**inode**（索引节点）是文件系统中描述文件的核心数据结构。每个文件（含目录、设备文件、管道）在存储介质上有唯一的 inode。inode 存储：

- 文件类型（普通文件、目录、符号链接、设备等）
- 权限（rwx 三组）
- 所有者（UID）和属组（GID）
- 时间戳（atime=最后访问、mtime=最后修改、ctime=最后元数据变更）
- 文件大小
- 指向数据块（data blocks）的指针

inode **不存储文件名**——文件名存储在目录的目录项（dentry）中，是指向 inode 编号的映射。此分离是**硬链接**得以存在的根基：多个文件名（在不同目录中）可指向同一个 inode。

### 文件系统层次标准 (FHS)

| 目录 | 用途 |
|------|------|
| `/` | 根目录——整个文件系统树的起点 |
| `/bin` | 基本用户命令（`ls`, `cp`, `cat`）——现代系统常为 `/usr/bin` 的符号链接 |
| `/boot` | 内核映像（vmlinuz）、initramfs、GRUB 配置文件 |
| `/dev` | 设备文件——`/dev/sda`（硬盘）、`/dev/tty`（终端）、`/dev/null` |
| `/etc` | 系统级配置文件——`/etc/passwd`、`/etc/fstab`、`/etc/ssh/` |
| `/home` | 普通用户的主目录——`/home/alice/` |
| `/lib` | 共享库和内核模块——`/lib/modules/` |
| `/proc` | 伪文件系统——内核运行时信息的映射（进程、内存、硬件） |
| `/sys` | 伪文件系统——内核设备模型和驱动的结构化视图 |
| `/tmp` | 临时文件——所有用户可写（sticky bit 保护），重启后清空 |
| `/var` | 可变数据——日志 (`/var/log`)、邮件队列、数据库文件 |
| `/usr` | 用户程序和数据——`/usr/bin`、`/usr/lib`、`/usr/share` |
| `/opt` | 可选的第三方应用软件 |
| `/srv` | 服务数据——Web 服务器的站点文件、FTP 文件 |

### 伪文件系统

**procfs**（挂载于 `/proc`）和**sysfs**（挂载于 `/sys`）不是存储在磁盘上的真实文件系统，而是内核数据结构的内存映射——读取这些"文件"将实时返回内核的运行时信息，写入这些"文件"则改变内核参数。

```bash
cat /proc/cpuinfo       # CPU 信息
cat /proc/meminfo       # 内存详情
cat /proc/PID/status    # 进程 PID 的状态
echo 1 > /proc/sys/net/ipv4/ip_forward   # 启用 IP 转发
```

### 硬链接与符号链接

| 属性 | 硬链接 | 符号链接（软链接） |
|------|--------|----------------|
| **创建** | `ln file link` | `ln -s file link` |
| **本质** | 指向**相同 inode** 的额外目录项 | 含目标**路径字符串**的独立文件（独立 inode） |
| **跨文件系统** | 否 | 是 |
| **链接到目录** | 否（防循环） | 是 |
| **原文件删除后** | 数据仍存在（链接计数 > 0） | 成为悬空链接（broken link） |
| **`ls -l` 显示** | 普通文件 `-` | `l` 并显示 `-> 目标路径` |

---

## 权限管理

### 基本权限位

每个文件/目录有三组、每组三位权限：

```
-  rwx  rwx  rwx
 │  └─┬─┘└─┬─┘└─┬─┘
类型  用户 属组  其他
```

**类型位**：`-` = 普通文件，`d` = 目录，`l` = 符号链接。

**权限位**（八进制）：

| 位 | 值 | 对文件 | 对目录 |
|:---:|:---:|------|------|
| **r** | 4 | 读取内容 | 列出目录内容（`ls`） |
| **w** | 2 | 修改内容 | 创建/删除/重命名目录内文件 |
| **x** | 1 | 作为程序执行 | 进入目录（`cd`） |

**常用组合**：

| 八进制 | 符号 | 适用场景 |
|:---:|------|------|
| `755` | `rwxr-xr-x` | 可执行程序、目录 |
| `644` | `rw-r--r--` | 普通文件、配置文件 |
| `700` | `rwx------` | 私有脚本 |
| `600` | `rw-------` | SSH 私钥 |
| `775` | `rwxrwxr-x` | 组共享目录 |
| `777` | `rwxrwxrwx` | 绝对开放——仅 `/tmp` 等少数场景适用 |

### chmod / chown / umask

```bash
# 符号模式
chmod u+x script.sh        # 所有者 + 执行
chmod g-w file.txt         # 属组 - 写
chmod o= data.log          # 其他 = 无

# 八进制模式
chmod 755 /usr/local/bin/program
chmod -R 644 /var/www      # 递归

# 修改所有者
chown alice:staff file     # 同时改所有者和属组
chown alice file           # 仅所有者
chown :staff file          # 仅属组（等价于 chgrp staff file）

# umask：减法型默认权限掩码
umask 022   # 文件 666-022=644(rw-r--r--), 目录 777-022=755(rwxr-xr-x)
umask 077   # 文件 600, 目录 700 (私密)
```

### 特殊权限位

在标准九位之前有一个四位的特殊权限字段：

| 位 | 八进制值 | 符号 | 文件效果 | 目录效果 |
|------|:---:|------|------|------|
| **SUID** | 4 | `u+s` | 以**所有者**身份执行 | 无标准效果 |
| **SGID** | 2 | `g+s` | 以**属组**身份执行 | 新建文件继承**目录的属组** |
| **Sticky** | 1 | `o+t` | 无效果 | 仅文件所有者可删除自己的文件 |

```bash
chmod 4755 /usr/bin/passwd   # SUID (passwd 必须以 root 身份修改 /etc/shadow)
chmod 2775 /shared/project   # SGID (新文件自动归属 project 组)
chmod 1777 /tmp              # Sticky (人人可写，各自只能删自己的)
```

---

## 启动流程

### 从 BIOS/UEFI 到内核

```
固件(POST) → Boot Loader(GRUB2) → Kernel → initramfs → systemd → 登录
    ↓              ↓                ↓          ↓          ↓
 硬件自检      选择内核+参数    初始化硬件  临时根文件   启动所有
 查找可启动盘  加载内核到内存   挂载根FS   系统+驱动   用户空间服务
```

**initramfs**（Initial RAM Filesystem）是一个临时的小型根文件系统，包含挂载真正的根文件系统所需的驱动和工具（如 LVM、RAID、加密模块）。

### systemd

现代 Linux 发行版以 **systemd** 替代了传统的 SysV init 作为 PID 1（系统启动后的第一个用户空间进程）。systemd 不仅负责启动服务，还管理整个系统的运行时状态。

```bash
systemctl status sshd           # 查看服务状态
systemctl start/stop/restart    # 控制服务
systemctl enable/disable sshd   # 设置开机自启/禁止
systemctl list-units --state=failed  # 列出失败的服务
journalctl -u sshd              # 查看特定服务的日志
```

---

## Shell 与命令行

### 核心命令分类

| 类别 | 命令 | 功能 |
|------|------|------|
| **导航** | `pwd`, `cd`, `ls` | 查看/切换当前工作目录，列出目录内容 |
| **文件操作** | `cp`, `mv`, `rm`, `touch`, `mkdir`, `rmdir` | 复制、移动、删除、创建文件/目录 |
| **查看** | `cat`, `less`, `head`, `tail`, `tail -f` | 输出/分页/首尾行查看；`tail -f` 实时跟踪 |
| **搜索** | `find`, `locate`, `grep` | 按名称/属性搜索文件；按模式搜索文件内容 |
| **权限** | `chmod`, `chown`, `chgrp` | 变更权限位、所有者、属组 |
| **磁盘** | `df -h`, `du -sh`, `mount`, `lsblk` | 磁盘使用概览、目录大小、挂载、块设备列表 |
| **进程** | `ps aux`, `top`, `htop`, `kill`, `nice` | 进程列表、实时监控、终止、优先级调整 |
| **网络** | `ip a`, `ss -antp`, `ping`, `curl`, `wget` | IP 地址、端口监听、连通性测试、HTTP 请求 |
| **压缩** | `tar`, `gzip`, `bzip2`, `xz` | 归档与压缩 |

### 管道、重定向与进程替换

**管道**（Pipeline）：`cmd1 | cmd2`——`cmd1` 的标准输出成为 `cmd2` 的标准输入。

**重定向**：

| 符号 | 含义 |
|------|------|
| `cmd > file` | 标准输出覆盖写入文件 |
| `cmd >> file` | 标准输出追加写入文件 |
| `cmd 2> file` | 标准错误输出到文件 |
| `cmd < file` | 从文件读取标准输入 |
| `cmd 2>&1` | 标准错误重定向到标准输出的当前目标 |
| `cmd &> file` | 标准输出和标准错误一起写入文件 |

**经典组合示例**：

```bash
# 查找最大的 5 个文件
find / -type f -exec du -h {} + 2>/dev/null | sort -rh | head -5

# 统计每个 IP 的 HTTP 请求数
cat access.log | awk '{print $1}' | sort | uniq -c | sort -rn | head
```

### 变量与展开

```bash
# 变量定义与引用
NAME="Linux"
echo "Hello, $NAME"        # 双引号内展开变量
echo 'Hello, $NAME'        # 单引号内不展开

# 命令替换
NOW=$(date)                # 将命令输出捕获为字符串

# 通配符展开
ls *.txt                   # * 匹配任意字符序列
ls file?.log               # ? 匹配单个字符

# 大括号展开
echo {A,B,C}.txt           # 输出 A.txt B.txt C.txt
mkdir -p project/{src,doc,test}   # 创建三个子目录
```

### 环境变量

| 变量 | 含义 |
|------|------|
| `PATH` | 可执行文件的搜索路径 |
| `HOME` | 当前用户的主目录 |
| `USER` / `LOGNAME` | 当前用户名 |
| `SHELL` | 当前 Shell 的路径 |
| `PWD` | 当前工作目录 |
| `LD_LIBRARY_PATH` | 动态链接器搜索共享库的额外路径 |

---

## 用户与组管理

### 关键文件

| 文件 | 存储内容 |
|------|------|
| `/etc/passwd` | 用户账户信息——用户名:密码占位符(`x`):UID:GID:描述:主目录:Shell |
| `/etc/shadow` | 加密后的密码哈希及密码过期策略——仅 root 可读 |
| `/etc/group` | 组定义——组名:密码占位符:GID:成员列表 |
| `/etc/sudoers` | sudo 权限配置——通过 `visudo` 编辑 |

### 核心命令

```bash
useradd -m -s /bin/bash newuser    # 创建用户（含主目录、指定 Shell）
passwd newuser                      # 设置/修改密码
usermod -aG docker newuser          # 将用户加入附加组
userdel -r newuser                  # 删除用户及主目录
groupadd devteam                    # 创建组
id username                         # 查看用户的 UID、GID 及所属组
```

---

## 网络管理

```bash
ip addr show                    # 查看 IP 地址（替代 ifconfig）
ip link set eth0 up/down        # 启用/禁用网卡
ip route show                   # 查看路由表
ss -antp                        # 查看所有 TCP 监听端口及关联进程
ss -tulp                        # 查看 TCP+UDP 监听端口
ping -c 4 8.8.8.8              # 连通性测试
traceroute example.com          # 路由追踪
dig example.com A               # DNS 查询
curl -I https://example.com     # HTTP 响应头
iptables -L -n -v               # 查看防火墙规则
```

---

## 软件包管理

| 发行版家族 | 包格式 | 管理工具 | 仓库搜索 |
|-----------|:---:|------|------|
| **Debian / Ubuntu** | `.deb` | `apt`, `dpkg` | `apt search`, `apt install`, `apt remove` |
| **Red Hat / Fedora** | `.rpm` | `dnf`, `rpm` | `dnf search`, `dnf install`, `dnf remove` |
| **Arch** | `.pkg.tar.zst` | `pacman` | `pacman -Ss`, `pacman -S`, `pacman -R` |
| **openSUSE** | `.rpm` | `zypper` | `zypper search`, `zypper install` |

---

## 手动可验算示例：权限位与 umask 的演示

```bash
# 1. 初始状态
umask                # 假设输出 0022
touch testfile
mkdir testdir
ls -l testfile       # -rw-r--r-- (644)
ls -ld testdir       # drwxr-xr-x (755)

# 2. 修改 umask 为严格模式
umask 0077
touch privatefile
mkdir privatedir
ls -l privatefile    # -rw-------  (600) — 仅所有者可读写
ls -ld privatedir    # drwx------  (700) — 仅所有者可进入

# 3. chmod 八进制与符号的一致性
chmod 640 privatefile    # rw-r-----
ls -l privatefile        # -rw-r-----

# 4. SUID 演示
cp /bin/ls ./myls
chmod 4755 ./myls        # 设置 SUID
ls -l ./myls             # -rwsr-xr-x (注意 s 替代了所有者 x)

# 5. Sticky bit 演示
mkdir temp_shared
chmod 1777 temp_shared
ls -ld temp_shared       # drwxrwxrwt (注意 t 在末尾)
```

---

## 常见误区与注意事项

1. **"chmod 777 是万能解"**：使文件对所有人开放所有权限是极其不可逆的安全风险。
2. **"rm 删除的文件可以恢复"**：在绝大多数现代文件系统上，`rm` 后的数据块被标记为可用，恢复极其困难。没有回收站机制的命令行 `rm` 应被执行前确认。
3. **"kill -9 应该先于 kill"**：SIGKILL (9) 不给进程任何清理机会。应先用 SIGTERM (15) 请求进程优雅退出。
4. **"root 是无所不能的"**：内核可设置一些 root 也无法覆盖的限制（如 `chattr +i` 的不可变文件、SELinux/AppArmor 的强制访问控制）。
5. **"符号链接可以替代硬链接"**：符号链接目标被删除后成为悬空链接——对备份脚本和关键配置而言，硬链接更可靠。
6. **"一切都必须在终端中完成"**：现代 Linux 桌面环境拥有成熟的 GUI 应用生态系统。终端是高效的工具，不是必修的负担。

---

## 术语速查

| 术语 | 英文 | 简要含义 |
|------|------|---------|
| 内核 | Kernel | 操作系统的核心——管理硬件、调度进程、提供系统调用接口 |
| 发行版 | Distribution | 内核 + GNU 工具 + 包管理器 + 默认配置的完整系统 |
| 系统调用 | System Call | 用户程序向内核请求服务的唯一合法入口 |
| 守护进程 | Daemon | 后台服务进程——通常在系统启动时运行 |
| 进程 | Process | 程序的运行实例——独立地址空间 + 独立 PID |
| 线程 | Thread | 进程内的轻量级执行流 |
| PID | Process ID | 进程的唯一天然数标识 |
| 僵尸进程 | Zombie | 已终止但父进程未调用 wait()——占进程表项 |
| inode | Index Node | 文件系统中存储文件元数据和数据块指针的数据结构 |
| VFS | Virtual File System | 抽象层——统一不同文件系统的接口 |
| FHS | Filesystem Hierarchy Standard | 类 Unix 系统的标准化目录结构 |
| SUID / SGID | Set UID / Set GID | 以文件所有者/属组身份执行的权限标志位 |
| Sticky Bit | — | 目录上限制非所有者删除文件的标志位 |
| umask | User File Creation Mask | 减法型默认权限掩码 |
| systemd | — | 现代 Linux 的系统与服务管理器（PID 1） |
| GRUB | Grand Unified Bootloader | 加载内核的多重引导管理器 |
| initramfs | Initial RAM Filesystem | 临时根文件系统——含挂载真实根所需的驱动 |
| CFS | Completely Fair Scheduler | Linux 默认的基于虚拟运行时间的进程调度器 |
| COW | Copy-on-Write | 写时复制——fork 优化：仅在写入时复制内存页 |
| swap | — | 交换区——当物理内存不足时将不活跃页移至磁盘 |
| pipe | — | 连接两个进程标准输入/输出的单向字节流 |
| 信号 | Signal | 发给进程的异步通知——可被捕获、忽略或触发默认动作 |
| 符号链接 | Symbolic Link (symlink) | 储存目标路径字符串的特殊文件 |
| 硬链接 | Hard Link | 指向同一 inode 的额外目录条目 |
