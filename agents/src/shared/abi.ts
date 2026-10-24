import { parseAbi } from "viem";

/** Human-readable ABI of A2AHub.sol. MUST match contracts/src/A2AHub.sol exactly. */
export const a2aHubAbi = parseAbi([
  // ── events ──
  "event AgentRegistered(address indexed agent, string name, string role)",
  "event TaskCreated(uint256 indexed taskId, address indexed requester, uint256 reward, uint64 deadline, string prompt)",
  "event TaskClaimed(uint256 indexed taskId, address indexed worker)",
  "event TaskCompleted(uint256 indexed taskId, address indexed worker, string result)",
  "event PaymentReleased(uint256 indexed taskId, address indexed worker, uint256 amount)",
  "event TaskRefunded(uint256 indexed taskId, address indexed requester, uint256 amount)",

  // ── writes ──
  "function registerAgent(string name, string role)",
  "function createTask(string prompt, uint64 ttl) payable returns (uint256 taskId)",
  "function claimTask(uint256 taskId)",
  "function submitResultAndPayout(uint256 taskId, string result)",
  "function refundExpired(uint256 taskId)",

  // ── reads ──
  "function taskCount() view returns (uint256)",
  "function getAgents() view returns (address[])",
  "function tasks(uint256 taskId) view returns (uint256 id, address requester, address worker, uint256 reward, uint64 createdAt, uint64 deadline, uint8 status, string prompt, string result)",
  "function agents(address agent) view returns (string name, string role, uint256 tasksPosted, uint256 tasksCompleted, uint256 totalEarned, uint256 totalSpent)",
]);

export const TASK_STATUS = ["Open", "Claimed", "Completed", "Refunded"] as const;
export type TaskStatusName = (typeof TASK_STATUS)[number];
