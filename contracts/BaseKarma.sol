// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract BaseKarma {
    struct UserStats {
        uint256 receivedKarma;
        uint256 sentKarma;
        uint256 rewardPoints;
        address referrer;
    }

    address public owner;
    bool public paused;
    uint256 public karmaPerSend;
    uint256 public senderRewardPoints;
    uint256 public referralRewardPoints;

    mapping(address => UserStats) private stats;
    mapping(address => mapping(address => uint256)) public lastSentDay;

    event KarmaSent(
        address indexed sender,
        address indexed receiver,
        uint256 amount,
        uint256 timestamp,
        address indexed referrer
    );
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Paused(address indexed account);
    event Unpaused(address indexed account);
    event RewardsUpdated(uint256 karmaPerSend, uint256 senderRewardPoints, uint256 referralRewardPoints);

    error NotOwner();
    error PausedSending();
    error ZeroAddress();
    error CannotSendToSelf();
    error AlreadySentToday();

    constructor() {
        owner = msg.sender;
        karmaPerSend = 1;
        senderRewardPoints = 10;
        referralRewardPoints = 25;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    function sendKarma(address receiver, address referrer) external {
        if (paused) revert PausedSending();
        if (receiver == address(0)) revert ZeroAddress();
        if (receiver == msg.sender) revert CannotSendToSelf();

        uint256 today = block.timestamp / 1 days;
        if (lastSentDay[msg.sender][receiver] == today) revert AlreadySentToday();
        lastSentDay[msg.sender][receiver] = today;

        UserStats storage senderStats = stats[msg.sender];
        address activeReferrer = senderStats.referrer;

        if (
            activeReferrer == address(0) &&
            referrer != address(0) &&
            referrer != msg.sender &&
            referrer != receiver
        ) {
            senderStats.referrer = referrer;
            activeReferrer = referrer;
            senderStats.rewardPoints += referralRewardPoints;
            stats[referrer].rewardPoints += referralRewardPoints;
        }

        stats[receiver].receivedKarma += karmaPerSend;
        senderStats.sentKarma += karmaPerSend;
        senderStats.rewardPoints += senderRewardPoints;

        emit KarmaSent(msg.sender, receiver, karmaPerSend, block.timestamp, activeReferrer);
    }

    function getUserStats(address user)
        external
        view
        returns (uint256 receivedKarma, uint256 sentKarma, uint256 rewardPoints, address referrer)
    {
        UserStats memory userStats = stats[user];
        return (userStats.receivedKarma, userStats.sentKarma, userStats.rewardPoints, userStats.referrer);
    }

    function pause() external onlyOwner {
        paused = true;
        emit Paused(msg.sender);
    }

    function unpause() external onlyOwner {
        paused = false;
        emit Unpaused(msg.sender);
    }

    function setRewards(uint256 newKarmaPerSend, uint256 newSenderRewardPoints, uint256 newReferralRewardPoints)
        external
        onlyOwner
    {
        karmaPerSend = newKarmaPerSend;
        senderRewardPoints = newSenderRewardPoints;
        referralRewardPoints = newReferralRewardPoints;
        emit RewardsUpdated(newKarmaPerSend, newSenderRewardPoints, newReferralRewardPoints);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        address previousOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(previousOwner, newOwner);
    }
}
