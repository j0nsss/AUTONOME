// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title A2AHub — escrow, task registry and instant payout rail for autonomous agents (Autonome)
/// @notice Requesters lock native MON; a worker claims, submits a result, and is paid in the same tx.
contract A2AHub {
    // ───────────────────────── Types ─────────────────────────
    enum Status { Open, Claimed, Completed, Refunded }

    struct Task {
        uint256 id;
        address requester;
        address worker;
        uint256 reward;
        uint64  createdAt;
        uint64  deadline;
        Status  status;
        string  prompt;
        string  result;
    }

    struct AgentProfile {
        string  name;
        string  role;
        uint256 tasksPosted;
        uint256 tasksCompleted;
        uint256 totalEarned;
        uint256 totalSpent;
    }

    // ───────────────────────── Constants ─────────────────────────
    uint256 public constant MAX_PROMPT_BYTES = 1024;
    uint256 public constant MAX_RESULT_BYTES = 2048;
    uint64  public constant MIN_TTL = 30;
    uint64  public constant MAX_TTL = 1 days;

    // ───────────────────────── Storage ─────────────────────────
    uint256 public taskCount;
    mapping(uint256 => Task) public tasks;
    mapping(address => AgentProfile) public agents;

    mapping(address => bool) private _known;
    address[] private _agentList;
    uint256 private _lock = 1;

    // ───────────────────────── Events ─────────────────────────
    event AgentRegistered(address indexed agent, string name, string role);
    event TaskCreated(uint256 indexed taskId, address indexed requester, uint256 reward, uint64 deadline, string prompt);
    event TaskClaimed(uint256 indexed taskId, address indexed worker);
    event TaskCompleted(uint256 indexed taskId, address indexed worker, string result);
    event PaymentReleased(uint256 indexed taskId, address indexed worker, uint256 amount);
    event TaskRefunded(uint256 indexed taskId, address indexed requester, uint256 amount);

    // ───────────────────────── Modifiers ─────────────────────────
    modifier nonReentrant() {
        require(_lock == 1, "reentrancy");
        _lock = 2;
        _;
        _lock = 1;
    }

    // ───────────────────────── Agent registry ─────────────────────────
    function registerAgent(string calldata name, string calldata role) external {
        uint256 n = bytes(name).length;
        require(n > 0 && n <= 32, "bad name");
        require(bytes(role).length <= 32, "bad role");
        _touch(msg.sender);
        agents[msg.sender].name = name;
        agents[msg.sender].role = role;
        emit AgentRegistered(msg.sender, name, role);
    }

    function getAgents() external view returns (address[] memory) {
        return _agentList;
    }

    // ───────────────────────── Core lifecycle ─────────────────────────
    /// @notice Post a task and lock `msg.value` as the reward.
    /// @param prompt  Wire format "TYPE|payload" (see plan.md §1.4)
    /// @param ttl     Seconds until the task expires (30..86400)
    function createTask(string calldata prompt, uint64 ttl) external payable returns (uint256 taskId) {
        require(msg.value > 0, "reward=0");
        uint256 len = bytes(prompt).length;
        require(len > 0 && len <= MAX_PROMPT_BYTES, "bad prompt");
        require(ttl >= MIN_TTL && ttl <= MAX_TTL, "bad ttl");

        taskId = ++taskCount;
        uint64 nowTs = uint64(block.timestamp);
        uint64 deadline = nowTs + ttl;

        // Field-by-field writes (avoids "stack too deep" from a 9-field struct literal)
        Task storage t = tasks[taskId];
        t.id = taskId;
        t.requester = msg.sender;
        t.reward = msg.value;
        t.createdAt = nowTs;
        t.deadline = deadline;
        t.status = Status.Open;
        t.prompt = prompt;

        _touch(msg.sender);
        AgentProfile storage p = agents[msg.sender];
        p.tasksPosted += 1;
        p.totalSpent += msg.value;

        emit TaskCreated(taskId, msg.sender, msg.value, deadline, prompt);
    }

    /// @notice First valid caller wins the task. Losers revert with "not open".
    function claimTask(uint256 taskId) external {
        Task storage t = tasks[taskId];
        require(t.id != 0, "no task");
        require(t.status == Status.Open, "not open");
        require(block.timestamp <= t.deadline, "expired");
        require(msg.sender != t.requester, "self-claim");

        t.worker = msg.sender;
        t.status = Status.Claimed;
        _touch(msg.sender);

        emit TaskClaimed(taskId, msg.sender);
    }

    /// @notice Claimant submits the result and is paid the escrowed reward in the same transaction.
    function submitResultAndPayout(uint256 taskId, string calldata result) external nonReentrant {
        Task storage t = tasks[taskId];
        require(t.status == Status.Claimed, "not claimed");
        require(msg.sender == t.worker, "not worker");
        require(block.timestamp <= t.deadline, "expired");
        uint256 len = bytes(result).length;
        require(len > 0 && len <= MAX_RESULT_BYTES, "bad result");

        uint256 amount = t.reward;

        // effects
        t.status = Status.Completed;
        t.result = result;
        AgentProfile storage p = agents[msg.sender];
        p.tasksCompleted += 1;
        p.totalEarned += amount;

        emit TaskCompleted(taskId, msg.sender, result);

        // interaction
        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "payout failed");

        emit PaymentReleased(taskId, msg.sender, amount);
    }

    /// @notice Anyone can trigger a refund once a task is past its deadline and unsettled.
    function refundExpired(uint256 taskId) external nonReentrant {
        Task storage t = tasks[taskId];
        require(t.id != 0, "no task");
        require(t.status == Status.Open || t.status == Status.Claimed, "settled");
        require(block.timestamp > t.deadline, "not expired");

        address requester = t.requester;
        uint256 amount = t.reward;

        // effects
        t.status = Status.Refunded;
        agents[requester].totalSpent -= amount;

        emit TaskRefunded(taskId, requester, amount);

        // interaction
        (bool ok, ) = payable(requester).call{value: amount}("");
        require(ok, "refund failed");
    }

    // ───────────────────────── Internal ─────────────────────────
    function _touch(address a) internal {
        if (!_known[a]) {
            _known[a] = true;
            _agentList.push(a);
        }
    }
}
