// SPDX-License-Identifier: MIT
// @openzeppelin/contracts v5.x
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

contract WorkflowRegistry is Ownable {
    struct Workflow {
        bytes32 id;
        string name;
        string description;
        string endpoint;
        uint256 priceUSDC;
        address owner;
        uint256 reputationScore;
        uint256 totalInvocations;
        bool active;
    }

    mapping(bytes32 => Workflow) public workflows;
    bytes32[] public workflowIds;
    address public paymentVault;

    event WorkflowPublished(bytes32 indexed id, string name, address indexed owner, uint256 priceUSDC);
    event InvocationRecorded(bytes32 indexed workflowId, bool success, uint256 newReputation);

    constructor() Ownable(msg.sender) {}

    function setPaymentVault(address _vault) external onlyOwner {
        paymentVault = _vault;
    }

    function publishWorkflow(
        string calldata name,
        string calldata description,
        string calldata endpoint,
        uint256 priceUSDC
    ) external returns (bytes32) {
        bytes32 id = keccak256(abi.encodePacked(name, msg.sender, block.timestamp));
        workflows[id] = Workflow({
            id: id,
            name: name,
            description: description,
            endpoint: endpoint,
            priceUSDC: priceUSDC,
            owner: msg.sender,
            reputationScore: 70,
            totalInvocations: 0,
            active: true
        });
        workflowIds.push(id);
        emit WorkflowPublished(id, name, msg.sender, priceUSDC);
        return id;
    }

    function recordInvocation(bytes32 workflowId, bool success) external {
        require(msg.sender == paymentVault, "Only payment vault");
        Workflow storage w = workflows[workflowId];
        uint256 newScore = success ? 100 : 0;
        uint256 count = w.totalInvocations;
        w.reputationScore = (w.reputationScore * count + newScore) / (count + 1);
        w.totalInvocations += 1;
        emit InvocationRecorded(workflowId, success, w.reputationScore);
    }

    function getWorkflow(bytes32 id) external view returns (Workflow memory) {
        return workflows[id];
    }

    function listActive() external view returns (Workflow[] memory) {
        uint256 activeCount = 0;
        for (uint256 i = 0; i < workflowIds.length; i++) {
            if (workflows[workflowIds[i]].active) {
                activeCount++;
            }
        }
        Workflow[] memory result = new Workflow[](activeCount);
        uint256 idx = 0;
        for (uint256 i = 0; i < workflowIds.length; i++) {
            if (workflows[workflowIds[i]].active) {
                result[idx++] = workflows[workflowIds[i]];
            }
        }
        return result;
    }
}
