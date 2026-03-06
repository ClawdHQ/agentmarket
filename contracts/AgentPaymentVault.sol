// SPDX-License-Identifier: MIT
// @openzeppelin/contracts v5.x
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IWorkflowRegistry {
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
    function getWorkflow(bytes32 id) external view returns (Workflow memory);
    function recordInvocation(bytes32 workflowId, bool success) external;
}

contract AgentPaymentVault is Ownable, ReentrancyGuard {
    IERC20 public immutable usdc;
    IWorkflowRegistry public immutable registry;
    address public creRelayer;
    mapping(address => uint256) public deposits;

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event PaymentExecuted(bytes32 indexed workflowId, address indexed agentAddress, address indexed workflowOwner, uint256 amount);

    constructor(address _usdc, address _registry) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
        registry = IWorkflowRegistry(_registry);
    }

    function setCRERelayer(address _relayer) external onlyOwner {
        creRelayer = _relayer;
    }

    function deposit(uint256 amount) external nonReentrant {
        usdc.transferFrom(msg.sender, address(this), amount);
        deposits[msg.sender] += amount;
        emit Deposited(msg.sender, amount);
    }

    function withdraw(uint256 amount) external nonReentrant {
        require(deposits[msg.sender] >= amount, "Insufficient deposit");
        deposits[msg.sender] -= amount;
        usdc.transfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    function executePayment(bytes32 workflowId, address agentAddress) external nonReentrant {
        require(msg.sender == creRelayer, "Only CRE relayer");
        IWorkflowRegistry.Workflow memory workflow = registry.getWorkflow(workflowId);
        require(workflow.active, "Workflow not active");
        require(deposits[agentAddress] >= workflow.priceUSDC, "Insufficient deposit");

        uint256 fee = (workflow.priceUSDC * 2) / 100;
        uint256 ownerAmount = workflow.priceUSDC - fee;

        deposits[agentAddress] -= workflow.priceUSDC;
        usdc.transfer(workflow.owner, ownerAmount);
        usdc.transfer(owner(), fee);

        registry.recordInvocation(workflowId, true);
        emit PaymentExecuted(workflowId, agentAddress, workflow.owner, workflow.priceUSDC);
    }
}
