// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {A2AHub} from "../src/A2AHub.sol";

contract A2AHubTest is Test {
    A2AHub hub;
    address requester = makeAddr("requester");
    address worker    = makeAddr("worker");
    address worker2   = makeAddr("worker2");

    function setUp() public {
        hub = new A2AHub();
        vm.deal(requester, 10 ether);
    }

    // ───── helpers ─────
    function _create(uint256 reward) internal returns (uint256 id) {
        vm.prank(requester);
        id = hub.createTask{value: reward}("SUMMARIZE|hello world", 300);
    }

    function _status(uint256 id) internal view returns (A2AHub.Status s) {
        (, , , , , , s, , ) = hub.tasks(id);
    }

    // ───── happy path ─────
    function test_HappyPath() public {
        uint256 id = _create(1 ether);
        assertEq(id, 1);
        assertEq(address(hub).balance, 1 ether);
        assertEq(uint8(_status(id)), uint8(A2AHub.Status.Open));

        vm.prank(worker);
        hub.claimTask(id);
        assertEq(uint8(_status(id)), uint8(A2AHub.Status.Claimed));

        uint256 before = worker.balance;
        vm.prank(worker);
        hub.submitResultAndPayout(id, "done");

        assertEq(worker.balance - before, 1 ether);
        assertEq(address(hub).balance, 0);
        assertEq(uint8(_status(id)), uint8(A2AHub.Status.Completed));

        (, , , , , , , , string memory result) = hub.tasks(id);
        assertEq(result, "done");
    }

    function test_EmitsEvents() public {
        uint256 id = _create(1 ether);
        vm.prank(worker);
        hub.claimTask(id);

        vm.expectEmit(true, true, false, true, address(hub));
        emit A2AHub.TaskCompleted(id, worker, "done");
        vm.expectEmit(true, true, false, true, address(hub));
        emit A2AHub.PaymentReleased(id, worker, 1 ether);

        vm.prank(worker);
        hub.submitResultAndPayout(id, "done");
    }

    function test_AgentStats() public {
        uint256 id = _create(2 ether);
        vm.prank(worker);
        hub.claimTask(id);
        vm.prank(worker);
        hub.submitResultAndPayout(id, "ok");

        (, , uint256 posted, , , uint256 spent) = hub.agents(requester);
        assertEq(posted, 1);
        assertEq(spent, 2 ether);

        (, , , uint256 completed, uint256 earned, ) = hub.agents(worker);
        assertEq(completed, 1);
        assertEq(earned, 2 ether);

        assertEq(hub.getAgents().length, 2);
    }

    function test_RegisterAgent() public {
        vm.prank(worker);
        hub.registerAgent("Scribe", "worker");
        (string memory n, string memory r, , , , ) = hub.agents(worker);
        assertEq(n, "Scribe");
        assertEq(r, "worker");
        vm.prank(worker);
        vm.expectRevert(bytes("bad name"));
        hub.registerAgent("", "worker");
    }

    // ───── claim rules ─────
    function test_CannotClaimTwice() public {
        uint256 id = _create(1 ether);
        vm.prank(worker);
        hub.claimTask(id);
        vm.prank(worker2);
        vm.expectRevert(bytes("not open"));
        hub.claimTask(id);
    }

    function test_RequesterCannotSelfClaim() public {
        uint256 id = _create(1 ether);
        vm.prank(requester);
        vm.expectRevert(bytes("self-claim"));
        hub.claimTask(id);
    }

    function test_CannotClaimMissingTask() public {
        vm.prank(worker);
        vm.expectRevert(bytes("no task"));
        hub.claimTask(999);
    }

    function test_CannotClaimExpired() public {
        uint256 id = _create(1 ether);
        vm.warp(block.timestamp + 301);
        vm.prank(worker);
        vm.expectRevert(bytes("expired"));
        hub.claimTask(id);
    }

    // ───── submit rules ─────
    function test_OnlyWorkerCanSubmit() public {
        uint256 id = _create(1 ether);
        vm.prank(worker);
        hub.claimTask(id);
        vm.prank(worker2);
        vm.expectRevert(bytes("not worker"));
        hub.submitResultAndPayout(id, "stolen");
    }

    function test_CannotSubmitUnclaimed() public {
        uint256 id = _create(1 ether);
        vm.prank(worker);
        vm.expectRevert(bytes("not claimed"));
        hub.submitResultAndPayout(id, "x");
    }

    function test_CannotSubmitAfterDeadline() public {
        uint256 id = _create(1 ether);
        vm.prank(worker);
        hub.claimTask(id);
        vm.warp(block.timestamp + 301);
        vm.prank(worker);
        vm.expectRevert(bytes("expired"));
        hub.submitResultAndPayout(id, "late");
    }

    function test_CannotDoublePay() public {
        uint256 id = _create(1 ether);
        vm.prank(worker);
        hub.claimTask(id);
        vm.prank(worker);
        hub.submitResultAndPayout(id, "first");
        vm.prank(worker);
        vm.expectRevert(bytes("not claimed"));
        hub.submitResultAndPayout(id, "second");
    }

    // ───── create rules ─────
    function test_ZeroRewardReverts() public {
        vm.prank(requester);
        vm.expectRevert(bytes("reward=0"));
        hub.createTask{value: 0}("SUMMARIZE|x", 300);
    }

    function test_BadTtlReverts() public {
        vm.prank(requester);
        vm.expectRevert(bytes("bad ttl"));
        hub.createTask{value: 1 ether}("SUMMARIZE|x", 5);
    }

    function test_EmptyPromptReverts() public {
        vm.prank(requester);
        vm.expectRevert(bytes("bad prompt"));
        hub.createTask{value: 1 ether}("", 300);
    }

    // ───── refunds ─────
    function test_RefundAfterExpiry_Open() public {
        uint256 id = _create(1 ether);
        assertEq(requester.balance, 9 ether);
        vm.warp(block.timestamp + 301);
        vm.prank(worker2); // anyone can trigger
        hub.refundExpired(id);
        assertEq(requester.balance, 10 ether);
        assertEq(address(hub).balance, 0);
        assertEq(uint8(_status(id)), uint8(A2AHub.Status.Refunded));
        (, , uint256 posted, , , uint256 spent) = hub.agents(requester);
        assertEq(posted, 1);
        assertEq(spent, 0);
    }

    function test_RefundAfterExpiry_Claimed() public {
        uint256 id = _create(1 ether);
        vm.prank(worker);
        hub.claimTask(id);
        vm.warp(block.timestamp + 301);
        hub.refundExpired(id);
        assertEq(requester.balance, 10 ether);
    }

    function test_CannotRefundBeforeExpiry() public {
        uint256 id = _create(1 ether);
        vm.expectRevert(bytes("not expired"));
        hub.refundExpired(id);
    }

    function test_CannotRefundCompleted() public {
        uint256 id = _create(1 ether);
        vm.prank(worker);
        hub.claimTask(id);
        vm.prank(worker);
        hub.submitResultAndPayout(id, "ok");
        vm.warp(block.timestamp + 301);
        vm.expectRevert(bytes("settled"));
        hub.refundExpired(id);
    }

    // ───── no stray ETH ─────
    function test_RejectsStrayEth() public {
        (bool ok, ) = address(hub).call{value: 1 ether}("");
        assertFalse(ok);
    }

    // ───── fuzz: value conservation ─────
    function testFuzz_ConservesValue(uint96 rewardRaw) public {
        uint256 reward = bound(uint256(rewardRaw), 1, 5 ether);
        uint256 id = _create(reward);
        vm.prank(worker);
        hub.claimTask(id);
        uint256 before = worker.balance;
        vm.prank(worker);
        hub.submitResultAndPayout(id, "ok");
        assertEq(worker.balance - before, reward);
        assertEq(address(hub).balance, 0);
    }
}
